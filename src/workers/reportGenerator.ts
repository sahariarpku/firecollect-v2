import { createClient } from '@supabase/supabase-js';
import { MindMapNode } from '@/types';
import { parseMentions } from '@/utils/mentions';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface GenerationStatus {
  section: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  content?: string;
}

async function updateReportSection(reportId: string, section: string, content: string) {
  try {
    const { error } = await supabase
      .from('report_sections')
      .insert([{
        report_id: reportId,
        section_name: section,
        content: content,
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating report section:', error);
    throw error;
  }
}

async function generateContent(title: string, references: any[]) {
  // Simulate AI content generation (replace with actual implementation)
  return `Generated content for ${title} with ${references.length} references`;
}

async function generateSection(node: MindMapNode, reportId: string, searchQuery: string): Promise<void> {
  try {
    self.postMessage({
      type: 'SECTION_PROGRESS',
      payload: {
        progress: [{ section: node.title, status: 'generating' }]
      }
    });

    const mentions = parseMentions(searchQuery);
    const content = await generateContent(node.title, node.references);
    await updateReportSection(reportId, node.title, content);

    self.postMessage({
      type: 'SECTION_PROGRESS',
      payload: {
        progress: [{ section: node.title, status: 'completed', content }]
      }
    });

    // Recursively generate content for child nodes
    if (node.children) {
      for (const child of node.children) {
        await generateSection(child, reportId, searchQuery);
      }
    }
  } catch (error) {
    console.error(`Error generating section ${node.title}:`, error);
    self.postMessage({
      type: 'SECTION_PROGRESS',
      payload: {
        progress: [{ section: node.title, status: 'error' }]
      }
    });
  }
}

async function generateBibliography(reportId: string, searchQuery: string) {
  try {
    self.postMessage({
      type: 'SECTION_PROGRESS',
      payload: {
        progress: [{ section: 'References', status: 'generating' }]
      }
    });

    const mentions = parseMentions(searchQuery);
    const papersData = await Promise.all(mentions.map(mention => 
      mention.type === 'search' 
        ? AIService.getPapersForSearch(mention.id)
        : AIService.getPapersForPDFBatch(mention.id)
    ));

    const bibliography = papersData.flat().map(paper => {
      const authors = paper.authors.join(', ');
      return `${authors} (${paper.year}). ${paper.title}. *${paper.journal}*. ${paper.doi ? `https://doi.org/${paper.doi}` : ''}`;
    }).join('\n\n');

    await updateReportSection(reportId, 'References', bibliography);

    self.postMessage({
      type: 'SECTION_PROGRESS',
      payload: {
        progress: [{ section: 'References', status: 'completed' }]
      }
    });
  } catch (error) {
    console.error('Error generating bibliography:', error);
    self.postMessage({
      type: 'SECTION_PROGRESS',
      payload: {
        progress: [{ section: 'References', status: 'error' }]
      }
    });
  }
}

// Listen for messages from the main thread
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'START_GENERATION') {
    try {
      const { reportId, mindMap, searchQuery } = payload;

      // Generate content for each node in the mind map
      for (const node of mindMap) {
        await generateSection(node, reportId, searchQuery);
      }

      // Generate bibliography
      await generateBibliography(reportId, searchQuery);

      // Update report status to completed
      await supabase
        .from('reports')
        .update({ status: 'completed' })
        .eq('id', reportId);

      self.postMessage({ type: 'GENERATION_COMPLETE' });
    } catch (error) {
      console.error('Error in report generation:', error);
      self.postMessage({ type: 'GENERATION_ERROR' });
    }
  }
}; 