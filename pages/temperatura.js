// ============================================================
// NEXO Intelligence Web v2 — Pagina Temperatura (Cadeia do Frio)
// 5 Blocos: Termometros | Tendencia Conf | Leituras | Mapa | Ranking
// BLOCO 1 ATUALIZADO: barra minimalista + eixo + donut premium 80px
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

  // ── TOOLBAR + CONTENT SHELL ──
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
  if (filterEl) {
    filterEl.addEventListener('change', function() { currentLoja = this.value; loadData(); });
  }

  // ══════════════════════════════════════════════════════════════
  // LOAD DATA
  // ══════════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════════
  // RENDER ALL BLOCKS
  // ══════════════════════════════════════════════════════════════
  function renderAll(el) {
    var d = tmpData;
    var html = '';
    html += renderBloco1(d.termometros);
    html += renderBloco2();
    html += renderBloco2B(d.leituras);
    html += renderBloco3();
    html += renderBloco4(d.ranking);
    el.innerHTML = html;

    setTimeout(function() {
      initBloco1Donuts(d.termometros);
      initBloco2Charts(d.tendenciaConf, tmpEqFilter);
      initBloco2BCharts(d.leituras);
      renderBnTable(d.mapaConf, 'todos');
      attachBnTooltips(d.mapaConf);
      initPillEvents();
    }, 50);
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 1 — TERMOMETROS (APROVADO)
  // Barra minimalista + eixo discreto + marcações zona conforme
  // ══════════════════════════════════════════════════════════════

  function thermoBar(eq) {
    var iC = eq.id === 'cong';
    var fMin = iC ? -28 : -1, fMax = iC ? -10 : 9;
    var confMin = iC ? -22 : 0, confMax = iC ? -18 : 4;
    var rangeMinLbl = iC ? '-25°' : '0°', rangeMaxLbl = iC ? '-15°' : '8°';
    var confMinLbl  = iC ? '-22°' : '0°', confMaxLbl  = iC ? '-18°' : '4°';

    var temp  = eq.temp !== null ? eq.temp : (confMin + confMax) / 2;
    var range = fMax - fMin;
    var pct      = Math.max(3, Math.min(96, ((temp    - fMin) / range) * 100));
    var zoneBot  = Math.max(0, ((confMin - fMin) / range) * 100);
    var zoneH    = Math.max(0, ((confMax - confMin) / range) * 100);
    var ok       = temp >= confMin && temp <= confMax;
    var barColor = ok ? '#4ADE80' : '#F87171';

    return (
      '<div style="display:flex;align-items:stretch;gap:4px;margin:10px auto 8px;justify-content:center;">' +
        // Eixo esquerdo: range total
        '<div style="display:flex;flex-direction:column;justify-content:space-between;height:90px;align-items:flex-end;">' +
          '<span style="font-size:8px;font-weight:500;color:rgba(255,255,255,.25);line-height:1;white-space:nowrap;">' + rangeMaxLbl + '</span>' +
          '<span style="font-size:8px;font-weight:500;color:rgba(255,255,255,.25);line-height:1;white-space:nowrap;">' + rangeMinLbl + '</span>' +
        '</div>' +
        // Barra com marcações zona conforme
        '<div style="position:relative;width:8px;height:90px;background:rgba(255,255,255,.08);border-radius:4px;overflow:visible;flex-shrink:0;">' +
          '<div style="position:absolute;left:0;right:0;bottom:' + zoneBot + '%;height:' + zoneH + '%;background:rgba(255,255,255,.15);border-radius:3px;overflow:hidden;"></div>' +
          '<div style="position:absolute;left:0;right:0;bottom:0;height:' + pct + '%;background:linear-gradient(to top,' + barColor + 'cc,' + barColor + '77);border-radius:4px;box-shadow:0 0 6px ' + barColor + '44;"></div>' +
          '<div style="position:absolute;left:-3px;right:-3px;bottom:' + (zoneBot + zoneH) + '%;height:1px;background:rgba(255,255,255,.35);"></div>' +
          '<div style="position:absolute;left:-3px;right:-3px;bottom:' + zoneBot + '%;height:1px;background:rgba(255,255,255,.35);"></div>' +
        '</div>' +
        // Eixo direito: marcações zona conforme
        '<div style="position:relative;height:90px;width:22px;">' +
          '<span style="position:absolute;bottom:' + (zoneBot + zoneH) + '%;transform:translateY(50%);font-size:7px;font-weight:700;color:rgba(255,255,255,.5);white-space:nowrap;line-height:1;left:2px;">' + confMaxLbl + '</span>' +
          '<span style="position:absolute;bottom:' + zoneBot + '%;transform:translateY(50%);font-size:7px;font-weight:700;color:rgba(255,255,255,.5);white-space:nowrap;line-height:1;left:2px;">' + confMinLbl + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderBloco1(termos) {
    var html = '<div class="section-block frost anim d1">' +
      '<div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Temperatura Media por Equipamento <span class="sh-line"></span></div>' +
      '<div class="tmp-thermo-row">';

    termos.forEach(function(eq) {
      var iC = eq.id === 'cong';
      var confMin = iC ? -22 : 0, confMax = iC ? -18 : 4;
      var ok = eq.temp !== null && eq.temp >= confMin && eq.temp <= confMax;
      var bigCls = eq.temp === null ? '' : (ok ? 'ok' : 'danger');
      var d = eq.delta;
      var vc, vt;
      if (d === 0 || eq.temp === null) { vc = 'stable'; vt = '= 0&deg;C'; }
      else if (iC) { vc = d < 0 ? 'down-good' : 'up'; vt = (d > 0 ? '&#9650; +' : '&#9660; ') + d + '&deg;C'; }
      else         { vc = d > 0 ? 'up' : 'down-good'; vt = (d > 0 ? '&#9650; +' : '&#9660; ') + d + '&deg;C'; }
      var faixaText   = iC ? '&le; -18&deg;C' : '0&deg;C a 4&deg;C';
      var tempDisplay = eq.temp !== null ? eq.temp : '--';
      var dcc = eq.confPct >= 90 ? '#2D8653' : (eq.confPct >= 70 ? '#C97B2C' : '#C0504D');

      html +=
        '<div class="tmp-tc ' + eq.id + '">' +
          '<div class="tmp-tc-thermo">' +
            '<div class="tmp-tc-label">' + eq.label + '</div>' +
            '<span class="tmp-tc-faixa">' + faixaText + '</span>' +
            thermoBar(eq) +
            '<div class="tmp-tc-big ' + bigCls + '"><strong>' + tempDisplay + '</strong><span class="tmp-tc-unit">&deg;C</span></div>' +
          '</div>' +
          '<div class="tmp-tc-divider"></div>' +
          '<div class="tmp-tc-metrics">' +
            '<div class="tmp-tc-comp">' +
              '<div class="tmp-tc-comp-label">vs periodo anterior</div>' +
              '<div class="tmp-tc-comp-val ' + vc + '">' + vt + '</div>' +
            '</div>' +
            '<div class="tmp-tc-conf">' +
              '<div class="tmp-tc-donut-wrap">' +
                '<canvas id="tmpDn_' + eq.id + '"></canvas>' +
                '<span class="tmp-tc-donut-center" style="color:' + dcc + '">' + eq.confPct + '%</span>' +
              '</div>' +
              '<div class="tmp-tc-conf-meta">' +
                '<span class="tmp-tc-conf-label">Conformidade</span>' +
                '<span class="tmp-tc-conf-detail">' + eq.confOk + ' de ' + eq.confTotal + ' leituras</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    html += '</div></div>';
    return html;
  }

  // Donut premium: 80px, anel fino 4px, lineCap butt, dot 12h, retina
  function initBloco1Donuts(termos) {
    var dpr = window.devicePixelRatio || 1;
    var size = 80;
    termos.forEach(function(eq) {
      var c = document.getElementById('tmpDn_' + eq.id); if (!c) return;
      c.width  = size * dpr; c.height = size * dpr;
      c.style.width = size + 'px'; c.style.height = size + 'px';
      var ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); ctx.scale(dpr, dpr);
      var cx = size / 2, cy = size / 2, r = size / 2 - 6, lw = 4;
      var color = eq.confPct >= 90 ? '#2D8653' : (eq.confPct >= 70 ? '#C97B2C' : '#C0504D');
      // track
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = lw; ctx.stroke();
      // arco progresso
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (eq.confPct / 100) * Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.stroke();
      // dot 12h
      ctx.beginPath(); ctx.arc(cx, cy - r, lw / 2, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 2 — TENDENCIA CONFORMIDADE
  // ══════════════════════════════════════════════════════════════
  function renderBloco2() {
    return '<div class="section-block trend anim d2">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--blue)"></span> Tendencia de Conformidade <span class="sh-line"></span></div>' +
      '<div class="eq-pills" id="tmpTrendPills">' +
        '<span class="eq-pill active" data-eq="todos" data-target="trend">Todos</span>' +
        '<span class="eq-pill" data-eq="balcao" data-target="trend">Balcao</span>' +
        '<span class="eq-pill" data-eq="resf" data-target="trend">Camara Resf.</span>' +
        '<span class="eq-pill" data-eq="cong" data-target="trend">Camara Cong.</span>' +
      '</div>' +
      '<div class="tmp-trend-grid">' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Conformidade Mensal</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn1"></span><span class="tmp-trc-var" id="tmpVar1"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh1"></canvas></div><table class="tmp-trc-tbl" id="tmpTb1"></table></div>' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Ultimas 8 Semanas</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn2"></span><span class="tmp-trc-var" id="tmpVar2"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh2"></canvas></div><table class="tmp-trc-tbl" id="tmpTb2"></table></div>' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Ultimos 7 Dias</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn3"></span><span class="tmp-trc-var" id="tmpVar3"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh3"></canvas></div><table class="tmp-trc-tbl" id="tmpTb3"></table></div>' +
      '</div></div>';
  }

  function trendColor(eq) {
    if (eq === 'balcao') return { l: '#2D8653', f: 'rgba(45,134,83,.12)' };
    if (eq === 'resf')   return { l: '#3670A0', f: 'rgba(54,112,160,.12)' };
    if (eq === 'cong')   return { l: '#7153A0', f: 'rgba(113,83,160,.12)' };
    return { l: '#2D8653', f: 'rgba(45,134,83,.12)' };
  }

  function initBloco2Charts(tendencia, eq) {
    var t = tendencia[eq]; if (!t) return;
    var c = trendColor(eq);
    var sets = [
      { data: t.mensal,  chId: 'tmpCh1', bnId: 'tmpBn1', varId: 'tmpVar1', tblId: 'tmpTb1' },
      { data: t.semanas, chId: 'tmpCh2', bnId: 'tmpBn2', varId: 'tmpVar2', tblId: 'tmpTb2' },
      { data: t.dias,    chId: 'tmpCh3', bnId: 'tmpBn3', varId: 'tmpVar3', tblId: 'tmpTb3' }
    ];
    sets.forEach(function(s) {
      var d = s.data; if (!d || !d.length) return;
      var last = d[d.length - 1].conf;
      var prev = d.length >= 2 ? d[d.length - 2].conf : last;
      var delta = last - prev;
      var cls = last >= 85 ? 'ok' : (last >= 70 ? 'warn' : 'danger');
      var bnEl = document.getElementById(s.bnId);
      if (bnEl) { bnEl.textContent = last + '%'; bnEl.className = 'tmp-trc-bn ' + cls; }
      var varEl = document.getElementById(s.varId);
      if (varEl) {
        var vc = delta > 0 ? 'down-good' : (delta < 0 ? 'up-bad' : 'stable');
        var vt = delta > 0 ? '&#9650; +' + delta + ' p.p.' : (delta < 0 ? '&#9660; ' + delta + ' p.p.' : '= 0 p.p.');
        varEl.innerHTML = vt; varEl.className = 'tmp-trc-var ' + vc;
      }
      var canvas = document.getElementById(s.chId); if (!canvas) return;
      var labels = d.map(function(x) { return x.label; });
      var vals   = d.map(function(x) { return x.conf; });
      var ptColors = vals.map(function(v) { return v >= 85 ? c.l : (v >= 70 ? '#C97B2C' : '#C0504D'); });
      var ch = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: [{ data: vals, borderColor: c.l, backgroundColor: c.f, borderWidth: 2, pointBackgroundColor: ptColors, pointRadius: 4, pointHoverRadius: 6, tension: 0.35, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.parsed.y + '% conformidade'; } }, backgroundColor: 'rgba(12,20,37,.9)', bodyFont: { family: 'Outfit', size: 12 }, padding: 8, cornerRadius: 6 } },
          scales: {
            y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,.03)', drawBorder: false }, ticks: { font: { size: 9, family: 'Outfit', weight: '600' }, color: '#6B7280', callback: function(v) { return v + '%'; }, stepSize: 25, padding: 2 }, border: { display: false } },
            x: { grid: { display: false }, ticks: { font: { size: 8, family: 'Outfit', weight: '600' }, color: '#6B7280', maxRotation: 0 }, border: { display: false } }
          },
          layout: { padding: { top: 2, bottom: 0, left: 0, right: 2 } }, animation: { duration: 400 }
        }
      });
      tmpCharts.push(ch);
      var tbl = document.getElementById(s.tblId); if (!tbl) return;
      var th = '<tr><td style="color:var(--t3);font-weight:600;font-size:9px">LEIT</td>';
      d.forEach(function(x) { th += '<td>' + x.leit + '</td>'; });
      th += '</tr><tr><td style="color:var(--t3);font-weight:600;font-size:9px">CONF</td>';
      d.forEach(function(x) { var cc = x.conf >= 85 ? 'var(--green)' : (x.conf >= 70 ? 'var(--orange)' : 'var(--red)'); th += '<td style="color:' + cc + ';font-weight:700"><strong>' + x.conf + '%</strong></td>'; });
      th += '</tr><tr><td style="color:var(--t3);font-weight:600;font-size:9px">VAR %</td>';
      d.forEach(function(x) {
        if (x.confAnt === null) { th += '<td class="v-eq">=</td>'; }
        else { var dv = x.conf - x.confAnt; if (dv === 0) th += '<td class="v-eq">=</td>'; else if (dv > 0) th += '<td class="v-down"><strong>&#9650; ' + dv + '%</strong></td>'; else th += '<td class="v-up"><strong>&#9660; ' + Math.abs(dv) + '%</strong></td>'; }
      });
      th += '</tr>'; tbl.innerHTML = th;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 2B — LEITURAS (MATRIX)
  // ══════════════════════════════════════════════════════════════
  function renderBloco2B(leituras) {
    var equips = [
      { id: 'balcao', nome: 'Balcao Refrig.', faixa: '0°C a 4°C', color: '#2D8653' },
      { id: 'resf',   nome: 'Camara Resf.',   faixa: '0°C a 4°C', color: '#3670A0' },
      { id: 'cong',   nome: 'Camara Cong.',   faixa: '&#8804; -18°C', color: '#7153A0' }
    ];
    var html = '<div class="section-block leit anim d3">' +
      '<div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Leituras de Temperatura <span class="sh-line"></span></div>' +
      '<div class="tmp-matrix">' +
      '<div class="tmp-mcol-sp"></div><div class="tmp-mcol-h">Media Mensal</div><div class="tmp-mcol-h">Ultimas 8 Semanas</div><div class="tmp-mcol-h">Ultimos 7 Dias</div>';
    equips.forEach(function(eq, ei) {
      var isLast = ei === equips.length - 1;
      var lastCls = isLast ? ' last' : '';
      html += '<div class="tmp-mrow-label">' +
        '<div class="tmp-mrl-name"><span class="tmp-mrl-dot" style="background:' + eq.color + '"></span> ' + eq.nome + '</div>' +
        '<div class="tmp-mrl-faixa">' + eq.faixa + '</div></div>';
      ['m', 's', 'd'].forEach(function(per) {
        html += '<div class="tmp-mcell' + lastCls + '"><div class="tmp-mcell-inner"><canvas id="tmpL_' + eq.id + '_' + per + '"></canvas></div></div>';
      });
    });
    html += '</div><div class="tmp-mlegend">' +
      '<div class="tmp-mleg-item"><span class="tmp-mleg-zone"></span> Zona conforme</div>' +
      '<div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#2D8653"></span> Dentro da faixa</div>' +
      '<div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#C0504D"></span> Fora da faixa</div></div></div>';
    return html;
  }

  function initBloco2BCharts(leituras) {
    var periods = { m: 'mensal', s: 'semanas', d: 'dias' };
    ['balcao', 'resf', 'cong'].forEach(function(eqId) {
      var eq = leituras[eqId]; if (!eq) return;
      var iC = eqId === 'cong';
      var color = eqId === 'balcao' ? '#2D8653' : (eqId === 'resf' ? '#3670A0' : '#7153A0');
      var fMin = iC ? -30 : -2, fMax = iC ? -18 : 4;
      ['m', 's', 'd'].forEach(function(per) {
        var canvas = document.getElementById('tmpL_' + eqId + '_' + per); if (!canvas) return;
        var serie = eq[periods[per]]; if (!serie || !serie.length) return;
        var labels = serie.map(function(x) { return x.label; });
        var vals   = serie.map(function(x) { return x.value; });
        function isOk(v) { return iC ? v <= -18 : (v >= 0 && v <= 4); }
        var ptColors = vals.map(function(v) { return v !== null && isOk(v) ? color : '#C0504D'; });
        var allVals = vals.filter(function(v) { return v !== null; });
        var yPad = iC ? 4 : 2;
        var yMin = allVals.length ? Math.min(fMin - yPad, Math.min.apply(null, allVals) - yPad) : fMin - yPad;
        var yMax = allVals.length ? Math.max(fMax + yPad, Math.max.apply(null, allVals) + yPad) : fMax + yPad;
        var ch = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: { labels: labels, datasets: [
            { data: vals, borderColor: color, backgroundColor: 'transparent', borderWidth: 1.5, pointBackgroundColor: ptColors, pointRadius: 3, pointHoverRadius: 5, tension: 0.3, spanGaps: true },
            { data: labels.map(function() { return fMin; }), borderColor: 'rgba(45,134,83,.3)', borderWidth: 1, borderDash: [3,2], pointRadius: 0, fill: false },
            { data: labels.map(function() { return fMax; }), borderColor: 'rgba(45,134,83,.3)', borderWidth: 1, borderDash: [3,2], pointRadius: 0, fill: '-1', backgroundColor: 'rgba(45,134,83,.06)' }
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) {
              if (ctx.datasetIndex > 0) return null;
              var v = ctx.parsed.y; return v !== null ? v.toFixed(1) + '°C ' + (isOk(v) ? '✓' : '⚠') : '';
            }}}},
            scales: {
              y: { min: yMin, max: yMax, grid: { color: 'rgba(0,0,0,.03)', drawBorder: false }, ticks: { font: { size: 9, family: 'Outfit', weight: '600' }, color: '#6B7280', callback: function(v) { return v + '°'; }, stepSize: iC ? 3 : 2, padding: 2 }, border: { display: false } },
              x: { grid: { display: false }, ticks: { font: { size: 8, family: 'Outfit', weight: '600' }, color: '#6B7280', maxRotation: 0 }, border: { display: false } }
            },
            layout: { padding: { top: 2, bottom: 0, left: 0, right: 2 } }, animation: { duration: 400 }
          }
        });
        tmpCharts.push(ch);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 3 — MAPA CONFORMIDADE
  // ══════════════════════════════════════════════════════════════
  function renderBloco3() {
    return '<div class="section-block heatmap anim d4">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--orange)"></span> Mapa de Conformidade — Ultimos 15 dias <span class="sh-line"></span></div>' +
      '<div class="eq-pills" id="tmpBnPills">' +
        '<span class="eq-pill active" data-eq="todos" data-target="mapa">Todos</span>' +
        '<span class="eq-pill" data-eq="balcao" data-target="mapa">Balcao</span>' +
        '<span class="eq-pill" data-eq="resf" data-target="mapa">Camara Resf.</span>' +
        '<span class="eq-pill" data-eq="cong" data-target="mapa">Camara Cong.</span>' +
      '</div>' +
      '<div class="tmp-bn-wrap"><table class="tmp-bn-table" id="tmpBnTable"></table></div>' +
      '<div class="tmp-bn-legend">' +
        '<div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:var(--green)"></span> Conforme</div>' +
        '<div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:var(--red)"></span> Nao conforme</div>' +
        '<div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:#D1D5DB"></span> Sem dado</div>' +
      '</div></div>';
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
      el.addEventListener('mouseenter', function(e) {
        var lojaNome = this.getAttribute('data-loja');
        var ci = parseInt(this.getAttribute('data-ci'));
        var loja = mapa.lojas.find(function(l) { return l.nome === lojaNome; });
        if (!loja) return; var cell = loja.cells[ci]; if (!cell || !cell.temps) return;
        var bf = 'todos'; var ap = document.querySelector('#tmpBnPills .eq-pill.active'); if (ap) bf = ap.getAttribute('data-eq');
        var rows = '';
        function tr(lb, val, fl, dc) { if (val === null) return ''; var cls = fl === 'CONFORME' ? 'tmp-tt-ok' : 'tmp-tt-nok'; return '<div class="tmp-tt-row"><span class="tmp-tt-dot" style="background:' + dc + '"></span><span class="tmp-tt-label">' + lb + ':</span> <span class="tmp-tt-val ' + cls + '"><strong>' + val.toFixed(1) + '°C</strong></span> <span style="font-size:9px">' + (fl === 'CONFORME' ? '✓' : '⚠') + '</span></div>'; }
        if (bf === 'todos' || bf === 'balcao') rows += tr('Balcao', cell.temps.balcao, cell.temps.fb, '#2D8653');
        if (bf === 'todos' || bf === 'resf')   rows += tr('Resf.', cell.temps.resf, cell.temps.fr, '#3670A0');
        if (bf === 'todos' || bf === 'cong')   rows += tr('Cong.', cell.temps.cong, cell.temps.fc, '#7153A0');
        tooltip.innerHTML = '<div class="tmp-tt-date"><strong>' + lojaNome + '</strong> — ' + mapa.dates[ci] + '</div>' + rows;
        tooltip.classList.add('show');
        var rect = this.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top  = (rect.top - tooltip.offsetHeight - 8) + 'px';
      });
      el.addEventListener('mouseleave', function() { var tt = document.getElementById('tmpTooltip'); if (tt) tt.classList.remove('show'); });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 4 — RANKING
  // ══════════════════════════════════════════════════════════════
  function renderBloco4(ranking) {
    function barC(p) { return p >= 85 ? '#2D8653' : (p >= 70 ? '#C97B2C' : '#C0504D'); }
    function pctC(p) { return p >= 85 ? 'var(--green)' : (p >= 70 ? 'var(--orange)' : 'var(--red)'); }
    function eqB(d) {
      var v = d.delta; var vc = v > 0 ? 'up' : (v < 0 ? 'down' : 'eq');
      var vt = v > 0 ? '&#9650; +' + v + ' p.p.' : (v < 0 ? '&#9660; ' + v + ' p.p.' : '= 0 p.p.');
      return '<div class="tmp-rk-eq"><div class="tmp-rk-bar-wrap"><div class="tmp-rk-bar-fill" style="width:' + d.pct + '%;background:' + barC(d.pct) + '"></div></div>' +
        '<span class="tmp-rk-pct" style="color:' + pctC(d.pct) + '"><strong>' + d.pct + '%</strong></span>' +
        '<span class="tmp-rk-var ' + vc + '">' + vt + '</span></div>';
    }
    function sepC() { return '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>'; }

    var html = '<div class="section-block ranking anim d5">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--gold)"></span> Ranking de Conformidade por Loja <span class="sh-line"></span></div>' +
      '<div class="tmp-rk-grid">' +
        '<div class="tmp-rk-col-head tmp-rk-col-head-left">#</div><div class="tmp-rk-col-head tmp-rk-col-head-left">Loja</div>' +
        '<div class="tmp-rk-col-head"><span class="tmp-rk-eq-dot" style="background:#2D8653"></span> Balcao</div><div class="tmp-rk-col-sep"></div>' +
        '<div class="tmp-rk-col-head"><span class="tmp-rk-eq-dot" style="background:#3670A0"></span> Camara Resf.</div><div class="tmp-rk-col-sep"></div>' +
        '<div class="tmp-rk-col-head"><span class="tmp-rk-eq-dot" style="background:#7153A0"></span> Camara Cong.</div>' +
        '<div class="tmp-rk-divider"></div></div>' +
      '<div class="tmp-rk-total-row"><div class="tmp-rk-total-label"><strong>TOTAL REDE</strong></div>' +
        eqB(ranking.total.balcao) + sepC() + eqB(ranking.total.resf) + sepC() + eqB(ranking.total.cong) + '</div>';

    ranking.lojas.forEach(function(l, i) {
      html += '<div class="tmp-rk-data-row"><div class="tmp-rk-pos">' + (i + 1) + '</div><div class="tmp-rk-loja">' + l.nome + '</div>' +
        eqB(l.balcao) + sepC() + eqB(l.resf) + sepC() + eqB(l.cong) + '</div>';
    });
    html += '</div>';
    return html;
  }

  // ══════════════════════════════════════════════════════════════
  // PILL EVENTS
  // ══════════════════════════════════════════════════════════════
  function initPillEvents() {
    document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        tmpEqFilter = this.getAttribute('data-eq');
        tmpCharts = tmpCharts.filter(function(c) { return true; });
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

  // ── KICK OFF ──
  await loadData();

}); // end Router.register
