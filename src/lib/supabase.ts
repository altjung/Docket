import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Singleton Supabase client to avoid multiple instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
        }
      }
    );
  }
  return supabaseInstance;
}

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-7cfb0012`;