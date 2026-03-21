// ============================================================
// NEXO Intelligence Web v2 — Engine (Motor de Inteligência)
// Processa dados e gera: aggregations, rankings, insights cruzados
// ============================================================
const Engine = {

  // ---- PRODUCT MAP: produto_id → corte_pai ----
  _prodMap: {},

  async buildProdMap() {
    const prods = await API.getProdutos();
    prods.forEach(p => { this._prodMap[p.id] = p.corte_pai; });
    return this._prodMap;
  },

  prodName(id) {
    return this._prodMap[id] || id;
  },

  // ---- LOJA MAP ----
  _lojaMap: {},

  async buildLojaMap(redeId) {
    const lojas = await API.getLojas(redeId);
    lojas.forEach(l => { this._lojaMap[l.id] = l.nome; });
    return this._lojaMap;
  },

  lojaName(id) {
    return this._lojaMap[id] || id;
  },

  // ============================================================
  // RUPTURA KPI
  // ============================================================
  processRuptura(disponibilidade, periodDias) {
    const { desde, ate, desdeAnterior, ateAnterior } = Utils.periodRange(periodDias);

    const atual = disponibilidade.filter(d => d.data >= desde && d.data <= ate);
    const anterior = disponibilidade.filter(d => d.data >= desdeAnterior && d.data <= ateAnterior);

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

  // --- Ruptura (sem estoque) ---
  _calcRuptura(atual, anterior) {
    const totalAtual = atual.length;
    const rupAtual = atual.filter(d => d.tem_estoque === 'NÃO').length;
    const taxaAtual = Utils.pct(rupAtual, totalAtual);

    const totalAnt = anterior.length;
    const rupAnt = anterior.filter(d => d.tem_estoque === 'NÃO').length;
    const taxaAnt = Utils.pct(rupAnt, totalAnt);

    const variacao = Utils.round1(taxaAtual - taxaAnt);

    // Ranking por loja
    const byLoja = Utils.groupBy(atual, 'loja_id');
    const byLojaAnt = Utils.groupBy(anterior, 'loja_id');
    const rankLojas = Object.entries(byLoja).map(([lojaId, records]) => {
      const rup = records.filter(d => d.tem_estoque === 'NÃO').length;
      const taxa = Utils.pct(rup, records.length);
      const recAnt = byLojaAnt[lojaId] || [];
      const taxaAnt = Utils.pct(recAnt.filter(d => d.tem_estoque === 'NÃO').length, recAnt.length);
      return { id: lojaId, nome: this.lojaName(lojaId), taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankLojas.sort((a, b) => b.taxa - a.taxa); // pior primeiro

    // Ranking por produto
    const byProd = Utils.groupBy(atual, 'produto_id');
    const byProdAnt = Utils.groupBy(anterior, 'produto_id');
    const rankProdutos = Object.entries(byProd).map(([prodId, records]) => {
      const rup = records.filter(d => d.tem_estoque === 'NÃO').length;
      const taxa = Utils.pct(rup, records.length);
      const recAnt = byProdAnt[prodId] || [];
      const taxaAnt = Utils.pct(recAnt.filter(d => d.tem_estoque === 'NÃO').length, recAnt.length);
      return { id: prodId, nome: this.prodName(prodId), taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankProdutos.sort((a, b) => b.taxa - a.taxa);

    return { taxa: taxaAtual, variacao, total: rupAtual, rankLojas, rankProdutos };
  },

  // --- Disponibilidade AT ---
  _calcDispAT(atual, anterior) {
    const comEstoque = atual.filter(d => d.tem_estoque === 'SIM');
    const dispAT = comEstoque.filter(d => d.disponivel_at === 'SIM').length;
    const taxaAtual = Utils.pct(dispAT, comEstoque.length);

    const comEstoqueAnt = anterior.filter(d => d.tem_estoque === 'SIM');
    const dispATAnt = comEstoqueAnt.filter(d => d.disponivel_at === 'SIM').length;
    const taxaAnt = Utils.pct(dispATAnt, comEstoqueAnt.length);

    const variacao = Utils.round1(taxaAtual - taxaAnt);

    // Ranking por loja
    const byLoja = Utils.groupBy(comEstoque, 'loja_id');
    const byLojaAnt = Utils.groupBy(comEstoqueAnt, 'loja_id');
    const rankLojas = Object.entries(byLoja).map(([lojaId, records]) => {
      const disp = records.filter(d => d.disponivel_at === 'SIM').length;
      const taxa = Utils.pct(disp, records.length);
      const recAnt = (byLojaAnt[lojaId] || []);
      const taxaAnt = Utils.pct(recAnt.filter(d => d.disponivel_at === 'SIM').length, recAnt.length);
      return { id: lojaId, nome: this.lojaName(lojaId), taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankLojas.sort((a, b) => a.taxa - b.taxa); // pior primeiro (menor disp)

    // Ranking por produto
    const byProd = Utils.groupBy(comEstoque, 'produto_id');
    const byProdAnt = Utils.groupBy(comEstoqueAnt, 'produto_id');
    const rankProdutos = Object.entries(byProd).map(([prodId, records]) => {
      const disp = records.filter(d => d.disponivel_at === 'SIM').length;
      const taxa = Utils.pct(disp, records.length);
      const recAnt = (byProdAnt[prodId] || []);
      const taxaAnt = Utils.pct(recAnt.filter(d => d.disponivel_at === 'SIM').length, recAnt.length);
      return { id: prodId, nome: this.prodName(prodId), taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankProdutos.sort((a, b) => a.taxa - b.taxa);

    return { taxa: taxaAtual, variacao, rankLojas, rankProdutos };
  },

  // --- Disponibilidade AS ---
  _calcDispAS(atual, anterior) {
    const comEstoque = atual.filter(d => d.tem_estoque === 'SIM');
    const dispAS = comEstoque.filter(d => d.disponivel_as === 'SIM').length;
    const taxaAtual = Utils.pct(dispAS, comEstoque.length);

    const comEstoqueAnt = anterior.filter(d => d.tem_estoque === 'SIM');
    const dispASAnt = comEstoqueAnt.filter(d => d.disponivel_as === 'SIM').length;
    const taxaAnt = Utils.pct(dispASAnt, comEstoqueAnt.length);

    const variacao = Utils.round1(taxaAtual - taxaAnt);

    const byLoja = Utils.groupBy(comEstoque, 'loja_id');
    const byLojaAnt = Utils.groupBy(comEstoqueAnt, 'loja_id');
    const rankLojas = Object.entries(byLoja).map(([lojaId, records]) => {
      const disp = records.filter(d => d.disponivel_as === 'SIM').length;
      const taxa = Utils.pct(disp, records.length);
      const recAnt = (byLojaAnt[lojaId] || []);
      const taxaAnt = Utils.pct(recAnt.filter(d => d.disponivel_as === 'SIM').length, recAnt.length);
      return { id: lojaId, nome: this.lojaName(lojaId), taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankLojas.sort((a, b) => a.taxa - b.taxa);

    const byProd = Utils.groupBy(comEstoque, 'produto_id');
    const byProdAnt = Utils.groupBy(comEstoqueAnt, 'produto_id');
    const rankProdutos = Object.entries(byProd).map(([prodId, records]) => {
      const disp = records.filter(d => d.disponivel_as === 'SIM').length;
      const taxa = Utils.pct(disp, records.length);
      const recAnt = (byProdAnt[prodId] || []);
      const taxaAnt = Utils.pct(recAnt.filter(d => d.disponivel_as === 'SIM').length, recAnt.length);
      return { id: prodId, nome: this.prodName(prodId), taxa, variacao: Utils.round1(taxa - taxaAnt) };
    });
    rankProdutos.sort((a, b) => a.taxa - b.taxa);

    return { taxa: taxaAtual, variacao, rankLojas, rankProdutos };
  },

  // --- Motivos ---
  _calcMotivos(atual) {
    // Motivos de ruptura (sem estoque)
    const semEstoque = atual.filter(d => d.tem_estoque === 'NÃO' && d.motivo_ruptura);
    const motRuptura = {};
    semEstoque.forEach(d => {
      const m = d.motivo_ruptura;
      motRuptura[m] = (motRuptura[m] || 0) + 1;
    });

    // Motivos de indisponibilidade AT
    const naoDispAT = atual.filter(d => d.tem_estoque === 'SIM' && d.disponivel_at === 'NÃO' && d.motivo_at);
    const motAT = {};
    naoDispAT.forEach(d => {
      const m = d.motivo_at;
      motAT[m] = (motAT[m] || 0) + 1;
    });

    // Motivos de indisponibilidade AS
    const naoDispAS = atual.filter(d => d.tem_estoque === 'SIM' && d.disponivel_as === 'NÃO' && d.motivo_as);
    const motAS = {};
    naoDispAS.forEach(d => {
      const m = d.motivo_as;
      motAS[m] = (motAS[m] || 0) + 1;
    });

    // Merge AT + AS motivos (ambos são de execução)
    const motIndisponibilidade = {};
    [motAT, motAS].forEach(obj => {
      Object.entries(obj).forEach(([k, v]) => {
        motIndisponibilidade[k] = (motIndisponibilidade[k] || 0) + v;
      });
    });

    return { ruptura: motRuptura, indisponibilidade: motIndisponibilidade };
  },

  // --- Por dia da semana ---
  _calcPorDiaSemana(atual) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const byDow = {};
    dias.forEach((d, i) => { byDow[i] = { total: 0, ruptura: 0 }; });

    atual.forEach(d => {
      const dow = Utils.dowIndex(d.data);
      byDow[dow].total++;
      if (d.tem_estoque === 'NÃO') byDow[dow].ruptura++;
    });

    return dias.map((nome, i) => ({
      dia: nome,
      taxa: Utils.pct(byDow[i].ruptura, byDow[i].total)
    }));
  },

  // --- Heatmap: produto × dia ---
  _calcHeatmap(atual) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const prodIds = [...new Set(atual.map(d => d.produto_id))];
    const matrix = {};

    prodIds.forEach(pid => {
      matrix[pid] = {};
      dias.forEach((_, di) => { matrix[pid][di] = { total: 0, rup: 0 }; });
    });

    atual.forEach(d => {
      const dow = Utils.dowIndex(d.data);
      if (matrix[d.produto_id]) {
        matrix[d.produto_id][dow].total++;
        if (d.tem_estoque === 'NÃO') matrix[d.produto_id][dow].rup++;
      }
    });

    return prodIds.map(pid => ({
      produto: this.prodName(pid),
      dias: dias.map((_, di) => Utils.pct(matrix[pid][di].rup, matrix[pid][di].total))
    }));
  },

  // --- Evolutivo mensal ---
  _calcEvoMensal(disponibilidade) {
    const byMonth = Utils.groupBy(disponibilidade, d => Utils.monthKey(d.data));
    const months = Object.keys(byMonth).sort();

    return {
      ruptura: months.map(m => {
        const recs = byMonth[m];
        const rup = recs.filter(d => d.tem_estoque === 'NÃO').length;
        return { mes: m, label: Utils.monthName(recs[0].data), valor: rup, taxa: Utils.pct(rup, recs.length) };
      }),
      dispAT: months.map(m => {
        const recs = byMonth[m].filter(d => d.tem_estoque === 'SIM');
        const disp = recs.filter(d => d.disponivel_at === 'SIM').length;
        return { mes: m, label: Utils.monthName(byMonth[m][0].data), valor: disp, taxa: Utils.pct(disp, recs.length) };
      }),
      dispAS: months.map(m => {
        const recs = byMonth[m].filter(d => d.tem_estoque === 'SIM');
        const disp = recs.filter(d => d.disponivel_as === 'SIM').length;
        return { mes: m, label: Utils.monthName(byMonth[m][0].data), valor: disp, taxa: Utils.pct(disp, recs.length) };
      })
    };
  },

  // ============================================================
  // COPILOTO — Insights Cruzados (Engine v2)
  // ============================================================
  generateInsights(data) {
    const insights = { criticos: [], oportunidades: [], previsao: [], evolucao: [] };

    // Data é o resultado de processRuptura + dados de presença, temperatura, quebra
    if (data.ruptura) this._insightsRuptura(data, insights);
    if (data.temperatura) this._insightsTemperatura(data, insights);
    if (data.presenca) this._insightsPresenca(data, insights);
    if (data.quebra) this._insightsQuebra(data, insights);

    // Limitar a 3-4 por bloco (qualidade > quantidade)
    Object.keys(insights).forEach(k => {
      insights[k] = insights[k].slice(0, 4);
    });

    return insights;
  },

  _insightsRuptura(data, insights) {
    const rup = data.ruptura;

    // Crítico: produtos com ruptura alta
    rup.ruptura.rankProdutos.filter(p => p.taxa >= 15).forEach(p => {
      insights.criticos.push({
        titulo: p.nome + ': ' + p.taxa + '% de ruptura',
        narrativa: p.nome + ' está sem estoque em ' + p.taxa + '% das verificações. ' +
          (p.variacao > 0 ? 'Piorou ' + p.variacao + ' p.p. vs período anterior.' : 'Estável vs período anterior.'),
        acao: 'Revisar pedido de ' + p.nome + ' — verificar frequência e volume com fornecedor.',
        severity: p.taxa >= 20 ? 'critical' : 'warning'
      });
    });

    // Previsão: padrão semanal
    const pioresDias = rup.porDiaSemana.filter(d => d.taxa >= 15).sort((a, b) => b.taxa - a.taxa);
    if (pioresDias.length > 0) {
      const d = pioresDias[0];
      insights.previsao.push({
        titulo: d.dia + '-feira: ' + d.taxa + '% de ruptura',
        narrativa: d.dia + ' é o dia com maior taxa de ruptura. Padrão recorrente que indica pedido insuficiente para cobrir a demanda deste dia.',
        acao: 'Aumentar pedido para cobertura de ' + d.dia + ' — ajustar volume com 1 dia de antecedência.'
      });
    }

    // Evolução: variação geral
    if (rup.ruptura.variacao !== 0) {
      const melhorou = rup.ruptura.variacao < 0;
      insights.evolucao.push({
        titulo: 'Ruptura ' + (melhorou ? 'caiu' : 'subiu') + ' ' + Math.abs(rup.ruptura.variacao) + ' p.p.',
        narrativa: 'Taxa de ruptura foi de ' + rup.ruptura.taxa + '% no período atual. ' +
          (melhorou ? 'Melhoria consistente.' : 'Atenção: tendência de piora.'),
        acao: melhorou ? 'Manter estratégia atual de pedido.' : 'Investigar causa da piora — fornecedor ou demanda?'
      });
    }
  },

  _insightsTemperatura(data, insights) {
    // Placeholder — será ativado quando a tela de Temperatura estiver pronta
  },

  _insightsPresenca(data, insights) {
    // Placeholder — será ativado quando a tela de Equipe estiver pronta
  },

  _insightsQuebra(data, insights) {
    // Placeholder — será ativado quando a tela de Quebra estiver pronta
  }
};
