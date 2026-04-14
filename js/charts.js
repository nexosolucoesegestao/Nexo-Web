// ============================================================
// NEXO Intelligence Web v2.4 — Chart Factory Premium
// - Sem eixos / sem grid em todos os gráficos
// - Legendas: topo central, quadrados arredondados (rectRounded)
// - Rótulos: font.size 11 padronizado
// - motivosHBar: barra horizontal com % visível (substitui donut)
// - Cross-filter: publica/assina NEXO_FILTER global
// ============================================================
var Charts = {

  COLORS: {
    navy:   '#0C1425', gold:   '#C9A84C', goldLight: '#E8C96A',
    red:    '#E24B4A', green:  '#22C55E', blue:   '#3498DB',
    orange: '#F59E0B', purple: '#8E44AD', muted:  '#8A98B0',
    redBg:    'rgba(226,75,74,0.06)',   greenBg: 'rgba(34,197,94,0.06)',
    orangeBg: 'rgba(245,158,11,0.06)', blueBg:  'rgba(52,152,219,0.07)'
  },

  // ── Defaults globais ─────────────────────────────────────
  _defaults: function () {
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#8A98B0';
    Chart.defaults.plugins.legend.display = false;
  },

  // ── Tooltip padrão NEXO ──────────────────────────────────
  _tooltip: function (extra) {
    return Object.assign({
      backgroundColor:  '#0C1425',
      titleColor:       '#C9A84C',
      bodyColor:        'rgba(255,255,255,0.78)',
      borderColor:      'rgba(201,168,76,0.25)',
      borderWidth:      1,
      padding:          12,
      cornerRadius:     10,
      titleFont:        { family: 'Outfit', weight: '600', size: 12 },
      bodyFont:         { family: 'Outfit', size: 11 },
      mode:             'index',
      intersect:        false
    }, extra || {});
  },

  // ── Legenda padrão: topo central, quadrados arredondados ─
  _legend: function (extra) {
    return Object.assign({
      display:   true,
      position:  'top',
      align:     'center',
      labels: {
        font:          { family: 'Outfit', size: 10 },
        color:         '#5A6A85',
        boxWidth:      10,
        boxHeight:     10,
        padding:       14,
        usePointStyle: true,
        pointStyle:    'rectRounded'
      }
    }, extra || {});
  },

  // ── SEM eixos, SEM grid ───────────────────────────────────
  _noAxes: function () {
    return {
      x: { display: false },
      y: { display: false }
    };
  },

  // ── Eixo Y mínimo (só ticks, sem borda/grid) ─────────────
  _yTicks: function (suffix) {
    return {
      display: true,
      border:  { display: false },
      grid:    { display: false },
      ticks: {
        font: { family: 'Outfit', size: 10 }, color: '#8A98B0', padding: 6,
        callback: suffix ? function (v) { return v + suffix; } : undefined
      }
    };
  },

  // ── Eixo X mínimo (só ticks, sem borda/grid) ─────────────
  _xTicks: function (suffix) {
    return {
      display: true,
      border:  { display: false },
      grid:    { display: false },
      ticks: {
        font: { family: 'Outfit', size: 10 }, color: '#8A98B0', padding: 4,
        callback: suffix ? function (v) { return v + suffix; } : undefined
      }
    };
  },

  // ── Gradiente vertical para barras ───────────────────────
  _gradV: function (ctx, colorHex, alphaTop, alphaBot) {
    var h = (ctx.canvas && ctx.canvas.height) || 170;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, colorHex + (alphaTop || 'DD'));
    g.addColorStop(1, colorHex + (alphaBot || '28'));
    return g;
  },

  // ── Gradiente de área para linha ─────────────────────────
  _gradArea: function (ctx, colorHex) {
    var h = (ctx.canvas && ctx.canvas.height) || 170;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, colorHex + '3A');
    g.addColorStop(1, colorHex + '05');
    return g;
  },

  // ── Cor semântica ─────────────────────────────────────────
  colorByVal: function (val, th) {
    if (val >= th.bad)  return this.COLORS.red;
    if (val >= th.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },
  colorByValInverted: function (val, th) {
    if (val < th.bad)  return this.COLORS.red;
    if (val < th.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },

  // ── Bar labels plugin: rótulos padronizados (size 11) ────
  _barLabelsPlugin: function (suffix) {
    var s = suffix || '';
    return {
      id: 'barLabels_' + (suffix || 'none'),
      afterDraw: function (chart) {
        var ctx  = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        if (!meta || meta.type !== 'bar') return;
        meta.data.forEach(function (bar, i) {
          var v = chart.data.datasets[0].data[i];
          if (v === undefined || v === null || v === 0) return;
          ctx.save();
          ctx.font      = "600 11px 'Outfit', sans-serif";
          ctx.fillStyle = '#0C1425';
          ctx.textAlign = 'center';
          ctx.fillText(v + s, bar.x, bar.y - 5);
          ctx.restore();
        });
      }
    };
  },

  // ── Cross-filter: dispara evento global ──────────────────
  _emitFilter: function (key, value) {
    if (typeof window.NEXO_FILTER === 'undefined') window.NEXO_FILTER = {};
    window.NEXO_FILTER[key] = value;
    var ev = new CustomEvent('nexo:filter', { detail: { key: key, value: value } });
    document.dispatchEvent(ev);
  },

  // ============================================================
  // EVOLUTIVO MENSAL — bar gradiente + linha gold acumulado
  // Clique na barra filtra o mês globalmente
  // ============================================================
  evolutivoMensal: function (canvasId, data, color) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels    = data.map(function (d) { return d.label; });
    var values    = data.map(function (d) { return +(d.valor !== undefined ? d.valor : d.taxa) || 0; });
    var acc = 0;
    var accValues = values.map(function (v) { acc = Math.round((acc + v) * 10) / 10; return acc; });

    var barColor = color || '#E24B4A';
    var barGrad  = this._gradV(ctx, barColor, 'EE', '33');
    var lineArea = this._gradArea(ctx, '#C9A84C');

    var self = this;
    var chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Mês', data: values,
            backgroundColor: barGrad, borderColor: barColor, borderWidth: 1,
            borderRadius: 6, borderSkipped: false,
            barPercentage: 0.55, yAxisID: 'y', order: 2
          },
          {
            type: 'line', label: 'Acumulado', data: accValues,
            borderColor: '#C9A84C', backgroundColor: lineArea,
            borderWidth: 2.5, tension: 0.42, fill: true,
            pointRadius: 5, pointBackgroundColor: '#C9A84C',
            pointBorderColor: '#fff', pointBorderWidth: 2,
            pointHoverRadius: 7, pointHoverBackgroundColor: '#E8C96A',
            yAxisID: 'y2', order: 1
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            display: true, position: 'left', beginAtZero: true,
            border: { display: false },
            grid:   { display: false },
            ticks:  { font: { family: 'Outfit', size: 10 }, color: '#8A98B0', padding: 6 }
          },
          y2: {
            display: true, position: 'right', beginAtZero: true,
            border: { display: false },
            grid:   { display: false },
            ticks:  { font: { family: 'Outfit', size: 10 }, color: '#C9A84C', padding: 6 }
          },
          x: this._xTicks()
        },
        plugins: {
          legend: this._legend(),
          tooltip: this._tooltip()
        },
        // Cross-filter: clique no mês
        onClick: function (evt, elements) {
          if (!elements || !elements.length) return;
          var idx = elements[0].index;
          var mes = labels[idx];
          self._emitFilter('mes', mes);
          // Destaca barra clicada, opaca as outras
          var newBg = values.map(function (_, i) {
            var g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
            if (i === idx) {
              g.addColorStop(0, barColor + 'FF');
              g.addColorStop(1, barColor + '55');
            } else {
              g.addColorStop(0, barColor + '44');
              g.addColorStop(1, barColor + '18');
            }
            return g;
          });
          chart.data.datasets[0].backgroundColor = newBg;
          chart.update('none');
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
    return chart;
  },

  // ============================================================
  // DIA DA SEMANA % — barras gradiente semântico
  // Clique no dia emite filtro
  // ============================================================
  diaSemana: function (canvasId, data, thresholds) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels = data.map(function (d) { return d.dia; });
    var values = data.map(function (d) { return +d.taxa || 0; });
    var th     = thresholds || { bad: 20, warn: 14 };
    var self   = this;

    var colors = values.map(function (v) {
      return self._gradV(ctx, self.colorByVal(v, th), 'EE', '33');
    });

    var chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, barPercentage: 0.6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          x: this._xTicks(),
          y: { display: false }
        },
        plugins: {
          legend: { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + '%'; } } })
        },
        onClick: function (evt, elements) {
          if (!elements || !elements.length) return;
          self._emitFilter('dia', labels[elements[0].index]);
        }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
    return chart;
  },

  // ============================================================
  // DIA DA SEMANA KG — barras gradiente
  // ============================================================
  diaSemanaKg: function (canvasId, data) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels = data.map(function (d) { return d.dia; });
    var values = data.map(function (d) { return +d.kg || 0; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self   = this;

    var colors = values.map(function (v) {
      var base = v >= maxVal * 0.8 ? self.COLORS.red :
                 v >= maxVal * 0.5 ? self.COLORS.orange : self.COLORS.purple;
      return self._gradV(ctx, base, 'EE', '33');
    });

    return new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
        scales: { x: this._xTicks(), y: { display: false } },
        plugins: {
          legend: { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + ' kg'; } } })
        }
      },
      plugins: [this._barLabelsPlugin(' kg')]
    });
  },

  // ============================================================
  // MOTIVOS HORIZONTAL BAR — substitui o donut
  // Valores % visíveis ao bater o olho
  // ============================================================
  motivosDonut: function (canvasId, motivos) {
    // Redireciona para a versão horizontal bar (mais legível)
    return this.motivosHBar(canvasId, motivos);
  },

  motivosHBar: function (canvasId, motivos) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    // Ajustar altura do container para mais itens
    if (el.parentElement) el.parentElement.style.height = 'auto';
    var ctx = el.getContext('2d');

    var sorted = Object.entries(motivos).sort(function (a, b) { return b[1] - a[1]; });
    var total  = sorted.reduce(function (s, e) { return s + e[1]; }, 0);
    var labels = sorted.map(function (e) { return e[0]; });
    var values = sorted.map(function (e) { return Math.round((e[1] / total) * 100); });

    var palette = [
      '#E24B4A', '#F59E0B', '#F59E0B',
      '#C9A84C', '#3498DB', '#8E44AD', '#8A98B0'
    ];
    var self = this;
    var colors = labels.map(function (_, i) {
      var base = palette[i % palette.length];
      var g = ctx.createLinearGradient(300, 0, 0, 0);
      g.addColorStop(0, base + 'F0');
      g.addColorStop(1, base + '44');
      return g;
    });

    // Calcular altura dinâmica (28px por item + margins)
    var dynamicH = Math.max(160, labels.length * 36 + 20);
    if (el.parentElement) el.parentElement.style.height = dynamicH + 'px';
    el.style.height = dynamicH + 'px';

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values, backgroundColor: colors,
          borderRadius: 6, borderSkipped: false, barPercentage: 0.65
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
        scales: {
          x: { display: false },
          y: {
            display: true, border: { display: false }, grid: { display: false },
            ticks: { font: { family: 'Outfit', size: 11 }, color: '#4A5A75', padding: 8 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.x + '%'; } } })
        }
      },
      plugins: [{
        id: 'hbarPct',
        afterDraw: function (chart) {
          var ctx2 = chart.ctx;
          chart.data.datasets[0].data.forEach(function (v, i) {
            var bar = chart.getDatasetMeta(0).data[i];
            if (!bar) return;
            ctx2.save();
            ctx2.font      = "700 11px 'Outfit', sans-serif";
            ctx2.fillStyle = '#0C1425';
            ctx2.textBaseline = 'middle';
            ctx2.fillText(v + '%', bar.x + 8, bar.y);
            ctx2.restore();
          });
        }
      }]
    });
  },

  // ============================================================
  // MOTIVOS BAR — horizontal para indisponibilidade
  // ============================================================
  motivosBar: function (canvasId, motivos) {
    return this.motivosHBar(canvasId, motivos);
  },

  // ============================================================
  // HORÁRIO DE CHEGADA
  // ============================================================
  horarioChegada: function (canvasId, data) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels = data.map(function (d) { return d.hora; });
    var values = data.map(function (d) { return +d.count || 0; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self   = this;

    var colors = values.map(function (v) {
      var base = v >= maxVal * 0.8 ? self.COLORS.green :
                 v >= maxVal * 0.4 ? self.COLORS.blue  : self.COLORS.muted;
      return self._gradV(ctx, base, 'EE', '33');
    });

    return new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, barPercentage: 0.65 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
        scales: { x: this._xTicks(), y: { display: false } },
        plugins: {
          legend: { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + ' registros'; } } })
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ============================================================
  // SPARKLINE
  // ============================================================
  sparkline: function (canvasId, data, color) {
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');
    var c   = color || '#C9A84C';
    var areaGrad = this._gradArea(ctx, c);

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(function () { return ''; }),
        datasets: [{ data: data, borderColor: c, backgroundColor: areaGrad, borderWidth: 1.8, pointRadius: 0, tension: 0.42, fill: true }]
      },
      options: {
        responsive: false, scales: this._noAxes(),
        plugins: { tooltip: { enabled: false } },
        animation: { duration: 600 }
      }
    });
  }
};
