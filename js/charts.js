// ============================================================
// NEXO Intelligence Web v2.6 — Chart Factory
// - Eixos Y: números sem linhas de grade/borda
// - Eixo X: type:'category' para labels corretos
// - Separador milhar pt-BR em eixos e rótulos
// - Rótulos: dentro da barra se pequena, acima se grande
// - Legendas: topo central, quadrados arredondados
// - motivosDonut/motivosBar → motivosHBar (barras horizontais)
// - Cross-filter via CustomEvent 'nexo:filter'
// ============================================================
var Charts = {

  COLORS: {
    navy:   '#0C1425', gold:   '#C9A84C', goldLight: '#E8C96A',
    red:    '#E24B4A', green:  '#22C55E', blue:   '#3498DB',
    orange: '#F59E0B', purple: '#8E44AD', muted:  '#8A98B0'
  },

  _defaults: function () {
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#8A98B0';
    Chart.defaults.plugins.legend.display = false;
  },

  _tooltip: function (extra) {
    return Object.assign({
      backgroundColor: '#0C1425', titleColor: '#C9A84C',
      bodyColor: 'rgba(255,255,255,0.78)',
      borderColor: 'rgba(201,168,76,0.25)', borderWidth: 1,
      padding: 12, cornerRadius: 10,
      titleFont: { family: 'Outfit', weight: '600', size: 12 },
      bodyFont:  { family: 'Outfit', size: 11 },
      mode: 'index', intersect: false
    }, extra || {});
  },

  // Legenda: topo central, quadrados arredondados pequenos
  _legend: function (extra) {
    return Object.assign({
      display: true, position: 'top', align: 'center',
      labels: {
        font: { family: 'Outfit', size: 10 }, color: '#5A6A85',
        boxWidth: 10, boxHeight: 10, padding: 14,
        usePointStyle: true, pointStyle: 'rectRounded'
      }
    }, extra || {});
  },

  // Eixo X: type:'category' obrigatório para labels de string
  _xAxis: function () {
    return {
      type:    'category',
      display: true,
      border:  { display: false },
      grid:    { display: false },
      ticks:   { font: { family: 'Outfit', size: 10 }, color: '#8A98B0', padding: 4 }
    };
  },

  // Eixo Y: números formatados, SEM linha de eixo e SEM grid
  _yAxis: function (color, opts) {
    return Object.assign({
      display: true,
      border:  { display: false },
      grid:    { display: false },
      ticks: {
        font: { family: 'Outfit', size: 10 },
        color: color || '#8A98B0',
        padding: 6,
        callback: function (v) {
          if (v === 0) return '0';
          return v >= 1000 ? v.toLocaleString('pt-BR') : v;
        }
      }
    }, opts || {});
  },

  _gradV: function (ctx, hex, aTop, aBot) {
    var h = (ctx.canvas && ctx.canvas.height) || 170;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hex + (aTop || 'EE'));
    g.addColorStop(1, hex + (aBot || '28'));
    return g;
  },

  _gradArea: function (ctx, hex) {
    var h = (ctx.canvas && ctx.canvas.height) || 170;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hex + '3A');
    g.addColorStop(1, hex + '05');
    return g;
  },

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

  // Rótulo inteligente: dentro da barra se barra for alta o suficiente,
  // acima caso contrário — evita colisão e quebra visual
  _barLabelsPlugin: function (suffix) {
    var s = suffix || '';
    return {
      id: 'barLbl_' + (s || 'none'),
      afterDraw: function (chart) {
        var ctx  = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        if (!meta || meta.type !== 'bar') return;

        // Altura total da área do gráfico
        var chartArea = chart.chartArea;
        var areaH = chartArea ? (chartArea.bottom - chartArea.top) : 170;

        meta.data.forEach(function (bar, i) {
          var raw = chart.data.datasets[0].data[i];
          if (raw === undefined || raw === null || raw === 0) return;

          // Formatar com milhar
          var display = raw;
          if (typeof raw === 'number' && raw >= 1000) {
            display = raw.toLocaleString('pt-BR');
          }
          var label = display + s;

          // Altura da barra
          var barH = bar.base - bar.y;
          // Se barra >= 28px: rótulo dentro, branco
          // Se barra < 28px: rótulo acima da barra, escuro
          var inside = barH >= 28;

          ctx.save();
          ctx.font      = "600 10px 'Outfit', sans-serif";
          ctx.textAlign = 'center';

          if (inside) {
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.fillText(label, bar.x, bar.y + 12);
          } else {
            ctx.fillStyle = '#0C1425';
            ctx.fillText(label, bar.x, bar.y - 5);
          }
          ctx.restore();
        });
      }
    };
  },

  _emitFilter: function (key, value) {
    if (!window.NEXO_FILTER) window.NEXO_FILTER = {};
    window.NEXO_FILTER[key] = value;
    document.dispatchEvent(new CustomEvent('nexo:filter', { detail: { key: key, value: value } }));
  },

  // ============================================================
  // EVOLUTIVO MENSAL — bar + linha acumulado gold
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

    var self  = this;
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
        animation:   { duration: 800, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        scales: {
          y:  this._yAxis('#8A98B0', { position: 'left',  beginAtZero: true }),
          y2: this._yAxis('#C9A84C', { position: 'right', beginAtZero: true,
                grid: { display: false, drawOnChartArea: false } }),
          x:  this._xAxis()
        },
        plugins: {
          legend:  this._legend(),
          tooltip: this._tooltip()
        },
        onClick: function (evt, elements) {
          if (!elements || !elements.length) return;
          var idx = elements[0].index;
          self._emitFilter('mes', labels[idx]);
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
  // DIA DA SEMANA %
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
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, barPercentage: 0.62 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
        scales: { x: this._xAxis(), y: { display: false } },
        plugins: {
          legend:  { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + '%'; } } })
        },
        onClick: function (evt, elements) {
          if (!elements || !elements.length) return;
          self._emitFilter('dia', labels[elements[0].index]);
        }
      },
      plugins: [this._barLabelsPlugin('%')]
    });
  },

  // ============================================================
  // DIA DA SEMANA KG
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
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false, barPercentage: 0.62 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
        scales: { x: this._xAxis(), y: { display: false } },
        plugins: {
          legend:  { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.y + ' kg'; } } })
        }
      },
      plugins: [this._barLabelsPlugin(' kg')]
    });
  },

  // ============================================================
  // MOTIVOS — barra horizontal com % em evidência
  // Substitui donut confuso — valores legíveis de imediato
  // ============================================================
  motivosDonut: function (canvasId, motivos) { return this.motivosHBar(canvasId, motivos); },
  motivosBar:   function (canvasId, motivos) { return this.motivosHBar(canvasId, motivos); },

  motivosHBar: function (canvasId, motivos) {
    this._defaults();
    var el = document.getElementById(canvasId);
    if (!el) return null;
    var ctx = el.getContext('2d');

    var sorted = Object.entries(motivos).sort(function (a, b) { return b[1] - a[1]; });
    var total  = sorted.reduce(function (s, e) { return s + e[1]; }, 0);
    var labels = sorted.map(function (e) { return e[0]; });
    var values = sorted.map(function (e) { return Math.round((e[1] / total) * 100); });

    var palette = ['#E24B4A','#F59E0B','#F59E0B','#C9A84C','#3498DB','#8E44AD','#8A98B0'];
    var colors  = labels.map(function (_, i) {
      var base = palette[i % palette.length];
      var g = ctx.createLinearGradient(280, 0, 0, 0);
      g.addColorStop(0, base + 'F0');
      g.addColorStop(1, base + '44');
      return g;
    });

    // Altura proporcional: 34px por item
    var dynH = Math.max(140, labels.length * 34 + 16);
    if (el.parentElement) el.parentElement.style.height = dynH + 'px';

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values, backgroundColor: colors,
          borderRadius: 6, borderSkipped: false, barPercentage: 0.68
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
        layout: { padding: { right: 40 } }, // espaço para o % após a barra
        scales: {
          x: { display: false },
          y: {
            display: true, border: { display: false }, grid: { display: false },
            ticks: { font: { family: 'Outfit', size: 11 }, color: '#4A5A75', padding: 8 }
          }
        },
        plugins: {
          legend:  { display: false },
          tooltip: this._tooltip({ callbacks: { label: function (c) { return c.parsed.x + '%'; } } })
        }
      },
      plugins: [{
        id: 'hbarPct',
        afterDraw: function (chart) {
          var ctx2 = chart.ctx;
          chart.data.datasets[0].data.forEach(function (v, i) {
            var bar = chart.getDatasetMeta(0).data[i];
            if (!bar || !v) return;
            ctx2.save();
            ctx2.font      = "700 11px 'Outfit', sans-serif";
            ctx2.fillStyle = '#0C1425';
            ctx2.textBaseline = 'middle';
            ctx2.textAlign = 'left';
            // Posiciona o % logo após o fim da barra com espaço fixo
            ctx2.fillText(v + '%', bar.x + 6, bar.y);
            ctx2.restore();
          });
        }
      }]
    });
  },

  // ============================================================
  // HORÁRIO DE CHEGADA (equipe)
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
        scales: { x: this._xAxis(), y: { display: false } },
        plugins: {
          legend:  { display: false },
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

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(function () { return ''; }),
        datasets: [{ data: data, borderColor: c, backgroundColor: this._gradArea(ctx, c), borderWidth: 1.8, pointRadius: 0, tension: 0.42, fill: true }]
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
