// ============================================================
// NEXO Intelligence Web v2 — Página OnePage (Painel de Avião)
// Consolidado com destaques de cada KPI
// ============================================================
(function() {

  Router.register('onepage', async function(container) {

    container.innerHTML = `
      <div class="toolbar anim">
        <div class="period-pills">
          <button class="pp" data-d="7">7d</button>
          <button class="pp active" data-d="15">15d</button>
          <button class="pp" data-d="30">30d</button>
          <button class="pp" data-d="60">60d</button>
          <button class="pp" data-d="90">90d</button>
        </div>
      </div>

      <div class="page-loading" id="onepageLoading">Carregando indicadores...</div>
      <div id="onepageContent" style="display:none">

        <!-- Score + KPI Cards -->
        <div class="score-section anim d1">
          <div class="score-card">
            <div class="score-ring-container"><canvas id="opScoreRing"></canvas>
              <div class="score-center"><div class="score-value" id="opScoreVal">—</div><div class="score-label">SCORE GERAL</div></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="card" style="border-top:3px solid var(--red);padding:20px">
              <div style="font-size:11px;color:var(--muted)">Ruptura</div>
              <div style="font-size:28px;font-weight:700;color:var(--navy)" id="opRupTaxa">—</div>
              <div class="strip-bn-delta" id="opRupVar">—</div>
            </div>
            <div class="card" style="border-top:3px solid var(--orange);padding:20px">
              <div style="font-size:11px;color:var(--muted)">Disp. AT</div>
              <div style="font-size:28px;font-weight:700;color:var(--navy)" id="opATTaxa">—</div>
              <div class="strip-bn-delta" id="opATVar">—</div>
            </div>
            <div class="card" style="border-top:3px solid var(--blue);padding:20px">
              <div style="font-size:11px;color:var(--muted)">Disp. AS</div>
              <div style="font-size:28px;font-weight:700;color:var(--navy)" id="opASTaxa">—</div>
              <div class="strip-bn-delta" id="opASVar">—</div>
            </div>
            <div class="card" style="border-top:3px solid var(--green);padding:20px">
              <div style="font-size:11px;color:var(--muted)">Temperatura</div>
              <div style="font-size:28px;font-weight:700;color:var(--navy)" id="opTempTaxa">—</div>
              <div class="strip-bn-delta" id="opTempVar">—</div>
            </div>
          </div>
        </div>

        <!-- Destaques -->
        <div class="section-title anim d2"><span class="st-icon">⚡</span> Destaques do período</div>
        <div id="opDestaques" class="anim d2" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px"></div>
      </div>
    `;

    const filters = { desde: Utils.daysAgo(90) };
    const disponibilidade = await API.getDisponibilidade(filters);
    const result = Engine.processRuptura(disponibilidade, 15);

    const score = Math.round((result.dispAT.taxa + result.dispAS.taxa + (100 - result.ruptura.taxa)) / 3);

    document.getElementById('opScoreVal').textContent = score;
    document.getElementById('opRupTaxa').textContent = result.ruptura.taxa + '%';
    document.getElementById('opATTaxa').textContent = result.dispAT.taxa + '%';
    document.getElementById('opASTaxa').textContent = result.dispAS.taxa + '%';
    document.getElementById('opTempTaxa').textContent = '—';

    new Chart(document.getElementById('opScoreRing').getContext('2d'), {
      type: 'doughnut',
      data: { datasets: [{ data: [score, 100 - score], backgroundColor: [Charts.COLORS.gold, 'rgba(0,0,0,0.04)'], borderWidth: 0, cutout: '78%' }] },
      options: { responsive: false, plugins: { tooltip: { enabled: false } } }
    });

    // Destaques rápidos
    const destaques = [];
    const worstProd = result.ruptura.rankProdutos[0];
    if (worstProd) destaques.push({ icon: '🚨', text: worstProd.nome + ' lidera ruptura com ' + worstProd.taxa + '%', color: 'var(--red)' });
    const worstLoja = result.ruptura.rankLojas[0];
    if (worstLoja) destaques.push({ icon: '🏪', text: worstLoja.nome + ' tem a pior taxa: ' + worstLoja.taxa + '%', color: 'var(--orange)' });
    const bestLojaAT = result.dispAT.rankLojas[result.dispAT.rankLojas.length - 1];
    if (bestLojaAT) destaques.push({ icon: '⭐', text: bestLojaAT.nome + ' lidera disp. AT com ' + bestLojaAT.taxa + '%', color: 'var(--green)' });

    let dHtml = '';
    destaques.forEach(d => {
      dHtml += '<div class="card" style="padding:16px;border-left:3px solid ' + d.color + '">' +
        '<span style="font-size:18px">' + d.icon + '</span> <span style="font-size:13px;font-weight:500">' + d.text + '</span></div>';
    });
    document.getElementById('opDestaques').innerHTML = dHtml || '<div class="page-loading">Sem dados suficientes para destaques.</div>';

    document.getElementById('onepageLoading').style.display = 'none';
    document.getElementById('onepageContent').style.display = '';

    UI.initPeriodPills(() => Router.pages['onepage'](container));
  });
})();
