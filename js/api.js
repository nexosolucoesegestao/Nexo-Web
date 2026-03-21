// ============================================================
// NEXO Intelligence Web — API Module
// ============================================================
window.NEXO = window.NEXO || {};

window.NEXO.api = (() => {
    const sb = () => NEXO.supabase;
    const _cache = {};

    function _cached(key, ttl, fn) {
        if (_cache[key] && Date.now() - _cache[key].ts < ttl) return Promise.resolve(_cache[key].data);
        return fn().then(d => { _cache[key] = { data: d, ts: Date.now() }; return d; });
    }

    function clearCache() { Object.keys(_cache).forEach(k => delete _cache[k]); }

    // ── Normalização: Supabase retorna boolean, engine espera 'SIM'/'NÃO' ──
    function _normDisp(d) {
        return {
            ...d,
            tem_estoque: d.tem_estoque === true ? 'SIM' : d.tem_estoque === false ? 'NÃO' : d.tem_estoque,
            disponivel_at: d.disponivel_at === true ? 'SIM' : d.disponivel_at === false ? 'NÃO' : d.disponivel_at,
            disponivel_as: d.disponivel_as === true ? 'SIM' : d.disponivel_as === false ? 'NÃO' : d.disponivel_as,
            // Mapear nomes de campo: motivo_indisponivel_at → motivo_at (compat engine)
            motivo_ruptura: d.motivo_ruptura || null,
            motivo_at: d.motivo_indisponivel_at || d.motivo_at || null,
            motivo_as: d.motivo_indisponivel_as || d.motivo_as || null,
        };
    }

    function _normPres(p) {
        return {
            ...p,
            presente: p.presente === true ? true : p.presente === false ? false : p.presente,
            motivo_falta: p.motivo_ausencia || p.motivo_falta || null,
        };
    }

    function _normTemp(t) {
        return {
            ...t,
            temperatura: t.temperatura_valor ?? t.temperatura ?? t.balcao_refrigerado ?? 0,
        };
    }

    // ── Filtros contextuais ──
    async function _redeFilter() {
        const u = await NEXO.auth.getUser();
        if (!u) return null;
        if (NEXO.auth.isSuperAdmin(u)) return null;
        return NEXO.auth.getIdRede(u);
    }

    // ── Redes ──
    async function getRedes() {
        return _cached('redes', 300000, async () => {
            const rf = await _redeFilter();
            let q = sb().from('redes').select('*').eq('ativo', true).order('nome');
            if (rf) q = q.eq('id', rf);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        });
    }

    // ── Lojas ──
    async function getLojas(redeId) {
        const key = 'lojas_' + (redeId || 'all');
        return _cached(key, 300000, async () => {
            const rf = await _redeFilter();
            let q = sb().from('lojas').select('*, redes(nome)').order('nome');
            if (redeId) q = q.eq('id_rede', redeId);
            else if (rf) q = q.eq('id_rede', rf);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        });
    }

    // ── Disponibilidade (ruptura) — últimos N dias ──
    async function getDisponibilidade(dias, lojaId) {
        const desde = new Date(); desde.setDate(desde.getDate() - dias);
        const desdeStr = desde.toISOString().slice(0, 10);
        const key = 'disp_' + dias + '_' + (lojaId || 'all');
        return _cached(key, 120000, async () => {
            let q = sb().from('disponibilidade').select('*').gte('data', desdeStr).order('data');
            if (lojaId) q = q.eq('loja_id', lojaId);
            const { data, error } = await q;
            if (error) throw error;
            return (data || []).map(_normDisp);
        });
    }

    // ── Quebra — últimos N dias ──
    async function getQuebra(dias, lojaId) {
        const desde = new Date(); desde.setDate(desde.getDate() - dias);
        const desdeStr = desde.toISOString().slice(0, 10);
        const key = 'quebra_' + dias + '_' + (lojaId || 'all');
        return _cached(key, 120000, async () => {
            let q = sb().from('quebra').select('*').gte('data', desdeStr).order('data');
            if (lojaId) q = q.eq('loja_id', lojaId);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        });
    }

    // ── Temperatura — últimos N dias ──
    async function getTemperatura(dias, lojaId) {
        const desde = new Date(); desde.setDate(desde.getDate() - dias);
        const desdeStr = desde.toISOString().slice(0, 10);
        const key = 'temp_' + dias + '_' + (lojaId || 'all');
        return _cached(key, 120000, async () => {
            let q = sb().from('temperatura').select('*').gte('data', desdeStr).order('data');
            if (lojaId) q = q.eq('loja_id', lojaId);
            const { data, error } = await q;
            if (error) throw error;
            return (data || []).map(_normTemp);
        });
    }

    // ── Presença — últimos N dias ──
    async function getPresenca(dias, lojaId) {
        const desde = new Date(); desde.setDate(desde.getDate() - dias);
        const desdeStr = desde.toISOString().slice(0, 10);
        const key = 'pres_' + dias + '_' + (lojaId || 'all');
        return _cached(key, 120000, async () => {
            let q = sb().from('presenca').select('*').gte('data', desdeStr).order('data');
            if (lojaId) q = q.eq('loja_id', lojaId);
            const { data, error } = await q;
            if (error) throw error;
            return (data || []).map(_normPres);
        });
    }

    // ── Registros (check-in) — últimos N dias ──
    async function getRegistros(dias, lojaId) {
        const desde = new Date(); desde.setDate(desde.getDate() - dias);
        const desdeStr = desde.toISOString().slice(0, 10);
        const key = 'reg_' + dias + '_' + (lojaId || 'all');
        return _cached(key, 120000, async () => {
            let q = sb().from('registros').select('*').gte('data', desdeStr).order('data');
            if (lojaId) q = q.eq('loja_id', lojaId);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        });
    }

    // ── Produtos ──
    async function getProdutos() {
        return _cached('produtos', 600000, async () => {
            const { data, error } = await sb().from('produtos').select('*').order('corte');
            if (error) throw error;
            return data || [];
        });
    }

    // ── Contratos ──
    async function getContratos() {
        return _cached('contratos', 300000, async () => {
            const { data, error } = await sb().from('contratos').select('*, redes(nome)').order('data_inicio', { ascending: false });
            if (error) throw error;
            return data || [];
        });
    }

    // ── Ocorrências ──
    async function getOcorrencias(lojaId) {
        const key = 'oc_' + (lojaId || 'all');
        return _cached(key, 120000, async () => {
            let q = sb().from('ocorrencias').select('*').order('created_at', { ascending: false });
            if (lojaId) q = q.eq('loja_id', lojaId);
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        });
    }

    // ── Bulk loader — carrega tudo de uma vez para o engine ──
    async function loadAllData(dias) {
        dias = dias || 30;
        const [redes, lojas, disp, quebra, temp, pres, produtos] = await Promise.all([
            getRedes(), getLojas(), getDisponibilidade(dias),
            getQuebra(dias), getTemperatura(dias), getPresenca(dias), getProdutos()
        ]);
        return { redes, lojas, disponibilidade: disp, quebra, temperatura: temp, presenca: pres, produtos };
    }

    return {
        getRedes, getLojas, getDisponibilidade, getQuebra, getTemperatura,
        getPresenca, getRegistros, getProdutos, getContratos, getOcorrencias,
        loadAllData, clearCache
    };
})();
