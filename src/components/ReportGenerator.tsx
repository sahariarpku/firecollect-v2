import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { MindMapNode } from '@/types';

interface ReportGeneratorProps {
  mindMap: MindMapNode[];
  searchQuery: string;
}

export function ReportGenerator({ mindMap, searchQuery }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  // Subscribe to report status changes
  useEffect(() => {
    if (!reportId) return;

    const subscription = supabase
      .channel(`report-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `id=eq.${reportId}`,
        },
        async (payload) => {
          const { status } = payload.new;
          if (status === 'completed') {
            setIsGenerating(false);
            toast.success('Report generation completed!');
            // Use window.location for navigation
            window.location.href = `/reports/${reportId}`;
          } else if (status === 'error') {
            setIsGenerating(false);
            toast.error('Error generating report');
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [reportId]);

  const generateReport = async () => {
    try {
      setIsGenerating(true);

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error('You must be logged in to generate a report');
      }

      // Debug logging
      console.log('mindMap data structure:', JSON.stringify(mindMap, null, 2));
      console.log('mindMap type:', typeof mindMap);
      console.log('isArray:', Array.isArray(mindMap));
      console.log('mindMap first item:', mindMap[0] ? JSON.stringify(mindMap[0], null, 2) : 'empty');

      // Validate mindMap structure
      if (!Array.isArray(mindMap) || mindMap.length === 0) {
        throw new Error('Invalid mindMap structure');
      }

      // Ensure mindMap has the correct structure
      const validatedMindMap = mindMap.map(node => ({
        id: node.id || `node-${Math.random().toString(36).substr(2, 9)}`,
        title: node.title || 'Untitled Section',
        level: node.level || 1,
        parentId: node.parentId || null,
        references: Array.isArray(node.references) ? node.references : [],
        children: Array.isArray(node.children) ? node.children : []
      }));

      // Create initial report record
      const { data: report, error: createError } = await supabase
        .from('reports')
        .insert([{
          status: 'generating',
          search_query: searchQuery,
          structure: validatedMindMap,
          user_id: user.id, // Add the user's ID
        }])
        .select()
        .single();

      if (createError) throw createError;
      setReportId(report.id);

      // Call Edge Function to start report generation
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            reportId: report.id,
            mindMap: validatedMindMap,
            searchQuery,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start report generation');
      }

      toast.success('Report generation started');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to start report generation');
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateReport}
      disabled={isGenerating}
      className="mt-4"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Report...
        </>
      ) : (
        'Export Full Report'
      )}
    </Button>
  );
} 