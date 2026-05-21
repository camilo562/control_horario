import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);
const hasPlaceholderCredentials = Boolean(
  supabaseUrl?.includes('tu_proyecto_url') ||
  supabaseAnonKey?.includes('tu_anon_key')
);
const hasValidSupabaseCredentials = hasSupabaseCredentials && !hasPlaceholderCredentials;

if (!hasValidSupabaseCredentials) {
  console.warn(
    'Supabase credentials missing inside environment variables. Ensure .env.local is configured correctly.'
  );
}

export const supabase = hasValidSupabaseCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => Boolean(supabase);

export const getSupabaseConfigMessage = () => (
  'La base de datos no esta configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para registrar datos reales.'
);
