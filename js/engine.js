// ============================================================
// NEXO Intelligence Web v2 — Engine (Motor de Inteligencia)
// Processa dados e gera: aggregations, rankings, insights cruzados
// ============================================================
var Engine = {
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

  _insightsTemperatura: function(data, insights) {},
  _insightsQuebra: function(data, insights) {}
};
