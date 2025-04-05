import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Toaster } from 'sonner';
import Auth from '@/components/Auth';
import { SearchHistory } from '@/components/SearchHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, Library, PenTool } from 'lucide-react';
import PDFUploadView from '@/components/PDFUploadView';
import { ResearchManager } from '@/components/ResearchManager';
import ZoteroConnect from '@/components/ZoteroConnect';
import UserProfile from '@/components/UserProfile';
import Canvas from '@/components/Canvas';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("papers");
  const [selectedQuery, setSelectedQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Check current auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = () => {
    setUser(null);
  };

  const handleSelectQuery = (query: string) => {
    setSelectedQuery(query);
    setSelectedId(null);
    setActiveTab("papers");
  };

  const handleViewData = (searchId: string, query: string) => {
    setSelectedId(searchId);
    setSelectedQuery(query);
    setActiveTab("papers");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen flex">
      <SearchHistory 
        onSelectQuery={handleSelectQuery}
        onViewData={handleViewData}
      />
      
      <div className="flex-1 min-h-screen overflow-y-auto">
        <div className="p-4 flex justify-end gap-2">
          <UserProfile user={user} onLogout={handleLogout} />
        </div>

        <main className="container mx-auto px-4 pb-8">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="papers" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Academic Paper Search
              </TabsTrigger>
              <TabsTrigger value="pdfs" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                PDF Analysis
              </TabsTrigger>
              <TabsTrigger value="zotero" className="flex items-center gap-1">
                <Library className="h-4 w-4" />
                Connect Zotero
              </TabsTrigger>
              <TabsTrigger value="canvas" className="flex items-center gap-1">
                <PenTool className="h-4 w-4" />
                Canvas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="papers">
              <ResearchManager 
                activeTab={activeTab}
                initialQuery={selectedQuery}
                initialSearchId={selectedId}
              />
            </TabsContent>

            <TabsContent value="pdfs">
              <PDFUploadView />
            </TabsContent>

            <TabsContent value="zotero">
              <ZoteroConnect />
            </TabsContent>

            <TabsContent value="canvas">
              <Canvas />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
