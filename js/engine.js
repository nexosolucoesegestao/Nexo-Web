// ============================================================
// NEXO Intelligence Web v2 — Engine (Motor de Inteligencia)
// Processa dados e gera: aggregations, rankings, insights cruzados
// ============================================================
var Engine = {
  // ────────────────────────────────────────────────────────────
  // MAX_MESES_VISUAL: limite de meses exibidos nos gráficos evolutivos.
  // Decisão 16/Abr/2026: 6 meses garante legibilidade no canvas de 228px
  // (gap de 38px entre barras). Dados completos continuam disponíveis
  // para engine/IA — apenas a saída dos métodos de evolutivo é cortada.
  // Aplicar a mesma regra em qualquer novo evolutivo mensal.
  // ────────────────────────────────────────────────────────────
  MAX_MESES_VISUAL: 6,

  _prodMap: {},
  _lojaMap: {},
  _pessoaMap: {},

  buildProdMap: async function() {
    var prods = await API.getProdutos();
    var self = this;
    prods.forEach(function(p) { self._prodMap[p.id] = p.corte_pai; });
    return this._prodMap;
  },

  prodName: function(id) { return this._prodMap[id] || id; },

  buildLojaMap: async function(redeId) {
    var lojas = await API.getLojas(redeId);
    var self = this;
    lojas.forEach(function(l) { self._lojaMap[l.id] = l.nome; });
    return this._lojaMap;
  },

  lojaName: function(id) { return this._lojaMap[id] || id; },

  buildPessoaMap: async function() {
    var pessoas = await API.getPessoas();
    var self = this;
    pessoas.forEach(function(p) { self._pessoaMap[p.id] = p.nome; });
    return this._pessoaMap;
  },

  pessoaName: function(id) { return this._pessoaMap[id] || id; },

  // ============================================================
  // RUPTURA KPI
  // ============================================================
  processRuptura: function(disp, periodDias) {
    var maxDate = disp.reduce(function(mx, d) { return d.data > mx ? d.data : mx; }, '2000-01-01');
    var range = Utils.periodRange(periodDias, maxDate);
    var atual = disp.filter(function(d) { return d.data >= range.desde && d.data <= range.ate; });
    var anterior = disp.filter(function(d) { return d.data >= range.desdeAnterior && d.data <= range.ateAnterior; });
    return {
      ruptura: this._calcRuptura(atual, anterior),
      dispAT: this._calcDispAT(atual, anterior),
      dispAS: this._calcDispAS(atual, anterior),
      motivos: this._calcMotivos(atual),
      porDiaSemana: this._calcPorDiaSemana(atual),
      heatmap: this._calcHeatmap(atual),
      evolutivoMensal: this._calcEvoMensal(disp)
    };
  },

  _calcRuptura: function(atual, anterior) {
    var totalAtual = atual.length;
    var rupAtual = atual.filter(function(d) { return d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO'; }).length;
    var taxaAtual = Utils.pct(rupAtual, totalAtual);
    var totalAnt = anterior.length;
    var rupAnt = anterior.filter(function(d) { return d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO'; }).length;
    var taxaAnt = Utils.pct(rupAnt, totalAnt);
    var variacao = Utils.round1(taxaAtual - taxaAnt);
    var self = this;

    var byLoja = Utils.groupBy(atual, 'loja_id');
    var byLojaAnt = Utils.groupBy(anterior, 'loja_id');
    var rankLojas = Object.entries(byLoja).map(function(e) {
      var lojaId = e[0], records = e[1];
      var rup = records.filter(function(d) { return d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO'; }).length;
      var taxa = Utils.pct(rup, records.length);
      var recAnt = byLojaAnt[lojaId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO'; }).length, recAnt.length);
      return { id: lojaId, nome: self.lojaName(lojaId), taxa: taxa, variacao: Utils.round1(taxa - tAnt) };
    });
    rankLojas.sort(function(a, b) { return b.taxa - a.taxa; });

    var byProd = Utils.groupBy(atual, 'produto_id');
    var byProdAnt = Utils.groupBy(anterior, 'produto_id');
    var rankProdutos = Object.entries(byProd).map(function(e) {
      var prodId = e[0], records = e[1];
      var rup = records.filter(function(d) { return d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO'; }).length;
      var taxa = Utils.pct(rup, records.length);
      var recAnt = byProdAnt[prodId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO'; }).length, recAnt.length);
      return { id: prodId, nome: self.prodName(prodId), taxa: taxa, variacao: Utils.round1(taxa - tAnt) };
    });
    rankProdutos.sort(function(a, b) { return b.taxa - a.taxa; });

    return { taxa: taxaAtual, variacao: variacao, total: rupAtual, rankLojas: rankLojas, rankProdutos: rankProdutos };
  },

  _calcDispAT: function(atual, anterior) {
    var self = this;
    var comEstoque = atual.filter(function(d) { return d.tem_estoque === 'SIM'; });
    var dispAT = comEstoque.filter(function(d) { return d.disponivel_at === 'SIM'; }).length;
    var taxaAtual = Utils.pct(dispAT, comEstoque.length);
    var comEstoqueAnt = anterior.filter(function(d) { return d.tem_estoque === 'SIM'; });
    var dispATAnt = comEstoqueAnt.filter(function(d) { return d.disponivel_at === 'SIM'; }).length;
    var taxaAnt = Utils.pct(dispATAnt, comEstoqueAnt.length);
    var variacao = Utils.round1(taxaAtual - taxaAnt);

    var byLoja = Utils.groupBy(comEstoque, 'loja_id');
    var byLojaAnt = Utils.groupBy(comEstoqueAnt, 'loja_id');
    var rankLojas = Object.entries(byLoja).map(function(e) {
      var lojaId = e[0], records = e[1];
      var disp = records.filter(function(d) { return d.disponivel_at === 'SIM'; }).length;
      var taxa = Utils.pct(disp, records.length);
      var recAnt = byLojaAnt[lojaId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.disponivel_at === 'SIM'; }).length, recAnt.length);
      return { id: lojaId, nome: self.lojaName(lojaId), taxa: taxa, variacao: Utils.round1(taxa - tAnt) };
    });
    rankLojas.sort(function(a, b) { return a.taxa - b.taxa; });

    var byProd = Utils.groupBy(comEstoque, 'produto_id');
    var byProdAnt = Utils.groupBy(comEstoqueAnt, 'produto_id');
    var rankProdutos = Object.entries(byProd).map(function(e) {
      var prodId = e[0], records = e[1];
      var disp = records.filter(function(d) { return d.disponivel_at === 'SIM'; }).length;
      var taxa = Utils.pct(disp, records.length);
      var recAnt = byProdAnt[prodId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.disponivel_at === 'SIM'; }).length, recAnt.length);
      return { id: prodId, nome: self.prodName(prodId), taxa: taxa, variacao: Utils.round1(taxa - tAnt) };
    });
    rankProdutos.sort(function(a, b) { return a.taxa - b.taxa; });

    return { taxa: taxaAtual, variacao: variacao, rankLojas: rankLojas, rankProdutos: rankProdutos };
  },

  _calcDispAS: function(atual, anterior) {
    var self = this;
    var comEstoque = atual.filter(function(d) { return d.tem_estoque === 'SIM'; });
    var dispAS = comEstoque.filter(function(d) { return d.disponivel_as === 'SIM'; }).length;
    var taxaAtual = Utils.pct(dispAS, comEstoque.length);
    var comEstoqueAnt = anterior.filter(function(d) { return d.tem_estoque === 'SIM'; });
    var dispASAnt = comEstoqueAnt.filter(function(d) { return d.disponivel_as === 'SIM'; }).length;
    var taxaAnt = Utils.pct(dispASAnt, comEstoqueAnt.length);
    var variacao = Utils.round1(taxaAtual - taxaAnt);

    var byLoja = Utils.groupBy(comEstoque, 'loja_id');
    var byLojaAnt = Utils.groupBy(comEstoqueAnt, 'loja_id');
    var rankLojas = Object.entries(byLoja).map(function(e) {
      var lojaId = e[0], records = e[1];
      var disp = records.filter(function(d) { return d.disponivel_as === 'SIM'; }).length;
      var taxa = Utils.pct(disp, records.length);
      var recAnt = byLojaAnt[lojaId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.disponivel_as === 'SIM'; }).length, recAnt.length);
      return { id: lojaId, nome: self.lojaName(lojaId), taxa: taxa, variacao: Utils.round1(taxa - tAnt) };
    });
    rankLojas.sort(function(a, b) { return a.taxa - b.taxa; });

    var byProd = Utils.groupBy(comEstoque, 'produto_id');
    var byProdAnt = Utils.groupBy(comEstoqueAnt, 'produto_id');
    var rankProdutos = Object.entries(byProd).map(function(e) {
      var prodId = e[0], records = e[1];
      var disp = records.filter(function(d) { return d.disponivel_as === 'SIM'; }).length;
      var taxa = Utils.pct(disp, records.length);
      var recAnt = byProdAnt[prodId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.disponivel_as === 'SIM'; }).length, recAnt.length);
      return { id: prodId, nome: self.prodName(prodId), taxa: taxa, variacao: Utils.round1(taxa - tAnt) };
    });
    rankProdutos.sort(function(a, b) { return a.taxa - b.taxa; });

    return { taxa: taxaAtual, variacao: variacao, rankLojas: rankLojas, rankProdutos: rankProdutos };
  },

  _calcMotivos: function(atual) {
    var semEstoque = atual.filter(function(d) { return (d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO') && d.motivo_ruptura; });
    var motRuptura = {};
    semEstoque.forEach(function(d) { var m = d.motivo_ruptura; if (m && m.trim()) motRuptura[m] = (motRuptura[m] || 0) + 1; });

    var naoDispAT = atual.filter(function(d) { return d.tem_estoque === 'SIM' && d.disponivel_at === 'NAO' && (d.motivo_at || d.motivo_indisponivel_at); });
    var motAT = {};
    naoDispAT.forEach(function(d) { var m = d.motivo_at || d.motivo_indisponivel_at; if (m && m.trim()) motAT[m] = (motAT[m] || 0) + 1; });

    var naoDispAS = atual.filter(function(d) { return d.tem_estoque === 'SIM' && d.disponivel_as === 'NAO' && (d.motivo_as || d.motivo_indisponivel_as); });
    var motAS = {};
    naoDispAS.forEach(function(d) { var m = d.motivo_as || d.motivo_indisponivel_as; if (m && m.trim()) motAS[m] = (motAS[m] || 0) + 1; });

    var motIndisponibilidade = {};
    [motAT, motAS].forEach(function(obj) {
      Object.entries(obj).forEach(function(e) { motIndisponibilidade[e[0]] = (motIndisponibilidade[e[0]] || 0) + e[1]; });
    });

    return { ruptura: motRuptura, indisponibilidade: motIndisponibilidade };
  },

  _calcPorDiaSemana: function(atual) {
    var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    var byDow = {};
    dias.forEach(function(d, i) { byDow[i] = { total: 0, ruptura: 0 }; });
    atual.forEach(function(d) {
      var dow = Utils.dowIndex(d.data);
      byDow[dow].total++;
      if (d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO') byDow[dow].ruptura++;
    });
    return dias.map(function(nome, i) { return { dia: nome, taxa: Utils.pct(byDow[i].ruptura, byDow[i].total) }; });
  },

  _calcHeatmap: function(atual) {
    var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    var prodIds = [];
    var seen = {};
    atual.forEach(function(d) { if (!seen[d.produto_id]) { seen[d.produto_id] = true; prodIds.push(d.produto_id); } });
    var matrix = {};
    var self = this;
    prodIds.forEach(function(pid) {
      matrix[pid] = {};
      dias.forEach(function(_, di) { matrix[pid][di] = { total: 0, rup: 0 }; });
    });
    atual.forEach(function(d) {
      var dow = Utils.dowIndex(d.data);
      if (matrix[d.produto_id]) {
        matrix[d.produto_id][dow].total++;
        if (d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO') matrix[d.produto_id][dow].rup++;
      }
    });
    return prodIds.map(function(pid) {
      return { produto: self.prodName(pid), dias: dias.map(function(_, di) { return Utils.pct(matrix[pid][di].rup, matrix[pid][di].total); }) };
    });
  },

  _calcEvoMensal: function(disp) {
    var byMonth = Utils.groupBy(disp, function(d) { return Utils.monthKey(d.data); });
    var months = Object.keys(byMonth).sort();
    return {
      ruptura: months.map(function(m) {
        var recs = byMonth[m];
        var rup = recs.filter(function(d) { return d.tem_estoque === 'NAO' || d.tem_estoque === 'NÃO'; }).length;
        return { mes: m, label: Utils.monthName(recs[0].data), valor: rup, taxa: Utils.pct(rup, recs.length) };
      }),
      dispAT: months.map(function(m) {
        var recs = byMonth[m].filter(function(d) { return d.tem_estoque === 'SIM'; });
        var disp = recs.filter(function(d) { return d.disponivel_at === 'SIM'; }).length;
        return { mes: m, label: Utils.monthName(byMonth[m][0].data), valor: disp, taxa: Utils.pct(disp, recs.length) };
      }),
      dispAS: months.map(function(m) {
        var recs = byMonth[m].filter(function(d) { return d.tem_estoque === 'SIM'; });
        var disp = recs.filter(function(d) { return d.disponivel_as === 'SIM'; }).length;
        return { mes: m, label: Utils.monthName(byMonth[m][0].data), valor: disp, taxa: Utils.pct(disp, recs.length) };
      })
    };
  },

  // ============================================================
  // QUEBRA KPI
  // ============================================================
  processQuebra: function(quebra, periodDias) {
    var maxDate = quebra.reduce(function(mx, d) { return d.data > mx ? d.data : mx; }, '2000-01-01');
    var range = Utils.periodRange(periodDias, maxDate);
    var atual = quebra.filter(function(d) { return d.data >= range.desde && d.data <= range.ate; });
    var anterior = quebra.filter(function(d) { return d.data >= range.desdeAnterior && d.data <= range.ateAnterior; });
    var self = this;

    var totalKg = atual.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
    var totalRS = atual.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);
    var totalKgAnt = anterior.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
    var totalRSAnt = anterior.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);

    var byLoja = Utils.groupBy(atual, 'loja_id');
    var byLojaAnt = Utils.groupBy(anterior, 'loja_id');
    var rankLojas = Object.entries(byLoja).map(function(e) {
      var lojaId = e[0], records = e[1];
      var kg = records.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
      var rs = records.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);
      var recAnt = byLojaAnt[lojaId] || [];
      var kgAnt = recAnt.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
      return { id: lojaId, nome: self.lojaName(lojaId), kg: Utils.round1(kg), rs: Utils.round1(rs), ocorrencias: records.length, variacao: Utils.round1(kg - kgAnt) };
    });
    rankLojas.sort(function(a, b) { return b.kg - a.kg; });

    var byProd = Utils.groupBy(atual, 'produto_id');
    var byProdAnt = Utils.groupBy(anterior, 'produto_id');
    var rankProdutos = Object.entries(byProd).map(function(e) {
      var prodId = e[0], records = e[1];
      var kg = records.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
      var rs = records.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);
      var recAnt = byProdAnt[prodId] || [];
      var kgAnt = recAnt.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
      return { id: prodId, nome: self.prodName(prodId), kg: Utils.round1(kg), rs: Utils.round1(rs), ocorrencias: records.length, variacao: Utils.round1(kg - kgAnt) };
    });
    rankProdutos.sort(function(a, b) { return b.kg - a.kg; });

    var motivos = {};
    atual.forEach(function(d) { if (d.motivo && d.motivo.trim()) motivos[d.motivo] = (motivos[d.motivo] || 0) + 1; });

    var destinos = {};
    atual.forEach(function(d) { if (d.destino && d.destino.trim()) destinos[d.destino] = (destinos[d.destino] || 0) + 1; });

    var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    var byDow = {};
    dias.forEach(function(d, i) { byDow[i] = 0; });
    atual.forEach(function(d) { var dow = Utils.dowIndex(d.data); byDow[dow] += (parseFloat(d.peso_kg) || 0); });
    var porDiaSemana = dias.map(function(nome, i) { return { dia: nome, kg: Utils.round1(byDow[i]) }; });

    var byMonth = Utils.groupBy(quebra, function(d) { return Utils.monthKey(d.data); });
    var months = Object.keys(byMonth).sort();
    var evolutivoMensal = months.map(function(m) {
      var recs = byMonth[m];
      var kg = recs.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
      var rs = recs.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);
      return { mes: m, label: Utils.monthName(recs[0].data), kg: Utils.round1(kg), rs: Utils.round1(rs), ocorrencias: recs.length };
    });

    return {
      totalKg: Utils.round1(totalKg), totalRS: Utils.round1(totalRS),
      variacaoKg: Utils.round1(totalKg - totalKgAnt), variacaoRS: Utils.round1(totalRS - totalRSAnt),
      ocorrencias: atual.length, rankLojas: rankLojas, rankProdutos: rankProdutos,
      motivos: motivos, destinos: destinos, porDiaSemana: porDiaSemana, evolutivoMensal: evolutivoMensal
    };
  },

  // ============================================================
  // EQUIPE KPI
  // ============================================================
  processEquipe: function(presenca, periodDias) {
    var maxDate = presenca.reduce(function(mx, d) { return d.data > mx ? d.data : mx; }, '2000-01-01');
    var range = Utils.periodRange(periodDias, maxDate);
    var atual = presenca.filter(function(d) { return d.data >= range.desde && d.data <= range.ate; });
    var anterior = presenca.filter(function(d) { return d.data >= range.desdeAnterior && d.data <= range.ateAnterior; });
    var self = this;

    var totalAtual = atual.length;
    var presAtual = atual.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var taxaPres = Utils.pct(presAtual, totalAtual);
    var totalAnt = anterior.length;
    var presAnt = anterior.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var taxaPresAnt = Utils.pct(presAnt, totalAnt);
    var varPres = Utils.round1(taxaPres - taxaPresAnt);
    var totalFaltas = totalAtual - presAtual;

    var byLoja = Utils.groupBy(atual, 'loja_id');
    var byLojaAnt = Utils.groupBy(anterior, 'loja_id');
    var rankLojaPres = Object.entries(byLoja).map(function(e) {
      var lojaId = e[0], records = e[1];
      var pres = records.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      var taxa = Utils.pct(pres, records.length);
      var recAnt = byLojaAnt[lojaId] || [];
      var presAntL = recAnt.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      var taxaAnt = Utils.pct(presAntL, recAnt.length);
      return { id: lojaId, nome: self.lojaName(lojaId), taxa: taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankLojaPres.sort(function(a, b) { return a.taxa - b.taxa; });

    var byPessoa = Utils.groupBy(atual, 'pessoa_id');
    var byPessoaAnt = Utils.groupBy(anterior, 'pessoa_id');
    var rankPessoaPres = Object.entries(byPessoa).map(function(e) {
      var pessoaId = e[0], records = e[1];
      var pres = records.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      var taxa = Utils.pct(pres, records.length);
      var recAnt = byPessoaAnt[pessoaId] || [];
      var presAntP = recAnt.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      var taxaAnt = Utils.pct(presAntP, recAnt.length);
      return { id: pessoaId, nome: self.pessoaName(pessoaId), taxa: taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankPessoaPres.sort(function(a, b) { return a.taxa - b.taxa; });

    var taxaAbs = Utils.round1(100 - taxaPres);
    var taxaAbsAnt = Utils.round1(100 - taxaPresAnt);
    var varAbs = Utils.round1(taxaAbs - taxaAbsAnt);

    var rankLojaAbs = Object.entries(byLoja).map(function(e) {
      var lojaId = e[0], records = e[1];
      var faltas = records.filter(function(d) { return d.presente_str === 'NAO'; }).length;
      var taxa = Utils.pct(faltas, records.length);
      var recAnt = byLojaAnt[lojaId] || [];
      var faltasAnt = recAnt.filter(function(d) { return d.presente_str === 'NAO'; }).length;
      var taxaAnt = Utils.pct(faltasAnt, recAnt.length);
      return { id: lojaId, nome: self.lojaName(lojaId), taxa: taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankLojaAbs.sort(function(a, b) { return b.taxa - a.taxa; });

    var maxFaltas = 0;
    var rankPessoaAbs = Object.entries(byPessoa).map(function(e) {
      var pessoaId = e[0], records = e[1];
      var faltas = records.filter(function(d) { return d.presente_str === 'NAO'; }).length;
      var taxa = Utils.pct(faltas, records.length);
      if (faltas > maxFaltas) maxFaltas = faltas;
      return { id: pessoaId, nome: self.pessoaName(pessoaId), faltas: faltas, taxa: taxa, total: records.length };
    });
    rankPessoaAbs.sort(function(a, b) { return b.faltas - a.faltas; });

    var motivos = {};
    atual.filter(function(d) { return d.presente_str === 'NAO' && d.motivo_ausencia && d.motivo_ausencia.trim(); })
      .forEach(function(d) { var m = d.motivo_ausencia.trim(); motivos[m] = (motivos[m] || 0) + 1; });

    var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    var byDow = {};
    dias.forEach(function(d, i) { byDow[i] = { total: 0, faltas: 0 }; });
    atual.forEach(function(d) {
      var dow = Utils.dowIndex(d.data);
      byDow[dow].total++;
      if (d.presente_str === 'NAO') byDow[dow].faltas++;
    });
    var porDiaSemana = dias.map(function(nome, i) { return { dia: nome, taxa: Utils.pct(byDow[i].faltas, byDow[i].total) }; });

    var horaCount = {};
    atual.filter(function(d) { return d.presente_str === 'SIM' && d.hora_chegada && d.hora_chegada.trim(); })
      .forEach(function(d) {
        var h = d.hora_chegada.trim().slice(0, 2);
        var hora = parseInt(h);
        if (!isNaN(hora)) { var label = (hora < 10 ? '0' : '') + hora + ':00'; horaCount[label] = (horaCount[label] || 0) + 1; }
      });
    var horarios = Object.keys(horaCount).sort().map(function(k) { return { hora: k, count: horaCount[k] }; });

    var byMonth = Utils.groupBy(presenca, function(d) { return Utils.monthKey(d.data); });
    var months = Object.keys(byMonth).sort();
    var evoPresenca = months.map(function(m) {
      var recs = byMonth[m];
      var pres = recs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      return { mes: m, label: Utils.monthName(recs[0].data), valor: pres, taxa: Utils.pct(pres, recs.length) };
    });
    var evoAbsenteismo = months.map(function(m) {
      var recs = byMonth[m];
      var faltas = recs.filter(function(d) { return d.presente_str === 'NAO'; }).length;
      return { mes: m, label: Utils.monthName(recs[0].data), valor: faltas, taxa: Utils.pct(faltas, recs.length) };
    });

    return {
      presenca: { taxa: taxaPres, variacao: varPres, totalFaltas: totalFaltas, rankLojas: rankLojaPres, rankPessoas: rankPessoaPres },
      absenteismo: { taxa: taxaAbs, variacao: varAbs, rankLojas: rankLojaAbs, rankPessoas: rankPessoaAbs, maxFaltas: maxFaltas },
      motivos: motivos, porDiaSemana: porDiaSemana, horarios: horarios,
      evolutivoMensal: { presenca: evoPresenca, absenteismo: evoAbsenteismo }
    };
  },

  // ============================================================
  // COPILOTO — Insights Cruzados
  // ============================================================
  generateInsights: function(data) {
    var insights = { criticos: [], oportunidades: [], previsao: [], evolucao: [] };
    if (data.ruptura) this._insightsRuptura(data, insights);
    if (data.presencaData) this._insightsPresenca(data, insights);
    Object.keys(insights).forEach(function(k) { insights[k] = insights[k].slice(0, 4); });
    return insights;
  },

  _insightsRuptura: function(data, insights) {
    var rup = data.ruptura;
    rup.ruptura.rankProdutos.filter(function(p) { return p.taxa >= 15; }).forEach(function(p) {
      insights.criticos.push({
        titulo: p.nome + ': ' + p.taxa + '% de ruptura',
        narrativa: p.nome + ' esta sem estoque em ' + p.taxa + '% das verificacoes. ' + (p.variacao > 0 ? 'Piorou ' + p.variacao + ' p.p.' : 'Estavel vs anterior.'),
        acao: 'Revisar pedido de ' + p.nome + ' com fornecedor.'
      });
    });
    var pioresDias = rup.porDiaSemana.filter(function(d) { return d.taxa >= 15; }).sort(function(a, b) { return b.taxa - a.taxa; });
    if (pioresDias.length > 0) {
      insights.previsao.push({
        titulo: pioresDias[0].dia + ': ' + pioresDias[0].taxa + '% de ruptura',
        narrativa: pioresDias[0].dia + ' e o dia com maior taxa de ruptura. Padrao recorrente.',
        acao: 'Aumentar pedido para cobertura de ' + pioresDias[0].dia + '.'
      });
    }
    if (rup.ruptura.variacao !== 0) {
      var melhorou = rup.ruptura.variacao < 0;
      insights.evolucao.push({
        titulo: 'Ruptura ' + (melhorou ? 'caiu' : 'subiu') + ' ' + Math.abs(rup.ruptura.variacao) + ' p.p.',
        narrativa: 'Taxa de ruptura: ' + rup.ruptura.taxa + '%. ' + (melhorou ? 'Melhoria consistente.' : 'Tendencia de piora.'),
        acao: melhorou ? 'Manter estrategia atual.' : 'Investigar causa.'
      });
    }
  },

  _insightsPresenca: function(data, insights) {
    var eq = data.presencaData;
    if (!eq || !eq.presenca) return;
    eq.presenca.rankLojas.filter(function(l) { return l.taxa < 70; }).forEach(function(l) {
      insights.criticos.push({
        titulo: l.nome + ': ' + l.taxa + '% de presenca',
        narrativa: l.nome + ' tem presenca abaixo de 70%. Equipe incompleta afeta execucao e padrao.',
        acao: 'Verificar escala e cobertura de ' + l.nome + '.'
      });
    });
    var pioresDias = eq.porDiaSemana.filter(function(d) { return d.taxa >= 20; }).sort(function(a, b) { return b.taxa - a.taxa; });
    if (pioresDias.length > 0) {
      insights.previsao.push({
        titulo: pioresDias[0].dia + ': ' + pioresDias[0].taxa + '% de faltas',
        narrativa: pioresDias[0].dia + ' concentra o maior indice de ausencias.',
        acao: 'Reforcar escala para ' + pioresDias[0].dia + '.'
      });
    }
    if (eq.presenca.variacao !== 0) {
      var melhorou = eq.presenca.variacao > 0;
      insights.evolucao.push({
        titulo: 'Presenca ' + (melhorou ? 'subiu' : 'caiu') + ' ' + Math.abs(eq.presenca.variacao) + ' p.p.',
        narrativa: 'Taxa de presenca: ' + eq.presenca.taxa + '%. ' + (melhorou ? 'Melhoria.' : 'Tendencia de piora.'),
        acao: melhorou ? 'Manter politica de escala.' : 'Investigar causa das faltas.'
      });
    }
  },

  _insightsTemperatura: function(data, insights) {
    var tmp = data.temperaturaData;
    if (!tmp || !tmp.termometros) return;
 
    var termos = tmp.termometros;
    var ranking = tmp.ranking;
 
    // ── CRÍTICOS: equipamento fora da faixa ──
    termos.forEach(function(eq) {
      if (eq.temp === null) return;
      var iC = eq.id === 'cong';
      var ok = iC ? eq.temp <= -18 : (eq.temp >= 0 && eq.temp <= 4);
      if (!ok) {
        var faixaStr = iC ? 'abaixo de -18°C' : 'entre 0°C e 4°C';
        insights.criticos.push({
          titulo: eq.label + ': ' + eq.temp + '°C — FORA DA FAIXA',
          narrativa: eq.label + ' registrou media de ' + eq.temp + '°C no periodo. A faixa segura e ' + faixaStr + '. Risco de perda de qualidade e contaminacao.',
          acao: 'Verificar regulagem e vedacao do equipamento. Acionar tecnico imediatamente se persistir.'
        });
      }
    });
 
    // ── CRÍTICOS: conformidade abaixo de 70% ──
    termos.forEach(function(eq) {
      if (eq.confPct < 70) {
        insights.criticos.push({
          titulo: eq.label + ': ' + eq.confPct + '% de conformidade',
          narrativa: 'Mais de ' + (100 - eq.confPct) + '% das leituras do ' + eq.label + ' estao fora da faixa ideal. Tendencia de queda vs periodo anterior: ' + (eq.confPctAnt !== null ? (eq.confPct - eq.confPctAnt) + ' p.p.' : 'sem dado anterior') + '.',
          acao: 'Revisar rotina de higienizacao, carga do equipamento e temperatura de abastecimento.'
        });
      }
    });
 
    // ── OPORTUNIDADES: pior loja no ranking ──
    if (ranking && ranking.lojas && ranking.lojas.length > 0) {
      var piorLoja = ranking.lojas[ranking.lojas.length - 1];
      if (piorLoja) {
        var eqs = ['balcao','resf','cong'];
        var piorEq = null; var piorConf = 100;
        eqs.forEach(function(k) { if (piorLoja[k] && piorLoja[k].conf < piorConf) { piorConf = piorLoja[k].conf; piorEq = k; } });
        if (piorEq && piorConf < 85) {
          insights.oportunidades.push({
            titulo: piorLoja.nome + ': maior risco de cadeia do frio',
            narrativa: 'Esta loja apresenta a menor conformidade da rede (' + piorConf + '% no ' + piorEq + '). Risco de perda de produtos e multas sanitarias.',
            acao: 'Priorizar auditoria presencial de temperatura em ' + piorLoja.nome + ' esta semana.'
          });
        }
      }
    }
 
    // ── EVOLUÇÃO: variação de conformidade ──
    termos.forEach(function(eq) {
      if (eq.confPctAnt === null) return;
      var delta = eq.confPct - eq.confPctAnt;
      if (Math.abs(delta) >= 5) {
        var melhorou = delta > 0;
        insights.evolucao.push({
          titulo: eq.label + ': conformidade ' + (melhorou ? 'subiu' : 'caiu') + ' ' + Math.abs(delta) + ' p.p.',
          narrativa: 'Conformidade atual: ' + eq.confPct + '%. ' + (melhorou ? 'Melhoria consistente na cadeia do frio.' : 'Queda preocupante — pode indicar falha no equipamento ou no processo.'),
          acao: melhorou ? 'Manter procedimento atual de controle de temperatura.' : 'Verificar causa da queda: carga excessiva, abertura frequente ou falha mecanica.'
        });
      }
    });
  },
 _insightsQuebra: function(data, insights) {},

  // ============================================================
  // TEMPERATURA KPI
  // ============================================================
  processTemperatura: function(temps, periodDias) {
    if (!temps || temps.length === 0) return null;

    var maxDate = temps.reduce(function(mx, t) { return t.data > mx ? t.data : mx; }, '2000-01-01');
    var range = Utils.periodRange(periodDias, maxDate);
    var atual = temps.filter(function(t) { return t.data >= range.desde && t.data <= range.ate; });
    var anterior = temps.filter(function(t) { return t.data >= range.desdeAnterior && t.data <= range.ateAnterior; });

    return {
      termometros: this._calcTermometros(atual, anterior),
      tendenciaConf: this._calcTendenciaConf(temps, maxDate),
      leituras: this._calcLeituras(temps, maxDate),
      mapaConf: this._calcMapaConf(temps, maxDate),
      ranking: this._calcRankingTemp(atual, anterior)
    };
  },

  // Helper: get flag value (handles both naming conventions)
  _flagBalcao: function(t) {
    var v = t.flag_balcao || t.conforme_balcao || '';
    return v === 'CONFORME' || v === true ? 'CONFORME' : 'NAO CONFORME';
  },
  _flagResf: function(t) {
    var v = t.flag_resfriados || t.conforme_camara_resf || '';
    return v === 'CONFORME' || v === true ? 'CONFORME' : 'NAO CONFORME';
  },
  _flagCong: function(t) {
    var v = t.flag_congelados || t.conforme_camara_cong || '';
    return v === 'CONFORME' || v === true ? 'CONFORME' : 'NAO CONFORME';
  },
  _tempBalcao: function(t) { return parseFloat(t.balcao_refrigerado) || null; },
  _tempResf: function(t) { return parseFloat(t.camara_resfriados) || null; },
  _tempCong: function(t) {
    var v = parseFloat(t.camara_congelados);
    return isNaN(v) ? null : v;
  },

  _confPct: function(recs, flagFn) {
    if (!recs.length) return 0;
    var ok = recs.filter(function(t) { return flagFn(t) === 'CONFORME'; }).length;
    return Math.round(ok / recs.length * 100);
  },

  _avgTemp: function(recs, tempFn) {
    var vals = recs.map(tempFn).filter(function(v) { return v !== null; });
    if (!vals.length) return null;
    return +(vals.reduce(function(s, v) { return s + v; }, 0) / vals.length).toFixed(1);
  },

  // ── BLOCO 1: Termômetros ──
  _calcTermometros: function(atual, anterior) {
    var self = this;
    var equips = [
      { id: 'balcao', label: 'Balcao Refrigerado', faixa: '0 a 4', fMin: 0, fMax: 4, tempFn: self._tempBalcao, flagFn: self._flagBalcao },
      { id: 'resf', label: 'Camara Resfriados', faixa: '0 a 4', fMin: 0, fMax: 4, tempFn: self._tempResf, flagFn: self._flagResf },
      { id: 'cong', label: 'Camara Congelados', faixa: 'menor que -18', fMin: -30, fMax: -18, tempFn: self._tempCong, flagFn: self._flagCong }
    ];
    return equips.map(function(eq) {
      var avgAtual = self._avgTemp(atual, eq.tempFn);
      var avgAnt = self._avgTemp(anterior, eq.tempFn);
      var confAtual = self._confPct(atual, eq.flagFn);
      var confAnt = self._confPct(anterior, eq.flagFn);
      var confOk = atual.filter(function(t) { return eq.flagFn(t) === 'CONFORME'; }).length;
      return {
        id: eq.id, label: eq.label, faixa: eq.faixa, fMin: eq.fMin, fMax: eq.fMax,
        temp: avgAtual, tempAnt: avgAnt,
        delta: avgAtual !== null && avgAnt !== null ? +(avgAtual - avgAnt).toFixed(1) : 0,
        confPct: confAtual, confPctAnt: confAnt,
        confOk: confOk, confTotal: atual.length
      };
    });
  },

  // ── BLOCO 2: Tendência Conformidade ──
  _calcTendenciaConf: function(temps, maxDate) {
    var self = this;
    var result = {};
    var filters = ['todos', 'balcao', 'resf', 'cong'];
    filters.forEach(function(f) {
      var flagFn;
      if (f === 'balcao') flagFn = self._flagBalcao;
      else if (f === 'resf') flagFn = self._flagResf;
      else if (f === 'cong') flagFn = self._flagCong;
      else flagFn = function(t) {
        return (self._flagBalcao(t) === 'CONFORME' && self._flagResf(t) === 'CONFORME' && self._flagCong(t) === 'CONFORME') ? 'CONFORME' : 'NAO CONFORME';
      };

      // Mensal
      var byMonth = Utils.groupBy(temps, function(t) { return Utils.monthKey(t.data); });
      var months = Object.keys(byMonth).sort();
      var mensal = months.map(function(m) {
        var recs = byMonth[m];
        var ok = recs.filter(function(t) { return flagFn(t) === 'CONFORME'; }).length;
        return { label: Utils.monthName(recs[0].data), leit: recs.length, conf: Math.round(ok / recs.length * 100) };
      });

      // Semanal (ultimas 8 semanas a partir de maxDate)
      var semanas = [];
      var maxD = new Date(maxDate + 'T12:00:00');
      for (var w = 7; w >= 0; w--) {
        var fim = new Date(maxD); fim.setDate(fim.getDate() - w * 7);
        var ini = new Date(fim); ini.setDate(ini.getDate() - 6);
        var iniStr = ini.toISOString().slice(0, 10);
        var fimStr = fim.toISOString().slice(0, 10);
        var recs = temps.filter(function(t) { return t.data >= iniStr && t.data <= fimStr; });
        var ok = recs.filter(function(t) { return flagFn(t) === 'CONFORME'; }).length;
        semanas.push({ label: 'S' + (8 - w + 7), leit: recs.length, conf: recs.length ? Math.round(ok / recs.length * 100) : 0 });
      }

      // Diario (ultimos 7 dias)
      var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      var last7 = [];
      for (var d = 6; d >= 0; d--) {
        var dt = new Date(maxD); dt.setDate(dt.getDate() - d);
        var dtStr = dt.toISOString().slice(0, 10);
        var recs = temps.filter(function(t) { return t.data === dtStr; });
        var ok = recs.filter(function(t) { return flagFn(t) === 'CONFORME'; }).length;
        last7.push({ label: dias[dt.getDay()], leit: recs.length, conf: recs.length ? Math.round(ok / recs.length * 100) : 0 });
      }

      // Calcular confAnt para variação
      function addConfAnt(arr) {
        for (var i = 0; i < arr.length; i++) {
          arr[i].confAnt = i > 0 ? arr[i - 1].conf : null;
        }
        return arr;
      }

      result[f] = {
        mensal: addConfAnt(mensal),
        semanas: addConfAnt(semanas),
        dias: addConfAnt(last7)
      };
    });
    return result;
  },

  // ── BLOCO 2B: Leituras de Temperatura ──
  _calcLeituras: function(temps, maxDate) {
    var self = this;
    var equips = [
      { id: 'balcao', tempFn: self._tempBalcao, flagFn: self._flagBalcao, fMin: 0, fMax: 4 },
      { id: 'resf', tempFn: self._tempResf, flagFn: self._flagResf, fMin: 0, fMax: 4 },
      { id: 'cong', tempFn: self._tempCong, flagFn: self._flagCong, fMin: -30, fMax: -18 }
    ];
    var result = {};
    var maxD = new Date(maxDate + 'T12:00:00');

    equips.forEach(function(eq) {
      // Mensal
      var byMonth = Utils.groupBy(temps, function(t) { return Utils.monthKey(t.data); });
      var months = Object.keys(byMonth).sort();
      var mensal = months.map(function(m) {
        return { label: Utils.monthName(byMonth[m][0].data), value: self._avgTemp(byMonth[m], eq.tempFn) };
      });

      // Semanal
      var semanas = [];
      for (var w = 7; w >= 0; w--) {
        var fim = new Date(maxD); fim.setDate(fim.getDate() - w * 7);
        var ini = new Date(fim); ini.setDate(ini.getDate() - 6);
        var iniStr = ini.toISOString().slice(0, 10);
        var fimStr = fim.toISOString().slice(0, 10);
        var recs = temps.filter(function(t) { return t.data >= iniStr && t.data <= fimStr; });
        semanas.push({ label: 'S' + (8 - w + 7), value: self._avgTemp(recs, eq.tempFn) });
      }

      // Diario
      var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      var last7 = [];
      for (var d = 6; d >= 0; d--) {
        var dt = new Date(maxD); dt.setDate(dt.getDate() - d);
        var dtStr = dt.toISOString().slice(0, 10);
        var recs = temps.filter(function(t) { return t.data === dtStr; });
        last7.push({ label: dias[dt.getDay()], value: self._avgTemp(recs, eq.tempFn) });
      }

      result[eq.id] = { mensal: mensal, semanas: semanas, dias: last7, fMin: eq.fMin, fMax: eq.fMax };
    });
    return result;
  },

  // ── BLOCO 3: Mapa de Conformidade ──
  _calcMapaConf: function(temps, maxDate) {
    var self = this;
    var maxD = new Date(maxDate + 'T12:00:00');
    var dates = [];
    for (var i = 14; i >= 0; i--) {
      var dt = new Date(maxD); dt.setDate(dt.getDate() - i);
      dates.push(dt.toISOString().slice(0, 10));
    }
    var dateLabels = dates.map(function(d) {
      return d.slice(5).replace('-', '/');
    });

    // Group by loja
    var byLoja = Utils.groupBy(temps, 'loja_id');
    var lojas = Object.keys(byLoja).map(function(lojaId) {
      var byDate = {};
      byLoja[lojaId].forEach(function(t) { byDate[t.data] = t; });
      var cells = dates.map(function(d) {
        var t = byDate[d];
        if (!t) return { status: { todos: 'NA', balcao: 'NA', resf: 'NA', cong: 'NA' }, temps: null };
        return {
          status: {
            todos: (self._flagBalcao(t) === 'CONFORME' && self._flagResf(t) === 'CONFORME' && self._flagCong(t) === 'CONFORME') ? 'OK' : 'NOK',
            balcao: self._flagBalcao(t) === 'CONFORME' ? 'OK' : 'NOK',
            resf: self._flagResf(t) === 'CONFORME' ? 'OK' : 'NOK',
            cong: self._flagCong(t) === 'CONFORME' ? 'OK' : 'NOK'
          },
          temps: {
            balcao: self._tempBalcao(t),
            resf: self._tempResf(t),
            cong: self._tempCong(t),
            fb: self._flagBalcao(t),
            fr: self._flagResf(t),
            fc: self._flagCong(t)
          }
        };
      });
      return { id: lojaId, nome: self.lojaName(lojaId), cells: cells };
    });

    return { dates: dateLabels, lojas: lojas };
  },

  // ── BLOCO 4: Ranking ──
  _calcRankingTemp: function(atual, anterior) {
    var self = this;
    var byLoja = Utils.groupBy(atual, 'loja_id');
    var byLojaAnt = Utils.groupBy(anterior, 'loja_id');

    var lojas = Object.keys(byLoja).map(function(lojaId) {
      var recs = byLoja[lojaId];
      var recsAnt = byLojaAnt[lojaId] || [];
      return {
        id: lojaId,
        nome: self.lojaName(lojaId),
        balcao: { pct: self._confPct(recs, self._flagBalcao), delta: self._confPct(recs, self._flagBalcao) - self._confPct(recsAnt, self._flagBalcao) },
        resf: { pct: self._confPct(recs, self._flagResf), delta: self._confPct(recs, self._flagResf) - self._confPct(recsAnt, self._flagResf) },
        cong: { pct: self._confPct(recs, self._flagCong), delta: self._confPct(recs, self._flagCong) - self._confPct(recsAnt, self._flagCong) }
      };
    });

    // Sort worst first (avg of 3)
    lojas.sort(function(a, b) {
      return ((a.balcao.pct + a.resf.pct + a.cong.pct) / 3) - ((b.balcao.pct + b.resf.pct + b.cong.pct) / 3);
    });

    // Total rede
    var totB = lojas.length ? Math.round(lojas.reduce(function(s, l) { return s + l.balcao.pct; }, 0) / lojas.length) : 0;
    var totR = lojas.length ? Math.round(lojas.reduce(function(s, l) { return s + l.resf.pct; }, 0) / lojas.length) : 0;
    var totC = lojas.length ? Math.round(lojas.reduce(function(s, l) { return s + l.cong.pct; }, 0) / lojas.length) : 0;
    var totBd = lojas.length ? Math.round(lojas.reduce(function(s, l) { return s + l.balcao.delta; }, 0) / lojas.length) : 0;
    var totRd = lojas.length ? Math.round(lojas.reduce(function(s, l) { return s + l.resf.delta; }, 0) / lojas.length) : 0;
    var totCd = lojas.length ? Math.round(lojas.reduce(function(s, l) { return s + l.cong.delta; }, 0) / lojas.length) : 0;

    return {
      lojas: lojas,
      total: {
        balcao: { pct: totB, delta: totBd },
        resf: { pct: totR, delta: totRd },
        cong: { pct: totC, delta: totCd }
      }
    };
  },
};
