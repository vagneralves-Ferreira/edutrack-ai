import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const APP_WEB_URL = 'https://edutrack-ai-mauve-eight.vercel.app';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

/**
 * Storage adapter compatível com @supabase/supabase-js sobre chrome.storage.local.
 * Mantém a sessão do estudante persistente entre reaberturas do popup e renova tokens automaticamente.
 */
const chromeLocalStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    if (!hasChromeStorage()) {
      return Promise.resolve(localStorage.getItem(key));
    }
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime?.lastError) {
          resolve(null);
          return;
        }
        const value = result[key];
        resolve(typeof value === 'string' ? value : null);
      });
    });
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (!hasChromeStorage()) {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  },
  removeItem: (key: string): Promise<void> => {
    if (!hasChromeStorage()) {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => resolve());
    });
  },
};

export const extensionSupabase: SupabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeLocalStorageAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient);
