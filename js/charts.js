// ============================================================
// NEXO Intelligence Web v2 — Chart Factory
// Versão original + correções:
//   1. Eixos Y e Y2 dos evolutivos com display:false (sem números laterais)
//   2. Rótulos acima das barras em cor escura, sem quebra/colisão
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
    Chart.defaults.font.family = "'Outfit', sans-serif";
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
  // CORREÇÃO 1: y e y2 com display:false — remove os números laterais completamente
  // CORREÇÃO 2: rótulos escuros acima, sem quebrar
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
          {
            type: 'bar', label: 'Mês', data: values,
            backgroundColor: color + 'CC', borderRadius: 4,
            barPercentage: 0.55, yAxisID: 'y', order: 2
          },
          {
            type: 'line', label: 'Acumulado', data: accValues,
            borderColor: Charts.COLORS.gold, borderWidth: 2,
            pointRadius: 4, pointBackgroundColor: Charts.COLORS.gold,
            pointBorderColor: '#fff', pointBorderWidth: 1.5,
            tension: 0.3, fill: false, yAxisID: 'y2', order: 1
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          // CORREÇÃO 1: display:false remove ambos os eixos numéricos laterais
          y:  { display: false, beginAtZero: true },
          y2: { display: false, beginAtZero: true },
          x:  {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#8A98B0' }
          }
        },
        plugins: {
          legend: {
            display: true, position: 'top', align: 'center',
            labels: {
              font: { size: 10 }, color: '#5A6A85',
              boxWidth: 10, boxHeight: 10, padding: 12,
              usePointStyle: true, pointStyle: 'rectRounded'
            }
          },
          tooltip: {
            backgroundColor: Charts.COLORS.navy,
            titleColor: Charts.COLORS.gold,
            bodyColor: 'rgba(255,255,255,0.78)',
            borderColor: 'rgba(201,168,76,0.25)', borderWidth: 1,
            padding: 10, cornerRadius: 8,
            mode: 'index', intersect: false
          }
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ---- DIA DA SEMANA % ----
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
          y: { display: false },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        },
        plugins: {
          tooltip: {
            backgroundColor: Charts.COLORS.navy,
            callbacks: { label: function(ctx) { return ctx.parsed.y + '%'; } }
          }
        }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
  },

  // ---- DIA DA SEMANA Kg ----
  diaSemanaKg: function(canvasId, data) {
    this._defaults();
    var labels = data.map(function(d) { return d.dia; });
    var values = data.map(function(d) { return d.kg; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self = this;
    var colors = values.map(function(v) {
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
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        },
        plugins: {
          tooltip: {
            backgroundColor: Charts.COLORS.navy,
            callbacks: { label: function(ctx) { return ctx.parsed.y + ' kg'; } }
          }
        }
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
        layout: { padding: { right: 36 } },
        scales: {
          x: { display: false },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        },
        plugins: {
          tooltip: {
            backgroundColor: Charts.COLORS.navy,
            callbacks: { label: function(ctx) { return ctx.parsed.x + '%'; } }
          }
        }
      },
      plugins: [{
        id: 'hbarPct',
        afterDraw: function(chart) {
          var ctx = chart.ctx;
          chart.data.datasets[0].data.forEach(function(v, i) {
            var bar = chart.getDatasetMeta(0).data[i];
            if (!bar) return;
            ctx.save();
            ctx.font = "600 10px 'Outfit', sans-serif";
            ctx.fillStyle = '#0C1425';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            ctx.fillText(v + '%', bar.x + 5, bar.y);
            ctx.restore();
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
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 2, borderColor: '#fff', cutout: '50%' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 10 } }
          }
        }
      }
    });
  },

  // ---- SPARKLINE ----
  sparkline: function(canvasId, data, color) {
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'line',
      data: {
        labels: data.map(function() { return ''; }),
        datasets: [{ data: data, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false }]
      },
      options: {
        responsive: false,
        scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { enabled: false } }
      }
    });
  },

  // ---- HORÁRIO DE CHEGADA ----
  horarioChegada: function(canvasId, data) {
    this._defaults();
    var labels = data.map(function(d) { return d.hora; });
    var values = data.map(function(d) { return d.count; });
    var maxVal = Math.max.apply(null, values) || 1;
    var self = this;
    var colors = values.map(function(v) {
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
          x: { grid: { display: false }, ticks: { font: { size: 9 } } }
        },
        plugins: {
          tooltip: {
            backgroundColor: Charts.COLORS.navy,
            callbacks: { label: function(ctx) { return ctx.parsed.y + ' registros'; } }
          }
        }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ---- BAR LABELS PLUGIN ----
  // CORREÇÃO 2: rótulos escuros (#0C1425), posicionados acima sem quebrar
  // Lógica: se a barra tem altura >= 32px, rótulo dentro (branco)
  //         se barra pequena, rótulo acima (escuro) com clearance mínimo de 4px
  _barLabelsPlugin: function(suffix) {
    var s = suffix || '';
    return {
      id: 'nexoBarLabels',
      afterDraw: function(chart) {
        var ctx = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        if (!meta || meta.type !== 'bar') return;

        meta.data.forEach(function(bar, i) {
          var v = chart.data.datasets[0].data[i];
          if (v === undefined || v === null || v === 0) return;

          var label = String(v) + s;
          var barH  = bar.base - bar.y;  // altura em pixels

          ctx.save();
          ctx.font      = "600 10px 'Outfit', sans-serif";
          ctx.textAlign = 'center';

          if (barH >= 32) {
            // Dentro da barra — branco
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.fillText(label, bar.x, bar.y + 13);
          } else {
            // Acima da barra — escuro, sem colidir
            ctx.fillStyle = '#1E2432';
            ctx.fillText(label, bar.x, bar.y - 4);
          }
          ctx.restore();
        });
      }
    };
  }
};
