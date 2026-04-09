// ============================================================
// NEXO Intelligence Web v2 — Config
// Lê credenciais do window.__NEXO_ENV__ gerado pelo build.
// NUNCA hardcode credenciais aqui.
// ============================================================

(function() {
    var env = window.__NEXO_ENV__;

    if (!env || !env.SUPABASE_URL || !env.SUPABASE_KEY) {
        console.error('[NEXO Config] Credenciais não encontradas. Verifique o deploy no Vercel.');
        return;
    }

    window.NEXO_CONFIG = {
        SUPABASE_URL:      env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_KEY,
        VERSION:           '2.0.0',
        ENV:               'production'
    };

    // Criar cliente Supabase global
    if (window.supabase && !window.NEXO_SUPABASE) {
        window.NEXO_SUPABASE = window.supabase.createClient(
            env.SUPABASE_URL,
            env.SUPABASE_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
    }

    // Limpar credenciais do window após uso
    delete window.__NEXO_ENV__;
})();
