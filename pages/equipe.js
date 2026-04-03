// ============================================================
// NEXO Intelligence Web v2 — Pagina Equipe (Quadro de Pessoal)
// Template KPI padrao Seara (2 faixas + analise complementar)
// ============================================================
(function() {
  var currentPeriod = 15;
  var currentLoja = 'all';
  var chartInstances = [];

  function destroyCharts() {
    chartInstances.forEach(function(c) { if (c && c.destroy) c.destroy(); });
    chartInstances = [];
  }

  function updateDelta(elId, value, invertido) {
    var el = document.getElementById(elId);
    if (!el) return;
    // Para presenca: subir = bom (invertido=false). Para absenteismo: subir = ruim (invertido=true)
    var isGood = invertido ? value < 0 : value > 0;
    var isBad = invertido ? value > 0 : value < 0;
    var cls = isGood ? 'up' : isBad ? 'down' : 'eq';
    var sign = value > 0 ? '+' : '';
    el.className = 'strip-bn-delta ' + cls;
    el.textContent = sign + value + ' p.p.';
  }

  Router.register('equipe', async function(container) {
    destroyCharts();

    container.innerHTML =
      '<!-- TOOLBAR -->' +
      '<div class="toolbar anim">' +
        '<div class="period-pills">' +
          '<button class="pp" data-d="7">7d</button>' +
          '<button class="pp' + (currentPeriod === 15 ? ' active' : '') + '" data-d="15">15d</button>' +
          '<button class="pp' + (currentPeriod === 30 ? ' active' : '') + '" data-d="30">30d</button>' +
          '<button class="pp" data-d="60">60d</button>' +
          '<button class="pp" data-d="90">90d</button>' +
        '</div>' +
        '<select class="filter-select" id="filterLojaEq">' +
          '<option value="all">Todas as lojas</option>' +
        '</select>' +
      '</div>' +

      '<!-- FAIXA PRESENCA -->' +
      '<div class="strip eq anim d1" id="stripPresenca">' +
        '<div class="strip-header">' +
          '<div class="strip-icon eq">P</div>' +
          '<div><div class="strip-title">Presenca</div><div class="strip-subtitle">Equipe presente vs escala programada</div></div>' +
          '<div class="strip-bn">' +
            '<div class="strip-bn-item"><div class="strip-bn-label">TAXA ATUAL</div><div class="strip-bn-val" id="bnPresTaxa">&mdash;</div><div class="strip-bn-delta" id="bnPresVar">&mdash;</div></div>' +
            '<div class="strip-bn-item"><div class="strip-bn-label">TOTAL FALTAS</div><div class="strip-bn-val" id="bnPresFaltas">&mdash;</div><div class="strip-bn-delta neutral">no periodo</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="strip-body">' +
          '<div class="strip-col"><div class="strip-col-title">Evolutivo mensal</div><div class="evo-chart"><canvas id="evoPres"></canvas></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Ranking por loja</div><div class="rank-scroll" id="rankLojaPres"><table class="rt"><thead><tr><th>Loja</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Ranking por pessoa</div><div class="rank-scroll" id="rankPessoaPres"><table class="rt"><thead><tr><th>Funcionario</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>' +
        '</div>' +
      '</div>' +

      '<!-- FAIXA ABSENTEISMO -->' +
      '<div class="strip abs anim d2" id="stripAbsent">' +
        '<div class="strip-header">' +
          '<div class="strip-icon abs">A</div>' +
          '<div><div class="strip-title">Absenteismo</div><div class="strip-subtitle">Faltas e ausencias &mdash; impacto operacional</div></div>' +
          '<div class="strip-bn">' +
            '<div class="strip-bn-item"><div class="strip-bn-label">TAXA ATUAL</div><div class="strip-bn-val" id="bnAbsTaxa">&mdash;</div><div class="strip-bn-delta" id="bnAbsVar">&mdash;</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="strip-body">' +
          '<div class="strip-col"><div class="strip-col-title">Evolutivo mensal</div><div class="evo-chart"><canvas id="evoAbs"></canvas></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Ranking por loja</div><div class="rank-scroll" id="rankLojaAbs"><table class="rt"><thead><tr><th>Loja</th><th>Taxa</th><th></th><th>Var.</th></tr></thead><tbody></tbody></table></div></div>' +
          '<div class="strip-col"><div class="strip-col-title">Maiores faltantes</div><div class="rank-scroll" id="rankPessoaAbs"><table class="rt"><thead><tr><th>Funcionario</th><th>Faltas</th><th></th><th>Taxa</th></tr></thead><tbody></tbody></table></div></div>' +
        '</div>' +
      '</div>' +

      '<!-- ANALISE COMPLEMENTAR -->' +
      '<div class="section-title anim d3"><span class="st-icon">&#x1F3AF;</span> Analise complementar</div>' +
      '<div class="bottom-grid anim d3">' +
        '<div class="card"><div class="ch"><div><div class="ct">Motivos de falta</div><div class="cs">Por que a equipe falta?</div></div></div><div class="cb"><div class="chart-box" style="height:180px"><canvas id="chartMotFalta"></canvas></div></div></div>' +
        '<div class="card"><div class="ch"><div><div class="ct">Faltas por dia da semana</div><div class="cs">Padrao semanal de ausencia</div></div></div><div class="cb"><div class="chart-box" style="height:180px"><canvas id="chartDiaFalta"></canvas></div></div></div>' +
        '<div class="card"><div class="ch"><div><div class="ct">Horario de chegada</div><div class="cs">Distribuicao de pontualidade</div></div></div><div class="cb"><div class="chart-box" style="height:180px"><canvas id="chartHorario"></canvas></div></div></div>' +
      '</div>';

    // Populate loja filter
    var lojas = await API.getLojas(window.NEXO_REDE_ID);
    UI.populateLojaFilter('filterLojaEq', lojas);

    UI.initPeriodPills(async function(days) {
      currentPeriod = days;
      await loadData();
    });

    document.getElementById('filterLojaEq').addEventListener('change', async function() {
      currentLoja = this.value;
      API.clearCache();
      await loadData();
    });

    await loadData();

    async function loadData() {
      destroyCharts();

      var allFilters = {};
      if (currentLoja !== 'all') allFilters.lojaId = currentLoja;
      var presenca = await API.getPresenca(allFilters);

      // Normalize data field
      presenca = presenca.filter(function(d) {
        if (!d.data && d.created_at) d.data = d.created_at.slice(0, 10);
        return d.data;
      });

      // Normalize presente boolean
      presenca.forEach(function(d) {
        if (typeof d.presente === 'boolean') {
          d.presente_str = d.presente ? 'SIM' : 'NAO';
        } else {
          d.presente_str = (d.presente === true || d.presente === 'SIM' || d.presente === 'true') ? 'SIM' : 'NAO';
        }
      });

      var result = Engine.processEquipe(presenca, currentPeriod);

      // === FAIXA PRESENCA ===
      document.getElementById('bnPresTaxa').textContent = result.presenca.taxa + '%';
      updateDelta('bnPresVar', result.presenca.variacao, false);
      document.getElementById('bnPresFaltas').textContent = result.presenca.totalFaltas;

      // Evolutivo mensal presenca
      chartInstances.push(Charts.evolutivoMensal('evoPres', result.evolutivoMensal.presenca, Charts.COLORS.green));

      // Ranking loja presenca (inverted: higher = better)
      UI.renderRanking('rankLojaPres', result.presenca.rankLojas, { inverted: true });

      // Ranking pessoa presenca (inverted: higher = better)
      UI.renderRanking('rankPessoaPres', result.presenca.rankPessoas, { inverted: true });

      // === FAIXA ABSENTEISMO ===
      document.getElementById('bnAbsTaxa').textContent = result.absenteismo.taxa + '%';
      updateDelta('bnAbsVar', result.absenteismo.variacao, true);

      // Evolutivo mensal absenteismo
      chartInstances.push(Charts.evolutivoMensal('evoAbs', result.evolutivoMensal.absenteismo, Charts.COLORS.red));

      // Ranking loja absenteismo (higher = worse, normal order)
      UI.renderRanking('rankLojaAbs', result.absenteismo.rankLojas, { inverted: false });

      // Ranking pessoa faltantes (custom render - faltas count)
      var tbodyAbs = document.querySelector('#rankPessoaAbs tbody');
      if (tbodyAbs) {
        var htmlAbs = '';
        result.absenteismo.rankPessoas.forEach(function(r) {
          var barW = Math.min((r.faltas / (result.absenteismo.maxFaltas || 1)) * 100, 100);
          var barColor = r.taxa >= 30 ? Charts.COLORS.red : r.taxa >= 20 ? Charts.COLORS.orange : Charts.COLORS.green;
          htmlAbs += '<tr>' +
            '<td>' + r.nome + '</td>' +
            '<td>' + r.faltas + '</td>' +
            '<td><div class="rank-bar" style="width:' + barW + '%;background:' + barColor + '"></div></td>' +
            '<td>' + r.taxa + '%</td>' +
          '</tr>';
        });
        tbodyAbs.innerHTML = htmlAbs;
      }

      // === ANALISE COMPLEMENTAR ===
      // Motivos de falta
      if (result.motivos && Object.keys(result.motivos).length > 0) {
        chartInstances.push(Charts.motivosBar('chartMotFalta', result.motivos));
      } else {
        document.getElementById('chartMotFalta').parentElement.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#6B7280;font-size:12px">Sem dados de motivo registrados</div>';
      }

      // Faltas por dia da semana
      chartInstances.push(Charts.diaSemana('chartDiaFalta', result.porDiaSemana, { bad: 25, warn: 15 }));

      // Horario de chegada
      if (result.horarios && result.horarios.length > 0) {
        chartInstances.push(Charts.horarioChegada('chartHorario', result.horarios));
      } else {
        document.getElementById('chartHorario').parentElement.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#6B7280;font-size:12px">Sem dados de horario registrados</div>';
      }
    }
  });
})();
