// ============================================================
// NEXO Intelligence Web v2 — App Init
// Com autenticacao Supabase Auth — mesmo nivel do Admin
// ============================================================
(function() {
    document.addEventListener('DOMContentLoaded', function() {

        // ── Login handler ─────────────────────────────────────
        var btnLogin    = document.getElementById('btn-login');
        var loginEmail  = document.getElementById('login-email');
        var loginSenha  = document.getElementById('login-senha');
        var loginError  = document.getElementById('login-error');

        if (btnLogin) {
            btnLogin.addEventListener('click', function() {
                var email = loginEmail ? loginEmail.value : '';
                var senha = loginSenha ? loginSenha.value : '';
                if (!email || !senha) {
                    if (loginError) loginError.textContent = 'Preencha email e senha.';
                    return;
                }
                btnLogin.disabled = true;
                btnLogin.textContent = 'Entrando...';
                if (loginError) loginError.textContent = '';

                window.NEXO.auth.login(email, senha).then(function() {
                    window.location.reload();
                }).catch(function(err) {
                    if (loginError) loginError.textContent = err.message;
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'Entrar';
                });
            });
        }

        if (loginSenha) {
            loginSenha.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && btnLogin) btnLogin.click();
            });
        }

        // ── Auth check ───────────────────────────────────────
        window.NEXO.auth.requireAuth().then(function(user) {
            if (!user) return; // login screen ja visivel

            var nome = window.NEXO.auth.getNome(user);
            var isSuperAdmin = window.NEXO.auth.isSuperAdmin(user);
            var idRede = window.NEXO.auth.getIdRede(user);

            // Preencher info do usuario no header
            var userNameEl = document.getElementById('user-name');
            var userRoleEl = document.getElementById('user-role');
            var userAvEl   = document.getElementById('user-avatar');
            if (userNameEl) userNameEl.textContent = nome;
            if (userRoleEl) userRoleEl.textContent = isSuperAdmin ? 'Super Admin' : 'Gestor de Rede';
            if (userAvEl)   userAvEl.textContent   = nome.charAt(0).toUpperCase();

            // Data no header
            var dateEl = document.getElementById('headerDate');
            if (dateEl) dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });

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

            // Logout
            var btnLogout = document.getElementById('btn-logout');
            if (btnLogout) {
                btnLogout.addEventListener('click', function() {
                    if (confirm('Sair do painel?')) window.NEXO.auth.logout();
                });
            }

            // Filtros — super_admin ve tudo, gestor_rede ve so sua rede
            var filtroRedeEl = document.getElementById('filtro-rede');
            var filtroLojaEl = document.getElementById('filtro-loja');
            var todasLojas   = [];

            if (filtroRedeEl && filtroLojaEl) {
                // Super admin ve todas as redes; gestor ve apenas a sua
                API.getRedes().then(function(redes) {
                    var redesVisiveis = isSuperAdmin ? redes : redes.filter(function(r) { return r.id === idRede; });
                    redesVisiveis.forEach(function(r) {
                        var opt = document.createElement('option');
                        opt.value = r.id; opt.textContent = r.nome;
                        filtroRedeEl.appendChild(opt);
                    });
                    // Gestor de rede: pre-selecionar a propria rede
                    if (!isSuperAdmin && idRede) filtroRedeEl.value = idRede;
                }).catch(function(e) { console.warn('[App] getRedes:', e); });

                API.getLojas().then(function(lojas) {
                    todasLojas = lojas;
                    // Gestor de rede: mostrar so lojas da propria rede
                    var lojasFiltradas = isSuperAdmin ? lojas : lojas.filter(function(l) { return l.id_rede === idRede; });
                    lojasFiltradas.forEach(function(l) {
                        var opt = document.createElement('option');
                        opt.value = l.id; opt.textContent = l.nome;
                        filtroLojaEl.appendChild(opt);
                    });
                }).catch(function(e) { console.warn('[App] getLojas:', e); });

                filtroRedeEl.addEventListener('change', function() {
                    API.clearCache();
                    var redeId = filtroRedeEl.value;
                    filtroLojaEl.innerHTML = '<option value="">Todas as lojas</option>';
                    (redeId ? todasLojas.filter(function(l) { return l.id_rede === redeId; }) : todasLojas)
                        .forEach(function(l) {
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

            // Helper global de filtros
            window.NEXO = window.NEXO || {};
            window.NEXO.getFilters = function() {
                return {
                    redeId: filtroRedeEl ? (filtroRedeEl.value || null) : null,
                    lojaId: filtroLojaEl ? (filtroLojaEl.value || null) : null
                };
            };

            // Inicializar mapas e router
            Promise.all([
                Engine.buildLojaMap(),
                Engine.buildProdMap(),
                Engine.buildPessoaMap()
            ]).catch(function(e) { console.warn('[App] buildMaps:', e); });

            Router.init();
        });
    });
})();
