// ============================================================
// NEXO Intelligence Web v2 — Pagina Temperatura (Cadeia do Frio)
// 5 Blocos: Termometros | Tendencia Conf | Leituras | Mapa | Ranking
// PATCH v3: Fixes C (eixos 10px) H (donuts retina) I (shimmer)
//           J (padding gráfico x tabela) K (filtro loja) L (filtro período)
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

  // ── INIT FILTERS ──
  var lojas = await API.getLojas(window.NEXO_REDE_ID);
  UI.populateLojaFilter('filterLojaTemp', lojas);

  // FIX L: initPeriodPills re-dispara loadData corretamente
  UI.initPeriodPills(function(days) {
    currentPeriod = days;
    loadData();
  });

  // FIX K: filtro de loja passa lojaId para loadData
  var filterEl = document.getElementById('filterLojaTemp');
  if (filterEl) {
    filterEl.addEventListener('change', function() {
      currentLoja = this.value;
      loadData();
    });
  }

  // ══════════════════════════════════════════════════════════════
  // LOAD DATA — FIX K: passa lojaId como filtro real para a API
  // ══════════════════════════════════════════════════════════════
  async function loadData() {
    var contentEl = document.getElementById('tempContent');
    if (!contentEl) return;
    contentEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Carregando temperatura...</span></div>';
    destroyCharts(); // FIX L: destrói charts antes de re-renderizar

    try {
      // FIX K: monta filtros incluindo lojaId quando selecionado
      var filters = {};
      if (currentLoja && currentLoja !== 'all') {
        filters.lojaId = currentLoja;
      }

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
  // BLOCO 1 — TERMOMETROS
  // ══════════════════════════════════════════════════════════════
  function thermoSVG(eq) {
    var iC = eq.id === 'cong';
    var ok = iC ? (eq.temp !== null && eq.temp <= -18) : (eq.temp !== null && eq.temp >= 0 && eq.temp <= 4);
    var grads = { balcao: ['#86EFAC','#22C55E','#16A34A'], resf: ['#93C5FD','#3B82F6','#2563EB'], cong: ['#C4B5FD','#8B5CF6','#6D28D9'] };
    var g = grads[eq.id] || grads.balcao;
    var gid = 'gr_' + eq.id;
    var tH = 72, tT = 6;
    var fP;
    if (iC) { fP = eq.temp !== null ? Math.max(8, Math.min(92, ((eq.temp - (-30)) / ((-5) - (-30))) * 100)) : 50; }
    else { fP = eq.temp !== null ? Math.max(8, Math.min(92, ((eq.temp - (-2)) / (10 - (-2))) * 100)) : 50; }
    var mT = tT + tH - (fP / 100) * tH;
    var zT, zB;
    if (iC) { zT = tT + tH - (((-18) - (-30)) / ((-5) - (-30))) * tH; zB = tT + tH; }
    else { zT = tT + tH - ((4 - (-2)) / (10 - (-2))) * tH; zB = tT + tH - ((0 - (-2)) / (10 - (-2))) * tH; }
    var mc = ok ? 'url(#' + gid + ')' : '#C0504D';

    var s = '<svg viewBox="0 0 44 105" width="44" height="88" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0%" stop-color="' + g[2] + '"/><stop offset="50%" stop-color="' + g[1] + '"/><stop offset="100%" stop-color="' + g[0] + '"/></linearGradient></defs>' +
      '<rect x="15" y="' + tT + '" width="14" height="' + tH + '" rx="7" fill="#E5E7EB" opacity=".7"/>' +
      '<rect x="16" y="' + (tT + 1) + '" width="12" height="' + (tH - 2) + '" rx="6" fill="#F3F4F6"/>' +
      '<rect x="16" y="' + zT + '" width="12" height="' + Math.max(1, zB - zT) + '" fill="rgba(45,134,83,.08)"/>' +
      '<line x1="10" y1="' + zT + '" x2="16" y2="' + zT + '" stroke="' + g[1] + '" stroke-width=".8" stroke-dasharray="1.5,1"/>';
    if (!iC) s += '<line x1="10" y1="' + zB + '" x2="16" y2="' + zB + '" stroke="' + g[1] + '" stroke-width=".8" stroke-dasharray="1.5,1"/>';
    s += '<rect x="17" y="' + mT + '" width="10" height="' + (tT + tH - mT) + '" rx="5" fill="' + mc + '"/>' +
      '<rect x="18" y="' + (mT + 2) + '" width="3" height="' + Math.max(4, (tT + tH - mT) * 0.6) + '" rx="1.5" fill="rgba(255,255,255,.35)"/>';
    var bY = tT + tH + 8;
    s += '<circle cx="22" cy="' + bY + '" r="11" fill="' + mc + '" opacity=".15"/><circle cx="22" cy="' + bY + '" r="8" fill="' + mc + '"/>' +
      '<circle cx="20" cy="' + (bY - 2) + '" r="2.5" fill="rgba(255,255,255,.25)"/>' +
      '<ellipse cx="22" cy="' + tT + '" rx="5" ry="2.5" fill="#D1D5DB"/></svg>';
    return s;
  }

  function renderBloco1(termos) {
    var html = '<div class="section-block frost anim d1">' +
      '<div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Temperatura Media por Equipamento <span class="sh-line"></span></div>' +
      '<div class="tmp-thermo-row">';

    termos.forEach(function(eq) {
      var iC = eq.id === 'cong';
      var ok = iC ? (eq.temp !== null && eq.temp <= -18) : (eq.temp !== null && eq.temp >= 0 && eq.temp <= 4);
      var bigCls = eq.temp === null ? '' : (ok ? 'ok' : 'danger');
      var d = eq.delta;
      var vc, vt, arrow;
      if (d === 0 || eq.temp === null) { vc = 'stable'; vt = '0&deg;C'; arrow = '='; }
      else if (iC) { vc = d < 0 ? 'down-good' : 'up'; vt = (d > 0 ? '+' : '') + d + '&deg;C'; arrow = d > 0 ? '&#9650;' : '&#9660;'; }
      else { vc = d > 0 ? 'up' : 'down-good'; vt = (d > 0 ? '+' : '') + d + '&deg;C'; arrow = d > 0 ? '&#9650;' : '&#9660;'; }
      var confCls = eq.confPct >= 85 ? 'ok' : (eq.confPct >= 70 ? 'warn' : 'danger');
      html +=
        '<div class="tmp-tc ' + eq.id + '">' +
          '<div class="tmp-tc-thermo">' +
            '<div class="tmp-tc-label">' + eq.label + '</div>' +
            thermoSVG(eq) +
            '<div class="tmp-tc-big ' + bigCls + '">' + (eq.temp !== null ? eq.temp : '--') + '<span class="tmp-tc-unit">&deg;C</span></div>' +
            '<span class="tmp-tc-faixa">' + eq.faixa + '&deg;C</span>' +
          '</div>' +
          '<div class="tmp-tc-divider"></div>' +
          '<div class="tmp-tc-metrics">' +
            '<div class="tmp-tc-comp">' +
              '<div><div class="tmp-tc-comp-label">Vs. per. ant.</div>' +
              '<div class="tmp-tc-comp-val ' + vc + '">' + arrow + ' ' + vt + '</div></div>' +
            '</div>' +
            '<div class="tmp-tc-conf">' +
              '<div class="tmp-tc-donut-wrap"><canvas id="donut_' + eq.id + '"></canvas>' +
              '<div class="tmp-tc-donut-center" style="color:' + (eq.confPct >= 85 ? 'var(--green)' : (eq.confPct >= 70 ? 'var(--orange)' : 'var(--red)')) + '">' + eq.confPct + '%</div></div>' +
              '<div class="tmp-tc-conf-meta">' +
                '<div class="tmp-tc-conf-label">Conformidade</div>' +
                '<div class="tmp-tc-conf-detail">' + eq.confOk + '/' + eq.confTotal + ' leituras</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    html += '</div></div>';
    return html;
  }

  // FIX H: donuts com devicePixelRatio para retina
  function initBloco1Donuts(termos) {
    var dpr = window.devicePixelRatio || 1;
    termos.forEach(function(eq) {
      var wrap = document.querySelector('.tmp-tc.' + eq.id + ' .tmp-tc-donut-wrap');
      var canvas = document.getElementById('donut_' + eq.id);
      if (!canvas) return;
      var size = 48;
      canvas.width  = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width  = size + 'px';
      canvas.style.height = size + 'px';
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      var cx = size / 2, cy = size / 2, r = 18, lw = 5;
      var color = eq.confPct >= 85 ? '#2D8653' : (eq.confPct >= 70 ? '#C97B2C' : '#C0504D');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (eq.confPct / 100) * Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
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

  // FIX L: ao trocar pill, destrói somente os charts de trend e recria
  function initBloco2Charts(tendencia, eq) {
    // Destrói apenas charts de trend (ids tmpCh1/2/3)
    tmpCharts = tmpCharts.filter(function(c) {
      var canvas = c.canvas;
      if (canvas && (canvas.id === 'tmpCh1' || canvas.id === 'tmpCh2' || canvas.id === 'tmpCh3')) {
        c.destroy(); return false;
      }
      return true;
    });

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
        var vt = delta > 0 ? '&#9650; ' + delta + ' p.p.' : (delta < 0 ? '&#9660; ' + Math.abs(delta) + ' p.p.' : '= 0 p.p.');
        varEl.innerHTML = vt; varEl.className = 'tmp-trc-var ' + vc;
      }
      var canvas = document.getElementById(s.chId); if (!canvas) return;
      var labels = d.map(function(x) { return x.label; });
      var vals   = d.map(function(x) { return x.conf; });
      var ptColors = vals.map(function(v) { return v >= 85 ? c.l : (v >= 70 ? '#C97B2C' : '#C0504D'); });
      // FIX J: paddingLeft do gráfico alinhado com primeira coluna da tabela (52px = width td:first-child)
      var ch = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{ data: vals, borderColor: c.l, backgroundColor: c.f, borderWidth: 2,
            pointBackgroundColor: ptColors, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.35, fill: true }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: function(ctx) { return ctx.parsed.y + '% conformidade'; } },
              backgroundColor: 'rgba(12,20,37,.9)', titleFont: { family: 'Outfit', size: 12 },
              bodyFont: { family: 'Outfit', size: 12 }, padding: 8, cornerRadius: 6
            },
            datalabels: { display: false }
          },
          scales: {
            y: {
              min: 0, max: 100,
              grid: { color: 'rgba(0,0,0,.03)', drawBorder: false },
              ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280',
                       callback: function(v) { return v + '%'; }, stepSize: 25, padding: 4 },
              border: { display: false }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280', maxRotation: 0 },
              border: { display: false }
            }
          },
          // FIX J: padding left alinhado com width da coluna label da tabela
          layout: { padding: { top: 2, bottom: 0, left: 0, right: 4 } },
          animation: { duration: 400 }
        }
      });
      tmpCharts.push(ch);

      // FIX B: preencher tabela com fontes corretas
      var tbl = document.getElementById(s.tblId); if (!tbl) return;
      var th = '<tr><td style="color:var(--t3);font-weight:700;font-size:11px">LEIT</td>';
      d.forEach(function(x) { th += '<td style="color:#374151;font-size:12px">' + x.leit + '</td>'; });
      th += '</tr><tr><td style="color:var(--t3);font-weight:700;font-size:11px">CONF</td>';
      d.forEach(function(x) {
        var cc = x.conf >= 85 ? 'var(--green)' : (x.conf >= 70 ? 'var(--orange)' : 'var(--red)');
        th += '<td style="color:' + cc + ';font-weight:700;font-size:12px"><strong>' + x.conf + '%</strong></td>';
      });
      th += '</tr><tr><td style="color:var(--t3);font-weight:700;font-size:11px">VAR</td>';
      d.forEach(function(x) {
        if (x.confAnt === null) { th += '<td class="v-eq" style="font-size:11px">=</td>'; }
        else { var dv = x.conf - x.confAnt;
          if (dv === 0) th += '<td class="v-eq" style="font-size:11px">=</td>';
          else if (dv > 0) th += '<td class="v-down" style="font-size:11px"><strong>&#9650;' + dv + '%</strong></td>';
          else th += '<td class="v-up" style="font-size:11px"><strong>&#9660;' + Math.abs(dv) + '%</strong></td>';
        }
      });
      th += '</tr>'; tbl.innerHTML = th;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 2B — LEITURAS (MATRIX)
  // ══════════════════════════════════════════════════════════════
  function renderBloco2B(leituras) {
    var equips = [
      { id: 'balcao', nome: 'Balcao Refrig.', faixa: '0&deg;C a 4&deg;C',    color: '#2D8653' },
      { id: 'resf',   nome: 'Camara Resf.',   faixa: '0&deg;C a 4&deg;C',    color: '#3670A0' },
      { id: 'cong',   nome: 'Camara Cong.',   faixa: '&le; -18&deg;C', color: '#7153A0' }
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

  // FIX C: eixos X e Y com font size 10px (mínimo para 40-60 anos)
  function initBloco2BCharts(leituras) {
    var periods = { m: 'mensal', s: 'semanas', d: 'dias' };
    ['balcao', 'resf', 'cong'].forEach(function(eqId) {
      var eq = leituras[eqId]; if (!eq) return;
      var iC = eqId === 'cong';
      var color = eqId === 'balcao' ? '#2D8653' : (eqId === 'resf' ? '#3670A0' : '#7153A0');
      var fMin = iC ? -30 : -2, fMax = iC ? -18 : 4;
      ['m', 's', 'd'].forEach(function(per) {
        var canvas = document.getElementById('tmpL_' + eqId + '_' + per);
        if (!canvas) return;
        var serieKey = periods[per];
        var serie = eq[serieKey]; if (!serie || !serie.length) return;
        var labels = serie.map(function(x) { return x.label; });
        var vals   = serie.map(function(x) { return x.value; });
        function isOk(v) { return iC ? v <= -18 : (v >= 0 && v <= 4); }
        var ptColors = vals.map(function(v) { return v !== null && isOk(v) ? color : '#C0504D'; });
        var yPad = iC ? 4 : 2;
        var allVals = vals.filter(function(v) { return v !== null; });
        var yMin = allVals.length ? Math.min(fMin - yPad, Math.min.apply(null, allVals) - yPad) : fMin - yPad;
        var yMax = allVals.length ? Math.max(fMax + yPad, Math.max.apply(null, allVals) + yPad) : fMax + yPad;

        var ch = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              { data: vals, borderColor: color, backgroundColor: 'transparent', borderWidth: 1.5,
                pointBackgroundColor: ptColors, pointRadius: 3, pointHoverRadius: 5,
                tension: 0.3, spanGaps: true },
              { data: labels.map(function() { return fMin; }), borderColor: 'rgba(45,134,83,.3)',
                borderWidth: 1, borderDash: [3,2], pointRadius: 0, fill: false },
              { data: labels.map(function() { return fMax; }), borderColor: 'rgba(45,134,83,.3)',
                borderWidth: 1, borderDash: [3,2], pointRadius: 0,
                fill: '-1', backgroundColor: 'rgba(45,134,83,.06)' }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    if (ctx.datasetIndex > 0) return null;
                    var v = ctx.parsed.y;
                    return v !== null ? v.toFixed(1) + '°C ' + (isOk(v) ? '✓' : '⚠') : '';
                  }
                }
              }
            },
            scales: {
              y: {
                min: yMin, max: yMax,
                grid: { color: 'rgba(0,0,0,.03)', drawBorder: false },
                // FIX C: size 10 mínimo
                ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280',
                         callback: function(v) { return v + '°'; }, stepSize: iC ? 3 : 2, padding: 2 },
                border: { display: false }
              },
              x: {
                grid: { display: false },
                // FIX C: size 10 mínimo
                ticks: { font: { size: 10, family: 'Outfit', weight: '600' }, color: '#6B7280', maxRotation: 0 },
                border: { display: false }
              }
            },
            layout: { padding: { top: 2, bottom: 0, left: 0, right: 2 } },
            animation: { duration: 400 }
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
        function tr(lb, val, fl, dc) { if (val === null) return ''; var cls = fl === 'CONFORME' ? 'tmp-tt-ok' : 'tmp-tt-nok'; return '<div class="tmp-tt-row"><span class="tmp-tt-dot" style="background:' + dc + '"></span><span class="tmp-tt-label">' + lb + ':</span> <span class="tmp-tt-val ' + cls + '"><strong>' + val.toFixed(1) + '&deg;C</strong></span> <span style="font-size:9px">' + (fl === 'CONFORME' ? '✓' : '⚠') + '</span></div>'; }
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

  // ══════════════════════════════════════════════════════════════
  // BLOCO 4 — RANKING
  // ══════════════════════════════════════════════════════════════
  function renderBloco4(ranking) {
    function barC(p) { return p >= 85 ? '#2D8653' : (p >= 70 ? '#C97B2C' : '#C0504D'); }
    function pctC(p) { return p >= 85 ? 'var(--green)' : (p >= 70 ? 'var(--orange)' : 'var(--red)'); }
    function eqB(d) {
      var v = d.delta; var vc = v > 0 ? 'up' : (v < 0 ? 'down' : 'eq');
      var vt = v > 0 ? '&#9650; +' + v + '%' : (v < 0 ? '&#9660; ' + v + '%' : '= 0%');
      return '<span class="tmp-rk-var ' + vc + '">' + vt + '</span>';
    }
    function subRank(lojas, eqKey) {
      return lojas.map(function(l, i) {
        var d = l[eqKey]; if (!d) return '';
        return '<div class="tmp-rk-data-row">' +
          '<div class="tmp-rk-pos">' + (i + 1) + '</div>' +
          '<div class="tmp-rk-loja">' + l.nome + '</div>' +
          '<div class="tmp-rk-bar-wrap"><div class="tmp-rk-bar" style="width:' + d.conf + '%;background:' + barC(d.conf) + '"></div></div>' +
          '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>' +
          '<div class="tmp-rk-pct" style="color:' + pctC(d.conf) + '">' + d.conf + '%</div>' +
          '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>' +
          eqB(d) +
        '</div>';
      }).join('');
    }

    var html = '<div class="section-block rank anim d5">' +
      '<div class="section-header"><span class="sh-dot" style="background:#7153A0"></span> Ranking de Conformidade por Loja <span class="sh-line"></span></div>' +
      // Header colunas
      '<div class="tmp-rk-header">' +
        '<div class="tmp-rk-grid">' +
          '<div></div>' +
          '<div class="tmp-rk-col-h" style="text-align:left">Loja</div>' +
          '<div class="tmp-rk-col-h">Balcao Refrig.</div>' +
          '<div></div>' +
          '<div class="tmp-rk-col-h">Cam. Resfriados</div>' +
          '<div></div>' +
          '<div class="tmp-rk-col-h">Cam. Congelados</div>' +
        '</div>' +
      '</div>' +
      // Total rede
      '<div class="tmp-rk-total-row">' +
        '<div class="tmp-rk-data-row">' +
          '<div class="tmp-rk-pos" style="font-size:11px;color:#6B7280">&#9660;</div>' +
          '<div class="tmp-rk-loja" style="font-weight:700;color:var(--navy)">Total Rede</div>' +
          '<div class="tmp-rk-bar-wrap"><div class="tmp-rk-bar" style="width:' + ranking.rede.balcao.conf + '%;background:' + barC(ranking.rede.balcao.conf) + '"></div></div>' +
          '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>' +
          '<div class="tmp-rk-pct" style="color:' + pctC(ranking.rede.balcao.conf) + '">' + ranking.rede.balcao.conf + '%</div>' +
          '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>' +
          eqB(ranking.rede.balcao) +
        '</div>' +
      '</div>' +
      subRank(ranking.lojas, 'balcao') +
    '</div>';
    return html;
  }

  // ══════════════════════════════════════════════════════════════
  // PILL EVENTS — FIX L: re-render completo ao trocar filtros
  // ══════════════════════════════════════════════════════════════
  function initPillEvents() {
    document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        tmpEqFilter = this.getAttribute('data-eq');
        // FIX L: re-inicia somente os charts de tendência, sem re-render do HTML
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
