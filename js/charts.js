// ============================================================
// NEXO Intelligence Web v2.2 — Chart Factory Premium
// Gradientes em todas as barras/linhas | Outfit font
// Tooltip navy+gold | Eixo y2 explícito e funcional
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
    g.addColorStop(0, colorHex + '40');
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

  // ── Eixo Y base ───────────────────────────────────────────
  _yAxis: function (suffix, opts) {
    return Object.assign({
      display: true,
      border: { display: false },
      grid: { color: 'rgba(12,20,37,0.04)', drawTicks: false },
      ticks: {
        font: { family: 'Outfit', size: 10 },
        color: '#8A98B0', padding: 6,
        callback: suffix ? function (v) { return v + suffix; } : undefined
      }
    }, opts || {});
  },

  // ── Eixo X base ───────────────────────────────────────────
  _xAxis: function () {
    return {
      display: true,
      border: { display: false },
      grid: { display: false },
      ticks: { font: { family: 'Outfit', size: 10 }, color: '#8A98B0', padding: 4 }
    };
  },

  // ── Bar labels plugin ─────────────────────────────────────
  _barLabelsPlugin: function (suffix) {
    var s = suffix || '';
    return {
      id: 'barLabels',
      afterDraw: function (chart) {
        var ctx = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        if (!meta || meta.type !== 'bar') return;
        meta.data.forEach(function (bar, i) {
          var v = chart.data.datasets[0].data[i];
          if (v === undefined || v === null) return;
          ctx.save();
          ctx.font = "600 9px 'Outfit', sans-serif";
          ctx.fillStyle = '#0C1425';
          ctx.textAlign = 'center';
          ctx.fillText(v + s, bar.x, bar.y - 4);
          ctx.restore();
        });
      }
    };
  },

  // ============================================================
  // EVOLUTIVO MENSAL — bar gradiente + linha acumulado gold
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

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Mês', data: values,
            backgroundColor: barGrad,
            borderColor: barColor, borderWidth: 1,
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
          y: this._yAxis(null, { position: 'left', beginAtZero: true }),
          y2: this._yAxis(null, {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false, drawTicks: false },
            ticks: { font: { family: 'Outfit', size: 10 }, color: '#C9A84C', padding: 6 }
          }),
          x: this._xAxis()
        },
        plugins: {
          legend: {
            display: true, position: 'top', align: 'end',
            labels: {
              font: { family: 'Outfit', size: 10 }, color: '#8A98B0',
              boxWidth: 10, padding: 12,
              usePointStyle: true, pointStyle: 'circle'
            }
          },
          tooltip: this._tooltip()
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ============================================================
  // DIA DA SEMANA % — barras gradiente semântico
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

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values, backgroundColor: colors,
          borderRadius: 6, borderSkipped: false, barPercentage: 0.6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          y: this._yAxis('%', { beginAtZero: true }),
          x: this._xAxis()
        },
        plugins: {
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + '%'; } } })
        }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
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
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, barPercentage: 0.6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          y: this._yAxis(' kg', { beginAtZero: true }),
          x: this._xAxis()
        },
        plugins: {
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + ' kg'; } } })
        }
      },
      plugins: [this._barLabelsPlugin(' kg')]
    });
  },

  // ============================================================
  // MOTIVOS BAR — horizontal, gradiente
  // ============================================================
  motivosBar: function (canvasId, motivos) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var sorted = Object.entries(motivos).sort(function (a, b) { return b[1] - a[1]; });
    var total  = sorted.reduce(function (s, e) { return s + e[1]; }, 0);
    var labels = sorted.map(function (e) { return e[0]; });
    var values = sorted.map(function (e) { return Utils.pct(e[1], total); });

    var baseColors = [
      this.COLORS.red, this.COLORS.orange, this.COLORS.orange,
      this.COLORS.gold, this.COLORS.blue, '#A0AEC0', '#CBD5E1'
    ];
    var colors = labels.map(function (_, i) {
      var base = baseColors[i % baseColors.length];
      var g = ctx.createLinearGradient(200, 0, 0, 0);
      g.addColorStop(0, base + 'EE');
      g.addColorStop(1, base + '44');
      return g;
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, borderSkipped: false, barPercentage: 0.55 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          x: this._yAxis('%'),
          y: {
            display: true, border: { display: false }, grid: { display: false },
            ticks: { font: { family: 'Outfit', size: 10 }, color: '#4A5A75' }
          }
        },
        plugins: {
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.x + '%'; } } })
        }
      },
      plugins: [{
        id: 'hbarLabels',
        afterDraw: function (chart) {
          var ctx2 = chart.ctx;
          chart.data.datasets[0].data.forEach(function (v, i) {
            var bar = chart.getDatasetMeta(0).data[i];
            ctx2.save();
            ctx2.font = "600 10px 'Outfit', sans-serif";
            ctx2.fillStyle = '#0C1425';
            ctx2.textBaseline = 'middle';
            ctx2.fillText(v + '%', bar.x + 5, bar.y);
            ctx2.restore();
          });
        }
      }]
    });
  },

  // ============================================================
  // MOTIVOS DONUT
  // ============================================================
  motivosDonut: function (canvasId, motivos) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var sorted = Object.entries(motivos).sort(function (a, b) { return b[1] - a[1]; });
    var total  = sorted.reduce(function (s, e) { return s + e[1]; }, 0);
    var labels = sorted.map(function (e) { return e[0]; });
    var values = sorted.map(function (e) { return Utils.pct(e[1], total); });
    var palette = [
      this.COLORS.red, '#E67E22', this.COLORS.orange,
      this.COLORS.gold, this.COLORS.blue, this.COLORS.purple, '#A0AEC0'
    ];

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2, borderColor: '#fff', cutout: '52%'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900 },
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: {
              usePointStyle: true, pointStyle: 'circle',
              padding: 10, font: { family: 'Outfit', size: 10 }, color: '#4A5A75'
            }
          },
          tooltip: this._tooltip()
        }
      }
    });
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
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, barPercentage: 0.65 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          y: this._yAxis(null, { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Outfit', size: 10 }, color: '#8A98B0', padding: 6 } }),
          x: this._xAxis()
        },
        plugins: {
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + ' registros'; } } })
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ============================================================
  // SPARKLINE — linha minimalista com área gradiente
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
        datasets: [{
          data: data,
          borderColor: c, backgroundColor: areaGrad,
          borderWidth: 1.8, pointRadius: 0, tension: 0.42, fill: true
        }]
      },
      options: {
        responsive: false,
        scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { enabled: false } },
        animation: { duration: 600 }
      }
    });
  }
};
