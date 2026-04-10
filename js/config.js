// ============================================================
// NEXO Intelligence Web v2 — Config
// ============================================================
(function() {
    var env = window.__NEXO_ENV__;
    if (!env || !env.SUPABASE_URL || !env.SUPABASE_KEY) {
        console.error('[NEXO Config] Credenciais nao encontradas.');
        return;
    }

    window.NEXO_CONFIG = {
        SUPABASE_URL:      env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_KEY,
        VERSION:           '2.0.0',
        ENV:               'production'
    };

    // Cliente Supabase com auth persistido (necessario para login)
    if (window.supabase && !window.NEXO_SUPABASE) {
        window.NEXO_SUPABASE = window.supabase.createClient(
            env.SUPABASE_URL,
            env.SUPABASE_KEY,
            { auth: { persistSession: true, autoRefreshToken: true } }
        );
    }

    delete window.__NEXO_ENV__;
})();
