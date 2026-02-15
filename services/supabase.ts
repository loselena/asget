import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let isSupabaseInitialized = false;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        isSupabaseInitialized = true;
        console.log("Supabase initialized successfully.");
    } catch (e) {
        console.error("Supabase initialization failed", e);
    }
} else {
    console.warn("Supabase credentials missing. Running in offline/demo mode.");
}

export { supabase, isSupabaseInitialized };
