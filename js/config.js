// ============================================================
// NEXO Intelligence Web v2 — Config
// Le credenciais do window.__NEXO_ENV__ gerado pelo build.
// NUNCA hardcode credenciais aqui.
// ============================================================
(function() {
    var env = window.__NEXO_ENV__;

    if (!env || !env.SUPABASE_URL || !env.SUPABASE_KEY) {
        console.error('[NEXO Config] Credenciais nao encontradas. Verifique o deploy.');
        return;
    }

    // Objeto usado pelo api.js
    window.NEXO_CONFIG = {
        SUPABASE_URL:      env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_KEY,
        VERSION:           '2.0.0',
        ENV:               'production'
    };

    // Limpar credenciais do window apos uso
    delete window.__NEXO_ENV__;
})();
