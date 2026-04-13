// ============================================================
// NEXO Intelligence Web v2.1 — Chart Factory Premium
// Gradientes em todas as barras e linhas — nunca cor sólida
// Fonte: Outfit | Tooltip padrão NEXO navy+gold
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

  // ── Tooltip padrão NEXO navy+gold ────────────────────────
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

  // ── Gradiente vertical para barras/área ──────────────────
  _gradV: function (ctx, colorTop, colorBot) {
    var h = (ctx.canvas && ctx.canvas.height) || 170;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, colorTop);
    g.addColorStop(1, colorBot);
    return g;
  },

  // ── Cor semântica por valor ───────────────────────────────
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

  // ── Eixos base ────────────────────────────────────────────
  _axisBase: function (suffix) {
    return {
      border: { display: false },
      grid: { color: 'rgba(12,20,37,0.045)', drawTicks: false },
      ticks: {
        font: { family: 'Outfit', size: 10 },
        color: '#8A98B0',
        padding: 6,
        callback: suffix ? function (v) { return v + suffix; } : undefined
      }
    };
  },
  _axisX: function () {
    return {
      border: { display: false },
      grid: { display: false },
      ticks: { font: { family: 'Outfit', size: 10 }, color: '#8A98B0', padding: 4 }
    };
  },

  // ── Bar labels plugin ─────────────────────────────────────
  _barLabelsPlugin: function (suffix) {
    var s = suffix || '';
    return {
      afterDraw: function (chart) {
        var ctx = chart.ctx;
        chart.data.datasets[0].data.forEach(function (v, i) {
          var bar = chart.getDatasetMeta(0).data[i];
          if (!bar) return;
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
  // EVOLUTIVO MENSAL — bar com gradiente + linha acumulado gold
  // ============================================================
  evolutivoMensal: function (canvasId, data, color) {
    this._defaults();
    var el  = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels    = data.map(function (d) { return d.label; });
    var values    = data.map(function (d) { return d.valor || d.taxa; });
    var acc = 0;
    var accValues = values.map(function (v) { acc += v; return acc; });

    // Gradiente da barra: cor passada + transparência
    var barGrad = this._gradV(ctx, (color || '#E24B4A') + 'DD', (color || '#E24B4A') + '22');

    // Gradiente área da linha acumulado
    var lineGrad = this._gradV(ctx, 'rgba(201,168,76,0.22)', 'rgba(201,168,76,0.01)');

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Mês', data: values,
            backgroundColor: barGrad,
            borderColor:      color || '#E24B4A',
            borderWidth: 1,
            borderRadius: 6, borderSkipped: false,
            barPercentage: 0.55, yAxisID: 'y', order: 2
          },
          {
            type: 'line', label: 'Acumulado', data: accValues,
            borderColor: '#C9A84C', backgroundColor: lineGrad,
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
        scales: {
          y:  Object.assign(this._axisBase('%'), {
            position: 'left',
            title: { display: false }
          }),
          y2: Object.assign({}, this._axisBase(), {
            position: 'right',
            grid: { drawOnChartArea: false }
          }),
          x: this._axisX()
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
  // DIA DA SEMANA % — barras com gradiente semântico
  // ============================================================
  diaSemana: function (canvasId, data, thresholds) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels = data.map(function (d) { return d.dia; });
    var values = data.map(function (d) { return d.taxa; });
    var th     = thresholds || { bad: 20, warn: 14 };
    var self   = this;

    // Gradiente individual por barra
    var colors = values.map(function (v) {
      var base = self.colorByVal(v, th);
      var g = ctx.createLinearGradient(0, 0, 0, 140);
      g.addColorStop(0, base + 'EE');
      g.addColorStop(1, base + '33');
      return g;
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 6, borderSkipped: false,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          y: this._axisBase('%'),
          x: this._axisX()
        },
        plugins: {
          tooltip: this._tooltip({
            callbacks: { label: function (ctx) { return ctx.parsed.y + '%'; } }
          })
        }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
  },

  // ============================================================
  // DIA DA SEMANA KG — barras purple/orange/red com gradiente
  // ============================================================
  diaSemanaKg: function (canvasId, data) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels = data.map(function (d) { return d.dia; });
    var values = data.map(function (d) { return d.kg; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self   = this;

    var colors = values.map(function (v) {
      var base = v >= maxVal * 0.8 ? self.COLORS.red :
                 v >= maxVal * 0.5 ? self.COLORS.orange : self.COLORS.purple;
      var g = ctx.createLinearGradient(0, 0, 0, 140);
      g.addColorStop(0, base + 'EE');
      g.addColorStop(1, base + '33');
      return g;
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 6, borderSkipped: false,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          y: this._axisBase(' kg'),
          x: this._axisX()
        },
        plugins: {
          tooltip: this._tooltip({
            callbacks: { label: function (ctx) { return ctx.parsed.y + ' kg'; } }
          })
        }
      },
      plugins: [this._barLabelsPlugin(' kg')]
    });
  },

  // ============================================================
  // MOTIVOS BAR — horizontal, palette gradiente
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
      this.COLORS.gold, this.COLORS.blue, '#CBD5E1', '#A0AEC0'
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
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 5, borderSkipped: false,
          barPercentage: 0.55
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          x: this._axisBase('%'),
          y: {
            border: { display: false },
            grid: { display: false },
            ticks: { font: { family: 'Outfit', size: 10 }, color: '#5A6A85' }
          }
        },
        plugins: {
          tooltip: this._tooltip({
            callbacks: { label: function (ctx) { return ctx.parsed.x + '%'; } }
          })
        }
      },
      plugins: [{
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
      this.COLORS.gold, this.COLORS.blue, this.COLORS.purple, '#CBD5E1'
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
              padding: 10, font: { family: 'Outfit', size: 10 }, color: '#5A6A85'
            }
          },
          tooltip: this._tooltip()
        }
      }
    });
  },

  // ============================================================
  // HORÁRIO DE CHEGADA — barras com gradiente green/blue/muted
  // ============================================================
  horarioChegada: function (canvasId, data) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var labels = data.map(function (d) { return d.hora; });
    var values = data.map(function (d) { return d.count; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self   = this;

    var colors = values.map(function (v) {
      var base = v >= maxVal * 0.8 ? self.COLORS.green :
                 v >= maxVal * 0.4 ? self.COLORS.blue  : self.COLORS.muted;
      var g = ctx.createLinearGradient(0, 0, 0, 140);
      g.addColorStop(0, base + 'EE');
      g.addColorStop(1, base + '33');
      return g;
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 6, borderSkipped: false,
          barPercentage: 0.65
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          y: Object.assign(this._axisBase(), {
            ticks: Object.assign({}, this._axisBase().ticks, { stepSize: 1 })
          }),
          x: this._axisX()
        },
        plugins: {
          tooltip: this._tooltip({
            callbacks: { label: function (ctx) { return ctx.parsed.y + ' registros'; } }
          })
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ============================================================
  // SPARKLINE — linha minimalista
  // ============================================================
  sparkline: function (canvasId, data, color) {
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');
    var grad = this._gradV(ctx, (color || '#C9A84C') + '55', (color || '#C9A84C') + '05');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(function () { return ''; }),
        datasets: [{
          data: data,
          borderColor: color || '#C9A84C',
          backgroundColor: grad,
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.42,
          fill: true
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
