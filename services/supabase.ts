
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credentials provided by user
const supabaseUrl = 'https://zucikfjtcsqkbbdnkbfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Y2lrZmp0Y3Nxa2JiZG5rYmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzYwODIsImV4cCI6MjA4MTExMjA4Mn0.NVBFXbZEVz4f9E9p4932KC0UKKqR-UDdwIl1ge_JTpw';

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
