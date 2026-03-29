// ============================================================
// NEXO Intelligence Web v2 — Engine (Motor de Inteligência)
// Processa dados e gera: aggregations, rankings, insights cruzados
// ATUALIZADO: inclui processQuebra
// ============================================================
var Engine = {

  _prodMap: {},
  _lojaMap: {},

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

  // ============================================================
  // RUPTURA KPI
  // ============================================================
  processRuptura: function(disponibilidade, periodDias) {
    var range = Utils.periodRange(periodDias);
    var atual = disponibilidade.filter(function(d) { return d.data >= range.desde && d.data <= range.ate; });
    var anterior = disponibilidade.filter(function(d) { return d.data >= range.desdeAnterior && d.data <= range.ateAnterior; });

    return {
      ruptura: this._calcRuptura(atual, anterior),
      dispAT: this._calcDispAT(atual, anterior),
      dispAS: this._calcDispAS(atual, anterior),
      motivos: this._calcMotivos(atual),
      porDiaSemana: this._calcPorDiaSemana(atual),
      heatmap: this._calcHeatmap(atual),
      evolutivoMensal: this._calcEvoMensal(disponibilidade)
    };
  },

  _calcRuptura: function(atual, anterior) {
    var totalAtual = atual.length;
    var rupAtual = atual.filter(function(d) { return d.tem_estoque === 'NÃO'; }).length;
    var taxaAtual = Utils.pct(rupAtual, totalAtual);
    var totalAnt = anterior.length;
    var rupAnt = anterior.filter(function(d) { return d.tem_estoque === 'NÃO'; }).length;
    var taxaAnt = Utils.pct(rupAnt, totalAnt);
    var variacao = Utils.round1(taxaAtual - taxaAnt);
    var self = this;

    var byLoja = Utils.groupBy(atual, 'loja_id');
    var byLojaAnt = Utils.groupBy(anterior, 'loja_id');
    var rankLojas = Object.entries(byLoja).map(function(e) {
      var lojaId = e[0], records = e[1];
      var rup = records.filter(function(d) { return d.tem_estoque === 'NÃO'; }).length;
      var taxa = Utils.pct(rup, records.length);
      var recAnt = byLojaAnt[lojaId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.tem_estoque === 'NÃO'; }).length, recAnt.length);
      return { id: lojaId, nome: self.lojaName(lojaId), taxa: taxa, variacao: Utils.round1(taxa - tAnt) };
    });
    rankLojas.sort(function(a, b) { return b.taxa - a.taxa; });

    var byProd = Utils.groupBy(atual, 'produto_id');
    var byProdAnt = Utils.groupBy(anterior, 'produto_id');
    var rankProdutos = Object.entries(byProd).map(function(e) {
      var prodId = e[0], records = e[1];
      var rup = records.filter(function(d) { return d.tem_estoque === 'NÃO'; }).length;
      var taxa = Utils.pct(rup, records.length);
      var recAnt = byProdAnt[prodId] || [];
      var tAnt = Utils.pct(recAnt.filter(function(d) { return d.tem_estoque === 'NÃO'; }).length, recAnt.length);
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
    var semEstoque = atual.filter(function(d) { return d.tem_estoque === 'NÃO' && d.motivo_ruptura; });
    var motRuptura = {};
    semEstoque.forEach(function(d) { var m = d.motivo_ruptura; if (m && m.trim()) motRuptura[m] = (motRuptura[m] || 0) + 1; });

    var naoDispAT = atual.filter(function(d) { return d.tem_estoque === 'SIM' && d.disponivel_at === 'NÃO' && (d.motivo_at || d.motivo_indisponivel_at); });
    var motAT = {};
    naoDispAT.forEach(function(d) { var m = d.motivo_at || d.motivo_indisponivel_at; if (m && m.trim()) motAT[m] = (motAT[m] || 0) + 1; });

    var naoDispAS = atual.filter(function(d) { return d.tem_estoque === 'SIM' && d.disponivel_as === 'NÃO' && (d.motivo_as || d.motivo_indisponivel_as); });
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
      if (d.tem_estoque === 'NÃO') byDow[dow].ruptura++;
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
        if (d.tem_estoque === 'NÃO') matrix[d.produto_id][dow].rup++;
      }
    });
    return prodIds.map(function(pid) {
      return { produto: self.prodName(pid), dias: dias.map(function(_, di) { return Utils.pct(matrix[pid][di].rup, matrix[pid][di].total); }) };
    });
  },

  _calcEvoMensal: function(disponibilidade) {
    var byMonth = Utils.groupBy(disponibilidade, function(d) { return Utils.monthKey(d.data); });
    var months = Object.keys(byMonth).sort();
    return {
      ruptura: months.map(function(m) {
        var recs = byMonth[m];
        var rup = recs.filter(function(d) { return d.tem_estoque === 'NÃO'; }).length;
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
    var range = Utils.periodRange(periodDias);
    var atual = quebra.filter(function(d) { return d.data >= range.desde && d.data <= range.ate; });
    var anterior = quebra.filter(function(d) { return d.data >= range.desdeAnterior && d.data <= range.ateAnterior; });
    var self = this;

    // Totais
    var totalKg = atual.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
    var totalRS = atual.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);
    var totalKgAnt = anterior.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
    var totalRSAnt = anterior.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);

    // Ranking por loja (kg)
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

    // Ranking por produto (kg)
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

    // Motivos
    var motivos = {};
    atual.forEach(function(d) { if (d.motivo && d.motivo.trim()) motivos[d.motivo] = (motivos[d.motivo] || 0) + 1; });

    // Destinos
    var destinos = {};
    atual.forEach(function(d) { if (d.destino && d.destino.trim()) destinos[d.destino] = (destinos[d.destino] || 0) + 1; });

    // Por dia da semana
    var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    var byDow = {};
    dias.forEach(function(d, i) { byDow[i] = 0; });
    atual.forEach(function(d) { var dow = Utils.dowIndex(d.data); byDow[dow] += (parseFloat(d.peso_kg) || 0); });
    var porDiaSemana = dias.map(function(nome, i) { return { dia: nome, kg: Utils.round1(byDow[i]) }; });

    // Evolutivo mensal
    var byMonth = Utils.groupBy(quebra, function(d) { return Utils.monthKey(d.data); });
    var months = Object.keys(byMonth).sort();
    var evolutivoMensal = months.map(function(m) {
      var recs = byMonth[m];
      var kg = recs.reduce(function(s, d) { return s + (parseFloat(d.peso_kg) || 0); }, 0);
      var rs = recs.reduce(function(s, d) { return s + (parseFloat(d.valor_estimado) || 0); }, 0);
      return { mes: m, label: Utils.monthName(recs[0].data), kg: Utils.round1(kg), rs: Utils.round1(rs), ocorrencias: recs.length };
    });

    return {
      totalKg: Utils.round1(totalKg),
      totalRS: Utils.round1(totalRS),
      variacaoKg: Utils.round1(totalKg - totalKgAnt),
      variacaoRS: Utils.round1(totalRS - totalRSAnt),
      ocorrencias: atual.length,
      rankLojas: rankLojas,
      rankProdutos: rankProdutos,
      motivos: motivos,
      destinos: destinos,
      porDiaSemana: porDiaSemana,
      evolutivoMensal: evolutivoMensal
    };
  },

  // ============================================================
  // COPILOTO — Insights Cruzados
  // ============================================================
  generateInsights: function(data) {
    var insights = { criticos: [], oportunidades: [], previsao: [], evolucao: [] };
    if (data.ruptura) this._insightsRuptura(data, insights);
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
  }
};
