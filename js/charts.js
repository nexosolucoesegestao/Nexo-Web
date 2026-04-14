// ============================================================
// NEXO Intelligence Web v2 — Chart Factory
// Visual Premium aprovado em 14/Abr/2026:
//   - Cores dessaturadas: terracota #C0504D, esmeralda #2D8653,
//     âmbar #C97B2C, violeta #7153A0, azul #3670A0
//   - Eixos Y/Y2 com display:false (sem números laterais)
//   - Rótulos sempre pretos, sempre acima da barra
//   - motivosDonut → barras horizontais (mais legível)
// ============================================================
var Charts = {

  COLORS: {
    navy:   '#0C1425',
    gold:   '#C9A84C',
    // Cores dessaturadas aprovadas
    red:    '#C0504D',   // terracota
    green:  '#2D8653',   // esmeralda
    orange: '#C97B2C',   // âmbar
    blue:   '#3670A0',   // azul analítico
    purple: '#7153A0',   // violeta dessaturado
    muted:  '#8A98B0',
    redBg:    'rgba(192,80,77,0.07)',
    greenBg:  'rgba(45,134,83,0.07)',
    orangeBg: 'rgba(201,123,44,0.07)',
    blueBg:   'rgba(54,112,160,0.07)'
  },

  _defaults: function () {
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#8A98B0';
    Chart.defaults.plugins.legend.display = false;
  },

  colorByVal: function (val, thresholds) {
    if (val >= thresholds.bad)  return this.COLORS.red;
    if (val >= thresholds.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },

  colorByValInverted: function (val, thresholds) {
    if (val < thresholds.bad)  return this.COLORS.red;
    if (val < thresholds.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },

  // ── Tooltip padrão NEXO ──────────────────────────────────
  _tooltip: function (extra) {
    return Object.assign({
      backgroundColor: '#0C1425',
      titleColor:      '#C9A84C',
      bodyColor:       'rgba(255,255,255,0.78)',
      borderColor:     'rgba(201,168,76,0.25)',
      borderWidth:     1,
      padding:         10,
      cornerRadius:    8,
      titleFont:       { family: 'Outfit', weight: '600', size: 12 },
      bodyFont:        { family: 'Outfit', size: 11 },
      mode:            'index',
      intersect:       false
    }, extra || {});
  },

  // ── Legenda: topo central, quadrados arredondados ────────
  _legend: function () {
    return {
      display:  true,
      position: 'top',
      align:    'center',
      labels: {
        font:          { family: 'Outfit', size: 10 },
        color:         '#5A6A85',
        boxWidth:      10,
        boxHeight:     10,
        padding:       12,
        usePointStyle: true,
        pointStyle:    'rectRounded'
      }
    };
  },

  // ============================================================
  // EVOLUTIVO MENSAL — bar + linha acumulado gold
  // Y e Y2: display:false (sem números laterais)
  // ============================================================
  evolutivoMensal: function (canvasId, data, color) {
    this._defaults();
    var labels    = data.map(function (d) { return d.label; });
    var values    = data.map(function (d) { return d.valor || d.taxa; });
    var acc = 0;
    var accValues = values.map(function (v) { acc += v; return acc; });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Mês', data: values,
            backgroundColor: color + 'CC', borderRadius: 4,
            barPercentage: 0.55, yAxisID: 'y', order: 2
          },
          {
            type: 'line', label: 'Acumulado', data: accValues,
            borderColor: '#C9A84C', borderWidth: 2,
            pointRadius: 4, pointBackgroundColor: '#C9A84C',
            pointBorderColor: '#fff', pointBorderWidth: 1.5,
            tension: 0.3, fill: false, yAxisID: 'y2', order: 1
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y:  { display: false, beginAtZero: true },
          y2: { display: false, beginAtZero: true },
          x:  { grid: { display: false }, ticks: { font: { size: 10 }, color: '#8A98B0' } }
        },
        plugins: {
          legend:  this._legend(),
          tooltip: this._tooltip()
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ============================================================
  // DIA DA SEMANA % — cores dessaturadas por threshold
  // ============================================================
  diaSemana: function (canvasId, data, thresholds) {
    this._defaults();
    var labels = data.map(function (d) { return d.dia; });
    var values = data.map(function (d) { return d.taxa; });
    var th     = thresholds || { bad: 20, warn: 14 };
    var self   = this;
    var colors = values.map(function (v) { return self.colorByVal(v, th); });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { display: false },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#8A98B0' } }
        },
        plugins: { tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + '%'; } } }) }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
  },

  // ============================================================
  // DIA DA SEMANA KG — dessaturado por magnitude
  // ============================================================
  diaSemanaKg: function (canvasId, data) {
    this._defaults();
    var labels = data.map(function (d) { return d.dia; });
    var values = data.map(function (d) { return d.kg; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self   = this;
    var colors = values.map(function (v) {
      return v >= maxVal * 0.8 ? self.COLORS.red
           : v >= maxVal * 0.5 ? self.COLORS.orange
           : self.COLORS.purple;
    });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { display: false },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#8A98B0' } }
        },
        plugins: { tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + ' kg'; } } }) }
      },
      plugins: [this._barLabelsPlugin(' kg')]
    });
  },

  // ============================================================
  // MOTIVOS BAR — horizontal com % visível
  // ============================================================
  motivosBar: function (canvasId, motivos) {
    this._defaults();
    var sorted  = Object.entries(motivos).sort(function (a, b) { return b[1] - a[1]; });
    var total   = sorted.reduce(function (s, e) { return s + e[1]; }, 0);
    var labels  = sorted.map(function (e) { return e[0]; });
    var values  = sorted.map(function (e) { return Utils.pct(e[1], total); });
    var palette = [
      this.COLORS.red, this.COLORS.orange, this.COLORS.orange,
      '#B8933A', this.COLORS.blue, '#7A9BB8', '#A0AEC0'
    ];

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderRadius: 5, barPercentage: 0.55 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 36 } },
        scales: {
          x: { display: false },
          y: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#4A5A75' } }
        },
        plugins: { tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.x + '%'; } } }) }
      },
      plugins: [{
        id: 'hbarPct',
        afterDraw: function (chart) {
          var ctx = chart.ctx;
          chart.data.datasets[0].data.forEach(function (v, i) {
            var bar = chart.getDatasetMeta(0).data[i];
            if (!bar) return;
            ctx.save();
            ctx.font = "600 10px 'Outfit', sans-serif";
            ctx.fillStyle = '#1F2937'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            ctx.fillText(v + '%', bar.x + 5, bar.y);
            ctx.restore();
          });
        }
      }]
    });
  },

  // ============================================================
  // MOTIVOS DONUT → barras horizontais (aprovado na validação)
  // ============================================================
  motivosDonut: function (canvasId, motivos) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;

    var sorted  = Object.entries(motivos).sort(function (a, b) { return b[1] - a[1]; });
    var total   = sorted.reduce(function (s, e) { return s + e[1]; }, 0);
    var labels  = sorted.map(function (e) { return e[0]; });
    var values  = sorted.map(function (e) { return Utils.pct(e[1], total); });
    var palette = [
      this.COLORS.red, '#C97B2C', this.COLORS.orange,
      '#B8933A', this.COLORS.blue, this.COLORS.purple, '#A0AEC0'
    ];

    // Altura dinâmica proporcional ao número de itens
    var dynH = Math.max(140, labels.length * 34 + 16);
    if (el.parentElement) el.parentElement.style.height = dynH + 'px';

    return new Chart(el.getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderRadius: 5, barPercentage: 0.65 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 40 } },
        scales: {
          x: { display: false },
          y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#4A5A75', padding: 8 } }
        },
        plugins: {
          legend: { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.x + '%'; } } })
        }
      },
      plugins: [{
        id: 'donutAsPct',
        afterDraw: function (chart) {
          var ctx = chart.ctx;
          chart.data.datasets[0].data.forEach(function (v, i) {
            var bar = chart.getDatasetMeta(0).data[i];
            if (!bar || !v) return;
            ctx.save();
            ctx.font = "700 11px 'Outfit', sans-serif";
            ctx.fillStyle = '#1F2937'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            ctx.fillText(v + '%', bar.x + 6, bar.y);
            ctx.restore();
          });
        }
      }]
    });
  },

  // ============================================================
  // HORÁRIO DE CHEGADA — dessaturado
  // ============================================================
  horarioChegada: function (canvasId, data) {
    this._defaults();
    var labels = data.map(function (d) { return d.hora; });
    var values = data.map(function (d) { return d.count; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self   = this;
    var colors = values.map(function (v) {
      return v >= maxVal * 0.8 ? self.COLORS.green
           : v >= maxVal * 0.4 ? self.COLORS.blue
           : self.COLORS.muted;
    });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, barPercentage: 0.65 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { display: false },
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#8A98B0' } }
        },
        plugins: { tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + ' registros'; } } }) }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ============================================================
  // SPARKLINE
  // ============================================================
  sparkline: function (canvasId, data, color) {
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'line',
      data: {
        labels: data.map(function () { return ''; }),
        datasets: [{ data: data, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false }]
      },
      options: {
        responsive: false,
        scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { enabled: false } }
      }
    });
  },

  // ============================================================
  // BAR LABELS PLUGIN — sempre preto, sempre acima
  // ============================================================
  _barLabelsPlugin: function (suffix) {
    var s = suffix || '';
    return {
      id: 'nexoBarLabels',
      afterDraw: function (chart) {
        var ctx  = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        if (!meta || meta.type !== 'bar') return;
        meta.data.forEach(function (bar, i) {
          var v = chart.data.datasets[0].data[i];
          if (v === undefined || v === null || v === 0) return;
          ctx.save();
          ctx.font      = "600 10px 'Outfit', sans-serif";
          ctx.fillStyle = '#1F2937';  // sempre escuro — aprovado
          ctx.textAlign = 'center';
          ctx.fillText(String(v) + s, bar.x, bar.y - 4);  // sempre acima
          ctx.restore();
        });
      }
    };
  }
};
