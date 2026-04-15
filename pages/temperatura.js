// ============================================================
// NEXO Intelligence Web — Temperatura (Cadeia do Frio)
// 5 Blocos: Termometros | Tendencia Conf | Leituras | Mapa | Ranking
// ============================================================

var tmpCharts = {};
var tmpData = null;
var tmpEqFilter = 'todos';

function destroyTmpCharts() {
  Object.keys(tmpCharts).forEach(function(k) {
    if (tmpCharts[k]) { tmpCharts[k].destroy(); delete tmpCharts[k]; }
  });
}

async function loadData() {
  var container = document.getElementById('tempContent');
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Carregando temperatura...</span></div>';

  try {
    var lojaId = typeof NEXO !== 'undefined' && NEXO.selectedLoja ? NEXO.selectedLoja : null;
    var temps = await API.getTemperatura({ lojaId: lojaId });

    if (!temps || temps.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🌡️</div><p>Sem dados de temperatura disponiveis</p></div>';
      return;
    }

    // Get active period
    var periodDias = 15;
    var activeP = document.querySelector('.pp.active');
    if (activeP) periodDias = parseInt(activeP.getAttribute('data-d')) || 15;

    tmpData = Engine.processTemperatura(temps, periodDias);
    if (!tmpData) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🌡️</div><p>Dados insuficientes para analise</p></div>';
      return;
    }

    renderAll();
  } catch (err) {
    console.error('Temperatura loadData error:', err);
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>Erro ao carregar dados</p></div>';
  }
}

function renderAll() {
  destroyTmpCharts();
  var d = tmpData;
  var html = '';

  // BLOCO 1 — Termometros
  html += renderBloco1(d.termometros);

  // BLOCO 2 — Tendencia Conformidade
  html += renderBloco2(d.tendenciaConf);

  // BLOCO 2B — Leituras
  html += renderBloco2B(d.leituras);

  // BLOCO 3 — Mapa Conformidade
  html += renderBloco3(d.mapaConf);

  // BLOCO 4 — Ranking
  html += renderBloco4(d.ranking);

  document.getElementById('tempContent').innerHTML = html;

  // Init charts after DOM
  setTimeout(function() {
    initBloco1Donuts(d.termometros);
    initBloco2Charts(d.tendenciaConf, tmpEqFilter);
    initBloco2BCharts(d.leituras);
    initBloco3Events(d.mapaConf);
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
  var bc = ok ? g[2] : '#C0504D';

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
  var html = '<div class="section-block frost anim d1" id="tmpBloco1">' +
    '<div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Temperatura Media por Equipamento <span class="sh-line"></span></div>' +
    '<div class="tmp-thermo-row">';

  termos.forEach(function(eq) {
    var iC = eq.id === 'cong';
    var ok = iC ? (eq.temp !== null && eq.temp <= -18) : (eq.temp !== null && eq.temp >= 0 && eq.temp <= 4);
    var bigCls = ok ? 'ok' : (eq.temp === null ? '' : 'danger');
    var d = eq.delta;
    var vc, vt;
    if (d === 0 || eq.temp === null) { vc = 'stable'; vt = '= 0°C'; }
    else if (iC) { vc = d < 0 ? 'down-good' : 'up'; vt = (d > 0 ? '+' : '') + d + '°C'; }
    else { vc = d > 0 ? 'up' : 'down-good'; vt = (d > 0 ? '+' : '') + d + '°C'; }
    var arrow = d > 0 ? '&#9650;' : (d < 0 ? '&#9660;' : '=');
    var confColor = eq.confPct >= 90 ? '#2D8653' : (eq.confPct >= 70 ? '#C97B2C' : '#C0504D');
    var faixaText = iC ? '&#8804; -18°C' : '0°C a 4°C';
    var tempDisplay = eq.temp !== null ? eq.temp : '--';

    html += '<div class="tmp-tc ' + eq.id + '">' +
      '<div class="tmp-tc-thermo">' +
        '<div class="tmp-tc-label">' + eq.label + '<span class="tmp-tc-faixa">' + faixaText + '</span></div>' +
        thermoSVG(eq) +
        '<div class="tmp-tc-big ' + bigCls + '"><strong>' + tempDisplay + '</strong><span class="tmp-tc-unit">°C</span></div>' +
      '</div>' +
      '<div class="tmp-tc-divider"></div>' +
      '<div class="tmp-tc-metrics">' +
        '<div class="tmp-tc-comp"><div>' +
          '<div class="tmp-tc-comp-label">vs periodo anterior</div>' +
          '<div class="tmp-tc-comp-val ' + vc + '"><strong>' + arrow + ' ' + vt + '</strong></div>' +
        '</div></div>' +
        '<div class="tmp-tc-conf">' +
          '<div class="tmp-tc-donut-wrap"><canvas id="tmpDn_' + eq.id + '" width="48" height="48"></canvas>' +
            '<span class="tmp-tc-donut-center" style="color:' + confColor + '"><strong>' + eq.confPct + '%</strong></span></div>' +
          '<div class="tmp-tc-conf-meta"><span class="tmp-tc-conf-label">Conformidade</span>' +
            '<span class="tmp-tc-conf-detail"><strong>' + eq.confOk + '</strong> de <strong>' + eq.confTotal + '</strong> leituras</span></div>' +
        '</div>' +
      '</div></div>';
  });

  html += '</div></div>';
  return html;
}

function initBloco1Donuts(termos) {
  termos.forEach(function(eq) {
    var c = document.getElementById('tmpDn_' + eq.id);
    if (!c) return;
    var ctx = c.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var sz = 48 * dpr;
    c.width = sz; c.height = sz; c.style.width = '48px'; c.style.height = '48px';
    var cx = sz / 2, cy = sz / 2, r = sz / 2 - 4 * dpr, lw = 5 * dpr;
    var color = eq.confPct >= 90 ? '#2D8653' : (eq.confPct >= 70 ? '#C97B2C' : '#C0504D');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (eq.confPct / 100) * Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  });
}

// ══════════════════════════════════════════════════════════════
// BLOCO 2 — TENDENCIA CONFORMIDADE
// ══════════════════════════════════════════════════════════════
function renderBloco2(tendencia) {
  var html = '<div class="section-block trend anim d2" id="tmpBloco2">' +
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
  return html;
}

function trendColor(eq) {
  if (eq === 'balcao') return { l: '#2D8653', f: 'rgba(45,134,83,.12)' };
  if (eq === 'resf') return { l: '#3670A0', f: 'rgba(54,112,160,.12)' };
  if (eq === 'cong') return { l: '#7153A0', f: 'rgba(113,83,160,.12)' };
  return { l: '#2D8653', f: 'rgba(45,134,83,.12)' };
}

function initBloco2Charts(tendencia, eq) {
  var t = tendencia[eq];
  if (!t) return;
  var c = trendColor(eq);
  var sets = [
    { data: t.mensal, chId: 'tmpCh1', bnId: 'tmpBn1', varId: 'tmpVar1', tblId: 'tmpTb1' },
    { data: t.semanas, chId: 'tmpCh2', bnId: 'tmpBn2', varId: 'tmpVar2', tblId: 'tmpTb2' },
    { data: t.dias, chId: 'tmpCh3', bnId: 'tmpBn3', varId: 'tmpVar3', tblId: 'tmpTb3' }
  ];

  sets.forEach(function(s) {
    var d = s.data;
    if (!d || !d.length) return;
    var last = d[d.length - 1].conf;
    var prev = d.length >= 2 ? d[d.length - 2].conf : last;
    var delta = last - prev;
    var cls = last >= 85 ? 'ok' : (last >= 70 ? 'warn' : 'danger');

    // Big number
    var bnEl = document.getElementById(s.bnId);
    if (bnEl) { bnEl.textContent = last + '%'; bnEl.className = 'tmp-trc-bn ' + cls; }

    // Variation badge
    var varEl = document.getElementById(s.varId);
    if (varEl) {
      var vc = delta > 0 ? 'down-good' : (delta < 0 ? 'up-bad' : 'stable');
      var vt = delta > 0 ? '&#9650; ' + delta + ' p.p.' : (delta < 0 ? '&#9660; ' + Math.abs(delta) + ' p.p.' : '= 0 p.p.');
      varEl.innerHTML = vt;
      varEl.className = 'tmp-trc-var ' + vc;
    }

    // Chart
    var canvas = document.getElementById(s.chId);
    if (!canvas) return;
    if (tmpCharts[s.chId]) tmpCharts[s.chId].destroy();
    var labels = d.map(function(x) { return x.label; });
    var vals = d.map(function(x) { return x.conf; });
    var ptColors = vals.map(function(v) { return v >= 85 ? c.l : (v >= 70 ? '#C97B2C' : '#C0504D'); });

    tmpCharts[s.chId] = new Chart(canvas, {
      type: 'line',
      data: { labels: labels, datasets: [{ data: vals, borderColor: c.l, backgroundColor: c.f, fill: true, borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: ptColors, pointBorderColor: '#fff', pointBorderWidth: 2, tension: 0.3 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: Math.max(0, Math.min.apply(null, vals) - 15), max: 100, grid: { color: 'rgba(0,0,0,.04)' }, ticks: { display: false } }, x: { grid: { display: false }, ticks: { display: false } } },
        layout: { padding: { left: 2, right: 2, top: 20, bottom: 0 } },
        animation: { duration: 600, onComplete: function() {
          var ch = this; var ctx = ch.ctx; var meta = ch.getDatasetMeta(0);
          ctx.save(); ctx.font = '600 11px Outfit'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          meta.data.forEach(function(pt, i) { ctx.fillStyle = vals[i] >= 85 ? '#2D8653' : (vals[i] >= 70 ? '#C97B2C' : '#C0504D'); ctx.fillText(vals[i] + '%', pt.x, pt.y - 8); });
          ctx.restore();
        }}
      }
    });

    // Table
    var tbl = document.getElementById(s.tblId);
    if (!tbl) return;
    var th = '<tr><td></td>';
    d.forEach(function(x) { th += '<td style="color:var(--t3);font-weight:500">' + x.label + '</td>'; });
    th += '</tr><tr><td style="color:var(--t3);font-weight:600;font-size:9px">LEIT.</td>';
    d.forEach(function(x) { th += '<td style="color:var(--t1);font-weight:600"><strong>' + x.leit + '</strong></td>'; });
    th += '</tr><tr><td style="color:var(--t3);font-weight:600;font-size:9px">CONF.</td>';
    d.forEach(function(x) {
      var cc = x.conf >= 85 ? 'var(--green)' : (x.conf >= 70 ? 'var(--orange)' : 'var(--red)');
      th += '<td style="color:' + cc + ';font-weight:700"><strong>' + x.conf + '%</strong></td>';
    });
    th += '</tr><tr><td style="color:var(--t3);font-weight:600;font-size:9px">VAR %</td>';
    d.forEach(function(x) {
      if (x.confAnt === null) { th += '<td class="v-eq">=</td>'; }
      else {
        var dv = x.conf - x.confAnt;
        if (dv === 0) th += '<td class="v-eq">=</td>';
        else if (dv > 0) th += '<td class="v-down"><strong>&#9650; ' + dv + '%</strong></td>';
        else th += '<td class="v-up"><strong>&#9660; ' + Math.abs(dv) + '%</strong></td>';
      }
    });
    th += '</tr>';
    tbl.innerHTML = th;
  });
}

// ══════════════════════════════════════════════════════════════
// BLOCO 2B — LEITURAS (MATRIX)
// ══════════════════════════════════════════════════════════════
function renderBloco2B(leituras) {
  var equips = [
    { id: 'balcao', nome: 'Balcao Refrig.', faixa: '0°C a 4°C', color: '#2D8653' },
    { id: 'resf', nome: 'Camara Resf.', faixa: '0°C a 4°C', color: '#3670A0' },
    { id: 'cong', nome: 'Camara Cong.', faixa: '&#8804; -18°C', color: '#7153A0' }
  ];
  var html = '<div class="section-block leit anim d3" id="tmpBloco2B">' +
    '<div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Leituras de Temperatura <span class="sh-line"></span></div>' +
    '<div class="tmp-matrix">' +
      '<div class="tmp-mcol-sp"></div><div class="tmp-mcol-h">Media Mensal</div><div class="tmp-mcol-h">Ultimas 8 Semanas</div><div class="tmp-mcol-h">Ultimos 7 Dias</div>';

  equips.forEach(function(eq, ei) {
    var isLast = ei === equips.length - 1;
    var lastCls = isLast ? ' last' : '';
    html += '<div class="tmp-mrow-label' + (isLast ? '' : '') + '">' +
      '<div class="tmp-mrl-name"><span class="tmp-mrl-dot" style="background:' + eq.color + '"></span> ' + eq.nome + '</div>' +
      '<div class="tmp-mrl-faixa">' + eq.faixa + '</div></div>';
    ['m', 's', 'd'].forEach(function(per) {
      html += '<div class="tmp-mcell' + lastCls + '"><div class="tmp-mcell-inner"><canvas id="tmpL_' + eq.id + '_' + per + '"></canvas></div></div>';
    });
  });

  html += '</div>' +
    '<div class="tmp-mlegend">' +
      '<div class="tmp-mleg-item"><span class="tmp-mleg-zone"></span> Zona conforme</div>' +
      '<div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#2D8653"></span> Dentro da faixa</div>' +
      '<div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#C0504D"></span> Fora da faixa</div>' +
    '</div></div>';
  return html;
}

function initBloco2BCharts(leituras) {
  var periods = { m: 'mensal', s: 'semanas', d: 'dias' };
  ['balcao', 'resf', 'cong'].forEach(function(eqId) {
    var eq = leituras[eqId];
    if (!eq) return;
    var iC = eqId === 'cong';
    var color = eqId === 'balcao' ? '#2D8653' : (eqId === 'resf' ? '#3670A0' : '#7153A0');
    var fMin = eq.fMin, fMax = eq.fMax;
    var yMin = iC ? -25 : -1, yMax = iC ? -13 : 7;

    ['m', 's', 'd'].forEach(function(per) {
      var data = eq[periods[per]];
      if (!data || !data.length) return;
      var canvasId = 'tmpL_' + eqId + '_' + per;
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;

      var labels = data.map(function(x) { return x.label; });
      var vals = data.map(function(x) { return x.value; });
      var isOk = function(v) { return v === null ? true : (iC ? v <= fMax : (v >= fMin && v <= fMax)); };
      var ptBg = vals.map(function(v) { return v === null ? 'transparent' : (isOk(v) ? color : '#C0504D'); });
      var ptR = vals.map(function(v) { return v === null ? 0 : (isOk(v) ? 2.5 : 4); });

      var ds = [];
      ds.push({ data: labels.map(function() { return fMax; }), borderColor: 'rgba(45,134,83,.5)', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, pointHitRadius: 0, fill: false, order: 3 });
      if (!iC) ds.push({ data: labels.map(function() { return fMin; }), borderColor: 'rgba(45,134,83,.5)', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, pointHitRadius: 0, fill: false, order: 3 });
      ds.push({ data: labels.map(function() { return fMax; }), borderColor: 'transparent', backgroundColor: 'rgba(45,134,83,.18)', fill: { target: { value: iC ? yMin : fMin }, above: 'rgba(45,134,83,.18)' }, pointRadius: 0, pointHitRadius: 0, borderWidth: 0, order: 4 });
      var mi = ds.length;
      ds.push({ data: vals, borderColor: color, fill: false, borderWidth: 1.8, pointRadius: ptR, pointBackgroundColor: ptBg, pointBorderColor: '#fff', pointBorderWidth: 1.5, tension: 0.3, order: 1 });

      tmpCharts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: ds },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: { legend: { display: false }, tooltip: {
            backgroundColor: 'rgba(12,20,37,.92)', titleFont: { family: 'Outfit', size: 9 }, bodyFont: { family: 'Outfit', size: 10, weight: '700' },
            padding: 5, cornerRadius: 5, displayColors: false,
            filter: function(i) { return i.datasetIndex === mi; },
            callbacks: { label: function(ctx) { var v = ctx.parsed.y; return v !== null ? v.toFixed(1) + '°C ' + (isOk(v) ? '✓' : '⚠') : ''; } }
          }},
          scales: {
            y: { min: yMin, max: yMax, grid: { color: 'rgba(0,0,0,.03)', drawBorder: false }, ticks: { font: { size: 9, family: 'Outfit', weight: '600' }, color: '#6B7280', callback: function(v) { return v + '°'; }, stepSize: iC ? 3 : 2, padding: 2 }, border: { display: false } },
            x: { grid: { display: false }, ticks: { font: { size: 8, family: 'Outfit', weight: '600' }, color: '#6B7280', maxRotation: 0 }, border: { display: false } }
          },
          layout: { padding: { top: 2, bottom: 0, left: 0, right: 2 } },
          animation: { duration: 400 }
        }
      });
    });
  });
}

// ══════════════════════════════════════════════════════════════
// BLOCO 3 — MAPA CONFORMIDADE
// ══════════════════════════════════════════════════════════════
function renderBloco3(mapa) {
  var html = '<div class="section-block heatmap anim d4" id="tmpBloco3">' +
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
  return html;
}

function renderBnTable(mapa, filter) {
  var tbl = document.getElementById('tmpBnTable');
  if (!tbl) return;
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
  h += '</tbody>';
  tbl.innerHTML = h;
}

function initBloco3Events(mapa) {
  renderBnTable(mapa, 'todos');
  attachBnTooltips(mapa);
}

function attachBnTooltips(mapa) {
  var tooltip = document.getElementById('tmpTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'tmpTooltip';
    tooltip.className = 'tmp-bn-tooltip';
    document.body.appendChild(tooltip);
  }

  document.querySelectorAll('.tmp-farol:not(.tmp-farol-na)').forEach(function(el) {
    el.addEventListener('mouseenter', function(e) {
      var lojaNome = this.getAttribute('data-loja');
      var ci = parseInt(this.getAttribute('data-ci'));
      var loja = mapa.lojas.find(function(l) { return l.nome === lojaNome; });
      if (!loja) return;
      var cell = loja.cells[ci];
      if (!cell || !cell.temps) return;

      var bnFilter = 'todos';
      var activeP = document.querySelector('#tmpBnPills .eq-pill.active');
      if (activeP) bnFilter = activeP.getAttribute('data-eq');

      var rows = '';
      function tr(lb, val, fl, dc) {
        if (val === null) return '';
        var cls = fl === 'CONFORME' ? 'tmp-tt-ok' : 'tmp-tt-nok';
        return '<div class="tmp-tt-row"><span class="tmp-tt-dot" style="background:' + dc + '"></span><span class="tmp-tt-label">' + lb + ':</span> <span class="tmp-tt-val ' + cls + '"><strong>' + val.toFixed(1) + '°C</strong></span> <span style="font-size:9px">' + (fl === 'CONFORME' ? '✓' : '⚠') + '</span></div>';
      }
      if (bnFilter === 'todos' || bnFilter === 'balcao') rows += tr('Balcao', cell.temps.balcao, cell.temps.fb, '#2D8653');
      if (bnFilter === 'todos' || bnFilter === 'resf') rows += tr('Resf.', cell.temps.resf, cell.temps.fr, '#3670A0');
      if (bnFilter === 'todos' || bnFilter === 'cong') rows += tr('Cong.', cell.temps.cong, cell.temps.fc, '#7153A0');

      tooltip.innerHTML = '<div class="tmp-tt-date"><strong>' + lojaNome + '</strong> — ' + mapa.dates[ci] + '</div>' + rows;
      tooltip.classList.add('show');
      var rect = this.getBoundingClientRect();
      tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
    });
    el.addEventListener('mouseleave', function() {
      var tooltip = document.getElementById('tmpTooltip');
      if (tooltip) tooltip.classList.remove('show');
    });
  });
}

// ══════════════════════════════════════════════════════════════
// BLOCO 4 — RANKING
// ══════════════════════════════════════════════════════════════
function renderBloco4(ranking) {
  function barC(p) { return p >= 85 ? '#2D8653' : (p >= 70 ? '#C97B2C' : '#C0504D'); }
  function pctC(p) { return p >= 85 ? 'var(--green)' : (p >= 70 ? 'var(--orange)' : 'var(--red)'); }
  function eqB(d) {
    var v = d.delta;
    var vc = v > 0 ? 'up' : (v < 0 ? 'down' : 'eq');
    var vt = v > 0 ? '&#9650; +' + v + ' p.p.' : (v < 0 ? '&#9660; ' + v + ' p.p.' : '= 0 p.p.');
    return '<div class="tmp-rk-eq"><div class="tmp-rk-bar-wrap"><div class="tmp-rk-bar-fill" style="width:' + d.pct + '%;background:' + barC(d.pct) + '"></div></div>' +
      '<span class="tmp-rk-pct" style="color:' + pctC(d.pct) + '"><strong>' + d.pct + '%</strong></span>' +
      '<span class="tmp-rk-var ' + vc + '">' + vt + '</span></div>';
  }
  function sepC() { return '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>'; }

  var html = '<div class="section-block ranking anim d5" id="tmpBloco4">' +
    '<div class="section-header"><span class="sh-dot" style="background:var(--gold)"></span> Ranking de Conformidade por Loja <span class="sh-line"></span></div>' +
    '<div class="tmp-rk-grid">' +
      '<div class="tmp-rk-col-head tmp-rk-col-head-left">#</div><div class="tmp-rk-col-head tmp-rk-col-head-left">Loja</div>' +
      '<div class="tmp-rk-col-head"><span class="tmp-rk-eq-dot" style="background:#2D8653"></span> Balcao</div><div class="tmp-rk-col-sep"></div>' +
      '<div class="tmp-rk-col-head"><span class="tmp-rk-eq-dot" style="background:#3670A0"></span> Camara Resf.</div><div class="tmp-rk-col-sep"></div>' +
      '<div class="tmp-rk-col-head"><span class="tmp-rk-eq-dot" style="background:#7153A0"></span> Camara Cong.</div>' +
      '<div class="tmp-rk-divider"></div>' +
    '</div>' +
    '<div class="tmp-rk-total-row"><div class="tmp-rk-total-label"><strong>TOTAL REDE</strong></div>' +
      eqB(ranking.total.balcao) + sepC() + eqB(ranking.total.resf) + sepC() + eqB(ranking.total.cong) +
    '</div>';

  ranking.lojas.forEach(function(l, i) {
    html += '<div class="tmp-rk-data-row">' +
      '<div class="tmp-rk-pos">' + (i + 1) + '</div>' +
      '<div class="tmp-rk-loja">' + l.nome + '</div>' +
      eqB(l.balcao) + sepC() + eqB(l.resf) + sepC() + eqB(l.cong) +
    '</div>';
  });

  html += '</div>';
  return html;
}

// ══════════════════════════════════════════════════════════════
// PILL EVENTS
// ══════════════════════════════════════════════════════════════
function initPillEvents() {
  // Trend pills
  document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(el) {
    el.addEventListener('click', function() {
      document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(p) { p.classList.remove('active'); });
      this.classList.add('active');
      var eq = this.getAttribute('data-eq');
      tmpEqFilter = eq;
      initBloco2Charts(tmpData.tendenciaConf, eq);
    });
  });

  // Mapa pills
  document.querySelectorAll('#tmpBnPills .eq-pill').forEach(function(el) {
    el.addEventListener('click', function() {
      document.querySelectorAll('#tmpBnPills .eq-pill').forEach(function(p) { p.classList.remove('active'); });
      this.classList.add('active');
      var eq = this.getAttribute('data-eq');
      renderBnTable(tmpData.mapaConf, eq);
      attachBnTooltips(tmpData.mapaConf);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// PAGE INIT (called by SPA router)
// ══════════════════════════════════════════════════════════════
var PAGE_HTML = '<div id="tempContent"></div>';

loadData();
