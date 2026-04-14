// ============================================================
// NEXO Intelligence Web v2 — Equipe (Gestao de Pessoas)
// 5 blocos: Efetividade | Tabela Quadro | Tendencia | Agenda | HC
// ============================================================
Router.register('equipe', async function(container) {
  var currentPeriod = 15;
  var currentLoja = 'all';
  var chartInstances = [];

  function destroyCharts() {
    chartInstances.forEach(function(c) { if (c && c.destroy) c.destroy(); });
    chartInstances = [];
  }

  // ── SHELL HTML ──
  container.innerHTML =
    '<div class="page-filters">' +
      '<div class="period-pills" id="periodPillsEq">' +
        '<button class="period-pill" data-days="hoje">Hoje</button>' +
        '<button class="period-pill" data-days="7">7d</button>' +
        '<button class="period-pill active" data-days="15">15d</button>' +
        '<button class="period-pill" data-days="30">30d</button>' +
        '<button class="period-pill" data-days="60">60d</button>' +
        '<button class="period-pill" data-days="90">90d</button>' +
      '</div>' +
      '<select class="filter-select" id="filterLojaEq"><option value="all">Todas as lojas</option></select>' +
    '</div>' +
    '<div id="eqBloco1"></div>' +
    '<div id="eqBloco3"></div>' +
    '<div id="eqBloco2"></div>' +
    '<div id="eqBloco4"></div>' +
    '<div id="eqBloco5"></div>';

  // Populate loja filter
  var lojas = await API.getLojas(window.NEXO_REDE_ID);
  UI.populateLojaFilter('filterLojaEq', lojas);

  // Period pills
  var pills = document.querySelectorAll('#periodPillsEq .period-pill');
  pills.forEach(function(pill) {
    pill.addEventListener('click', function() {
      pills.forEach(function(p) { p.classList.remove('active'); });
      pill.classList.add('active');
      var val = pill.getAttribute('data-days');
      currentPeriod = val === 'hoje' ? 1 : parseInt(val);
      loadData();
    });
  });

  document.getElementById('filterLojaEq').addEventListener('change', function() {
    currentLoja = this.value;
    API.clearCache();
    loadData();
  });

  await loadData();

  // ══════════════════════════════════════════════════════════
  // LOAD DATA
  // ══════════════════════════════════════════════════════════
  async function loadData() {
    destroyCharts();

    var filters = {};
    if (currentLoja !== 'all') filters.lojaId = currentLoja;

    // Fetch all data
    var presenca = await API.getPresenca(filters);
    var pessoas = await API.getPessoas(filters.lojaId || null);

    // Normalize presenca
    presenca = presenca.filter(function(d) {
      if (!d.data && d.created_at) d.data = d.created_at.slice(0, 10);
      return d.data;
    });
    presenca.forEach(function(d) {
      if (typeof d.presente === 'boolean') {
        d.presente_str = d.presente ? 'SIM' : 'NAO';
      } else {
        d.presente_str = (d.presente === true || d.presente === 'SIM' || d.presente === 'true') ? 'SIM' : 'NAO';
      }
    });

    // Classify pessoas
    var pessoasSetor = pessoas.filter(function(p) { return p.tipo === 'SETOR'; });
    var pessoasTerc = pessoas.filter(function(p) { return p.tipo === 'TERCEIRO'; });
    var totalCadastrados = pessoasSetor.length;
    var totalTerceiros = pessoasTerc.length;

    // Group by cargo
    var cargos = {};
    pessoasSetor.forEach(function(p) {
      var c = p.cargo || 'Outros';
      cargos[c] = (cargos[c] || 0) + 1;
    });

    // Group terceiros by marca
    var marcas = {};
    pessoasTerc.forEach(function(p) {
      var m = p.marca_terceiro || 'Sem marca';
      if (!marcas[m]) marcas[m] = { total: 0, pessoas: [] };
      marcas[m].total++;
      marcas[m].pessoas.push(p);
    });

    // Process equipe data from engine
    var eq = Engine.processEquipe(presenca, currentPeriod);

    // ── Derive additional metrics ──
    // Presentes no periodo (media diaria)
    var maxDate = presenca.length > 0 ? presenca.reduce(function(mx, d) { return d.data > mx ? d.data : mx; }, '2000-01-01') : new Date().toISOString().slice(0, 10);
    var range = Utils.periodRange(currentPeriod, maxDate);
    var presNoPeriodo = presenca.filter(function(d) { return d.data >= range.desde && d.data <= range.ate; });
    var diasUnicos = {};
    presNoPeriodo.forEach(function(d) { diasUnicos[d.data] = true; });
    var numDias = Object.keys(diasUnicos).length || 1;
    var totalPresentes = presNoPeriodo.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var mediaPresentes = Math.round(totalPresentes / numDias);
    var totalAusentes = presNoPeriodo.filter(function(d) { return d.presente_str === 'NAO'; }).length;
    var mediaAusentes = Math.round(totalAusentes / numDias);

    // Efetividade setor
    var presSetorRecs = presNoPeriodo.filter(function(d) {
      return pessoasSetor.some(function(p) { return p.id === d.pessoa_id; });
    });
    var presSetorOk = presSetorRecs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var efetSetor = presSetorRecs.length > 0 ? Math.round(presSetorOk / presSetorRecs.length * 100) : 0;

    // Efetividade terceiros
    var presTercRecs = presNoPeriodo.filter(function(d) {
      return pessoasTerc.some(function(p) { return p.id === d.pessoa_id; });
    });
    var presTercOk = presTercRecs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var efetTerc = presTercRecs.length > 0 ? Math.round(presTercOk / presTercRecs.length * 100) : 0;

    // Presenca por marca
    var marcaPresenca = {};
    Object.keys(marcas).forEach(function(m) {
      var pessoaIds = marcas[m].pessoas.map(function(p) { return p.id; });
      var recs = presNoPeriodo.filter(function(d) { return pessoaIds.indexOf(d.pessoa_id) >= 0; });
      var pres = recs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      marcaPresenca[m] = { total: marcas[m].total, pres: recs.length > 0 ? Math.round(pres / recs.length * 100) : 0 };
    });

    // Motivos ausencia count
    var motivos = eq.motivos || {};
    var motivosList = Object.entries(motivos).sort(function(a, b) { return b[1] - a[1]; });

    // Inativos (sem registro de presenca no periodo = possivelmente ferias/afastado)
    var pessoasComRegistro = {};
    presNoPeriodo.forEach(function(d) { pessoasComRegistro[d.pessoa_id] = true; });
    var inativos = pessoasSetor.filter(function(p) { return !pessoasComRegistro[p.id]; });
    var ativosSetor = totalCadastrados - inativos.length;

    // ══════════════════════════════════════════════════════════
    // BLOCO 1 — EFETIVIDADE E QUADRO
    // ══════════════════════════════════════════════════════════
    renderBloco1(efetSetor, efetTerc, totalCadastrados, ativosSetor, inativos.length,
                 mediaPresentes, mediaAusentes, eq.presenca.variacao,
                 totalTerceiros, presTercOk, marcaPresenca, motivosList);

    // ══════════════════════════════════════════════════════════
    // BLOCO 3 — TENDENCIA (renderiza antes do Bloco 2 conforme aprovado)
    // ══════════════════════════════════════════════════════════
    renderBloco3(presenca, pessoasSetor);

    // ══════════════════════════════════════════════════════════
    // BLOCO 2 — TABELA UNIFICADA
    // ══════════════════════════════════════════════════════════
    renderBloco2(presNoPeriodo, pessoas, lojas, pessoasSetor, pessoasTerc);

    // ══════════════════════════════════════════════════════════
    // BLOCO 4 — AGENDA 14 DIAS
    // ══════════════════════════════════════════════════════════
    renderBloco4(presenca, pessoas, lojas);

    // ══════════════════════════════════════════════════════════
    // BLOCO 5 — HC TABLE
    // ══════════════════════════════════════════════════════════
    renderBloco5(pessoas, lojas);
  }

  // ══════════════════════════════════════════════════════════
  // RENDER BLOCO 1 — EFETIVIDADE + VELOCIMETROS
  // ══════════════════════════════════════════════════════════
  function renderBloco1(efetS, efetT, cadastrados, ativos, inativosCount,
                        presentes, ausentes, varPres, totalTerc, presTercCount,
                        marcaPresenca, motivosList) {

    var mediaDiariaTerc = totalTerc > 0 ? Math.round(presTercCount / Math.max(1, 1)) : 0;

    var html = '<div class="section-block anim d1">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--navy)"></span> Efetividade e quadro de pessoal <span class="sh-line"></span></div>' +
      '<div class="eq-top-row">' +
        // SETOR
        '<div class="eq-half">' +
          '<div class="eq-gauge-block">' +
            '<div class="eq-half-label">EFETIVIDADE SETOR</div>' +
            '<canvas id="gaugeSetor" width="150" height="140"></canvas>' +
            '<div class="eq-gauge-detail"><strong>' + presentes + '</strong> de <strong>' + ativos + '</strong> presentes<br><span style="color:var(--t3)">Acumulado periodo</span></div>' +
          '</div>' +
          '<div class="eq-cascade">' +
            '<div class="eq-half-label">QUADRO SETOR</div>' +
            '<div class="eq-separator"></div>' +
            '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--t3)">' + cadastrados + '</span><span class="eq-cas-label">Cadastrados</span></div>' +
            '<div class="eq-cas-connector"></div>' +
            '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--t1)">' + ativos + '</span><span class="eq-cas-label">Ativos <span style="color:var(--t3);font-size:10px">(' + inativosCount + ' inativos)</span></span></div>' +
            '<div class="eq-cas-connector"></div>' +
            '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--green)">' + presentes + '</span><span class="eq-cas-label">Presentes</span>' +
              (varPres !== 0 ? '<span class="var-badge ' + (varPres > 0 ? 'up' : 'down') + '">' + (varPres > 0 ? '\u25B2' : '\u25BC') + ' ' + Math.abs(varPres) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="eq-motivos">' +
            '<div class="eq-half-label">AUSENCIAS (' + ausentes + ')</div>' +
            '<div class="eq-separator"></div>';

    // Motivos de ausencia
    motivosList.slice(0, 3).forEach(function(m) {
      var motColor = '#9CA3AF';
      var motName = m[0].toLowerCase();
      if (motName.indexOf('injustif') >= 0 || motName.indexOf('falta') >= 0) motColor = '#C0504D';
      else if (motName.indexOf('atestado') >= 0) motColor = '#C97B2C';
      else if (motName.indexOf('justif') >= 0) motColor = '#3670A0';
      html += '<div class="eq-mot-row"><span class="eq-mot-val" style="color:' + motColor + '">' + m[1] + '</span><div class="eq-mot-bar" style="width:' + Math.min(80, m[1] * 20) + 'px;background:' + motColor + '"></div><span class="eq-mot-label">' + m[0] + '</span></div>';
    });

    // Inativos
    if (inativosCount > 0) {
      html += '<div style="margin-top:8px;border-top:0.5px solid rgba(0,0,0,0.06);padding-top:8px">' +
        '<div class="eq-half-label">INATIVOS (' + inativosCount + ')</div>';
      html += '<div class="eq-mot-row"><span class="eq-mot-val" style="color:var(--blue)">' + inativosCount + '</span><div class="eq-mot-bar" style="width:60px;background:var(--blue)"></div><span class="eq-mot-label">Sem registro</span></div>';
      html += '</div>';
    }

    html += '</div></div>'; // close eq-half setor

    // DIVIDER
    html += '<div class="eq-divider"></div>';

    // TERCEIROS
    html += '<div class="eq-half">' +
      '<div class="eq-gauge-block">' +
        '<div class="eq-half-label">EFETIVIDADE TERCEIROS</div>' +
        '<canvas id="gaugeTerc" width="150" height="140"></canvas>' +
        '<div class="eq-gauge-detail"><strong>' + Math.round(presTercCount) + '</strong> de <strong>' + totalTerc + '</strong> presentes<br><span style="color:var(--t3)">Acumulado periodo</span></div>' +
      '</div>' +
      '<div class="eq-cascade" style="min-width:80px;max-width:100px">' +
        '<div class="eq-half-label">QUADRO</div>' +
        '<div class="eq-separator"></div>' +
        '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--purple)">' + totalTerc + '</span><span class="eq-cas-label">Ativos</span></div>' +
        '<div class="eq-cas-connector"></div>' +
        '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--green)">' + Math.round(presTercCount) + '</span><span class="eq-cas-label">Presentes</span></div>' +
        '<div class="eq-cas-connector"></div>' +
        '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--red)">' + (totalTerc - Math.round(presTercCount)) + '</span><span class="eq-cas-label">Ausente</span></div>' +
      '</div>' +
      '<div class="eq-marca-block">' +
        '<div class="eq-half-label">POR MARCA</div>' +
        '<div class="eq-separator"></div>';

    Object.keys(marcaPresenca).forEach(function(m) {
      var mp = marcaPresenca[m];
      var presCount = Math.round(mp.total * mp.pres / 100);
      var presColor = mp.pres >= 90 ? 'var(--green)' : mp.pres >= 70 ? 'var(--orange)' : 'var(--red)';
      html += '<div class="eq-marca-row">' +
        '<span class="eq-marca-tag">' + m + '</span>' +
        '<div class="eq-marca-nums"><span class="eq-mn-val" style="color:' + presColor + '">' + presCount + '</span><span class="eq-mn-sep">/</span><span style="color:var(--t3)">' + mp.total + '</span></div>' +
        '<span class="eq-marca-pres" style="color:' + presColor + '">' + mp.pres + '%</span>' +
      '</div>';
    });

    html += '</div></div>'; // close eq-half terceiros
    html += '</div></div>'; // close eq-top-row, section-block

    document.getElementById('eqBloco1').innerHTML = html;

    // Draw speedometers
    drawSpeedometer('gaugeSetor', efetS, '#2D8653');
    drawSpeedometer('gaugeTerc', efetT, '#7153A0');
  }

  // ══════════════════════════════════════════════════════════
  // SPEEDOMETER CANVAS
  // ══════════════════════════════════════════════════════════
  function drawSpeedometer(id, pct, color) {
    var c = document.getElementById(id);
    if (!c) return;
    var ctx = c.getContext('2d');
    var cx = 75, cy = 82, r = 56;
    var sA = Math.PI * 0.75, eA = Math.PI * 2.25, sw = eA - sA;
    var zones = [
      { from: 0, to: 0.5, color: '#C0504D' },
      { from: 0.5, to: 0.7, color: '#C97B2C' },
      { from: 0.7, to: 0.85, color: '#E8C96A' },
      { from: 0.85, to: 1.0, color: '#2D8653' }
    ];
    ctx.lineWidth = 10; ctx.lineCap = 'butt';
    zones.forEach(function(z) {
      ctx.beginPath(); ctx.arc(cx, cy, r, sA + sw * z.from, sA + sw * z.to);
      ctx.strokeStyle = z.color; ctx.globalAlpha = 0.18; ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, sA, sA + sw * (pct / 100));
    ctx.strokeStyle = color; ctx.stroke();
    // Ticks
    [0, 25, 50, 75, 100].forEach(function(t) {
      var ang = sA + sw * (t / 100), inner = r + 8;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * (r + 2), cy + Math.sin(ang) * (r + 2));
      ctx.lineTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
      ctx.strokeStyle = 'rgba(26,39,68,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = '400 8px Outfit'; ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t, cx + Math.cos(ang) * (inner + 8), cy + Math.sin(ang) * (inner + 8));
    });
    // Needle
    var nAng = sA + sw * (pct / 100), nLen = r - 14;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(nAng) * nLen, cy + Math.sin(nAng) * nLen);
    ctx.strokeStyle = '#0C1425'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = '#0C1425'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    // Value
    ctx.font = '700 26px Outfit'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pct + '%', cx, cy + 30);
  }

  // ══════════════════════════════════════════════════════════
  // RENDER BLOCO 2 — TABELA UNIFICADA
  // ══════════════════════════════════════════════════════════
  function renderBloco2(presData, pessoas, lojasArr, pesSetor, pesTerc) {
    var byLoja = {};
    lojasArr.forEach(function(l) { byLoja[l.id] = { nome: l.nome, sCad: 0, sAtiv: 0, sFaltas: 0, tMarca: null, tCad: 0, tAtiv: 0, tFaltas: 0, sFi: 0, sAt: 0, sFj: 0, sFo: 0, tFi: 0, tAt: 0, tFj: 0, tFo: 0 }; });

    pesSetor.forEach(function(p) { if (byLoja[p.loja_id]) byLoja[p.loja_id].sCad++; });
    pesTerc.forEach(function(p) {
      if (byLoja[p.loja_id]) { byLoja[p.loja_id].tCad++; byLoja[p.loja_id].tMarca = p.marca_terceiro || 'Terceiro'; }
    });

    // Count presenca/ausencia by loja and tipo
    presData.forEach(function(d) {
      if (!byLoja[d.loja_id]) return;
      var isTerc = pesTerc.some(function(p) { return p.id === d.pessoa_id; });
      if (d.presente_str === 'SIM') {
        if (isTerc) byLoja[d.loja_id].tAtiv++;
        else byLoja[d.loja_id].sAtiv++;
      } else {
        var mot = (d.motivo_ausencia || '').toLowerCase();
        if (isTerc) {
          byLoja[d.loja_id].tFaltas++;
          if (mot.indexOf('injustif') >= 0 || mot.indexOf('falta') >= 0) byLoja[d.loja_id].tFi++;
          else if (mot.indexOf('atestado') >= 0) byLoja[d.loja_id].tAt++;
          else if (mot.indexOf('justif') >= 0) byLoja[d.loja_id].tFj++;
          else byLoja[d.loja_id].tFo++;
        } else {
          byLoja[d.loja_id].sFaltas++;
          if (mot.indexOf('injustif') >= 0 || mot.indexOf('falta') >= 0) byLoja[d.loja_id].sFi++;
          else if (mot.indexOf('atestado') >= 0) byLoja[d.loja_id].sAt++;
          else if (mot.indexOf('justif') >= 0) byLoja[d.loja_id].sFj++;
          else byLoja[d.loja_id].sFo++;
        }
      }
    });

    // Convert sAtiv to average daily
    var lojaKeys = Object.keys(byLoja).filter(function(k) { return byLoja[k].sCad > 0 || byLoja[k].tCad > 0; });

    function covH(a, c) {
      if (c === 0) return '<span class="eq-no-terc">\u2014</span>';
      var p = Math.min(100, Math.round(a / (a + (byLoja[lojaKeys[0]] || {}).sFaltas || 1) * 100));
      // Use actual presence rate
      var total = a + (arguments[2] || 0);
      if (total === 0) return '<span class="eq-no-terc">\u2014</span>';
      p = Math.round(a / total * 100);
      var col = p >= 90 ? '#2D8653' : p >= 70 ? '#C97B2C' : '#C0504D';
      return '<div class="eq-cov-wrap"><div class="eq-cov-bar"><div class="eq-cov-fill" style="width:' + p + '%;background:' + col + '"></div></div><span class="eq-cov-pct" style="color:' + col + '">' + p + '%</span></div>';
    }

    function ausBarH(fi, at, fj, fo) {
      var tot = fi + at + fj + fo;
      if (tot === 0) return '<span class="eq-no-terc">\u2014</span>';
      var h = '<div style="display:flex;align-items:center;gap:5px"><div class="eq-aus-bar">';
      if (fi > 0) h += '<div class="eq-aus-seg" style="width:' + Math.round(fi / tot * 100) + '%;background:#C0504D"></div>';
      if (at > 0) h += '<div class="eq-aus-seg" style="width:' + Math.round(at / tot * 100) + '%;background:#C97B2C"></div>';
      if (fj > 0) h += '<div class="eq-aus-seg" style="width:' + Math.round(fj / tot * 100) + '%;background:#3670A0"></div>';
      if (fo > 0) h += '<div class="eq-aus-seg" style="width:' + Math.round(fo / tot * 100) + '%;background:#9CA3AF"></div>';
      h += '</div><span class="eq-flt" style="color:#C0504D">' + tot + '</span></div>';
      return h;
    }

    function notaH(totalPres, totalAll) {
      if (totalAll === 0) return '<span class="eq-no-terc">\u2014</span>';
      var p = Math.round(totalPres / totalAll * 100);
      var bg;
      if (p >= 95) bg = '#1a7a3a'; else if (p >= 90) bg = '#2D8653'; else if (p >= 85) bg = '#5a9e3e';
      else if (p >= 80) bg = '#8ab535'; else if (p >= 75) bg = '#b8c428'; else if (p >= 70) bg = '#C9A84C';
      else if (p >= 65) bg = '#C97B2C'; else if (p >= 55) bg = '#c25a2a'; else bg = '#C0504D';
      return '<span class="eq-nota" style="background:' + bg + '">' + p + '%</span>';
    }

    function badgeC(atv, flt) {
      var total = atv + flt;
      if (total === 0) return 'eq-hcb-neutral';
      var r = atv / total;
      return r >= 0.9 ? 'eq-hcb-good' : r >= 0.7 ? 'eq-hcb-warn' : 'eq-hcb-bad';
    }

    var html = '<div class="section-block anim d3">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--blue)"></span> Quadro e presenca por loja \u2014 periodo <span class="sh-line"></span></div>' +
      '<div class="eq-legend-bar">' +
        '<span class="eq-li"><span class="eq-ld" style="background:#C0504D"></span>Falta injust.</span>' +
        '<span class="eq-li"><span class="eq-ld" style="background:#C97B2C"></span>Atestado</span>' +
        '<span class="eq-li"><span class="eq-ld" style="background:#3670A0"></span>Justificada</span>' +
        '<span class="eq-li"><span class="eq-ld" style="background:#9CA3AF"></span>Folga</span>' +
      '</div>' +
      '<div class="eq-tbl-card"><div class="eq-tbl-inner"><table class="eq-table">' +
      '<thead><tr><th rowspan="2" style="text-align:left;padding-left:14px">Loja</th><th colspan="4" style="text-align:center">Setor</th><th colspan="4" class="eq-grp" style="text-align:center">Terceiros</th><th rowspan="2" class="eq-grp" style="text-align:center">Nota</th></tr>' +
      '<tr class="eq-sub-hdr"><th>Cad.</th><th>Ativos</th><th>Cobertura</th><th>Ausencias</th><th class="eq-sep">Marca</th><th>Ativos</th><th>Cobertura</th><th>Ausencias</th></tr></thead><tbody>';

    // Totals row first
    var tsCad = 0, tsAtiv = 0, tsFlt = 0, ttCad = 0, ttAtiv = 0, ttFlt = 0;
    lojaKeys.forEach(function(k) {
      var d = byLoja[k];
      tsCad += d.sCad; tsAtiv += d.sAtiv; tsFlt += d.sFaltas;
      ttCad += d.tCad; ttAtiv += d.tAtiv; ttFlt += d.tFaltas;
    });

    html += '<tr class="eq-tot-row"><td style="text-align:left;padding-left:14px;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:0.1em">Rede</td>' +
      '<td>' + tsCad + '</td><td><strong>' + tsAtiv + '</strong></td>' +
      '<td>' + notaH(tsAtiv, tsAtiv + tsFlt) + '</td>' +
      '<td><span class="eq-flt" style="color:#C0504D">' + tsFlt + '</span></td>' +
      '<td class="eq-sep">' + ttCad + '</td><td><strong>' + ttAtiv + '</strong></td>' +
      '<td>' + notaH(ttAtiv, ttAtiv + ttFlt) + '</td>' +
      '<td><span class="eq-flt" style="color:#C0504D">' + ttFlt + '</span></td>' +
      '<td class="eq-grp">' + notaH(tsAtiv + ttAtiv, tsAtiv + tsFlt + ttAtiv + ttFlt) + '</td></tr>';

    // Loja rows
    lojaKeys.forEach(function(k) {
      var d = byLoja[k];
      var hasT = d.tCad > 0;
      var sTotal = d.sAtiv + d.sFaltas;
      var tTotal = d.tAtiv + d.tFaltas;
      var allPres = d.sAtiv + d.tAtiv;
      var allTotal = sTotal + tTotal;

      html += '<tr>' +
        '<td style="text-align:left;padding-left:14px" class="eq-loja-name">' + d.nome + '</td>' +
        '<td>' + d.sCad + '</td>' +
        '<td><span class="eq-hcb ' + badgeC(d.sAtiv, d.sFaltas) + '">' + d.sAtiv + '</span></td>' +
        '<td>' + notaH(d.sAtiv, sTotal) + '</td>' +
        '<td>' + ausBarH(d.sFi, d.sAt, d.sFj, d.sFo) + '</td>' +
        '<td class="eq-sep">' + (hasT ? '<span class="eq-marca-tag-sm">' + d.tMarca + '</span>' : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td>' + (hasT ? '<span class="eq-hcb ' + badgeC(d.tAtiv, d.tFaltas) + '">' + d.tAtiv + '</span>' : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td>' + (hasT ? notaH(d.tAtiv, tTotal) : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td>' + (hasT ? ausBarH(d.tFi, d.tAt, d.tFj, d.tFo) : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td class="eq-grp">' + notaH(allPres, allTotal) + '</td></tr>';
    });

    html += '</tbody></table></div></div></div>';
    document.getElementById('eqBloco2').innerHTML = html;
  }

  // ══════════════════════════════════════════════════════════
  // RENDER BLOCO 3 — TENDENCIA DE EFETIVIDADE
  // ══════════════════════════════════════════════════════════
  function renderBloco3(presenca, pesSetor) {
    // Build monthly data
    var byMonth = {};
    presenca.forEach(function(d) {
      var mk = d.data.slice(0, 7);
      if (!byMonth[mk]) byMonth[mk] = { total: 0, pres: 0 };
      byMonth[mk].total++;
      if (d.presente_str === 'SIM') byMonth[mk].pres++;
    });
    var months = Object.keys(byMonth).sort().slice(-6);
    var mLabels = months.map(function(m) { return Utils.monthName ? Utils.monthName(m + '-01') : m.slice(5); });
    var mData = months.map(function(m) { return byMonth[m].total > 0 ? Math.round(byMonth[m].pres / byMonth[m].total * 100) : 0; });
    var mAtivos = months.map(function(m) {
      var diasU = {};
      presenca.filter(function(d) { return d.data.slice(0, 7) === m; }).forEach(function(d) { diasU[d.data] = true; });
      var nd = Object.keys(diasU).length || 1;
      var pres = presenca.filter(function(d) { return d.data.slice(0, 7) === m && d.presente_str === 'SIM'; }).length;
      return Math.round(pres / nd);
    });

    // Build weekly data (last 8 weeks)
    var maxD = presenca.length > 0 ? presenca.reduce(function(mx, d) { return d.data > mx ? d.data : mx; }, '2000-01-01') : new Date().toISOString().slice(0, 10);
    var wLabels = [], wData = [], wAtivos = [];
    for (var w = 7; w >= 0; w--) {
      var wEnd = new Date(maxD);
      wEnd.setDate(wEnd.getDate() - w * 7);
      var wStart = new Date(wEnd);
      wStart.setDate(wStart.getDate() - 6);
      var ws = wStart.toISOString().slice(0, 10);
      var we = wEnd.toISOString().slice(0, 10);
      var wRecs = presenca.filter(function(d) { return d.data >= ws && d.data <= we; });
      var wPres = wRecs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      var wPct = wRecs.length > 0 ? Math.round(wPres / wRecs.length * 100) : 0;
      wLabels.push('S' + (8 - w + 6));
      wData.push(wPct);
      var wDiasU = {};
      wRecs.forEach(function(d) { wDiasU[d.data] = true; });
      wAtivos.push(Math.round(wPres / (Object.keys(wDiasU).length || 1)));
    }

    // Build daily data (last 7 days)
    var dLabels = [], dData = [], dAtivos = [];
    var diasNome = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    for (var dd = 6; dd >= 0; dd--) {
      var dt = new Date(maxD);
      dt.setDate(dt.getDate() - dd);
      var ds = dt.toISOString().slice(0, 10);
      dLabels.push(diasNome[dt.getDay()]);
      var dRecs = presenca.filter(function(d) { return d.data === ds; });
      var dPres = dRecs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      dData.push(dRecs.length > 0 ? Math.round(dPres / dRecs.length * 100) : 0);
      dAtivos.push(dPres);
    }

    var lastMes = mData.length > 0 ? mData[mData.length - 1] : 0;
    var prevMes = mData.length > 1 ? mData[mData.length - 2] : lastMes;
    var lastSem = wData.length > 0 ? wData[wData.length - 1] : 0;
    var prevSem = wData.length > 1 ? wData[wData.length - 2] : lastSem;
    var lastDia = dData.length > 0 ? dData[dData.length - 1] : 0;
    var prevDia = dData.length > 1 ? dData[dData.length - 2] : lastDia;

    function buildCardHtml(id, label, big, varVal, labels, dataArr, ativosArr) {
      var varCls = varVal >= 0 ? 'up' : 'down';
      var varTxt = varVal >= 0 ? '\u25B2 ' + varVal + ' p.p.' : '\u25BC ' + Math.abs(varVal) + ' p.p.';
      var bigColor = big >= 90 ? 'var(--green)' : big >= 80 ? 'var(--orange)' : 'var(--red)';

      var h = '<div><div class="eq-chart-card">' +
        '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px">' +
          '<div class="eq-card-label">' + label + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:baseline;gap:6px">' +
          '<span class="eq-card-big" style="color:' + bigColor + '">' + big + '%</span>' +
          '<span class="eq-card-var ' + varCls + '">' + varTxt + '</span>' +
        '</div>' +
        '<div class="eq-chart-area"><canvas id="' + id + '"></canvas></div>' +
        '<table class="eq-data-table" id="tbl_' + id + '"></table>' +
      '</div></div>';
      return h;
    }

    var html = '<div class="section-block anim d2">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--green)"></span> Tendencia de efetividade <span class="sh-line"></span></div>' +
      '<div class="eq-tri-grid">' +
        buildCardHtml('eqChMes', 'EFETIVIDADE MENSAL', lastMes, lastMes - prevMes, mLabels, mData, mAtivos) +
        buildCardHtml('eqChSem', 'ULTIMAS 8 SEMANAS', lastSem, lastSem - prevSem, wLabels, wData, wAtivos) +
        buildCardHtml('eqChDia', 'ULTIMOS 7 DIAS', lastDia, lastDia - prevDia, dLabels, dData, dAtivos) +
      '</div></div>';

    document.getElementById('eqBloco3').innerHTML = html;

    // Draw charts
    var dlPlugin = {
      id: 'eqDl',
      afterDatasetsDraw: function(chart) {
        var ctx = chart.ctx;
        chart.data.datasets.forEach(function(ds, i) {
          chart.getDatasetMeta(i).data.forEach(function(pt, idx) {
            ctx.save();
            ctx.font = '600 10px Outfit';
            ctx.fillStyle = '#1F2937';
            ctx.textAlign = 'center';
            ctx.fillText(ds.data[idx] + '%', pt.x, pt.y - 10);
            ctx.restore();
          });
        });
      }
    };

    var lineCfg = {
      tension: 0.35, pointRadius: 3, pointBackgroundColor: '#2D8653',
      pointBorderColor: '#fff', pointBorderWidth: 2,
      borderColor: '#2D8653', borderWidth: 2.5,
      fill: true, backgroundColor: 'rgba(45,134,83,0.06)'
    };

    function makeChart(canvasId, labels, data) {
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;
      var ch = new Chart(canvas, {
        type: 'line',
        data: { labels: labels, datasets: [Object.assign({ data: data }, lineCfg)] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { display: false, min: Math.max(0, Math.min.apply(null, data) - 10), max: 100, grace: '10%' },
            x: { display: false }
          },
          layout: { padding: { top: 18, left: 4, right: 4 } }
        },
        plugins: [dlPlugin]
      });
      chartInstances.push(ch);
    }

    var chartSets = [
      { id: 'eqChMes', labels: mLabels, data: mData, ativos: mAtivos },
      { id: 'eqChSem', labels: wLabels, data: wData, ativos: wAtivos },
      { id: 'eqChDia', labels: dLabels, data: dData, ativos: dAtivos }
    ];

    chartSets.forEach(function(cs) {
      makeChart(cs.id, cs.labels, cs.data);
      // Build data table
      var tbl = document.getElementById('tbl_' + cs.id);
      if (!tbl) return;
      var r1 = '<tr class="eq-dt-val"><td>Ativos</td>';
      var r2 = '<tr class="eq-dt-efet"><td>Efetiv.</td>';
      var r3 = '<tr class="eq-dt-var"><td>Var %</td>';
      for (var i = 0; i < cs.labels.length; i++) {
        r1 += '<td>' + cs.ativos[i] + '</td>';
        r2 += '<td>' + cs.data[i] + '%</td>';
        if (i === 0) { r3 += '<td class="eq-arr-eq">=</td>'; }
        else {
          var diff = cs.data[i] - cs.data[i - 1];
          if (diff > 0) r3 += '<td class="eq-arr-up">\u25B2 ' + diff + '%</td>';
          else if (diff < 0) r3 += '<td class="eq-arr-down">\u25BC ' + Math.abs(diff) + '%</td>';
          else r3 += '<td class="eq-arr-eq">=</td>';
        }
      }
      tbl.innerHTML = r1 + '</tr>' + r2 + '</tr>' + r3 + '</tr>';
    });
  }

  // Placeholder for Bloco 4 and 5 — will be generated in Part 2
  function renderBloco4(presenca, pessoas, lojasArr) {
    // AGENDA 14 DIAS — TO BE IMPLEMENTED IN PART 2
    document.getElementById('eqBloco4').innerHTML = '<div class="section-block anim d4"><div class="section-header"><span class="sh-dot" style="background:var(--gold)"></span> Sistematica de atendimento <span class="sh-line"></span></div><div class="eq-sub-info">Carregando agenda...</div></div>';
    buildAgenda(presenca, pessoas, lojasArr);
  }

  function renderBloco5(pessoas, lojasArr) {
    // HC TABLE — TO BE IMPLEMENTED IN PART 2
    document.getElementById('eqBloco5').innerHTML = '<div class="section-block anim d5"><div class="section-header"><span class="sh-dot" style="background:var(--purple)"></span> Composicao do quadro e produtividade <span class="sh-line"></span></div><div class="eq-sub-info">Carregando dados HC...</div></div>';
    buildHCTable(pessoas, lojasArr);
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO 4 — AGENDA 14 DIAS HEATMAP
  // ══════════════════════════════════════════════════════════
  function buildAgenda(presenca, pessoas, lojasArr) {
    var diasN = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    var maxD = presenca.length > 0 ? presenca.reduce(function(mx, d) { return d.data > mx ? d.data : mx; }, '2000-01-01') : new Date().toISOString().slice(0, 10);
    var cols = [];
    for (var i = 13; i >= 0; i--) {
      var dt = new Date(maxD);
      dt.setDate(dt.getDate() - i);
      cols.push({
        iso: dt.toISOString().slice(0, 10),
        label: diasN[dt.getDay()],
        dd: String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0'),
        isToday: i === 0,
        isMonday: dt.getDay() === 1
      });
    }

    var pesSetor = pessoas.filter(function(p) { return p.tipo === 'SETOR'; });
    var pesTerc = pessoas.filter(function(p) { return p.tipo === 'TERCEIRO'; });

    // Build index: loja_id -> [{pessoa, tipo, marca}]
    var lojaTeam = {};
    lojasArr.forEach(function(l) { lojaTeam[l.id] = { nome: l.nome, setor: [], terc: [] }; });
    pesSetor.forEach(function(p) { if (lojaTeam[p.loja_id]) lojaTeam[p.loja_id].setor.push(p); });
    pesTerc.forEach(function(p) { if (lojaTeam[p.loja_id]) lojaTeam[p.loja_id].terc.push(p); });

    // Build presenca index: pessoa_id|data -> status
    var presIndex = {};
    presenca.forEach(function(d) {
      presIndex[d.pessoa_id + '|' + d.data] = d.presente_str === 'SIM' ? 'p' : (d.motivo_ausencia || 'falta');
    });

    function hmColor(pct) {
      if (pct >= 95) return '#1a7a3a';
      if (pct >= 90) return '#2D8653';
      if (pct >= 80) return '#5a9e3e';
      if (pct >= 70) return '#8ab535';
      if (pct >= 60) return '#C9A84C';
      if (pct >= 50) return '#C97B2C';
      return '#C0504D';
    }
    function hmSoftBg(pct) {
      if (pct >= 90) return 'rgba(45,134,83,0.12)';
      if (pct >= 70) return 'rgba(138,181,53,0.12)';
      if (pct >= 50) return 'rgba(201,123,44,0.12)';
      return 'rgba(192,80,77,0.12)';
    }
    function hmSoftColor(pct) {
      if (pct >= 90) return '#2D8653';
      if (pct >= 70) return '#6a8c30';
      if (pct >= 50) return '#C97B2C';
      return '#C0504D';
    }

    var el = document.getElementById('eqBloco4');
    var html = '<div class="section-block anim d4">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--gold)"></span> Sistematica de atendimento <span class="sh-line"></span></div>' +
      '<div class="eq-sub-info">Ultimos 14 dias \u00b7 Presenca em % do quadro</div>' +
      '<div class="eq-agenda">' +
      '<div class="eq-ag-hdr">' +
      '<div class="eq-ah-corner">Loja</div>';

    cols.forEach(function(c) {
      html += '<div class="eq-ah-col' + (c.isToday ? ' eq-today' : '') + (c.isMonday ? ' eq-wk-start' : '') + '"><span class="eq-ah-day">' + c.label + '</span><span class="eq-ah-date">' + c.dd + '</span></div>';
    });
    html += '</div>';

    // Total row FIRST
    html += '<div class="eq-ag-totrow">';
    html += '<div class="eq-ag-tot-label">Total rede</div>';
    var allPeople = pesSetor.concat(pesTerc);
    cols.forEach(function(c) {
      var total = allPeople.length;
      var pres = allPeople.filter(function(p) { return presIndex[p.id + '|' + c.iso] === 'p'; }).length;
      var pct = total > 0 ? Math.round(pres / total * 100) : 0;
      html += '<div class="eq-ag-tot-cell' + (c.isToday ? ' eq-today-bg' : '') + (c.isMonday ? ' eq-wk-start' : '') + '"><div class="eq-hm" style="background:' + hmColor(pct) + '">' + pct + '%</div></div>';
    });
    html += '</div>';

    html += '<div class="eq-ag-body" id="eqAgBody"></div>';
    html += '</div></div>';
    el.innerHTML = html;

    var agBody = document.getElementById('eqAgBody');
    var lojaIds = Object.keys(lojaTeam).filter(function(k) { return lojaTeam[k].setor.length + lojaTeam[k].terc.length > 0; });

    lojaIds.forEach(function(lid) {
      var lt = lojaTeam[lid];
      var total = lt.setor.length + lt.terc.length;

      // Loja row
      var row = document.createElement('div');
      row.className = 'eq-loja-row';
      var nm = '<div class="eq-lr-name"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M9 18l6-6-6-6"/></svg>' + lt.nome + ' <span class="eq-lr-tc">(' + total + ')</span></div>';
      var cells = '';
      cols.forEach(function(c) {
        var pres = 0;
        lt.setor.concat(lt.terc).forEach(function(p) { if (presIndex[p.id + '|' + c.iso] === 'p') pres++; });
        var pct = total > 0 ? Math.round(pres / total * 100) : 0;
        cells += '<div class="eq-lr-cell' + (c.isToday ? ' eq-today-bg' : '') + (c.isMonday ? ' eq-wk-start' : '') + '"><div class="eq-hm" style="background:' + hmColor(pct) + '">' + pct + '%</div></div>';
      });
      row.innerHTML = nm + cells;
      agBody.appendChild(row);

      // Sub panel
      var panel = document.createElement('div');
      panel.className = 'eq-sub-panel';
      panel.id = 'eqp-' + lid;

      // Legend
      panel.innerHTML = '<div class="eq-sub-legend"><span class="eq-sli"><span class="eq-sld" style="background:#2D8653"></span>Presente</span><span class="eq-sli"><span class="eq-sld" style="background:#C0504D"></span>Falta</span><span class="eq-sli"><span class="eq-sld" style="background:#C97B2C"></span>Justif.</span><span class="eq-sli"><span class="eq-sld" style="background:#d1d5db"></span>Folga</span></div>';

      function addSection(label, cssLbl, cssBadge, ppl, isMarca) {
        if (ppl.length === 0) return;
        // Section header with % heatmap
        var secH = '<div class="eq-ssh"><div class="eq-ssh-label ' + cssLbl + '">' + label + ' <span class="eq-ssh-badge ' + cssBadge + '">' + ppl.length + '</span></div>';
        cols.forEach(function(c) {
          var pc = 0;
          ppl.forEach(function(p) { if (presIndex[p.id + '|' + c.iso] === 'p') pc++; });
          var sp = ppl.length > 0 ? Math.round(pc / ppl.length * 100) : 0;
          secH += '<div class="eq-ssh-cell' + (c.isToday ? ' eq-today-bg' : '') + (c.isMonday ? ' eq-wk-start' : '') + '"><div class="eq-hm-soft" style="background:' + hmSoftBg(sp) + ';color:' + hmSoftColor(sp) + '">' + sp + '%</div></div>';
        });
        secH += '</div>';
        panel.innerHTML += secH;

        // Person rows
        ppl.forEach(function(p) {
          var pr = '<div class="eq-pr"><div class="eq-pr-name">' + (Engine.pessoaName(p.id) || p.nome) + (isMarca ? ' <span class="eq-mtag">' + (p.marca_terceiro || '') + '</span>' : ' <span class="eq-ctag">' + (p.cargo || '') + '</span>') + '</div>';
          cols.forEach(function(c) {
            var key = p.id + '|' + c.iso;
            var st = presIndex[key];
            var cls = 'p', txt = '', tipTxt = 'Presente';
            if (!st) { cls = 'o'; tipTxt = 'Sem registro'; }
            else if (st !== 'p') {
              var mot = st.toLowerCase();
              if (mot.indexOf('injustif') >= 0 || mot.indexOf('falta') >= 0) { cls = 'a'; txt = 'F'; tipTxt = 'Falta injustificada'; }
              else if (mot.indexOf('atestado') >= 0) { cls = 'j'; txt = 'A'; tipTxt = 'Atestado'; }
              else if (mot.indexOf('justif') >= 0) { cls = 'j'; txt = 'J'; tipTxt = 'Justificada'; }
              else { cls = 'o'; tipTxt = st; }
            }
            pr += '<div class="eq-pr-cell' + (c.isToday ? ' eq-today-bg' : '') + (c.isMonday ? ' eq-wk-start' : '') + '"><div class="eq-sd eq-sd-' + cls + '" title="' + tipTxt + ' \u2014 ' + c.dd + '">' + txt + '</div></div>';
          });
          pr += '</div>';
          panel.innerHTML += pr;
        });
      }

      addSection('Setor', 'eq-ssh-s', 'eq-sshb-s', lt.setor, false);
      addSection('Terceiros', 'eq-ssh-t', 'eq-sshb-t', lt.terc, true);
      agBody.appendChild(panel);

      // Click to toggle
      row.addEventListener('click', function() {
        var p = document.getElementById('eqp-' + lid);
        var chev = row.querySelector('svg');
        if (p.classList.contains('eq-sub-open')) {
          p.classList.remove('eq-sub-open');
          chev.style.transform = 'rotate(0deg)';
        } else {
          p.classList.add('eq-sub-open');
          chev.style.transform = 'rotate(90deg)';
        }
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO 5 — HC TABLE (COMPOSICAO E PRODUTIVIDADE)
  // ══════════════════════════════════════════════════════════
  function buildHCTable(pessoas, lojasArr) {
    var pesSetor = pessoas.filter(function(p) { return p.tipo === 'SETOR'; });

    // Simulated revenue data per loja (will be replaced by sell-out)
    var fatSimulado = {};
    lojasArr.forEach(function(l, i) {
      var fats = [850, 620, 480, 720, 350, 280, 400, 500, 600, 300];
      fatSimulado[l.id] = { mes: fats[i % fats.length], tri: fats[i % fats.length] * 2.8 };
    });

    // Simulated payroll per loja
    var custoSimulado = {};
    lojasArr.forEach(function(l, i) {
      var f = fatSimulado[l.id].mes;
      custoSimulado[l.id] = Math.round(f * (0.045 + Math.random() * 0.025));
    });

    var svgDn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="10" height="10"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
    var svgUp = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="10" height="10"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    var svgCk = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="10" height="10"><path d="M20 6L9 17l-5-5"/></svg>';

    var icoT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';
    var icoW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    var icoD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>';
    var icoTr = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    var icoOk = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

    function fmtK(v) { return 'R$ ' + v + 'k'; }
    function fmtM(v) { return v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1).replace('.', ',') + 'M' : 'R$ ' + Math.round(v) + 'k'; }

    // Build loja data
    var hcRows = [];
    var tFm = 0, tFt = 0, tA = 0, tAx = 0, tBl = 0, tR = 0, tI = 0, tCf = 0;

    lojasArr.forEach(function(l) {
      var lPes = pesSetor.filter(function(p) { return p.loja_id === l.id; });
      if (lPes.length === 0) return;
      var acoug = lPes.filter(function(p) { return p.cargo && (p.cargo.toLowerCase().indexOf('acouguei') >= 0 || p.cargo.toLowerCase().indexOf('acougueir') >= 0); }).length;
      var aux = lPes.filter(function(p) { return p.cargo && p.cargo.toLowerCase().indexOf('auxiliar') >= 0; }).length;
      var balc = lPes.filter(function(p) { return p.cargo && p.cargo.toLowerCase().indexOf('balconista') >= 0; }).length;
      var real = acoug + aux + balc;
      if (real === 0) real = lPes.length; // fallback

      var fat = fatSimulado[l.id] || { mes: 300, tri: 840 };
      var custo = custoSimulado[l.id] || Math.round(fat.mes * 0.05);
      var ideal = Math.round((fat.tri / 3) / 50);
      var gap = real - ideal;
      var impPct = ((custo / fat.mes) * 100).toFixed(1);
      var prodPC = Math.round(fat.mes / real);

      tFm += fat.mes; tFt += fat.tri; tA += acoug; tAx += aux; tBl += balc; tR += real; tI += ideal; tCf += custo;

      hcRows.push({ nome: l.nome, fatM: fat.mes, fatT: fat.tri, acoug: acoug, aux: aux, balc: balc, real: real, ideal: ideal, gap: gap, impPct: impPct, prodPC: prodPC });
    });

    var el = document.getElementById('eqBloco5');
    var html = '<div class="section-block anim d5">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--purple)"></span> Composicao do quadro e produtividade <span class="sh-line"></span></div>' +
      '<div class="eq-sub-info">HC ideal = Fat. tri medio / R$ 50k por colaborador \u00b7 Impacto folha ideal = 5% (+-0.5%)</div>' +
      '<div class="eq-tbl-card"><div class="eq-hc-tbl"><table class="eq-table">' +
      '<thead><tr><th style="text-align:left;padding-left:14px">Loja</th><th>Fat. mes</th><th>Fat. tri</th><th class="eq-grp">Acoug.</th><th>Aux.</th><th>Balc.</th><th class="eq-grp">Real</th><th>Ideal</th><th>Gap</th><th class="eq-grp">R$/colab</th><th>Imp. folha</th><th class="eq-grp">Diagnostico</th></tr></thead><tbody>';

    // Totals
    var tGap = tR - tI;
    var tImpPct = ((tCf / tFm) * 100).toFixed(1);
    var tProd = Math.round(tFm / tR);
    var tGapCls = tGap === 0 ? 'eq-gap-ok' : tGap < 0 ? 'eq-gap-deficit' : 'eq-gap-excess';
    var tImpF = parseFloat(tImpPct);
    var tImpCls = tImpF >= 4.5 && tImpF <= 5.5 ? 'eq-imp-ok' : (tImpF >= 3.5 && tImpF <= 6.5 ? 'eq-imp-warn' : 'eq-imp-bad');
    var tProdCls = tProd >= 40 && tProd <= 60 ? 'eq-prod-ok' : tProd > 60 ? 'eq-prod-high' : 'eq-prod-low';

    html += '<tr class="eq-tot-hc"><td style="text-align:left;padding-left:14px;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:0.1em">Rede</td>' +
      '<td class="eq-fat-h">' + fmtM(tFm) + '</td><td class="eq-fat-h">' + fmtM(tFt) + '</td>' +
      '<td class="eq-grp">' + tA + '</td><td>' + tAx + '</td><td>' + tBl + '</td>' +
      '<td class="eq-grp"><strong>' + tR + '</strong></td><td style="color:var(--purple)">' + tI + '</td>' +
      '<td><span class="eq-gap-wrap ' + tGapCls + '">' + (tGap < 0 ? svgDn : tGap > 0 ? svgUp : svgCk) + ' ' + Math.abs(tGap) + '</span></td>' +
      '<td class="eq-grp"><span class="eq-prod ' + tProdCls + '">R$ ' + tProd + 'k</span></td>' +
      '<td><span class="eq-imp ' + tImpCls + '">' + tImpPct + '%</span></td>' +
      '<td class="eq-grp"></td></tr>';

    // Loja rows
    hcRows.forEach(function(d) {
      var gapCls = d.gap === 0 ? 'eq-gap-ok' : d.gap < 0 ? 'eq-gap-deficit' : 'eq-gap-excess';
      var impF = parseFloat(d.impPct);
      var impCls = impF >= 4.5 && impF <= 5.5 ? 'eq-imp-ok' : (impF >= 3.5 && impF <= 6.5 ? 'eq-imp-warn' : 'eq-imp-bad');
      var prodCls = d.prodPC >= 40 && d.prodPC <= 60 ? 'eq-prod-ok' : d.prodPC > 60 ? 'eq-prod-high' : 'eq-prod-low';

      // Pills
      var pills = [];
      if (d.gap <= -2) pills.push({ t: 'Subdimensionado', c: 'eq-dp-red', i: icoT, tip: 'Deficit de ' + Math.abs(d.gap) + ' pessoas vs ideal. Risco de filas, quebra e ruptura.' });
      else if (d.gap < 0) pills.push({ t: 'Leve deficit', c: 'eq-dp-orange', i: icoT, tip: 'Falta 1 pessoa para o ideal. Avaliar contratacao.' });
      else if (d.gap >= 2) pills.push({ t: 'Superdimensionado', c: 'eq-dp-orange', i: icoT, tip: d.gap + ' acima do ideal. Avaliar remanejamento.' });
      else if (d.gap > 0) pills.push({ t: 'Leve excesso', c: 'eq-dp-blue', i: icoT, tip: '1 acima. Pode ser estrategico.' });
      else pills.push({ t: 'Quadro OK', c: 'eq-dp-green', i: icoOk, tip: 'Adequado ao faturamento.' });

      if (d.aux === 0 && d.acoug > 1) pills.push({ t: 'Sem auxiliar', c: 'eq-dp-red', i: icoW, tip: 'Acougueiros fazendo tarefa de baixo valor. Converter 1 vaga em auxiliar.' });
      if (impF > 5.5) pills.push({ t: 'Folha alta', c: 'eq-dp-red', i: icoD, tip: 'Impacto ' + d.impPct + '%. Acima de 5.5% compromete margem.' });
      else if (impF < 4.5) pills.push({ t: 'Folha baixa', c: 'eq-dp-orange', i: icoD, tip: 'Apenas ' + d.impPct + '%. Pode indicar subdimensionamento.' });
      if (d.prodPC > 60) pills.push({ t: 'Alta carga', c: 'eq-dp-red', i: icoTr, tip: 'R$ ' + d.prodPC + 'k/colab. Risco de turnover e erros.' });
      else if (d.prodPC < 40) pills.push({ t: 'Baixa produtiv.', c: 'eq-dp-orange', i: icoTr, tip: 'R$ ' + d.prodPC + 'k/colab. Ociosidade.' });

      var ph = '<div class="eq-diag-pills">';
      pills.forEach(function(p) { ph += '<span class="eq-dp ' + p.c + '" title="' + p.tip + '">' + p.i + p.t + '</span>'; });
      ph += '</div>';

      html += '<tr>' +
        '<td style="text-align:left;padding-left:14px" class="eq-loja-name">' + d.nome + '</td>' +
        '<td><span class="eq-fat-val">' + fmtK(d.fatM) + '</span></td>' +
        '<td><span class="eq-fat-val">' + fmtM(d.fatT) + '</span></td>' +
        '<td class="eq-grp"><span class="eq-cargo-val">' + d.acoug + '</span></td>' +
        '<td>' + (d.aux > 0 ? '<span class="eq-cargo-val">' + d.aux + '</span>' : '<span class="eq-cargo-zero">\u2014</span>') + '</td>' +
        '<td>' + (d.balc > 0 ? '<span class="eq-cargo-val">' + d.balc + '</span>' : '<span class="eq-cargo-zero">\u2014</span>') + '</td>' +
        '<td class="eq-grp"><span class="eq-cargo-val">' + d.real + '</span></td>' +
        '<td><span class="eq-ideal-val">' + d.ideal + '</span></td>' +
        '<td><span class="eq-gap-wrap ' + gapCls + '">' + (d.gap < 0 ? svgDn : d.gap > 0 ? svgUp : svgCk) + ' ' + Math.abs(d.gap) + '</span></td>' +
        '<td class="eq-grp"><span class="eq-prod ' + prodCls + '">R$ ' + d.prodPC + 'k</span></td>' +
        '<td><span class="eq-imp ' + impCls + '">' + d.impPct + '%</span></td>' +
        '<td class="eq-grp eq-diag-cell">' + ph + '</td></tr>';
    });

    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;
  }

});
