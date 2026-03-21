// ============================================================
// NEXO Intelligence Web v2 — API Layer
// Supabase REST — com mappers e normalizers
// ============================================================
const API = {
  _cache: {},

  _headers() {
    return {
      'apikey': NEXO_CONFIG.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + NEXO_CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
  },

  _url(table, query) {
    return NEXO_CONFIG.SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  },

  async _get(table, query) {
    const key = table + '|' + (query || '');
    if (this._cache[key]) return this._cache[key];
    try {
      const res = await fetch(this._url(table, query), { headers: this._headers() });
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      this._cache[key] = data;
      return data;
    } catch (e) {
      console.error('[API] Erro em', table, e);
      return [];
    }
  },

  clearCache() { this._cache = {}; },

  // ---- NORMALIZERS: Supabase boolean → string ----
  // ---- NORMALIZERS: Supabase boolean → string + fix nulls ----
  _normDisp(d) {
    if (!d) return d;
    d.tem_estoque = (d.tem_estoque === true || d.tem_estoque === 'SIM') ? 'SIM' : 'NÃO';
    d.disponivel_at = (d.disponivel_at === true || d.disponivel_at === 'SIM') ? 'SIM' : 'NÃO';
    d.disponivel_as = (d.disponivel_as === true || d.disponivel_as === 'SIM') ? 'SIM' : 'NÃO';
    // Map actual Supabase column names to engine-expected names
    if (!d.motivo_at && d.motivo_indisponivel_at) d.motivo_at = d.motivo_indisponivel_at;
    if (!d.motivo_as && d.motivo_indisponivel_as) d.motivo_as = d.motivo_indisponivel_as;
    // Use created_at as fallback for data if null
    if (!d.data && d.created_at) d.data = d.created_at.slice(0, 10);
    // Use registro_id prefix as loja fallback if loja_id is null
    if (!d.loja_id && d.registro_id) {
      // registro_id format is REG-XXX, try to find loja from registros
      // For now, assign based on producto_id hash to distribute across lojas
    }
    return d;
  },

  _normTemp(t) {
    if (!t) return t;
    t.conforme_balcao = (t.conforme_balcao === true || t.conforme_balcao === 'CONFORME') ? 'CONFORME' : 'NÃO CONFORME';
    t.conforme_camara_resf = (t.conforme_camara_resf === true || t.conforme_camara_resf === 'CONFORME') ? 'CONFORME' : 'NÃO CONFORME';
    t.conforme_camara_cong = (t.conforme_camara_cong === true || t.conforme_camara_cong === 'CONFORME') ? 'CONFORME' : 'NÃO CONFORME';
    return t;
  },

  _normPres(p) {
    if (!p) return p;
    if (typeof p.presentes === 'string') p.presentes = parseInt(p.presentes) || 0;
    if (typeof p.escala === 'string') p.escala = parseInt(p.escala) || 0;
    return p;
  },

  // ---- QUERIES ----

  async getRedes() {
    return this._get('redes', 'select=*&order=nome');
  },

  async getLojas(redeId) {
    const q = redeId ? 'select=*&rede_id=eq.' + redeId + '&order=nome' : 'select=*&order=nome';
    return this._get('lojas', q);
  },

  async getProdutos() {
    const data = await this._get('produtos', 'select=*&order=corte_pai');
    return data;
  },

  async getProdutosLoja(lojaId) {
    const data = await this._get('loja_produtos', 'select=*,produtos(*)&loja_id=eq.' + lojaId);
    return data;
  },

  async getPessoas(lojaId) {
    const q = lojaId ? 'select=*&loja_id=eq.' + lojaId + '&order=nome' : 'select=*&order=nome';
    return this._get('pessoas', q);
  },

  async getMotivos() {
    return this._get('motivos', 'select=*&order=contexto,motivo');
  },

  async getDisponibilidade(filters) {
    let q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
      if (filters.ate) q += '&data=lte.' + filters.ate;
    }
    const data = await this._get('disponibilidade', q);
    return data.map(d => this._normDisp(d));
  },

  async getTemperatura(filters) {
    let q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
    }
    const data = await this._get('temperatura', q);
    return data.map(t => this._normTemp(t));
  },

  async getPresenca(filters) {
    let q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
    }
    const data = await this._get('presenca', q);
    return data.map(p => this._normPres(p));
  },

  async getQuebra(filters) {
    let q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
    }
    return this._get('quebra', q);
  },

  async getOcorrencias(filters) {
    let q = 'select=*,ocorrencias_acoes(*)&order=data_abertura.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.status) q += '&status=eq.' + filters.status;
    }
    return this._get('ocorrencias', q);
  }
};
