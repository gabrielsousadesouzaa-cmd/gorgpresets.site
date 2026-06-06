import { createClient } from '@supabase/supabase-js';

// Usamos any para evitar erros de tipagem do TS se o Vite não estiver totalmente configurado no IDE
const metaEnv = (import.meta as any).env;

const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Somente cria o cliente se tivermos os dados necessários.
// Caso contrário, exportamos null para que os hooks saibam que devem usar o mock.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn('Supabase credentials missing. App is running in Local Mock mode.');
}
