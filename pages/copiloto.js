// ============================================================
// NEXO Intelligence Web v2 — Página Copiloto Estratégico
// Insights cruzados narrativos em 4 blocos
// ============================================================
(function() {

  Router.register('copiloto', async function(container) {

    container.innerHTML =
      '<div class="toolbar anim">' +
        '<div class="period-pills">' +
          '<button class="pp" data-d="7">7d</button>' +
          '<button class="pp active" data-d="15">15d</button>' +
          '<button class="pp" data-d="30">30d</button>' +
          '<button class="pp" data-d="60">60d</button>' +
          '<button class="pp" data-d="90">90d</button>' +
        '</div>' +
      '</div>' +

      '<div class="score-section anim d1">' +
        '<div class="score-card">' +
          '<div class="score-ring-container"><canvas id="scoreRing"></canvas>' +
            '<div class="score-center"><div class="score-value" id="scoreVal">—</div><div class="score-label">SCORE GERAL</div></div>' +
          '</div>' +
          '<div class="score-delta" id="scoreDelta">Calculando...</div>' +
          '<div style="width:100%;margin-top:16px" id="scoreBreakdown"></div>' +
        '</div>' +
        '<div class="copiloto-grid" id="copilotoGrid">' +
          '<div class="page-loading">Gerando insights...</div>' +
        '</div>' +
      '</div>';

    // Load data with error handling
    var disponibilidade = [];
    var temperatura = [];
    var presenca = [];
    var quebra = [];

    try {
      var results = await Promise.allSettled([
        API.getDisponibilidade({}),
        API.getTemperatura({}),
        API.getPresenca({}),
        API.getQuebra({})
      ]);
      disponibilidade = (results[0].status === 'fulfilled') ? results[0].value : [];
      temperatura = (results[1].status === 'fulfilled') ? results[1].value : [];
      presenca = (results[2].status === 'fulfilled') ? results[2].value : [];
      quebra = (results[3].status === 'fulfilled') ? results[3].value : [];
    } catch(e) {
      console.error('[Copiloto] Erro:', e);
    }

    if (disponibilidade.length === 0) {
      document.getElementById('copilotoGrid').innerHTML = '<div class="page-loading">Sem dados de disponibilidade para gerar insights.</div>';
      document.getElementById('scoreVal').textContent = '—';
      document.getElementById('scoreDelta').textContent = 'Sem dados';
      return;
    }

    var rupData = Engine.processRuptura(disponibilidade, 15);

    // Insights
    var insights = Engine.generateInsights({
      ruptura: rupData,
      temperatura: temperatura,
      presenca: presenca,
      quebra: quebra
    });

    // Score Ring
    var score = Math.round((rupData.dispAT.taxa + rupData.dispAS.taxa + (100 - rupData.ruptura.taxa)) / 3);
    document.getElementById('scoreVal').textContent = score;

    var scoreClass = score >= 80 ? 'up' : score >= 60 ? '' : 'down';
    var scoreLabel = score >= 80 ? 'Bom' : score >= 60 ? 'Atencao' : 'Critico';
    document.getElementById('scoreDelta').textContent = scoreLabel;
    document.getElementById('scoreDelta').className = 'score-delta ' + scoreClass;

    new Chart(document.getElementById('scoreRing').getContext('2d'), {
      type: 'doughnut',
      data: { datasets: [{ data: [score, 100 - score], backgroundColor: [Charts.COLORS.gold, 'rgba(0,0,0,0.04)'], borderWidth: 0, cutout: '78%' }] },
      options: { responsive: false, plugins: { tooltip: { enabled: false } }, animation: { animateRotate: true, duration: 1200 } }
    });

    // Breakdown
    var breakItems = [
      { label: 'Disponibilidade AT', val: rupData.dispAT.taxa, color: Charts.COLORS.orange },
      { label: 'Disponibilidade AS', val: rupData.dispAS.taxa, color: Charts.COLORS.blue },
      { label: 'Ruptura (inverso)', val: Math.round(100 - rupData.ruptura.taxa), color: Charts.COLORS.red }
    ];
    var bdHtml = '';
    breakItems.forEach(function(b) {
      bdHtml += '<div class="breakdown-item"><span class="breakdown-label">' + b.label + '</span>' +
        '<div class="breakdown-bar"><div class="breakdown-fill" style="width:' + b.val + '%;background:' + b.color + '"></div></div>' +
        '<span class="breakdown-score" style="color:' + b.color + '">' + b.val + '</span></div>';
    });
    document.getElementById('scoreBreakdown').innerHTML = bdHtml;

    // 4 Blocks
    var blocks = [
      { key: 'criticos', cls: 'critical', icon: '🚨', title: 'Alertas Criticos' },
      { key: 'oportunidades', cls: 'opportunity', icon: '💡', title: 'Oportunidades' },
      { key: 'previsao', cls: 'forecast', icon: '🔮', title: 'Previsao' },
      { key: 'evolucao', cls: 'evolution', icon: '📈', title: 'Evolucao' }
    ];

    var gridHtml = '';
    blocks.forEach(function(block) {
      var items = insights[block.key] || [];
      gridHtml += '<div class="copiloto-block ' + block.cls + '">' +
        '<div class="block-header"><div class="block-icon ' + block.cls + '">' + block.icon + '</div>' +
        '<div><div class="block-title">' + block.title + '</div></div>' +
        '<span class="block-count">' + items.length + '</span></div>' +
        '<div class="block-insights">';

      if (items.length === 0) {
        gridHtml += '<div class="insight-card ' + block.cls + '"><div class="insight-narrative">Sem alertas no periodo selecionado.</div></div>';
      } else {
        items.forEach(function(ins) {
          gridHtml += '<div class="insight-card ' + block.cls + '">' +
            '<div class="insight-headline">' + ins.titulo + '</div>' +
            '<div class="insight-narrative">' + ins.narrativa + '</div>' +
            '<div class="insight-action"><span class="action-arrow">&rarr;</span> ' + ins.acao + '</div>' +
            '</div>';
        });
      }
      gridHtml += '</div></div>';
    });

    document.getElementById('copilotoGrid').innerHTML = gridHtml;

    // Period pills
    UI.initPeriodPills(function() {
      Router.pages['copiloto'](container);
    });
  });
})();
