// ============================================================
// NEXO Intelligence Web v2 — Temperatura (Cadeia do Frio)
// Bloco 1: termômetros minimalistas (aprovado)
// Bloco 2: tendência — padrão equipe (aprovado)
// Bloco 2B: leituras — área com gradiente + linhas tracejadas
//           laranja nos limites + bolinhas semânticas (aprovado)
// ============================================================

Router.register('temperatura', async function(container) {

  var currentPeriod = 15;
  var currentLoja   = 'all';
  var tmpCharts     = [];
  var tmpData       = null;
  var tmpEqFilter   = 'todos';

  function destroyCharts() {
    tmpCharts.forEach(function(c) { if (c && c.destroy) c.destroy(); });
    tmpCharts = [];
  }

  container.innerHTML =
    '<div class="toolbar anim">' +
      '<div class="period-pills">' +
        '<button class="pp" data-d="7">7d</button>' +
        '<button class="pp active" data-d="15">15d</button>' +
        '<button class="pp" data-d="30">30d</button>' +
        '<button class="pp" data-d="60">60d</button>' +
        '<button class="pp" data-d="90">90d</button>' +
      '</div>' +
      '<select class="loja-filter" id="filterLojaTemp"><option value="all">Todas as lojas</option></select>' +
    '</div>' +
    '<div id="tempContent"><div class="loading-state"><div class="spinner"></div><span>Carregando temperatura...</span></div></div>';

  var lojas = await API.getLojas(window.NEXO_REDE_ID);
  UI.populateLojaFilter('filterLojaTemp', lojas);
  UI.initPeriodPills(function(days) { currentPeriod = days; loadData(); });
  document.getElementById('filterLojaTemp').addEventListener('change', function() { currentLoja = this.value; loadData(); });

  // ══════════════════════════════════════════════════════════════
  // LOAD DATA
  // ══════════════════════════════════════════════════════════════
  async function loadData() {
    var contentEl = document.getElementById('tempContent');
    if (!contentEl) return;
    contentEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Carregando temperatura...</span></div>';
    destroyCharts();
    try {
      var filters = {};
      if (currentLoja && currentLoja !== 'all') filters.lojaId = currentLoja;
      var temps = await API.getTemperatura(filters);
      if (!temps || temps.length === 0) {
        contentEl.innerHTML = '<div class="empty-state"><div class="icon">🌡️</div><p>Sem dados de temperatura disponiveis</p></div>';
        return;
      }
      tmpData = Engine.processTemperatura(temps, currentPeriod);
      if (!tmpData) {
        contentEl.innerHTML = '<div class="empty-state"><div class="icon">🌡️</div><p>Dados insuficientes para analise</p></div>';
        return;
      }
      renderAll(contentEl);
    } catch (err) {
      console.error('Temperatura loadData error:', err);
      contentEl.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>Erro ao carregar dados: ' + err.message + '</p></div>';
    }
  }

  function renderAll(el) {
    var d = tmpData;
    el.innerHTML =
      renderBloco1(d.termometros) +
      renderBloco2() +
      renderBloco2B(d.leituras) +
      renderBloco3() +
      renderBloco4(d.ranking);
    setTimeout(function() {
      initBloco1Donuts(d.termometros);
      initBloco2Charts(d.tendenciaConf, tmpEqFilter);
      initBloco2BCharts(d.leituras);
      renderBnTable(d.mapaConf, 'todos');
      attachBnTooltips(d.mapaConf);
      initPillEvents();
      initBloco4Events();
    }, 50);
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 1 — TERMÔMETROS
  // ══════════════════════════════════════════════════════════════
  function thermoBar(eq) {
    var iC      = eq.id === 'cong';
    var fMin    = iC ? -28 : -1,  fMax    = iC ? -10 :  9;
    var confMin = iC ? -22 :  0,  confMax = iC ? -18 :  4;
    var rMinLbl = iC ? '-25°' : '0°', rMaxLbl = iC ? '-15°' : '8°';
    var cMinLbl = iC ? '-22°' : '0°', cMaxLbl = iC ? '-18°' : '4°';
    var temp    = eq.temp !== null ? eq.temp : (confMin + confMax) / 2;
    var range   = fMax - fMin;
    var pct     = Math.max(3, Math.min(96, ((temp - fMin) / range) * 100));
    var zBot    = Math.max(0, ((confMin - fMin) / range) * 100);
    var zH      = Math.max(0, ((confMax - confMin) / range) * 100);
    var ok      = temp >= confMin && temp <= confMax;
    var bc      = ok ? '#4ADE80' : '#F87171';
    return (
      '<div style="display:flex;align-items:stretch;gap:4px;margin:10px auto 8px;justify-content:center;">' +
        '<div style="display:flex;flex-direction:column;justify-content:space-between;height:90px;align-items:flex-end;">' +
          '<span style="font-size:8px;font-weight:500;color:rgba(255,255,255,.25);line-height:1;white-space:nowrap;">' + rMaxLbl + '</span>' +
          '<span style="font-size:8px;font-weight:500;color:rgba(255,255,255,.25);line-height:1;white-space:nowrap;">' + rMinLbl + '</span>' +
        '</div>' +
        '<div style="position:relative;width:8px;height:90px;background:rgba(255,255,255,.08);border-radius:4px;overflow:visible;flex-shrink:0;">' +
          '<div style="position:absolute;left:0;right:0;bottom:' + zBot + '%;height:' + zH + '%;background:rgba(255,255,255,.15);border-radius:3px;"></div>' +
          '<div style="position:absolute;left:0;right:0;bottom:0;height:' + pct + '%;background:linear-gradient(to top,' + bc + 'cc,' + bc + '77);border-radius:4px;box-shadow:0 0 6px ' + bc + '44;"></div>' +
          '<div style="position:absolute;left:-3px;right:-3px;bottom:' + (zBot + zH) + '%;height:1px;background:rgba(255,255,255,.35);"></div>' +
          '<div style="position:absolute;left:-3px;right:-3px;bottom:' + zBot + '%;height:1px;background:rgba(255,255,255,.35);"></div>' +
        '</div>' +
        '<div style="position:relative;height:90px;width:22px;">' +
          '<span style="position:absolute;bottom:' + (zBot+zH) + '%;transform:translateY(50%);font-size:7px;font-weight:700;color:rgba(255,255,255,.5);white-space:nowrap;line-height:1;left:2px;">' + cMaxLbl + '</span>' +
          '<span style="position:absolute;bottom:' + zBot + '%;transform:translateY(50%);font-size:7px;font-weight:700;color:rgba(255,255,255,.5);white-space:nowrap;line-height:1;left:2px;">' + cMinLbl + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderBloco1(termos) {
    var html = '<div class="section-block frost anim d1">' +
      '<div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Temperatura Media por Equipamento <span class="sh-line"></span></div>' +
      '<div class="tmp-thermo-row">';
    termos.forEach(function(eq) {
      var iC = eq.id === 'cong';
      var confMin = iC ? -22 : 0, confMax = iC ? -18 : 4;
      var ok = eq.temp !== null && eq.temp >= confMin && eq.temp <= confMax;
      var bigCls = eq.temp === null ? '' : (ok ? 'ok' : 'danger');
      var d = eq.delta; var vc, vt;
      if (d === 0 || eq.temp === null) { vc = 'stable'; vt = '= 0&deg;C'; }
      else if (iC) { vc = d < 0 ? 'down-good' : 'up'; vt = (d > 0 ? '&#9650; +' : '&#9660; ') + d + '&deg;C'; }
      else         { vc = d > 0 ? 'up' : 'down-good'; vt = (d > 0 ? '&#9650; +' : '&#9660; ') + d + '&deg;C'; }
      var faixaText = iC ? '&le; -18&deg;C' : '0&deg;C a 4&deg;C';
      var dcc = eq.confPct >= 90 ? '#2D8653' : (eq.confPct >= 70 ? '#C97B2C' : '#C0504D');
      html +=
        '<div class="tmp-tc ' + eq.id + '">' +
          '<div class="tmp-tc-thermo">' +
            '<div class="tmp-tc-label">' + eq.label + '</div>' +
            '<span class="tmp-tc-faixa">' + faixaText + '</span>' +
            thermoBar(eq) +
            '<div class="tmp-tc-big ' + bigCls + '"><strong>' + (eq.temp !== null ? eq.temp : '--') + '</strong><span class="tmp-tc-unit">&deg;C</span></div>' +
          '</div>' +
          '<div class="tmp-tc-divider"></div>' +
          '<div class="tmp-tc-metrics">' +
            '<div class="tmp-tc-comp"><div class="tmp-tc-comp-label">vs periodo anterior</div><div class="tmp-tc-comp-val ' + vc + '">' + vt + '</div></div>' +
            '<div class="tmp-tc-conf">' +
              '<div class="tmp-tc-donut-wrap"><canvas id="tmpDn_' + eq.id + '"></canvas><span class="tmp-tc-donut-center" style="color:' + dcc + '">' + eq.confPct + '%</span></div>' +
              '<div class="tmp-tc-conf-meta"><span class="tmp-tc-conf-label">Conformidade</span><span class="tmp-tc-conf-detail">' + eq.confOk + ' de ' + eq.confTotal + ' leituras</span></div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    return html + '</div></div>';
  }

  function initBloco1Donuts(termos) {
    var dpr = window.devicePixelRatio || 1, size = 80;
    termos.forEach(function(eq) {
      var c = document.getElementById('tmpDn_' + eq.id); if (!c) return;
      c.width = size*dpr; c.height = size*dpr; c.style.width = size+'px'; c.style.height = size+'px';
      var ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); ctx.scale(dpr,dpr);
      var cx=size/2, cy=size/2, r=size/2-6, lw=4;
      var color = eq.confPct>=90?'#2D8653':(eq.confPct>=70?'#C97B2C':'#C0504D');
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle='rgba(0,0,0,.06)'; ctx.lineWidth=lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+(eq.confPct/100)*Math.PI*2);
      ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.lineCap='butt'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy-r,lw/2,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 2 — TENDÊNCIA (padrão equipe)
  // ══════════════════════════════════════════════════════════════
  function renderBloco2() {
    return '<div class="section-block trend anim d2">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--blue)"></span> Tendencia de Conformidade <span class="sh-line"></span></div>' +
      '<div class="eq-pills" id="tmpTrendPills">' +
        '<span class="eq-pill active" data-eq="todos">Todos</span>' +
        '<span class="eq-pill" data-eq="balcao">Balcao</span>' +
        '<span class="eq-pill" data-eq="resf">Camara Resf.</span>' +
        '<span class="eq-pill" data-eq="cong">Camara Cong.</span>' +
      '</div>' +
      '<div class="tmp-trend-grid">' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Conformidade Mensal</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn1"></span><span class="tmp-trc-var" id="tmpVar1"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh1"></canvas></div><table class="tmp-trc-tbl" id="tmpTb1"></table></div>' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Ultimas 8 Semanas</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn2"></span><span class="tmp-trc-var" id="tmpVar2"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh2"></canvas></div><table class="tmp-trc-tbl" id="tmpTb2"></table></div>' +
        '<div class="tmp-trend-card"><div class="tmp-trc-title">Ultimos 7 Dias</div><div class="tmp-trc-bn-row"><span class="tmp-trc-bn" id="tmpBn3"></span><span class="tmp-trc-var" id="tmpVar3"></span></div><div class="tmp-trc-chart"><canvas id="tmpCh3"></canvas></div><table class="tmp-trc-tbl" id="tmpTb3"></table></div>' +
      '</div></div>';
  }

  var dlPlugin = {
    id: 'tmpDl',
    afterDatasetsDraw: function(chart) {
      var ctx = chart.ctx;
      chart.data.datasets.forEach(function(ds, i) {
        chart.getDatasetMeta(i).data.forEach(function(pt, idx) {
          ctx.save(); ctx.font='600 10px Outfit,sans-serif'; ctx.fillStyle='#1F2937';
          ctx.textAlign='center'; ctx.textBaseline='bottom';
          ctx.fillText(ds.data[idx]+'%', pt.x, pt.y-6); ctx.restore();
        });
      });
    }
  };

  function initBloco2Charts(tendencia, eq) {
    var t = tendencia[eq]; if (!t) return;
    var lineColor = eq==='balcao'?'#2D8653':(eq==='resf'?'#3670A0':(eq==='cong'?'#7153A0':'#2D8653'));
    var fillColor = eq==='balcao'?'rgba(45,134,83,.06)':(eq==='resf'?'rgba(54,112,160,.06)':(eq==='cong'?'rgba(113,83,160,.06)':'rgba(45,134,83,.06)'));
    var sets = [
      { data: t.mensal,  chId:'tmpCh1', bnId:'tmpBn1', varId:'tmpVar1', tblId:'tmpTb1' },
      { data: t.semanas, chId:'tmpCh2', bnId:'tmpBn2', varId:'tmpVar2', tblId:'tmpTb2' },
      { data: t.dias,    chId:'tmpCh3', bnId:'tmpBn3', varId:'tmpVar3', tblId:'tmpTb3' }
    ];
    sets.forEach(function(s) {
      var d = s.data; if (!d || !d.length) return;
      var last=d[d.length-1].conf, prev=d.length>=2?d[d.length-2].conf:last, delta=last-prev;
      var cls=last>=85?'ok':(last>=70?'warn':'danger');
      var bnEl=document.getElementById(s.bnId);
      if (bnEl) { bnEl.textContent=last+'%'; bnEl.className='tmp-trc-bn '+cls; }
      var varEl=document.getElementById(s.varId);
      if (varEl) {
        var vc,vt;
        if (delta>0){vc='down-good';vt='\u25B2 +'+delta+' p.p.';}
        else if(delta<0){vc='up-bad';vt='\u25BC '+delta+' p.p.';}
        else{vc='stable';vt='= 0 p.p.';}
        varEl.textContent=vt; varEl.className='tmp-trc-var '+vc;
      }
      var canvas=document.getElementById(s.chId); if(!canvas) return;
      var labels=d.map(function(x){return x.label;}), vals=d.map(function(x){return x.conf;});
      var nTk=labels.length, colW=44, dW=(canvas.width-colW)/nTk;
      var pL=Math.round(colW+dW/2), pR=Math.round(dW/2);
      var nonZero=vals.filter(function(v){return v>0;}), hasZeros=vals.some(function(v){return v===0;});
      var minVal=nonZero.length>0?Math.min.apply(null,nonZero):0;
      var yMin=(hasZeros||nonZero.length<=1)?0:Math.max(0,minVal-15);
      var ch=new Chart(canvas.getContext('2d'),{
        type:'line',
        data:{labels:labels,datasets:[{data:vals,borderColor:lineColor,borderWidth:2.5,backgroundColor:fillColor,fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:lineColor,pointBorderColor:'#fff',pointBorderWidth:2}]},
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{
            y:{display:false,min:yMin,max:100,grace:'10%'},
            x:{display:true,offset:false,grid:{display:false},border:{display:false},ticks:{font:{family:'Outfit',size:10},color:'#9CA3AF'}}
          },
          layout:{padding:{top:20,left:pL,right:pR,bottom:0}}
        },
        plugins:[dlPlugin]
      });
      tmpCharts.push(ch);

      // Tabela: CONF + VAR, alinhada via colgroup com larguras dos pontos do chart
      var tbl=document.getElementById(s.tblId); if(!tbl) return;
      var cg='<colgroup><col style="width:44px">';
      for(var i=0;i<nTk;i++) cg+='<col>';
      cg+='</colgroup>';
      var r2='<tr><td>CONF</td>';
      vals.forEach(function(v){
        var cls2=v>=85?'v-green':(v>=70?'v-orange':'v-red');
        r2+='<td class="'+cls2+'">'+v+'%</td>';
      });
      r2+='</tr>';
      var r3='<tr><td>VAR</td>';
      vals.forEach(function(v,i){
        if(i===0){r3+='<td class="v-gray">=</td>';return;}
        var dv=v-vals[i-1];
        if(dv===0) r3+='<td class="v-gray">=</td>';
        else if(dv>0) r3+='<td class="v-green">\u25B2+'+dv+'%</td>';
        else r3+='<td class="v-red">\u25BC'+Math.abs(dv)+'%</td>';
      });
      r3+='</tr>';
      tbl.innerHTML=cg+r2+r3;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 2B — LEITURAS (área com gradiente + linhas laranja)
  // ══════════════════════════════════════════════════════════════
  function renderBloco2B(leituras) {
    var equips = [
      { id:'balcao', nome:'Balcao Refrig.', faixa:'0\u00b0C a 4\u00b0C',   color:'#2D8653' },
      { id:'resf',   nome:'Camara Resf.',   faixa:'0\u00b0C a 4\u00b0C',   color:'#3670A0' },
      { id:'cong',   nome:'Camara Cong.',   faixa:'\u2264 -18\u00b0C',      color:'#7153A0' }
    ];
    var html = '<div class="section-block leit anim d3">' +
      '<div class="section-header"><span class="sh-dot" style="background:#3B82F6"></span> Leituras de Temperatura <span class="sh-line"></span></div>' +
      '<div class="tmp-matrix"><div class="tmp-mcol-sp"></div><div class="tmp-mcol-h">Media Mensal</div><div class="tmp-mcol-h">Ultimas 8 Semanas</div><div class="tmp-mcol-h">Ultimos 7 Dias</div>';
    equips.forEach(function(eq) {
      html += '<div class="tmp-mrow-label"><div class="tmp-mrl-name"><span class="tmp-mrl-dot" style="background:'+eq.color+'"></span> '+eq.nome+'</div><div class="tmp-mrl-faixa">'+eq.faixa+'</div></div>';
      ['m','s','d'].forEach(function(per) {
        var padR = per==='d' ? 'style="padding-right:2px"' : '';
        html += '<div class="tmp-mcell" '+padR+'><div class="tmp-mcell-inner"><canvas id="tmpL_'+eq.id+'_'+per+'"></canvas></div></div>';
      });
    });
    return html + '</div><div class="tmp-mlegend"><div class="tmp-mleg-item"><span class="tmp-mleg-zone"></span> Zona conforme</div><div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#2D8653"></span> Dentro da faixa</div><div class="tmp-mleg-item"><span class="tmp-mleg-dot" style="background:#C0504D"></span> Fora da faixa</div></div></div>';
  }

  function initBloco2BCharts(leituras) {
    var pKeys = { m:'mensal', s:'semanas', d:'dias' };
    var CONF = {
      balcao: { min: 0,   max: 4,   lineMin: 0,   lineMax: 4,   color: '45,134,83',  hex: '#2D8653' },
      resf:   { min: 0,   max: 4,   lineMin: 0,   lineMax: 4,   color: '54,112,160', hex: '#3670A0' },
      cong:   { min: -22, max: -18, lineMin: -22, lineMax: -18, color: '113,83,160', hex: '#7153A0' }
    };

    ['balcao','resf','cong'].forEach(function(eqId) {
      var eq  = leituras[eqId]; if (!eq) return;
      var cfg = CONF[eqId];
      var iC  = eqId === 'cong';

      ['m','s','d'].forEach(function(per) {
        var canvas = document.getElementById('tmpL_'+eqId+'_'+per); if (!canvas) return;
        var serie  = eq[pKeys[per]]; if (!serie || !serie.length) return;

        var labels = serie.map(function(x) { return x.label; });
        var vals   = serie.map(function(x) { return x.value; });
        var n      = labels.length;

        // Bolinhas: verde dentro do range conforme, vermelho fora
        var ptColors = vals.map(function(v) {
          if (v === null) return 'transparent';
          var ok = iC ? (v >= cfg.min && v <= cfg.max) : (v >= cfg.min && v <= cfg.max);
          return ok ? cfg.hex : '#C0504D';
        });

        // REGRA GLOBAL: yMin/yMax dinâmico — sempre inclui dados reais
        // Se houver outlier fora do range, o gráfico se adapta (não corta o ponto)
        var allVals = vals.filter(function(v) { return v !== null; });
        var dataMin = allVals.length ? Math.min.apply(null, allVals) : cfg.lineMin;
        var dataMax = allVals.length ? Math.max.apply(null, allVals) : cfg.lineMax;
        var pad     = iC ? 2 : 1;
        var yMin    = Math.min(cfg.lineMin - pad, dataMin - pad);
        var yMax    = Math.max(cfg.lineMax + pad, dataMax + pad);

        // Padding direito extra na coluna de 7 dias para o último label caber
        var padRight = per === 'd' ? 22 : 10;

        var ch = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              // Dataset 0: linha principal + área com gradiente
              {
                data:               vals,
                borderColor:        cfg.hex,
                borderWidth:        1,
                tension:            0.4,
                pointRadius:        3,
                pointBorderWidth:   2,
                pointBorderColor:   '#fff',
                pointBackgroundColor: ptColors,
                pointHoverRadius:   5,
                fill:               iC ? { value: yMin } : { value: cfg.lineMin },
                backgroundColor:    'transparent', // será sobrescrito após render
                spanGaps:           true
              },
              // Dataset 1: linha tracejada laranja (lineMin)
              {
                data:            new Array(n).fill(cfg.lineMin),
                borderColor:     iC ? 'transparent' : 'rgba(201,123,44,.55)',
                borderWidth:     1,
                borderDash:      [4, 3],
                pointRadius:     0,
                fill:            false,
                backgroundColor: 'transparent'
              },
              // Dataset 2: linha tracejada laranja (lineMax) + fill zona conforme
              {
                data:            new Array(n).fill(cfg.lineMax),
                borderColor:     'rgba(201,123,44,.55)',
                borderWidth:     1,
                borderDash:      [4, 3],
                pointRadius:     0,
                fill:            false,
                backgroundColor: 'transparent'
              }
            ]
          },
          options: {
            responsive:          true,
            maintainAspectRatio: false,
            clip:                false,
            plugins: {
              legend:     { display: false },
              datalabels: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    if (ctx.datasetIndex > 0) return null;
                    var v = ctx.parsed.y;
                    if (v === null) return '';
                    var ok = iC ? (v >= cfg.min && v <= cfg.max) : (v >= cfg.min && v <= cfg.max);
                    return v.toFixed(1) + '\u00b0C ' + (ok ? '\u2713 conforme' : '\u26a0 fora da faixa');
                  }
                },
                backgroundColor: 'rgba(12,20,37,.9)',
                bodyFont: { family: 'Outfit', size: 12 },
                padding: 8, cornerRadius: 6
              }
            },
            scales: {
              y: {
                min: yMin, max: yMax,
                grid:   { display: false },
                border: { display: false },
                // Ticks: apenas nos valores das linhas tracejadas, em laranja
                afterBuildTicks: function(scale) {
                  scale.ticks = iC
                    ? [{ value: cfg.lineMax }]                                  // Cong: só -18°
                    : [{ value: cfg.lineMin }, { value: cfg.lineMax }];         // outros: 0° e 4°
                },
                ticks: {
                  display:  true,
                  font:     { size: 9, family: 'Outfit', weight: '700' },
                  color:    '#C97B2C',
                  callback: function(v) { return v + '\u00b0'; },
                  padding:  2
                }
              },
              x: {
                grid:   { display: false },
                border: { display: false },
                ticks:  {
                  display:     true,
                  font:        { size: 9, family: 'Outfit', weight: '600' },
                  color:       '#9CA3AF',
                  maxRotation: 0,
                  autoSkip:    false
                }
              }
            },
            layout: { padding: { top: 6, bottom: 0, left: 2, right: padRight } },
            animation: { duration: 400 }
          }
        });

        // Aplicar gradiente após o chart ter renderizado e as métricas estarem disponíveis
        setTimeout(function() {
          var meta        = ch.getDatasetMeta(0);
          var avgY        = meta.data.reduce(function(s,p){ return s + p.y; }, 0) / meta.data.length;
          var scaleBottom = ch.scales.y.bottom;
          var ctx2        = canvas.getContext('2d');
          var grad;

          if (iC) {
            // Camara Cong.: gradiente invertido — área cresce para BAIXO
            grad = ctx2.createLinearGradient(0, avgY, 0, scaleBottom);
            grad.addColorStop(0,   'rgba('+cfg.color+',.00)');
            grad.addColorStop(0.4, 'rgba('+cfg.color+',.20)');
            grad.addColorStop(1,   'rgba('+cfg.color+',.50)');
          } else {
            // Balcao/Resf.: gradiente normal — área cresce para CIMA
            grad = ctx2.createLinearGradient(0, avgY, 0, scaleBottom);
            grad.addColorStop(0,   'rgba('+cfg.color+',.40)');
            grad.addColorStop(0.5, 'rgba('+cfg.color+',.15)');
            grad.addColorStop(1,   'rgba('+cfg.color+',.02)');
          }

          ch.data.datasets[0].backgroundColor = grad;
          ch.update('none');
        }, 200);

        tmpCharts.push(ch);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 3 — MAPA CONFORMIDADE
  // ══════════════════════════════════════════════════════════════
  function renderBloco3() {
    return '<div class="section-block heatmap anim d4">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--orange)"></span> Mapa de Conformidade \u2014 Ultimos 15 dias <span class="sh-line"></span></div>' +
      '<div class="eq-pills" id="tmpBnPills"><span class="eq-pill active" data-eq="todos">Todos</span><span class="eq-pill" data-eq="balcao">Balcao</span><span class="eq-pill" data-eq="resf">Camara Resf.</span><span class="eq-pill" data-eq="cong">Camara Cong.</span></div>' +
      '<div class="tmp-bn-wrap"><table class="tmp-bn-table" id="tmpBnTable"></table></div>' +
      '<div class="tmp-bn-legend"><div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:var(--green)"></span> Conforme</div><div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:var(--red)"></span> Nao conforme</div><div class="tmp-bn-legend-item"><span class="tmp-leg-d" style="background:#D1D5DB"></span> Sem dado</div></div></div>';
  }

  var _bnSortAsc = false; // estado global de ordenação da coluna aderência

  function heatColor(pct) {
    if (pct === null) return { bg: '#F3F4F6', color: '#9CA3AF' };
    if (pct >= 95) return { bg: 'rgba(45,134,83,.20)',  color: '#1a6b3c' };
    if (pct >= 85) return { bg: 'rgba(45,134,83,.12)',  color: '#2D8653' };
    if (pct >= 70) return { bg: 'rgba(201,123,44,.14)', color: '#C97B2C' };
    return              { bg: 'rgba(192,80,77,.14)',    color: '#C0504D' };
  }

  function dataToDDMM(str) {
    // Converte MM/DD → DD/MM se necessário (dados vêm como MM/DD do engine)
    var p = str.split('/');
    if (p.length !== 2) return str;
    // Heurística: se primeiro número > 12 já é dia
    if (parseInt(p[0]) > 12) return str; // já DD/MM
    return p[1] + '/' + p[0]; // converte MM/DD → DD/MM
  }

  function dateToWeekDay(ddmm) {
    var dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
    var p = ddmm.split('/');
    if (p.length !== 2) return '';
    var d = new Date(2026, parseInt(p[1]) - 1, parseInt(p[0]));
    return dias[d.getDay()];
  }

  function renderBnTable(mapa, filter) {
    var tbl = document.getElementById('tmpBnTable'); if (!tbl) return;

    // Cabeçalho: datas em DD/MM + dia da semana abaixo
    var h = '<thead><tr><th style="text-align:left;padding-left:14px">Loja</th>';
    mapa.dates.forEach(function(d) {
      var ddmm = dataToDDMM(d);
      var dia  = dateToWeekDay(ddmm);
      h += '<th style="text-align:center"><span style="display:block;line-height:1.3">' + ddmm + '</span>' +
           '<span style="display:block;font-size:9px;font-weight:500;opacity:.65;line-height:1.2">' + dia + '</span></th>';
    });
    h += '<th id="th-aderencia" style="cursor:pointer;white-space:nowrap;min-width:64px;text-align:center" title="Clique para ordenar">' +
         'Ader. <span id="sort-arrow">' + (_bnSortAsc ? '\u25b2' : '\u25bc') + '</span></th>';
    h += '</tr></thead><tbody>';

    // Calcular aderência por loja
    var lojaRows = mapa.lojas.map(function(loja) {
      var ok = 0, total = 0;
      loja.cells.forEach(function(cell) {
        var st = cell.status[filter] || 'NA';
        if (st === 'OK')  { ok++; total++; }
        if (st === 'NOK') { total++; }
      });
      return { loja: loja, pct: total > 0 ? Math.round(ok / total * 100) : null };
    });

    // Ordenar por aderência
    lojaRows.sort(function(a, b) {
      var pa = a.pct === null ? -1 : a.pct;
      var pb = b.pct === null ? -1 : b.pct;
      return _bnSortAsc ? pa - pb : pb - pa;
    });

    // Linhas
    lojaRows.forEach(function(item) {
      var loja = item.loja;
      h += '<tr><td style="font-size:11px;font-weight:600;color:#1F2937;padding-left:14px;white-space:nowrap">' + loja.nome + '</td>';
      loja.cells.forEach(function(cell, ci) {
        var st = cell.status[filter] || 'NA';
        var dc = st==='OK'?'tmp-farol-ok':(st==='NOK'?'tmp-farol-nok':'tmp-farol-na');
        h += '<td style="text-align:center;padding:6px 4px;border-bottom:1px solid rgba(0,0,0,.04)">' +
             '<span class="tmp-farol ' + dc + '" data-loja="' + loja.nome + '" data-ci="' + ci + '"></span></td>';
      });
      // Coluna aderência com heatmap
      var hc = heatColor(item.pct);
      h += '<td class="td-aderencia" style="text-align:center;padding:4px 6px;vertical-align:middle;border-bottom:1px solid rgba(0,0,0,.04)">' +
           (item.pct !== null
             ? '<span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:' + hc.bg + ';color:' + hc.color + '">' + item.pct + '%</span>'
             : '<span style="color:#9CA3AF;font-size:11px">\u2014</span>') +
           '</td>';
      h += '</tr>';
    });

    tbl.innerHTML = h + '</tbody>';

    // Evento de sort
    var thAd = document.getElementById('th-aderencia');
    if (thAd) {
      thAd.addEventListener('click', function() {
        _bnSortAsc = !_bnSortAsc;
        renderBnTable(mapa, filter);
        attachBnTooltips(mapa);
      });
    }
  }

  function attachBnTooltips(mapa) {
    var tooltip = document.getElementById('tmpTooltip');
    if (!tooltip) { tooltip=document.createElement('div'); tooltip.id='tmpTooltip'; tooltip.className='tmp-bn-tooltip'; document.body.appendChild(tooltip); }
    document.querySelectorAll('.tmp-farol:not(.tmp-farol-na)').forEach(function(el) {
      el.addEventListener('mouseenter', function() {
        var lojaNome=this.getAttribute('data-loja'), ci=parseInt(this.getAttribute('data-ci'));
        var loja=mapa.lojas.find(function(l){return l.nome===lojaNome;}); if(!loja) return;
        var cell=loja.cells[ci]; if(!cell||!cell.temps) return;
        var bf='todos'; var ap=document.querySelector('#tmpBnPills .eq-pill.active'); if(ap) bf=ap.getAttribute('data-eq');
        var rows='';
        function tr(lb,val,fl,dc){ if(val===null) return ''; var cls=fl==='CONFORME'?'tmp-tt-ok':'tmp-tt-nok'; return '<div class="tmp-tt-row"><span class="tmp-tt-dot" style="background:'+dc+'"></span><span class="tmp-tt-label">'+lb+':</span> <span class="tmp-tt-val '+cls+'"><strong>'+val.toFixed(1)+'\u00b0C</strong></span></div>'; }
        if(bf==='todos'||bf==='balcao') rows+=tr('Balcao',cell.temps.balcao,cell.temps.fb,'#2D8653');
        if(bf==='todos'||bf==='resf')   rows+=tr('Resf.',cell.temps.resf,cell.temps.fr,'#3670A0');
        if(bf==='todos'||bf==='cong')   rows+=tr('Cong.',cell.temps.cong,cell.temps.fc,'#7153A0');
        tooltip.innerHTML='<div class="tmp-tt-date"><strong>'+lojaNome+'</strong> \u2014 '+mapa.dates[ci]+'</div>'+rows;
        tooltip.classList.add('show');
        var rect=this.getBoundingClientRect();
        tooltip.style.left=(rect.left+rect.width/2-tooltip.offsetWidth/2)+'px';
        tooltip.style.top=(rect.top-tooltip.offsetHeight-8)+'px';
      });
      el.addEventListener('mouseleave', function(){ var tt=document.getElementById('tmpTooltip'); if(tt) tt.classList.remove('show'); });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO 4 — RANKING
  // ══════════════════════════════════════════════════════════════
  var _rkSortAsc = false; // estado global de ordenação da coluna aderência

  function rkHeatColor(pct) {
    if (pct === null) return { bg: '#F3F4F6', color: '#9CA3AF' };
    if (pct >= 95) return { bg: 'rgba(45,134,83,.20)',  color: '#1a6b3c' };
    if (pct >= 85) return { bg: 'rgba(45,134,83,.12)',  color: '#2D8653' };
    if (pct >= 70) return { bg: 'rgba(201,123,44,.14)', color: '#C97B2C' };
    return              { bg: 'rgba(192,80,77,.14)',    color: '#C0504D' };
  }

  function renderBloco4(ranking) {
    function barC(p){ return p>=85?'#2D8653':(p>=70?'#C97B2C':'#C0504D'); }
    function pctC(p){ return p>=85?'var(--green)':(p>=70?'var(--orange)':'var(--red)'); }
    function eqB(d) {
      var v=d.delta, vc=v>0?'up':(v<0?'down':'eq'), vt=v>0?'\u25b2 +'+v+' p.p.':(v<0?'\u25bc '+v+' p.p.':'= 0 p.p.');
      return '<div class="tmp-rk-eq">' +
        '<div class="tmp-rk-bar-wrap"><div class="tmp-rk-bar-fill" style="width:'+d.pct+'%;background:'+barC(d.pct)+'"></div></div>' +
        '<span class="tmp-rk-pct" style="color:'+pctC(d.pct)+'"><strong>'+d.pct+'%</strong></span>' +
        '<span class="tmp-rk-var '+vc+'">'+vt+'</span>' +
        '</div>';
    }
    function sepC() { return '<div class="tmp-rk-sep"><div class="tmp-rk-sep-line"></div></div>'; }
    function aderBadge(pct) {
      var hc = rkHeatColor(pct);
      return '<div class="td-rk-ader">' +
        (pct !== null
          ? '<span style="display:inline-block;padding:2px 10px;border-radius:5px;font-size:11px;font-weight:700;background:'+hc.bg+';color:'+hc.color+'">'+pct+'%</span>'
          : '<span style="color:#9CA3AF">\u2014</span>') +
        '</div>';
    }

    // Grid: 28px(#) 210px(loja) 1px(sep) 1fr(balcao) 1px(sep) 1fr(resf) 1px(sep) 1fr(cong) 1px(sep) 68px(ader)
    var GRID = '28px 210px 1px 1fr 1px 1fr 1px 1fr 1px 68px';

    // Calcular aderência média por loja (média dos 3 equipamentos)
    function calcAder(lojaData) {
      var pcts = [lojaData.balcao.pct, lojaData.resf.pct, lojaData.cong.pct];
      return Math.round(pcts.reduce(function(a,b){return a+b;},0) / pcts.length);
    }

    // Aderência do total
    var totalAder = Math.round([ranking.total.balcao.pct, ranking.total.resf.pct, ranking.total.cong.pct]
      .reduce(function(a,b){return a+b;},0) / 3);

    // Ordenar lojas por aderência desc (padrão)
    var lojas = ranking.lojas.slice().sort(function(a, b) {
      return _rkSortAsc ? calcAder(a) - calcAder(b) : calcAder(b) - calcAder(a);
    });

    // Header: sem bolinhas, só texto. Seps incluem o Ader. no final.
    var html = '<div class="section-block ranking anim d5">' +
      '<div class="section-header"><span class="sh-dot" style="background:var(--gold)"></span> Ranking de Conformidade por Loja <span class="sh-line"></span></div>' +
      '<div class="tmp-rk-grid" id="rkHeaderGrid" style="grid-template-columns:'+GRID+';padding:0;gap:0;border-radius:14px 14px 0 0;overflow:hidden">' +
        '<div class="tmp-rk-col-head tmp-rk-col-head-left" style="padding-left:20px">#</div>' +
        '<div class="tmp-rk-col-head tmp-rk-col-head-left">Loja</div>' +
        '<div class="tmp-rk-col-sep" style="background:#0C1425"></div>' +
        '<div class="tmp-rk-col-head" style="text-align:center">Balcao</div>' +
        '<div class="tmp-rk-col-sep" style="background:#0C1425"></div>' +
        '<div class="tmp-rk-col-head" style="text-align:center">Camara Resf.</div>' +
        '<div class="tmp-rk-col-sep" style="background:#0C1425"></div>' +
        '<div class="tmp-rk-col-head" style="text-align:center">Camara Cong.</div>' +
        '<div class="tmp-rk-col-sep" style="background:#0C1425"></div>' +
        '<div id="th-rk-ader" class="tmp-rk-col-head" style="text-align:center;cursor:pointer;background:#0C1425;color:#fff" title="Clique para ordenar">' +
          'Ader. <span id="rk-ader-arrow">\u25bc</span>' +
        '</div>' +
        '<div class="tmp-rk-divider"></div>' +
      '</div>' +
      // Total Rede
      '<div class="tmp-rk-total-row" id="rkTotalRow" style="margin:0;padding:0">' +
        '<div></div>' + // célula # vazia
        '<div class="tmp-rk-total-label"><strong>TOTAL REDE</strong></div>' +
        sepC() + eqB(ranking.total.balcao) +
        sepC() + eqB(ranking.total.resf) +
        sepC() + eqB(ranking.total.cong) +
        sepC() + aderBadge(totalAder) +
      '</div>';

    // Linhas de dados
    lojas.forEach(function(l, i) {
      var ader = calcAder(l);
      html += '<div class="tmp-rk-data-row" style="padding:0">' +
        '<div class="tmp-rk-pos">' + (i+1) + '</div>' +
        '<div class="tmp-rk-loja">' + l.nome + '</div>' +
        sepC() + eqB(l.balcao) +
        sepC() + eqB(l.resf) +
        sepC() + eqB(l.cong) +
        sepC() + aderBadge(ader) +
      '</div>';
    });

    return html + '</div>';
  }

  function initBloco4Events() {
    // Após render, aplicar grid exato e sort
    setTimeout(function() {
      var dataRow = document.querySelector('.tmp-rk-data-row');
      if (!dataRow) return;
      var exactGrid = window.getComputedStyle(dataRow).gridTemplateColumns;

      // Forçar mesmo grid no total e header
      var totalRow = document.getElementById('rkTotalRow');
      if (totalRow) totalRow.style.cssText =
        'grid-template-columns:'+exactGrid+'!important;margin:0!important;padding:0!important;' +
        'background:rgba(12,20,37,.02)!important;border-bottom:2px solid rgba(0,0,0,.08)!important;' +
        'border-top:1px solid rgba(0,0,0,.06)!important;min-height:38px!important;align-items:stretch!important;';

      var headerGrid = document.getElementById('rkHeaderGrid');
      if (headerGrid) headerGrid.style.gridTemplateColumns = exactGrid;

      // Evento sort
      var thAder = document.getElementById('th-rk-ader');
      if (thAder) {
        thAder.addEventListener('click', function() {
          _rkSortAsc = !_rkSortAsc;
          var arrow = document.getElementById('rk-ader-arrow');
          if (arrow) arrow.textContent = _rkSortAsc ? '\u25b2' : '\u25bc';
          // Re-render bloco 4
          var rankingSection = document.querySelector('.section-block.ranking');
          if (rankingSection && tmpData) {
            var tmp = document.createElement('div');
            tmp.innerHTML = renderBloco4(tmpData.ranking);
            rankingSection.parentNode.replaceChild(tmp.firstChild, rankingSection);
            initBloco4Events();
          }
        });
      }
    }, 100);
  }

  // ══════════════════════════════════════════════════════════════
  // PILL EVENTS
  // ══════════════════════════════════════════════════════════════
  function initPillEvents() {
    document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('#tmpTrendPills .eq-pill').forEach(function(p){ p.classList.remove('active'); });
        this.classList.add('active');
        tmpEqFilter = this.getAttribute('data-eq');
        tmpCharts = tmpCharts.filter(function(c) {
          if (c.canvas && (c.canvas.id==='tmpCh1'||c.canvas.id==='tmpCh2'||c.canvas.id==='tmpCh3')) { c.destroy(); return false; }
          return true;
        });
        ['tmpTb1','tmpTb2','tmpTb3'].forEach(function(id){ var t=document.getElementById(id); if(t) t.innerHTML=''; });
        initBloco2Charts(tmpData.tendenciaConf, tmpEqFilter);
      });
    });
    document.querySelectorAll('#tmpBnPills .eq-pill').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('#tmpBnPills .eq-pill').forEach(function(p){ p.classList.remove('active'); });
        this.classList.add('active');
        renderBnTable(tmpData.mapaConf, this.getAttribute('data-eq'));
        attachBnTooltips(tmpData.mapaConf);
      });
    });
  }

  await loadData();

}); // end Router.register
