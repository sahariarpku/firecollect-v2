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
  journal?: string;
  abstract?: string;
  research_question?: string;
  major_findings?: string;
  suggestions?: string;
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

interface MindMapNode {
  id: string;
  title: string;
  level: number;
  parentId: string | null;
  references: Reference[];
  children: MindMapNode[];
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
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mindMap, setMindMap] = useState<MindMapNode[]>([]);
  const [nodeContent, setNodeContent] = useState<Record<string, string>>({});

  const defaultStructure = {
    id: 'root',
    title: 'Research Paper',
    level: 0,
    parentId: null,
    references: [],
    children: [
      {
        id: 'abstract',
        title: 'Abstract',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'abstract-summary',
            title: 'Summary of objectives, methods, results, conclusions',
            level: 2,
            parentId: 'abstract',
            references: [],
            children: []
          }
        ]
      },
      {
        id: 'introduction',
        title: 'Introduction',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'background',
            title: 'Background / Context',
            level: 2,
            parentId: 'introduction',
            references: [],
            children: []
          },
          {
            id: 'problem-statement',
            title: 'Problem Statement',
            level: 2,
            parentId: 'introduction',
            references: [],
            children: []
          },
          {
            id: 'research-objectives',
            title: 'Research Objectives / Questions',
            level: 2,
            parentId: 'introduction',
            references: [],
            children: []
          }
        ]
      },
      {
        id: 'literature-review',
        title: 'Literature Review',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'key-theories',
            title: 'Key Theories / Models',
            level: 2,
            parentId: 'literature-review',
            references: [],
            children: []
          },
          {
            id: 'gaps',
            title: 'Gaps in Literature',
            level: 2,
            parentId: 'literature-review',
            references: [],
            children: []
          },
          {
            id: 'positioning',
            title: 'Positioning Your Study',
            level: 2,
            parentId: 'literature-review',
            references: [],
            children: []
          }
        ]
      },
      {
        id: 'methodology',
        title: 'Methodology',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'research-design',
            title: 'Research Design',
            level: 2,
            parentId: 'methodology',
            references: [],
            children: []
          },
          {
            id: 'data-collection',
            title: 'Data Collection Methods',
            level: 2,
            parentId: 'methodology',
            references: [],
            children: []
          },
          {
            id: 'sample',
            title: 'Sample / Participants',
            level: 2,
            parentId: 'methodology',
            references: [],
            children: []
          },
          {
            id: 'data-analysis',
            title: 'Data Analysis Techniques',
            level: 2,
            parentId: 'methodology',
            references: [],
            children: []
          }
        ]
      },
      {
        id: 'results',
        title: 'Results',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'findings',
            title: 'Quantitative / Qualitative Findings',
            level: 2,
            parentId: 'results',
            references: [],
            children: []
          },
          {
            id: 'tables',
            title: 'Tables / Figures',
            level: 2,
            parentId: 'results',
            references: [],
            children: []
          }
        ]
      },
      {
        id: 'discussion',
        title: 'Discussion',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'interpretation',
            title: 'Interpretation of Results',
            level: 2,
            parentId: 'discussion',
            references: [],
            children: []
          },
          {
            id: 'comparison',
            title: 'Comparison with Prior Work',
            level: 2,
            parentId: 'discussion',
            references: [],
            children: []
          },
          {
            id: 'implications',
            title: 'Implications',
            level: 2,
            parentId: 'discussion',
            references: [],
            children: []
          }
        ]
      },
      {
        id: 'conclusion',
        title: 'Conclusion',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'key-findings',
            title: 'Summary of Key Findings',
            level: 2,
            parentId: 'conclusion',
            references: [],
            children: []
          },
          {
            id: 'limitations',
            title: 'Limitations',
            level: 2,
            parentId: 'conclusion',
            references: [],
            children: []
          },
          {
            id: 'future-work',
            title: 'Future Work',
            level: 2,
            parentId: 'conclusion',
            references: [],
            children: []
          }
        ]
      },
      {
        id: 'references',
        title: 'References',
        level: 1,
        parentId: 'root',
        references: [],
        children: [
          {
            id: 'citations',
            title: 'All cited works in standard citation format',
            level: 2,
            parentId: 'references',
            references: [],
            children: []
          }
        ]
      }
    ]
  };

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

  const generateMindMap = (outline: OutlineSection[]): MindMapNode[] => {
    const nodes: MindMapNode[] = [];
    
    // Create root node
    const rootNode: MindMapNode = {
      id: 'root',
      title: 'Research Paper',
      level: 0,
      parentId: null,
      references: [],
      children: []
    };
    nodes.push(rootNode);

    // Process each section
    outline.forEach((section, index) => {
      const node: MindMapNode = {
        id: section.id,
        title: section.title,
        level: 1,
        parentId: 'root',
        references: section.references,
        children: []
      };
      nodes.push(node);
      rootNode.children.push(node);
    });

    return nodes;
  };

  const handleNodeClick = async (node: MindMapNode) => {
    setSelectedNode(node.id);
    
    if (!nodeContent[node.id]) {
      try {
        setNodeContent(prev => ({
          ...prev,
          [node.id]: 'Generating content...'
        }));

        const mentions = parseMentions(searchQuery);
        const papersPromises = mentions.map(async mention => {
          if (mention.type === 'search') {
            return await AIService.getPapersForSearch(mention.id);
          } else if (mention.type === 'pdf_batch') {
            return await AIService.getPapersForPDFBatch(mention.id);
          }
          return [];
        });
        const papersData = (await Promise.all(papersPromises)).flat();

        // Determine if we're generating content for a main section or subsection
        const isMainSection = node.level === 1;
        const parentNode = isMainSection ? node : findNode(mindMap[0], node.parentId || '');
        const sectionContext = isMainSection 
          ? `${node.title} section and its subsections (${node.children.map(c => c.title).join(', ')})`
          : `${parentNode?.title} - ${node.title} subsection`;

        let fullContent = '';
        let allReferences: string[] = [];
        let isContentComplete = false;
        let continuationCount = 0;
        const MAX_ATTEMPTS = 3; // Maximum number of continuation attempts

        while (!isContentComplete && continuationCount < MAX_ATTEMPTS) {
          const continuationPrompt = continuationCount === 0 
            ? `Write the ${sectionContext} for a research paper based on these papers:
${papersData.map(paper => `
Title: ${paper.name}
Authors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
Year: ${paper.year}
Abstract: ${paper.abstract || 'Not available'}
${paper.research_question ? `Research Question: ${paper.research_question}` : ''}
${paper.major_findings ? `Major Findings: ${paper.major_findings}` : ''}
${paper.suggestions ? `Suggestions: ${paper.suggestions}` : ''}
---`).join('\n')}` 
            : `Continue the ${sectionContext} from where it was cut off. Previous content ended with: "${fullContent.slice(-150)}"
Use the same papers as before for references.`;

          const prompt = `${continuationPrompt}

Write a detailed ${isMainSection ? 'section with all subsections' : 'subsection'} that:
1. Uses proper paragraphs with clear topic sentences
2. Uses proper APA in-text citations following EXACTLY these formats:
   - One author: (Smith, 2023)
   - Two authors: (Smith & Jones, 2023)
   - Three or more authors: (Smith et al., 2023)
3. Synthesizes information from multiple sources
4. Maintains logical flow and coherence
5. MUST include a proper conclusion for each section/subsection
6. MUST include citations in EVERY paragraph

Format the content using these HTML-like markers:
<section>
${isMainSection ? node.children.map(child => `
<h1>${child.title}</h1>
<p>Content for ${child.title} with proper citations in EVERY paragraph...</p>
`).join('\n') : `
<h1>${node.title}</h1>
<p>Content for ${node.title} with proper citations in EVERY paragraph...</p>
`}
</section>

After the content, you MUST include a References section with EVERY cited work in this EXACT format:
<references>
LastName1, F. M., & LastName2, F. M. (YYYY). Title of the paper. *Journal Name*, Volume(Issue), pages. https://doi.org/xxx
LastName3, F. M., LastName4, F. M., & LastName5, F. M. (YYYY). Title of the paper. *Journal Name*, Volume(Issue), pages. https://doi.org/xxx
</references>

CRITICAL REQUIREMENTS:
1. Use ONLY the papers provided above
2. EVERY paragraph must include at least one citation
3. ALL citations must be in proper APA format
4. ALL citations must match entries in the references section
5. References must be in proper APA format with ALL required fields
6. Content must be complete with proper conclusion
7. Do not cut off mid-sentence or mid-paragraph
${continuationCount > 0 ? '8. Continue naturally from the previous content' : ''}

If you need more space to complete the content properly, indicate with <continue>true</continue> at the end.`;

          const response = await AIService.generateCompletion(prompt);

          // Check if content needs continuation
          const continueMatch = response.match(/<continue>(.*?)<\/continue>/);
          const needsContinuation = continueMatch && continueMatch[1].trim() === 'true';

          // Extract references
          const referencesMatch = response.match(/<references>\s*([\s\S]*?)\s*<\/references>/);
          if (referencesMatch) {
            allReferences.push(referencesMatch[1]);
          }

          // Clean up and get content
          let cleanContent = response
            .replace(/<references>[\s\S]*<\/references>/, '')
            .replace(/<continue>.*?<\/continue>/, '')
            .replace(/<section>/g, '<div class="space-y-4">')
            .replace(/<\/section>/g, '</div>')
            .replace(/<h1>/g, '<h3 class="text-xl font-semibold mb-4">')
            .replace(/<\/h1>/g, '</h3>')
            .replace(/<p>/g, '<p class="text-gray-800 leading-relaxed mb-4">')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/_([^_]+)_/g, '<em>$1</em>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/__([^_]+)__/g, '<strong>$1</strong>')
            .trim();

          fullContent += (continuationCount > 0 ? ' ' : '') + cleanContent;

          // Check if content seems complete
          isContentComplete = 
            (!needsContinuation && (
              fullContent.toLowerCase().includes('conclusion') ||
              fullContent.toLowerCase().includes('in summary') ||
              fullContent.toLowerCase().includes('thus,') ||
              fullContent.toLowerCase().includes('therefore,')
            )) ||
            continuationCount === MAX_ATTEMPTS - 1;

          // Update the content as we go
          setNodeContent(prev => ({
            ...prev,
            [node.id]: fullContent
          }));

          continuationCount++;
          
          // If we've hit the max attempts but content isn't complete, add a note
          if (continuationCount === MAX_ATTEMPTS && !isContentComplete) {
            fullContent += '\n\n<p class="text-yellow-600">Note: This section may be incomplete due to length limitations.</p>';
            setNodeContent(prev => ({
              ...prev,
              [node.id]: fullContent
            }));
          }
        }

        // Process all collected references
        const allReferencesText = allReferences.join('\n');
        const references = allReferencesText.split('\n')
          .filter(line => line.trim())
          .map(ref => {
            // Updated regex to better match APA format
            const match = ref.match(/^((?:[^,]+(?:,\s*(?:&\s*)?)?)+)\s*\((\d{4})\)\.\s*(.*?)(?:\.\s*\*(.*?)\*)(?:\.\s*(?:https?:\/\/(?:dx\.)?doi\.org\/)?([\S]+))?$/);
            if (match) {
              const [_, authors, year, title, journal, doi] = match;
              return {
                id: `ref-${Math.random().toString(36).substr(2, 9)}`,
                authors: authors.split(/(?:,\s*(?:&\s*)?)|(?:\s+and\s+)/).map(a => a.trim()).filter(Boolean),
                year,
                title: title.trim(),
                journal: journal?.trim(),
                doi: doi?.trim()
              };
            }
            return null;
          })
          .filter((ref): ref is NonNullable<typeof ref> => ref !== null);

        // Ensure all citations have matching references
        const citationRegex = /\(([^)]+?)(?:,\s*(\d{4})|(?:\s*et al\.,\s*(\d{4}))|\s*&\s*[^,]+?,\s*(\d{4}))\)/g;
        const citationsInContent = Array.from(fullContent.matchAll(citationRegex));
        
        // Add any missing references
        const missingReferences = citationsInContent
          .filter(citation => {
            const [_, author, year1, year2, year3] = citation;
            const year = year1 || year2 || year3;
            return !references.some(ref => 
              ref.authors.some(a => author.includes(a)) && ref.year === year
            );
          })
          .map(citation => {
            const [_, author, year1, year2, year3] = citation;
            const year = year1 || year2 || year3;
            return {
              id: `ref-${Math.random().toString(36).substr(2, 9)}`,
              authors: [author.trim()],
              year: year,
              title: 'Reference details not available',
              journal: 'Journal information not available'
            };
          });

        // Update the node's references
        setMindMap(prev => {
          const newMap = JSON.parse(JSON.stringify(prev));
          const targetNode = findNode(newMap[0], node.id);
          if (targetNode) {
            targetNode.references = [...references, ...missingReferences];
          }
          return newMap;
        });

      } catch (error) {
        console.error('Error generating content:', error);
        toast.error('Failed to generate content for this section');
        setNodeContent(prev => {
          const newContent = { ...prev };
          delete newContent[node.id];
          return newContent;
        });
      }
    }
  };

  const generateLatexDocument = () => {
    let allReferences: Reference[] = [];
    
    // Collect all references from all nodes
    const collectReferences = (node: MindMapNode) => {
      allReferences = [...allReferences, ...node.references];
      node.children.forEach(collectReferences);
    };
    collectReferences(mindMap[0]);
    
    // Remove duplicates
    allReferences = Array.from(new Map(allReferences.map(ref => [ref.id, ref])).values());

    // Generate LaTeX content
    const latexContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}
\\usepackage{natbib}
\\usepackage{graphicx}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}

\\title{${mindMap[0].title}}
\\date{\\today}
\\author{}

\\begin{document}

\\maketitle

${Object.entries(nodeContent).map(([nodeId, content]) => {
  const node = findNode(mindMap[0], nodeId);
  if (!node) return '';
  
  return `\\section{${node.title}}
${content.replace(/\(([^)]+),\s*(\d{4})\)/g, (match, author, year) => {
    const ref = node.references.find(
      r => r.authors.some(a => author.includes(a)) && r.year === year
    );
    return ref ? `\\cite{${ref.id}}` : match;
  })}
`;
}).join('\n\n')}

\\bibliographystyle{apalike}
\\bibliography{references}

\\end{document}`;

    // Generate BibTeX content
    const bibtexContent = allReferences.map(ref => `
@article{${ref.id},
  title={${ref.title}},
  author={${ref.authors.join(' and ')}},
  year={${ref.year}}${ref.doi ? `,\n  doi={${ref.doi}}` : ''}
}`).join('\n\n');

    // Create and download files
    const latexBlob = new Blob([latexContent], { type: 'text/plain' });
    const bibtexBlob = new Blob([bibtexContent], { type: 'text/plain' });
    
    const latexUrl = URL.createObjectURL(latexBlob);
    const bibtexUrl = URL.createObjectURL(bibtexBlob);
    
    const latexLink = document.createElement('a');
    latexLink.href = latexUrl;
    latexLink.download = 'paper.tex';
    latexLink.click();
    
    const bibtexLink = document.createElement('a');
    bibtexLink.href = bibtexUrl;
    bibtexLink.download = 'references.bib';
    bibtexLink.click();
  };

  const findNode = (root: MindMapNode, id: string): MindMapNode | null => {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  };

  const renderTreeNode = (node: MindMapNode, isLast: boolean = false, prefix: string = '') => {
    const hasChildren = node.children.length > 0;
    const isRoot = node.level === 0;
    
    return (
      <div key={node.id} className="flex flex-col">
        <div className="flex items-start">
          {!isRoot && (
            <div className="flex items-center text-gray-400 font-mono">
              {prefix}
              {isLast ? '└── ' : '├── '}
            </div>
          )}
          <button
            className={`px-3 py-1 rounded transition-all hover:bg-blue-50
              ${selectedNode === node.id ? 'bg-blue-100 font-medium' : ''}
            `}
            onClick={() => handleNodeClick(node)}
          >
            {node.title}
          </button>
        </div>
        
        {hasChildren && (
          <div className="ml-4">
            {node.children.map((child, index) => (
              renderTreeNode(
                child,
                index === node.children.length - 1,
                prefix + (isRoot ? '' : (isLast ? '    ' : '│   '))
              )
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMindMap = (nodes: MindMapNode[]) => {
    return (
      <div className="flex gap-8">
        {/* Tree structure */}
        <div className="w-1/3 font-mono">
          {renderTreeNode(nodes[0])}
        </div>

        {/* Content panel */}
        <div className="w-2/3">
          {selectedNode && nodeContent[selectedNode] && (
            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: nodeContent[selectedNode].replace(
                        /\(([^)]+),\s*(\d{4})\)/g,
                        (match, author, year) => {
                          const node = findNode(nodes[0], selectedNode);
                          if (!node) return match;
                          const ref = node.references.find(
                            r => r.authors.some(a => author.includes(a)) && r.year === year
                          );
                          return ref 
                            ? `<a href="#ref-${ref.id}" class="text-blue-600 hover:underline">${match}</a>`
                            : match;
                        }
                      )
                    }}
                  />

                  {/* References for this section */}
                  {selectedNode && findNode(nodes[0], selectedNode)?.references.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="text-lg font-semibold mb-3">References</h4>
                      <div className="space-y-2">
                        {findNode(nodes[0], selectedNode)?.references.map((ref, idx) => (
                          <div 
                            key={idx} 
                            id={`ref-${ref.id}`}
                            className="text-sm text-gray-600"
                          >
                            {renderReference(ref)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    );
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

      // Generate structure using AI
      const structurePrompt = `Based on these papers, create a research paper outline. Use a simple format like this:

# Main Section 1
## Subsection 1.1
## Subsection 1.2

# Main Section 2
## Subsection 2.1
## Subsection 2.2

Rules:
1. Use # for main sections
2. Use ## for subsections
3. Keep section names clear and concise
4. Structure should reflect the papers' content

Papers to analyze:
${papersData.map(paper => `${paper.name} (${paper.year})`).join('\n')}

Return ONLY the outline structure using # and ## notation.`;

      const structureResponse = await AIService.generateCompletion(structurePrompt);
      
      try {
        // Convert markdown-style headings to our structure
        const convertOutlineToStructure = (text: string): MindMapNode => {
          const lines = text.split('\n').filter(line => line.trim());
          const root: MindMapNode = {
            id: 'root',
            title: 'Research Paper',
            level: 0,
            parentId: null,
            references: [],
            children: []
          };
          
          let currentMainSection: MindMapNode | null = null;
          
          lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('# ')) {
              // Main section
              currentMainSection = {
                id: `section-${Math.random().toString(36).substr(2, 9)}`,
                title: trimmedLine.substring(2).trim(),
                level: 1,
                parentId: 'root',
                references: [],
                children: []
              };
              root.children.push(currentMainSection);
            } else if (trimmedLine.startsWith('## ') && currentMainSection) {
              // Subsection
              const subsection: MindMapNode = {
                id: `subsection-${Math.random().toString(36).substr(2, 9)}`,
                title: trimmedLine.substring(3).trim(),
                level: 2,
                parentId: currentMainSection.id,
                references: [],
                children: []
              };
              currentMainSection.children.push(subsection);
            }
          });
          
          // If no valid structure was generated, use a basic one
          if (root.children.length === 0) {
            root.children = [
              {
                id: 'intro',
                title: 'Introduction',
                level: 1,
                parentId: 'root',
                references: [],
                children: []
              },
              {
                id: 'methods',
                title: 'Methods',
                level: 1,
                parentId: 'root',
                references: [],
                children: []
              },
              {
                id: 'results',
                title: 'Results',
                level: 1,
                parentId: 'root',
                references: [],
                children: []
              },
              {
                id: 'discussion',
                title: 'Discussion',
                level: 1,
                parentId: 'root',
                references: [],
                children: []
              }
            ];
          }
          
          return root;
        };

        const structure = convertOutlineToStructure(structureResponse);
        setMindMap([structure]);
        toast.success('Structure generated! Click on any section to generate its content.');
      } catch (error) {
        console.error('Error processing structure:', error);
        // Fallback to a basic structure if parsing fails
        const basicStructure: MindMapNode = {
          id: 'root',
          title: 'Research Paper',
          level: 0,
          parentId: null,
          references: [],
          children: [
            {
              id: 'intro',
              title: 'Introduction',
              level: 1,
              parentId: 'root',
              references: [],
              children: []
            },
            {
              id: 'methods',
              title: 'Methods',
              level: 1,
              parentId: 'root',
              references: [],
              children: []
            },
            {
              id: 'results',
              title: 'Results',
              level: 1,
              parentId: 'root',
              references: [],
              children: []
            },
            {
              id: 'discussion',
              title: 'Discussion',
              level: 1,
              parentId: 'root',
              references: [],
              children: []
            }
          ]
        };
        setMindMap([basicStructure]);
        toast.warning('Using basic structure due to generation error');
      }

    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate structure. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const renderReference = (ref: Reference) => {
    const authorText = ref.authors.length > 0 
      ? ref.authors.length > 1
        ? `${ref.authors.slice(0, -1).join(', ')} & ${ref.authors[ref.authors.length - 1]}`
        : ref.authors[0]
      : 'Unknown Author';
    
    return (
      <div className="text-sm text-gray-600 mb-2">
        {authorText}. ({ref.year}). {ref.title}.
        {ref.journal && <em> {ref.journal}</em>}
        {ref.doi && (
          <>
            . <a 
              href={`https://doi.org/${ref.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://doi.org/{ref.doi}
            </a>
          </>
        )}
      </div>
    );
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
            <div className="flex gap-4">
              <Button 
                onClick={handleGenerateOutline}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Generating...' : 'Generate Structure'}
              </Button>
              {mindMap.length > 0 && (
                <Button
                  onClick={generateLatexDocument}
                  variant="outline"
                >
                  Export as LaTeX
                </Button>
              )}
            </div>
          </div>
        </Card>

        {mindMap.length > 0 && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-6">Research Structure</h3>
            {renderMindMap(mindMap)}
          </Card>
        )}
      </div>
    </div>
  );
} 