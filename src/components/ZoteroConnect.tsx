import { useState, useEffect } from 'react';
import { ZoteroService, ZoteroItem, ZoteroLibrary, ZoteroCollection } from '@/services/ZoteroService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { MessageSquare, Download, Trash2, X } from 'lucide-react';
import { exportPapersToExcel } from '@/utils/exportUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import ZoteroChat from './ZoteroChat';
import { supabase } from '@/integrations/supabase/client';

const ZoteroConnect = () => {
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [libraries, setLibraries] = useState<ZoteroLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<ZoteroLibrary | null>(null);
  const [collections, setCollections] = useState<ZoteroCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<ZoteroCollection | null>(null);
  const [libraryItems, setLibraryItems] = useState<ZoteroItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [formattedPapers, setFormattedPapers] = useState<Array<{
    title: string;
    authors: string;
    year: string | null;
    abstract: string;
    doi: string;
    url: string;
  }>>([]);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsInitializing(false);
          return;
        }

        // Get saved credentials
        const { data: credentials, error } = await supabase
          .from('zotero_credentials')
          .select('api_key, zotero_user_id')
          .eq('user_id', user.id)
          .single();

        if (error || !credentials) {
          console.error('Error loading credentials:', error);
          setIsInitializing(false);
          return;
        }

        // Auto-connect with saved credentials
        await ZoteroService.setCredentials(
          credentials.api_key as string,
          credentials.zotero_user_id as string
        );
        const availableLibraries = await ZoteroService.getAvailableLibraries();
        
        setLibraries(availableLibraries);
        setIsConnected(true);

        // Automatically select personal library
        const personalLibrary = availableLibraries.find(lib => lib.type === 'user');
        if (personalLibrary) {
          handleLibrarySelect(personalLibrary);
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
        toast.error('Failed to load saved credentials. Please reconnect.');
      } finally {
        setIsInitializing(false);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleConnect = async () => {
    if (!apiKey.trim() || !userId.trim()) {
      toast.error('Please enter both API key and user ID');
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Starting Zotero connection process...');
      await ZoteroService.setCredentials(apiKey, userId);
      console.log('Credentials set successfully, fetching libraries...');
      const availableLibraries = await ZoteroService.getAvailableLibraries();
      
      setLibraries(availableLibraries);
      setIsConnected(true);
      toast.success(`Successfully connected to Zotero. Found ${availableLibraries.length} libraries.`);

      // Automatically select personal library
      const personalLibrary = availableLibraries.find(lib => lib.type === 'user');
      if (personalLibrary) {
        handleLibrarySelect(personalLibrary);
      }
    } catch (error) {
      console.error('Detailed connection error:', error);
      let errorMessage = 'Failed to connect to Zotero. ';
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage += 'Invalid API key. Please check your credentials.';
        } else if (error.message.includes('403')) {
          errorMessage += 'Access forbidden. Please check your API key permissions.';
        } else if (error.message.includes('404')) {
          errorMessage += 'User ID not found. Please check your user ID.';
        } else if (error.message.includes('User not authenticated')) {
          errorMessage += 'Please sign in to your account first.';
        } else if (error.message.includes('Failed to get authenticated user')) {
          errorMessage += 'Authentication error. Please try refreshing the page.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please check your credentials and try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLibrarySelect = async (library: ZoteroLibrary) => {
    setSelectedLibrary(library);
    setSelectedCollection(null);
    setLibraryItems([]);
    setIsLoadingItems(true);
    
    try {
      // Load collections
      const availableCollections = await ZoteroService.getCollections(library.type, library.id);
      setCollections(availableCollections);

      // Load library items
      const items = await ZoteroService.getLibraryItems(library.type, library.id);
      setLibraryItems(items);
      
      toast.success(`Found ${items.length} papers in ${library.name}`);
    } catch (error) {
      console.error('Error loading library data:', error);
      toast.error('Failed to load library data');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleCollectionSelect = async (collection: ZoteroCollection) => {
    setSelectedCollection(collection);
    setIsLoadingItems(true);
    try {
      const items = await ZoteroService.getLibraryItems(
        selectedLibrary!.type,
        selectedLibrary!.id,
        collection.key
      );
      setLibraryItems(items);
      toast.success(`Found ${items.length} papers related to the topic.`);
    } catch (error) {
      console.error('Error loading collection items:', error);
      toast.error('Failed to load collection items');
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const exportData = libraryItems.map(item => ({
        name: item.title,
        author: ZoteroService.formatAuthors(item.creators),
        year: ZoteroService.getYearFromDate(item.date),
        abstract: item.abstractNote || '',
        doi: item.DOI || '',
        url: item.url || ''
      }));

      const fileName = selectedCollection 
        ? `zotero-${selectedLibrary?.name}-${selectedCollection.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`
        : `zotero-${selectedLibrary?.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`;

      exportPapersToExcel(exportData, fileName);
      toast.success('Collection exported successfully');
    } catch (error) {
      console.error('Error exporting collection:', error);
      toast.error('Failed to export collection');
    }
  };

  const handleDelete = () => {
    setLibraryItems([]);
    setSelectedCollection(null);
    toast.success('Results cleared successfully');
  };

  const handleChatOpen = () => {
    const papers = libraryItems.map(item => ({
      title: item.title,
      authors: ZoteroService.formatAuthors(item.creators),
      year: ZoteroService.getYearFromDate(item.date),
      abstract: item.abstractNote || '',
      doi: item.DOI || '',
      url: item.url || ''
    }));
    setFormattedPapers(papers);
    setIsChatOpen(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {isInitializing ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : !isConnected ? (
        <>
          <h2 className="text-xl font-semibold mb-4">Connect to Zotero</h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter your Zotero API key and user ID to connect to your library.
            <br />
            <a 
              href="https://www.zotero.org/settings/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Get your API key here
            </a>
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Zotero API key"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your Zotero user ID"
                className="w-full"
              />
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect to Zotero'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Select
                value={selectedLibrary?.id}
                onValueChange={(value) => {
                  const library = libraries.find(lib => lib.id === value);
                  if (library) handleLibrarySelect(library);
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a library" />
                </SelectTrigger>
                <SelectContent>
                  {libraries.map((library) => (
                    <SelectItem key={library.id} value={library.id}>
                      {library.name}
                      {library.type === 'group' && (
                        <span className="text-xs text-gray-500 ml-2">(Group)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {collections.length > 0 && (
                <Select
                  value={selectedCollection?.key}
                  onValueChange={(value) => {
                    const collection = collections.find(col => col.key === value);
                    if (collection) handleCollectionSelect(collection);
                  }}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.key} value={collection.key}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {isLoadingItems ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : libraryItems.length > 0 ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold mb-2">Research Summary</h1>
                <p className="text-gray-600">
                  Found {libraryItems.length} papers in {selectedCollection ? `collection "${selectedCollection.name}"` : selectedLibrary.name}.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleChatOpen}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat with AI
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleDownloadExcel}
                >
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Result
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Abstract</TableHead>
                      <TableHead>DOI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {libraryItems.map((item) => (
                      <TableRow key={item.key}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>{ZoteroService.formatAuthors(item.creators)}</TableCell>
                        <TableCell>{ZoteroService.getYearFromDate(item.date) || 'N/A'}</TableCell>
                        <TableCell className="max-w-md">
                          <ScrollArea className="h-24">
                            <p className="text-sm text-gray-600">{item.abstractNote || 'No abstract available'}</p>
                          </ScrollArea>
                        </TableCell>
                        <TableCell>
                          {item.DOI ? (
                            <a 
                              href={`https://doi.org/${item.DOI}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {item.DOI}
                            </a>
                          ) : (
                            <span className="text-gray-500">No DOI</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No papers found in this library.</p>
            </div>
          )}

          {isChatOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="w-full max-w-4xl">
                <ZoteroChat
                  papers={formattedPapers}
                  onClose={() => setIsChatOpen(false)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ZoteroConnect; 