// ============================================================
// NEXO Intelligence Web v2 — API Layer
// Supabase REST — com normalizers e paginação automática
// ============================================================
var API = {
  _cache: {},

  _headers: function() {
    return {
      'apikey': NEXO_CONFIG.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + NEXO_CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
  },

  _url: function(table, query) {
    return NEXO_CONFIG.SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  },

  // Simple fetch (single page, max 1000 rows)
  _get: async function(table, query) {
    var key = table + '|' + (query || '');
    if (this._cache[key]) return this._cache[key];
    try {
      var res = await fetch(this._url(table, query), { headers: this._headers() });
      if (!res.ok) throw new Error('API ' + res.status);
      var data = await res.json();
      this._cache[key] = data;
      return data;
    } catch (e) {
      console.error('[API] Erro em', table, e);
      return [];
    }
  },

  // Paginated fetch (fetches ALL rows, 1000 per page)
  _getAll: async function(table, query) {
    var key = 'ALL|' + table + '|' + (query || '');
    if (this._cache[key]) return this._cache[key];
    try {
      var allData = [];
      var pageSize = 1000;
      var page = 0;
      var hasMore = true;
      var baseUrl = this._url(table, query);
      var headers = this._headers();

      while (hasMore && page < 20) {
        var from = page * pageSize;
        var to = from + pageSize - 1;
        headers['Range'] = from + '-' + to;

        var res = await fetch(baseUrl, { headers: headers });
        if (!res.ok) throw new Error('API ' + res.status);
        var data = await res.json();
        allData = allData.concat(data);
        hasMore = data.length === pageSize;
        page++;
      }

      this._cache[key] = allData;
      return allData;
    } catch (e) {
      console.error('[API] Erro paginado em', table, e);
      return [];
    }
  },

  clearCache: function() { this._cache = {}; },

  // ---- NORMALIZERS ----
  _normDisp: function(d) {
    if (!d) return d;
    d.tem_estoque = (d.tem_estoque === true || d.tem_estoque === 'SIM') ? 'SIM' : 'NÃO';
    d.disponivel_at = (d.disponivel_at === true || d.disponivel_at === 'SIM') ? 'SIM' : 'NÃO';
    d.disponivel_as = (d.disponivel_as === true || d.disponivel_as === 'SIM') ? 'SIM' : 'NÃO';
    if (!d.motivo_at && d.motivo_indisponivel_at) d.motivo_at = d.motivo_indisponivel_at;
    if (!d.motivo_as && d.motivo_indisponivel_as) d.motivo_as = d.motivo_indisponivel_as;
    if (!d.data && d.created_at) d.data = d.created_at.slice(0, 10);
    return d;
  },

  _normTemp: function(t) {
    if (!t) return t;
    t.conforme_balcao = (t.conforme_balcao === true || t.conforme_balcao === 'CONFORME') ? 'CONFORME' : 'NÃO CONFORME';
    t.conforme_camara_resf = (t.conforme_camara_resf === true || t.conforme_camara_resf === 'CONFORME') ? 'CONFORME' : 'NÃO CONFORME';
    t.conforme_camara_cong = (t.conforme_camara_cong === true || t.conforme_camara_cong === 'CONFORME') ? 'CONFORME' : 'NÃO CONFORME';
    return t;
  },

  _normPres: function(p) {
    if (!p) return p;
    if (typeof p.presentes === 'string') p.presentes = parseInt(p.presentes) || 0;
    if (typeof p.escala === 'string') p.escala = parseInt(p.escala) || 0;
    return p;
  },

  // ---- QUERIES ----

  getRedes: async function() {
    return this._get('redes', 'select=*&order=nome');
  },

  getLojas: async function(redeId) {
    var q = (redeId) ? 'select=*&rede_id=eq.' + redeId + '&order=nome' : 'select=*&order=nome';
    return this._get('lojas', q);
  },

  getProdutos: async function() {
    return this._get('produtos', 'select=*&order=corte_pai');
  },

  getPessoas: async function(lojaId) {
    var q = (lojaId) ? 'select=*&loja_id=eq.' + lojaId + '&order=nome' : 'select=*&order=nome';
    return this._get('pessoas', q);
  },

  getMotivos: async function() {
    return this._get('motivos', 'select=*&order=contexto,motivo');
  },

  // PAGINATED — fetches ALL rows
  getDisponibilidade: async function(filters) {
    var q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
      if (filters.ate) q += '&data=lte.' + filters.ate;
    }
    var data = await this._getAll('disponibilidade', q);
    var self = this;
    return data.map(function(d) { return self._normDisp(d); }).filter(function(d) { return d.data; });
  },

  getTemperatura: async function(filters) {
    var q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
    }
    var data = await this._getAll('temperatura', q);
    var self = this;
    return data.map(function(t) { return self._normTemp(t); });
  },

  getPresenca: async function(filters) {
    var q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
    }
    var data = await this._getAll('presenca', q);
    var self = this;
    return data.map(function(p) { return self._normPres(p); });
  },

  getQuebra: async function(filters) {
    var q = 'select=*&order=data.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.desde) q += '&data=gte.' + filters.desde;
    }
    return this._getAll('quebra', q);
  },

  getOcorrencias: async function(filters) {
    var q = 'select=*,ocorrencias_acoes(*)&order=data_abertura.desc';
    if (filters) {
      if (filters.lojaId) q += '&loja_id=eq.' + filters.lojaId;
      if (filters.status) q += '&status=eq.' + filters.status;
    }
    return this._get('ocorrencias', q);
  }
};
