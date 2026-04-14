// ============================================================
// NEXO Intelligence Web v2 — Copiloto Estratégico
// Layout v2: score compacto + grid de insights organizado
// ============================================================
(function () {

  Router.register('copiloto', async function (container) {

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
      '<div id="copiloto-root"><div class="page-loading">Calculando insights...</div></div>';

    // ── Carregar dados ──────────────────────────────────────
    var disponibilidade = [], temperatura = [], presenca = [], quebra = [];
    try {
      var results = await Promise.allSettled([
        API.getDisponibilidade({}),
        API.getTemperatura({}),
        API.getPresenca({}),
        API.getQuebra({})
      ]);
      disponibilidade = results[0].status === 'fulfilled' ? results[0].value : [];
      temperatura     = results[1].status === 'fulfilled' ? results[1].value : [];
      presenca        = results[2].status === 'fulfilled' ? results[2].value : [];
      quebra          = results[3].status === 'fulfilled' ? results[3].value : [];
    } catch (e) { console.error('[Copiloto]', e); }

    var root = document.getElementById('copiloto-root');

    if (!disponibilidade.length) {
      root.innerHTML = '<div class="page-loading">Sem dados disponíveis para o período selecionado.</div>';
      return;
    }

    // ── Processar dados ─────────────────────────────────────
    var rupData  = Engine.processRuptura(disponibilidade, 15);
    var insights = Engine.generateInsights({ ruptura: rupData, temperatura: temperatura, presenca: presenca, quebra: quebra });

    // ── Score ───────────────────────────────────────────────
    var score      = Math.round((rupData.dispAT.taxa + rupData.dispAS.taxa + (100 - rupData.ruptura.taxa)) / 3);
    var scoreClass = score >= 80 ? 'up' : score >= 60 ? 'neutral' : 'down';
    var scoreLabel = score >= 80 ? 'Bom' : score >= 60 ? 'Atenção' : 'Crítico';
    var scoreColor = score >= 80 ? '#2D8653' : score >= 60 ? '#C97B2C' : '#C0504D';

    // ── Breakdown ───────────────────────────────────────────
    var breakdown = [
      { label: 'Disp. AT',    val: rupData.dispAT.taxa,              color: '#C97B2C', icon: '🛒' },
      { label: 'Disp. AS',    val: rupData.dispAS.taxa,              color: '#3670A0', icon: '🏪' },
      { label: 'Disp. Estq.', val: Math.round(100 - rupData.ruptura.taxa), color: '#7153A0', icon: '📦' }
    ];

    // ── Renderizar ──────────────────────────────────────────
    root.innerHTML = _renderPage(score, scoreClass, scoreLabel, scoreColor, breakdown, insights);

    // ── Score Ring (canvas pequeno) ─────────────────────────
    var ringCanvas = document.getElementById('scoreRingMini');
    if (ringCanvas) {
      new Chart(ringCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          datasets: [{
            data:            [score, 100 - score],
            backgroundColor: [scoreColor, 'rgba(0,0,0,0.05)'],
            borderWidth:     0,
            cutout:          '78%'
          }]
        },
        options: {
          responsive: false,
          plugins:    { tooltip: { enabled: false }, legend: { display: false } },
          animation:  { animateRotate: true, duration: 1200, easing: 'easeInOutQuart' }
        }
      });
    }

    // ── Period pills ────────────────────────────────────────
    UI.initPeriodPills(function (days) {
      var rupNew     = Engine.processRuptura(disponibilidade, days);
      var insNew     = Engine.generateInsights({ ruptura: rupNew, temperatura: temperatura, presenca: presenca, quebra: quebra });
      var scoreNew   = Math.round((rupNew.dispAT.taxa + rupNew.dispAS.taxa + (100 - rupNew.ruptura.taxa)) / 3);
      var scClassNew = scoreNew >= 80 ? 'up' : scoreNew >= 60 ? 'neutral' : 'down';
      var scLblNew   = scoreNew >= 80 ? 'Bom' : scoreNew >= 60 ? 'Atenção' : 'Crítico';
      var scColorNew = scoreNew >= 80 ? '#2D8653' : scoreNew >= 60 ? '#C97B2C' : '#C0504D';
      var bdNew = [
        { label: 'Disp. AT',    val: rupNew.dispAT.taxa,              color: '#C97B2C', icon: '🛒' },
        { label: 'Disp. AS',    val: rupNew.dispAS.taxa,              color: '#3670A0', icon: '🏪' },
        { label: 'Disp. Estq.', val: Math.round(100 - rupNew.ruptura.taxa), color: '#7153A0', icon: '📦' }
      ];
      root.innerHTML = _renderPage(scoreNew, scClassNew, scLblNew, scColorNew, bdNew, insNew);
      var rc = document.getElementById('scoreRingMini');
      if (rc) {
        new Chart(rc.getContext('2d'), {
          type: 'doughnut',
          data: { datasets: [{ data: [scoreNew, 100 - scoreNew], backgroundColor: [scColorNew, 'rgba(0,0,0,0.05)'], borderWidth: 0, cutout: '78%' }] },
          options: { responsive: false, plugins: { tooltip: { enabled: false }, legend: { display: false } }, animation: { animateRotate: true, duration: 900 } }
        });
      }
    });
  });

  // ── HTML BUILDER ───────────────────────────────────────────
  function _renderPage(score, scoreClass, scoreLabel, scoreColor, breakdown, insights) {
    return (
      // ── HEADER BAR: Score + Breakdown ──────────────────────
      '<div class="cop-header anim d1">' +

        // Score ring compacto
        '<div class="cop-score-wrap">' +
          '<div style="position:relative;width:88px;height:88px;flex-shrink:0">' +
            '<canvas id="scoreRingMini" width="88" height="88"></canvas>' +
            '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">' +
              '<div style="font-size:22px;font-weight:700;color:' + scoreColor + ';line-height:1">' + score + '</div>' +
              '<div style="font-size:8px;font-weight:600;letter-spacing:0.08em;color:#9CA3AF;text-transform:uppercase;margin-top:1px">SCORE</div>' +
            '</div>' +
          '</div>' +
          '<div class="cop-score-label ' + scoreClass + '">' + scoreLabel + '</div>' +
        '</div>' +

        // Divisor
        '<div class="cop-divider"></div>' +

        // Breakdown compacto
        '<div class="cop-breakdown">' +
          breakdown.map(function (b) {
            return '<div class="cop-bd-item">' +
              '<span class="cop-bd-icon">' + b.icon + '</span>' +
              '<div class="cop-bd-info">' +
                '<div class="cop-bd-val" style="color:' + b.color + '">' + b.val + '%</div>' +
                '<div class="cop-bd-label">' + b.label + '</div>' +
              '</div>' +
              '<div class="cop-bd-bar-wrap"><div class="cop-bd-bar" style="width:' + b.val + '%;background:' + b.color + '"></div></div>' +
            '</div>';
          }).join('') +
        '</div>' +

        // Dica contextual
        '<div class="cop-tip">' +
          '<div style="font-size:10px;color:#9CA3AF;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px">Maior alerta</div>' +
          '<div style="font-size:13px;font-weight:600;color:#1F2937">' + (insights.criticos.length ? insights.criticos[0].titulo || insights.criticos[0].headline || '—' : 'Sem alertas críticos') + '</div>' +
          '<div style="font-size:11px;color:#6B7280;margin-top:2px">' + insights.criticos.length + ' alerta(s) crítico(s) neste período</div>' +
        '</div>' +

      '</div>' +

      // ── GRID DE INSIGHTS 2×2 ───────────────────────────────
      '<div class="cop-insights-grid anim d2">' +
        _renderBlock('critical', '🚨', 'Alertas Críticos',  insights.criticos,      'Problemas ativos que precisam de ação') +
        _renderBlock('opportunity', '💡', 'Oportunidades', insights.oportunidades,  'Situações favoráveis a explorar') +
        _renderBlock('forecast',  '🔮', 'Previsão',         insights.previsao,      'Padrões e tendências identificados') +
        _renderBlock('evolution', '📈', 'Evolução',         insights.evolucao,      'Como os indicadores estão se movendo') +
      '</div>'
    );
  }

  // ── BLOCO DE INSIGHTS ──────────────────────────────────────
  function _renderBlock(type, icon, title, items, subtitle) {
    // Filtrar itens vazios
    var validItems = (items || []).filter(function (i) {
      return i && (i.titulo || i.headline) && (i.narrativa || i.narrative);
    });

    var colorMap = {
      critical:    { bg: 'rgba(192,80,77,0.08)',   border: '#C0504D', text: '#C0504D', badge: 'rgba(192,80,77,0.12)' },
      opportunity: { bg: 'rgba(45,134,83,0.08)',   border: '#2D8653', text: '#2D8653', badge: 'rgba(45,134,83,0.12)' },
      forecast:    { bg: 'rgba(54,112,160,0.08)',  border: '#3670A0', text: '#3670A0', badge: 'rgba(54,112,160,0.12)' },
      evolution:   { bg: 'rgba(113,83,160,0.08)',  border: '#7153A0', text: '#7153A0', badge: 'rgba(113,83,160,0.12)' }
    };
    var c = colorMap[type] || colorMap.evolution;

    var bodyHtml = '';

    if (!validItems.length) {
      bodyHtml = '<div class="cop-empty">Sem dados para este período</div>';
    } else {
      bodyHtml = validItems.slice(0, 3).map(function (item) {
        var headline  = item.titulo    || item.headline  || '';
        var narrative = item.narrativa || item.narrative || '';
        var action    = item.acao      || item.action    || '';
        return (
          '<div class="cop-insight-card" style="border-left-color:' + c.border + ';background:' + c.bg + '">' +
            '<div class="cop-insight-head">' +
              '<div class="cop-insight-badge" style="background:' + c.badge + ';color:' + c.text + '">' + _badgeIcon(type) + '</div>' +
              '<div class="cop-insight-title">' + _escHtml(headline) + '</div>' +
            '</div>' +
            '<div class="cop-insight-body">' + _escHtml(narrative) + '</div>' +
            (action ? '<div class="cop-insight-action" style="color:' + c.text + '">→ ' + _escHtml(action.replace(/^→\s*/, '')) + '</div>' : '') +
          '</div>'
        );
      }).join('');
    }

    return (
      '<div class="cop-block">' +
        '<div class="cop-block-header" style="border-bottom:1px solid ' + c.border + '22">' +
          '<div class="cop-block-icon" style="background:' + c.badge + ';color:' + c.text + '">' + icon + '</div>' +
          '<div>' +
            '<div class="cop-block-title">' + title + '</div>' +
            '<div class="cop-block-sub">' + subtitle + '</div>' +
          '</div>' +
          (validItems.length ? '<div class="cop-block-count" style="background:' + c.badge + ';color:' + c.text + '">' + validItems.length + '</div>' : '') +
        '</div>' +
        '<div class="cop-block-body">' + bodyHtml + '</div>' +
      '</div>'
    );
  }

  function _badgeIcon(type) {
    return { critical: '!', opportunity: '↑', forecast: '~', evolution: '▸' }[type] || '·';
  }

  function _escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();
