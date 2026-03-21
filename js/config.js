// ============================================================
// NEXO Intelligence Web — Config
// ============================================================
window.NEXO = window.NEXO || {};

window.NEXO.config = {
    SUPABASE_URL: 'https://kkjfqltpykkuwshtfhow.supabase.co',
  SUPABASE_KEY: 'sb_publishable_x-ADwvaQzwBqIRSZuLKsuw_NWPS_qwC',
    APP_VERSION: '1.0.0',
    CACHE_TTL: 300000,
};

window.NEXO.supabase = window.supabase.createClient(
    NEXO.config.SUPABASE_URL,
    NEXO.config.SUPABASE_ANON_KEY
);
