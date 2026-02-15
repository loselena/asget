// services/supabase.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// ✅ БЕЗОПАСНО: Используем переменные окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<Database> | null = null;
let isSupabaseInitialized = false;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
        isSupabaseInitialized = true;
        console.log("✅ Supabase initialized successfully");
    } catch (e) {
        console.error("❌ Supabase initialization failed:", e);
    }
} else {
    console.warn("⚠️ Supabase credentials missing. Running in offline/demo mode.");
}

export { supabase, isSupabaseInitialized };
export type { Database };
