import { serve } from 'https://deno.land/std@0.167.0/http/server.ts';;
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Reference {
  id: string;
  title: string;
  authors: string[];
  year: string;
  doi?: string;
  journal?: string;
}

interface MindMapNode {
  id: string;
  title: string;
  level: number;
  parentId: string | null;
  references: Reference[];
  children: MindMapNode[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log('Received request data:', JSON.stringify(requestData, null, 2));
    
    const { reportId, mindMap, searchQuery } = requestData;
    
    // Detailed validation
    console.log('mindMap type:', typeof mindMap);
    console.log('mindMap isArray:', Array.isArray(mindMap));
    console.log('mindMap value:', JSON.stringify(mindMap, null, 2));

    if (!mindMap) {
      throw new Error('mindMap is missing from request');
    }

    if (!Array.isArray(mindMap)) {
      throw new Error(`mindMap must be an array, received ${typeof mindMap}`);
    }

    if (mindMap.length === 0) {
      throw new Error('mindMap array is empty');
    }

    // Validate each node in the mindMap
    mindMap.forEach((node, index) => {
      if (!node || typeof node !== 'object') {
        throw new Error(`Invalid node at index ${index}: must be an object`);
      }
      if (!node.id || !node.title || !node.level) {
        throw new Error(`Invalid node at index ${index}: missing required properties`);
      }
    });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update report status to processing
    await supabaseClient
      .from('reports')
      .update({ status: 'processing' })
      .eq('id', reportId);

    // Process each section
    async function generateSection(node: MindMapNode) {
      try {
        // Generate content for the section
        const content = await generateSectionContent(node, searchQuery);

        // Save section content
        await supabaseClient
          .from('report_sections')
          .insert([{
            report_id: reportId,
            section_name: node.title,
            content: content,
          }]);

        // Process child sections
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            await generateSection(child);
          }
        }
      } catch (error) {
        console.error(`Error generating section ${node.title}:`, error);
        throw error;
      }
    }

    // Process all sections
    for (const node of mindMap) {
      if (typeof node === 'object' && node !== null) {
        await generateSection(node);
      }
    }

    // Generate bibliography
    const bibliography = await generateBibliography(mindMap);
    await supabaseClient
      .from('report_sections')
      .insert([{
        report_id: reportId,
        section_name: 'References',
        content: bibliography,
      }]);

    // Update report status to completed
    await supabaseClient
      .from('reports')
      .update({ status: 'completed' })
      .eq('id', reportId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateSectionContent(node: MindMapNode, searchQuery: string): Promise<string> {
  // TODO: Implement actual content generation using your AI service
  // This is a placeholder
  return `Generated content for ${node.title} using ${node.references.length} references`;
}

async function generateBibliography(mindMap: MindMapNode[]): Promise<string> {
  const allReferences = new Set<Reference>();
  
  function collectReferences(node: MindMapNode) {
    node.references.forEach(ref => allReferences.add(ref));
    node.children?.forEach(child => collectReferences(child));
  }
  
  mindMap.forEach(node => collectReferences(node));
  
  return Array.from(allReferences)
    .map(paper => {
      const authors = paper.authors.join(', ');
      return `${authors} (${paper.year}). ${paper.title}. ${paper.journal ? `*${paper.journal}*. ` : ''}${paper.doi ? `https://doi.org/${paper.doi}` : ''}`;
    })
    .join('\n\n');
} 