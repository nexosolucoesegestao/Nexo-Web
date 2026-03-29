// ============================================================
// NEXO Intelligence Web v2 — Pagina Quebra & Perdas
// 2 faixas: Perda em Kg + Impacto em R$
// ============================================================
(function() {
  var currentPeriod = 15;
  var currentLoja = 'all';
  var chartInstances = [];

  function destroyCharts() {
    chartInstances.forEach(function(c) { if (c && c.destroy) c.destroy(); });
    chartInstances = [];
  }

  Router.register('quebra', async function(container) {
    destroyCharts();

    container.innerHTML =
      '<div class="toolbar anim">' +
        '<div class="period-pills">' +
          '<button class="pp" data-d="7">7d</button>' +
          '<button class="pp' + (currentPeriod===15?' active':'') + '" data-d="15">15d</button>' +
          '<button class="pp' + (currentPeriod===30?' active':'') + '" data-d="30">30d</button>' +
          '<button class="pp" data-d="60">60d</button>' +
          '<button class="pp" data-d="90">90d</button>' +
        '</div>' +
        '<select class="filter-select" id="filterLojaQbr">' +
          '<option value="all">Todas as lojas</option>' +
        '</select>' +
      '</div>' +

      // FAIXA QUEBRA KG
      '<div class="strip quebra anim d1">' +
        '<div class="strip-header">' +
          '<div class="strip-icon quebra">Q</div>' +
          '<div><div class="strip-title">Quebra em Kg</div><div class="strip-subtitle">Peso total de perdas no periodo</div></div>' +
          '<div class="strip-bn">' +
            '<div class="strip-bn-item"><div class="strip-bn-label">TOTAL KG</div><div class="strip-bn-val" id="bnQbrKg">--</div><div class="strip-bn-delta" id="bnQbrKgVar">--</div></div>' +
            '<div class="strip-bn-item"><div class="strip-bn-label">OCORRENCIAS</div><div class="strip-bn-val" id="bnQbrOcor">--</div><div class="strip-bn-delta neutral">no periodo</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="strip-body">' +
          '<div class="strip-col"><div class="strip-col-title">Evolutivo mensal (kg)</div><div class="evo-chart"><canvas id="evoQbrKg"></canvas></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Ranking por loja (kg)</div><div class="rank-scroll" id="rankLojaQbr"><table class="rt"><thead><tr><th>Loja</th><th>Kg</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Ranking por produto (kg)</div><div class="rank-scroll" id="rankProdQbr"><table class="rt"><thead><tr><th>Produto</th><th>Kg</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>' +
        '</div>' +
      '</div>' +

      // FAIXA IMPACTO FINANCEIRO
      '<div class="strip rup anim d2">' +
        '<div class="strip-header">' +
          '<div class="strip-icon rup">R$</div>' +
          '<div><div class="strip-title">Impacto Financeiro</div><div class="strip-subtitle">Valor estimado das perdas</div></div>' +
          '<div class="strip-bn">' +
            '<div class="strip-bn-item"><div class="strip-bn-label">TOTAL R$</div><div class="strip-bn-val" id="bnQbrRS">--</div><div class="strip-bn-delta" id="bnQbrRSVar">--</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="strip-body">' +
          '<div class="strip-col"><div class="strip-col-title">Evolutivo mensal (R$)</div><div class="evo-chart"><canvas id="evoQbrRS"></canvas></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Ranking por loja (R$)</div><div class="rank-scroll" id="rankLojaQbrRS"><table class="rt"><thead><tr><th>Loja</th><th>R$</th><th></th><th>Ocor.</th></tr></thead><tbody></tbody></table></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Ranking por produto (R$)</div><div class="rank-scroll" id="rankProdQbrRS"><table class="rt"><thead><tr><th>Produto</th><th>R$</th><th></th><th>Ocor.</th></tr></thead><tbody></tbody></table></div></div>' +
        '</div>' +
      '</div>' +

      // ANALISE COMPLEMENTAR
      '<div class="section-title anim d3"><span class="st-icon">🎯</span> Analise complementar</div>' +
      '<div class="bottom-grid anim d3">' +
        '<div class="card"><div class="ch"><div><div class="ct">Motivos de quebra</div><div class="cs">Por que houve perda?</div></div></div><div class="cb"><div class="chart-box" style="height:180px"><canvas id="chartMotQbr"></canvas></div></div></div>' +
        '<div class="card"><div class="ch"><div><div class="ct">Quebra por dia da semana</div><div class="cs">Kg perdido por dia</div></div></div><div class="cb"><div class="chart-box" style="height:180px"><canvas id="chartDiaQbr"></canvas></div></div></div>' +
        '<div class="card"><div class="ch"><div><div class="ct">Destino do produto</div><div class="cs">Para onde foi a perda?</div></div></div><div class="cb"><div class="chart-box" style="height:180px"><canvas id="chartDestQbr"></canvas></div></div></div>' +
      '</div>';

    // Populate loja filter
    var lojas = await API.getLojas(window.NEXO_REDE_ID);
    UI.populateLojaFilter('filterLojaQbr', lojas);

    UI.initPeriodPills(async function(days) {
      currentPeriod = days;
      await loadData();
    });

    document.getElementById('filterLojaQbr').addEventListener('change', async function() {
      currentLoja = this.value;
      API.clearCache();
      await loadData();
    });

    await loadData();

    async function loadData() {
      destroyCharts();

      var allFilters = {};
      if (currentLoja !== 'all') allFilters.lojaId = currentLoja;
      var quebra = await API.getQuebra(allFilters);

      // Normalize data field
      quebra = quebra.filter(function(d) {
        if (!d.data && d.created_at) d.data = d.created_at.slice(0, 10);
        return d.data;
      });

      var result = Engine.processQuebra(quebra, currentPeriod);

      // Big Numbers
      document.getElementById('bnQbrKg').textContent = result.totalKg + ' kg';
      updateDelta('bnQbrKgVar', result.variacaoKg, true);
      document.getElementById('bnQbrOcor').textContent = result.ocorrencias;
      document.getElementById('bnQbrRS').textContent = 'R$ ' + result.totalRS.toLocaleString('pt-BR');
      updateDelta('bnQbrRSVar', result.variacaoRS, true);

      // Rankings Kg
      renderRankKg('rankLojaQbr', result.rankLojas);
      renderRankKg('rankProdQbr', result.rankProdutos);

      // Rankings R$
      renderRankRS('rankLojaQbrRS', result.rankLojas);
      renderRankRS('rankProdQbrRS', result.rankProdutos);

      // Evolutivo Kg
      if (result.evolutivoMensal.length > 0) {
        var evoKgData = result.evolutivoMensal.map(function(e) { return { label: e.label, valor: e.kg }; });
        chartInstances.push(Charts.evolutivoMensal('evoQbrKg', evoKgData, Charts.COLORS.purple));
      }

      // Evolutivo R$
      if (result.evolutivoMensal.length > 0) {
        var evoRSData = result.evolutivoMensal.map(function(e) { return { label: e.label, valor: e.rs }; });
        chartInstances.push(Charts.evolutivoMensal('evoQbrRS', evoRSData, Charts.COLORS.red));
      }

      // Motivos
      if (Object.keys(result.motivos).length > 0) {
        chartInstances.push(Charts.motivosBar('chartMotQbr', result.motivos));
      }

      // Dia da semana
      if (result.porDiaSemana.length > 0) {
        chartInstances.push(Charts.diaSemanaKg('chartDiaQbr', result.porDiaSemana));
      }

      // Destinos
      if (Object.keys(result.destinos).length > 0) {
        chartInstances.push(Charts.motivosDonut('chartDestQbr', result.destinos));
      }
    }

    function renderRankKg(containerId, data) {
      var tbody = document.querySelector('#' + containerId + ' tbody');
      if (!tbody) return;
      var maxKg = data.length > 0 ? data[0].kg : 1;
      var html = '';
      data.forEach(function(r) {
        var barW = Math.min((r.kg / maxKg) * 100, 100);
        var varClass = r.variacao > 0 ? 'down' : r.variacao < 0 ? 'up' : 'eq';
        var varSign = r.variacao > 0 ? '+' : '';
        html += '<tr>' +
          '<td class="name">' + r.nome + '</td>' +
          '<td class="val">' + r.kg + '</td>' +
          '<td class="bar-cell"><div class="mini-bar"><div class="mini-bar-fill" style="width:' + barW + '%;background:var(--purple)"></div></div></td>' +
          '<td><span class="var-chip ' + varClass + '">' + varSign + r.variacao + '</span></td></tr>';
      });
      tbody.innerHTML = html;
    }

    function renderRankRS(containerId, data) {
      var tbody = document.querySelector('#' + containerId + ' tbody');
      if (!tbody) return;
      var maxRS = data.length > 0 ? data[0].rs : 1;
      var html = '';
      data.forEach(function(r) {
        var barW = Math.min((r.rs / maxRS) * 100, 100);
        html += '<tr>' +
          '<td class="name">' + r.nome + '</td>' +
          '<td class="val">R$ ' + r.rs + '</td>' +
          '<td class="bar-cell"><div class="mini-bar"><div class="mini-bar-fill" style="width:' + barW + '%;background:var(--red)"></div></div></td>' +
          '<td>' + r.ocorrencias + '</td></tr>';
      });
      tbody.innerHTML = html;
    }

    function updateDelta(elId, variacao, invertedLogic) {
      var el = document.getElementById(elId);
      if (!el) return;
      var sign = variacao > 0 ? '+ ' : variacao < 0 ? '- ' : '';
      var abs = Math.abs(variacao);
      el.textContent = sign + abs + (elId.indexOf('RS') >= 0 ? ' R$' : ' kg');
      var isBad = invertedLogic ? variacao > 0 : variacao < 0;
      var isGood = invertedLogic ? variacao < 0 : variacao > 0;
      el.className = 'strip-bn-delta ' + (isGood ? 'up' : isBad ? 'down' : 'neutral');
    }
  });
})();
