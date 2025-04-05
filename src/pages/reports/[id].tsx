import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ReportSection {
  id: string;
  section_name: string;
  content: string;
  created_at: string;
}

interface Report {
  id: string;
  status: 'generating' | 'completed' | 'error';
  search_query: string;
  created_at: string;
}

const ReportView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in to view reports');
          return;
        }

        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (reportError) throw reportError;
        setReport(reportData);

        const { data: sectionsData, error: sectionsError } = await supabase
          .from('report_sections')
          .select('*')
          .eq('report_id', id)
          .order('created_at', { ascending: true });

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);
      } catch (error) {
        console.error('Error fetching report:', error);
        toast.error('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('report_sections')
      .on<RealtimePostgresChangesPayload<ReportSection>>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_sections',
          filter: `report_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && 'new' in payload) {
            const newSection = payload.new as unknown as ReportSection;
            setSections(prev => [...prev, newSection]);
          } else if (payload.eventType === 'UPDATE' && 'new' in payload) {
            const updatedSection = payload.new as unknown as ReportSection;
            setSections(prev => prev.map(section => 
              section.id === updatedSection.id ? updatedSection : section
            ));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Report Not Found</h2>
          <p className="text-gray-600 mb-4">The report you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/reports')}>Back to Reports</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{report.search_query}</h1>
          <p className="text-gray-600">
            Created on {format(new Date(report.created_at), 'PPP')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            report.status === 'completed' ? 'bg-green-500' :
            report.status === 'generating' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          <span className="capitalize">{report.status}</span>
        </div>
      </div>

      {report.status === 'generating' && (
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            This report is still being generated. New sections will appear here as they are completed.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.section_name}</CardTitle>
              <CardDescription>
                Generated on {format(new Date(section.created_at), 'PPP')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {section.content}
              </div>
            </CardContent>
          </Card>
        ))}

        {sections.length === 0 && report.status === 'completed' && (
          <div className="text-center py-8">
            <p className="text-gray-600">No sections have been generated for this report yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportView; 