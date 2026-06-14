// Parts Village - Supabase Client
const SUPABASE_URL = window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';
const isConfigured = SUPABASE_URL && !SUPABASE_URL.includes('YOUR_');

if (isConfigured && typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Parts Village] Supabase connected');
    } catch (err) {
        console.error('[Parts Village] Supabase init failed:', err.message);
        window.supabaseClient = null;
    }
} else {
    window.supabaseClient = null;
}
