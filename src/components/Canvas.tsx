import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIService } from '@/services/AIService';
import { toast } from 'sonner';
import { Command, CommandGroup, CommandItem, CommandEmpty, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { ZoteroService, type ZoteroLibrary } from '@/services/ZoteroService';
import { FirecrawlService } from '@/services/FirecrawlService';
import { PostgrestResponse } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Pencil } from 'lucide-react';

interface Reference {
  id: string;
  title: string;
  authors: string[];
  year: string;
  doi?: string;
  abstract?: string;
}

interface OutlineSection {
  id: string;
  title: string;
  content: string;
  references: Reference[];
}

interface MentionData {
  id: string;
  display: string;
  type: 'search' | 'pdf_batch' | 'zotero';
  timestamp: string;
}

interface Suggestion {
  id: string;
  display: string;
  type: 'search' | 'pdf_batch' | 'zotero';
  timestamp: string;
  details?: any;
}

interface SearchResult {
  id: string;
  query: string;
  timestamp: string;
}

interface PDFBatchResult {
  id: string;
  name: string;
  timestamp: string;
}

export default function Canvas() {
  const [searchQuery, setSearchQuery] = useState('');
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [content, setContent] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [detailedSearches, setDetailedSearches] = useState<SearchResult[]>([]);
  const [detailedBatches, setDetailedBatches] = useState<PDFBatchResult[]>([]);
  const [hasZoteroCredentials, setHasZoteroCredentials] = useState<boolean>(false);
  const [commandValue, setCommandValue] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');

  const loadAllSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      // Check Zotero credentials first
      const credentials = await ZoteroService.checkCredentials();
      setHasZoteroCredentials(!!credentials);

      // Get user searches
      const { data: searches, error: searchError } = await supabase
        .from('searches')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (searchError) {
        console.error('Error loading searches:', searchError);
      }

      // Get PDF batches
      const { data: batches, error: batchError } = await supabase
        .from('pdf_batches')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (batchError) {
        console.error('Error loading PDF batches:', batchError);
      }

      // Combine all suggestions
      const allSuggestions: Suggestion[] = [
        ...(searches || []).map(search => ({
          id: search.id,
          display: search.query,
          type: 'search' as const,
          timestamp: search.timestamp,
          details: search
        })),
        ...(batches || []).map(batch => ({
          id: batch.id,
          display: batch.name,
          type: 'pdf_batch' as const,
          timestamp: batch.timestamp,
          details: batch
        }))
      ];

      // Sort by timestamp
      allSuggestions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSuggestions(allSuggestions);
      setDetailedSearches(searches as SearchResult[] || []);
      setDetailedBatches(batches as PDFBatchResult[] || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    loadAllSuggestions();
  }, [loadAllSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Show suggestions if we're typing a mention
    const lastAtSymbol = value.lastIndexOf('@', cursorPos);
    const nextSpace = value.indexOf(' ', lastAtSymbol);
    const isTypingMention = lastAtSymbol !== -1 && 
      (nextSpace === -1 || cursorPos <= nextSpace) &&
      cursorPos - lastAtSymbol <= 20;

    setShowSuggestions(isTypingMention);
    if (isTypingMention) {
      setCommandValue(value.slice(lastAtSymbol + 1, cursorPos));
    } else {
      setCommandValue('');
    }
  };

  const handleMentionClick = (suggestion: Suggestion) => {
    const beforeMention = searchQuery.slice(0, searchQuery.lastIndexOf('@'));
    const afterMention = searchQuery.slice(cursorPosition);
    const newQuery = `${beforeMention}@${suggestion.type}:${suggestion.id}${afterMention}`;
    setSearchQuery(newQuery);
    setShowSuggestions(false);
    setCommandValue('');
    inputRef.current?.focus();
  };

  const parseMentions = (text: string): MentionData[] => {
    const mentions = text.match(/@(\w+):([a-zA-Z0-9-]+)/g) || [];
    return mentions.map(mention => {
      const [type, id] = mention.slice(1).split(':');
      const mentionType = type as 'search' | 'pdf_batch' | 'zotero';
      return {
        id,
        display: mention,
        type: mentionType,
        timestamp: new Date().toISOString()
      };
    });
  };

  const handleGenerateOutline = async () => {
    try {
      setLoading(true);
      const mentions = parseMentions(searchQuery);
      
      if (mentions.length === 0) {
        toast.error('Please @mention at least one search, PDF batch, or Zotero library');
        return;
      }

      // Get papers data based on mentions
      const papersPromises = mentions.map(async mention => {
        if (mention.type === 'search') {
          const search = detailedSearches.find(s => s.id === mention.id);
          if (!search) return [];
          return await AIService.getPapersForSearch(mention.id);
        } else if (mention.type === 'pdf_batch') {
          const batch = detailedBatches.find(b => b.id === mention.id);
          if (!batch) return [];
          return await AIService.getPapersForPDFBatch(mention.id);
        }
        return [];
      });

      const papersData = (await Promise.all(papersPromises)).flat();

      if (papersData.length === 0) {
        toast.error('No papers found for the mentioned items');
        return;
      }

      // Generate outline using default AI model
      const outlinePrompt = `${customPrompt || 'Based on the following research papers, generate a detailed outline for an academic paper:'}
      ${papersData.map(paper => `
Title: ${paper.name}
Authors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
Year: ${paper.year}
Abstract: ${paper.abstract || 'Not available'}
${paper.research_question ? `Research Question: ${paper.research_question}` : ''}
${paper.major_findings ? `Major Findings: ${paper.major_findings}` : ''}
${paper.suggestions ? `Suggestions: ${paper.suggestions}` : ''}
---`).join('\n')}
      
      ${customPrompt ? '' : 'Generate an outline with main sections and subsections. For each section, include relevant references from the provided papers.'}`;

      const outlineResponse = await AIService.generateCompletion(outlinePrompt, undefined, undefined, papersData);
      
      // Parse the AI response into outline sections
      const parsedOutline = parseAIResponseToOutline(outlineResponse, papersData);
      setOutline(parsedOutline);

      // Generate full content
      const contentPrompt = `Based on the following outline and research papers, generate a complete academic paper in APA style:

Outline:
${outlineResponse}

Papers:
${papersData.map(paper => `
Title: ${paper.name}
Authors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
Year: ${paper.year}
Abstract: ${paper.abstract || 'Not available'}
${paper.research_question ? `Research Question: ${paper.research_question}` : ''}
${paper.major_findings ? `Major Findings: ${paper.major_findings}` : ''}
${paper.suggestions ? `Suggestions: ${paper.suggestions}` : ''}
---`).join('\n')}
      
Use appropriate in-text citations and maintain academic writing standards.`;

      const contentResponse = await AIService.generateCompletion(contentPrompt, undefined, outlineResponse, papersData);
      setContent(contentResponse);

    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parseAIResponseToOutline = (response: string, papers: any[]): OutlineSection[] => {
    // Basic parsing of AI response into sections
    const sections = response.split('\n\n').filter(Boolean);
    
    return sections.map(section => {
      const lines = section.split('\n');
      const title = lines[0].replace(/^#+\s*/, '');
      const content = lines.slice(1).join('\n');
      
      // Extract referenced papers based on content
      const references = papers
        .filter(paper => paper && paper.name && paper.authors) // Ensure paper exists and has required properties
        .filter(paper => {
          const paperTitle = paper.name?.toLowerCase() || '';
          const paperAuthors = Array.isArray(paper.authors) 
            ? paper.authors.map(author => author?.toLowerCase() || '')
            : [paper.authors?.toLowerCase() || ''];
            
          return content.toLowerCase().includes(paperTitle) ||
            paperAuthors.some(author => content.toLowerCase().includes(author));
        });

      return {
        id: title,
        title,
        content,
        references: references.map(paper => ({
          id: paper.id || '',
          title: paper.name || '',
          authors: Array.isArray(paper.authors) ? paper.authors : [paper.authors || ''],
          year: paper.year || '',
          doi: paper.doi || undefined
        }))
      };
    });
  };

  const formatReference = (ref: Reference) => {
    return `${ref.authors.join(', ')} (${ref.year}). ${ref.title}.${ref.doi ? ` DOI: ${ref.doi}` : ''}`;
  };

  const handleEditSection = (sectionId: string, content: string) => {
    setEditingSection(sectionId);
    setEditedContent(content);
  };

  const handleSaveSection = (sectionId: string) => {
    setOutline(prevOutline => 
      prevOutline.map(section => 
        section.id === sectionId 
          ? { ...section, content: editedContent }
          : section
      )
    );
    setEditingSection(null);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditedContent('');
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-6">
        <Card className="p-4">
          <h2 className="text-2xl font-bold mb-4">Research Canvas</h2>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="Type @ to mention searches, PDFs, or Zotero libraries"
                value={searchQuery}
                onChange={handleInputChange}
                className="flex-1"
              />
              {showSuggestions && (
                <div className="absolute z-10 w-full max-h-60 overflow-y-auto bg-white border rounded-md shadow-lg">
                  <Command value={commandValue} onValueChange={setCommandValue}>
                    <CommandList>
                      <CommandEmpty>
                        {loadingSuggestions ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : (
                          'No suggestions found'
                        )}
                      </CommandEmpty>
                      {!loadingSuggestions && suggestions.length > 0 && (
                        <>
                          {suggestions.some(s => s.type === 'search') && (
                            <CommandGroup heading="Recent Searches">
                              {suggestions
                                .filter(s => s.type === 'search')
                                .map(suggestion => (
                                  <CommandItem
                                    key={suggestion.id}
                                    value={suggestion.display}
                                    onSelect={() => handleMentionClick(suggestion)}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{suggestion.display}</span>
                                      <span className="text-sm text-gray-500">
                                        {new Date(suggestion.timestamp).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}
                          {suggestions.some(s => s.type === 'pdf_batch') && (
                            <CommandGroup heading="PDF Batches">
                              {suggestions
                                .filter(s => s.type === 'pdf_batch')
                                .map(suggestion => (
                                  <CommandItem
                                    key={suggestion.id}
                                    value={suggestion.display}
                                    onSelect={() => handleMentionClick(suggestion)}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{suggestion.display}</span>
                                      <span className="text-sm text-gray-500">
                                        {new Date(suggestion.timestamp).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}
                        </>
                      )}
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
            <Textarea
              placeholder="Enter your custom prompt for the AI model (optional)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              onClick={handleGenerateOutline}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Outline'}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          {/* Outline Section */}
          <Card className="p-4">
            <h3 className="text-xl font-semibold mb-4">Paper Index</h3>
            <ScrollArea className="h-[600px]">
              {outline.map((section, index) => (
                <div key={section.id} className="mb-6 border-b pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-medium">
                      {index + 1}. {section.title}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSection(section.id, section.content)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {editingSection === section.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[100px]"
                        placeholder="Enter the main points and references for this section..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveSection(section.id)}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-600">{section.content}</p>
                      <div className="border-t pt-2">
                        <h5 className="text-sm font-medium mb-2">Key References:</h5>
                        {section.references.map((ref, refIndex) => (
                          <div key={refIndex} className="text-sm text-gray-500 mb-1">
                            <a 
                              href={ref.doi ? `https://doi.org/${ref.doi}` : '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {formatReference(ref)}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </Card>

          {/* Content Section */}
          <Card className="p-4">
            <h3 className="text-xl font-semibold mb-4">APA Style Content</h3>
            <ScrollArea className="h-[600px]">
              <Textarea
                value={content}
                className="min-h-[500px] resize-none"
                placeholder="Generated content will appear here..."
                readOnly
              />
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
} 