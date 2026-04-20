// ============================================================
// NEXO Intelligence Web — pages/mercado.js
// Mercado & Clima — v3.4 (IPCA interativo + storytelling)
// FIX 1 (v2.3): Duplicidade de tooltip do "?"
// FIX 2 (v2.5): Stacking do hover entre grupos do Painel
// FIX 3 (v2.6): IPCA bars — estrutura .mc-ig-col pareando label+barra
// FIX 4 (v2.7): Tooltip do calendário → insights prescritivos
// FIX 5 (v2.8): Chips de filtro do Explorador
// FEAT 6 (v2.9): Pills interativas em Cotações (Dia/Sem/Mês)
// FEAT 7 (v3.4): IPCA refatorado — storytelling completo
//   DÓLAR separado como contexto macro na faixa superior
//   PILLS unificadas "Período: ... | Exibir: ..."
//   IBNs com wash da cor da série (ancoragem visual)
//   FILTRO de série afeta gráfico + IBNs + colunas de insight
//   ENGINE v3 de insights — funções próprias por série,
//     sempre gera 2 insights por coluna, direciona a leitura:
//       Geral: meta BCB, tendência, YoY, estabilidade
//       Alim:  razão vs geral, tendência, YoY
//       Carnes: YoY direto, consistência de ciclo, vs alim
//   INSIGHTS em 3 colunas lado a lado (grid), classificação
//     explícita via data-ins-serie (não keyword match)
// ============================================================
Router.register('mercado', function(main) {
  var MESES = ['Nov/25','Dez/25','Jan/26','Fev/26','Mar/26','Abr/26'];

  // ── COT — dados por granularidade (Dia/Semana/Mês) ──
  // Último ponto coerente entre as 3 séries (é sempre o "agora")
  var COT = {
    boi: {
      dia:    { labels:['07/04','08/04','09/04','10/04','11/04','12/04','13/04','14/04','15/04','16/04','17/04','18/04','19/04','20/04'],
                vals:[359.2,360.1,361.5,362.0,362.8,363.4,363.9,364.2,364.8,365.1,365.5,365.9,366.1,366.2] },
      semana: { labels:['S-7','S-6','S-5','S-4','S-3','S-2','S-1','S0'],
                vals:[348.2,351.4,354.6,357.2,360.1,362.5,364.3,366.2] },
      mes:    { labels:MESES, vals:[318.4,328.9,335.2,348.6,356.8,366.2] },
      lc:'#C0504D', fc:'rgba(192,80,77,0.10)', unit:'/@'
    },
    suino: {
      dia:    { labels:['07/04','08/04','09/04','10/04','11/04','12/04','13/04','14/04','15/04','16/04','17/04','18/04','19/04','20/04'],
                vals:[7.16,7.12,7.10,7.08,7.05,7.02,7.00,7.00,6.98,6.98,6.97,6.96,6.96,6.96] },
      semana: { labels:['S-7','S-6','S-5','S-4','S-3','S-2','S-1','S0'],
                vals:[7.18,7.15,7.12,7.08,7.04,7.01,6.98,6.96] },
      mes:    { labels:MESES, vals:[7.42,7.38,7.51,7.30,7.16,6.96] },
      lc:'#2D8653', fc:'rgba(45,134,83,0.10)', unit:'/kg'
    },
    frango: {
      dia:    { labels:['07/04','08/04','09/04','10/04','11/04','12/04','13/04','14/04','15/04','16/04','17/04','18/04','19/04','20/04'],
                vals:[8.09,8.09,8.10,8.10,8.10,8.09,8.10,8.10,8.10,8.10,8.10,8.10,8.10,8.10] },
      semana: { labels:['S-7','S-6','S-5','S-4','S-3','S-2','S-1','S0'],
                vals:[8.09,8.09,8.10,8.10,8.10,8.10,8.10,8.10] },
      mes:    { labels:MESES, vals:[8.22,8.18,8.15,8.12,8.09,8.10] },
      lc:'#7153A0', fc:'rgba(113,83,160,0.10)', unit:'/kg'
    }
  };

  // ── IPCA — série mensal de 76 meses (Jan/2020 → Abr/2026) ──
  // Seed com ruído senoidal + drift de tendência de alta em 2024-26
  // Permite agregação por Mês/Bim/Tri/Sem/Ano com comparações YoY reais
  var _ipcaMeses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function _ipcaSeed(baseAnual, tendencia) {
    var arr = [];
    for (var i = 0; i < 76; i++) {
      var base = baseAnual / 12;
      var ruido = (Math.sin(i * 1.3) * 0.15) + (Math.cos(i * 0.7) * 0.08);
      var drift = (i / 76) * tendencia;
      arr.push(parseFloat((base + ruido + drift).toFixed(2)));
    }
    return arr;
  }
  var IPCA_FULL = {
    labels: [],
    geral:  _ipcaSeed(3.5, 0.15),
    alim:   _ipcaSeed(5.5, 0.25),
    carnes: _ipcaSeed(6.0, 0.30)
  };
  for (var _a = 2020; _a <= 2026; _a++) {
    var _fim = (_a === 2026) ? 4 : 12;
    for (var _m = 0; _m < _fim; _m++) IPCA_FULL.labels.push(_ipcaMeses[_m]+'/'+String(_a).slice(-2));
  }

  // IPCA_DATA mantido para compatibilidade com renderização inicial do HTML
  // (será sobrescrito pelas pills no render dinâmico)
  var IPCA_DATA = [
    {m:'Nov/25', g:0.39, a:0.62, c:0.82},
    {m:'Dez/25', g:0.52, a:0.75, c:0.96},
    {m:'Jan/26', g:0.42, a:0.83, c:1.05},
    {m:'Fev/26', g:0.48, a:0.88, c:1.12},
    {m:'Mar/26', g:0.44, a:0.90, c:1.08},
    {m:'Abr/26*',g:0.50, a:0.71, c:0.95}
  ];

  // ── SVGs padrão sidebar NEXO ───────────────────────────────
  var ICONS = {
    clima: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="8.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M7.5 3h1M7.5 5h1" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>',
    data:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 5h9" stroke="currentColor" stroke-width="1.1"/><path d="M4 1.5v2M8 1.5v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="8" r="1" fill="currentColor"/></svg>',
    pagto: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.3"/><path d="M6 3.5v5M4.5 7.5c0 .6.67 1 1.5 1s1.5-.4 1.5-1-.67-1-1.5-1-1.5-.4-1.5-1 .67-1 1.5-1 1.5.4 1.5 1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
    alta:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 9L4.5 5.5L7 7.5L10.5 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 3h2v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    baixa: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 3L4.5 6.5L7 4.5L10.5 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 9h2v-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    frio:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/></svg>',
    barras:'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="5" width="2" height="5" rx="1" fill="currentColor" opacity="0.4"/><rect x="5" y="3" width="2" height="7" rx="1" fill="currentColor" opacity="0.7"/><rect x="8.5" y="1.5" width="2" height="8.5" rx="1" fill="currentColor"/></svg>',
    raio:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 1.5L3.5 6.5H6L5 10.5L8.5 5.5H6L7 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    globo: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5.5" cy="6" r="4" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 6h8M5.5 2c-1.2 1.5-1.2 5.5 0 8M5.5 2c1.2 1.5 1.2 5.5 0 8" stroke="currentColor" stroke-width="0.9"/><path d="M9 3l2-2M11 1l-2.5 0M11 1l0 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // ── Helpers ────────────────────────────────────────────────
  function f0(v) { return parseFloat(v).toFixed(0); }
  function f2(v) { return parseFloat(v).toFixed(2); }
  function varRow(data, fmtFn) {
    return data.map(function(v,i) {
      if (i===0) return '<td class="mc-tna">—</td>';
      var d = v - data[i-1], cls = d>0?'mc-tup':'mc-tdn', ar = d>0?'▲':'▼';
      return '<td class="'+cls+'">'+ar+' '+fmtFn(Math.abs(d))+'</td>';
    }).join('');
  }
  function pctRow(data) {
    return data.map(function(v,i) {
      if (i===0) return '<td class="mc-tna">—</td>';
      var p = (v-data[i-1])/data[i-1]*100, cls = p>0?'mc-tup':'mc-tdn', ar = p>0?'▲':'▼';
      return '<td class="'+cls+'">'+ar+' '+Math.abs(p).toFixed(1)+'%</td>';
    }).join('');
  }
  function hb(title, body, good, bad) {
    return '<div class="mc-hb">?<div class="mc-ht">' +
      '<span class="mc-ht-t">'+title+'</span>'+body+
      '<span class="mc-ht-g">'+good+'</span><span class="mc-ht-r">'+bad+'</span>'+
      '</div></div>';
  }

  function ctxCard(cls, lbl, iconKey, iconColor, val, sub, subBold, bdgCls, bdgTxt, insight, htT, htB, htG, htR, boldTerms) {
    var subHtml = sub ? '<div class="mc-cc-sub'+(subBold?' mc-bold':'')+'">'+sub+'</div>' : '<div class="mc-cc-sub mc-empty">—</div>';
    var ins = insight;
    if (boldTerms) { boldTerms.forEach(function(t) { ins = ins.replace(t, '<strong>'+t+'</strong>'); }); }
    var iconSvg = ICONS[iconKey] || '';
    var iconHtml = '<span class="mc-cc-icon" style="color:'+iconColor+'">'+iconSvg+'</span>';
    return '<div class="mc-cc '+cls+'">' +
      '<div class="mc-cc-top">' +
        '<div class="mc-cc-lbl">'+lbl+'</div>' +
        '<div class="mc-cc-icons">'+hb(htT,htB,htG,htR)+iconHtml+'</div>' +
      '</div>' +
      '<div class="mc-cc-val">'+val+'</div>' +
      subHtml +
      '<div class="mc-cc-badge-row"><span class="mc-badge '+bdgCls+'">'+bdgTxt+'</span></div>' +
      '<div class="mc-cc-insight">'+ins+'</div>' +
    '</div>';
  }

  function ipcaBn(bCls, fTxt, fCls, lbl, valColor, val, sub, htT, htB, htG, htR) {
    return '<div class="mc-ibn mc-'+bCls+'">' +
      '<div class="mc-ibn-top"><div style="display:flex;align-items:center;gap:5px">' +
        '<div class="mc-ibn-lbl">'+lbl+'</div>'+hb(htT,htB,htG,htR)+'</div>' +
        '<div class="mc-farol mc-f'+fCls+'"><div class="mc-fd"></div>'+fTxt+'</div>' +
      '</div>' +
      '<div class="mc-ibn-val" style="color:'+valColor+'">'+val+'</div>' +
      '<div class="mc-ibn-sub">'+sub+'</div>' +
    '</div>';
  }

  function cd(extraCls, num, events, tipId) {
    var evHtml = (events||[]).map(function(e){ return '<div class="mc-cev '+e[0]+'">'+e[1]+'</div>'; }).join('');
    var numHtml = extraCls==='today' ? '<span style="background:var(--navy);color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px">'+num+'</span>' : num;
    var extra = tipId ? ' data-tip="'+tipId+'"' : '';
    return '<div class="mc-cd '+(extraCls||'')+'"'+extra+'>' +
      '<div class="mc-cdn">'+numHtml+'</div>' +
      (evHtml?'<div class="mc-cevts">'+evHtml+'</div>':'')+
    '</div>';
  }

  // ── HTML ───────────────────────────────────────────────────
  var html =
    // TOOLBAR
    '<div class="mc-toolbar">' +
      '<span class="mc-tb-label">Localização</span>' +
      '<select class="filter-select"><option>MG — Minas Gerais</option><option>SP — São Paulo</option><option>PR — Paraná</option></select>' +
      '<select class="filter-select"><option>Patrocínio</option><option>Uberlândia</option><option>Belo Horizonte</option></select>' +
      '<button class="mc-loc-btn">📍 Usar minha localização</button>' +
      '<div class="mc-tb-sep"></div>' +
      '<span class="mc-tb-label">Histórico</span>' +
      '<select class="filter-select"><option>Últimas 6 semanas</option><option>Últimos 6 meses</option></select>' +
    '</div>' +

    // ── B1: PAINEL CONTEXTO ────────────────────────────────────
    '<div class="section-header anim d1"><div class="sh-dot"></div><span class="sh-title">Painel de Contexto</span><span class="sh-badge">Bate-olho · Atualizado agora</span></div>' +
    '<div class="section-block anim d1 mc-ctx-block">' +
      '<div class="mc-grupos-outer">' +
        '<div class="mc-grupo-col">' +
          '<div class="mc-grupo-lbl" style="background:#3670A0">📍 Operacional</div>' +
          '<div class="mc-grupo-cards">' +
            ctxCard('c1','Clima Hoje','clima','#3670A0','33°C','Patrocínio · Sol · Min 19°C',false,'wn','Sáb 36°C previsto','Calor no fim de semana → demanda churrasco ALTA. Monitorar cadeia do frio.','Clima Hoje','Temperatura atual na cidade selecionada. Fonte: OpenWeather API.','✓ Abaixo 28°C: clima neutro','✗ Acima 32°C: atenção na cadeia do frio',['demanda churrasco ALTA']) +
            ctxCard('c2','Próxima Data','data','#C9A84C','11<span class="mc-unit" style="font-size:11px;margin-left:3px;font-weight:400">dias</span>','Dia das Mães',true,'wn','Alto impacto · 11/05','Iniciar comunicação no balcão esta semana. Kit churrasco família.','Datas Estratégicas','Próxima data comemorativa relevante para açougue e rotisseria.','✓ Com 7+ dias: tempo hábil','✗ Menos de 3 dias: ação emergencial',['Kit churrasco família']) +
            ctxCard('c9','Próx. Pagamento','pagto','#2D8653','4<span class="mc-unit" style="font-size:11px;margin-left:3px;font-weight:400">dias</span>','Dia 20',true,'wn','Pico de demanda','Entrada de salário em 4 dias — garantir estoque de bovino e suíno antes.','Calendário de Pagamentos','Dias 5, 10, 15 e último útil do mês concentram maior fluxo de compras.','✓ Com 3+ dias: preparar estoque antecipado','✗ Amanhã: último momento para reposição',['4 dias']) +
          '</div></div>' +
        '<div class="mc-grupo-col">' +
          '<div class="mc-grupo-lbl" style="background:#C0504D">🥩 Cotações</div>' +
          '<div class="mc-grupo-cards">' +
            ctxCard('c3','Boi Gordo','alta','#C0504D','366<span class="mc-unit">/@</span>','',false,'up','▲ +4,2% no mês','Tendência de alta — revisar preço do traseiro esta semana.','Boi Gordo (CEPEA)','Cotação R$/arroba em SP. R$10/@ de alta ≈ +R$0,67/kg na carne.','✓ Estável/queda: margem protegida','✗ Alta 2+ meses: revisar preço do traseiro',['revisar preço do traseiro esta semana']) +
            ctxCard('c4','Suíno Vivo','baixa','#2D8653','6,96<span class="mc-unit">/kg</span>','',false,'dn','▼ -2,8% semana','Janela de compra aberta — reforçar mix suíno agora.','Suíno Vivo (CEPEA)','Cotação R$/kg posto SP. Base de custo para costelinha, lombo e pernil.','✓ Em queda: janela de compra aberta','✗ Acima R$8,00: revisar preços',['Janela de compra aberta']) +
            ctxCard('c5','Frango Cong.','frio','#7153A0','8,10<span class="mc-unit">/kg</span>','',false,'nt','↔ Estável','Margem protegida · Favorável para rotisseria.','Frango Atacado (CEPEA)','Cotação R$/kg frango congelado atacado SP. Referência para rotisseria.','✓ Estável: margem previsível','✗ Alta acima 10%: revisar frango assado',['Margem protegida']) +
          '</div></div>' +
        '<div class="mc-grupo-col">' +
          '<div class="mc-grupo-lbl" style="background:#7153A0">📈 Macro</div>' +
          '<div class="mc-grupo-cards">' +
            ctxCard('c7','Boi Futuro B3','raio','#C0504D','342<span class="mc-unit">/@</span>','Mai/26 · B3',false,'dn','▼ -6,6% vs físico','Mercado prevê queda em maio — avaliar adiar compra de boi gordo.','Contrato Futuro Boi (B3)','Preço que o mercado espera para o boi gordo. Futuro abaixo físico = mercado prevê queda.','✓ Futuro abaixo físico: aguardar para comprar','✗ Futuro acima físico: antecipar compra agora',['avaliar adiar compra de boi gordo']) +
            ctxCard('c8','Export. Bovina','globo','#2D8653','+15,1%','vs Abr/2025 · COMEX',false,'up','▲ Recorde Abr/26','Exportação recorde → pressão de alta no boi. Antecipar compras bovinas.','Exportação Carne Bovina (COMEX)','Exportação em alta = frigoríficos preferem mercado externo = boi interno tende a subir.','✓ Estável/queda: oferta interna normal','✗ Em alta: boi interno tende a subir',['Antecipar compras bovinas']) +
            ctxCard('c6','IPCA Alim.','barras','#7153A0','+0,9%','Acum. 12m: +8,1%',false,'up','▲ Acima da meta','Consumidor pressionado — priorizar mix de valor percebido alto.','IPCA Alimentação (IBGE)','Variação mensal dos preços de alimentos. 2× acima do geral = consumidor migra para cortes baratos.','✓ Abaixo 0,5%/mês: pressão baixa','✗ Acima 0,8%/mês: reforce mix de valor',['priorizar mix de valor percebido alto']) +
          '</div></div>' +
      '</div>' +
    '</div>' +

    // ── B2: ANÁLISE INTEGRADA ──────────────────────────────────
    '<div class="section-header anim d1" style="margin-top:20px"><div class="sh-dot"></div><span class="sh-title">Análise Integrada</span><span class="sh-badge">Insights cruzados · Clima × Cotações × Exportação × Sazonalidade</span></div>' +
    '<div class="section-block anim d1 mc-ins-block">' +
      '<div class="mc-ins-grid">' +
        '<div class="mc-ins-card mc-ins-cr"><div class="mc-ins-type mc-cr">⚠ Crítico — Revisão de Preço</div><div class="mc-ins-title">Boi gordo em alta + exportação recorde. Dupla pressão no traseiro.</div><div class="mc-ins-body">Físico em <strong>R$366/@</strong> (+4,2% mês) com exportação <strong>+15,1%</strong> acima de Abr/25. Apesar do futuro Mai/26 a R$342, o curto prazo segue pressionado.</div><div class="mc-ins-action">→ Revisar alcatra, contrafilé e picanha esta semana. Monitorar futuro B3 para janela em maio.</div><div class="mc-ins-srcs"><span class="mc-src">CEPEA</span><span class="mc-src">B3</span><span class="mc-src">COMEX</span></div></div>' +
        '<div class="mc-ins-card mc-ins-op"><div class="mc-ins-type mc-op">✓ Oportunidade — Compra + Pagamento</div><div class="mc-ins-title">Suíno em queda + Dia da Carne Suína + salário em 4 dias.</div><div class="mc-ins-body">Suíno caiu <strong>-2,8%</strong> na semana. Dia 25/04 é Dia da Carne Suína. Entrada de salário no dia 20 (4 dias) vai amplificar a demanda. Três fatores simultâneos favoráveis.</div><div class="mc-ins-action">→ Aumentar pedido de costelinha e lombo agora. Comunicar no balcão antes do dia 20.</div><div class="mc-ins-srcs"><span class="mc-src">CEPEA</span><span class="mc-src">Sazonalidade</span><span class="mc-src">Pagamentos</span></div></div>' +
        '<div class="mc-ins-card mc-ins-at"><div class="mc-ins-type mc-at">◉ Atenção — Operacional + Estoque</div><div class="mc-ins-title">Fim de semana 36°C + pico de demanda. Dois riscos simultâneos.</div><div class="mc-ins-body">Sábado <strong>36°C</strong> previsto com demanda elevada de churrasco. Calor extremo eleva risco na cadeia do frio no momento de maior movimento.</div><div class="mc-ins-action">→ Monitorar balcão a cada 2h no sábado. Reforçar estoque de picanha, costela e linguiça.</div><div class="mc-ins-srcs"><span class="mc-src">Clima</span><span class="mc-src">Temperatura</span></div></div>' +
      '</div>' +
    '</div>' +

    // ── B3: COTAÇÕES ───────────────────────────────────────────
    '<div class="section-header anim d2"><div class="sh-dot"></div><span class="sh-title">Cotações de Insumos</span><span class="sh-badge">CEPEA/Esalq · Atualizado diariamente 18h</span></div>' +
    '<div class="section-block anim d2 mc-cot-block">' +
      '<div class="mc-pills" id="mc-pills-cot"><button class="mc-pill">Dia</button><button class="mc-pill">Semana</button><button class="mc-pill active">Mês</button></div>' +
      '<div class="mc-cot-grid">' +
        '<div class="mc-cot-card"><div class="mc-cot-head"><span class="mc-cot-icon">🐄</span><span class="mc-cot-ttl">Boi Gordo</span>'+hb('Boi Gordo (R$/@)','Preço por arroba no mercado paulista. R$10/@ de alta ≈ +R$0,67/kg.','✓ Estável: margem protegida','✗ Alta 2+ meses: repasse obrigatório')+'</div><div class="mc-cot-bn">366<span class="mc-unit">/@</span></div><div class="mc-cot-badges"><span class="mc-badge up">▲ +4,2% mês</span><span class="mc-badge up">▲ +11,8% trim.</span></div><div class="mc-chart-wrap"><canvas id="mc-cvs-boi"></canvas></div><table class="mc-tbl" id="mc-tbl-boi"><colgroup id="mc-cg-boi"></colgroup><tbody><tr><td class="mc-tlbl">Var.</td>'+varRow(COT.boi.vals,f0)+'</tr><tr><td class="mc-tlbl">Var.%</td>'+pctRow(COT.boi.vals)+'</tr></tbody></table><div class="mc-cot-pill mc-pill-warn">⚠ Cruzar 380/@ → repassar no traseiro</div></div>' +
        '<div class="mc-cot-card"><div class="mc-cot-head"><span class="mc-cot-icon">🐷</span><span class="mc-cot-ttl">Suíno Vivo</span>'+hb('Suíno Vivo (R$/kg)','Cotação posto SP. Base de custo para costelinha, lombo e pernil.','✓ Em queda: compre mais','✗ Acima R$8,00: revisar preços')+'</div><div class="mc-cot-bn">6,96<span class="mc-unit">/kg</span></div><div class="mc-cot-badges"><span class="mc-badge dn">▼ -2,8% sem.</span><span class="mc-badge dn">▼ -1,2% mês</span></div><div class="mc-chart-wrap"><canvas id="mc-cvs-suino"></canvas></div><table class="mc-tbl" id="mc-tbl-suino"><colgroup id="mc-cg-suino"></colgroup><tbody><tr><td class="mc-tlbl">Var.</td>'+varRow(COT.suino.vals,f2)+'</tr><tr><td class="mc-tlbl">Var.%</td>'+pctRow(COT.suino.vals)+'</tr></tbody></table><div class="mc-cot-pill mc-pill-opp">✓ Janela de compra — reforçar costelinha e lombo</div></div>' +
        '<div class="mc-cot-card"><div class="mc-cot-head"><span class="mc-cot-icon">🐔</span><span class="mc-cot-ttl">Frango Congelado</span>'+hb('Frango Atacado (R$/kg)','Cotação frango congelado atacado SP. Referência de custo para rotisseria.','✓ Estável: margem previsível','✗ Alta acima 10%: revisar frango assado')+'</div><div class="mc-cot-bn">8,10<span class="mc-unit">/kg</span></div><div class="mc-cot-badges"><span class="mc-badge nt">↔ +0,1% sem.</span><span class="mc-badge nt">↔ Estável 3m</span></div><div class="mc-chart-wrap"><canvas id="mc-cvs-frango"></canvas></div><table class="mc-tbl" id="mc-tbl-frango"><colgroup id="mc-cg-frango"></colgroup><tbody><tr><td class="mc-tlbl">Var.</td>'+varRow(COT.frango.vals,f2)+'</tr><tr><td class="mc-tlbl">Var.%</td>'+pctRow(COT.frango.vals)+'</tr></tbody></table><div class="mc-cot-pill mc-pill-ok">◎ Margem protegida · Rotisseria favorável</div></div>' +
      '</div>' +
    '</div>' +

    // ── B4: IPCA ───────────────────────────────────────────────
    '<div class="section-header anim d3"><div class="sh-dot"></div><span class="sh-title">IPCA & Macro</span><span class="sh-badge">IBGE/SIDRA · Banco Central · Mensal</span></div>' +
    '<div class="section-block anim d3 mc-ipca-block">' +
      '<div class="mc-pills" id="mc-pills-ipca"><button class="mc-pill">Dia</button><button class="mc-pill">Semana</button><button class="mc-pill active">Mês</button></div>' +
      '<div class="mc-ipca-layout">' +
        '<div class="mc-ipca-bns">' +
          ipcaBn('fw','Atenção','w','IPCA Geral','#C97B2C','<strong>+5,48%</strong>','Acumulado 12m · Meta: 3,5%','IPCA Geral','Índice oficial de inflação do Brasil (IBGE). Meta BCB 2026: 3,5%/ano.','✓ Abaixo de 4%: economia sob controle','✗ Acima de 5%: custos operacionais crescentes') +
          ipcaBn('fr','Crítico','r','IPCA Alimentação','#C0504D','<strong>+8,1%</strong>','Acumulado 12m · Acima do geral','IPCA Alimentação','2× acima do geral = consumidor migra para cortes baratos.','✓ Próximo ao geral: pressão equilibrada','✗ 2× acima: consumidor corta cortes nobres') +
          ipcaBn('fr','Crítico','r','IPCA Carnes','#C0504D','<strong>+10,3%</strong>','Acumulado 12m · 2× acima do geral','IPCA Carnes','Subcomponente específico para carnes.','✓ Abaixo de 5%: consumidor compra com conforto','✗ Acima de 8%: promova proteínas alternativas') +
          ipcaBn('fb','Monitorar','b','Dólar Comercial','#3670A0','<strong>R$ 5,72</strong>','Comercial venda · Banco Central','Dólar Comercial (BCB)','Câmbio do BCB. Dólar alto encarece cortes exportáveis.','✓ Abaixo R$5,50: pressão cambial baixa','✗ Acima R$6,00: risco de alta nos cortes nobres') +
        '</div>' +
        '<div class="mc-ipca-chart-area">' +
          '<div class="mc-ipca-chart-ttl">Evolução mensal — últimos 6 meses</div>' +
          '<div class="mc-ipca-bars" id="mc-ipca-bars"></div>' +
          '<div class="mc-ipca-leg"><div class="mc-il"><div class="mc-lsq" style="background:rgba(12,20,37,0.28)"></div>IPCA Geral</div><div class="mc-il"><div class="mc-lsq" style="background:#C97B2C"></div>IPCA Alimentação</div><div class="mc-il"><div class="mc-lsq" style="background:#C0504D"></div>IPCA Carnes</div></div>' +
          '<div id="mc-ipca-alerts"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ── B5: CALENDÁRIO ─────────────────────────────────────────
    '<div class="section-header anim d4"><div class="sh-dot"></div><span class="sh-title">Calendário Estratégico</span><span class="sh-badge">Sazonalidade · Feriados · Pagamentos · Eventos</span></div>' +
    '<div class="section-block anim d4 mc-cal-block">' +
      '<div class="mc-cal-nav"><button class="mc-cnb">‹</button><span class="mc-cal-month">Abril 2026</span><button class="mc-cnb">›</button><button class="mc-cal-add">+ Adicionar evento</button></div>' +
      '<div class="mc-cal-grid">' +
        '<div class="mc-cdow">Dom</div><div class="mc-cdow">Seg</div><div class="mc-cdow">Ter</div><div class="mc-cdow">Qua</div><div class="mc-cdow">Qui</div><div class="mc-cdow">Sex</div><div class="mc-cdow">Sáb</div>' +
        cd('other','29')+cd('other','30')+cd('other','31')+
        cd('','1',[['feriado','Tira-dentes']])+cd('','2')+cd('','3')+cd('','4',[['clima','☀ 36°C']])+
        cd('','5',[['pagto','💰 Pagto. 5']])+cd('','6')+cd('','7')+cd('','8')+cd('','9')+
        cd('','10',[['feriado','Paixão de Cristo'],['pagto','💰 Pagto. 10']])+cd('','11')+
        cd('','12',[['feriado','Páscoa']])+cd('','13')+cd('','14')+
        cd('','15',[['pagto','💰 Pagto. 15']])+cd('today','16')+cd('','17')+
        cd('','18',[['clima','☀ 34°C']])+cd('','19')+
        cd('pagto','20',[['pagto','💰 Pagto. FGTS']])+
        cd('','21',[['feriado','Tiradentes']])+cd('','22',[['sazon','Dia da Terra']])+
        cd('','23',[['custom','Reunião Rede']])+cd('','24')+
        cd('','25',[['sazon','🐷 Dia Suíno']],'tip-suino')+
        cd('','26')+cd('','27')+cd('','28')+cd('','29')+
        cd('pagto','30',[['pagto','💰 Último útil']])+
        cd('other','1')+cd('other','2')+
      '</div>' +
      '<div class="mc-cal-legend"><span class="mc-cev feriado">Feriado</span><span class="mc-cev sazon">Sazonalidade</span><span class="mc-cev pagto">💰 Pagamento</span><span class="mc-cev clima">Clima</span><span class="mc-cev custom">Evento próprio</span></div>' +
      '<div class="mc-mes-insight"><span class="mc-mes-icon">🧭</span><div><div class="mc-mes-ttl">Análise de Abril 2026</div><div class="mc-mes-body"><strong>3 feriados + 5 picos de pagamento</strong> neste mês. Páscoa exige mix focado em aves e suíno. Dia da Carne Suína (25/04) + FGTS dia 20 = janela dupla para suíno.</div><div class="mc-mes-action">→ Prioridade: Suíno · Aves (Páscoa + Rotisseria) · Bovino (antecipar revisão de preço)</div></div></div>' +
    '</div>' +

    // ── B6: EXPLORADOR ─────────────────────────────────────────
    // Chips de filtro padrão NEXO: label em navy (gradiente + inset gold)
    // + valor em fundo branco translúcido com chevron. Visualmente comunica
    // "objeto filtro" unificado, em vez de texto solto ao lado de select.
    '<div class="section-header anim d5"><div class="sh-dot"></div><span class="sh-title">Explorador de Dados</span><span class="sh-badge">Tabela pivot · Heatmap automático</span></div>' +
    '<div class="section-block anim d5 mc-exp-block">' +
      (function(){
        // Estilos inline — mantém styles.css intocado
        var fieldCSS = 'display:inline-flex;align-items:stretch;gap:0;background:rgba(255,255,255,0.78);border:1px solid rgba(26,39,68,0.12);border-radius:22px;overflow:hidden;box-shadow:0 1px 3px rgba(12,20,37,0.04);transition:border-color .2s, box-shadow .2s';
        var lblCSS = 'display:flex;align-items:center;padding:0 14px;background:linear-gradient(135deg,#0C1425 0%,#1A2744 100%);color:#FFFFFF;border-right:1px solid rgba(201,168,76,0.25);box-shadow:inset 0 1px 0 rgba(201,168,76,0.35);font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0';
        var selCSS = "background:transparent;border:none;border-radius:0;padding:6px 34px 6px 12px;color:#1F2937;font-weight:600;font-size:11.5px;outline:none;cursor:pointer;font-family:'Outfit',sans-serif;-webkit-appearance:none;appearance:none;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path d='M2 3.5l3 3 3-3' stroke='%234B5563' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\");background-repeat:no-repeat;background-position:right 12px center";
        var sepCSS = 'width:1px;height:22px;background:rgba(26,39,68,0.15);align-self:center';
        function field(label, options) {
          var opts = options.map(function(o){ return '<option>'+o+'</option>'; }).join('');
          return '<div class="mc-exp-field" style="'+fieldCSS+'">' +
            '<span class="mc-el" style="'+lblCSS+'">'+label+'</span>' +
            '<select class="filter-select" style="'+selCSS+'">'+opts+'</select>' +
          '</div>';
        }
        return '<div class="mc-exp-ctrl" style="background:transparent;border:none;padding:0 0 14px;gap:10px;flex-wrap:wrap;align-items:center">' +
          field('Linhas',  ['Produto','Mês']) +
          field('Colunas', ['Mês','Semana']) +
          field('Métrica', ['Cotação Média','Variação %']) +
          '<div style="'+sepCSS+'"></div>' +
          '<button class="mc-exp-export" style="margin-left:auto">↓ Excel</button>' +
        '</div>';
      })() +
      '<div style="overflow-x:auto"><table class="mc-pvt"><thead><tr><th style="text-align:left">Produto</th><th>Nov/25</th><th>Dez/25</th><th>Jan/26</th><th>Fev/26</th><th>Mar/26</th><th>Abr/26</th><th style="background:rgba(201,168,76,0.22);color:#6A4C00">Média</th></tr></thead><tbody><tr><td>🐄 Boi Gordo (R$/@)</td><td><span class="hc n0">318,40</span></td><td><span class="hc u1">328,90</span></td><td><span class="hc u1">335,20</span></td><td><span class="hc u2">348,60</span></td><td><span class="hc u2">356,80</span></td><td><span class="hc u3">366,20</span></td><td><span class="hc u2">342,35</span></td></tr><tr><td>🐄 Boi Futuro B3 (R$/@)</td><td><span class="hc n0">312,00</span></td><td><span class="hc u1">318,50</span></td><td><span class="hc u1">322,00</span></td><td><span class="hc u1">330,00</span></td><td><span class="hc u1">338,00</span></td><td><span class="hc d2">342,00</span></td><td><span class="hc n0">327,08</span></td></tr><tr><td>🐷 Suíno Vivo (R$/kg)</td><td><span class="hc u2">7,42</span></td><td><span class="hc u1">7,38</span></td><td><span class="hc u1">7,51</span></td><td><span class="hc n0">7,30</span></td><td><span class="hc d1">7,16</span></td><td><span class="hc d2">6,96</span></td><td><span class="hc n0">7,29</span></td></tr><tr><td>🐔 Frango Cong. (R$/kg)</td><td><span class="hc d1">8,22</span></td><td><span class="hc n0">8,18</span></td><td><span class="hc n0">8,15</span></td><td><span class="hc n0">8,12</span></td><td><span class="hc n0">8,09</span></td><td><span class="hc n0">8,10</span></td><td><span class="hc n0">8,14</span></td></tr><tr><td>📊 IPCA Alim. (%)</td><td><span class="hc u1">+0,62</span></td><td><span class="hc u1">+0,75</span></td><td><span class="hc u2">+0,83</span></td><td><span class="hc u2">+0,88</span></td><td><span class="hc u2">+0,90</span></td><td><span class="hc u1">+0,71*</span></td><td><span class="hc u2">+0,78</span></td></tr></tbody><tfoot><tr><td>Var. Período</td><td>—</td><td><span class="hc u1" style="font-size:10px">+2,1%</span></td><td><span class="hc u1" style="font-size:10px">+1,8%</span></td><td><span class="hc u2" style="font-size:10px">+3,4%</span></td><td><span class="hc u1" style="font-size:10px">+2,3%</span></td><td><span class="hc u2" style="font-size:10px">+2,9%</span></td><td style="font-size:10px;color:var(--t3)">*parcial</td></tr></tfoot></table></div>' +
      '<div class="mc-heat-legend"><span style="font-size:10px;color:var(--t3);font-weight:600">Heatmap:</span><span class="hc u3" style="font-size:10px;padding:2px 8px">Alta forte</span><span class="hc u1" style="font-size:10px;padding:2px 8px">Alta leve</span><span class="hc n0" style="font-size:10px;padding:2px 8px">Estável</span><span class="hc d1" style="font-size:10px;padding:2px 8px">Queda leve</span><span class="hc d3" style="font-size:10px;padding:2px 8px">Queda forte</span></div>' +
    '</div>' +

    '<div class="mc-cal-tip" id="tip-suino"><div class="mc-ct-title">🐷 Dia da Carne Suína</div><div class="mc-ct-date">Sábado, 25 de Abril · 9 dias</div><div class="mc-ct-body">Suíno vivo em queda (-2,8%) + FGTS dia 20 = janela dupla. Margem favorável para ação promocional com alta demanda.</div><div class="mc-ct-action">→ Reforçar costelinha, lombo e pernil. Comunicar no balcão antes do dia 20.</div></div>';

  // ── RENDER ─────────────────────────────────────────────────
  main.innerHTML = html;

  // ══════════════════════════════════════════════════════════
  // FIX 1: Desativa o .mc-ht interno — apenas #mc-global-tip
  // renderiza o popover do "?". Evita duplicidade visual.
  // ══════════════════════════════════════════════════════════
  main.querySelectorAll('.mc-hb .mc-ht').forEach(function(ht) {
    // esconde fisicamente o tooltip-filho do .mc-hb
    ht.style.setProperty('display', 'none', 'important');
  });

  // ══════════════════════════════════════════════════════════
  // EXPLORADOR — hover nos chips + estilo das options do select
  // Estilos estáticos do chip já vêm inline do HTML; aqui só o
  // comportamento de hover (borda gold + shadow) e as <option>
  // (que não aceitam estilo inline pelo HTML em todos os browsers).
  // ══════════════════════════════════════════════════════════
  main.querySelectorAll('.mc-exp-field').forEach(function(f) {
    f.addEventListener('mouseenter', function() {
      f.style.setProperty('border-color', 'rgba(201,168,76,0.5)', 'important');
      f.style.setProperty('box-shadow', '0 3px 10px rgba(201,168,76,0.12)', 'important');
    });
    f.addEventListener('mouseleave', function() {
      f.style.setProperty('border-color', 'rgba(26,39,68,0.12)', 'important');
      f.style.setProperty('box-shadow', '0 1px 3px rgba(12,20,37,0.04)', 'important');
    });
    // Options do dropdown aberto — fundo branco + texto escuro
    f.querySelectorAll('.filter-select option').forEach(function(op) {
      op.style.setProperty('background', '#ffffff', 'important');
      op.style.setProperty('color', '#1F2937', 'important');
      op.style.setProperty('font-weight', '500', 'important');
    });
  });

  // ══════════════════════════════════════════════════════════
  // FIX 2 (v2.5): Stacking correto no hover dos cards
  //
  // Aprendizado da v2.4: `isolation:isolate` em cada
  // `.mc-grupo-cards` criava fronteiras de pintura que
  // impediam o card expandido de um grupo transbordar para
  // cima do grupo vizinho (o 1º card do grupo seguinte ficava
  // por cima do último card expandido do grupo anterior).
  //
  // Solução: UM ÚNICO stacking context no `.mc-grupos-outer`.
  // Os grupos internos NÃO recebem isolation nem position,
  // funcionam só como layout. Os 9 cards competem todos no
  // mesmo contexto — z-index alto vence qualquer ordem DOM.
  //
  // Irmãos ficam em position:static (sem z-index), apenas o
  // card expandido recebe position:relative + z-index:9999.
  // ══════════════════════════════════════════════════════════
  (function() {
    var allCards = Array.prototype.slice.call(
      main.querySelectorAll('.mc-ctx-block .mc-cc')
    );

    // ÚNICO stacking context: no wrapper externo dos grupos
    var outer = main.querySelector('.mc-ctx-block .mc-grupos-outer');
    if (outer) {
      outer.style.setProperty('isolation', 'isolate', 'important');
    }

    // IMPORTANTE: NÃO adicionar isolation nem position nos
    // .mc-grupo-cards — isso criaria fronteiras internas
    // impedindo o transbordo visual entre grupos.

    allCards.forEach(function(card) {
      var t = null;
      var insight = card.querySelector('.mc-cc-insight');

      function expand() {
        card.style.setProperty('position', 'relative', 'important');
        card.style.setProperty('z-index', '9999', 'important');
        card.style.setProperty('transform', 'scale(1.32)', 'important');
        card.style.setProperty('overflow', 'visible', 'important');
        card.style.setProperty('box-shadow',
          '0 20px 56px rgba(12,20,37,0.28),0 6px 16px rgba(12,20,37,0.14)',
          'important');
        if (insight) {
          insight.style.setProperty('height', 'auto', 'important');
          insight.style.setProperty('display', 'block', 'important');
          insight.style.setProperty('overflow', 'visible', 'important');
          insight.style.setProperty('-webkit-line-clamp', 'unset', 'important');
        }
      }

      function collapse() {
        card.style.removeProperty('transform');
        card.style.removeProperty('z-index');
        card.style.removeProperty('overflow');
        card.style.removeProperty('position');
        card.style.removeProperty('box-shadow');
        if (insight) {
          insight.style.removeProperty('height');
          insight.style.removeProperty('display');
          insight.style.removeProperty('overflow');
          insight.style.removeProperty('-webkit-line-clamp');
        }
      }

      card.addEventListener('mouseenter', function() {
        if (t) { clearTimeout(t); t = null; }
        expand();
      });
      card.addEventListener('mouseleave', function(e) {
        if (card.contains(e.relatedTarget)) return;
        t = setTimeout(collapse, 80);
      });
    });
  })();

  // ── PILLS genéricas ────────────────────────────────────────
  // Pills de Cotação (#mc-pills-cot) e IPCA (#mc-pills-ipca) têm handlers
  // próprios mais abaixo — este loop genérico só age em outras pills futuras
  main.querySelectorAll('.mc-pills').forEach(function(g) {
    if (g.id === 'mc-pills-cot' || g.id === 'mc-pills-ipca') return;
    g.querySelectorAll('.mc-pill').forEach(function(p) {
      p.addEventListener('click', function() {
        g.querySelectorAll('.mc-pill').forEach(function(x){ x.classList.remove('active'); });
        p.classList.add('active');
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // TOOLTIP GLOBAL do "?" (único sistema ativo agora)
  // Lê o conteúdo do .mc-ht (mesmo escondido) e projeta
  // num elemento flutuante em document.body
  // ══════════════════════════════════════════════════════════
  var globalTip = document.getElementById('mc-global-tip');
  if (!globalTip) {
    globalTip = document.createElement('div');
    globalTip.id = 'mc-global-tip';
    globalTip.style.cssText = 'position:fixed;z-index:99999;background:#0C1425;color:#fff;border-radius:10px;padding:11px 13px;width:210px;box-shadow:0 16px 48px rgba(0,0,0,0.35);font-family:Outfit,sans-serif;font-size:10px;line-height:1.55;pointer-events:none;opacity:0;transition:opacity .15s;display:block';
    document.body.appendChild(globalTip);
  }
  main.querySelectorAll('.mc-hb').forEach(function(hbEl) {
    var ht = hbEl.querySelector('.mc-ht');
    if (!ht) return;
    // innerHTML é capturado ANTES do display:none (que foi aplicado depois via style inline,
    // mas innerHTML independe de display — sempre retorna o conteúdo)
    var content = ht.innerHTML;
    hbEl.addEventListener('mouseenter', function(e) {
      // impede o tooltip de disparar quando o mouse está no card expandido
      e.stopPropagation();
      globalTip.innerHTML = content;
      // força o tooltip a ser visível no body, sobrescrevendo qualquer display:none herdado
      globalTip.style.display = 'block';
      var r = hbEl.getBoundingClientRect();
      globalTip.style.left = Math.max(8, Math.min(r.left + r.width/2 - 105, window.innerWidth - 218)) + 'px';
      globalTip.style.top = r.top + 'px';
      globalTip.style.transform = 'translateY(-100%)';
      globalTip.style.opacity = '1';
    });
    hbEl.addEventListener('mouseleave', function(){ globalTip.style.opacity = '0'; });
  });

  // ══════════════════════════════════════════════════════════
  // COTAÇÕES — Pills interativas (Dia/Semana/Mês)
  // Cada pill recarrega: gráfico + tabela Var/Var.% + big number + badges
  // Usa Chart.getChart(cvs) pra recuperar instância e destruir antes de recriar
  // ══════════════════════════════════════════════════════════
  function rebuildCot(id, gran) {
    var ds = COT[id][gran];
    var cvs = main.querySelector('#mc-cvs-'+id);
    var tbl = main.querySelector('#mc-tbl-'+id);
    var cg  = main.querySelector('#mc-cg-'+id);
    if (!cvs || !tbl || !cg || !ds) return;

    // Destrói qualquer chart anterior associado ao canvas
    var existing = Chart.getChart(cvs);
    if (existing) existing.destroy();

    var fmtFn = (id === 'boi') ? f0 : f2;
    var mn = Math.min.apply(null, ds.vals);
    var mx = Math.max.apply(null, ds.vals);
    var pad = (mx - mn) * 0.20 || 0.1;

    var chart = new Chart(cvs, {
      type: 'line',
      data: { labels: ds.labels, datasets: [{
        data: ds.vals,
        borderColor: COT[id].lc, borderWidth: 2.5, tension: 0.35, fill: true,
        backgroundColor: function(ctx) {
          var g = ctx.chart.ctx.createLinearGradient(0,0,0,100);
          g.addColorStop(0, COT[id].fc.replace('0.10','0.18'));
          g.addColorStop(1, 'rgba(255,255,255,0)');
          return g;
        },
        pointRadius: gran==='dia' ? 2.5 : 4,
        pointBackgroundColor: '#fff', pointBorderColor: COT[id].lc,
        pointBorderWidth: 2, pointHoverRadius: 5, clip: false
      }]},
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:function(ctx){return ' '+fmtFn(ctx.parsed.y);}}}},
        scales:{x:{display:false,offset:false}, y:{display:false, min:mn-pad, max:mx+pad}},
        layout:{padding:{top:32,left:0,right:0,bottom:0}}
      },
      plugins: [{id:'dl', afterDraw: function(ch) {
        if (gran === 'dia') return; // no dia os data labels ficariam apertados
        var ctx2 = ch.ctx;
        ch.data.datasets[0].data.forEach(function(v,i) {
          var px = ch.scales.x.getPixelForValue(i);
          var py = ch.scales.y.getPixelForValue(v);
          ctx2.save();
          ctx2.font = '700 9px Outfit,sans-serif'; ctx2.fillStyle = '#1F2937';
          ctx2.textAlign = 'center'; ctx2.textBaseline = 'bottom';
          ctx2.fillText(fmtFn(v), px, py-5);
          ctx2.restore();
        });
      }}]
    });

    // Reconstrói thead
    var existingThead = tbl.querySelector('thead');
    if (existingThead) existingThead.remove();
    var thead = document.createElement('thead'), tr = document.createElement('tr');
    var th0 = document.createElement('th');
    th0.style.cssText = 'padding:4px 0 3px;border:none;background:transparent;font-size:0';
    tr.appendChild(th0);
    ds.labels.forEach(function(m) {
      var th = document.createElement('th'); th.textContent = m;
      th.style.cssText = 'text-align:center;padding:4px 0 3px;font-size:8.5px;font-weight:600;color:var(--t3);white-space:nowrap;border:none;background:transparent';
      tr.appendChild(th);
    });
    thead.appendChild(tr); tbl.insertBefore(thead, tbl.firstChild);

    // Reconstrói tbody (linhas Var e Var.%)
    var tbody = tbl.querySelector('tbody');
    tbody.innerHTML = '';
    var varRow = '<tr><td class="mc-tlbl">Var.</td>';
    var pctRow = '<tr><td class="mc-tlbl">Var.%</td>';
    ds.vals.forEach(function(v,i) {
      if (i === 0) { varRow += '<td class="mc-tna">—</td>'; pctRow += '<td class="mc-tna">—</td>'; return; }
      var d = v - ds.vals[i-1];
      var p = (d / ds.vals[i-1]) * 100;
      var cls = d>0 ? 'mc-tup' : (d<0 ? 'mc-tdn' : 'mc-tna');
      var ar = d>0 ? '▲' : (d<0 ? '▼' : '—');
      varRow += '<td class="'+cls+'">'+ar+' '+fmtFn(Math.abs(d))+'</td>';
      pctRow += '<td class="'+cls+'">'+ar+' '+Math.abs(p).toFixed(1)+'%</td>';
    });
    varRow += '</tr>'; pctRow += '</tr>';
    tbody.innerHTML = varRow + pctRow;

    // Reajusta colgroup para alinhar gráfico com header/linhas
    setTimeout(function() {
      var W = cvs.parentElement.offsetWidth; if (!W) return;
      var N = ds.labels.length, colW = 36, dW = (W - colW) / N;
      chart.options.layout.padding.left = Math.round(colW + dW/2);
      chart.options.layout.padding.right = Math.round(dW/2);
      chart.update('none');
      var xPts = chart.data.datasets[0].data.map(function(v,i){ return Math.round(chart.scales.x.getPixelForValue(i)); });
      var step = Math.round((xPts[N-1]-xPts[0])/(N-1));
      var lblW = Math.round(xPts[0] - step/2);
      while (cg.firstChild) cg.removeChild(cg.firstChild);
      var c0 = document.createElement('col'); c0.style.width = lblW+'px'; cg.appendChild(c0);
      for (var i=0; i<N; i++) { var c = document.createElement('col'); c.style.width = step+'px'; cg.appendChild(c); }
    }, 50);
  }

  // Atualiza big number + badges do card de cotação conforme granularidade
  function updateCotHeader(id, gran) {
    var ds = COT[id][gran];
    var cvs = main.querySelector('#mc-cvs-'+id);
    var card = cvs ? cvs.closest('.mc-cot-card') : null;
    if (!card) return;

    var bn = card.querySelector('.mc-cot-bn');
    var badges = card.querySelector('.mc-cot-badges');
    if (!bn || !badges) return;

    var vals = ds.vals;
    var last = vals[vals.length - 1];
    var prev = vals[vals.length - 2];
    var first = vals[0];
    var unit = COT[id].unit;
    var fmtFn = (id === 'boi')
      ? function(v){ return parseFloat(v).toFixed(0); }
      : function(v){ return parseFloat(v).toFixed(2).replace('.', ','); };

    bn.innerHTML = fmtFn(last) + (unit ? '<span class="mc-unit">'+unit+'</span>' : '');

    function pct(a, b){ return ((a - b) / b) * 100; }
    var p1 = pct(last, prev);
    var p2 = pct(last, first);
    var lbl1 = { dia:'dia', semana:'semana', mes:'mês' }[gran];
    var lbl2 = { dia:'semana', semana:'mês', mes:'trim.' }[gran];

    function badgeHTML(p, lbl) {
      var cls, ar;
      if (p > 0.05)       { cls = 'up'; ar = '▲'; }
      else if (p < -0.05) { cls = 'dn'; ar = '▼'; }
      else                { cls = 'nt'; ar = '↔'; }
      var sign = Math.abs(p) < 0.05 ? '' : (p > 0 ? '+' : '-');
      return '<span class="mc-badge '+cls+'">'+ar+' '+sign+Math.abs(p).toFixed(1).replace('.',',')+'% '+lbl+'</span>';
    }
    badges.innerHTML = badgeHTML(p1, lbl1) + badgeHTML(p2, lbl2);
  }

  // Hook nas pills de Cotações
  (function() {
    var pills = main.querySelector('#mc-pills-cot');
    if (!pills) return;
    pills.querySelectorAll('.mc-pill').forEach(function(p) {
      p.addEventListener('click', function() {
        pills.querySelectorAll('.mc-pill').forEach(function(x){ x.classList.remove('active'); });
        p.classList.add('active');
        var txt = p.textContent.trim().toLowerCase();
        var gran = txt === 'dia' ? 'dia' : (txt === 'semana' ? 'semana' : 'mes');
        ['boi','suino','frango'].forEach(function(id) {
          rebuildCot(id, gran);
          updateCotHeader(id, gran);
        });
      });
    });
  })();

  // Render inicial: granularidade "mes" (pill ativa default)
  rebuildCot('boi', 'mes');
  rebuildCot('suino', 'mes');
  rebuildCot('frango', 'mes');

  // ══════════════════════════════════════════════════════════
  // IPCA v3.4 — Bloco completo (janelas YoY + filtros + storytelling)
  //
  //  LAYOUT:
  //    1. Faixa superior: Dólar Comercial (contexto macro, separado)
  //    2. Pills unificadas: [Período: Mês/Bim/Tri/Sem/Ano] | [Exibir: Todos/Geral/Alim/Carnes]
  //    3. IBNs laterais: 3 séries (Geral/Alim/Carnes) com wash da cor da série
  //    4. Gráfico de barras: respeita filtro de série
  //    5. Insights: 3 colunas lado a lado (Geral/Alim/Carnes), 2 insights cada
  //
  //  INTERATIVIDADE:
  //    - Pills Período recarregam janela YoY completa
  //    - Pills Exibir filtram gráfico + IBNs + colunas de insight
  //    - Filtro "Todos" mostra estado completo
  //    - Classificação de insights via data-ins-serie (não keyword match)
  //
  //  ENGINE v3 de INSIGHTS:
  //    Cada série (Geral/Alim/Carnes) tem sua função própria e sempre produz
  //    1-2 insights. Tipos por série:
  //      Geral: meta BCB, YoY, tendência sequencial, estabilidade
  //      Alim:  razão vs geral, tendência, YoY, estabilidade ciclo
  //      Carnes: YoY direto, consistência de ciclo, carnes vs alim
  // ══════════════════════════════════════════════════════════

  var IPCA_LABELS_META = {
    mes:       { period:'mensal',    label:'Mês'       },
    bimestre:  { period:'bimestral', label:'Bimestre'  },
    trimestre: { period:'trimestral',label:'Trimestre' },
    semestre:  { period:'semestral', label:'Semestre'  },
    ano:       { period:'anual',     label:'Ano'       }
  };

  var IPCA_SERIE_COLORS = {
    geral:  { main:'#6B7280', wash:'rgba(107,114,128,0.12)', border:'rgba(107,114,128,0.35)', text:'#4B5563' },
    alim:   { main:'#C97B2C', wash:'rgba(201,123,44,0.10)',  border:'rgba(201,123,44,0.30)',  text:'#9A5A18' },
    carnes: { main:'#C0504D', wash:'rgba(192,80,77,0.10)',   border:'rgba(192,80,77,0.30)',   text:'#8E3634' }
  };
  var IPCA_DOLAR_COLOR = { main:'#3670A0', wash:'rgba(54,112,160,0.08)', border:'rgba(54,112,160,0.25)' };

  var IPCA_STATE = { periodo: 'mes', serie: 'todos' };

  // ── Helpers de série completa ──
  function _ipcaAcumRange(arr, start, end) {
    var m = 1;
    for (var i = start; i <= end && i < arr.length; i++) m *= (1 + arr[i]/100);
    return (m - 1) * 100;
  }
  function _ipcaParseLbl(l) {
    var p = l.split('/');
    return { ano: 2000 + parseInt(p[1]), mes: _ipcaMeses.indexOf(p[0]) };
  }

  // ── Builders por janela (Mês/Bim/Tri/Sem/Ano) ──
  function _ipcaBuildMes() {
    var N = IPCA_FULL.labels.length, start = N - 13;
    return {
      labels: IPCA_FULL.labels.slice(start),
      geral:  IPCA_FULL.geral.slice(start),
      alim:   IPCA_FULL.alim.slice(start),
      carnes: IPCA_FULL.carnes.slice(start),
      highlight: [0, 12]
    };
  }
  function _ipcaBuildBimestre() {
    var r = { labels:[], geral:[], alim:[], carnes:[] };
    var N = IPCA_FULL.labels.length;
    for (var s = N - 14; s <= N - 2; s += 2) {
      var e = Math.min(s+1, N-1);
      var lbl = IPCA_FULL.labels[s].split('/')[0].slice(0,3)+'-'+IPCA_FULL.labels[e].split('/')[0].slice(0,3)+'/'+IPCA_FULL.labels[e].split('/')[1];
      r.labels.push(lbl);
      r.geral.push(_ipcaAcumRange(IPCA_FULL.geral, s, e));
      r.alim.push(_ipcaAcumRange(IPCA_FULL.alim, s, e));
      r.carnes.push(_ipcaAcumRange(IPCA_FULL.carnes, s, e));
    }
    r.highlight = [0, r.labels.length - 1];
    return r;
  }
  function _ipcaBuildTrimestre() {
    // Ancora: mesmo Q do atual, 2 anos atrás
    var r = { labels:[], geral:[], alim:[], carnes:[] };
    var N = IPCA_FULL.labels.length;
    var L = _ipcaParseLbl(IPCA_FULL.labels[N-1]);
    var qA = Math.floor(L.mes / 3), aA = L.ano;
    var pts = [], a = aA - 2, q = qA;
    while (a < aA || (a === aA && q <= qA)) {
      pts.push({ ano:a, q:q, mesStart:q*3, mesEnd:q*3+2 });
      q++; if (q > 3) { q = 0; a++; }
    }
    pts.forEach(function(p) {
      var s = -1, e = -1;
      for (var i = 0; i < N; i++) {
        var lb = _ipcaParseLbl(IPCA_FULL.labels[i]);
        if (lb.ano === p.ano && lb.mes >= p.mesStart && lb.mes <= p.mesEnd) {
          if (s === -1) s = i; e = i;
        }
      }
      if (s === -1) return;
      var parc = (e - s + 1) >= 3 ? '' : '*';
      r.labels.push((p.q+1)+'T/'+String(p.ano).slice(-2)+parc);
      r.geral.push(_ipcaAcumRange(IPCA_FULL.geral, s, e));
      r.alim.push(_ipcaAcumRange(IPCA_FULL.alim, s, e));
      r.carnes.push(_ipcaAcumRange(IPCA_FULL.carnes, s, e));
    });
    var n = r.labels.length;
    r.highlight = [Math.max(0, n-5), n-1];
    return r;
  }
  function _ipcaBuildSemestre() {
    // Ancora: mesmo S do atual, 3 anos atrás
    var r = { labels:[], geral:[], alim:[], carnes:[] };
    var N = IPCA_FULL.labels.length;
    var L = _ipcaParseLbl(IPCA_FULL.labels[N-1]);
    var sA = Math.floor(L.mes / 6), aA = L.ano;
    var pts = [], a = aA - 3, s = sA;
    while (a < aA || (a === aA && s <= sA)) {
      pts.push({ ano:a, s:s, mesStart:s*6, mesEnd:s*6+5 });
      s++; if (s > 1) { s = 0; a++; }
    }
    pts.forEach(function(p) {
      var so = -1, eo = -1;
      for (var i = 0; i < N; i++) {
        var lb = _ipcaParseLbl(IPCA_FULL.labels[i]);
        if (lb.ano === p.ano && lb.mes >= p.mesStart && lb.mes <= p.mesEnd) {
          if (so === -1) so = i; eo = i;
        }
      }
      if (so === -1) return;
      var parc = (eo - so + 1) >= 6 ? '' : '*';
      r.labels.push((p.s+1)+'S/'+String(p.ano).slice(-2)+parc);
      r.geral.push(_ipcaAcumRange(IPCA_FULL.geral, so, eo));
      r.alim.push(_ipcaAcumRange(IPCA_FULL.alim, so, eo));
      r.carnes.push(_ipcaAcumRange(IPCA_FULL.carnes, so, eo));
    });
    var n = r.labels.length;
    r.highlight = [Math.max(0, n-3), n-1];
    return r;
  }
  function _ipcaBuildAno() {
    var r = { labels:[], geral:[], alim:[], carnes:[] };
    var N = IPCA_FULL.labels.length, pA = {};
    IPCA_FULL.labels.forEach(function(l,i) {
      var ano = 2000 + parseInt(l.split('/')[1]);
      if (!pA[ano]) pA[ano] = [];
      pA[ano].push(i);
    });
    Object.keys(pA).sort().forEach(function(ano) {
      var idx = pA[ano], s = idx[0], e = idx[idx.length-1];
      var parc = idx.length < 12 ? '*' : '';
      r.labels.push(ano + parc);
      r.geral.push(_ipcaAcumRange(IPCA_FULL.geral, s, e));
      r.alim.push(_ipcaAcumRange(IPCA_FULL.alim, s, e));
      r.carnes.push(_ipcaAcumRange(IPCA_FULL.carnes, s, e));
    });
    var n = r.labels.length;
    r.highlight = [n-2, n-1];
    return r;
  }
  var IPCA_BUILDERS = {
    mes: _ipcaBuildMes, bimestre: _ipcaBuildBimestre,
    trimestre: _ipcaBuildTrimestre, semestre: _ipcaBuildSemestre, ano: _ipcaBuildAno
  };

  // ── ENGINE v3 DE INSIGHTS ──
  // Cada série tem função própria, sempre produz 1-2 insights, com tipos
  // variados conforme o que os dados da janela revelam.

  var META_BCB_ANUAL = 3.5; // 2026
  var META_POR_JANELA = {
    mes: META_BCB_ANUAL/12, bimestre: META_BCB_ANUAL/6,
    trimestre: META_BCB_ANUAL/4, semestre: META_BCB_ANUAL/2, ano: META_BCB_ANUAL
  };

  function _ipcaPct(v){ return (v>=0?'+':'')+v.toFixed(2).replace('.',',')+'%'; }
  function _ipcaPp(v){ return (v>=0?'+':'')+v.toFixed(2).replace('.',',')+' p.p.'; }
  function _ipcaTend(arr) {
    var n = arr.length;
    if (n < 3) return 'e';
    var deltas = [arr[n-1]-arr[n-2], arr[n-2]-arr[n-3]];
    if (deltas[0] > 0.03 && deltas[1] > 0.03) return 'alta';
    if (deltas[0] < -0.03 && deltas[1] < -0.03) return 'queda';
    return 'e';
  }
  function _ipcaLblLower(key){ return IPCA_LABELS_META[key].label.toLowerCase(); }

  function _ipcaInsightsGeral(ds, key) {
    var h1 = ds.highlight[0], h2 = ds.highlight[1];
    var atual = ds.geral[h2], ant = ds.geral[h1];
    var lblA = ds.labels[h2], lblB = ds.labels[h1];
    var meta = META_POR_JANELA[key];
    var periodoLbl = IPCA_LABELS_META[key].period;
    var out = [];

    // Tipo A: Meta BCB
    var diffMeta = atual - meta;
    if (Math.abs(diffMeta) > 1.5) {
      out.push({
        serie:'geral', cls: diffMeta > 0 ? 'r' : 'g',
        ttl: (diffMeta > 0 ? '⚠ Acima' : '✓ Abaixo') + ' da meta BCB · ' + lblA,
        body: 'IPCA Geral em <strong>'+_ipcaPct(atual)+'</strong>. Meta BCB '+periodoLbl+' equivalente: <strong>'+_ipcaPct(meta)+'</strong> ('+_ipcaPp(diffMeta)+'). ' +
              (diffMeta > 0 ? 'Sinal de pressão inflacionária — BCB pode responder com Selic.' : 'Cenário favorável ao consumidor nesta janela.')
      });
    } else {
      out.push({
        serie:'geral', cls:'b',
        ttl:'◉ Dentro da meta BCB · ' + lblA,
        body:'IPCA Geral em <strong>'+_ipcaPct(atual)+'</strong> — dentro da banda da meta equivalente ('+_ipcaPct(meta)+'). Cenário macro controlado nesta janela.'
      });
    }

    // Tipo B: Tendência sequencial / YoY / estabilidade
    var deltaYoY = atual - ant;
    var t = _ipcaTend(ds.geral);
    if (t === 'alta') {
      out.push({
        serie:'geral', cls:'w',
        ttl:'⚠ Aceleração sequencial',
        body: 'Últimos 3 '+_ipcaLblLower(key)+'s do IPCA Geral em alta contínua. YoY: <strong>'+_ipcaPct(atual)+'</strong> vs <strong>'+_ipcaPct(ant)+'</strong> ('+_ipcaPp(deltaYoY)+'). <strong>Vigilância redobrada</strong> — pode indicar ciclo inflacionário persistente.'
      });
    } else if (t === 'queda') {
      out.push({
        serie:'geral', cls:'g',
        ttl:'✓ Desaceleração sequencial',
        body: 'Últimos 3 '+_ipcaLblLower(key)+'s do IPCA Geral em queda. Ciclo anterior: <strong>'+_ipcaPct(ant)+'</strong> ('+_ipcaPp(deltaYoY)+' vs atual). Consumidor recuperando poder de compra.'
      });
    } else if (Math.abs(deltaYoY) > 0.1) {
      out.push({
        serie:'geral', cls: deltaYoY > 0 ? 'w' : 'g',
        ttl:'◉ YoY ' + periodoLbl + ' · ' + lblA + ' vs ' + lblB,
        body: 'IPCA Geral em <strong>'+_ipcaPct(atual)+'</strong> contra <strong>'+_ipcaPct(ant)+'</strong> em '+lblB+' ('+_ipcaPp(deltaYoY)+'). ' +
              (deltaYoY > 0 ? 'Ciclo em aceleração ano a ano.' : 'Alívio visível no ciclo YoY.')
      });
    } else {
      out.push({
        serie:'geral', cls:'b',
        ttl:'◉ Estabilidade no ciclo',
        body: 'IPCA Geral variou apenas '+_ipcaPp(deltaYoY)+' em '+periodoLbl+' vs '+lblB+'. Cenário de previsibilidade — favorável para planejamento.'
      });
    }

    return out;
  }

  function _ipcaInsightsAlim(ds, key) {
    var h1 = ds.highlight[0], h2 = ds.highlight[1];
    var atual = ds.alim[h2], ant = ds.alim[h1];
    var geralA = ds.geral[h2], geralB = ds.geral[h1];
    var lblA = ds.labels[h2], lblB = ds.labels[h1];
    var periodoLbl = IPCA_LABELS_META[key].period;
    var out = [];

    // Tipo A: Razão Alim vs Geral
    var razaoA = geralA > 0 ? atual/geralA : 0;
    var razaoB = geralB > 0 ? ant/geralB : 0;
    var deltaRazao = razaoA - razaoB;
    if (razaoA > 1.5) {
      out.push({
        serie:'alim', cls:'r',
        ttl:'⚠ Descolamento forte do IPCA geral · ' + lblA,
        body: 'Alimentação sobe <strong>'+razaoA.toFixed(1)+'×</strong> o IPCA geral. ' +
              (deltaRazao > 0.1 ? 'Descolamento <strong>ampliou</strong> vs '+lblB+' (era '+razaoB.toFixed(1)+'×) — consumidor migra para cortes mais baratos.' : 'Cenário típico — monitorar efeito no mix.')
      });
    } else if (razaoA > 1.2) {
      out.push({
        serie:'alim', cls:'w',
        ttl:'◉ Alimentação descolada do geral',
        body: 'Alimentação em <strong>'+razaoA.toFixed(1)+'×</strong> o IPCA geral — pressão presente mas dentro do padrão do varejo alimentar.'
      });
    } else {
      out.push({
        serie:'alim', cls:'g',
        ttl:'✓ Alimentação alinhada ao geral',
        body: 'Alimentação em <strong>'+_ipcaPct(atual)+'</strong> próximo ao geral (<strong>'+_ipcaPct(geralA)+'</strong>). Consumidor sem pressão adicional em itens essenciais.'
      });
    }

    // Tipo B: Tendência / YoY / estabilidade
    var t = _ipcaTend(ds.alim);
    var deltaYoY = atual - ant;
    if (t === 'alta') {
      out.push({
        serie:'alim', cls:'w',
        ttl:'⚠ Tendência de alta sequencial',
        body: 'Últimos 3 '+_ipcaLblLower(key)+'s em alta contínua. YoY: <strong>'+_ipcaPct(atual)+'</strong> vs <strong>'+_ipcaPct(ant)+'</strong> ('+_ipcaPp(deltaYoY)+'). Revisar mix e canais de negociação com fornecedores.'
      });
    } else if (t === 'queda') {
      out.push({
        serie:'alim', cls:'g',
        ttl:'✓ Desaceleração sequencial',
        body: 'Últimos 3 '+_ipcaLblLower(key)+'s em queda. <strong>Janela favorável</strong> para negociação de volume e revisão de estoque.'
      });
    } else if (Math.abs(deltaYoY) > 0.2) {
      out.push({
        serie:'alim', cls: deltaYoY > 0 ? 'w' : 'g',
        ttl:'◉ YoY ' + periodoLbl + ' · ' + lblA + ' vs ' + lblB,
        body: 'Alimentação acumula <strong>'+_ipcaPct(atual)+'</strong> em '+lblA+' vs <strong>'+_ipcaPct(ant)+'</strong> em '+lblB+' ('+_ipcaPp(deltaYoY)+'). ' +
              (deltaYoY > 0 ? 'Pressão ampliou no ciclo anual.' : 'Alívio no ciclo anual.')
      });
    } else {
      out.push({
        serie:'alim', cls:'b',
        ttl:'◉ Ciclo estável em alimentação',
        body: 'Variação YoY de '+_ipcaPp(deltaYoY)+' — sem alterações relevantes no ciclo anual. Bom para planejamento e previsibilidade.'
      });
    }

    return out;
  }

  function _ipcaInsightsCarnes(ds, key) {
    var h1 = ds.highlight[0], h2 = ds.highlight[1];
    var atual = ds.carnes[h2], ant = ds.carnes[h1];
    var alimA = ds.alim[h2];
    var lblA = ds.labels[h2], lblB = ds.labels[h1];
    var periodoLbl = IPCA_LABELS_META[key].period;
    var n = ds.labels.length;
    var out = [];

    // Tipo A: YoY direto
    var deltaYoY = atual - ant;
    if (Math.abs(deltaYoY) > 0.15) {
      out.push({
        serie:'carnes', cls: deltaYoY > 0 ? 'r' : 'g',
        ttl: (deltaYoY > 0 ? '⚠ Aceleração YoY' : '✓ Desaceleração YoY') + ' · ' + lblA + ' vs ' + lblB,
        body: 'Carnes em <strong>'+_ipcaPct(atual)+'</strong> este '+periodoLbl+' vs <strong>'+_ipcaPct(ant)+'</strong> no mesmo período de '+lblB+' ('+_ipcaPp(deltaYoY)+'). ' +
              (deltaYoY > 0 ? 'Repasse intensificou — <strong>revisar preço do traseiro bovino</strong>.' : 'Alívio YoY — janela de <strong>reposição de estoque</strong>.')
      });
    } else {
      out.push({
        serie:'carnes', cls:'b',
        ttl:'◉ Estável YoY · ' + lblA + ' vs ' + lblB,
        body: 'Carnes em <strong>'+_ipcaPct(atual)+'</strong> vs <strong>'+_ipcaPct(ant)+'</strong> — variação de apenas '+_ipcaPp(deltaYoY)+'. Preços sem mudança relevante no ciclo anual.'
      });
    }

    // Tipo B: Consistência de ciclo ou vs Alim
    if (n >= 4) {
      var subiram = 0;
      for (var i = 1; i < n; i++) if (ds.carnes[i] > ds.carnes[i-1]) subiram++;
      var pctSubida = subiram / (n-1);
      if (pctSubida >= 0.7) {
        out.push({
          serie:'carnes', cls:'r',
          ttl:'⚠ Ciclo consistente de alta',
          body: '<strong>'+subiram+' de '+(n-1)+'</strong> '+_ipcaLblLower(key)+'s fecharam acima do anterior. Pressão sustentada, não pontual. <strong>Revisar preços preventivamente.</strong>'
        });
      } else if (pctSubida <= 0.3) {
        out.push({
          serie:'carnes', cls:'g',
          ttl:'✓ Ciclo de estabilidade/queda',
          body: 'Apenas <strong>'+subiram+' de '+(n-1)+'</strong> '+_ipcaLblLower(key)+'s subiram. <strong>Ciclo favorável</strong> para reposição e negociação com fornecedores.'
        });
      } else {
        var difCA = atual - alimA;
        out.push({
          serie:'carnes', cls: difCA > 0.3 ? 'w' : 'b',
          ttl:'◉ Carnes vs Alimentação',
          body: 'Carnes em <strong>'+_ipcaPct(atual)+'</strong> contra <strong>'+_ipcaPct(alimA)+'</strong> da alimentação total ('+_ipcaPp(difCA)+'). ' +
                (difCA > 0.3 ? 'Carnes puxando a alta da categoria — consumidor pode migrar para suínos/aves.' : 'Carnes alinhadas com a categoria — sem pressão adicional.')
        });
      }
    } else {
      var difCA2 = atual - alimA;
      out.push({
        serie:'carnes', cls: difCA2 > 0.3 ? 'w' : 'b',
        ttl:'◉ Carnes vs Alimentação',
        body: 'Carnes em <strong>'+_ipcaPct(atual)+'</strong> vs <strong>'+_ipcaPct(alimA)+'</strong> da alimentação ('+_ipcaPp(difCA2)+'). ' +
              (difCA2 > 0.3 ? 'Carnes acima da média da categoria.' : 'Carnes alinhadas à média da categoria.')
      });
    }

    return out;
  }

  function _ipcaGenerateAllInsights(ds, key) {
    return [].concat(
      _ipcaInsightsGeral(ds, key),
      _ipcaInsightsAlim(ds, key),
      _ipcaInsightsCarnes(ds, key)
    );
  }

  // ── Renderizadores ──
  function _ipcaRenderBars(ds, key) {
    var el = main.querySelector('#mc-ipca-bars'); if (!el) return;
    var ttl = main.querySelector('.mc-ipca-chart-ttl');
    if (ttl) ttl.textContent = 'Evolução por ' + IPCA_LABELS_META[key].period + ' — últimos ' + ds.labels.length + ' pontos';

    var all = ds.geral.concat(ds.alim).concat(ds.carnes);
    var MX = Math.max.apply(null, all.map(Math.abs));
    var H = 70;
    el.innerHTML = '';
    ds.labels.forEach(function(lbl, i) {
      var vals = [ds.geral[i], ds.alim[i], ds.carnes[i]];
      var grp = document.createElement('div'); grp.className = 'mc-ig';
      var barsRow = document.createElement('div'); barsRow.className = 'mc-ig-bars';
      vals.forEach(function(v) {
        var col = document.createElement('div'); col.className = 'mc-ig-col';
        var l = document.createElement('div'); l.className = 'mc-ig-lbl';
        l.textContent = (v>=0?'+':'')+v.toFixed(2);
        var b = document.createElement('div'); b.className = 'mc-ig-b';
        b.style.height = Math.max(4, Math.round(Math.abs(v)/MX*H)) + 'px';
        col.appendChild(l); col.appendChild(b);
        barsRow.appendChild(col);
      });
      if (ds.highlight.indexOf(i) >= 0) {
        grp.style.background = 'rgba(201,168,76,0.08)';
        grp.style.borderRadius = '6px';
        grp.style.padding = '2px 0';
      }
      var base = document.createElement('div'); base.className = 'mc-ig-base';
      var x = document.createElement('div'); x.className = 'mc-ig-x'; x.textContent = lbl;
      if (ds.highlight.indexOf(i) >= 0) {
        x.style.fontWeight = '700'; x.style.color = '#C9A84C';
      }
      grp.appendChild(barsRow); grp.appendChild(base); grp.appendChild(x);
      el.appendChild(grp);
    });
  }

  function _ipcaUpdateIBNs(ds, key) {
    var ibns = main.querySelectorAll('.mc-ibn');
    if (!ibns || ibns.length < 3) return;
    var yoyG = ds.geral[ds.highlight[1]], yoyA = ds.alim[ds.highlight[1]], yoyC = ds.carnes[ds.highlight[1]];
    var prevG = ds.geral[ds.highlight[0]];
    var lblPer = IPCA_LABELS_META[key].period;
    var lblAtual = ds.labels[ds.highlight[1]], lblAnt = ds.labels[ds.highlight[0]];

    function set(i, lbl, val, sub, serie) {
      var ibn = ibns[i];
      if (!ibn) return;
      var c = IPCA_SERIE_COLORS[serie];
      // wash da cor da série (override CSS original)
      ibn.style.setProperty('background', c.wash, 'important');
      ibn.style.setProperty('border', '1px solid '+c.border, 'important');
      ibn.style.setProperty('border-radius', '12px', 'important');
      ibn.dataset.serie = serie;
      ibn.querySelector('.mc-ibn-lbl').textContent = lbl;
      ibn.querySelector('.mc-ibn-val').innerHTML = '<strong>'+val+'</strong>';
      ibn.querySelector('.mc-ibn-val').style.setProperty('color', c.main, 'important');
      ibn.querySelector('.mc-ibn-sub').textContent = sub;
      // Farol mantém comportamento do CSS original mas texto agora é o estado
      // derivado do wash (semântica: verde se dentro da meta, vermelho se fora)
    }

    function pct(v){ return (v>=0?'+':'')+v.toFixed(2).replace('.',',')+'%'; }
    set(0, 'IPCA Geral',       pct(yoyG), 'Atual: '+lblAtual+' · Antes: '+lblAnt+' ('+pct(prevG)+')', 'geral');
    set(1, 'IPCA Alimentação', pct(yoyA), 'Atual '+lblPer+' · '+(yoyA>yoyG?'Acima':'Próximo')+' do geral', 'alim');
    set(2, 'IPCA Carnes',      pct(yoyC), 'Atual '+lblPer+' · '+(yoyC/Math.max(0.01,yoyG)).toFixed(1)+'× IPCA geral', 'carnes');

    // Esconde o 4º IBN (Dólar — movido para faixa superior)
    if (ibns[3]) ibns[3].style.display = 'none';
  }

  function _ipcaRenderInsightColumns(ds, key) {
    var aw = main.querySelector('#mc-ipca-alerts');
    if (!aw) return;

    var insights = _ipcaGenerateAllInsights(ds, key);
    // Bucket explícito por data-ins-serie
    var buckets = { geral:[], alim:[], carnes:[] };
    insights.forEach(function(ins){ buckets[ins.serie].push(ins); });

    aw.style.setProperty('display', 'grid', 'important');
    aw.style.setProperty('grid-template-columns', '1fr 1fr 1fr', 'important');
    aw.style.setProperty('gap', '12px', 'important');
    aw.style.setProperty('margin-top', '16px', 'important');
    aw.innerHTML = '';

    var columns = [
      { key:'geral',  label:'IPCA Geral'       },
      { key:'alim',   label:'IPCA Alimentação' },
      { key:'carnes', label:'IPCA Carnes'      }
    ];
    columns.forEach(function(col){
      var c = IPCA_SERIE_COLORS[col.key];
      var column = document.createElement('div');
      column.dataset.insightCol = col.key;
      column.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-width:0;transition:opacity 0.25s, filter 0.25s';

      var h = document.createElement('div');
      h.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 10px;background:'+c.wash+';border:1px solid '+c.border+';border-radius:8px;font-family:Outfit,sans-serif';
      h.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:'+c.main+';flex-shrink:0"></span>'+
                    '<span style="font-size:10px;font-weight:700;color:'+c.text+';text-transform:uppercase;letter-spacing:1px">'+col.label+'</span>'+
                    '<span style="margin-left:auto;font-size:10px;color:'+c.text+';opacity:0.6">'+buckets[col.key].length+'</span>';
      column.appendChild(h);

      if (buckets[col.key].length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'padding:12px;font-size:10px;color:#9CA3AF;text-align:center;font-style:italic';
        empty.textContent = 'Sem direcionamentos nesta janela';
        column.appendChild(empty);
      } else {
        buckets[col.key].forEach(function(ins){
          var visCls = ins.cls === 'g' ? 'b' : ins.cls;
          var div = document.createElement('div');
          div.className = 'mc-ial mc-ial-' + visCls;
          div.dataset.insSerie = ins.serie;
          div.style.setProperty('background', c.wash, 'important');
          div.style.setProperty('border', '1px solid '+c.border, 'important');
          div.style.setProperty('border-left', '3px solid '+c.main, 'important');
          div.style.setProperty('margin', '0', 'important');
          var ttlStyle = ins.cls === 'g' ? 'style="color:'+c.main+'"' : 'style="color:'+c.main+'"';
          div.innerHTML = '<div class="mc-ial-ttl mc-' + visCls + '" ' + ttlStyle + '>' + ins.ttl + '</div><div class="mc-ial-body">' + ins.body + '</div>';
          column.appendChild(div);
        });
      }
      aw.appendChild(column);
    });
  }

  // ── Filtro de série (afeta gráfico, IBNs e colunas de insight) ──
  function _ipcaApplySerieFilter() {
    var serie = IPCA_STATE.serie;
    var idxMap = { geral:0, alim:1, carnes:2 };

    // Gráfico: esconde colunas das séries não selecionadas
    main.querySelectorAll('#mc-ipca-bars .mc-ig-bars').forEach(function(row){
      var cols = row.querySelectorAll('.mc-ig-col');
      cols.forEach(function(col){ col.style.setProperty('display','','important'); });
      if (serie === 'todos') return;
      cols.forEach(function(col, i){
        if (i !== idxMap[serie]) col.style.setProperty('display','none','important');
      });
    });

    // IBNs: esmaece os não selecionados
    var ibns = main.querySelectorAll('.mc-ibn');
    var keys = ['geral','alim','carnes'];
    ibns.forEach(function(ibn, i){
      if (i >= 3) return;
      var isActive = (serie === 'todos' || serie === keys[i]);
      ibn.style.setProperty('opacity', isActive ? '1' : '0.35', 'important');
      ibn.style.setProperty('filter', isActive ? 'none' : 'grayscale(0.5)', 'important');
    });

    // Colunas de insight: mesmo tratamento
    main.querySelectorAll('#mc-ipca-alerts > div[data-insight-col]').forEach(function(col){
      var colSerie = col.dataset.insightCol;
      var isActive = (serie === 'todos' || serie === colSerie);
      col.style.setProperty('opacity', isActive ? '1' : '0.35', 'important');
      col.style.setProperty('filter', isActive ? 'none' : 'grayscale(0.5)', 'important');
    });
  }

  // ── Render completo da janela ──
  function applyIpcaJanela(key) {
    IPCA_STATE.periodo = key;
    var ds = IPCA_BUILDERS[key]();
    _ipcaRenderBars(ds, key);
    _ipcaUpdateIBNs(ds, key);
    _ipcaRenderInsightColumns(ds, key);
    _ipcaApplySerieFilter();
  }

  // ── Faixa superior: Dólar como contexto macro ──
  (function renderDolarHeader(){
    var block = main.querySelector('.mc-ipca-block');
    if (!block) return;
    var hdr = document.createElement('div');
    hdr.id = 'mc-ipca-dolar-header';
    hdr.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;margin:0 0 14px 0;background:'+IPCA_DOLAR_COLOR.wash+';border:1px dashed '+IPCA_DOLAR_COLOR.border+';border-radius:10px;font-family:Outfit,sans-serif';
    hdr.innerHTML = ''+
      '<span style="font-size:10px;font-weight:700;color:'+IPCA_DOLAR_COLOR.main+';text-transform:uppercase;letter-spacing:1.2px">◎ Contexto macro</span>'+
      '<span style="width:1px;height:16px;background:'+IPCA_DOLAR_COLOR.border+'"></span>'+
      '<span style="font-size:11px;font-weight:600;color:#4B5563">Dólar Comercial</span>'+
      '<span style="font-size:15px;font-weight:700;color:'+IPCA_DOLAR_COLOR.main+';font-variant-numeric:tabular-nums">R$ 5,72</span>'+
      '<span style="font-size:10px;color:#6B7280">Banco Central · venda</span>'+
      '<span style="margin-left:auto;font-size:10px;color:#9CA3AF;font-style:italic">não integra o gráfico IPCA — referência</span>';
    block.insertBefore(hdr, block.firstChild);
  })();

  // ── Pills unificadas: Período + Exibir ──
  (function renderUnifiedPills(){
    var periodoPills = main.querySelector('#mc-pills-ipca');
    if (!periodoPills) return;

    var wrap = document.createElement('div');
    wrap.id = 'mc-pills-unified';
    wrap.className = 'mc-pills';
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
    periodoPills.parentNode.insertBefore(wrap, periodoPills);
    periodoPills.remove(); // pills antigas removidas

    // Label "Período:"
    var lblP = document.createElement('span');
    lblP.style.cssText = 'font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;margin-right:2px';
    lblP.textContent = 'Período:';
    wrap.appendChild(lblP);

    // Pills de período
    var periodoConfig = [
      { key:'mes',       label:'Mês'       },
      { key:'bimestre',  label:'Bimestre'  },
      { key:'trimestre', label:'Trimestre' },
      { key:'semestre',  label:'Semestre'  },
      { key:'ano',       label:'Ano'       }
    ];
    periodoConfig.forEach(function(cfg){
      var b = document.createElement('button');
      b.className = 'mc-pill' + (cfg.key === IPCA_STATE.periodo ? ' active' : '');
      b.textContent = cfg.label;
      b.dataset.periodo = cfg.key;
      b.addEventListener('click', function(){
        wrap.querySelectorAll('.mc-pill').forEach(function(x){
          if (x.dataset.periodo) x.classList.remove('active');
        });
        b.classList.add('active');
        applyIpcaJanela(cfg.key);
      });
      wrap.appendChild(b);
    });

    // Separador vertical
    var sep = document.createElement('span');
    sep.style.cssText = 'width:1px;height:20px;background:rgba(26,39,68,0.18);margin:0 4px';
    wrap.appendChild(sep);

    // Label "Exibir:"
    var lblE = document.createElement('span');
    lblE.style.cssText = 'font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;margin-right:2px';
    lblE.textContent = 'Exibir:';
    wrap.appendChild(lblE);

    // Pills de série (Todos / IPCA Geral / IPCA Alimentação / IPCA Carnes)
    var serieConfig = [
      { key:'todos',  label:'Todos',            color:null },
      { key:'geral',  label:'IPCA Geral',       color:IPCA_SERIE_COLORS.geral },
      { key:'alim',   label:'IPCA Alimentação', color:IPCA_SERIE_COLORS.alim },
      { key:'carnes', label:'IPCA Carnes',      color:IPCA_SERIE_COLORS.carnes }
    ];
    serieConfig.forEach(function(cfg){
      var b = document.createElement('button');
      b.className = 'mc-pill' + (cfg.key === IPCA_STATE.serie ? ' active' : '');
      b.textContent = cfg.label;
      b.dataset.serie = cfg.key;
      if (cfg.color) {
        b.style.borderColor = cfg.color.border;
        b.style.color = cfg.color.text;
        if (cfg.key === IPCA_STATE.serie) b.style.background = cfg.color.wash;
      }
      b.addEventListener('click', function(){
        IPCA_STATE.serie = cfg.key;
        wrap.querySelectorAll('.mc-pill').forEach(function(x){
          if (x.dataset.serie) {
            x.classList.remove('active');
            x.style.background = '';
          }
        });
        b.classList.add('active');
        if (cfg.color) b.style.background = cfg.color.wash;
        _ipcaApplySerieFilter();
      });
      wrap.appendChild(b);
    });
  })();

  // Render inicial
  applyIpcaJanela('mes');

  // ══════════════════════════════════════════════════════════
  // TOOLTIP EVENTOS CALENDÁRIO — Insights Prescritivos (v2.7)
  // Cada evento exibe: categoria, prioridade, contexto (por quê)
  // e ação recomendada. Base de conhecimento KB indexada por
  // substring do texto do evento.
  // ══════════════════════════════════════════════════════════
  var CAL_KB = {
    'Tira-dentes': {
      ctx: 'Feriado municipal em diversos estados. Dia útil para comércio, mas tráfego misto — parte das lojas fecha parcialmente.',
      acao: 'Confirmar escala reduzida. Antecipar entregas logísticas para véspera. Monitorar concorrentes que fecham.',
      prio: 'baixa'
    },
    'Paixão de Cristo': {
      ctx: 'Sexta-Feira Santa. Pico anual de bacalhau, pescados e ovos. Consumo de carne vermelha cai drasticamente (tabu religioso).',
      acao: 'Estoque pleno de bacalhau D-3. Mix especial de peixes frescos. Reduzir encomenda de bovino em 30-40%.',
      prio: 'alta'
    },
    'Páscoa': {
      ctx: 'Pós-Semana Santa. Retomada do consumo de carnes vermelhas + demanda forte de cordeiro e chester para almoço familiar.',
      acao: 'Oferta de cordeiro e tender. Rotisseria com peças especiais. Comunicação de "almoço de Páscoa" no balcão.',
      prio: 'alta'
    },
    'Tiradentes': {
      ctx: 'Feriado nacional. Tráfego maior que finais de semana comuns — muitas famílias almoçam em casa. Demanda churrasco sobe 40-60%.',
      acao: 'Equipe completa + hora extra no balcão. Reforçar picanha, alcatra, costela e linguiça. Abrir mais cedo se possível.',
      prio: 'alta'
    },
    'Pagto. 5': {
      ctx: 'Dia 5 — primeiro ciclo de pagamento do mês (salários privados). Fluxo de caixa do consumidor renova.',
      acao: 'Abastecimento pleno de bovino e suíno até 12h. Ativar mix de valor agregado (picanha, costela nobre).',
      prio: 'media'
    },
    'Pagto. 10': {
      ctx: 'Dia 10 — segundo ciclo de pagamento. Coincide com Paixão de Cristo em 2026 — demanda mista (pescados > carnes).',
      acao: 'Prioridade máxima em bacalhau e pescados. Bovino em modo estoque mínimo neste dia específico.',
      prio: 'alta'
    },
    'Pagto. 15': {
      ctx: 'Meio do mês — terceiro ciclo de pagamento (servidores públicos estaduais, aposentados). Perfil mais conservador.',
      acao: 'Mix balanceado: suíno, frango e cortes de segunda classe. Promoção de sobrecoxa e coxão mole.',
      prio: 'media'
    },
    'Pagto. FGTS': {
      ctx: 'Dia 20 — pagamento de FGTS + aniversariantes + calendário público. Maior pico mensal de fluxo de caixa no varejo.',
      acao: 'Estoque 100% + equipe reforçada. Ativar mix premium (picanha, alcatra). D-1 já com preços revisados.',
      prio: 'alta'
    },
    'Último útil': {
      ctx: 'Último dia útil — pagamento de salários privados do mês. Fluxo forte mesmo com cansaço do mês.',
      acao: 'Abastecimento reforçado. Preparar campanha do próximo mês. Ativar mix de preparo rápido (rotisseria).',
      prio: 'media'
    },
    'Dia Suíno': {
      ctx: 'Dia Nacional da Carne Suína (25/04). Suíno vivo em queda (-2,8%) + FGTS D-5 = janela tripla favorável.',
      acao: 'Campanha D-3 no balcão. Destaque para costelinha, lombo, pernil. Kit churrasco suíno em promoção.',
      prio: 'alta'
    },
    'Dia da Terra': {
      ctx: 'Dia Mundial da Terra (22/04). Oportunidade ESG: comunicar origem local, bem-estar animal, redução de desperdício.',
      acao: 'Destacar produtores locais e selos de origem. Campanha "do campo ao balcão". Engajamento em redes.',
      prio: 'baixa'
    },
    '36°C': {
      ctx: 'Calor extremo previsto. Risco crítico na cadeia do frio + demanda churrasco sobe 50-70% no fim de semana.',
      acao: 'Checagem de termômetros a cada 2h. Equipe reforçada. Estoque extra de picanha, costela e linguiça.',
      prio: 'alta'
    },
    '34°C': {
      ctx: 'Calor acima da média. Atenção redobrada na cadeia do frio e rotação de balcão.',
      acao: 'Checagem de temperatura a cada 3h. Reduzir exposição de cortes sensíveis. Priorizar venda do estoque antigo.',
      prio: 'media'
    },
    'Reunião Rede': {
      ctx: 'Evento interno agendado pela rede. Possível redução de carga operacional ou ausência de lideranças.',
      acao: 'Delegar fechamento a substitutos. Adiantar pedidos. Alinhar pautas operacionais com antecedência.',
      prio: 'baixa'
    }
  };

  function calFindKB(text) {
    for (var k in CAL_KB) { if (text.indexOf(k) >= 0) return CAL_KB[k]; }
    return null;
  }

  var CAL_PRIO = {
    alta:  { bg:'rgba(192,80,77,0.15)',  color:'#FFB8B6', label:'ALTA'  },
    media: { bg:'rgba(201,123,44,0.15)', color:'#F5C183', label:'MÉDIA' },
    baixa: { bg:'rgba(54,112,160,0.15)', color:'#A5C8E8', label:'BAIXA' }
  };
  var CAL_CAT_COLOR = { feriado:'#C0504D', pagto:'#2D8653', sazon:'#C9A84C', clima:'#3670A0', custom:'#7153A0' };
  var CAL_CAT_LABEL = { feriado:'Feriado', pagto:'Pagamento', sazon:'Sazonalidade', clima:'Clima', custom:'Evento Próprio' };

  var calEvTip = document.getElementById('mc-cal-ev-tip');
  if (!calEvTip) {
    calEvTip = document.createElement('div');
    calEvTip.id = 'mc-cal-ev-tip';
    document.body.appendChild(calEvTip);
  }
  calEvTip.style.cssText = 'position:fixed;z-index:99999;background:#0C1425;color:#fff;border-radius:12px;padding:14px 16px;width:280px;box-shadow:0 20px 60px rgba(0,0,0,0.4);font-family:Outfit,sans-serif;font-size:11px;line-height:1.55;pointer-events:none;opacity:0;transition:opacity .18s;display:block;border:1px solid rgba(201,168,76,0.3)';

  // Apenas eventos dentro das células do calendário (não os da legenda)
  main.querySelectorAll('.mc-cal-grid .mc-cev').forEach(function(ev) {
    var txt = ev.textContent.trim();
    var cat = Object.keys(CAL_CAT_COLOR).find(function(k){ return ev.classList.contains(k); }) || 'custom';
    var kb = calFindKB(txt);

    ev.addEventListener('mouseenter', function() {
      var prio = kb ? CAL_PRIO[kb.prio] : null;
      var html =
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1)">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:'+CAL_CAT_COLOR[cat]+';flex-shrink:0"></span>' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;font-weight:600">'+CAL_CAT_LABEL[cat]+'</span>' +
          (prio ? '<span style="margin-left:auto;font-size:9px;font-weight:700;letter-spacing:0.5px;padding:2px 7px;border-radius:20px;background:'+prio.bg+';color:'+prio.color+'">'+prio.label+'</span>' : '') +
        '</div>' +
        '<div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px">'+txt+'</div>';
      if (kb) {
        html +=
          '<div style="margin-bottom:8px">' +
            '<div style="font-size:9px;color:#C9A84C;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px">Por quê</div>' +
            '<div style="color:rgba(255,255,255,0.82)">'+kb.ctx+'</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:9px;color:#50D282;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px">Ação recomendada</div>' +
            '<div style="color:rgba(255,255,255,0.92);font-weight:500">'+kb.acao+'</div>' +
          '</div>';
      } else {
        html += '<div style="color:rgba(255,255,255,0.6);font-style:italic">Evento sem insight cadastrado.</div>';
      }
      calEvTip.innerHTML = html;
      var r = ev.getBoundingClientRect();
      calEvTip.style.left = Math.max(8, Math.min(r.left - 20, window.innerWidth - 298)) + 'px';
      calEvTip.style.top = (r.top - 10) + 'px';
      calEvTip.style.transform = 'translateY(-100%)';
      calEvTip.style.opacity = '1';
    });
    ev.addEventListener('mouseleave', function(){ calEvTip.style.opacity = '0'; });
  });
});
