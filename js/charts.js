// ============================================================
// NEXO Intelligence Web v2 — Chart Factory
// Builders reutilizaveis para graficos em todas as telas KPI
// ============================================================
var Charts = {

  COLORS: {
    navy: '#0C1425', gold: '#C9A84C', red: '#E74C3C',
    green: '#27AE60', blue: '#3498DB', orange: '#F39C12',
    purple: '#8E44AD', muted: '#6B7280',
    redBg: 'rgba(231,76,60,0.07)', greenBg: 'rgba(39,174,96,0.07)',
    orangeBg: 'rgba(243,156,18,0.07)', blueBg: 'rgba(52,152,219,0.07)'
  },

  _defaults: function() {
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#6B7280';
    Chart.defaults.plugins.legend.display = false;
  },

  colorByVal: function(val, thresholds) {
    if (val >= thresholds.bad) return this.COLORS.red;
    if (val >= thresholds.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },

  colorByValInverted: function(val, thresholds) {
    if (val < thresholds.bad) return this.COLORS.red;
    if (val < thresholds.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },

  // ---- EVOLUTIVO MENSAL (bar + line acumulado) ----
  evolutivoMensal: function(canvasId, data, color) {
    this._defaults();
    var labels = data.map(function(d) { return d.label; });
    var values = data.map(function(d) { return d.valor || d.taxa; });
    var acc = 0;
    var accValues = values.map(function(v) { acc += v; return acc; });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { type: 'bar', label: 'Mes', data: values, backgroundColor: color + 'CC', borderRadius: 4, barPercentage: 0.55, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'Acumulado', data: accValues, borderColor: Charts.COLORS.navy, borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: 'y2', order: 1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 9 } } },
          y2: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { font: { size: 9 }, color: Charts.COLORS.navy } },
          x: { grid: { display: false }, ticks: { font: { size: 9 } } }
        },
        plugins: { tooltip: { backgroundColor: Charts.COLORS.navy, mode: 'index', intersect: false } }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ---- DIA DA SEMANA % (barras verticais) ----
  diaSemana: function(canvasId, data, thresholds) {
    this._defaults();
    var labels = data.map(function(d) { return d.dia; });
    var values = data.map(function(d) { return d.taxa; });
    var th = thresholds || { bad: 20, warn: 14 };
    var self = this;
    var colors = values.map(function(v) { return self.colorByVal(v, th); });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { min: 0, ticks: { callback: function(v) { return v + '%'; }, font: { size: 9 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        },
        plugins: { tooltip: { backgroundColor: Charts.COLORS.navy, callbacks: { label: function(ctx) { return ctx.parsed.y + '%'; } } } }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
  },

  // ---- DIA DA SEMANA Kg (barras verticais para quebra) ----
  diaSemanaKg: function(canvasId, data) {
    this._defaults();
    var labels = data.map(function(d) { return d.dia; });
    var values = data.map(function(d) { return d.kg; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self = this;
    var colors = values.map(function(v) { return v >= maxVal * 0.8 ? self.COLORS.red : v >= maxVal * 0.5 ? self.COLORS.orange : self.COLORS.purple; });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { min: 0, ticks: { callback: function(v) { return v + ' kg'; }, font: { size: 9 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        },
        plugins: { tooltip: { backgroundColor: Charts.COLORS.navy, callbacks: { label: function(ctx) { return ctx.parsed.y + ' kg'; } } } }
      },
      plugins: [this._barLabelsPlugin(' kg')]
    });
  },

  // ---- MOTIVOS (horizontal bar) ----
  motivosBar: function(canvasId, motivos) {
    this._defaults();
    var sorted = Object.entries(motivos).sort(function(a, b) { return b[1] - a[1]; });
    var total = sorted.reduce(function(s, e) { return s + e[1]; }, 0);
    var labels = sorted.map(function(e) { return e[0]; });
    var values = sorted.map(function(e) { return Utils.pct(e[1], total); });
    var palette = [this.COLORS.red, this.COLORS.orange, this.COLORS.orange, '#D4AC6E', this.COLORS.blue, '#CBD5E1', '#A0AEC0'];

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderRadius: 5, barPercentage: 0.55 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { callback: function(v) { return v + '%'; }, font: { size: 9 } } },
          y: { grid: { display: false }, ticks: { font: { size: 9 } } }
        },
        plugins: { tooltip: { backgroundColor: Charts.COLORS.navy, callbacks: { label: function(ctx) { return ctx.parsed.x + '%'; } } } }
      },
      plugins: [{
        afterDraw: function(chart) {
          var ctx = chart.ctx;
          chart.data.datasets[0].data.forEach(function(v, i) {
            var bar = chart.getDatasetMeta(0).data[i];
            ctx.save(); ctx.font = "600 10px 'DM Sans'"; ctx.fillStyle = '#0C1425';
            ctx.textBaseline = 'middle'; ctx.fillText(v + '%', bar.x + 5, bar.y); ctx.restore();
          });
        }
      }]
    });
  },

  // ---- MOTIVOS DONUT ----
  motivosDonut: function(canvasId, motivos) {
    this._defaults();
    var sorted = Object.entries(motivos).sort(function(a, b) { return b[1] - a[1]; });
    var total = sorted.reduce(function(s, e) { return s + e[1]; }, 0);
    var labels = sorted.map(function(e) { return e[0]; });
    var values = sorted.map(function(e) { return Utils.pct(e[1], total); });
    var palette = [this.COLORS.red, '#E67E22', this.COLORS.orange, this.COLORS.gold, this.COLORS.blue, this.COLORS.purple, '#CBD5E1'];

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 2, borderColor: '#fff', cutout: '50%' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 10 } } } } }
    });
  },

  // ---- SPARKLINE ----
  sparkline: function(canvasId, data, color) {
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'line',
      data: { labels: data.map(function() { return ''; }), datasets: [{ data: data, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false }] },
      options: { responsive: false, scales: { x: { display: false }, y: { display: false } }, plugins: { tooltip: { enabled: false } } }
    });
  },
// ---- HORARIO DE CHEGADA (barras verticais) ----
  horarioChegada: function(canvasId, data) {
    this._defaults();
    var labels = data.map(function(d) { return d.hora; });
    var values = data.map(function(d) { return d.count; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self = this;
    var colors = values.map(function(v) {
      return v >= maxVal * 0.8 ? self.COLORS.green : v >= maxVal * 0.4 ? self.COLORS.blue : self.COLORS.muted;
    });
 
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, barPercentage: 0.65 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { min: 0, ticks: { stepSize: 1, font: { size: 9 } } },
          x: { grid: { display: false }, ticks: { font: { size: 9 } } }
        },
        plugins: { tooltip: { backgroundColor: Charts.COLORS.navy, callbacks: { label: function(ctx) { return ctx.parsed.y + ' registros'; } } } }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },
  // ---- Bar labels plugin ----
  _barLabelsPlugin: function(suffix) {
    return {
      afterDraw: function(chart) {
        var ctx = chart.ctx;
        var s = suffix || '';
        chart.data.datasets[0].data.forEach(function(v, i) {
          var bar = chart.getDatasetMeta(0).data[i];
          if (!bar) return;
          ctx.save(); ctx.font = "600 9px 'DM Sans'"; ctx.fillStyle = '#0C1425'; ctx.textAlign = 'center';
          ctx.fillText(v + s, bar.x, bar.y - 4); ctx.restore();
        });
      }
    };
  }
};
