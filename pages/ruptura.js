// ============================================================
// NEXO Intelligence Web v2 — Página Ruptura & Disponibilidade
// Template KPI principal — padrão Seara (3 faixas)
// ============================================================
(function() {
  let currentPeriod = 15;
  let currentLoja = 'all';
  let chartInstances = [];

  function destroyCharts() {
    chartInstances.forEach(c => { if (c && c.destroy) c.destroy(); });
    chartInstances = [];
  }

  Router.register('ruptura', async function(container) {
    destroyCharts();

    container.innerHTML = `
      <!-- TOOLBAR -->
      <div class="toolbar anim">
        <div class="period-pills">
          <button class="pp" data-d="7">7d</button>
          <button class="pp ${currentPeriod===15?'active':''}" data-d="15">15d</button>
          <button class="pp ${currentPeriod===30?'active':''}" data-d="30">30d</button>
          <button class="pp" data-d="60">60d</button>
          <button class="pp" data-d="90">90d</button>
        </div>
        <select class="filter-select" id="filterLojaRup">
          <option value="all">Todas as lojas</option>
        </select>
      </div>

      <!-- FAIXA RUPTURA -->
      <div class="strip rup anim d1" id="stripRup">
        <div class="strip-header">
          <div class="strip-icon rup">R</div>
          <div><div class="strip-title">Ruptura</div><div class="strip-subtitle">Sem estoque — problema de supply</div></div>
          <div class="strip-bn">
            <div class="strip-bn-item"><div class="strip-bn-label">TAXA ATUAL</div><div class="strip-bn-val" id="bnRupTaxa">—</div><div class="strip-bn-delta" id="bnRupVar">—</div></div>
            <div class="strip-bn-item"><div class="strip-bn-label">OCORRÊNCIAS</div><div class="strip-bn-val" id="bnRupTotal">—</div><div class="strip-bn-delta neutral">no período</div></div>
          </div>
        </div>
        <div class="strip-body">
          <div class="strip-col"><div class="strip-col-title">Evolutivo mensal</div><div class="evo-chart"><canvas id="evoRup"></canvas></div></div>
          <div class="strip-col"><div class="strip-col-title">Ranking por loja</div><div class="rank-scroll" id="rankLojaRup"><table class="rt"><thead><tr><th>Loja</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>
          <div class="strip-col"><div class="strip-col-title">Ranking por produto</div><div class="rank-scroll" id="rankProdRup"><table class="rt"><thead><tr><th>Produto</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>
        </div>
      </div>

      <!-- FAIXA AT -->
      <div class="strip at anim d2" id="stripAT">
        <div class="strip-header">
          <div class="strip-icon at">AT</div>
          <div><div class="strip-title">Disponibilidade AT</div><div class="strip-subtitle">Tem estoque, está no balcão? — execução</div></div>
          <div class="strip-bn">
            <div class="strip-bn-item"><div class="strip-bn-label">TAXA ATUAL</div><div class="strip-bn-val" id="bnATTaxa">—</div><div class="strip-bn-delta" id="bnATVar">—</div></div>
          </div>
        </div>
        <div class="strip-body">
          <div class="strip-col"><div class="strip-col-title">Evolutivo mensal</div><div class="evo-chart"><canvas id="evoAT"></canvas></div></div>
          <div class="strip-col"><div class="strip-col-title">Ranking por loja</div><div class="rank-scroll" id="rankLojaAT"><table class="rt"><thead><tr><th>Loja</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>
          <div class="strip-col"><div class="strip-col-title">Ranking por produto</div><div class="rank-scroll" id="rankProdAT"><table class="rt"><thead><tr><th>Produto</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>
        </div>
      </div>

      <!-- FAIXA AS -->
      <div class="strip as anim d3" id="stripAS">
        <div class="strip-header">
          <div class="strip-icon as">AS</div>
          <div><div class="strip-title">Disponibilidade AS</div><div class="strip-subtitle">Tem estoque, está no self-service? — execução</div></div>
          <div class="strip-bn">
            <div class="strip-bn-item"><div class="strip-bn-label">TAXA ATUAL</div><div class="strip-bn-val" id="bnASTaxa">—</div><div class="strip-bn-delta" id="bnASVar">—</div></div>
          </div>
        </div>
        <div class="strip-body">
          <div class="strip-col"><div class="strip-col-title">Evolutivo mensal</div><div class="evo-chart"><canvas id="evoAS"></canvas></div></div>
          <div class="strip-col"><div class="strip-col-title">Ranking por loja</div><div class="rank-scroll" id="rankLojaAS"><table class="rt"><thead><tr><th>Loja</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>
          <div class="strip-col"><div class="strip-col-title">Ranking por produto</div><div class="rank-scroll" id="rankProdAS"><table class="rt"><thead><tr><th>Produto</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>
        </div>
      </div>

      <!-- ANÁLISE COMPLEMENTAR -->
      <div class="section-title anim d4"><span class="st-icon">🎯</span> Análise complementar</div>
      <div class="bottom-grid anim d4">
        <div class="card"><div class="ch"><div><div class="ct">Motivos de ruptura</div><div class="cs">Supply — por que falta estoque?</div></div></div><div class="cb"><div class="chart-box" style="height:160px"><canvas id="chartMotRup"></canvas></div></div></div>
        <div class="card"><div class="ch"><div><div class="ct">Ruptura por dia da semana</div><div class="cs">Taxa % — padrão semanal</div></div></div><div class="cb"><div class="chart-box" style="height:160px"><canvas id="chartDia"></canvas></div></div></div>
        <div class="card"><div class="ch"><div><div class="ct">Motivos indisponibilidade</div><div class="cs">Execução — por que não chega ao balcão?</div></div></div><div class="cb"><div class="chart-box" style="height:160px"><canvas id="chartMotInd"></canvas></div></div></div>
      </div>

      <!-- HEATMAP -->
      <div class="card anim d5" style="margin-bottom:24px">
        <div class="ch"><div><div class="ct">Heatmap — Produto × Dia da semana</div><div class="cs">Intensidade de ruptura (%) por combinação</div></div></div>
        <div class="cb" style="overflow-x:auto"><div id="heatmapBox"></div></div>
      </div>
    `;

    // Populate loja filter
    const lojas = await API.getLojas(window.NEXO_REDE_ID);
    UI.populateLojaFilter('filterLojaRup', lojas);

    // Period pill handler
    UI.initPeriodPills(async (days) => {
      currentPeriod = days;
      await loadData();
    });

    // Loja filter handler
    document.getElementById('filterLojaRup').addEventListener('change', async function() {
      currentLoja = this.value;
      API.clearCache();
      await loadData();
    });

    // Load data
    await loadData();

    async function loadData() {
      destroyCharts();
      const filters = { desde: Utils.daysAgo(90) };
      if (currentLoja !== 'all') filters.lojaId = currentLoja;

      const disponibilidade = await API.getDisponibilidade(filters);
      const result = Engine.processRuptura(disponibilidade, currentPeriod);

      // === Update Big Numbers ===
      document.getElementById('bnRupTaxa').textContent = result.ruptura.taxa + '%';
      updateDelta('bnRupVar', result.ruptura.variacao, true);
      document.getElementById('bnRupTotal').textContent = result.ruptura.total;

      document.getElementById('bnATTaxa').textContent = result.dispAT.taxa + '%';
      updateDelta('bnATVar', result.dispAT.variacao, false);

      document.getElementById('bnASTaxa').textContent = result.dispAS.taxa + '%';
      updateDelta('bnASVar', result.dispAS.variacao, false);

      // === Rankings ===
      UI.renderRanking('rankLojaRup', result.ruptura.rankLojas, { inverted: false, maxBar: 30 });
      UI.renderRanking('rankProdRup', result.ruptura.rankProdutos, { inverted: false, maxBar: 30 });
      UI.renderRanking('rankLojaAT', result.dispAT.rankLojas, { inverted: true, maxBar: 100 });
      UI.renderRanking('rankProdAT', result.dispAT.rankProdutos, { inverted: true, maxBar: 100 });
      UI.renderRanking('rankLojaAS', result.dispAS.rankLojas, { inverted: true, maxBar: 100 });
      UI.renderRanking('rankProdAS', result.dispAS.rankProdutos, { inverted: true, maxBar: 100 });

      // === Evolutivo Mensal ===
      const evo = result.evolutivoMensal;
      if (evo.ruptura.length) chartInstances.push(Charts.evolutivoMensal('evoRup', evo.ruptura, Charts.COLORS.red));
      if (evo.dispAT.length) chartInstances.push(Charts.evolutivoMensal('evoAT', evo.dispAT, Charts.COLORS.orange));
      if (evo.dispAS.length) chartInstances.push(Charts.evolutivoMensal('evoAS', evo.dispAS, Charts.COLORS.blue));

      // === Motivos ===
      if (Object.keys(result.motivos.ruptura).length) {
        chartInstances.push(Charts.motivosDonut('chartMotRup', result.motivos.ruptura));
      }
      if (Object.keys(result.motivos.indisponibilidade).length) {
        chartInstances.push(Charts.motivosBar('chartMotInd', result.motivos.indisponibilidade));
      }

      // === Dia da semana ===
      if (result.porDiaSemana.length) {
        chartInstances.push(Charts.diaSemana('chartDia', result.porDiaSemana));
      }

      // === Heatmap ===
      UI.renderHeatmap('heatmapBox', result.heatmap);
    }

    function updateDelta(elId, variacao, invertedLogic) {
      const el = document.getElementById(elId);
      if (!el) return;
      const sign = variacao > 0 ? '▲ +' : variacao < 0 ? '▼ ' : '';
      el.textContent = sign + variacao + ' p.p.';
      // invertedLogic: for ruptura, going up is bad
      const isGood = invertedLogic ? variacao < 0 : variacao > 0;
      const isBad = invertedLogic ? variacao > 0 : variacao < 0;
      el.className = 'strip-bn-delta ' + (isGood ? 'up' : isBad ? 'down' : 'neutral');
    }
  });
})();
