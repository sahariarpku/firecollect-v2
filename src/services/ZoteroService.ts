import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type ZoteroCredentials = Database['public']['Tables']['zotero_credentials']['Row'];

export interface ZoteroItem {
  key: string;
  version: number;
  title: string;
  creators: Array<{ firstName: string; lastName: string; creatorType: string }>;
  date?: string;
  DOI?: string;
  abstractNote?: string;
  url?: string;
  itemType: string;
  extra?: string;
  tags?: Array<{ tag: string }>;
}

export interface ZoteroLibrary {
  id: string;
  name: string;
  type: 'user' | 'group';
  owner?: string;
  description?: string;
}

export interface ZoteroCollection {
  key: string;
  name: string;
  parentCollection?: string;
  version: number;
}

export class ZoteroService {
  private static apiKey: string | null = null;
  private static userId: string | null = null;
  private static BASE_URL = 'https://api.zotero.org';

  static async setCredentials(apiKey: string, zoteroUserId: string) {
    try {
      console.log('Attempting to validate Zotero credentials...');
      console.log('Using API Key:', apiKey.substring(0, 4) + '...');
      console.log('Using User ID:', zoteroUserId);

      // First verify the credentials with Zotero API
      const testResponse = await fetch(
        `${this.BASE_URL}/users/${zoteroUserId}/items/top?limit=1&format=json`,
        {
          headers: {
            'Zotero-API-Version': '3',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      console.log('Zotero API Response Status:', testResponse.status);
      console.log('Zotero API Response Headers:', Object.fromEntries(testResponse.headers.entries()));

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('Zotero API Error Response:', errorText);
        throw new Error(`Zotero API validation failed: ${testResponse.status} - ${errorText}`);
      }

      console.log('Zotero API validation successful');

      // Get the current user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Supabase Auth Error:', userError);
        throw new Error('Failed to get authenticated user');
      }
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('User not authenticated');
      }

      console.log('Supabase user found:', user.id);

      // If Zotero validation succeeds, save to Supabase
      const { error: upsertError } = await supabase
        .from('zotero_credentials')
        .upsert({
          user_id: user.id,
          api_key: apiKey,
          zotero_user_id: zoteroUserId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Supabase Upsert Error:', upsertError);
        throw upsertError;
      }

      console.log('Credentials saved to Supabase successfully');

      // Only set the static variables after everything succeeds
      this.apiKey = apiKey;
      this.userId = zoteroUserId;
      console.log('ZoteroService credentials set successfully');
    } catch (error) {
      // Clear the static variables if anything fails
      this.apiKey = null;
      this.userId = null;
      console.error('Error in setCredentials:', error);
      throw error;
    }
  }

  static async getAvailableLibraries(): Promise<ZoteroLibrary[]> {
    if (!this.apiKey || !this.userId) {
      throw new Error('Zotero credentials not set');
    }

    try {
      // Get user's personal library
      const personalLibrary: ZoteroLibrary = {
        id: this.userId,
        name: 'Personal Library',
        type: 'user'
      };

      // Get user's group libraries
      const groupsResponse = await fetch(
        `${this.BASE_URL}/users/${this.userId}/groups?format=json`,
        {
          headers: {
            'Zotero-API-Version': '3',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (!groupsResponse.ok) {
        throw new Error(`Failed to fetch group libraries: ${groupsResponse.statusText}`);
      }

      const groups = await groupsResponse.json();
      const groupLibraries: ZoteroLibrary[] = groups.map((group: any) => ({
        id: group.id,
        name: group.data.name,
        type: 'group',
        owner: group.data.owner,
        description: group.data.description
      }));

      return [personalLibrary, ...groupLibraries];
    } catch (error) {
      console.error('Error fetching libraries:', error);
      throw error;
    }
  }

  static async getCollections(libraryType: 'user' | 'group', libraryId: string): Promise<ZoteroCollection[]> {
    if (!this.apiKey) {
      throw new Error('Zotero credentials not set');
    }

    try {
      const baseUrl = libraryType === 'user' 
        ? `${this.BASE_URL}/users/${libraryId}`
        : `${this.BASE_URL}/groups/${libraryId}`;

      const response = await fetch(
        `${baseUrl}/collections?format=json`,
        {
          headers: {
            'Zotero-API-Version': '3',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch collections: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.map((collection: any) => ({
        key: collection.key,
        name: collection.data.name,
        parentCollection: collection.data.parentCollection,
        version: collection.version
      }));
    } catch (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }
  }

  static async getLibraryItems(libraryType: 'user' | 'group', libraryId: string, collectionKey?: string): Promise<ZoteroItem[]> {
    if (!this.apiKey) {
      throw new Error('Zotero credentials not set');
    }

    try {
      const baseUrl = libraryType === 'user' 
        ? `${this.BASE_URL}/users/${libraryId}`
        : `${this.BASE_URL}/groups/${libraryId}`;

      const collectionPath = collectionKey ? `/collections/${collectionKey}` : '';
      const response = await fetch(
        `${baseUrl}${collectionPath}/items?format=json&include=data&limit=100&itemType=-attachment`,
        {
          headers: {
            'Zotero-API-Version': '3',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zotero API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw Zotero items:', data.map((item: any) => ({ 
        title: item.data.title,
        date: item.data.date,
        parsedDate: this.getYearFromDate(item.data.date)
      })));

      return data.map((item: any) => ({
        key: item.key,
        version: item.version,
        title: item.data.title || 'Untitled',
        creators: item.data.creators || [],
        date: item.data.date,
        DOI: item.data.DOI,
        abstractNote: item.data.abstractNote || this.extractAbstractFromExtra(item.data.extra),
        url: item.data.url,
        itemType: item.data.itemType,
        extra: item.data.extra
      }));
    } catch (error) {
      console.error('Error fetching Zotero library:', error);
      throw error;
    }
  }

  private static extractAbstractFromExtra(extra: string | undefined): string | undefined {
    if (!extra) return undefined;
    
    // Look for abstract in the extra field
    const abstractMatch = extra.match(/Abstract:\s*([\s\S]+?)(?=\n\w+:|$)/i);
    return abstractMatch ? abstractMatch[1].trim() : undefined;
  }

  static formatAuthors(creators: Array<{ firstName: string; lastName: string; creatorType: string }>) {
    return creators
      .filter(creator => creator.creatorType === 'author')
      .map(author => `${author.firstName} ${author.lastName}`)
      .join(', ');
  }

  static getYearFromDate(date: string | undefined): string | null {
    if (!date) return null;
    
    // Log the raw date for debugging
    console.log('Processing date:', date);
    
    // Clean the date string
    const cleanDate = date.trim();
    
    // Try to find a 4-digit year in the date string
    const yearMatch = cleanDate.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      console.log('Found year via regex:', yearMatch[0]);
      return yearMatch[0];
    }
    
    // Try to parse the date string
    const parsedDate = new Date(cleanDate);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear().toString();
      console.log('Found year via Date parsing:', year);
      return year;
    }

    // Try to extract year from other date formats
    const yearOnly = cleanDate.match(/^\d{4}$/);
    if (yearOnly) {
      console.log('Found year via exact match:', yearOnly[0]);
      return yearOnly[0];
    }
    
    // If all else fails, try to find any 4-digit number that could be a year
    const anyYearMatch = cleanDate.match(/\d{4}/);
    if (anyYearMatch) {
      const year = parseInt(anyYearMatch[0]);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        console.log('Found year via any number match:', year.toString());
        return year.toString();
      }
    }
    
    console.log('No valid year found in:', date);
    return null;
  }

  static async checkCredentials(): Promise<{ apiKey: string; zoteroUserId: string; } | null> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return null;
      }

      // Get credentials from Supabase
      const { data, error } = await supabase
        .from('zotero_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return null;
      }

      const credentials = data as ZoteroCredentials;

      // Set the static variables
      this.apiKey = credentials.api_key;
      this.userId = credentials.user_id;

      return {
        apiKey: credentials.api_key,
        zoteroUserId: credentials.user_id
      };
    } catch (error) {
      console.error('Error checking Zotero credentials:', error);
      return null;
    }
  }
} 