// ============================================================
// NEXO Intelligence Web — Router (SPA hash-based)
// ============================================================
window.NEXO = window.NEXO || {};

window.NEXO.router = (() => {
    let container = null;
    const routes = {};
    const pageCache = {};

    function setContainer(sel) { container = document.querySelector(sel); }

    function register(map) { Object.assign(routes, map); }

    async function navigate(route) {
        if (!container || !routes[route]) return;
        window.location.hash = '#/' + route;
    }

    async function loadRoute(route) {
        if (!container || !routes[route]) { route = 'copiloto'; }
        const cfg = routes[route];

        // Update active state
        document.querySelectorAll('.sidebar-link').forEach(el => {
            el.classList.toggle('active', el.dataset.route === route);
        });

        // Update page title
        const titles = {
            copiloto: 'Copiloto Estratégico',
            dashboard: 'Dashboard Executivo',
            operacional: 'Operacional por Loja',
            mercado: 'Mercado & Clima',
            financeiro: 'Financeiro',
            comparativo: 'Comparativo'
        };
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = titles[route] || route;

        // Load page content
        container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Carregando...</span></div>';

        try {
            let html;
            if (pageCache[route]) {
                html = pageCache[route];
            } else {
                const resp = await fetch(cfg.file);
                html = await resp.text();
                pageCache[route] = html;
            }
            container.innerHTML = html;

            // Execute inline scripts
            const scripts = container.querySelectorAll('script');
            for (const s of scripts) {
                const newScript = document.createElement('script');
                newScript.textContent = s.textContent;
                s.replaceWith(newScript);
            }

            if (cfg.init) await cfg.init();
        } catch (err) {
            container.innerHTML = `<div class="error-state"><p>Erro ao carregar a página.</p><p class="text-muted">${err.message}</p></div>`;
        }
    }

    function init() {
        window.addEventListener('hashchange', () => {
            const route = window.location.hash.replace('#/', '') || 'copiloto';
            loadRoute(route);
        });

        const route = window.location.hash.replace('#/', '') || 'copiloto';
        loadRoute(route);
    }

    return { setContainer, register, navigate, loadRoute, init };
})();
