// ============================================================
// NEXO Intelligence Web v2 — App Init
// Usa vars nativas: API, Router. Sem dependencia de NEXO.*
// ============================================================
(function() {
    document.addEventListener('DOMContentLoaded', function() {

        // Data no header
        var dateEl = document.getElementById('headerDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
        }

        // Sidebar toggle
        var sidebar = document.getElementById('sidebar');
        var menuBtn = document.getElementById('menu-toggle');
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', function() {
                sidebar.classList.toggle('sidebar-open');
            });
            document.addEventListener('click', function(e) {
                if (sidebar.classList.contains('sidebar-open') &&
                    !sidebar.contains(e.target) && e.target !== menuBtn) {
                    sidebar.classList.remove('sidebar-open');
                }
            });
        }

        // Filtros de rede/loja
        var filtroRedeEl = document.getElementById('filtro-rede');
        var filtroLojaEl = document.getElementById('filtro-loja');
        var todasLojas = [];

        if (filtroRedeEl && filtroLojaEl) {
            API.getRedes().then(function(redes) {
                redes.forEach(function(r) {
                    var opt = document.createElement('option');
                    opt.value = r.id; opt.textContent = r.nome;
                    filtroRedeEl.appendChild(opt);
                });
            }).catch(function(e) { console.warn('[App] getRedes:', e); });

            API.getLojas().then(function(lojas) {
                todasLojas = lojas;
                lojas.forEach(function(l) {
                    var opt = document.createElement('option');
                    opt.value = l.id; opt.textContent = l.nome;
                    filtroLojaEl.appendChild(opt);
                });
            }).catch(function(e) { console.warn('[App] getLojas:', e); });

            filtroRedeEl.addEventListener('change', function() {
                API.clearCache();
                var redeId = filtroRedeEl.value;
                filtroLojaEl.innerHTML = '<option value="">Todas as lojas</option>';
                (redeId
                    ? todasLojas.filter(function(l) { return l.id_rede === redeId; })
                    : todasLojas
                ).forEach(function(l) {
                    var opt = document.createElement('option');
                    opt.value = l.id; opt.textContent = l.nome;
                    filtroLojaEl.appendChild(opt);
                });
                window.location.hash = '#/' + (window.location.hash.replace('#/', '') || 'ruptura');
            });

            filtroLojaEl.addEventListener('change', function() {
                API.clearCache();
                window.location.hash = '#/' + (window.location.hash.replace('#/', '') || 'ruptura');
            });
        }

        // Helper global de filtros — usado pelas pages
        window.NEXO = window.NEXO || {};
        window.NEXO.getFilters = function() {
            return {
                redeId: filtroRedeEl ? (filtroRedeEl.value || null) : null,
                lojaId: filtroLojaEl ? (filtroLojaEl.value || null) : null
            };
        };

        // Inicializar router — pages ja se registram em seus proprios arquivos
        Router.init();
    });
})();
