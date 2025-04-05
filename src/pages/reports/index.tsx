import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface Report {
  id: string;
  status: 'generating' | 'completed' | 'error';
  search_query: string;
  created_at: string;
}

const ReportsList = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in to view reports');
          return;
        }

        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReports(data || []);
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Reports Found</h2>
          <p className="text-gray-600 mb-4">You haven't generated any reports yet.</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Reports</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="truncate">{report.search_query}</CardTitle>
              <CardDescription>
                Created on {format(new Date(report.created_at), 'PPP')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  report.status === 'completed' ? 'bg-green-500' :
                  report.status === 'generating' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <span className="capitalize">{report.status}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => navigate(`/reports/${report.id}`)}
                disabled={report.status === 'generating'}
              >
                View Report
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReportsList; 