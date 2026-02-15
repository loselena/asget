
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ✅ БЕЗОПАСНО: Используем переменные окружения вместо хардкода
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let isSupabaseInitialized = false;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });
        isSupabaseInitialized = true;
        console.log("✅ Supabase initialized successfully");
    } catch (e) {
        console.error("❌ Supabase initialization failed:", e);
    }
} else {
    console.warn("⚠️ Supabase credentials missing. Running in offline/demo mode.");
    console.warn("💡 Tip: Create .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export { supabase, isSupabaseInitialized };
