// ============================================================
// NEXO Intelligence Web — pages/mercado.js
// Mercado & Clima — v2.3
// FIX 1: Duplicidade de tooltip — .mc-ht interno desativado,
//        apenas #mc-global-tip renderiza o popover do "?"
// FIX 2: Card sobrepondo o expandido — rebaixa TODOS os .mc-cc
//        do painel (não só os do mesmo grupo) + position:relative
// ============================================================
Router.register('mercado', function(main) {
  var MESES = ['Nov/25','Dez/25','Jan/26','Fev/26','Mar/26','Abr/26'];
  var COT = {
    boi:    { vals:[318.4,328.9,335.2,348.6,356.8,366.2], lc:'#C0504D', fc:'rgba(192,80,77,0.10)' },
    suino:  { vals:[7.42,7.38,7.51,7.30,7.16,6.96],       lc:'#2D8653', fc:'rgba(45,134,83,0.10)' },
    frango: { vals:[8.22,8.18,8.15,8.12,8.09,8.10],       lc:'#7153A0', fc:'rgba(113,83,160,0.10)' }
  };
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
    '<div class="section-header anim d5"><div class="sh-dot"></div><span class="sh-title">Explorador de Dados</span><span class="sh-badge">Tabela pivot · Heatmap automático</span></div>' +
    '<div class="section-block anim d5 mc-exp-block">' +
      '<div class="mc-exp-ctrl"><span class="mc-el">Linhas</span><select class="filter-select"><option>Produto</option><option>Mês</option></select><span class="mc-el">Colunas</span><select class="filter-select"><option>Mês</option><option>Semana</option></select><span class="mc-el">Métrica</span><select class="filter-select"><option>Cotação Média</option><option>Variação %</option></select><button class="mc-exp-export">↓ Excel</button></div>' +
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
  // FIX 2: Hover dos cards do Painel de Contexto
  // Rebaixa TODOS os .mc-cc do painel (não só os do grupo)
  // e força position:relative no card expandido
  // ══════════════════════════════════════════════════════════
  (function() {
    // captura TODOS os cards do painel de contexto de uma vez
    var allCards = Array.prototype.slice.call(
      main.querySelectorAll('.mc-ctx-block .mc-cc')
    );

    allCards.forEach(function(card) {
      var t = null;
      var insight = card.querySelector('.mc-cc-insight');

      function expand() {
        // rebaixa TODOS os irmãos do painel (todos os grupos)
        allCards.forEach(function(s) {
          if (s !== card) {
            s.style.setProperty('z-index', '1', 'important');
            s.style.setProperty('position', 'relative', 'important');
          }
        });
        // eleva o card atual
        card.style.setProperty('position', 'relative', 'important');
        card.style.setProperty('z-index', '999', 'important');
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
        // restaura z-index/position dos demais
        allCards.forEach(function(s) {
          if (s !== card) {
            s.style.removeProperty('z-index');
            s.style.removeProperty('position');
          }
        });
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

  // ── PILLS ──────────────────────────────────────────────────
  main.querySelectorAll('.mc-pills').forEach(function(g) {
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

  // ── COTAÇÕES ───────────────────────────────────────────────
  var N = MESES.length;
  function buildCotChart(id, data, lc, fc, fmtFn) {
    var cvs = main.querySelector('#mc-cvs-' + id);
    var tbl = main.querySelector('#mc-tbl-' + id);
    var cg  = main.querySelector('#mc-cg-'  + id);
    if (!cvs||!tbl||!cg) return;
    var mn = Math.min.apply(null,data), mx = Math.max.apply(null,data), pad = (mx-mn)*0.20||0.1;
    var chart = new Chart(cvs, {
      type: 'line',
      data: { labels: MESES, datasets: [{ data: data, borderColor: lc, borderWidth: 2.5, tension: 0.35, fill: true,
        backgroundColor: function(ctx) {
          var g = ctx.chart.ctx.createLinearGradient(0,0,0,100);
          g.addColorStop(0, fc.replace('0.10','0.18')); g.addColorStop(1,'rgba(255,255,255,0)'); return g;
        },
        pointRadius:4, pointBackgroundColor:'#fff', pointBorderColor:lc, pointBorderWidth:2.5, pointHoverRadius:5, clip:false }]},
      options: { responsive:true, maintainAspectRatio:false,
        plugins: { legend:{display:false}, tooltip:{callbacks:{label:function(ctx){return ' '+fmtFn(ctx.parsed.y);}}} },
        scales: { x:{display:false,offset:false}, y:{display:false,min:mn-pad,max:mx+pad} },
        layout: { padding:{top:32,left:0,right:0,bottom:0} }
      },
      plugins: [{ id:'dl', afterDraw: function(ch) {
        var ctx2=ch.ctx;
        ch.data.datasets[0].data.forEach(function(v,i) {
          var px=ch.scales.x.getPixelForValue(i), py=ch.scales.y.getPixelForValue(v);
          ctx2.save(); ctx2.font='700 9px Outfit,sans-serif'; ctx2.fillStyle='#1F2937';
          ctx2.textAlign='center'; ctx2.textBaseline='bottom'; ctx2.fillText(fmtFn(v),px,py-5); ctx2.restore();
        });
      }}]
    });
    if (!tbl.querySelector('thead')) {
      var thead=document.createElement('thead'), tr=document.createElement('tr');
      var th0=document.createElement('th'); th0.style.cssText='padding:4px 0 3px;border:none;background:transparent;font-size:0'; tr.appendChild(th0);
      MESES.forEach(function(m) {
        var th=document.createElement('th'); th.textContent=m;
        th.style.cssText='text-align:center;padding:4px 0 3px;font-size:8.5px;font-weight:600;color:var(--t3);white-space:nowrap;border:none;background:transparent';
        tr.appendChild(th);
      });
      thead.appendChild(tr); tbl.insertBefore(thead,tbl.firstChild);
    }
    setTimeout(function() {
      var W = cvs.parentElement.offsetWidth; if (!W) return;
      var colW = 36, dW = (W-colW)/N;
      chart.options.layout.padding.left  = Math.round(colW+dW/2);
      chart.options.layout.padding.right = Math.round(dW/2);
      chart.update('none');
      var xPts = chart.data.datasets[0].data.map(function(v,i){ return Math.round(chart.scales.x.getPixelForValue(i)); });
      var step = Math.round((xPts[N-1]-xPts[0])/(N-1));
      var lblW = Math.round(xPts[0] - step/2);
      while(cg.firstChild){ cg.removeChild(cg.firstChild); }
      var c0=document.createElement('col'); c0.style.width=lblW+'px'; cg.appendChild(c0);
      for(var i=0;i<N;i++){ var c=document.createElement('col'); c.style.width=step+'px'; cg.appendChild(c); }
    }, 50);
  }
  buildCotChart('boi',    COT.boi.vals,    COT.boi.lc,    COT.boi.fc,    f0);
  buildCotChart('suino',  COT.suino.vals,  COT.suino.lc,  COT.suino.fc,  f2);
  buildCotChart('frango', COT.frango.vals, COT.frango.lc, COT.frango.fc, f2);

  // ── IPCA BARS ──────────────────────────────────────────────
  (function() {
    var el = main.querySelector('#mc-ipca-bars'); if (!el) return;
    var allV = IPCA_DATA.reduce(function(a,d){ return a.concat([d.g,d.a,d.c]); },[]);
    var MX = Math.max.apply(null,allV), H = 90;
    var COLS = ['rgba(12,20,37,0.28)','#C97B2C','#C0504D'];
    IPCA_DATA.forEach(function(d) {
      var vals = [d.g,d.a,d.c];
      var grp = document.createElement('div'); grp.className='mc-ig';
      var lblRow = document.createElement('div'); lblRow.className='mc-ig-lbls';
      vals.forEach(function(v) { var l=document.createElement('div'); l.className='mc-ig-lbl'; l.textContent='+'+v.toFixed(2); lblRow.appendChild(l); });
      var bRow = document.createElement('div'); bRow.className='mc-ig-bars';
      vals.forEach(function(v,j) { var b=document.createElement('div'); b.className='mc-ig-b'; b.style.height=Math.max(4,Math.round(v/MX*H))+'px'; b.style.background=COLS[j]; bRow.appendChild(b); });
      var base=document.createElement('div'); base.className='mc-ig-base';
      var lm=document.createElement('div'); lm.className='mc-ig-x'; lm.textContent=d.m;
      grp.appendChild(lblRow); grp.appendChild(bRow); grp.appendChild(base); grp.appendChild(lm); el.appendChild(grp);
    });
  })();

  // ── ALERTAS IPCA ───────────────────────────────────────────
  (function() {
    var ul=IPCA_DATA[IPCA_DATA.length-1], aw=main.querySelector('#mc-ipca-alerts'); if(!aw) return;
    [{cond:ul.c>0.9,  cls:'r', ttl:'⚠ Crítico — IPCA Carnes',       body:'Carnes sobem <strong>2× mais</strong> que a inflação geral. Reforce sobrecoxa, coxão mole e linguiça.'},
     {cond:ul.a>0.7&&ul.a/ul.g>1.4, cls:'w', ttl:'⚠ Atenção — IPCA Alimentação', body:'Alimentação subindo <strong>'+(ul.a/ul.g).toFixed(1)+'×</strong> acima do IPCA geral.'},
     {cond:5.72>5.5,  cls:'b', ttl:'◉ Monitorar — Câmbio',           body:'Dólar em <strong>R$ 5,72</strong>, acima do patamar neutro de R$ 5,50.'}
    ].forEach(function(a) {
      if (!a.cond) return;
      var div=document.createElement('div'); div.className='mc-ial mc-ial-'+a.cls;
      div.innerHTML='<div class="mc-ial-ttl mc-'+a.cls+'">'+a.ttl+'</div><div class="mc-ial-body">'+a.body+'</div>';
      aw.appendChild(div);
    });
  })();

  // ── TOOLTIP EVENTOS CALENDÁRIO ─────────────────────────────
  var calEvTip = document.getElementById('mc-cal-ev-tip');
  if (!calEvTip) {
    calEvTip = document.createElement('div'); calEvTip.id = 'mc-cal-ev-tip';
    calEvTip.style.cssText = 'position:fixed;z-index:99999;background:#0C1425;color:#fff;border-radius:10px;padding:10px 14px;max-width:220px;box-shadow:0 16px 48px rgba(0,0,0,0.35);font-family:Outfit,sans-serif;font-size:11px;line-height:1.5;pointer-events:none;opacity:0;transition:opacity .15s;white-space:normal;display:block';
    document.body.appendChild(calEvTip);
  }
  main.querySelectorAll('.mc-cev').forEach(function(ev) {
    var catColor = {feriado:'#C0504D',pagto:'#2D8653',sazon:'#7A5800',clima:'#3670A0',custom:'#7153A0'};
    ev.addEventListener('mouseenter', function() {
      var txt=ev.textContent.trim(), cat=Object.keys(catColor).find(function(k){ return ev.classList.contains(k); })||'custom';
      calEvTip.innerHTML='<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+catColor[cat]+';margin-right:6px;vertical-align:middle"></span><strong>'+txt+'</strong>';
      var r=ev.getBoundingClientRect();
      calEvTip.style.left=Math.max(8,Math.min(r.left-20,window.innerWidth-240))+'px';
      calEvTip.style.top=r.top+'px';
      calEvTip.style.transform='translateY(-100%) translateY(-6px)';
      calEvTip.style.opacity='1';
    });
    ev.addEventListener('mouseleave', function(){ calEvTip.style.opacity='0'; });
  });
});
