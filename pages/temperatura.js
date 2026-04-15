// ============================================================
// NEXO Intelligence Web v2 — Pagina Temperatura (Cadeia do Frio)
// PATCH v3.1: Fix crash renderBloco4 (ranking.rede→ranking.total, .conf→.pct)
// ============================================================

Router.register('temperatura', async function(container) {

  var currentPeriod = 15;
  var currentLoja = 'all';
  var tmpCharts = [];
  var tmpData = null;
  var tmpEqFilter = 'todos';

  function destroyCharts() {
    tmpCharts.forEach(function(c) { if (c && c.destroy) c.destroy(); });
    tmpCharts = [];
  }

  container.innerHTML =
    '<div class="toolbar anim">' +
      '<div class="period-pills">' +
        '<button class="pp" data-d="7">7d</button>' +
        '<button class="pp active" data-d="15">15d</button>' +
        '<button class="pp" data-d="30">30d</button>' +
        '<button class="pp" data-d="60">60d</button>' +
        '<button class="pp" data-d="90">90d</button>' +
      '</div>' +
      '<select class="loja-filter" id="filterLojaTemp"><option value="all">Todas as lojas</option></select>' +
    '</div>' +
    '<div id="tempContent"><div class="loading-state"><div class="spinner"></div><span>Carregando temperatura...</span></div></div>';

  var lojas = await API.getLojas(window.NEXO_REDE_ID);
  UI.populateLojaFilter('filterLojaTemp', lojas);
  UI.initPeriodPills(function(days) { currentPeriod = days; loadData(); });

  var filterEl = document.getElementById('filterLojaTemp');
  if (filterEl) { filterEl.addEventListener('change', function() { currentLoja = this.value; loadData(); }); }

  async function loadData() {
    var contentEl = document.getElementById('tempContent');
    if (!contentEl) return;
    contentEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Carregando temperatura...</span></div>';
    destroyCharts();
    try {
      var filters = {};
      if (currentLoja && currentLoja !== 'all') filters.lojaId = currentLoja;
      var temps = await API.getTemperatura(filters);
      if (!temps || temps.length === 0) {
        contentEl.innerHTML = '<div class="empty-state"><div class="icon">🌡️</div><p>Sem dados de temperatura disponiveis</p></div>';
        return;
      }
      tmpData = Engine.processTemperatura(temps, currentPeriod);
      if (!tmpData) {
        contentEl.innerHTML = '<div class="empty-state"><div class="icon">🌡️</div><p>Dados insuficientes para analise</p></div>';
        return;
      }
      renderAll(contentEl);
    } catch (err) {
      console.error('Temperatura loadData error:', err);
      contentEl.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>Erro ao carregar dados: ' + err.message + '</p></div>';
    }
  }

  function renderAll(el) {
    var d = tmpData;
    el.innerHTML = renderBloco1(d.termometros) + renderBloco2() + renderBloco2B(d.leituras) + renderBloco3() + renderBloco4(d.ranking);
    setTimeout(function() {
      initBloco1Donuts(d.termometros);
      initBloco2Charts(d.tendenciaConf, tmpEqFilter);
      initBloco2BCharts(d.leituras);
      renderBnTable(d.mapaConf, 'todos');
      attachBnTooltips(d.mapaConf);
      initPillEvents();
    }, 50);
  }

  // ── BLOCO 1: Termômetros ──
  function thermoSVG(eq) {
    var iC = eq.id === 'cong';
    var ok = iC ? (eq.temp !== null && eq.temp <= -18) : (eq.temp !== null && eq.temp >= 0 && eq.temp <= 4);
    var grads = { balcao: ['#86EFAC','#22C55E','#16A34A'], resf: ['#93C5FD','#3B82F6','#2563EB'], cong: ['#C4B5FD','#8B5CF6','#6D28D9'] };
    var g = grads[eq.id] || grads.balcao; var gid = 'gr_' + eq.id;
    var tH = 72, tT = 6;
    var fP = iC ? (eq.temp !== null ? Math.max(8, Math.min(92, ((eq.temp - (-30)) / ((-5) - (-30))) * 100)) : 50)
                : (eq.temp !== null ? Math.max(8, Math.min(92, ((eq.temp - (-2)) / (10 - (-2))) * 100)) : 50);
    var mT = tT + tH - (fP / 100) * tH;
    var zT = iC ? tT + tH - (((-18) - (-30)) / ((-5) - (-30))) * tH : tT + tH - ((4 - (-2)) / (10 - (-2))) * tH;
    var zB = iC ? tT + tH : tT + tH - ((0 - (-2)) / (10 - (-2))) * tH;
    var mc = ok ? 'url(#' + gid + ')' : '#C0504D';
    var s = '<svg viewBox="0 0 44 105" width="44" height="88" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0%" stop-color="' + g[2] + '"/><stop offset="50%" stop-color="' + g[1] + '"/><stop offset="100%" stop-color="' + g[0] + '"/></linearGradient></defs>' +
      '<rect x="15" y="' + tT + '" width="14" height="' + tH + '" rx="7" fill="#E5E7EB" opacity=".7"/>' +
      '<rect x="16" y="' + (tT+1) + '" width="12" height="' + (tH-2) + '" rx="6" fill="#F3F4F6"/>' +
      '<rect x="16" y="' + zT + '" width="12" height="' + Math.max(1, zB - zT) + '" fill="rgba(45,134,83,.08)"/>' +
      '<line x1="10" y1="' + zT + '" x2="16" y2="' + zT + '" stroke="' + g[1] + '" stroke-width=".8" stroke-dasharray="1.5,1"/>';
    if (!iC) s += '<line x1="10" y1="' + zB + '" x2="16" y2="' + zB + '" stroke="' + g[1] + '" stroke-width=".8" stroke-dasharray="1.5,1"/>';
    s += '<rect x="17" y="' + mT + '" width="10" height="' + (tT+tH-mT) + '" rx="5" fill="' + mc + '"/>' +
      '<rect x="18" y="' + (mT+2) + '" width="3" height="' + Math.max(4, (tT+tH-mT)*0.6) + '" rx="1.5" fill="rgba(255,255,255,.35)"/>';
    var bY = tT + tH + 8;
    s += '<circle cx="22" cy="' + bY + '" r="11" fill="' + mc + '" opacity=".15"/><circle cx="22" cy="' + bY + '" r="8" fill="' + mc + '"/>' +
      '<circle cx="20" cy="' + (bY-2) + '" r="2.5" fill="rgba(255,255,255,.25)"/>' +
      '<ellipse cx="22" cy="' + tT + '" rx="5" ry="2.5" fill="#D1D5DB"/></svg>';
    return s;
  }

  function renderBloco1(termos) {
    var html = '<div class="section-block frost anim d1"><div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Temperatura Media por Equipamento <span class="sh-line"></span></div><div class="tmp-thermo-row">';
    termos.forEach(function(eq) {
      var iC = eq.id === 'cong';
      var ok = iC ? (eq.temp !== null && eq.temp <= -18) : (eq.temp !== null && eq.temp >= 0 && eq.temp <= 4);
      var bigCls = eq.temp === null ? '' : (ok ? 'ok' : 'danger');
      var d = eq.delta; var vc, vt, arrow;
      if (d === 0 || eq.temp === null) { vc = 'stable'; vt = '0&deg;C'; arrow = '='; }
      else if (iC) { vc = d < 0 ? 'down-good' : 'up'; vt = (d > 0 ? '+' : '') + d + '&deg;C'; arrow = d > 0 ? '&#9650;' : '&#9660;'; }
      else { vc = d > 0 ? 'up' : 'down-good'; vt = (d > 0 ? '+' : '') + d + '&deg;C'; arrow = d > 0 ? '&#9650;' : '&#9660;'; }
      var dcc = eq.confPct >= 85 ? 'var(--green)' : (eq.confPct >= 70 ? 'var(--orange)' : 'var(--red)');
      html += '<div class="tmp-tc ' + eq.id + '">' +
        '<div class="tmp-tc-thermo"><div class="tmp-tc-label">' + eq.label + '</div>' + thermoSVG(eq) +
        '<div class="tmp-tc-big ' + bigCls + '">' + (eq.temp !== null ? eq.temp : '--') + '<span class="tmp-tc-unit">&deg;C</span></div>' +
        '<span class="tmp-tc-faixa">' + eq.faixa + '&deg;C</span></div>' +
        '<div class="tmp-tc-divider"></div>' +
        '<div class="tmp-tc-metrics">' +
          '<div class="tmp-tc-comp"><div><div class="tmp-tc-comp-label">Vs. per. ant.</div><div class="tmp-tc-comp-val ' + vc + '">' + arrow + ' ' + vt + '</div></div></div>' +
          '<div class="tmp-tc-conf">' +
            '<div class="tmp-tc-donut-wrap"><canvas id="donut_' + eq.id + '"></canvas>' +
            '<div class="tmp-tc-donut-center" style="color:' + dcc + '">' + eq.confPct + '%</div></div>' +
            '<div class="tmp-tc-conf-meta"><div class="tmp-tc-conf-label">Conformidade</div><div class="tmp-tc-conf-detail">' + eq.confOk + '/' + eq.confTotal + ' leituras</div></div>' +
          '</div>' +
        '</div></div>';
    });
    return html + '</div></div>';
  }

  // FIX H: donuts retina com devicePixelRatio
  function initBloco1Donuts(termos) {
    var dpr = window.devicePixelRatio || 1;
    termos.forEach(function(eq) {
      var canvas = document.getElementById('donut_' + eq.id); if (!canvas) return;
      var size = 48;
      canvas.width = size * dpr; canvas.height = size * dpr;
      canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
      var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
      var cx = size / 2, cy = size / 2, r = 18, lw = 5;
      var color = eq.confPct >= 85 ? '#2D8653' : (eq.confPct >= 70 ? '#C97B2C' : '#C0504D');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (eq.confPct / 100) * Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
    });
  }

  // ── BLOCO 2: Tendência Conformidade ──
  function renderBloco2() {
    return '<div class="section-block trend anim d2"><div class="section-header"><span class="sh-dot" style="background:var(--blue)"></span> Tendencia de Conformidade <span class="sh-line"></span></div>' +
      '<div class="eq-pills" id="tmpTrendPills">' +
        '<span class="eq-pill active" data-eq="todos">Todos</span>' +
        '<span class="eq-pill" data-eq="balcao">Balcao</span>' +
        '<span class="eq-pill" data-eq="resf">Camara Resf.</span>' +
        '<span class="eq-pill" data-eq="cong">Camara Cong.</span>' +
      '</div><div class="tmp-trend-grid">' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Conformidade Mensal</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn1"></span><span class="tmp-trc-var" id="tmpVar1"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh1"></canvas></div><table class="tmp-trc-tbl" id="tmpTb1"></table></div>' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Ultimas 8 Semanas</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn2"></span><span class="tmp-trc-var" id="tmpVar2"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh2"></canvas></div><table class="tmp-trc-tbl" id="tmpTb2"></table></div>' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Ultimos 7 Dias</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn3"></span><span class="tmp-trc-var" id="tmpVar3"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh3"></canvas></div><table class="tmp-trc-tbl" id="tmpTb3"></table></div>' +
      '</div></div>';
  }

  function trendColor(eq) {
    var m = { balcao: { l: '#2D8653', f: 'rgba(45,134,83,.12)' }, resf: { l: '#3670A0', f: 'rgba(54,112,160,.12)' }, cong: { l: '#7153A0', f: 'rgba(113,83,160,.12)' } };
    return m[eq] || m.balcao;
  }

  function initBloco2Charts(tendencia, eq) {
    tmpCharts = tmpCharts.filter(function(c) {
      if (c.canvas && (c.canvas.id === 'tmpCh1' || c.canvas.id === 'tmpCh2' || c.canvas.id === 'tmpCh3')) { c.destroy(); return false; }
      return true;
    });
    var t = tendencia[eq]; if (!t) return;
    var c = trendColor(eq);
    [{ data: t.mensal, chId: 'tmpCh1', bnId: 'tmpBn1', varId: 'tmpVar1', tblId: 'tmpTb1' },
     { data: t.semanas, chId: 'tmpCh2', bnId: 'tmpBn2', varId: 'tmpVar2', tblId: 'tmpTb2' },
     { data: t.dias, chId: 'tmpCh3', bnId: 'tmpBn3', varId: 'tmpVar3', tblId: 'tmpTb3' }
    ].forEach(function(s) {
      var d = s.data; if (!d || !d.length) return;
      var last = d[d.length-1].conf, prev = d.length >= 2 ? d[d.length-2].conf : last, delta = last - prev;
      var cls = last >= 85 ? 'ok' : (last >= 70 ? 'warn' : 'danger');
      var bnEl = document.getElementById(s.bnId); if (bnEl) { bnEl.textContent = last + '%'; bnEl.className = 'tmp-trc-bn ' + cls; }
      var varEl = document.getElementById(s.varId);
      if (varEl) {
        var vc = delta > 0 ? 'down-good' : (delta < 0 ? 'up-bad' : 'stable');
        varEl.innerHTML = delta > 0 ? '&#9650; +' + delta + ' p.p.' : (delta < 0 ? '&#9660; ' + delta + ' p.p.' : '= 0 p.p.');
        varEl.className = 'tmp-trc-var ' + vc;
      }
      var canvas = document.getElementById(s.chId); if (!canvas) return;
      var vals = d.map(function(x) { return x.conf; });
      var ptColors = vals.map(function(v) { return v >= 85 ? c.l : (v >= 70 ? '#C97B2C' : '#C0504D'); });
      var ch = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: d.map(function(x) { return x.label; }), datasets: [{ data: vals, borderColor: c.l, backgroundColor: c.f, borderWidth: 2, pointBackgroundColor: ptColors, pointRadius: 4, pointHoverRadius: 6, tension: 0.35, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(12,20,37,.9)', bodyFont: { family: 'Outfit', size: 12 }, padding: 8, cornerRadius: 6 } },
          scales: {
            y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,.03)', drawBorder: false }, ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280', callback: function(v) { return v + '%'; }, stepSize: 25, padding: 4 }, border: { display: false } },
            x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280', maxRotation: 0 }, border: { display: false } }
          },
          layout: { padding: { top: 2, bottom: 0, left: 0, right: 4 } }, animation: { duration: 400 }
        }
      });
      tmpCharts.push(ch);
      // Tabela
      var tbl = document.getElementById(s.tblId); if (!tbl) return;
      var th = '<tr><td style="color:var(--t3);font-weight:700;font-size:11px">LEIT</td>';
      d.forEach(function(x) { th += '<td style="color:#374151;font-size:12px">' + x.leit + '</td>'; });
      th += '</tr><tr><td style="color:var(--t3);font-weight:700;font-size:11px">CONF</td>';
      d.forEach(function(x) { var cc = x.conf >= 85 ? 'var(--green)' : (x.conf >= 70 ? 'var(--orange)' : 'var(--red)'); th += '<td style="color:' + cc + ';font-weight:700;font-size:12px">' + x.conf + '%</td>'; });
      th += '</tr><tr><td style="color:var(--t3);font-weight:700;font-size:11px">VAR</td>';
      d.forEach(function(x) {
        if (x.confAnt === null) { th += '<td class="v-eq" style="font-size:11px">=</td>'; return; }
        var dv = x.conf - x.confAnt;
        th += dv === 0 ? '<td class="v-eq" style="font-size:11px">=</td>' : (dv > 0 ? '<td class="v-down" style="font-size:11px">&#9650;+' + dv + '%</td>' : '<td class="v-up" style="font-size:11px">&#9660;' + dv + '%</td>');
      });
      th += '</tr>'; tbl.innerHTML = th;
    });
  }

  // ── BLOCO 2B: Leituras Matrix ──
  function renderBloco2B(leituras) {
    var equips = [
      { id: 'balcao', nome: 'Balcao Refrig.', faixa: '0&deg;C a 4&deg;C', color: '#2D8653' },
      { id: 'resf',   nome: 'Camara Resf.',   faixa: '0&deg;C a 4&deg;C', color: '#3670A0' },
      { id: 'cong',   nome: 'Camara Cong.',   faixa: '&le; -18&deg;C',    color: '#7153A0' }
    ];
    var html = '<div class="section-block leit anim d3"><div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Leituras de Temperatura <span class="sh-line"></span></div>' +
      '<div class="tmp-matrix"><div class="tmp-mcol-sp"></div><div class="tmp-mcol-h">Media Mensal</div><div class="tmp-mcol-h">Ultimas 8 Semanas</div><div class="tmp-mcol-h">Ultimos 7 Dias</div>';
    equips.forEach(function(eq, ei) {
      var lc = ei === equips.length - 1 ? ' last' : '';
      html += '<div class="tmp-mrow-label"><div class="tmp-mrl-name"><span class="tmp-mrl-dot" style="background:' + eq.color + '"></span> ' + eq.nome + '</div><div class="tmp-mrl-faixa">' + eq.faixa + '</div></div>';
      ['m','s','d'].forEach(function(per) { html += '<div class="tmp-mcell' + lc + '"><div class="tmp-mcell-inner"><canvas id="tmpL_' + eq.id + '_' + per + '"></canvas></div></div>'; });
    });
    return html + '</div><div class="tmp-mlegend"><div class="tmp-mleg-item"><span class="tmp-mleg-zone"></span> Zona conforme</div><div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#2D8653"></span> Dentro da faixa</div><div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#C0504D"></span> Fora da faixa</div></div></div>';
  }

  // FIX C: eixos 10px
  function initBloco2BCharts(leituras) {
    var pKeys = { m: 'mensal', s: 'semanas', d: 'dias' };
    ['balcao','resf','cong'].forEach(function(eqId) {
      var eq = leituras[eqId]; if (!eq) return;
      var iC = eqId === 'cong';
      var color = eqId === 'balcao' ? '#2D8653' : (eqId === 'resf' ? '#3670A0' : '#7153A0');
      var fMin = iC ? -30 : -2, fMax = iC ? -18 : 4;
      ['m','s','d'].forEach(function(per) {
        var canvas = document.getElementById('tmpL_' + eqId + '_' + per); if (!canvas) return;
        var serie = eq[pKeys[per]]; if (!serie || !serie.length) return;
        var labels = serie.map(function(x) { return x.label; });
        var vals   = serie.map(function(x) { return x.value; });
        function isOk(v) { return iC ? v <= -18 : (v >= 0 && v <= 4); }
        var ptC = vals.map(function(v) { return v !== null && isOk(v) ? color : '#C0504D'; });
        var allVals = vals.filter(function(v) { return v !== null; });
        var yPad = iC ? 4 : 2;
        var yMin = allVals.length ? Math.min(fMin - yPad, Math.min.apply(null, allVals) - yPad) : fMin - yPad;
        var yMax = allVals.length ? Math.max(fMax + yPad, Math.max.apply(null, allVals) + yPad) : fMax + yPad;
        var ch = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: { labels: labels, datasets: [
            { data: vals, borderColor: color, backgroundColor: 'transparent', borderWidth: 1.5, pointBackgroundColor: ptC, pointRadius: 3, pointHoverRadius: 5, tension: 0.3, spanGaps: true },
            { data: labels.map(function() { return fMin; }), borderColor: 'rgba(45,134,83,.3)', borderWidth: 1, borderDash: [3,2], pointRadius: 0, fill: false },
            { data: labels.map(function() { return fMax; }), borderColor: 'rgba(45,134,83,.3)', borderWidth: 1, borderDash: [3,2], pointRadius: 0, fill: '-1', backgroundColor: 'rgba(45,134,83,.06)' }
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) {
              if (ctx.datasetIndex > 0) return null;
              var v = ctx.parsed.y; return v !== null ? v.toFixed(1) + '°C ' + (isOk(v) ? '✓' : '⚠') : '';
            }}}},
            scales: {
              y: { min: yMin, max: yMax, grid: { color: 'rgba(0,0,0,.03)', drawBorder: false },
                ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280', callback: function(v) { return v + '°'; }, stepSize: iC ? 3 : 2, padding: 2 }, border: { display: false } },
              x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280', maxRotation: 0 }, border: { display: false } }
            },
            layout: { padding: { top: 2, bottom: 0, left: 0, right: 2 } }, animation: { duration: 400 }
          }
        });
        tmpCharts.push(ch);
      });
    });
  }

  // ── BLOCO 3: Mapa Conformidade ──
  function renderBloco3() {
    return '<div class="section-block heatmap anim d4"><div class="section-header"><span class="sh-dot" style="background:var(--orange)"></span> Mapa de Conformidade — Ultimos 15 dias <span class="sh-line"></span></div>' +
      '<div class="eq-pills" id="tmpBnPills"><span class="eq-pill active" data-eq="todos">Todos</span><span class="eq-pill" data-eq="balcao">Balcao</span><span class="eq-pill" data-eq="resf">Camara Resf.</span><span class="eq-pill" data-eq="cong">Camara Cong.</span></div>' +
      '<div class="tmp-bn-wrap"><table class="tmp-bn-table" id="tmpBnTable"></table></div>' +
      '<div class="tmp-bn-legend"><div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:var(--green)"></span> Conforme</div><div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:var(--red)"></span> Nao conforme</div><div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:#D1D5DB"></span> Sem dado</div></div></div>';
  }

  function renderBnTable(mapa, filter) {
    var tbl = document.getElementById('tmpBnTable'); if (!tbl) return;
    var h = '<thead><tr><th>Loja</th>';
    mapa.dates.forEach(function(d) { h += '<th>' + d + '</th>'; });
    h += '</tr></thead><tbody>';
    mapa.lojas.forEach(function(loja) {
      h += '<tr><td>' + loja.nome + '</td>';
      loja.cells.forEach(function(cell, ci) {
        var st = cell.status[filter] || 'NA';
        var cc = st === 'OK' ? 'tmp-cell-ok' : (st === 'NOK' ? 'tmp-cell-nok' : 'tmp-cell-na');
        var dc = st === 'OK' ? 'tmp-farol-ok' : (st === 'NOK' ? 'tmp-farol-nok' : 'tmp-farol-na');
        h += '<td class="' + cc + '"><span class="tmp-farol ' + dc + '" data-loja="' + loja.nome + '" data-ci="' + ci + '"></span></td>';
      });
      h += '</tr>';
    });
    h += '</tbody>'; tbl.innerHTML = h;
  }

  function attachBnTooltips(mapa) {
    var tooltip = document.getElementById('tmpTooltip');
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.id = 'tmpTooltip'; tooltip.className = 'tmp-bn-tooltip'; document.body.appendChild(tooltip); }
    document.querySelectorAll('.tmp-farol:not(.tmp-farol-na)').forEach(function(el) {
      el.addEventListener('mouseenter', function() {
        var lojaNome = this.getAttribute('data-loja'), ci = parseInt(this.getAttribute('data-ci'));
        var loja = mapa.lojas.find(function(l) { return l.nome === lojaNome; });
        if (!loja) return; var cell = loja.cells[ci]; if (!cell || !cell.temps) return;
        var bf = 'todos'; var ap = document.querySelector('#tmpBnPills .eq-pill.active'); if (ap) bf = ap.getAttribute('data-eq');
        var rows = '';
        function tr(lb, val, fl, dc) { if (val === null) return ''; var cls = fl === 'CONFORME' ? 'tmp-tt-ok' : 'tmp-tt-nok'; return '<div class="tmp-tt-row"><span class="tmp-tt-dot" style="background:' + dc + '"></span><span class="tmp-tt-label">' + lb + ':</span> <span class="tmp-tt-val ' + cls + '"><strong>' + val.toFixed(1) + '&deg;C</strong></span></div>'; }
        if (bf === 'todos' || bf === 'balcao') rows += tr('Balcao', cell.temps.balcao, cell.temps.fb, '#2D8653');
        if (bf === 'todos' || bf === 'resf')   rows += tr('Resf.', cell.temps.resf, cell.temps.fr, '#3670A0');
        if (bf === 'todos' || bf === 'cong')   rows += tr('Cong.', cell.temps.cong, cell.temps.fc, '#7153A0');
        tooltip.innerHTML = '<div class="tmp-tt-date"><strong>' + lojaNome + '</strong> &mdash; ' + mapa.dates[ci] + '</div>' + rows;
        tooltip.classList.add('show');
        var rect = this.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top  = (rect.top - tooltip.offsetHeight - 8) + 'px';
      });
      el.addEventListener('mouseleave', function() { var tt = document.getElementById('tmpTooltip'); if (tt) tt.classList.remove('show'); });
    });
  }

  // ── BLOCO 4: Ranking ──
  // FIX CRÍTICO: engine retorna ranking.total (não .rede), propriedades .pct e .delta (não .conf)
  function renderBloco4(ranking) {
    if (!ranking || !ranking.total || !ranking.lojas) return '';
    function barC(p) { return p >= 85 ? '#2D8653' : (p >= 70 ? '#C97B2C' : '#C0504D'); }
    function pctC(p) { return p >= 85 ? 'var(--green)' : (p >= 70 ? 'var(--orange)' : 'var(--red)'); }
    function varBadge(d) {
      var vc = d > 0 ? 'up' : (d < 0 ? 'down' : 'eq');
      var vt = d > 0 ? '&#9650; +' + d + 'p.p.' : (d < 0 ? '&#9660; ' + d + 'p.p.' : '=');
      return '<span class="tmp-rk-var ' + vc + '">' + vt + '</span>';
    }
    function barH(pct) { return '<div class="tmp-rk-bar-wrap"><div class="tmp-rk-bar" style="width:' + pct + '%;background:' + barC(pct) + '"></div></div>'; }
    function sep() { return '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>'; }

    var tot = ranking.total;
    var html = '<div class="section-block rank anim d5"><div class="section-header"><span class="sh-dot" style="background:#7153A0"></span> Ranking de Conformidade por Loja <span class="sh-line"></span></div>' +
      '<div class="tmp-rk-header"><div class="tmp-rk-grid"><div></div><div class="tmp-rk-col-h" style="text-align:left">Loja</div><div class="tmp-rk-col-h">Balcao Refrig.</div><div></div><div class="tmp-rk-col-h">Cam. Resfriados</div><div></div><div class="tmp-rk-col-h">Cam. Congelados</div></div></div>' +
      '<div class="tmp-rk-total-row"><div class="tmp-rk-data-row">' +
        '<div class="tmp-rk-pos" style="font-size:10px;color:#6B7280">REDE</div>' +
        '<div class="tmp-rk-loja" style="font-weight:700;color:var(--navy)">Total Rede</div>' +
        barH(tot.balcao.pct) + sep() +
        '<div class="tmp-rk-pct" style="color:' + pctC(tot.balcao.pct) + '">' + tot.balcao.pct + '%</div>' +
        sep() + varBadge(tot.balcao.delta) +
      '</div></div>';

    ranking.lojas.forEach(function(loja, i) {
      if (!loja.balcao) return;
      html += '<div class="tmp-rk-data-row">' +
        '<div class="tmp-rk-pos">' + (i+1) + '</div>' +
        '<div class="tmp-rk-loja">' + loja.nome + '</div>' +
        barH(loja.balcao.pct) + sep() +
        '<div class="tmp-rk-pct" style="color:' + pctC(loja.balcao.pct) + '">' + loja.balcao.pct + '%</div>' +
        sep() + varBadge(loja.balcao.delta) +
      '</div>';
    });

    return html + '</div>';
  }

  // ── Pills events ──
  function initPillEvents() {
    document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        tmpEqFilter = this.getAttribute('data-eq');
        initBloco2Charts(tmpData.tendenciaConf, tmpEqFilter);
      });
    });
    document.querySelectorAll('#tmpBnPills .eq-pill').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('#tmpBnPills .eq-pill').forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        renderBnTable(tmpData.mapaConf, this.getAttribute('data-eq'));
        attachBnTooltips(tmpData.mapaConf);
      });
    });
  }

  await loadData();

}); // end Router.register
