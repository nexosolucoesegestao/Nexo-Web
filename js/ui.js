// ============================================================
// NEXO Intelligence Web v2 — UI Components
// Visual Premium aprovado 14/Abr/2026:
//   - font-variant-numeric: tabular-nums nas tabelas
//   - Heatmap: semáforo mantido (aprovação negada)
//   - Cores dessaturadas nas mini-barras dos rankings
// ============================================================
const UI = {

  // ---- RANKING TABLE ----
  renderRanking(containerId, data, opts) {
    const inv    = opts && opts.inverted;
    const maxBar = (opts && opts.maxBar) || (inv ? 100 : 30);
    const tbody  = document.querySelector('#' + containerId + ' tbody');
    if (!tbody) return;

    let html = '';
    data.forEach(r => {
      const barW     = Math.min((r.taxa / maxBar) * 100, 100);
      const barColor = inv
        ? Charts.colorByValInverted(r.taxa, { bad: 70, warn: 80 })
        : Charts.colorByVal(r.taxa, { bad: 15, warn: 10 });

      const isGood  = inv ? r.variacao > 0 : r.variacao < 0;
      const isBad   = inv ? r.variacao < 0 : r.variacao > 0;
      const varClass = isGood ? 'up' : isBad ? 'down' : 'eq';
      const varSign  = r.variacao > 0 ? '+' : '';

      // font-variant-numeric: tabular-nums para alinhamento perfeito
      html += '<tr>' +
        '<td class="name">' + r.nome + '</td>' +
        '<td class="val" style="font-variant-numeric:tabular-nums">' + r.taxa + '%</td>' +
        '<td class="bar-cell"><div class="mini-bar"><div class="mini-bar-fill" style="width:' + barW + '%;background:' + barColor + '"></div></div></td>' +
        '<td><span class="var-chip ' + varClass + '" style="font-variant-numeric:tabular-nums">' + varSign + r.variacao + '</span></td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  },

  // ---- HEATMAP TABLE — semáforo mantido ----
  renderHeatmap(containerId, data) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let html = '<table class="hm-table"><thead><tr><th style="min-width:90px">Produto</th>';
    dias.forEach(d => { html += '<th>' + d + '</th>'; });
    html += '</tr></thead><tbody>';

    data.forEach(row => {
      html += '<tr><td>' + row.produto + '</td>';
      row.dias.forEach(val => {
        html += '<td style="' + this._heatColor(val) + '">' + val + '%</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
  },

  // Heatmap semáforo — mantido conforme validação
  _heatColor(v) {
    if (v >= 20) return 'background:rgba(192,80,77,0.72);color:#fff';
    if (v >= 14) return 'background:rgba(201,123,44,0.55);color:#1F2937';
    if (v >= 8)  return 'background:rgba(201,123,44,0.22);color:#1F2937';
    if (v >= 4)  return 'background:rgba(45,134,83,0.14);color:#1F2937';
    return 'background:rgba(45,134,83,0.04);color:#9CA3AF';
  },

  // ---- UPDATE BIG NUMBERS IN STRIP ----
  updateStripBN(stripId, taxa, variacao) {
    const strip = document.getElementById(stripId);
    if (!strip) return;
    const bnVal   = strip.querySelector('.strip-bn-val');
    const bnDelta = strip.querySelector('.strip-bn-delta');
    if (bnVal) bnVal.textContent = taxa + '%';
    if (bnDelta) {
      const sign = variacao > 0 ? '▲ +' : variacao < 0 ? '▼ ' : '';
      bnDelta.textContent = sign + variacao + ' p.p.';
      bnDelta.className   = 'strip-bn-delta ' + (variacao > 0 ? 'down' : variacao < 0 ? 'up' : 'neutral');
    }
  },

  // ---- LOJA FILTER DROPDOWN ----
  populateLojaFilter(selectId, lojas) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="all">Todas as lojas</option>';
    lojas.forEach(l => {
      sel.innerHTML += '<option value="' + l.id + '">' + l.nome + '</option>';
    });
  },

  // ---- NAVIGATION ----
  initNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        window.location.hash = '#/' + item.dataset.page;
      });
    });
  },

  // ---- PERIOD PILLS ----
  initPeriodPills(callback) {
    document.querySelectorAll('.pp').forEach(p => {
      p.addEventListener('click', function () {
        document.querySelectorAll('.pp').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        if (callback) callback(parseInt(this.dataset.d));
      });
    });
  }
};
