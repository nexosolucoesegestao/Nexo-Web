// ============================================================
// NEXO Intelligence Web — App Init
// ============================================================
(async () => {

    // ── Login handler ──
    document.getElementById('btn-login').addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        const errEl = document.getElementById('login-error');
        const btn = document.getElementById('btn-login');

        if (!email || !senha) { errEl.textContent = 'Preencha email e senha.'; return; }
        btn.disabled = true; btn.textContent = 'Entrando...'; errEl.textContent = '';

        try {
            await NEXO.auth.login(email, senha);
            window.location.reload();
        } catch (err) {
            errEl.textContent = err.message;
            btn.disabled = false; btn.textContent = 'Entrar';
        }
    });

    document.getElementById('login-senha').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-login').click();
    });

    // ── Auth check ──
    const user = await NEXO.auth.requireAuth();
    if (!user) return;

    const isSuperAdmin = NEXO.auth.isSuperAdmin(user);
    const nome = NEXO.auth.getNome(user);

    document.getElementById('user-name').textContent = nome;
    document.getElementById('user-role').textContent = isSuperAdmin ? 'Super Admin' : 'Gestor de Rede';
    document.getElementById('user-avatar').textContent = nome.charAt(0).toUpperCase();

    // ── Date ──
    const now = new Date();
    document.getElementById('header-date').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // ── Sidebar toggle ──
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    document.getElementById('menu-toggle').addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
        backdrop.classList.toggle('visible');
    });
    backdrop.addEventListener('click', () => {
        sidebar.classList.remove('sidebar-open');
        backdrop.classList.remove('visible');
    });
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                sidebar.classList.remove('sidebar-open');
                backdrop.classList.remove('visible');
            }
        });
    });

    // ── Logout ──
    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm('Sair do painel?')) NEXO.auth.logout();
    });

    // ── Filters ──
    document.getElementById('nav-filtro-rede').style.display = '';

    try {
        const redes = await NEXO.api.getRedes();
        const redeSelect = document.getElementById('filtro-rede');
        redes.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id; opt.textContent = r.nome;
            redeSelect.appendChild(opt);
        });

        const lojas = await NEXO.api.getLojas();
        const lojaSelect = document.getElementById('filtro-loja');
        lojas.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id; opt.textContent = l.nome;
            lojaSelect.appendChild(opt);
        });

        redeSelect.addEventListener('change', async () => {
            NEXO.api.clearCache();
            const redeId = redeSelect.value;
            const filteredLojas = redeId ? lojas.filter(l => l.id_rede === redeId) : lojas;
            lojaSelect.innerHTML = '<option value="">Todas as lojas</option>';
            filteredLojas.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.id; opt.textContent = l.nome;
                lojaSelect.appendChild(opt);
            });
            // Reload current page
            const route = window.location.hash.replace('#/', '') || 'copiloto';
            NEXO.router.loadRoute(route);
        });

        lojaSelect.addEventListener('change', () => {
            NEXO.api.clearCache();
            const route = window.location.hash.replace('#/', '') || 'copiloto';
            NEXO.router.loadRoute(route);
        });
    } catch (err) {
        console.error('Erro ao carregar filtros:', err);
    }

    // Helper global para pegar filtros
    window.NEXO.getFilters = () => ({
        redeId: document.getElementById('filtro-rede')?.value || null,
        lojaId: document.getElementById('filtro-loja')?.value || null
    });

    // ── Router setup ──
    NEXO.router.setContainer('#page-container');
    NEXO.router.register({
        copiloto:     { file: 'pages/copiloto.html',     init: () => window.initCopiloto?.() },
        dashboard:    { file: 'pages/dashboard.html',     init: () => window.initDashboard?.() },
        operacional:  { file: 'pages/operacional.html',   init: () => window.initOperacional?.() },
        mercado:      { file: 'pages/mercado.html',       init: () => window.initMercado?.() },
        financeiro:   { file: 'pages/financeiro.html',    init: () => window.initFinanceiro?.() },
        comparativo:  { file: 'pages/comparativo.html',   init: () => window.initComparativo?.() },
    });
    NEXO.router.init();

})();
