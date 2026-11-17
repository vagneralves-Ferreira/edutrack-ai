import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const missingSupabaseEnv: string[] = [
  ...(!supabaseUrl ? ['VITE_SUPABASE_URL'] : []),
  ...(!supabaseAnonKey ? ['VITE_SUPABASE_ANON_KEY'] : []),
];

if (missingSupabaseEnv.length > 0) {
  console.error(`Configuração ausente: ${missingSupabaseEnv.join(', ')}`);
}

export const supabase: SupabaseClient =
  missingSupabaseEnv.length === 0
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as unknown as SupabaseClient);
