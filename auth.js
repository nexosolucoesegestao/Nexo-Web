// ============================================================
// NEXO Intelligence Web — Auth Module
// ============================================================
window.NEXO = window.NEXO || {};

window.NEXO.auth = (() => {
    const sb = () => NEXO.supabase;

    async function getSession() {
        const { data: { session } } = await sb().auth.getSession();
        return session;
    }

    async function getUser() {
        const s = await getSession();
        return s ? s.user : null;
    }

    function getMeta(u) { return u?.user_metadata || {}; }
    function getRole(u) { return getMeta(u).role || null; }
    function getIdRede(u) { return getMeta(u).id_rede || null; }
    function getIdLoja(u) { return getMeta(u).id_loja || null; }
    function getNome(u) { return getMeta(u).nome || u?.email || 'Usuário'; }
    function isSuperAdmin(u) { return getRole(u) === 'super_admin'; }
    function isGestorRede(u) { return getRole(u) === 'gestor_rede'; }

    async function login(email, senha) {
        const { data, error } = await sb().auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: senha
        });
        if (error) {
            const msgs = {
                'Invalid login credentials': 'Email ou senha incorretos.',
                'Email not confirmed': 'Email não confirmado.',
            };
            throw new Error(msgs[error.message] || error.message);
        }
        const role = getRole(data.user);
        if (!role || !['super_admin', 'gestor_rede'].includes(role)) {
            await logout();
            throw new Error('Acesso restrito a gestores e administradores.');
        }
        return data.user;
    }

    async function logout() {
        await sb().auth.signOut();
        window.location.reload();
    }

    async function requireAuth() {
        const user = await getUser();
        if (!user) {
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-shell').style.display = 'none';
            return null;
        }
        const role = getRole(user);
        if (!role || !['super_admin', 'gestor_rede'].includes(role)) {
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-shell').style.display = 'none';
            return null;
        }
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';
        return user;
    }

    return { getSession, getUser, getMeta, getRole, getIdRede, getIdLoja, getNome, isSuperAdmin, isGestorRede, login, logout, requireAuth };
})();
