// ============================================================
// NEXO Intelligence Web — Auth Module
// Mesmo padrao do Admin: Supabase Auth + roles user_metadata
// Roles: super_admin, gestor_rede
// ============================================================
window.NEXO = window.NEXO || {};

window.NEXO.auth = (function() {

    function _sb() { return window.NEXO_SUPABASE; }

    async function getSession() {
        var res = await _sb().auth.getSession();
        return res.data.session || null;
    }

    async function getUser() {
        var s = await getSession();
        return s ? s.user : null;
    }

    function getMeta(u) { return (u && u.user_metadata) ? u.user_metadata : {}; }
    function getRole(u) { return getMeta(u).role || null; }
    function getIdRede(u) { return getMeta(u).id_rede || null; }
    function getNome(u) { return getMeta(u).nome || (u && u.email) || 'Usuário'; }
    function isSuperAdmin(u) { return getRole(u) === 'super_admin'; }
    function isGestorRede(u) { return getRole(u) === 'gestor_rede'; }

    async function login(email, senha) {
        var res = await _sb().auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: senha
        });
        if (res.error) {
            var msgs = {
                'Invalid login credentials': 'Email ou senha incorretos.',
                'Email not confirmed': 'Email não confirmado.',
                'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.'
            };
            throw new Error(msgs[res.error.message] || res.error.message);
        }
        var role = getRole(res.data.user);
        if (!role || ['super_admin','gestor_rede'].indexOf(role) === -1) {
            await logout();
            throw new Error('Acesso restrito a gestores e administradores NEXO.');
        }
        return res.data.user;
    }

    async function logout() {
        await _sb().auth.signOut();
        window.location.reload();
    }

    async function requireAuth() {
        var user = await getUser();
        var loginScreen = document.getElementById('login-screen');
        var appShell    = document.getElementById('app-shell');
        if (!user) {
            if (loginScreen) loginScreen.style.display = 'flex';
            if (appShell)    appShell.style.display    = 'none';
            return null;
        }
        var role = getRole(user);
        if (!role || ['super_admin','gestor_rede'].indexOf(role) === -1) {
            if (loginScreen) loginScreen.style.display = 'flex';
            if (appShell)    appShell.style.display    = 'none';
            return null;
        }
        if (loginScreen) loginScreen.style.display = 'none';
        if (appShell)    appShell.style.display    = 'flex';
        return user;
    }

    return { getSession, getUser, getMeta, getRole, getIdRede, getNome,
             isSuperAdmin, isGestorRede, login, logout, requireAuth };
})();
