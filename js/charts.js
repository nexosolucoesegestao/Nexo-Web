// ============================================================
// NEXO Intelligence Web v2 — Chart Factory
// Builders reutilizáveis para gráficos em todas as telas KPI
// ============================================================
const Charts = {

  COLORS: {
    navy: '#0C1425', gold: '#C9A84C', red: '#E74C3C',
    green: '#27AE60', blue: '#3498DB', orange: '#F39C12',
    purple: '#8E44AD', muted: '#6B7280',
    redBg: 'rgba(231,76,60,0.07)', greenBg: 'rgba(39,174,96,0.07)',
    orangeBg: 'rgba(243,156,18,0.07)', blueBg: 'rgba(52,152,219,0.07)'
  },

  _defaults() {
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#6B7280';
    Chart.defaults.plugins.legend.display = false;
  },

  // Color by threshold
  colorByVal(val, thresholds) {
    // thresholds = { bad: 15, warn: 10 } → red if >= bad, orange if >= warn, green otherwise
    if (val >= thresholds.bad) return this.COLORS.red;
    if (val >= thresholds.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },

  colorByValInverted(val, thresholds) {
    // For disponibilidade: lower = worse → thresholds = { bad: 70, warn: 80 }
    if (val < thresholds.bad) return this.COLORS.red;
    if (val < thresholds.warn) return this.COLORS.orange;
    return this.COLORS.green;
  },

  // ---- EVOLUTIVO MENSAL (bar + line acumulado) ----
  evolutivoMensal(canvasId, data, color) {
    this._defaults();
    const labels = data.map(d => d.label);
    const values = data.map(d => d.valor || d.taxa);
    let acc = 0;
    const accValues = values.map(v => { acc += v; return acc; });

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Mês', data: values, backgroundColor: color + 'CC', borderRadius: 4, barPercentage: 0.55, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'Acumulado', data: accValues, borderColor: this.COLORS.navy, borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: 'y2', order: 1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 9 } } },
          y2: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { font: { size: 9 }, color: this.COLORS.navy } },
          x: { grid: { display: false }, ticks: { font: { size: 9 } } }
        },
        plugins: { tooltip: { backgroundColor: this.COLORS.navy, mode: 'index', intersect: false } }
      },
      plugins: [this._barLabelsPlugin()]
    });
  },

  // ---- DIA DA SEMANA (barras verticais) ----
  diaSemana(canvasId, data, thresholds) {
    this._defaults();
    const labels = data.map(d => d.dia);
    const values = data.map(d => d.taxa);
    const colors = values.map(v => this.colorByVal(v, thresholds || { bad: 20, warn: 14 }));

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { min: 0, ticks: { callback: v => v + '%', font: { size: 9 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        },
        plugins: { tooltip: { backgroundColor: this.COLORS.navy, callbacks: { label: ctx => ctx.parsed.y + '%' } } }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
  },

  // ---- MOTIVOS (horizontal bar) ----
  motivosBar(canvasId, motivos) {
    this._defaults();
    const sorted = Object.entries(motivos).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const labels = sorted.map(([k]) => k);
    const values = sorted.map(([, v]) => Utils.pct(v, total));
    const palette = [this.COLORS.red, this.COLORS.orange, this.COLORS.orange, '#D4AC6E', this.COLORS.blue, '#CBD5E1'];

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderRadius: 5, barPercentage: 0.55 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { callback: v => v + '%', font: { size: 9 } } },
          y: { grid: { display: false }, ticks: { font: { size: 9 } } }
        },
        plugins: { tooltip: { backgroundColor: this.COLORS.navy, callbacks: { label: ctx => ctx.parsed.x + '%' } } }
      },
      plugins: [{
        afterDraw(chart) {
          const ctx = chart.ctx;
          chart.data.datasets[0].data.forEach((v, i) => {
            const bar = chart.getDatasetMeta(0).data[i];
            ctx.save(); ctx.font = "600 10px 'DM Sans'"; ctx.fillStyle = '#0C1425';
            ctx.textBaseline = 'middle'; ctx.fillText(v + '%', bar.x + 5, bar.y); ctx.restore();
          });
        }
      }]
    });
  },

  // ---- MOTIVOS DONUT ----
  motivosDonut(canvasId, motivos) {
    this._defaults();
    const sorted = Object.entries(motivos).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const labels = sorted.map(([k]) => k);
    const values = sorted.map(([, v]) => Utils.pct(v, total));
    const palette = [this.COLORS.red, '#E67E22', this.COLORS.orange, this.COLORS.gold, this.COLORS.blue];

    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: palette.slice(0, labels.length), borderWidth: 2, borderColor: '#fff', cutout: '50%' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 10 } } } }
      }
    });
  },

  // ---- SPARKLINE ----
  sparkline(canvasId, data, color) {
    return new Chart(document.getElementById(canvasId).getContext('2d'), {
      type: 'line',
      data: { labels: data.map(() => ''), datasets: [{ data, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false }] },
      options: { responsive: false, scales: { x: { display: false }, y: { display: false } }, plugins: { tooltip: { enabled: false } } }
    });
  },

  // ---- Bar labels plugin ----
  _barLabelsPlugin(suffix) {
    return {
      afterDraw(chart) {
        const ctx = chart.ctx;
        const s = suffix || '';
        chart.data.datasets[0].data.forEach((v, i) => {
          const bar = chart.getDatasetMeta(0).data[i];
          if (!bar) return;
          ctx.save(); ctx.font = "600 9px 'DM Sans'"; ctx.fillStyle = '#0C1425'; ctx.textAlign = 'center';
          ctx.fillText(v + s, bar.x, bar.y - 4); ctx.restore();
        });
      }
    };
  }
};
