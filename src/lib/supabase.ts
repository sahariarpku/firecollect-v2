import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema setup
export const setupDatabase = async () => {
  const { error: tableError } = await supabase.rpc('setup_todos_schema', {});
  
  if (tableError) {
    console.error('Error setting up database:', tableError);
    return false;
  }

  // Create storage bucket for attachments if needed
  const { error: storageError } = await supabase.storage.createBucket('todo-attachments', {
    public: false,
    fileSizeLimit: 52428800, // 50MB
  });

  if (storageError && !storageError.message.includes('already exists')) {
    console.error('Error creating storage bucket:', storageError);
    return false;
  }

  return true;
}; 