// ============================================================
// NEXO Intelligence Web v2 — Config
// Lê credenciais do window.__NEXO_ENV__ gerado pelo build.
// NUNCA hardcode credenciais aqui.
// ============================================================

(function() {
    var env = window.__NEXO_ENV__;

    if (!env || !env.SUPABASE_URL || !env.SUPABASE_KEY) {
        console.error('[NEXO Config] Credenciais nao encontradas. Verifique o deploy.');
        return;
    }

    // Objeto legado usado pelo api.js
    window.NEXO_CONFIG = {
        SUPABASE_URL:      env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_KEY,
        VERSION:           '2.0.0',
        ENV:               'production'
    };

    // Objeto NEXO usado pelo app.js
    window.NEXO = window.NEXO || {};
    window.NEXO.SUPABASE_URL = env.SUPABASE_URL;
    window.NEXO.SUPABASE_KEY = env.SUPABASE_KEY;

    // Cliente Supabase
    if (window.supabase && !window.NEXO_SUPABASE) {
        window.NEXO_SUPABASE = window.supabase.createClient(
            env.SUPABASE_URL, env.SUPABASE_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
        window.NEXO.supabase = window.NEXO_SUPABASE;
    }

    // Pontes: app.js chama NEXO.api.* mas o arquivo usa var API
    // Estas pontes sao criadas DEPOIS que api.js carrega — via DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        // Ponte API
        if (typeof window.API !== 'undefined') {
            window.NEXO.api = window.API;
        }
        // Ponte Router
        if (typeof window.Router !== 'undefined') {
            window.NEXO.router = window.Router;
            // loadRoute = alias para route()
            window.NEXO.router.loadRoute = function(page) {
                window.location.hash = '#/' + page;
            };
            // setContainer e register — o Router do Web nao usa arquivos HTML, usa handlers
            window.NEXO.router.setContainer = function() {};
            window.NEXO.router.register = function(routes) {
                Object.keys(routes).forEach(function(key) {
                    var cfg = routes[key];
                    window.Router.register(key, function(main) {
                        if (cfg.init) cfg.init();
                    });
                });
            };
        }
        // Auth stub — Web nao tem login, usa auth Supabase diretamente
        window.NEXO.auth = {
            requireAuth: function() { return Promise.resolve(true); },
            login:       function(e, s) { return Promise.resolve({ success: true }); },
            logout:      function() { window.location.reload(); },
            isSuperAdmin: function() { return true; },
            getNome:     function() { return 'Gestor'; },
            getRole:     function() { return 'gestor_rede'; }
        };
    });

    // Limpar credenciais do window apos uso
    delete window.__NEXO_ENV__;
})();
