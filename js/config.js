// ============================================================
// NEXO Intelligence Web v2 — Config
// Lê credenciais do window.__NEXO_ENV__ gerado pelo build.
// NUNCA hardcode credenciais aqui.
// ============================================================

(function() {
    var env = window.__NEXO_ENV__;

    if (!env || !env.SUPABASE_URL || !env.SUPABASE_KEY) {
        console.error('[NEXO Config] Credenciais nao encontradas. Verifique o deploy no Vercel.');
        return;
    }

    // Objeto principal usado pelo api.js
    window.NEXO_CONFIG = {
        SUPABASE_URL:      env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_KEY,
        VERSION:           '2.0.0',
        ENV:               'production'
    };

    // Alias legado usado pelo app.js (NEXO.auth, NEXO.api, etc.)
    window.NEXO = window.NEXO || {};
    window.NEXO.SUPABASE_URL = env.SUPABASE_URL;
    window.NEXO.SUPABASE_KEY = env.SUPABASE_KEY;

    // Cliente Supabase global
    if (window.supabase && !window.NEXO_SUPABASE) {
        window.NEXO_SUPABASE = window.supabase.createClient(
            env.SUPABASE_URL,
            env.SUPABASE_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
        // Alias para o app.js que pode usar NEXO.supabase
        window.NEXO.supabase = window.NEXO_SUPABASE;
    }

    // Limpar credenciais do window apos uso
    delete window.__NEXO_ENV__;
})();
