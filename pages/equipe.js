// ============================================================
// NEXO Intelligence Web v2 — Equipe (Gestao de Pessoas) v2.1
// FIXES: cedilha cargo, marca vazia, loja_id null, agenda maxDate,
//        eixo X labels, tooltip pills, filtro Hoje, terceiros negativo
// ============================================================
Router.register('equipe', async function(container) {
  var currentPeriod = 15;
  var currentLoja = 'all';
  var chartInstances = [];

  function destroyCharts() {
    chartInstances.forEach(function(c) { if (c && c.destroy) c.destroy(); });
    chartInstances = [];
  }

  container.innerHTML =
   '<div class="toolbar anim">' +
      '<div class="period-pills">' +
        '<button class="pp" data-d="hoje">Hoje</button>' +
        '<button class="pp" data-d="7">7d</button>' +
        '<button class="pp active" data-d="15">15d</button>' +
        '<button class="pp" data-d="30">30d</button>' +
        '<button class="pp" data-d="60">60d</button>' +
        '<button class="pp" data-d="90">90d</button>' +
      '</div>' +
      '<select class="filter-select" id="filterLojaEq"><option value="all">Todas as lojas</option></select>' +
    '</div>' +
    '<div id="eqBloco1"></div>' +
    '<div id="eqBloco3"></div>' +
    '<div id="eqBloco2"></div>' +
    '<div id="eqBloco4"></div>' +
    '<div id="eqBloco5"></div>';

  var lojas = await API.getLojas(window.NEXO_REDE_ID);
  UI.populateLojaFilter('filterLojaEq', lojas);

  UI.initPeriodPills(function(days) {
    currentPeriod = days;
    loadData();
  });
  var ppHoje = document.querySelector('.pp[data-d="hoje"]');
  if (ppHoje) {
    ppHoje.addEventListener('click', function() {
      document.querySelectorAll('.pp').forEach(function(p) { p.classList.remove('active'); });
      ppHoje.classList.add('active');
      currentPeriod = 1;
      loadData();
    });
  }

  document.getElementById('filterLojaEq').addEventListener('change', function() {
    currentLoja = this.value;
    API.clearCache();
    loadData();
  });

  await loadData();

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════
  function isAcougueiro(cargo) {
    if (!cargo) return false;
    var c = cargo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return c.indexOf('acougueir') >= 0;
  }
  function isAuxiliar(cargo) { return cargo && cargo.toLowerCase().indexOf('auxiliar') >= 0; }
  function isBalconista(cargo) { return cargo && cargo.toLowerCase().indexOf('balconista') >= 0; }
  function isOperacional(cargo) { return isAcougueiro(cargo) || isAuxiliar(cargo) || isBalconista(cargo); }

  function getMarca(p) {
    var m = p.marca_terceiro;
    if (!m || m.trim() === '') return p.nome || 'Terceiro';
    return m;
  }

  // FIX: derive loja_id from pessoa when missing
  function enrichPresenca(presData, allPessoas) {
    var pessoaLojaMap = {};
    allPessoas.forEach(function(p) { pessoaLojaMap[p.id] = p.loja_id; });
    presData.forEach(function(d) {
      if (!d.data && d.created_at) d.data = d.created_at.slice(0, 10);
      if (!d.loja_id && d.pessoa_id && pessoaLojaMap[d.pessoa_id]) {
        d.loja_id = pessoaLojaMap[d.pessoa_id];
      }
      if (typeof d.presente === 'boolean') {
        d.presente_str = d.presente ? 'SIM' : 'NAO';
      } else {
        d.presente_str = (d.presente === true || d.presente === 'SIM' || d.presente === 'true') ? 'SIM' : 'NAO';
      }
    });
    return presData.filter(function(d) { return d.data; });
  }

  function hmColor(pct) {
    if (pct >= 95) return '#1a7a3a';
    if (pct >= 90) return '#2D8653';
    if (pct >= 80) return '#5a9e3e';
    if (pct >= 70) return '#8ab535';
    if (pct >= 60) return '#C9A84C';
    if (pct >= 50) return '#C97B2C';
    return '#C0504D';
  }
  function hmSoftBg(p) { return p >= 90 ? 'rgba(45,134,83,0.12)' : p >= 70 ? 'rgba(138,181,53,0.12)' : p >= 50 ? 'rgba(201,123,44,0.12)' : 'rgba(192,80,77,0.12)'; }
  function hmSoftColor(p) { return p >= 90 ? '#2D8653' : p >= 70 ? '#6a8c30' : p >= 50 ? '#C97B2C' : '#C0504D'; }

  function notaH(totalPres, totalAll) {
    if (totalAll === 0) return '<span class="eq-no-terc">\u2014</span>';
    var p = Math.round(totalPres / totalAll * 100);
    var bg;
    if (p >= 95) bg = '#1a7a3a'; else if (p >= 90) bg = '#2D8653'; else if (p >= 85) bg = '#5a9e3e';
    else if (p >= 80) bg = '#8ab535'; else if (p >= 75) bg = '#b8c428'; else if (p >= 70) bg = '#C9A84C';
    else if (p >= 65) bg = '#C97B2C'; else if (p >= 55) bg = '#c25a2a'; else bg = '#C0504D';
    return '<span class="eq-nota" style="background:' + bg + '">' + p + '%</span>';
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

  function classifyMotivo(mot) {
    if (!mot) return 'fo';
    var m = mot.toLowerCase();
    if (m.indexOf('injustif') >= 0 || m === 'falta' || m.indexOf('falta inj') >= 0) return 'fi';
    if (m.indexOf('atestado') >= 0 || m.indexOf('medico') >= 0 || m.indexOf('m\u00e9dico') >= 0) return 'at';
    if (m.indexOf('justif') >= 0) return 'fj';
    return 'fo';
  }

  // ══════════════════════════════════════════════════════════
  // LOAD DATA
  // ══════════════════════════════════════════════════════════
  async function loadData() {
    destroyCharts();

    var filters = {};
    if (currentLoja !== 'all') filters.lojaId = currentLoja;

    var presenca = await API.getPresenca(filters);
    var pessoas = await API.getPessoas(filters.lojaId || null);

    // Enrich presenca: derive loja_id, normalize presente
    presenca = enrichPresenca(presenca, pessoas);

    var pessoasSetor = pessoas.filter(function(p) { return p.tipo === 'SETOR'; });
    var pessoasTerc = pessoas.filter(function(p) { return p.tipo === 'TERCEIRO'; });

    // FIX: anchor to maxDate from actual data
    var maxDate = presenca.length > 0 ? presenca.reduce(function(mx, d) { return d.data > mx ? d.data : mx; }, '2000-01-01') : new Date().toISOString().slice(0, 10);
    var range = Utils.periodRange(currentPeriod, maxDate);
    var presNoPeriodo = presenca.filter(function(d) { return d.data >= range.desde && d.data <= range.ate; });

    // Metrics
    var diasUnicos = {};
    presNoPeriodo.forEach(function(d) { diasUnicos[d.data] = true; });
    var numDias = Object.keys(diasUnicos).length || 1;

    // Setor presence
    var setorIds = {};
    pessoasSetor.forEach(function(p) { setorIds[p.id] = true; });
    var presSetorRecs = presNoPeriodo.filter(function(d) { return setorIds[d.pessoa_id]; });
    var presSetorOk = presSetorRecs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var efetSetor = presSetorRecs.length > 0 ? Math.round(presSetorOk / presSetorRecs.length * 100) : 0;
    var mediaPresSetor = Math.round(presSetorOk / numDias);
    var mediAusentesSetor = Math.round((presSetorRecs.length - presSetorOk) / numDias);

    // Terceiro presence
    var tercIds = {};
    pessoasTerc.forEach(function(p) { tercIds[p.id] = true; });
    var presTercRecs = presNoPeriodo.filter(function(d) { return tercIds[d.pessoa_id]; });
    var presTercOk = presTercRecs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var efetTerc = presTercRecs.length > 0 ? Math.round(presTercOk / presTercRecs.length * 100) : 0;
    var mediaTercPres = Math.round(presTercOk / numDias);

    // Pessoas sem registro no periodo = inativos
    var pessoasComRegistro = {};
    presNoPeriodo.forEach(function(d) { pessoasComRegistro[d.pessoa_id] = true; });
    var inativos = pessoasSetor.filter(function(p) { return !pessoasComRegistro[p.id]; });
    var ativosSetor = pessoasSetor.length - inativos.length;

    // FIX: terceiros presentes no dia = media, nao contagem total
    var tercAusentesMedia = Math.max(0, pessoasTerc.length - mediaTercPres);

    // Variacao vs periodo anterior
    var rangeAnt = { desde: range.desdeAnterior, ate: range.ateAnterior };
    var presAntPeriodo = presenca.filter(function(d) { return d.data >= rangeAnt.desde && d.data <= rangeAnt.ate; });
    var presSetorAnt = presAntPeriodo.filter(function(d) { return setorIds[d.pessoa_id]; });
    var presSetorOkAnt = presSetorAnt.filter(function(d) { return d.presente_str === 'SIM'; }).length;
    var efetSetorAnt = presSetorAnt.length > 0 ? Math.round(presSetorOkAnt / presSetorAnt.length * 100) : efetSetor;
    var varPres = efetSetor - efetSetorAnt;

    // Motivos de ausencia
    var motivos = {};
    presNoPeriodo.filter(function(d) { return d.presente_str === 'NAO' && d.motivo_ausencia && d.motivo_ausencia.trim(); })
      .forEach(function(d) { var m = d.motivo_ausencia.trim(); motivos[m] = (motivos[m] || 0) + 1; });
    var motivosList = Object.entries(motivos).sort(function(a, b) { return b[1] - a[1]; });

    // Presenca por marca
    var marcaGroups = {};
    pessoasTerc.forEach(function(p) {
      var m = getMarca(p);
      if (!marcaGroups[m]) marcaGroups[m] = { total: 0, ids: [] };
      marcaGroups[m].total++;
      marcaGroups[m].ids.push(p.id);
    });
    var marcaPresenca = {};
    Object.keys(marcaGroups).forEach(function(m) {
      var ids = marcaGroups[m].ids;
      var recs = presNoPeriodo.filter(function(d) { return ids.indexOf(d.pessoa_id) >= 0; });
      var pres = recs.filter(function(d) { return d.presente_str === 'SIM'; }).length;
      marcaPresenca[m] = { total: marcaGroups[m].total, pres: recs.length > 0 ? Math.round(pres / recs.length * 100) : 0 };
    });

    // RENDER ALL BLOCKS
    renderBloco1(efetSetor, efetTerc, pessoasSetor.length, ativosSetor, inativos.length,
                 mediaPresSetor, mediAusentesSetor, varPres,
                 pessoasTerc.length, mediaTercPres, tercAusentesMedia, marcaPresenca, motivosList);
    renderBloco3(presenca, maxDate);
    renderBloco2(presNoPeriodo, pessoas, lojas, pessoasSetor, pessoasTerc);
    renderBloco4(presenca, pessoas, lojas, maxDate);
    renderBloco5(pessoas, lojas);
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO 1 — EFETIVIDADE + VELOCIMETROS
  // ══════════════════════════════════════════════════════════
  function renderBloco1(efetS, efetT, cadastrados, ativos, inativosCount,
                        presentes, ausentes, varPres,
                        totalTerc, mediaTercPres, tercAusentes, marcaPresenca, motivosList) {

    var html = '<div class="section-block anim d1">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--navy)"></span> Efetividade e quadro de pessoal <span class="sh-line"></span></div>' +
      '<div class="eq-top-row">' +
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
              (varPres !== 0 ? '<span class="var-badge ' + (varPres > 0 ? 'up' : 'down') + '">' + (varPres > 0 ? '\u25B2' : '\u25BC') + ' ' + Math.abs(varPres) + ' p.p.</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="eq-motivos">';

    // Ausencias do dia
    if (ausentes > 0 || motivosList.length > 0) {
      html += '<div class="eq-half-label">AUSENCIAS (' + ausentes + ')</div><div class="eq-separator"></div>';
      motivosList.slice(0, 3).forEach(function(m) {
        var mc = '#9CA3AF';
        var tp = classifyMotivo(m[0]);
        if (tp === 'fi') mc = '#C0504D';
        else if (tp === 'at') mc = '#C97B2C';
        else if (tp === 'fj') mc = '#3670A0';
        html += '<div class="eq-mot-row"><span class="eq-mot-val" style="color:' + mc + '">' + m[1] + '</span><div class="eq-mot-bar" style="width:' + Math.min(80, m[1] * 15) + 'px;background:' + mc + '"></div><span class="eq-mot-label">' + m[0] + '</span></div>';
      });
    }

    if (inativosCount > 0) {
      html += '<div style="margin-top:8px;border-top:0.5px solid rgba(0,0,0,0.06);padding-top:8px">' +
        '<div class="eq-half-label">INATIVOS (' + inativosCount + ')</div>' +
        '<div class="eq-mot-row"><span class="eq-mot-val" style="color:var(--blue)">' + inativosCount + '</span><div class="eq-mot-bar" style="width:60px;background:var(--blue)"></div><span class="eq-mot-label">Sem registro</span></div></div>';
    }

    html += '</div></div>'; // close eq-half setor

    html += '<div class="eq-divider"></div>';

    // TERCEIROS
    html += '<div class="eq-half">' +
      '<div class="eq-gauge-block">' +
        '<div class="eq-half-label">EFETIVIDADE TERCEIROS</div>' +
        '<canvas id="gaugeTerc" width="150" height="140"></canvas>' +
        '<div class="eq-gauge-detail"><strong>' + mediaTercPres + '</strong> de <strong>' + totalTerc + '</strong> presentes<br><span style="color:var(--t3)">Acumulado periodo</span></div>' +
      '</div>' +
      '<div class="eq-cascade" style="min-width:80px;max-width:100px">' +
        '<div class="eq-half-label">QUADRO</div><div class="eq-separator"></div>' +
        '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--purple)">' + totalTerc + '</span><span class="eq-cas-label">Ativos</span></div>' +
        '<div class="eq-cas-connector"></div>' +
        '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--green)">' + mediaTercPres + '</span><span class="eq-cas-label">Presentes</span></div>' +
        '<div class="eq-cas-connector"></div>' +
        '<div class="eq-cas-row"><span class="eq-cas-num" style="color:var(--red)">' + tercAusentes + '</span><span class="eq-cas-label">Ausente</span></div>' +
      '</div>' +
      '<div class="eq-marca-block"><div class="eq-half-label">POR MARCA</div><div class="eq-separator"></div>';

    Object.keys(marcaPresenca).forEach(function(m) {
      var mp = marcaPresenca[m];
      var presCount = Math.round(mp.total * mp.pres / 100);
      var pc = mp.pres >= 90 ? 'var(--green)' : mp.pres >= 70 ? 'var(--orange)' : 'var(--red)';
      html += '<div class="eq-marca-row"><span class="eq-marca-tag">' + m + '</span><div class="eq-marca-nums"><span class="eq-mn-val" style="color:' + pc + '">' + presCount + '</span><span class="eq-mn-sep">/</span><span style="color:var(--t3)">' + mp.total + '</span></div><span class="eq-marca-pres" style="color:' + pc + '">' + mp.pres + '%</span></div>';
    });

    html += '</div></div></div></div>';
    document.getElementById('eqBloco1').innerHTML = html;
    drawSpeedometer('gaugeSetor', efetS, '#2D8653');
    drawSpeedometer('gaugeTerc', efetT, '#7153A0');
  }

  function drawSpeedometer(id, pct, color) {
    var c = document.getElementById(id);
    if (!c) return;
    var ctx = c.getContext('2d');
    var cx = 75, cy = 82, r = 56;
    var sA = Math.PI * 0.75, eA = Math.PI * 2.25, sw = eA - sA;
    var zones = [{from:0,to:0.5,color:'#C0504D'},{from:0.5,to:0.7,color:'#C97B2C'},{from:0.7,to:0.85,color:'#E8C96A'},{from:0.85,to:1.0,color:'#2D8653'}];
    ctx.lineWidth = 10; ctx.lineCap = 'butt';
    zones.forEach(function(z) { ctx.beginPath(); ctx.arc(cx,cy,r,sA+sw*z.from,sA+sw*z.to); ctx.strokeStyle=z.color; ctx.globalAlpha=0.18; ctx.stroke(); });
    ctx.globalAlpha = 1; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx,cy,r,sA,sA+sw*(pct/100)); ctx.strokeStyle=color; ctx.stroke();
    [0,25,50,75,100].forEach(function(t) {
      var ang=sA+sw*(t/100), inner=r+8;
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(ang)*(r+2),cy+Math.sin(ang)*(r+2)); ctx.lineTo(cx+Math.cos(ang)*inner,cy+Math.sin(ang)*inner);
      ctx.strokeStyle='rgba(26,39,68,0.15)'; ctx.lineWidth=1; ctx.stroke();
      ctx.font='400 8px Outfit'; ctx.fillStyle='#9CA3AF'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(t,cx+Math.cos(ang)*(inner+8),cy+Math.sin(ang)*(inner+8));
    });
    var nAng=sA+sw*(pct/100), nLen=r-14;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(nAng)*nLen,cy+Math.sin(nAng)*nLen);
    ctx.strokeStyle='#0C1425'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fillStyle='#0C1425'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
    ctx.font='700 26px Outfit'; ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(pct+'%',cx,cy+30);
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO 2 — TABELA UNIFICADA
  // ══════════════════════════════════════════════════════════
  function renderBloco2(presData, pessoas, lojasArr, pesSetor, pesTerc) {
    var byLoja = {};
    lojasArr.forEach(function(l) { byLoja[l.id] = { nome: l.nome, sCad:0, sAtiv:0, sFaltas:0, tMarca:null, tCad:0, tAtiv:0, tFaltas:0, sFi:0, sAt:0, sFj:0, sFo:0, tFi:0, tAt:0, tFj:0, tFo:0 }; });
    var setorIds = {}; pesSetor.forEach(function(p) { setorIds[p.id] = true; });
    var tercIds = {}; pesTerc.forEach(function(p) { tercIds[p.id] = true; });

    pesSetor.forEach(function(p) { if (byLoja[p.loja_id]) byLoja[p.loja_id].sCad++; });
    pesTerc.forEach(function(p) { if (byLoja[p.loja_id]) { byLoja[p.loja_id].tCad++; byLoja[p.loja_id].tMarca = getMarca(p); } });

    presData.forEach(function(d) {
      if (!byLoja[d.loja_id]) return;
      var isTerc = tercIds[d.pessoa_id];
      if (d.presente_str === 'SIM') {
        if (isTerc) byLoja[d.loja_id].tAtiv++;
        else byLoja[d.loja_id].sAtiv++;
      } else {
        var tp = classifyMotivo(d.motivo_ausencia);
        if (isTerc) { byLoja[d.loja_id].tFaltas++; byLoja[d.loja_id]['t' + tp.charAt(0).toUpperCase() + tp.slice(1)]++; }
        else { byLoja[d.loja_id].sFaltas++; }
        // Classify
        if (!isTerc) {
          if (tp === 'fi') byLoja[d.loja_id].sFi++;
          else if (tp === 'at') byLoja[d.loja_id].sAt++;
          else if (tp === 'fj') byLoja[d.loja_id].sFj++;
          else byLoja[d.loja_id].sFo++;
        }
      }
    });

    function badgeC(atv, flt) {
      var total = atv + flt;
      if (total === 0) return 'eq-hcb-neutral';
      return atv / total >= 0.9 ? 'eq-hcb-good' : atv / total >= 0.7 ? 'eq-hcb-warn' : 'eq-hcb-bad';
    }

    var lojaKeys = Object.keys(byLoja).filter(function(k) { return byLoja[k].sCad > 0 || byLoja[k].tCad > 0; });
    var tsCad=0,tsAtiv=0,tsFlt=0,ttCad=0,ttAtiv=0,ttFlt=0;
    lojaKeys.forEach(function(k) { var d=byLoja[k]; tsCad+=d.sCad; tsAtiv+=d.sAtiv; tsFlt+=d.sFaltas; ttCad+=d.tCad; ttAtiv+=d.tAtiv; ttFlt+=d.tFaltas; });

    var html = '<div class="section-block anim d3">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--blue)"></span> Quadro e presenca por loja \u2014 periodo <span class="sh-line"></span></div>' +
      '<div class="eq-legend-bar"><span class="eq-li"><span class="eq-ld" style="background:#C0504D"></span>Falta injust.</span><span class="eq-li"><span class="eq-ld" style="background:#C97B2C"></span>Atestado</span><span class="eq-li"><span class="eq-ld" style="background:#3670A0"></span>Justificada</span><span class="eq-li"><span class="eq-ld" style="background:#9CA3AF"></span>Folga</span></div>' +
      '<div class="eq-tbl-card"><div class="eq-tbl-inner"><table class="eq-table">' +
      '<thead><tr><th rowspan="2" style="text-align:left;padding-left:14px">Loja</th><th colspan="4" style="text-align:center">Setor</th><th colspan="4" class="eq-grp" style="text-align:center">Terceiros</th><th rowspan="2" class="eq-grp" style="text-align:center">Nota</th></tr>' +
      '<tr class="eq-sub-hdr"><th>Cad.</th><th>Ativos</th><th>Cobertura</th><th>Ausencias</th><th class="eq-sep">Marca</th><th>Ativos</th><th>Cobertura</th><th>Ausencias</th></tr></thead><tbody>';

    // Totals first
    html += '<tr class="eq-tot-row"><td style="text-align:left;padding-left:14px;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:0.1em">Rede</td>' +
      '<td>' + tsCad + '</td><td><strong>' + tsAtiv + '</strong></td><td>' + notaH(tsAtiv, tsAtiv+tsFlt) + '</td><td><span class="eq-flt" style="color:#C0504D">' + tsFlt + '</span></td>' +
      '<td class="eq-sep">' + ttCad + '</td><td><strong>' + ttAtiv + '</strong></td><td>' + notaH(ttAtiv, ttAtiv+ttFlt) + '</td><td><span class="eq-flt" style="color:#C0504D">' + ttFlt + '</span></td>' +
      '<td class="eq-grp">' + notaH(tsAtiv+ttAtiv, tsAtiv+tsFlt+ttAtiv+ttFlt) + '</td></tr>';

    lojaKeys.forEach(function(k) {
      var d = byLoja[k];
      var hasT = d.tCad > 0;
      var sTotal = d.sAtiv + d.sFaltas;
      var tTotal = d.tAtiv + d.tFaltas;
      html += '<tr><td style="text-align:left;padding-left:14px" class="eq-loja-name">' + d.nome + '</td>' +
        '<td>' + d.sCad + '</td><td><span class="eq-hcb ' + badgeC(d.sAtiv, d.sFaltas) + '">' + d.sAtiv + '</span></td>' +
        '<td>' + notaH(d.sAtiv, sTotal) + '</td><td>' + ausBarH(d.sFi, d.sAt, d.sFj, d.sFo) + '</td>' +
        '<td class="eq-sep">' + (hasT ? '<span class="eq-marca-tag-sm">' + d.tMarca + '</span>' : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td>' + (hasT ? '<span class="eq-hcb ' + badgeC(d.tAtiv, d.tFaltas) + '">' + d.tAtiv + '</span>' : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td>' + (hasT ? notaH(d.tAtiv, tTotal) : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td>' + (hasT ? ausBarH(d.tFi, d.tAt, d.tFj, d.tFo) : '<span class="eq-no-terc">\u2014</span>') + '</td>' +
        '<td class="eq-grp">' + notaH(d.sAtiv+d.tAtiv, sTotal+tTotal) + '</td></tr>';
    });

    html += '</tbody></table></div></div></div>';
    document.getElementById('eqBloco2').innerHTML = html;
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO 3 — TENDENCIA DE EFETIVIDADE
  // ══════════════════════════════════════════════════════════
  function renderBloco3(presenca, maxDate) {
    // Monthly
    var byMonth = {};
    presenca.forEach(function(d) { var mk = d.data.slice(0,7); if (!byMonth[mk]) byMonth[mk]={total:0,pres:0}; byMonth[mk].total++; if (d.presente_str==='SIM') byMonth[mk].pres++; });
    var months = Object.keys(byMonth).sort().slice(-6);
    var mLabels = months.map(function(m) {
      var mesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return mesNomes[parseInt(m.slice(5))-1] || m.slice(5);
    });
    var mData = months.map(function(m) { return byMonth[m].total>0 ? Math.round(byMonth[m].pres/byMonth[m].total*100) : 0; });
    var mAtivos = months.map(function(m) {
      var du={}; presenca.filter(function(d){return d.data.slice(0,7)===m}).forEach(function(d){du[d.data]=true});
      var nd=Object.keys(du).length||1;
      return Math.round(presenca.filter(function(d){return d.data.slice(0,7)===m && d.presente_str==='SIM'}).length/nd);
    });

    // Weekly (last 8)
    var wLabels=[], wData=[], wAtivos=[];
    for (var w=7;w>=0;w--) {
      var wEnd=new Date(maxDate); wEnd.setDate(wEnd.getDate()-w*7);
      var wStart=new Date(wEnd); wStart.setDate(wStart.getDate()-6);
      var ws=wStart.toISOString().slice(0,10), we=wEnd.toISOString().slice(0,10);
      var wRecs=presenca.filter(function(d){return d.data>=ws && d.data<=we});
      var wPres=wRecs.filter(function(d){return d.presente_str==='SIM'}).length;
      wLabels.push('S'+(15-w));
      wData.push(wRecs.length>0 ? Math.round(wPres/wRecs.length*100) : 0);
      var wDu={}; wRecs.forEach(function(d){wDu[d.data]=true});
      wAtivos.push(Math.round(wPres/(Object.keys(wDu).length||1)));
    }

    // Daily (last 7)
    var dLabels=[], dData=[], dAtivos=[];
    var diasNome=['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
    for (var dd=6;dd>=0;dd--) {
      var dt=new Date(maxDate); dt.setDate(dt.getDate()-dd);
      var ds=dt.toISOString().slice(0,10);
      dLabels.push(diasNome[dt.getDay()]);
      var dRecs=presenca.filter(function(d){return d.data===ds});
      var dPres=dRecs.filter(function(d){return d.presente_str==='SIM'}).length;
      dData.push(dRecs.length>0 ? Math.round(dPres/dRecs.length*100) : 0);
      dAtivos.push(dPres);
    }

    var lastM=mData.length>0?mData[mData.length-1]:0, prevM=mData.length>1?mData[mData.length-2]:lastM;
    var lastS=wData.length>0?wData[wData.length-1]:0, prevS=wData.length>1?wData[wData.length-2]:lastS;
    var lastD=dData.length>0?dData[dData.length-1]:0, prevD=dData.length>1?dData[dData.length-2]:lastD;

    function cardH(id, label, big, vr, lbls, data, atvs) {
      var vc=vr>=0?'up':'down', vt=vr>=0?'\u25B2 '+vr+' p.p.':'\u25BC '+Math.abs(vr)+' p.p.';
      var bc=big>=90?'var(--green)':big>=80?'var(--orange)':'var(--red)';
      return '<div><div class="eq-chart-card"><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px"><div class="eq-card-label">'+label+'</div></div>' +
        '<div style="display:flex;align-items:baseline;gap:6px"><span class="eq-card-big" style="color:'+bc+'">'+big+'%</span><span class="eq-card-var '+vc+'">'+vt+'</span></div>' +
        '<div class="eq-chart-area"><canvas id="'+id+'"></canvas></div>' +
        '<table class="eq-data-table" id="tbl_'+id+'"></table></div></div>';
    }

    var html = '<div class="section-block anim d2"><div class="section-header"><span class="sh-dot" style="background:var(--green)"></span> Tendencia de efetividade <span class="sh-line"></span></div><div class="eq-tri-grid">' +
      cardH('eqChMes','EFETIVIDADE MENSAL',lastM,lastM-prevM,mLabels,mData,mAtivos) +
      cardH('eqChSem','ULTIMAS 8 SEMANAS',lastS,lastS-prevS,wLabels,wData,wAtivos) +
      cardH('eqChDia','ULTIMOS 7 DIAS',lastD,lastD-prevD,dLabels,dData,dAtivos) +
      '</div></div>';
    document.getElementById('eqBloco3').innerHTML = html;

    var dlPlugin = { id:'eqDl', afterDatasetsDraw:function(chart){ var ctx=chart.ctx; chart.data.datasets.forEach(function(ds,i){ chart.getDatasetMeta(i).data.forEach(function(pt,idx){ ctx.save(); ctx.font='600 10px Outfit'; ctx.fillStyle='#1F2937'; ctx.textAlign='center'; ctx.fillText(ds.data[idx]+'%',pt.x,pt.y-10); ctx.restore(); }); }); } };
    var lineCfg = {tension:0.35,pointRadius:3,pointBackgroundColor:'#2D8653',pointBorderColor:'#fff',pointBorderWidth:2,borderColor:'#2D8653',borderWidth:2.5,fill:true,backgroundColor:'rgba(45,134,83,0.06)'};

    // FIX: show X axis labels
    var chartSets = [
      {id:'eqChMes',labels:mLabels,data:mData,ativos:mAtivos},
      {id:'eqChSem',labels:wLabels,data:wData,ativos:wAtivos},
      {id:'eqChDia',labels:dLabels,data:dData,ativos:dAtivos}
    ];

    chartSets.forEach(function(cs) {
      var canvas = document.getElementById(cs.id);
      if (!canvas) return;
      var minVal = Math.min.apply(null, cs.data.filter(function(v){return v>0}));
      var ch = new Chart(canvas, {
        type:'line',
        data:{labels:cs.labels, datasets:[Object.assign({data:cs.data},lineCfg)]},
        options:{
          responsive:true, maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{
            y:{display:false, min:Math.max(0,minVal-15), max:100, grace:'10%'},
            x:{display:true, grid:{display:false}, border:{display:false},
               ticks:{font:{family:'Outfit',size:10},color:'#9CA3AF'}}
          },
          layout:{padding:{top:20,left:0,right:0,bottom:0}}
        },
        plugins:[dlPlugin]
      });
      chartInstances.push(ch);

      // Build data table
      var tbl = document.getElementById('tbl_'+cs.id);
      if (!tbl) return;
      var r1='<tr class="eq-dt-val"><td>Ativos</td>', r2='<tr class="eq-dt-efet"><td>Efetiv.</td>', r3='<tr class="eq-dt-var"><td>Var %</td>';
      for (var i=0;i<cs.labels.length;i++) {
        r1+='<td>'+cs.ativos[i]+'</td>'; r2+='<td>'+cs.data[i]+'%</td>';
        if(i===0) r3+='<td class="eq-arr-eq">=</td>';
        else { var diff=cs.data[i]-cs.data[i-1]; r3+='<td class="'+(diff>0?'eq-arr-up':diff<0?'eq-arr-down':'eq-arr-eq')+'">'+(diff>0?'\u25B2 '+diff+'%':diff<0?'\u25BC '+Math.abs(diff)+'%':'=')+'</td>'; }
      }
      tbl.innerHTML = r1+'</tr>'+r2+'</tr>'+r3+'</tr>';
    });
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO 4 — AGENDA 14 DIAS HEATMAP
  // ══════════════════════════════════════════════════════════
  function renderBloco4(presenca, pessoas, lojasArr, maxDate) {
    var diasN = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
    // FIX: anchor to maxDate from data, not today
    var cols = [];
    for (var i=13;i>=0;i--) {
      var dt=new Date(maxDate); dt.setDate(dt.getDate()-i);
      cols.push({iso:dt.toISOString().slice(0,10), label:diasN[dt.getDay()], dd:String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0'), isToday:i===0, isMonday:dt.getDay()===1});
    }

    var pesSetor=pessoas.filter(function(p){return p.tipo==='SETOR'});
    var pesTerc=pessoas.filter(function(p){return p.tipo==='TERCEIRO'});

    var lojaTeam = {};
    lojasArr.forEach(function(l){lojaTeam[l.id]={nome:l.nome,setor:[],terc:[]}});
    pesSetor.forEach(function(p){if(lojaTeam[p.loja_id])lojaTeam[p.loja_id].setor.push(p)});
    pesTerc.forEach(function(p){if(lojaTeam[p.loja_id])lojaTeam[p.loja_id].terc.push(p)});

    var presIndex = {};
    presenca.forEach(function(d) { presIndex[d.pessoa_id+'|'+d.data] = d.presente_str==='SIM' ? 'p' : (d.motivo_ausencia||'falta'); });

    var el = document.getElementById('eqBloco4');
    var html = '<div class="section-block anim d4"><div class="section-header"><span class="sh-dot" style="background:var(--gold)"></span> Sistematica de atendimento <span class="sh-line"></span></div>' +
      '<div class="eq-sub-info">Ultimos 14 dias \u00b7 Presenca em % do quadro</div><div class="eq-agenda"><div class="eq-ag-hdr"><div class="eq-ah-corner">Loja</div>';
    cols.forEach(function(c) { html+='<div class="eq-ah-col'+(c.isToday?' eq-today':'')+(c.isMonday?' eq-wk-start':'')+'"><span class="eq-ah-day">'+c.label+'</span><span class="eq-ah-date">'+c.dd+'</span></div>'; });
    html += '</div>';

    // FIX: Total row at TOP
    var allPeople = pesSetor.concat(pesTerc);
    html += '<div class="eq-ag-totrow"><div class="eq-ag-tot-label">Total rede</div>';
    cols.forEach(function(c) {
      var total=allPeople.length, pres=allPeople.filter(function(p){return presIndex[p.id+'|'+c.iso]==='p'}).length;
      var pct=total>0?Math.round(pres/total*100):0;
      html+='<div class="eq-ag-tot-cell'+(c.isToday?' eq-today-bg':'')+(c.isMonday?' eq-wk-start':'')+'"><div class="eq-hm" style="background:'+hmColor(pct)+'">'+pct+'%</div></div>';
    });
    html += '</div><div class="eq-ag-body" id="eqAgBody"></div></div></div>';
    el.innerHTML = html;

    var agBody = document.getElementById('eqAgBody');
    var lojaIds = Object.keys(lojaTeam).filter(function(k){return lojaTeam[k].setor.length+lojaTeam[k].terc.length>0});

    lojaIds.forEach(function(lid) {
      var lt = lojaTeam[lid], total = lt.setor.length+lt.terc.length;
      var row = document.createElement('div'); row.className='eq-loja-row';
      var nm='<div class="eq-lr-name"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M9 18l6-6-6-6"/></svg>'+lt.nome+' <span class="eq-lr-tc">('+total+')</span></div>';
      var cells='';
      cols.forEach(function(c) {
        var pres=0; lt.setor.concat(lt.terc).forEach(function(p){if(presIndex[p.id+'|'+c.iso]==='p')pres++});
        var pct=total>0?Math.round(pres/total*100):0;
        cells+='<div class="eq-lr-cell'+(c.isToday?' eq-today-bg':'')+(c.isMonday?' eq-wk-start':'')+'"><div class="eq-hm" style="background:'+hmColor(pct)+'">'+pct+'%</div></div>';
      });
      row.innerHTML = nm+cells;
      agBody.appendChild(row);

      var panel = document.createElement('div'); panel.className='eq-sub-panel'; panel.id='eqp-'+lid;
      panel.innerHTML = '<div class="eq-sub-legend"><span class="eq-sli"><span class="eq-sld" style="background:#2D8653"></span>Presente</span><span class="eq-sli"><span class="eq-sld" style="background:#C0504D"></span>Falta</span><span class="eq-sli"><span class="eq-sld" style="background:#C97B2C"></span>Justif.</span><span class="eq-sli"><span class="eq-sld" style="background:#d1d5db"></span>Folga</span></div>';

      function addSec(label,cssLbl,cssBadge,ppl,isMarca) {
        if (ppl.length===0) return;
        var secH='<div class="eq-ssh"><div class="eq-ssh-label '+cssLbl+'">'+label+' <span class="eq-ssh-badge '+cssBadge+'">'+ppl.length+'</span></div>';
        cols.forEach(function(c) {
          var pc=0; ppl.forEach(function(p){if(presIndex[p.id+'|'+c.iso]==='p')pc++});
          var sp=ppl.length>0?Math.round(pc/ppl.length*100):0;
          secH+='<div class="eq-ssh-cell'+(c.isToday?' eq-today-bg':'')+(c.isMonday?' eq-wk-start':'')+'"><div class="eq-hm-soft" style="background:'+hmSoftBg(sp)+';color:'+hmSoftColor(sp)+'">'+sp+'%</div></div>';
        });
        secH+='</div>';
        panel.innerHTML += secH;

        ppl.forEach(function(p) {
          var pr='<div class="eq-pr"><div class="eq-pr-name">'+(Engine.pessoaName(p.id)||p.nome)+(isMarca?' <span class="eq-mtag">'+(p.marca_terceiro||'')+'</span>':' <span class="eq-ctag">'+(p.cargo||'')+'</span>')+'</div>';
          cols.forEach(function(c) {
            var key=p.id+'|'+c.iso, st=presIndex[key];
            var cls='eq-sd-o', txt='', tipTxt='Sem registro';
            if (st==='p') { cls='eq-sd-p'; tipTxt='Presente'; }
            else if (st) {
              var tp=classifyMotivo(st);
              if (tp==='fi') { cls='eq-sd-a'; txt='F'; tipTxt='Falta injustificada'; }
              else if (tp==='at') { cls='eq-sd-j'; txt='A'; tipTxt='Atestado'; }
              else if (tp==='fj') { cls='eq-sd-j'; txt='J'; tipTxt='Justificada'; }
              else { cls='eq-sd-o'; tipTxt=st; }
            }
            pr+='<div class="eq-pr-cell'+(c.isToday?' eq-today-bg':'')+(c.isMonday?' eq-wk-start':'')+'"><div class="eq-sd '+cls+'" title="'+tipTxt+' \u2014 '+c.dd+'">'+txt+'</div></div>';
          });
          pr+='</div>';
          panel.innerHTML += pr;
        });
      }
      addSec('Setor','eq-ssh-s','eq-sshb-s',lt.setor,false);
      addSec('Terceiros','eq-ssh-t','eq-sshb-t',lt.terc,true);
      agBody.appendChild(panel);

      row.addEventListener('click',function(){
        var p=document.getElementById('eqp-'+lid), chev=row.querySelector('svg');
        if(p.classList.contains('eq-sub-open')){p.classList.remove('eq-sub-open');chev.style.transform='rotate(0deg)'}
        else{p.classList.add('eq-sub-open');chev.style.transform='rotate(90deg)'}
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO 5 — HC TABLE
  // ══════════════════════════════════════════════════════════
  function renderBloco5(pessoas, lojasArr) {
    var pesSetor = pessoas.filter(function(p){return p.tipo==='SETOR'});
    var fatSim = {};
    lojasArr.forEach(function(l,i) { var fats=[850,620,480,720,350,280,400,500,600,300]; fatSim[l.id]={mes:fats[i%fats.length],tri:fats[i%fats.length]*2.8}; });
    var custoSim = {};
    lojasArr.forEach(function(l) { custoSim[l.id]=Math.round((fatSim[l.id]||{mes:300}).mes*(0.045+Math.random()*0.025)); });

    var svgDn='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="10" height="10"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
    var svgUp='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="10" height="10"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    var svgCk='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="10" height="10"><path d="M20 6L9 17l-5-5"/></svg>';
    var icoT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';
    var icoW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    var icoD='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>';
    var icoTr='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    var icoOk='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

    function fmtK(v){return 'R$ '+v+'k'}
    function fmtM(v){return v>=1000?'R$ '+(v/1000).toFixed(1).replace('.',',')+'M':'R$ '+Math.round(v)+'k'}

    var hcRows=[], tFm=0,tFt=0,tA=0,tAx=0,tBl=0,tR=0,tI=0,tCf=0;
    lojasArr.forEach(function(l) {
      var lPes=pesSetor.filter(function(p){return p.loja_id===l.id});
      if(lPes.length===0) return;
      // FIX: cedilha-safe cargo matching
      var acoug=lPes.filter(function(p){return isAcougueiro(p.cargo)}).length;
      var aux=lPes.filter(function(p){return isAuxiliar(p.cargo)}).length;
      var balc=lPes.filter(function(p){return isBalconista(p.cargo)}).length;
      var real=acoug+aux+balc;
      if(real===0) real=lPes.filter(function(p){return isOperacional(p.cargo)}).length;
      if(real===0) real=lPes.length;

      var fat=fatSim[l.id]||{mes:300,tri:840};
      var custo=custoSim[l.id]||Math.round(fat.mes*0.05);
      var ideal=Math.round((fat.tri/3)/50);
      var gap=real-ideal;
      var impPct=((custo/fat.mes)*100).toFixed(1);
      var prodPC=Math.round(fat.mes/real);
      tFm+=fat.mes;tFt+=fat.tri;tA+=acoug;tAx+=aux;tBl+=balc;tR+=real;tI+=ideal;tCf+=custo;
      hcRows.push({nome:l.nome,fatM:fat.mes,fatT:fat.tri,acoug:acoug,aux:aux,balc:balc,real:real,ideal:ideal,gap:gap,impPct:impPct,prodPC:prodPC});
    });

    var tGap=tR-tI, tImpPct=((tCf/tFm)*100).toFixed(1), tProd=Math.round(tFm/tR);
    var tGapCls=tGap===0?'eq-gap-ok':tGap<0?'eq-gap-deficit':'eq-gap-excess';
    var tImpF=parseFloat(tImpPct); var tImpCls=tImpF>=4.5&&tImpF<=5.5?'eq-imp-ok':(tImpF>=3.5&&tImpF<=6.5?'eq-imp-warn':'eq-imp-bad');
    var tProdCls=tProd>=40&&tProd<=60?'eq-prod-ok':tProd>60?'eq-prod-high':'eq-prod-low';

    var html = '<div class="section-block anim d5"><div class="section-header"><span class="sh-dot" style="background:var(--purple)"></span> Composicao do quadro e produtividade <span class="sh-line"></span></div>' +
      '<div class="eq-sub-info">HC ideal = Fat. tri medio / R$ 50k por colaborador \u00b7 Impacto folha ideal = 5% (+-0.5%)</div>' +
      '<div class="eq-tbl-card"><div class="eq-hc-tbl"><table class="eq-table"><thead><tr>' +
      '<th style="text-align:left;padding-left:14px">Loja</th><th>Fat. mes</th><th>Fat. tri</th><th class="eq-grp">Acoug.</th><th>Aux.</th><th>Balc.</th><th class="eq-grp">Real</th><th>Ideal</th><th>Gap</th><th class="eq-grp">R$/colab</th><th>Imp. folha</th><th class="eq-grp">Diagnostico</th></tr></thead><tbody>';

    // Totals row
    html += '<tr class="eq-tot-hc"><td style="text-align:left;padding-left:14px;font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:0.1em">Rede</td>' +
      '<td class="eq-fat-h">'+fmtM(tFm)+'</td><td class="eq-fat-h">'+fmtM(tFt)+'</td>' +
      '<td class="eq-grp">'+tA+'</td><td>'+tAx+'</td><td>'+tBl+'</td>' +
      '<td class="eq-grp"><strong>'+tR+'</strong></td><td style="color:var(--purple)">'+tI+'</td>' +
      '<td><span class="eq-gap-wrap '+tGapCls+'">'+(tGap<0?svgDn:tGap>0?svgUp:svgCk)+' '+Math.abs(tGap)+'</span></td>' +
      '<td class="eq-grp"><span class="eq-prod '+tProdCls+'">R$ '+tProd+'k</span></td>' +
      '<td><span class="eq-imp '+tImpCls+'">'+tImpPct+'%</span></td><td class="eq-grp"></td></tr>';

    hcRows.forEach(function(d) {
      var gapCls=d.gap===0?'eq-gap-ok':d.gap<0?'eq-gap-deficit':'eq-gap-excess';
      var impF=parseFloat(d.impPct); var impCls=impF>=4.5&&impF<=5.5?'eq-imp-ok':(impF>=3.5&&impF<=6.5?'eq-imp-warn':'eq-imp-bad');
      var prodCls=d.prodPC>=40&&d.prodPC<=60?'eq-prod-ok':d.prodPC>60?'eq-prod-high':'eq-prod-low';

      var pills=[];
      if(d.gap<=-2) pills.push({t:'Subdimensionado',c:'eq-dp-red',i:icoT,tip:'Deficit de '+Math.abs(d.gap)+' pessoas vs ideal. Risco de filas, quebra e ruptura.'});
      else if(d.gap<0) pills.push({t:'Leve deficit',c:'eq-dp-orange',i:icoT,tip:'Falta 1 pessoa para o ideal. Avaliar contratacao.'});
      else if(d.gap>=2) pills.push({t:'Superdimensionado',c:'eq-dp-orange',i:icoT,tip:d.gap+' acima do ideal. Avaliar remanejamento.'});
      else if(d.gap>0) pills.push({t:'Leve excesso',c:'eq-dp-blue',i:icoT,tip:'1 acima. Pode ser estrategico.'});
      else pills.push({t:'Quadro OK',c:'eq-dp-green',i:icoOk,tip:'Adequado ao faturamento.'});
      if(d.aux===0&&d.acoug>1) pills.push({t:'Sem auxiliar',c:'eq-dp-red',i:icoW,tip:'Acougueiros fazendo tarefa de baixo valor. Converter 1 vaga em auxiliar.'});
      if(impF>5.5) pills.push({t:'Folha alta',c:'eq-dp-red',i:icoD,tip:'Impacto '+d.impPct+'%. Acima de 5.5% compromete margem.'});
      else if(impF<4.5) pills.push({t:'Folha baixa',c:'eq-dp-orange',i:icoD,tip:'Apenas '+d.impPct+'%. Pode indicar subdimensionamento.'});
      if(d.prodPC>60) pills.push({t:'Alta carga',c:'eq-dp-red',i:icoTr,tip:'R$ '+d.prodPC+'k/colab. Risco de turnover e erros.'});
      else if(d.prodPC<40) pills.push({t:'Baixa produtiv.',c:'eq-dp-orange',i:icoTr,tip:'R$ '+d.prodPC+'k/colab. Ociosidade.'});

      var ph='<div class="eq-diag-pills">';
      pills.forEach(function(p){ph+='<span class="eq-dp '+p.c+'">'+p.i+p.t+'<span class="eq-dp-tip">'+p.tip+'</span></span>'});
      ph+='</div>';

      html+='<tr><td style="text-align:left;padding-left:14px" class="eq-loja-name">'+d.nome+'</td>' +
        '<td><span class="eq-fat-val">'+fmtK(d.fatM)+'</span></td><td><span class="eq-fat-val">'+fmtM(d.fatT)+'</span></td>' +
        '<td class="eq-grp"><span class="eq-cargo-val">'+d.acoug+'</span></td>' +
        '<td>'+(d.aux>0?'<span class="eq-cargo-val">'+d.aux+'</span>':'<span class="eq-cargo-zero">\u2014</span>')+'</td>' +
        '<td>'+(d.balc>0?'<span class="eq-cargo-val">'+d.balc+'</span>':'<span class="eq-cargo-zero">\u2014</span>')+'</td>' +
        '<td class="eq-grp"><span class="eq-cargo-val">'+d.real+'</span></td>' +
        '<td><span class="eq-ideal-val">'+d.ideal+'</span></td>' +
        '<td><span class="eq-gap-wrap '+gapCls+'">'+(d.gap<0?svgDn:d.gap>0?svgUp:svgCk)+' '+Math.abs(d.gap)+'</span></td>' +
        '<td class="eq-grp"><span class="eq-prod '+prodCls+'">R$ '+d.prodPC+'k</span></td>' +
        '<td><span class="eq-imp '+impCls+'">'+d.impPct+'%</span></td>' +
        '<td class="eq-grp eq-diag-cell">'+ph+'</td></tr>';
    });

    html+='</tbody></table></div></div></div>';
    document.getElementById('eqBloco5').innerHTML = html;
  }

});
