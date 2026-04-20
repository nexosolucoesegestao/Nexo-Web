// ============================================================
// NEXO Intelligence Web — pages/mercado.js
// Mercado & Clima — v3.7 (Explorador de Dados analítico)
// FEAT 11 (v3.7): EXPLORADOR DE MERCADO & CLIMA
//   Cruzamento livre de 8 séries (Boi Spot/Futuro, Suíno, Frango,
//     IPCA Geral/Alim/Carnes, Dólar) — foco em dados da própria página
//   3 vistas: Tabela heatmap · Linhas normalizadas (base 100) · Matriz
//     de correlação Pearson (com intensidade visual)
//   Períodos alinhados ao IPCA (Mês/Bimestre/Trimestre/Semestre/Ano)
//     Agregação por média, últimos pontos comparando YoY
//   Seed 48 meses (Jan/2023 → Abr/2026) suporta YoY em todas janelas
//   Engine de insights MULTICAMADA (até 5 camadas):
//     1. Cruzamento mais relevante da seleção
//     2. Correlações secundárias notáveis
//     3. Anomalias (z-score > 1.8 no último ponto)
//     4. Recomendações prescritivas específicas (Boi Spot vs Futuro,
//        padrão de repasse, câmbio dominante)
//     5. Mudança de regime (correlação 1ª metade vs 2ª metade)
//   Export CSV contextual do estado atual
// FIX 10 (v3.6): Eventos recorrentes (iCalendar RRULE-like)
//   Seção "Repetição" no modal: Não repete / Diária / Semanal / Mensal / Anual
//   Término: Nunca | Em uma data | Após N ocorrências
//   Engine _calOccursOn expande séries em qualquer dia/mês/ano
//   _calEventsForDay varre todas as datas-base e expande
//   Badge "↻ série semanal até DD/MM/YYYY" no modo edição
//   Edição sempre afeta a série inteira (simples, seguro)
//   Indicador ↻ inline no título dos eventos recorrentes
// FIX 9 (v3.5.1): Eventos do usuário de QUALQUER tipo são editáveis
//   Bug: tipo diferente de 'custom' não tinha data-custom-id nem title
//   Bug: click handler só reagia a classe 'custom'
//   Bug: tooltip só mostrava nota se tipo era 'custom'
//   Bug: análise do mês não contava eventos do usuário
//   Fix: atributos e handlers agora usam data-custom-id (independente
//        do tipo) — tooltip mostra "Sua nota" + KB quando ambos existem
//        — análise mostra "+ N eventos seus" em roxo quando > 0
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
//   ENGINE v3 de insights — funções próprias por série
//   INSIGHTS em 3 colunas lado a lado (grid)
// FEAT 8 (v3.5): CALENDÁRIO INTERATIVO
//   Engine de dados: feriados 2026/2027, sazonalidades varejo,
//     pagtos recorrentes (5/10/15/FGTS20/último útil), clima seed
//   Navegação ‹ › recalcula mês inteiro + análise contextual
//   Tooltip v2 com event delegation (sobrevive a rebuild)
//   KB expandida com 30+ entradas + fallback por categoria (clima)
//   Modal "+ Adicionar evento" com 5 categorias + localStorage
//   Modo edição ao clicar num evento custom + botão Excluir
//   Click num dia vazio abre modal com data preenchida
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
        '<div class="mc-cot-card"><div class="mc-cot-head"><span class="mc-cot-icon">🐄</span><span class="mc-cot-ttl">Boi Gordo</span>'+hb('Boi Gordo (R$/@)','Preço por arroba no mercado paulista. R$10/@ de alta ≈ +R$0,67/kg.','✓ Estável: margem protegida','✗ Alta 2+ meses: repasse obrigatório')+'</div><div class="mc-cot-bn">366<span class="mc-unit">/@</span></div><div class="mc-cot-badges"><span class="mc-badge up">▲ +4,2% mês</span><span class="mc-badge up">▲ +11,8% trim.</span></div><div class="mc-chart-wrap"><canvas id="mc-cvs-boi"></canvas></div><table class="mc-tbl" id="mc-tbl-boi"><colgroup id="mc-cg-boi"></colgroup><tbody><tr><td class="mc-tlbl">Var.</td>'+varRow(COT.boi.mes.vals,f0)+'</tr><tr><td class="mc-tlbl">Var.%</td>'+pctRow(COT.boi.mes.vals)+'</tr></tbody></table><div class="mc-cot-pill mc-pill-warn">⚠ Cruzar 380/@ → repassar no traseiro</div></div>' +
        '<div class="mc-cot-card"><div class="mc-cot-head"><span class="mc-cot-icon">🐷</span><span class="mc-cot-ttl">Suíno Vivo</span>'+hb('Suíno Vivo (R$/kg)','Cotação posto SP. Base de custo para costelinha, lombo e pernil.','✓ Em queda: compre mais','✗ Acima R$8,00: revisar preços')+'</div><div class="mc-cot-bn">6,96<span class="mc-unit">/kg</span></div><div class="mc-cot-badges"><span class="mc-badge dn">▼ -2,8% sem.</span><span class="mc-badge dn">▼ -1,2% mês</span></div><div class="mc-chart-wrap"><canvas id="mc-cvs-suino"></canvas></div><table class="mc-tbl" id="mc-tbl-suino"><colgroup id="mc-cg-suino"></colgroup><tbody><tr><td class="mc-tlbl">Var.</td>'+varRow(COT.suino.mes.vals,f2)+'</tr><tr><td class="mc-tlbl">Var.%</td>'+pctRow(COT.suino.mes.vals)+'</tr></tbody></table><div class="mc-cot-pill mc-pill-opp">✓ Janela de compra — reforçar costelinha e lombo</div></div>' +
        '<div class="mc-cot-card"><div class="mc-cot-head"><span class="mc-cot-icon">🐔</span><span class="mc-cot-ttl">Frango Congelado</span>'+hb('Frango Atacado (R$/kg)','Cotação frango congelado atacado SP. Referência de custo para rotisseria.','✓ Estável: margem previsível','✗ Alta acima 10%: revisar frango assado')+'</div><div class="mc-cot-bn">8,10<span class="mc-unit">/kg</span></div><div class="mc-cot-badges"><span class="mc-badge nt">↔ +0,1% sem.</span><span class="mc-badge nt">↔ Estável 3m</span></div><div class="mc-chart-wrap"><canvas id="mc-cvs-frango"></canvas></div><table class="mc-tbl" id="mc-tbl-frango"><colgroup id="mc-cg-frango"></colgroup><tbody><tr><td class="mc-tlbl">Var.</td>'+varRow(COT.frango.mes.vals,f2)+'</tr><tr><td class="mc-tlbl">Var.%</td>'+pctRow(COT.frango.mes.vals)+'</tr></tbody></table><div class="mc-cot-pill mc-pill-ok">◎ Margem protegida · Rotisseria favorável</div></div>' +
      '</div>' +
    '</div>' +

    // ── B4: IPCA ───────────────────────────────────────────────
    '<div class="section-header anim d3"><div class="sh-dot"></div><span class="sh-title">IPCA & Macro</span><span class="sh-badge">IBGE/SIDRA · Banco Central · Mensal</span></div>' +
    '<div class="section-block anim d3 mc-ipca-block">' +
      '<div class="mc-pills" id="mc-pills-ipca"></div>' +
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
      '</div>' +
      '<div class="mc-cal-legend"><span class="mc-cev feriado">Feriado</span><span class="mc-cev sazon">Sazonalidade</span><span class="mc-cev pagto">💰 Pagamento</span><span class="mc-cev clima">Clima</span><span class="mc-cev custom">Evento próprio</span></div>' +
      '<div class="mc-mes-insight"><span class="mc-mes-icon">🧭</span><div><div class="mc-mes-ttl">Análise do mês</div><div class="mc-mes-body">Carregando...</div><div class="mc-mes-action">→ Navegue entre meses com ‹ › para explorar padrões sazonais.</div></div></div>' +
    '</div>' +

    // ── B6: EXPLORADOR DE MERCADO & CLIMA ──────────────────────
    // HTML mínimo — conteúdo inteiro populado dinamicamente pela
    // engine do Explorador no final do Router.register (vide bloco).
    '<div class="section-header anim d5"><div class="sh-dot"></div><span class="sh-title">Explorador de Dados</span><span class="sh-badge">Cruzamento de séries · Correlação automática</span></div>' +
    '<div class="section-block anim d5 mc-exp-block" id="mc-exp-block">' +
      '<div style="padding:24px;text-align:center;color:#9CA3AF;font-size:11px">Carregando explorador…</div>' +
    '</div>' +

    '';

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
  // CALENDÁRIO v1.0 — Interativo completo
  //   ETAPA 1: Engine de dados (feriados, sazonalidades, pagtos, clima)
  //            + navegação ‹ › com rebuild do grid
  //   ETAPA 2: Tooltip rico com event delegation (sobrevive a rebuild)
  //            + KB expandida + fallback por CATEGORIA (clima = por temp)
  //   ETAPA 3: Modal "+ Adicionar evento" com localStorage
  //            + Edição ao clicar num evento custom + botão Excluir
  //
  // EVENTOS GERADOS DINAMICAMENTE por mês a partir de:
  //  - FERIADOS_2026/2027 (nacionais + religiosos)
  //  - SAZON_2026 (datas do varejo alimentar)
  //  - Pagamentos recorrentes (5, 10, 15, FGTS 20, último útil)
  //  - Clima seed (4 pontos por mês)
  //  - localStorage (eventos custom do usuário)
  // ══════════════════════════════════════════════════════════

  var CAL_MESES_LONG  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function _calKey(y,m,d){ return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }

  // ── Feriados nacionais (fixos e móveis) ──
  var CAL_FERIADOS = {
    '2026-01-01':'Ano Novo',
    '2026-02-16':'Carnaval (seg)', '2026-02-17':'Carnaval (ter)', '2026-02-18':'Quarta de Cinzas',
    '2026-04-03':'Sexta-Feira Santa', '2026-04-05':'Páscoa',
    '2026-04-21':'Tiradentes',
    '2026-05-01':'Dia do Trabalho',
    '2026-06-04':'Corpus Christi',
    '2026-09-07':'Independência',
    '2026-10-12':'N. Sra. Aparecida',
    '2026-11-02':'Finados', '2026-11-15':'Proclamação Rep.', '2026-11-20':'Consciência Negra',
    '2026-12-25':'Natal',
    '2027-01-01':'Ano Novo', '2027-02-08':'Carnaval (seg)', '2027-02-09':'Carnaval (ter)'
  };

  // ── Sazonalidades do varejo alimentar ──
  var CAL_SAZON = {
    '2026-03-19':'🐔 Dia do Frango',
    '2026-03-29':'Dom. Ramos', '2026-04-02':'Quinta Santa',
    '2026-04-22':'Dia da Terra',
    '2026-04-25':'🐷 Dia da Carne Suína',
    '2026-05-10':'🌹 Dia das Mães',
    '2026-06-12':'💕 Dia dos Namorados', '2026-06-24':'São João (festa junina)',
    '2026-08-09':'👔 Dia dos Pais',
    '2026-09-21':'Primavera',
    '2026-10-12':'🎈 Dia das Crianças', '2026-10-28':'Dia do Servidor',
    '2026-11-27':'🛒 Black Friday',
    '2026-12-08':'Imaculada Conceição', '2026-12-24':'🎄 Véspera de Natal', '2026-12-31':'🎆 Virada'
  };

  // ── Pagamentos recorrentes (dias 5, 10, 15, FGTS 20, último útil) ──
  function _calPagamentos(ano, mes) {
    var p = {};
    [5,10,15].forEach(function(d){ p[_calKey(ano,mes,d)] = '💰 Pagto. '+d; });
    p[_calKey(ano,mes,20)] = '💰 FGTS';
    var ultimoDia = new Date(ano, mes+1, 0).getDate();
    var d = new Date(ano, mes, ultimoDia);
    while (d.getDay()===0 || d.getDay()===6) d.setDate(d.getDate()-1);
    p[_calKey(ano,mes,d.getDate())] = '💰 Último útil';
    return p;
  }

  // ── Clima seed (4 pontos/mês com ruído sazonal) ──
  function _calClima(ano, mes) {
    var c = {};
    var tempMed = {0:33,1:32,2:30,3:28,4:25,5:22,6:21,7:23,8:25,9:28,10:30,11:32}[mes];
    var ultimoDia = new Date(ano, mes+1, 0).getDate();
    [4,11,18,25].forEach(function(d){
      if (d > ultimoDia) return;
      var t = tempMed + Math.floor((Math.sin(d*0.7)*3));
      var icon = t>=30 ? '☀' : (t>=24 ? '⛅' : '🌧');
      c[_calKey(ano,mes,d)] = icon+' '+t+'°C';
    });
    return c;
  }

  // ── localStorage para eventos custom ──
  function _calLoadCustom() {
    try { return JSON.parse(localStorage.getItem('nexo_cal_custom_events')||'{}'); }
    catch(e){ return {}; }
  }
  function _calSaveCustom(obj) {
    try { localStorage.setItem('nexo_cal_custom_events', JSON.stringify(obj)); } catch(e){}
  }
  function _calFindCustom(id) {
    var all = _calLoadCustom();
    for (var k in all) {
      for (var i=0; i<all[k].length; i++) if (all[k][i].id === id) return { data:k, idx:i, evento:all[k][i] };
    }
    return null;
  }

  // ── Monta eventos de um dia específico ──
  // ── Verifica se um evento recorrente ocorre num dia específico ──
  // evento.data = "YYYY-MM-DD" (data base, primeira ocorrência)
  // evento.repeat = { freq: 'daily'|'weekly'|'monthly'|'yearly'|'none', end: {tipo,valor} }
  // Retorna { ocorre: bool, nOcorrencia: int } — número 1 = 1ª ocorrência
  function _calOccursOn(evento, ano, mes, dia) {
    var base = new Date(evento.data + 'T00:00:00');
    var target = new Date(ano, mes, dia);
    if (target < base) return { ocorre:false };

    var freq = evento.repeat && evento.repeat.freq;
    if (!freq || freq === 'none') {
      // Sem repetição → só ocorre no dia base
      var sameDay = (target.getFullYear()===base.getFullYear() &&
                     target.getMonth()===base.getMonth() &&
                     target.getDate()===base.getDate());
      return { ocorre:sameDay, nOcorrencia:1 };
    }

    // Verifica fim "em uma data"
    var endType = evento.repeat.end ? evento.repeat.end.tipo : 'never';
    if (endType === 'date' && evento.repeat.end.valor) {
      var endDate = new Date(evento.repeat.end.valor + 'T23:59:59');
      if (target > endDate) return { ocorre:false };
    }

    var msPerDay = 86400000;
    var daysDiff = Math.floor((target - base) / msPerDay);
    var matches = false, n = 1;

    if (freq === 'daily') {
      matches = daysDiff >= 0;
      n = daysDiff + 1;
    } else if (freq === 'weekly') {
      matches = (daysDiff >= 0 && daysDiff % 7 === 0);
      n = Math.floor(daysDiff/7) + 1;
    } else if (freq === 'monthly') {
      if (target.getDate() !== base.getDate()) return { ocorre:false };
      var md = (target.getFullYear()-base.getFullYear())*12 + (target.getMonth()-base.getMonth());
      if (md < 0) return { ocorre:false };
      matches = true; n = md + 1;
    } else if (freq === 'yearly') {
      if (target.getDate() !== base.getDate()) return { ocorre:false };
      if (target.getMonth() !== base.getMonth()) return { ocorre:false };
      var yd = target.getFullYear()-base.getFullYear();
      if (yd < 0) return { ocorre:false };
      matches = true; n = yd + 1;
    }

    if (!matches) return { ocorre:false };

    // Verifica fim "após N ocorrências"
    if (endType === 'count' && evento.repeat.end.valor) {
      if (n > evento.repeat.end.valor) return { ocorre:false };
    }
    return { ocorre:true, nOcorrencia:n };
  }

  function _calEventsForDay(ano, mes, dia) {
    var k = _calKey(ano,mes,dia);
    var events = [];
    if (CAL_FERIADOS[k]) events.push(['feriado', CAL_FERIADOS[k]]);
    if (CAL_SAZON[k])    events.push(['sazon',   CAL_SAZON[k]]);
    var pagtos = _calPagamentos(ano,mes);
    if (pagtos[k]) events.push(['pagto', pagtos[k]]);
    var clima = _calClima(ano,mes);
    if (clima[k])  events.push(['clima', clima[k]]);

    // Eventos custom: varre TODAS as datas no storage (não só k)
    // porque séries recorrentes têm data-base em outro dia
    var custom = _calLoadCustom();
    for (var baseKey in custom) {
      custom[baseKey].forEach(function(c){
        // Evento sem repetição — só entra se baseKey === k (pega só o dia-exato)
        if (!c.repeat || c.repeat.freq === 'none' || !c.repeat.freq) {
          if (baseKey === k) {
            events.push([c.tipo || 'custom', c.titulo, c.id, c.nota]);
          }
          return;
        }
        // Com repetição — garante que c.data existe (fallback: baseKey)
        if (!c.data) c.data = baseKey;
        var res = _calOccursOn(c, ano, mes, dia);
        if (!res.ocorre) return;
        // Indicador ↻ no título pra deixar claro que é série
        var tituloFinal = c.titulo + ' ↻';
        events.push([c.tipo || 'custom', tituloFinal, c.id, c.nota]);
      });
    }
    return events;
  }

  // ── Análise adaptativa do mês ──
  function _calAnalyze(ano, mes) {
    var mesNome = CAL_MESES_LONG[mes];
    var totalDias = new Date(ano,mes+1,0).getDate();
    var feriados = 0, sazons = 0, meus = 0, pagtos = 0;
    for (var d=1; d<=totalDias; d++) {
      _calEventsForDay(ano,mes,d).forEach(function(e){
        // e[2] = id (existe só nos customs do usuário)
        var isCustom = !!e[2];
        if (isCustom) meus++;
        else if (e[0]==='feriado') feriados++;
        else if (e[0]==='sazon') sazons++;
        else if (e[0]==='pagto') pagtos++;
      });
    }
    var narrativas = [
      '<strong>Volta às aulas + 13º retornando</strong>. Consumidor ainda endividado das festas. Foco em proteínas acessíveis.',
      '<strong>Carnaval + volta às aulas</strong>. Janela promocional curta; demanda alta para churrasco e petiscos.',
      '<strong>Quaresma + Dia do Frango (19/03)</strong>. Pico de aves e pescados. Reduzir exposição de carnes vermelhas.',
      '<strong>Páscoa + Tiradentes + Dia Suíno (25/04)</strong>. Janela premium para aves e suíno. FGTS dia 20 = pico duplo.',
      '<strong>Dia do Trabalho + Dia das Mães (10/05)</strong>. Feriado prolongado + data comercial forte. Reforçar picanha e fraldinha.',
      '<strong>Dia dos Namorados + festas juninas + Corpus Christi</strong>. Demanda alta por cortes nobres e linguiças artesanais.',
      '<strong>Férias escolares + frio no Sul/Sudeste</strong>. Consumidor em casa: pico de ensopados, sopas, cortes para cozimento longo.',
      '<strong>Dia dos Pais (09/08)</strong>. Segunda maior data de churrasco do ano. Reforçar linha premium e acessórios.',
      '<strong>Independência + início primavera</strong>. Feriado prolongado (07/09) + retomada de churrasco ao ar livre.',
      '<strong>Dia das Crianças + N. Sra. Aparecida + feriado prolongado</strong>. Aumentar mix família e itens de conveniência.',
      '<strong>Black Friday (27/11) + Consciência Negra + Proclamação</strong>. Mês mais promocional do varejo. Preparar estoque e comunicação.',
      '<strong>Natal + Virada + 13º integral</strong>. Pico absoluto de vendas. Reforçar aves, suíno pernil, tender e peças premium.'
    ];
    return { titulo:'Análise de '+mesNome+' '+ano, narrativa:narrativas[mes], feriados:feriados, sazons:sazons, pagtos:pagtos, meus:meus };
  }

  // ── Rebuild do grid inteiro para (ano, mes) ──
  function _calRebuildGrid(ano, mes) {
    var grid = main.querySelector('.mc-cal-grid');
    if (!grid) return;

    var dowHtml = '<div class="mc-cdow">Dom</div><div class="mc-cdow">Seg</div><div class="mc-cdow">Ter</div><div class="mc-cdow">Qua</div><div class="mc-cdow">Qui</div><div class="mc-cdow">Sex</div><div class="mc-cdow">Sáb</div>';
    grid.innerHTML = dowHtml;

    var primDiaSem = new Date(ano,mes,1).getDay();
    var ultDia     = new Date(ano,mes+1,0).getDate();
    var ultDiaAnt  = new Date(ano,mes,0).getDate();
    var hoje = new Date();
    var isCurrent = (hoje.getFullYear()===ano && hoje.getMonth()===mes);
    var hojeDia = hoje.getDate();

    function makeCell(num, extraCls, events) {
      var evHtml = (events||[]).map(function(e){
        // Atributos de evento editável: setados sempre que houver customId (e[2])
        // — independente do tipo (custom/feriado/sazon/pagto/clima)
        var hasCustomId = !!e[2];
        var extraAttr = hasCustomId ? ' data-custom-id="'+e[2]+'"' : '';
        var titleAttr = hasCustomId && e[3] ? ' title="'+String(e[3]).replace(/"/g,'&quot;')+'"' : '';
        return '<div class="mc-cev '+e[0]+'"'+extraAttr+titleAttr+'>'+e[1]+'</div>';
      }).join('');
      var numHtml = extraCls==='today'
        ? '<span style="background:var(--navy,#0C1425);color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px">'+num+'</span>'
        : num;
      return '<div class="mc-cd '+(extraCls||'')+'">' +
        '<div class="mc-cdn">'+numHtml+'</div>' +
        (evHtml?'<div class="mc-cevts">'+evHtml+'</div>':'') +
      '</div>';
    }

    var cells = '';
    for (var i=primDiaSem-1; i>=0; i--) cells += makeCell(ultDiaAnt-i,'other');
    for (var d=1; d<=ultDia; d++) {
      var events = _calEventsForDay(ano,mes,d);
      var cls = '';
      if (isCurrent && d===hojeDia) cls = 'today';
      else if (events.some(function(e){ return e[0]==='pagto'; })) cls = 'pagto';
      cells += makeCell(d, cls, events);
    }
    var total = primDiaSem + ultDia;
    var remaining = (7 - (total%7)) % 7;
    for (var i=1; i<=remaining; i++) cells += makeCell(i,'other');
    grid.innerHTML += cells;

    var mesEl = main.querySelector('.mc-cal-month');
    if (mesEl) mesEl.textContent = CAL_MESES_LONG[mes]+' '+ano;

    var insEl = main.querySelector('.mc-mes-insight');
    if (insEl) {
      var anl = _calAnalyze(ano,mes);
      // Linha base + sufixo com eventos do usuário quando houver
      var baseLine = '<strong>'+anl.feriados+' feriados + '+anl.sazons+' datas sazonais</strong> neste mês.';
      if (anl.meus > 0) {
        baseLine += ' <strong style="color:#7153A0">+ '+anl.meus+' evento'+(anl.meus>1?'s':'')+' seu'+(anl.meus>1?'s':'')+'</strong>.';
      }
      insEl.innerHTML =
        '<span class="mc-mes-icon">🧭</span>' +
        '<div>' +
          '<div class="mc-mes-ttl">'+anl.titulo+'</div>' +
          '<div class="mc-mes-body">'+baseLine+' '+anl.narrativa+'</div>' +
          '<div class="mc-mes-action">→ Navegue entre meses com ‹ › para explorar padrões sazonais.</div>' +
        '</div>';
    }
  }

  // ── Estado do calendário + navegação ‹ › ──
  var CAL_STATE = { ano:2026, mes:3 }; // Abril 2026 (default)

  main.querySelectorAll('.mc-cal-nav .mc-cnb').forEach(function(b, i) {
    b.addEventListener('click', function() {
      if (i === 0) { // ‹
        CAL_STATE.mes--;
        if (CAL_STATE.mes < 0) { CAL_STATE.mes = 11; CAL_STATE.ano--; }
      } else {       // ›
        CAL_STATE.mes++;
        if (CAL_STATE.mes > 11) { CAL_STATE.mes = 0; CAL_STATE.ano++; }
      }
      _calRebuildGrid(CAL_STATE.ano, CAL_STATE.mes);
    });
  });

  // ══════════════════════════════════════════════════════════
  // TOOLTIP v2 — Event delegation + KB expandida + fallback por categoria
  // ══════════════════════════════════════════════════════════

  var CAL_KB = {
    // Semana Santa
    'Quarta de Cinzas':  { ctx:'Início da Quaresma. Consumo de carne vermelha cai nas próximas 6 semanas.', acao:'Reforçar aves e pescados; reduzir vermelhas gradualmente.', prio:'media' },
    'Dom. Ramos':        { ctx:'Início da Semana Santa. Planejamento de pico Sexta-feira e Páscoa.', acao:'Iniciar comunicação de aves e pescados. Ajustar pedidos para a semana.', prio:'media' },
    'Quinta Santa':      { ctx:'Preparação do pico da Semana Santa. Movimento crescente.', acao:'Reforçar exposição de bacalhau, salmão e aves.', prio:'media' },
    'Sexta-Feira Santa': { ctx:'Feriado + pico absoluto de pescado/bacalhau. Carne vermelha em baixa total.', acao:'Dobrar exposição de pescados. Reduzir vermelhas 40%. Ação em bacalhau.', prio:'alta' },
    'Páscoa':            { ctx:'Pico de aves (chester/peru) e cordeiro. Carne vermelha em retomada gradual.', acao:'Dobrar exposição de aves premium. Ativar cordeiro. Kit de Páscoa.', prio:'alta' },
    'Corpus Christi':    { ctx:'Feriado religioso + fim de semana prolongado em muitas cidades.', acao:'Kit churrasco prolongado. Reforçar suprimento.', prio:'media' },
    // Feriados nacionais
    'Ano Novo':          { ctx:'Réveillon — pico de cortes nobres e frutos do mar.', acao:'Linha premium + frutos do mar. Pré-reserva ativada.', prio:'alta' },
    'Tiradentes':        { ctx:'Feriado prolongado favorece churrasco doméstico.', acao:'Reforçar picanha, fraldinha, linguiça. Kits promocionais.', prio:'alta' },
    'Tira-dentes':       { ctx:'Feriado nacional (substituição histórica). Fluxo reduzido em centros urbanos.', acao:'Reduzir produção; estoque mínimo.', prio:'baixa' },
    'Dia do Trabalho':   { ctx:'Feriado + início de mês = pico de vendas de fim de semana prolongado.', acao:'Reforçar churrasco + itens de conveniência.', prio:'alta' },
    'Independência':     { ctx:'Feriado prolongado + retomada do churrasco ao ar livre (primavera).', acao:'Picanha, fraldinha, linguiça. Kit patriótico opcional.', prio:'alta' },
    'Aparecida':         { ctx:'Feriado + Dia das Crianças concentra consumo em família.', acao:'Mix família: frango, linguiça, kits infantis.', prio:'media' },
    'Finados':           { ctx:'Feriado reflexivo; movimento moderado, pico no dia anterior.', acao:'Reforçar D-1. Pão de mel e doces na padaria.', prio:'baixa' },
    'Proclamação':       { ctx:'Feriado próximo à Black Friday — pode antecipar compras.', acao:'Monitorar tráfego; preparar pré-Black.', prio:'baixa' },
    'Consciência':       { ctx:'Feriado nacional (nov). Movimento moderado em regiões urbanas.', acao:'Estoque normal; observar pico local.', prio:'baixa' },
    'Carnaval':          { ctx:'Feriado prolongado; muitos viajam. Demanda localizada em destinos turísticos.', acao:'Estoque reduzido exceto em regiões turísticas. Kits portáteis.', prio:'media' },
    'Natal':             { ctx:'Tender, pernil, peru, chester = pico absoluto do ano.', acao:'Pré-reserva + linha de festas. Reforçar suíno pernil.', prio:'alta' },
    'Virada':            { ctx:'Carne vermelha + frutos do mar para réveillon.', acao:'Linha premium + frutos do mar embalados.', prio:'alta' },
    // Sazonalidades
    'Dia das Mães':      { ctx:'Segundo maior volume de churrasco do ano. Reposição alta no sábado.', acao:'Picanha, maminha, alcatra + linha premium. Kit para presente.', prio:'alta' },
    'Namorados':         { ctx:'Jantar em casa crescente. Cortes nobres em duplas.', acao:'Filé mignon, picanha bovina, salmão. Kits "jantar a dois".', prio:'media' },
    'Dia dos Pais':      { ctx:'Maior volume de churrasco anual em muitas regiões.', acao:'Linha premium (wagyu, angus, costela premium), kits.', prio:'alta' },
    'Dia das Crianças':  { ctx:'Almoço em família; frango é rei.', acao:'Frango passarinho, nuggets, linguiça artesanal.', prio:'media' },
    'Black Friday':      { ctx:'Mais promocional do varejo. Consumidor caça oferta.', acao:'Kits com ticket médio alto. Promoção cirúrgica em carro-chefe.', prio:'alta' },
    'São João':          { ctx:'Festa junina; pico regional de quentão, pipoca, linguiça.', acao:'Reforçar linguiça artesanal, paçoca, linha caipira.', prio:'media' },
    'Dia da Carne Suína':{ ctx:'Data setorial (25/04). Suíno em queda de preço + FGTS = janela dupla.', acao:'Ação promocional em costelinha, lombo, pernil. Comunicar no balcão.', prio:'alta' },
    'Dia do Frango':     { ctx:'Data setorial (19/03). Quaresma favorece aves.', acao:'Frango passarinho, coxa, sobrecoxa em destaque.', prio:'media' },
    'Dia da Terra':      { ctx:'Data ESG emergente. Ativar comunicação sobre origem e sustentabilidade.', acao:'Destacar carnes rastreadas, orgânicas. Mensagem de origem responsável.', prio:'baixa' },
    'Primavera':         { ctx:'Início da estação — retomada do churrasco ao ar livre.', acao:'Comunicação "tempo de churrasco". Reforçar cortes para grelha.', prio:'baixa' },
    'Dia do Servidor':   { ctx:'Feriado municipal/estadual em várias regiões. Movimento variável.', acao:'Verificar calendário local. Estoque normal.', prio:'baixa' },
    'Imaculada Conceição': { ctx:'Feriado religioso em várias regiões. Movimento moderado.', acao:'Estoque normal. Observar demanda regional.', prio:'baixa' },
    // Pagamentos
    'FGTS':              { ctx:'Pagamento via Caixa; pico de movimento no dia e D+1.', acao:'Reforçar exposição e caixas; garantir produção antecipada.', prio:'media' },
    'Pagto':             { ctx:'Data de pagamento (salário ou benefício). Pico de movimento previsível.', acao:'Reforçar equipe em caixas e balcão. Garantir disponibilidade.', prio:'media' },
    'Último útil':       { ctx:'Último dia útil do mês — pico de pagamento de salários CLT.', acao:'Reforçar todos os canais. Produção em D-1. Garantir abastecimento.', prio:'alta' }
  };
  function _calFindKB(text) {
    for (var k in CAL_KB) { if (text.indexOf(k) >= 0) return CAL_KB[k]; }
    return null;
  }

  // Fallback por categoria (clima principalmente)
  function _calKBByCategory(cat, txt) {
    if (cat === 'clima') {
      var m = txt.match(/(\d+)\s*°/);
      var t = m ? parseInt(m[1]) : null;
      if (t === null) return null;
      if (t >= 32) return { ctx:'Calor acima da média ('+t+'°C). Demanda por churrasco ao ar livre e proteínas leves.', acao:'Reforçar exposição de linguiça, cortes leves e salgados. Reduzir tempo de produto em balcão quente.', prio:'media' };
      if (t >= 28) return { ctx:'Dia ameno-quente ('+t+'°C). Típico padrão de demanda.', acao:'Mix regular. Oportunidade para comunicação de frescor.', prio:'baixa' };
      if (t >= 22) return { ctx:'Temperatura amena ('+t+'°C). Demanda estável.', acao:'Mix regular sem ajustes específicos.', prio:'baixa' };
      if (t >= 15) return { ctx:'Frio ameno ('+t+'°C). Aumenta demanda por ensopados e cortes para cozimento longo.', acao:'Reforçar acém, músculo, costela de cozinhar. Linguiça artesanal em alta.', prio:'media' };
      return { ctx:'Frio intenso ('+t+'°C). Pico de ensopados, sopas, feijoada.', acao:'Dobrar cortes para cozimento longo. Linha de ossobuco e dobradinha.', prio:'media' };
    }
    if (cat === 'pagto') {
      return { ctx:'Data de pagamento (salário ou benefício). Pico de movimento previsível.', acao:'Reforçar equipe em caixas e balcão. Garantir disponibilidade dos carros-chefe.', prio:'media' };
    }
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

  function _calRenderTip(ev) {
    var txt = ev.textContent.trim();
    var cat = Object.keys(CAL_CAT_COLOR).find(function(k){ return ev.classList.contains(k); }) || 'custom';
    var kb = _calFindKB(txt) || _calKBByCategory(cat, txt);
    var prio = kb ? CAL_PRIO[kb.prio] : null;
    // Nota do usuário: qualquer evento editável (data-custom-id) com título
    var userNote = ev.getAttribute('data-custom-id') ? ev.getAttribute('title') : null;

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
        '<div style="margin-bottom:'+(userNote?'8px':'0')+'">' +
          '<div style="font-size:9px;color:#50D282;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px">Ação recomendada</div>' +
          '<div style="color:rgba(255,255,255,0.92);font-weight:500">'+kb.acao+'</div>' +
        '</div>';
    }
    // Nota do usuário aparece SEMPRE que existe, mesmo junto com KB
    if (userNote) {
      html +=
        '<div style="'+(kb?'padding-top:8px;border-top:1px solid rgba(255,255,255,0.1)':'')+'">' +
          '<div style="font-size:9px;color:#C9A84C;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:3px">Sua nota</div>' +
          '<div style="color:rgba(255,255,255,0.82)">'+userNote+'</div>' +
        '</div>';
    }
    if (!kb && !userNote) {
      html += '<div style="color:rgba(255,255,255,0.6);font-style:italic">Evento sem insight detalhado.</div>';
    }
    calEvTip.innerHTML = html;
    var r = ev.getBoundingClientRect();
    calEvTip.style.left = Math.max(8, Math.min(r.left - 20, window.innerWidth - 298)) + 'px';
    calEvTip.style.top = (r.top - 10) + 'px';
    calEvTip.style.transform = 'translateY(-100%)';
    calEvTip.style.opacity = '1';
  }

  // Event delegation: UM listener no grid, funciona após rebuild
  var calGrid = main.querySelector('.mc-cal-grid');
  if (calGrid) {
    calGrid.addEventListener('mouseover', function(e){
      var ev = e.target.closest('.mc-cev');
      if (!ev || !calGrid.contains(ev)) return;
      _calRenderTip(ev);
    });
    calGrid.addEventListener('mouseout', function(e){
      var ev = e.target.closest('.mc-cev');
      if (!ev) return;
      var related = e.relatedTarget;
      if (related && ev.contains(related)) return;
      calEvTip.style.opacity = '0';
    });
  }

  // ══════════════════════════════════════════════════════════
  // MODAL "+ Adicionar evento" + modo edição + exclusão
  // ══════════════════════════════════════════════════════════

  function _calEnsureModal() {
    var m = document.getElementById('mc-cal-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'mc-cal-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(12,20,37,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;font-family:Outfit,sans-serif;opacity:0;transition:opacity .2s';
    m.innerHTML = ''+
      '<div id="mc-cal-modal-card" style="width:440px;max-width:90vw;background:linear-gradient(160deg, rgba(255,255,255,0.97) 0%, rgba(248,250,253,0.97) 100%);border:1px solid rgba(26,39,68,0.12);border-radius:20px;padding:24px 26px;box-shadow:0 30px 90px rgba(12,20,37,0.35), 0 0 0 1px rgba(201,168,76,0.15) inset;transform:scale(0.96);transition:transform .2s">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">' +
          '<div id="mc-cal-modal-icon" style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#0C1425 0%,#1A2744 100%);display:flex;align-items:center;justify-content:center;color:#C9A84C;font-size:20px;font-weight:700">+</div>' +
          '<div style="flex:1">' +
            '<div id="mc-cal-modal-ttl" style="font-size:15px;font-weight:700;color:#0C1425">Adicionar evento</div>' +
            '<div style="font-size:11px;color:#6B7280">Eventos salvos ficam disponíveis apenas neste navegador</div>' +
          '</div>' +
          '<button id="mc-cal-modal-close" style="background:transparent;border:none;color:#6B7280;font-size:20px;cursor:pointer;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center" title="Fechar (ESC)">×</button>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:14px">' +
          '<div><label style="display:block;font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Data</label>' +
            '<input type="date" id="mc-cal-modal-data" style="width:100%;padding:10px 12px;border:1px solid rgba(26,39,68,0.18);border-radius:10px;font-family:Outfit,sans-serif;font-size:13px;color:#0C1425;background:#fff;box-sizing:border-box"></div>' +
          '<div><label style="display:block;font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Categoria</label>' +
            '<div id="mc-cal-modal-tipo" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>' +
          '<div><label style="display:block;font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Título <span style="color:#9CA3AF;font-weight:400;text-transform:none;letter-spacing:0">(curto, aparece no calendário)</span></label>' +
            '<input type="text" id="mc-cal-modal-titulo" maxlength="40" placeholder="Ex: Reunião Rede, Promoção Suíno" style="width:100%;padding:10px 12px;border:1px solid rgba(26,39,68,0.18);border-radius:10px;font-family:Outfit,sans-serif;font-size:13px;color:#0C1425;background:#fff;box-sizing:border-box"></div>' +
          // ── Seção Repetição ──
          '<div>' +
            '<label style="display:block;font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Repetição</label>' +
            '<div id="mc-cal-modal-repeat" style="display:flex;gap:4px;flex-wrap:wrap"></div>' +
            '<div id="mc-cal-modal-repeat-end" style="display:none;margin-top:10px;padding:10px 12px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:10px">' +
              '<div style="font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Termina</div>' +
              '<div style="display:flex;flex-direction:column;gap:6px">' +
                '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#4B5563;cursor:pointer"><input type="radio" name="mc-cal-repend" value="never" checked style="accent-color:#0C1425"><span>Nunca</span></label>' +
                '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#4B5563;cursor:pointer"><input type="radio" name="mc-cal-repend" value="date" style="accent-color:#0C1425"><span>Em uma data:</span>' +
                  '<input type="date" id="mc-cal-modal-repend-date" disabled style="padding:5px 8px;border:1px solid rgba(26,39,68,0.18);border-radius:6px;font-family:Outfit,sans-serif;font-size:11px;color:#0C1425;background:#fff;opacity:0.5"></label>' +
                '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#4B5563;cursor:pointer"><input type="radio" name="mc-cal-repend" value="count" style="accent-color:#0C1425"><span>Após</span>' +
                  '<input type="number" id="mc-cal-modal-repend-count" disabled min="1" max="365" value="10" style="width:52px;padding:5px 6px;border:1px solid rgba(26,39,68,0.18);border-radius:6px;font-family:Outfit,sans-serif;font-size:11px;color:#0C1425;background:#fff;opacity:0.5;text-align:center"><span>ocorrências</span></label>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div><label style="display:block;font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Nota <span style="color:#9CA3AF;font-weight:400;text-transform:none;letter-spacing:0">(opcional, aparece no tooltip)</span></label>' +
            '<textarea id="mc-cal-modal-nota" rows="2" maxlength="200" placeholder="Ex: Revisar preço da picanha antes do dia da carne suína" style="width:100%;padding:10px 12px;border:1px solid rgba(26,39,68,0.18);border-radius:10px;font-family:Outfit,sans-serif;font-size:13px;color:#0C1425;background:#fff;box-sizing:border-box;resize:vertical"></textarea></div>' +
        '</div>' +
        '<div id="mc-cal-modal-footer" style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(26,39,68,0.08)">' +
          '<button id="mc-cal-modal-cancel" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(26,39,68,0.18);border-radius:10px;color:#4B5563;font-family:Outfit,sans-serif;font-size:12px;font-weight:600;cursor:pointer">Cancelar</button>' +
          '<button id="mc-cal-modal-save" style="flex:1;padding:10px;background:linear-gradient(135deg,#0C1425 0%,#1A2744 100%);border:1px solid #C9A84C;border-radius:10px;color:#C9A84C;font-family:Outfit,sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:0.5px">SALVAR EVENTO</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);

    // Pills de categoria
    var CATS = [
      { key:'custom',  label:'Evento Próprio', color:'#7153A0', bg:'rgba(113,83,160,0.10)', border:'rgba(113,83,160,0.35)' },
      { key:'feriado', label:'Feriado',        color:'#C0504D', bg:'rgba(192,80,77,0.10)',  border:'rgba(192,80,77,0.35)' },
      { key:'sazon',   label:'Sazonalidade',   color:'#C9A84C', bg:'rgba(201,168,76,0.10)', border:'rgba(201,168,76,0.35)' },
      { key:'pagto',   label:'Pagamento',      color:'#2D8653', bg:'rgba(45,134,83,0.10)',  border:'rgba(45,134,83,0.35)' },
      { key:'clima',   label:'Clima',          color:'#3670A0', bg:'rgba(54,112,160,0.10)', border:'rgba(54,112,160,0.35)' }
    ];
    var tipoBox = m.querySelector('#mc-cal-modal-tipo');
    tipoBox.dataset.selected = 'custom';
    CATS.forEach(function(cfg, i){
      var b = document.createElement('button');
      b.dataset.cat = cfg.key;
      b.textContent = cfg.label;
      b.style.cssText = 'padding:7px 12px;border-radius:20px;border:1px solid '+cfg.border+';background:'+(i===0?cfg.bg:'transparent')+';color:'+(i===0?cfg.color:'#6B7280')+';font-family:Outfit,sans-serif;font-size:11px;font-weight:'+(i===0?'700':'500')+';cursor:pointer;letter-spacing:0.3px;transition:all .15s';
      b.addEventListener('click', function(){
        tipoBox.querySelectorAll('button').forEach(function(x){
          x.style.background = 'transparent';
          x.style.color = '#6B7280';
          x.style.fontWeight = '500';
        });
        b.style.background = cfg.bg;
        b.style.color = cfg.color;
        b.style.fontWeight = '700';
        tipoBox.dataset.selected = cfg.key;
      });
      tipoBox.appendChild(b);
    });

    // ── Pills de REPETIÇÃO ──
    var REPEAT_OPTS = [
      { key:'none',    label:'Não repete' },
      { key:'daily',   label:'Diária'     },
      { key:'weekly',  label:'Semanal'    },
      { key:'monthly', label:'Mensal'     },
      { key:'yearly',  label:'Anual'      }
    ];
    var repBox = m.querySelector('#mc-cal-modal-repeat');
    repBox.dataset.freq = 'none';
    REPEAT_OPTS.forEach(function(opt, i){
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.freq = opt.key;
      b.textContent = opt.label;
      var active = (i === 0);
      b.style.cssText = 'padding:6px 11px;border-radius:18px;border:1px solid '+(active?'rgba(12,20,37,0.3)':'rgba(26,39,68,0.15)')+';background:'+(active?'rgba(12,20,37,0.06)':'transparent')+';color:'+(active?'#0C1425':'#6B7280')+';font-family:Outfit,sans-serif;font-size:11px;font-weight:'+(active?'700':'500')+';cursor:pointer;letter-spacing:0.2px;transition:all .12s';
      b.addEventListener('click', function(){
        repBox.querySelectorAll('button').forEach(function(x){
          x.style.background = 'transparent';
          x.style.color = '#6B7280';
          x.style.fontWeight = '500';
          x.style.border = '1px solid rgba(26,39,68,0.15)';
        });
        b.style.background = 'rgba(12,20,37,0.06)';
        b.style.color = '#0C1425';
        b.style.fontWeight = '700';
        b.style.border = '1px solid rgba(12,20,37,0.3)';
        repBox.dataset.freq = opt.key;
        var endBox = document.getElementById('mc-cal-modal-repeat-end');
        if (endBox) endBox.style.display = opt.key === 'none' ? 'none' : 'block';
      });
      repBox.appendChild(b);
    });

    // Radios de término: habilita/desabilita inputs
    m.querySelectorAll('input[name="mc-cal-repend"]').forEach(function(r){
      r.addEventListener('change', function(){
        var dInp = m.querySelector('#mc-cal-modal-repend-date');
        var cInp = m.querySelector('#mc-cal-modal-repend-count');
        dInp.disabled = r.value !== 'date';
        cInp.disabled = r.value !== 'count';
        dInp.style.opacity = r.value === 'date' ? '1' : '0.5';
        cInp.style.opacity = r.value === 'count' ? '1' : '0.5';
      });
    });

    // Data padrão de fim = 3 meses à frente
    var dFin = new Date(); dFin.setMonth(dFin.getMonth()+3);
    m.querySelector('#mc-cal-modal-repend-date').value = dFin.toISOString().slice(0,10);

    return m;
  }

  function _calOpenModal(opts) {
    var m = _calEnsureModal();
    opts = typeof opts === 'string' ? { mode:'create', presetDate:opts } : (opts||{ mode:'create' });

    var dataInput = m.querySelector('#mc-cal-modal-data');
    var tituloInput = m.querySelector('#mc-cal-modal-titulo');
    var notaInput = m.querySelector('#mc-cal-modal-nota');
    var tipoBox = m.querySelector('#mc-cal-modal-tipo');
    var saveBtn = m.querySelector('#mc-cal-modal-save');
    var ttlEl = m.querySelector('#mc-cal-modal-ttl');
    var iconEl = m.querySelector('#mc-cal-modal-icon');
    var footer = m.querySelector('#mc-cal-modal-footer');

    var oldDelete = m.querySelector('#mc-cal-modal-delete');
    if (oldDelete) oldDelete.remove();

    if (opts.mode === 'edit' && opts.editId) {
      var loc = _calFindCustom(opts.editId);
      if (!loc) { opts.mode = 'create'; }
      else {
        dataInput.value = loc.data;
        tituloInput.value = loc.evento.titulo;
        notaInput.value = loc.evento.nota || '';
        var btnCat = Array.from(tipoBox.querySelectorAll('button')).find(function(b){ return b.dataset.cat === loc.evento.tipo; });
        if (btnCat) btnCat.click();

        // Pré-preencher repetição se existir
        var rep = loc.evento.repeat;
        var repBtns = m.querySelectorAll('#mc-cal-modal-repeat button');
        var freqKey = (rep && rep.freq) ? rep.freq : 'none';
        var repBtn = Array.from(repBtns).find(function(x){ return x.dataset.freq === freqKey; });
        if (repBtn) repBtn.click();
        if (rep && rep.end) {
          var endType = rep.end.tipo;
          var radio = m.querySelector('input[name="mc-cal-repend"][value="'+endType+'"]');
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
            if (endType === 'date' && rep.end.valor) {
              m.querySelector('#mc-cal-modal-repend-date').value = rep.end.valor;
            } else if (endType === 'count' && rep.end.valor) {
              m.querySelector('#mc-cal-modal-repend-count').value = rep.end.valor;
            }
          }
        }

        if (ttlEl) ttlEl.textContent = 'Editar evento';
        if (iconEl) iconEl.innerHTML = '✎';
        saveBtn.textContent = 'SALVAR ALTERAÇÕES';
        m.dataset.editId = opts.editId;

        // Badge de ocorrência no topo do modal (se é série)
        var oldBadge = m.querySelector('#mc-cal-modal-series-badge');
        if (oldBadge) oldBadge.remove();
        if (rep && rep.freq && rep.freq !== 'none') {
          var freqLbl = { daily:'diária', weekly:'semanal', monthly:'mensal', yearly:'anual' }[rep.freq];
          var endLbl = rep.end && rep.end.tipo === 'date' ? ' até '+rep.end.valor.split('-').reverse().join('/')
                     : rep.end && rep.end.tipo === 'count' ? ' · '+rep.end.valor+' ocorrências'
                     : ' · sem data de fim';
          var badge = document.createElement('div');
          badge.id = 'mc-cal-modal-series-badge';
          badge.style.cssText = 'margin-bottom:14px;padding:8px 10px;background:rgba(113,83,160,0.08);border:1px solid rgba(113,83,160,0.25);border-radius:8px;font-size:11px;color:#7153A0;font-weight:600';
          badge.innerHTML = '↻ Esta é uma <strong>série '+freqLbl+'</strong>'+endLbl+'. Alterações afetam todas as ocorrências.';
          // Insere antes do primeiro campo (Data)
          var firstField = m.querySelector('#mc-cal-modal-data').parentNode;
          firstField.parentNode.insertBefore(badge, firstField);
        }

        var delBtn = document.createElement('button');
        delBtn.id = 'mc-cal-modal-delete';
        delBtn.innerHTML = '🗑 Excluir';
        delBtn.style.cssText = 'padding:10px 14px;background:transparent;border:1px solid rgba(192,80,77,0.35);border-radius:10px;color:#C0504D;font-family:Outfit,sans-serif;font-size:12px;font-weight:600;cursor:pointer;margin-right:auto';
        footer.insertBefore(delBtn, footer.firstChild);
      }
    }

    if (opts.mode === 'create') {
      if (opts.presetDate) {
        dataInput.value = opts.presetDate;
      } else {
        var hoje = new Date();
        var dia = (CAL_STATE.ano===hoje.getFullYear()&&CAL_STATE.mes===hoje.getMonth()) ? hoje.getDate() : 1;
        dataInput.value = CAL_STATE.ano+'-'+String(CAL_STATE.mes+1).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
      }
      tituloInput.value = '';
      notaInput.value = '';
      tipoBox.querySelectorAll('button').forEach(function(b,i){ if (i===0) b.click(); });
      // Reset repetição → "Não repete"
      var repBtnNone = m.querySelector('#mc-cal-modal-repeat button[data-freq="none"]');
      if (repBtnNone) repBtnNone.click();
      var radioNever = m.querySelector('input[name="mc-cal-repend"][value="never"]');
      if (radioNever) { radioNever.checked = true; radioNever.dispatchEvent(new Event('change')); }
      // Remove badge de série (se veio de edição anterior)
      var oldBadge = m.querySelector('#mc-cal-modal-series-badge');
      if (oldBadge) oldBadge.remove();

      if (ttlEl) ttlEl.textContent = 'Adicionar evento';
      if (iconEl) iconEl.innerHTML = '+';
      saveBtn.textContent = 'SALVAR EVENTO';
      delete m.dataset.editId;
    }

    m.style.display = 'flex';
    setTimeout(function(){
      m.style.opacity = '1';
      m.querySelector('#mc-cal-modal-card').style.transform = 'scale(1)';
      tituloInput.focus();
    }, 10);
  }

  function _calCloseModal() {
    var m = document.getElementById('mc-cal-modal');
    if (!m) return;
    m.style.opacity = '0';
    m.querySelector('#mc-cal-modal-card').style.transform = 'scale(0.96)';
    setTimeout(function(){ m.style.display = 'none'; }, 200);
  }

  function _calSubmit() {
    var m = document.getElementById('mc-cal-modal');
    if (!m) return;
    var data = m.querySelector('#mc-cal-modal-data').value;
    var titulo = m.querySelector('#mc-cal-modal-titulo').value.trim();
    var nota = m.querySelector('#mc-cal-modal-nota').value.trim();
    var tipo = m.querySelector('#mc-cal-modal-tipo').dataset.selected || 'custom';
    if (!data) { alert('Preencha a data.'); return; }
    if (!titulo) { alert('Preencha o título.'); return; }

    // Coleta configuração de repetição
    var freq = (m.querySelector('#mc-cal-modal-repeat') || {}).dataset;
    freq = freq ? freq.freq : 'none';
    var repeat = null;
    if (freq && freq !== 'none') {
      var endRadio = m.querySelector('input[name="mc-cal-repend"]:checked');
      var endType = endRadio ? endRadio.value : 'never';
      var endValor = null;
      if (endType === 'date') {
        endValor = m.querySelector('#mc-cal-modal-repend-date').value;
        if (!endValor) { alert('Escolha a data de término da repetição.'); return; }
      } else if (endType === 'count') {
        endValor = parseInt(m.querySelector('#mc-cal-modal-repend-count').value);
        if (!endValor || endValor < 1) { alert('Informe um número válido de ocorrências.'); return; }
      }
      repeat = { freq:freq, end:{ tipo:endType, valor:endValor } };
    }

    var editId = m.dataset.editId;
    if (editId) {
      // Edição: remove da posição antiga, adiciona na nova
      var all = _calLoadCustom();
      for (var k in all) {
        all[k] = all[k].filter(function(e){ return e.id !== editId; });
        if (all[k].length === 0) delete all[k];
      }
      if (!all[data]) all[data] = [];
      var evObj = { id:editId, tipo:tipo, titulo:titulo, nota:nota, data:data };
      if (repeat) evObj.repeat = repeat;
      all[data].push(evObj);
      _calSaveCustom(all);
    } else {
      // Criação
      var all = _calLoadCustom();
      if (!all[data]) all[data] = [];
      var id = 'c_'+Date.now()+'_'+Math.floor(Math.random()*1000);
      var evObj = { id:id, tipo:tipo, titulo:titulo, nota:nota, data:data };
      if (repeat) evObj.repeat = repeat;
      all[data].push(evObj);
      _calSaveCustom(all);
    }
    _calCloseModal();
    _calRebuildGrid(CAL_STATE.ano, CAL_STATE.mes);
  }

  function _calDelete() {
    var m = document.getElementById('mc-cal-modal');
    if (!m) return;
    var editId = m.dataset.editId;
    if (!editId) return;
    if (!confirm('Excluir este evento? Essa ação não pode ser desfeita.')) return;
    var all = _calLoadCustom();
    for (var k in all) {
      all[k] = all[k].filter(function(e){ return e.id !== editId; });
      if (all[k].length === 0) delete all[k];
    }
    _calSaveCustom(all);
    _calCloseModal();
    _calRebuildGrid(CAL_STATE.ano, CAL_STATE.mes);
  }

  // Botão "+ Adicionar evento"
  var calAddBtn = main.querySelector('.mc-cal-add');
  if (calAddBtn) calAddBtn.addEventListener('click', function(){ _calOpenModal(); });

  // Click em dia vazio → abre modal com data
  if (calGrid) {
    calGrid.addEventListener('click', function(e){
      if (e.target.closest('.mc-cev')) return; // clique em evento tratado abaixo
      var cell = e.target.closest('.mc-cd');
      if (!cell || cell.classList.contains('other')) return;
      var numEl = cell.querySelector('.mc-cdn');
      if (!numEl) return;
      var dia = parseInt(numEl.textContent.trim());
      if (isNaN(dia)) return;
      var iso = CAL_STATE.ano+'-'+String(CAL_STATE.mes+1).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
      _calOpenModal(iso);
    });

    // Click em evento editável (qualquer tipo, desde que tenha data-custom-id)
    // → abre modal em modo edição
    calGrid.addEventListener('click', function(e){
      var ev = e.target.closest('.mc-cev');
      if (!ev) return;
      var customId = ev.getAttribute('data-custom-id');
      if (!customId) return; // evento de sistema (sem id), ignora
      e.stopPropagation();
      e.preventDefault();
      _calOpenModal({ mode:'edit', editId:customId });
    }, true);
  }

  // Listeners do modal
  document.addEventListener('click', function(e){
    if (e.target.id === 'mc-cal-modal-close' || e.target.id === 'mc-cal-modal-cancel') _calCloseModal();
    else if (e.target.id === 'mc-cal-modal-save') _calSubmit();
    else if (e.target.id === 'mc-cal-modal-delete') _calDelete();
    else if (e.target.id === 'mc-cal-modal') _calCloseModal();
  });
  document.addEventListener('keydown', function(e){
    var m = document.getElementById('mc-cal-modal');
    if (!m || m.style.display === 'none') return;
    if (e.key === 'Escape') _calCloseModal();
    if (e.key === 'Enter' && e.ctrlKey) _calSubmit();
  });

  // Cursor pointer em eventos editáveis (qualquer tipo com data-custom-id)
  if (!document.getElementById('mc-cal-custom-cursor')) {
    var s = document.createElement('style');
    s.id = 'mc-cal-custom-cursor';
    s.textContent = '.mc-cal-grid .mc-cev[data-custom-id] { cursor: pointer !important; }' +
                    '.mc-cal-grid .mc-cev[data-custom-id]:hover { transform: translateX(2px); transition: transform .15s; }';
    document.head.appendChild(s);
  }

  // ── RENDER INICIAL ──
  _calRebuildGrid(CAL_STATE.ano, CAL_STATE.mes);

  // ══════════════════════════════════════════════════════════
  // EXPLORADOR DE MERCADO & CLIMA v1.0
  //   Cruzamento livre de séries: Cotações + IPCA + Dólar + Boi Futuro
  //   3 vistas: Tabela heatmap · Linhas normalizadas · Matriz correlação
  //   Períodos alinhados ao IPCA (Mês/Bimestre/Trimestre/Semestre/Ano)
  //   Engine de insights multicamada (até 5 camadas: cruzamento,
  //     correlações secundárias, anomalia, prescritivo, mudança de regime)
  //   Seed de 48 meses (Jan/2023 → Abr/2026) suporta YoY em todas janelas
  // ══════════════════════════════════════════════════════════

  var EXP_SERIES = {
    boi:         { key:'boi',         label:'Boi Gordo',        unit:'R$/@',  color:'#C0504D' },
    boi_futuro:  { key:'boi_futuro',  label:'Boi Futuro (B3)',  unit:'R$/@',  color:'#E0827E' },
    suino:       { key:'suino',       label:'Suíno Vivo',       unit:'R$/kg', color:'#2D8653' },
    frango:      { key:'frango',      label:'Frango Cong.',     unit:'R$/kg', color:'#7153A0' },
    ipca_geral:  { key:'ipca_geral',  label:'IPCA Geral',       unit:'%',     color:'#6B7280' },
    ipca_alim:   { key:'ipca_alim',   label:'IPCA Alimentação', unit:'%',     color:'#C97B2C' },
    ipca_carnes: { key:'ipca_carnes', label:'IPCA Carnes',      unit:'%',     color:'#8E3634' },
    dolar:       { key:'dolar',       label:'Dólar Comercial',  unit:'R$',    color:'#3670A0' }
  };

  // ─── Seed 48 meses Jan/2023 → Abr/2026 ─────────────────────
  var _expMesesShort = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var EXP_MESES_FULL = [];
  for (var _eY=2023; _eY<=2026; _eY++) {
    var _eS = 0, _eE = (_eY===2026) ? 3 : 11;
    for (var _eM=_eS; _eM<=_eE; _eM++) EXP_MESES_FULL.push({ano:_eY, mes:_eM, lbl:_expMesesShort[_eM]+'/'+String(_eY).slice(-2)});
  }
  function _expGen(baseStart, trend, noise, offset){
    return EXP_MESES_FULL.map(function(_, i){
      return baseStart + trend*i + Math.sin((i+offset)*0.8)*noise;
    });
  }
  var EXP_DATA = {
    boi:         _expGen(255, 2.4, 9, 0),
    boi_futuro:  _expGen(258, 2.35, 7, 0.5),
    suino:       _expGen(7.05, 0.005, 0.30, 1),
    frango:      _expGen(8.50, -0.004, 0.18, 2),
    ipca_geral:  _expGen(0.30, 0.003, 0.09, 3),
    ipca_alim:   _expGen(0.55, 0.007, 0.14, 4),
    ipca_carnes: _expGen(0.65, 0.010, 0.20, 5),
    dolar:       _expGen(4.95, 0.018, 0.20, 6)
  };

  function _expFmt(k, v) {
    if (v===null||v===undefined||isNaN(v)) return '—';
    var s = EXP_SERIES[k];
    if (k==='boi' || k==='boi_futuro') return v.toFixed(0);
    if (k==='dolar') return 'R$ '+v.toFixed(2).replace('.',',');
    if (s.unit==='%') return (v>=0?'+':'')+v.toFixed(2).replace('.',',')+'%';
    return v.toFixed(2).replace('.',',');
  }

  // ─── Builders de janela alinhados ao IPCA ──────────────────
  function _expBuildMes() {
    var N = EXP_MESES_FULL.length, start = N - 13;
    return {
      labels: EXP_MESES_FULL.slice(start).map(function(p){ return p.lbl; }),
      sliceIndices: Array.apply(null,{length:13}).map(function(_,i){ return start+i; })
    };
  }
  function _expBuildBimestre() {
    var N = EXP_MESES_FULL.length, L = EXP_MESES_FULL[N-1];
    var biStart = L.mes - (L.mes % 2);
    var points = [];
    var y = L.ano - 1, bi = biStart;
    for (var n=0; n<7; n++) {
      var s = bi, e = bi+1;
      var lbl = _expMesesShort[s].substring(0,3)+'-'+_expMesesShort[e].substring(0,3)+'/'+String(y).slice(-2);
      var idxS = -1, idxE = -1;
      for (var i=0; i<N; i++) {
        if (EXP_MESES_FULL[i].ano === y && EXP_MESES_FULL[i].mes === s) idxS = i;
        if (EXP_MESES_FULL[i].ano === y && EXP_MESES_FULL[i].mes === e) idxE = i;
      }
      if (idxS !== -1 && idxE !== -1) points.push({lbl:lbl, idxS:idxS, idxE:idxE});
      bi += 2;
      if (bi > 10) { bi = 0; y++; }
    }
    return { labels: points.map(function(p){return p.lbl;}), buckets: points.map(function(p){return [p.idxS, p.idxE];}) };
  }
  function _expBuildTrimestre() {
    var N = EXP_MESES_FULL.length, L = EXP_MESES_FULL[N-1];
    var tStart = Math.floor(L.mes/3)*3;
    var points = [];
    var y = L.ano - 2, t = tStart;
    for (var n=0; n<9; n++) {
      var qNum = Math.floor(t/3)+1;
      var lbl = qNum+'T/'+String(y).slice(-2);
      var mesesDoT = [t, t+1, t+2];
      var idxs = [];
      for (var i=0; i<N; i++) {
        if (EXP_MESES_FULL[i].ano === y && mesesDoT.indexOf(EXP_MESES_FULL[i].mes)>=0) idxs.push(i);
      }
      if (idxs.length > 0) points.push({lbl:lbl, idxs:idxs, parcial: idxs.length<3});
      t += 3;
      if (t > 9) { t = 0; y++; }
    }
    var li = points.length - 1;
    if (points[li] && points[li].parcial) points[li].lbl += '*';
    return { labels: points.map(function(p){return p.lbl;}), buckets: points.map(function(p){return p.idxs;}) };
  }
  function _expBuildSemestre() {
    var N = EXP_MESES_FULL.length, L = EXP_MESES_FULL[N-1];
    var sStart = L.mes < 6 ? 0 : 6;
    var points = [];
    var y = L.ano - 3, s = sStart;
    for (var n=0; n<7; n++) {
      var sNum = (s===0) ? 1 : 2;
      var lbl = sNum+'S/'+String(y).slice(-2);
      var mesesDoS = []; for (var m=s; m<s+6; m++) mesesDoS.push(m);
      var idxs = [];
      for (var i=0; i<N; i++) {
        if (EXP_MESES_FULL[i].ano === y && mesesDoS.indexOf(EXP_MESES_FULL[i].mes)>=0) idxs.push(i);
      }
      if (idxs.length > 0) points.push({lbl:lbl, idxs:idxs, parcial: idxs.length<6});
      s += 6;
      if (s > 6) { s = 0; y++; }
    }
    var li = points.length - 1;
    if (points[li] && points[li].parcial) points[li].lbl += '*';
    return { labels: points.map(function(p){return p.lbl;}), buckets: points.map(function(p){return p.idxs;}) };
  }
  function _expBuildAno() {
    var N = EXP_MESES_FULL.length, porAno = {};
    for (var i=0; i<N; i++) {
      var y = EXP_MESES_FULL[i].ano;
      if (!porAno[y]) porAno[y] = [];
      porAno[y].push(i);
    }
    var points = [];
    Object.keys(porAno).sort().forEach(function(yStr){
      var idxs = porAno[yStr];
      var parcial = idxs.length < 12;
      points.push({lbl: yStr + (parcial?'*':''), idxs:idxs});
    });
    return { labels: points.map(function(p){return p.lbl;}), buckets: points.map(function(p){return p.idxs;}) };
  }
  var EXP_PERIODO_BUILDERS = {
    mes: _expBuildMes, bimestre: _expBuildBimestre, trimestre: _expBuildTrimestre,
    semestre: _expBuildSemestre, ano: _expBuildAno
  };
  var EXP_PERIODO_LABELS = { mes:'Mês', bimestre:'Bimestre', trimestre:'Trimestre', semestre:'Semestre', ano:'Ano' };

  var EXP_STATE = {
    series: ['boi','boi_futuro','ipca_carnes','dolar'],
    periodo: 'mes',
    vista: 'correl'
  };

  function _expGetWindow() {
    var b = EXP_PERIODO_BUILDERS[EXP_STATE.periodo]();
    var values = {};
    if (EXP_STATE.periodo === 'mes') {
      EXP_STATE.series.forEach(function(k){
        values[k] = b.sliceIndices.map(function(i){ return EXP_DATA[k][i]; });
      });
    } else {
      EXP_STATE.series.forEach(function(k){
        values[k] = b.buckets.map(function(idxs){
          var sum = 0;
          idxs.forEach(function(i){ sum += EXP_DATA[k][i]; });
          return sum / idxs.length;
        });
      });
    }
    return { labels: b.labels, values: values };
  }

  function _expPearson(a, b) {
    if (a.length !== b.length || a.length < 2) return 0;
    var n = a.length, sA=0, sB=0;
    for (var i=0; i<n; i++){ sA+=a[i]; sB+=b[i]; }
    var mA=sA/n, mB=sB/n, num=0, dA=0, dB=0;
    for (var i=0; i<n; i++){
      var da=a[i]-mA, db=b[i]-mB;
      num+=da*db; dA+=da*da; dB+=db*db;
    }
    var d = Math.sqrt(dA*dB);
    return d===0 ? 0 : num/d;
  }

  function _expInterpretCorr(r){
    var abs = Math.abs(r);
    if (abs>=0.7) return {nivel:'forte',   texto:r>0?'forte positiva':'forte negativa'};
    if (abs>=0.4) return {nivel:'moderada',texto:r>0?'moderada positiva':'moderada negativa'};
    if (abs>=0.2) return {nivel:'fraca',   texto:r>0?'fraca positiva':'fraca negativa'};
    return                {nivel:'nula',   texto:'praticamente nula'};
  }
  function _expCorrColor(r){
    var abs = Math.abs(r);
    if (r>0){
      if(abs>=0.7) return {bg:'rgba(45,134,83,0.35)',  text:'#1F5E3A'};
      if(abs>=0.4) return {bg:'rgba(45,134,83,0.20)',  text:'#2D8653'};
      if(abs>=0.2) return {bg:'rgba(45,134,83,0.08)',  text:'#4B5563'};
    } else {
      if(abs>=0.7) return {bg:'rgba(192,80,77,0.35)',  text:'#8E3634'};
      if(abs>=0.4) return {bg:'rgba(192,80,77,0.20)',  text:'#C0504D'};
      if(abs>=0.2) return {bg:'rgba(192,80,77,0.08)',  text:'#4B5563'};
    }
    return {bg:'rgba(107,114,128,0.04)', text:'#9CA3AF'};
  }

  function _expRenderTable(win){
    if (EXP_STATE.series.length===0) return '<div style="padding:30px;text-align:center;color:#9CA3AF">Selecione ao menos 1 série.</div>';
    var html='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-family:Outfit,sans-serif;font-size:12px;min-width:720px">';
    html+='<thead><tr>';
    html+='<th style="text-align:left;padding:8px 10px;font-size:10px;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(26,39,68,0.12);position:sticky;left:0;background:rgba(255,255,255,0.95);z-index:1">Série</th>';
    win.labels.forEach(function(l,i){
      var last = i === win.labels.length-1;
      html+='<th style="text-align:right;padding:8px 6px;font-size:10px;color:'+(last?'#C9A84C':'#6B7280')+';font-weight:700;border-bottom:1px solid rgba(26,39,68,0.12);'+(last?'background:rgba(201,168,76,0.05)':'')+'">'+l+'</th>';
    });
    html+='</tr></thead><tbody>';
    EXP_STATE.series.forEach(function(sk){
      var s=EXP_SERIES[sk], vals=win.values[sk];
      var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals);
      html+='<tr>';
      html+='<td style="padding:10px;border-bottom:1px solid rgba(26,39,68,0.06);position:sticky;left:0;background:rgba(255,255,255,0.95)"><div style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:'+s.color+';flex-shrink:0"></span><span style="font-weight:600;color:#1F2937;white-space:nowrap">'+s.label+'</span><span style="font-size:10px;color:#9CA3AF">'+s.unit+'</span></div></td>';
      vals.forEach(function(v){
        var norm=(mx-mn)===0?0.5:(v-mn)/(mx-mn);
        var bg='rgba('+Math.round(201*norm+107*(1-norm))+','+Math.round(168*norm+114*(1-norm))+','+Math.round(76*norm+128*(1-norm))+','+(0.06+norm*0.22)+')';
        html+='<td style="text-align:right;padding:8px 6px;font-size:11px;font-weight:600;color:#1F2937;font-variant-numeric:tabular-nums;background:'+bg+';border-bottom:1px solid rgba(26,39,68,0.06)">'+_expFmt(sk,v)+'</td>';
      });
      html+='</tr>';
    });
    return html + '</tbody></table></div>';
  }

  function _expRenderLinesNorm(win){
    if (EXP_STATE.series.length===0) return '<div style="padding:30px;text-align:center;color:#9CA3AF">Selecione ao menos 1 série.</div>';
    var W = 1000, H = 260, padL=50, padR=80, padT=22, padB=36;
    var chartW = W-padL-padR, chartH = H-padT-padB;
    var normed = {};
    EXP_STATE.series.forEach(function(sk){
      var base = win.values[sk][0] || 1;
      normed[sk] = win.values[sk].map(function(v){ return (v/base)*100; });
    });
    var all = [];
    Object.keys(normed).forEach(function(k){ all = all.concat(normed[k]); });
    var mn = Math.floor(Math.min.apply(null,all)/2)*2 - 2;
    var mx = Math.ceil(Math.max.apply(null,all)/2)*2 + 2;
    var N = win.labels.length;
    function xPos(i){ return N===1 ? padL+chartW/2 : padL+(i/(N-1))*chartW; }
    function yPos(v){ return padT+(1-(v-mn)/(mx-mn))*chartH; }

    var svg = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" style="width:100%;height:260px;display:block;font-family:Outfit,sans-serif">';
    svg += '<defs>';
    EXP_STATE.series.forEach(function(sk){
      var s = EXP_SERIES[sk];
      svg += '<linearGradient id="exp-grad-'+sk+'" x1="0" y1="0" x2="0" y2="1">';
      svg += '<stop offset="0" stop-color="'+s.color+'" stop-opacity="0.08"/>';
      svg += '<stop offset="1" stop-color="'+s.color+'" stop-opacity="0"/>';
      svg += '</linearGradient>';
    });
    svg += '</defs>';

    for (var i=0; i<=3; i++){
      var v = mn + (mx-mn)*i/3;
      var y = yPos(v);
      svg += '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="rgba(26,39,68,0.05)" stroke-width="1"/>';
      svg += '<text x="'+(padL-8)+'" y="'+(y+3)+'" text-anchor="end" font-size="10" fill="#9CA3AF" font-weight="500">'+v.toFixed(0)+'</text>';
    }
    var y100 = yPos(100);
    if (y100 >= padT && y100 <= H-padB) {
      svg += '<line x1="'+padL+'" y1="'+y100+'" x2="'+(W-padR)+'" y2="'+y100+'" stroke="rgba(201,168,76,0.45)" stroke-width="1" stroke-dasharray="3,4"/>';
      svg += '<text x="'+(padL-8)+'" y="'+(y100+3)+'" text-anchor="end" font-size="9" fill="#C9A84C" font-weight="700">base</text>';
    }
    var maxLabels = Math.min(N, 7);
    var stepL = Math.max(1, Math.ceil(N/maxLabels));
    for (var i=0; i<N; i+=stepL){
      svg += '<text x="'+xPos(i)+'" y="'+(H-padB+14)+'" text-anchor="middle" font-size="10" fill="#9CA3AF" font-weight="500">'+win.labels[i]+'</text>';
    }
    if ((N-1) % stepL !== 0) {
      svg += '<text x="'+xPos(N-1)+'" y="'+(H-padB+14)+'" text-anchor="middle" font-size="10" fill="#9CA3AF" font-weight="500">'+win.labels[N-1]+'</text>';
    }

    EXP_STATE.series.forEach(function(sk){
      var s = EXP_SERIES[sk];
      var pathD = 'M', areaD = 'M';
      normed[sk].forEach(function(v,i){
        var x = xPos(i).toFixed(1), y = yPos(v).toFixed(1);
        pathD += (i===0?'':' L') + x+','+y;
        areaD += (i===0?'':' L') + x+','+y;
      });
      areaD += ' L'+xPos(N-1).toFixed(1)+','+(H-padB)+' L'+xPos(0).toFixed(1)+','+(H-padB)+' Z';
      svg += '<path d="'+areaD+'" fill="url(#exp-grad-'+sk+')"/>';
      svg += '<path d="'+pathD+'" stroke="'+s.color+'" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      var lastV = normed[sk][normed[sk].length-1];
      var lx = xPos(N-1), ly = yPos(lastV);
      svg += '<circle cx="'+lx+'" cy="'+ly+'" r="3" fill="'+s.color+'" stroke="#fff" stroke-width="1.5"/>';
      svg += '<text x="'+(lx+8)+'" y="'+(ly+3)+'" font-size="10" font-weight="700" fill="'+s.color+'">'+lastV.toFixed(0)+'</text>';
    });
    svg += '</svg>';

    var legend = '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid rgba(26,39,68,0.06);justify-content:center">';
    EXP_STATE.series.forEach(function(sk){
      var s = EXP_SERIES[sk];
      legend += '<div style="display:flex;align-items:center;gap:6px;font-size:11px"><span style="width:18px;height:2px;background:'+s.color+';border-radius:1px"></span><span style="color:#1F2937;font-weight:600">'+s.label+'</span><span style="color:#9CA3AF;font-size:10px">'+s.unit+'</span></div>';
    });
    legend += '</div>';

    return '<div style="width:100%">'+svg+legend+'</div>';
  }

  function _expRenderCorrelation(win){
    var keys = EXP_STATE.series;
    if (keys.length < 2) return '<div style="padding:30px;text-align:center;color:#9CA3AF">Selecione ao menos 2 séries para calcular correlações.</div>';
    var matrix = {};
    keys.forEach(function(k1){
      matrix[k1] = {};
      keys.forEach(function(k2){ matrix[k1][k2] = _expPearson(win.values[k1], win.values[k2]); });
    });
    var html = '<table style="width:100%;border-collapse:separate;border-spacing:4px;font-family:Outfit,sans-serif;font-size:11px">';
    html += '<thead><tr><th></th>';
    keys.forEach(function(k){
      var s = EXP_SERIES[k];
      html += '<th style="padding:8px 6px;font-size:9px;color:'+s.color+';font-weight:700;text-transform:uppercase;letter-spacing:0.5px;min-width:80px">'+s.label+'</th>';
    });
    html += '</tr></thead><tbody>';
    keys.forEach(function(k1){
      var s1 = EXP_SERIES[k1];
      html += '<tr><th style="padding:8px 10px;font-size:10px;color:'+s1.color+';font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:0.5px">'+s1.label+'</th>';
      keys.forEach(function(k2){
        var r = matrix[k1][k2];
        if (k1===k2){
          html += '<td style="padding:12px 8px;text-align:center;background:rgba(26,39,68,0.04);border-radius:6px;color:#9CA3AF;font-weight:700">—</td>';
        } else {
          var col = _expCorrColor(r);
          html += '<td style="padding:12px 8px;text-align:center;background:'+col.bg+';border-radius:6px;color:'+col.text+';font-weight:700;font-variant-numeric:tabular-nums">'+(r>=0?'+':'')+r.toFixed(2)+'</td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '<div style="display:flex;gap:8px;margin-top:12px;padding:8px 12px;background:rgba(26,39,68,0.03);border-radius:8px;font-size:10px;color:#6B7280;align-items:center;flex-wrap:wrap">';
    html += '<strong style="color:#1F2937">Intensidade:</strong>';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:rgba(45,134,83,0.35);border-radius:3px;vertical-align:middle;margin-right:4px"></span>Forte positiva (+0,7)</span>';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:rgba(45,134,83,0.20);border-radius:3px;vertical-align:middle;margin-right:4px"></span>Moderada (+0,4)</span>';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:rgba(192,80,77,0.20);border-radius:3px;vertical-align:middle;margin-right:4px"></span>Moderada negativa (−0,4)</span>';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:rgba(192,80,77,0.35);border-radius:3px;vertical-align:middle;margin-right:4px"></span>Forte negativa (−0,7)</span>';
    html += '</div>';
    return html;
  }

  // ─── Engine de insights multicamada ───────────────────────
  function _expGenerateInsights(win) {
    var keys = EXP_STATE.series;
    if (keys.length < 2) return '<em style="color:#9CA3AF">Selecione 2 ou mais séries para correlações e insights interpretativos.</em>';
    var periodoLbl = EXP_PERIODO_LABELS[EXP_STATE.periodo].toLowerCase();

    var pares = [];
    for (var i=0; i<keys.length; i++){
      for (var j=i+1; j<keys.length; j++){
        var r = _expPearson(win.values[keys[i]], win.values[keys[j]]);
        pares.push({a:keys[i], b:keys[j], r:r, abs:Math.abs(r)});
      }
    }
    pares.sort(function(a,b){ return b.abs - a.abs; });
    var top = pares[0];
    var topInterp = _expInterpretCorr(top.r);

    var camada1 = 'Na janela <strong>'+periodoLbl+'</strong> ('+win.labels.length+' pontos, de '+win.labels[0]+' a '+win.labels[win.labels.length-1]+'), '+
      'o cruzamento mais relevante é <strong style="color:'+EXP_SERIES[top.a].color+'">'+EXP_SERIES[top.a].label+'</strong> × '+
      '<strong style="color:'+EXP_SERIES[top.b].color+'">'+EXP_SERIES[top.b].label+'</strong> — correlação <strong>'+topInterp.texto+'</strong> '+
      '(coeficiente <strong>'+(top.r>=0?'+':'')+top.r.toFixed(2)+'</strong>). ';
    if (topInterp.nivel === 'forte') camada1 += (top.r>0 ? 'Ambas se movem juntas de forma consistente.' : 'Movem-se em direções opostas de forma consistente.');
    else if (topInterp.nivel === 'moderada') camada1 += 'Há relação visível, mas outras forças também influenciam cada série.';
    else camada1 += 'As séries se comportam de forma bastante independente.';
    var layers = [camada1];

    var outrasFortes = pares.slice(1).filter(function(p){ return p.abs >= 0.4; });
    if (outrasFortes.length > 0 && keys.length >= 3) {
      var mais = outrasFortes.slice(0, 2).map(function(p){
        var li = _expInterpretCorr(p.r);
        return '<strong style="color:'+EXP_SERIES[p.a].color+'">'+EXP_SERIES[p.a].label+'</strong> × <strong style="color:'+EXP_SERIES[p.b].color+'">'+EXP_SERIES[p.b].label+'</strong> ('+(p.r>=0?'+':'')+p.r.toFixed(2)+', '+li.texto+')';
      }).join(' · ');
      layers.push('Também notável: '+mais+'.');
    }
    if (pares.length >= 3) {
      var bot = pares[pares.length-1];
      if (bot.abs < 0.25 && top.abs > 0.5) {
        layers.push('Já <strong style="color:'+EXP_SERIES[bot.a].color+'">'+EXP_SERIES[bot.a].label+'</strong> e <strong style="color:'+EXP_SERIES[bot.b].color+'">'+EXP_SERIES[bot.b].label+'</strong> se movem de forma bastante independente ('+(bot.r>=0?'+':'')+bot.r.toFixed(2)+').');
      }
    }

    if (win.labels.length >= 3) {
      for (var ki = 0; ki < keys.length; ki++) {
        var k = keys[ki];
        var vals = win.values[k];
        var last = vals[vals.length-1], prev = vals[vals.length-2];
        var deltaLast = last - prev;
        var deltasAnt = [];
        for (var i=1; i<vals.length-1; i++) deltasAnt.push(vals[i]-vals[i-1]);
        if (deltasAnt.length === 0) continue;
        var sumDelta = 0; for (var di=0; di<deltasAnt.length; di++) sumDelta += deltasAnt[di];
        var meanDelta = sumDelta / deltasAnt.length;
        var sqDelta = 0; for (var di=0; di<deltasAnt.length; di++) sqDelta += (deltasAnt[di]-meanDelta)*(deltasAnt[di]-meanDelta);
        var stdDelta = Math.sqrt(sqDelta / deltasAnt.length);
        var zscore = stdDelta === 0 ? 0 : Math.abs((deltaLast - meanDelta) / stdDelta);
        if (zscore > 1.8) {
          var label = EXP_SERIES[k].label;
          var lastLbl = win.labels[win.labels.length-1];
          var dir = deltaLast > 0 ? 'subiu' : 'caiu';
          layers.push('<span style="color:#C97B2C">⚠</span> <strong style="color:'+EXP_SERIES[k].color+'">'+label+'</strong> '+dir+' '+Math.abs(deltaLast).toFixed(2)+(EXP_SERIES[k].unit==='%'?' p.p.':'')+' em '+lastLbl+' — variação atípica em relação ao histórico da janela.');
          break;
        }
      }
    }

    var hasBoiSpot = keys.indexOf('boi') >= 0;
    var hasBoiFut  = keys.indexOf('boi_futuro') >= 0;
    var hasDolar   = keys.indexOf('dolar') >= 0;
    var hasIpcaC   = keys.indexOf('ipca_carnes') >= 0;

    if (hasBoiSpot && hasBoiFut) {
      var vsSpot = win.values.boi[win.values.boi.length-1];
      var vsFut  = win.values.boi_futuro[win.values.boi_futuro.length-1];
      var premio = ((vsFut - vsSpot) / vsSpot) * 100;
      if (Math.abs(premio) >= 2) {
        if (premio > 0) layers.push('<span style="color:#3670A0">◉</span> <strong>Sinal de timing:</strong> Boi Futuro está <strong>'+premio.toFixed(1)+'% acima</strong> do Spot — mercado projeta alta. <strong>Antecipar compra contratual</strong> do traseiro pode proteger margem.');
        else            layers.push('<span style="color:#2D8653">◉</span> <strong>Sinal de timing:</strong> Boi Futuro está <strong>'+Math.abs(premio).toFixed(1)+'% abaixo</strong> do Spot — mercado projeta queda. <strong>Postergar compra</strong> pode capturar alívio de preço.');
      }
    }
    if (hasBoiSpot && hasIpcaC) {
      var rBoiIpca = _expPearson(win.values.boi, win.values.ipca_carnes);
      if (rBoiIpca >= 0.65) {
        layers.push('<span style="color:#C9A84C">✓</span> <strong>Padrão de repasse:</strong> Boi e IPCA Carnes têm correlação forte ('+rBoiIpca.toFixed(2)+'). Movimentos do boi se refletem no consumidor em 1-2 meses. <strong>Use o Boi como leading indicator</strong> para ajustar preço do traseiro preventivamente.');
      }
    }
    if (hasDolar && hasBoiSpot) {
      var rDolarBoi = _expPearson(win.values.dolar, win.values.boi);
      if (rDolarBoi >= 0.7) {
        layers.push('<span style="color:#3670A0">◉</span> <strong>Câmbio dominante:</strong> Dólar e Boi têm correlação alta ('+rDolarBoi.toFixed(2)+'). A demanda externa está direcionando o preço interno. <strong>Monitore cotação do dólar</strong> para antecipar movimento do boi.');
      }
    }

    if (win.labels.length >= 8 && keys.length >= 2) {
      var half = Math.floor(win.labels.length / 2);
      var valsA_old = win.values[top.a].slice(0, half);
      var valsB_old = win.values[top.b].slice(0, half);
      var valsA_new = win.values[top.a].slice(-half);
      var valsB_new = win.values[top.b].slice(-half);
      var rOld = _expPearson(valsA_old, valsB_old);
      var rNew = _expPearson(valsA_new, valsB_new);
      var diff = rNew - rOld;
      if (Math.abs(diff) >= 0.3) {
        var direction = diff > 0 ? 'fortaleceu' : 'enfraqueceu';
        layers.push('<span style="color:#7153A0">◐</span> <strong>Mudança de regime:</strong> A correlação entre <strong>'+EXP_SERIES[top.a].label+'</strong> e <strong>'+EXP_SERIES[top.b].label+'</strong> '+direction+' ao longo do período (de '+rOld.toFixed(2)+' para '+rNew.toFixed(2)+').');
      }
    }

    var html = '<div style="margin-bottom:10px;line-height:1.6">'+layers[0]+'</div>';
    if (layers.length > 1) {
      html += '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(26,39,68,0.08)">';
      for (var i=1; i<layers.length; i++) html += '<div style="font-size:12px;line-height:1.55;color:#374151">'+layers[i]+'</div>';
      html += '</div>';
    }
    return html;
  }

  // ─── Render principal + wiring ────────────────────────────
  function _expRenderAll() {
    var block = main.querySelector('#mc-exp-block');
    if (!block) return;
    var win = _expGetWindow();
    var body;
    if (EXP_STATE.vista === 'tabela')      body = _expRenderTable(win);
    else if (EXP_STATE.vista === 'linhas') body = _expRenderLinesNorm(win);
    else                                    body = _expRenderCorrelation(win);
    var insightHTML = _expGenerateInsights(win);

    block.innerHTML = ''+
      '<div style="margin-bottom:18px">' +
        '<div style="margin-bottom:12px">' +
          '<label style="display:block;font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px">Séries <span style="color:#9CA3AF;font-weight:400;text-transform:none;letter-spacing:0">(selecione 1+)</span></label>' +
          '<div id="mc-exp-series-pills" style="display:flex;gap:6px;flex-wrap:wrap"></div>' +
        '</div>' +
        '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<label style="font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1.2px">Período</label>' +
            '<div id="mc-exp-periodo-pills" style="display:flex;gap:4px"></div>' +
          '</div>' +
          '<span style="width:1px;height:20px;background:rgba(26,39,68,0.18)"></span>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<label style="font-size:10px;font-weight:700;color:#0C1425;text-transform:uppercase;letter-spacing:1.2px">Ver como</label>' +
            '<div id="mc-exp-vista-pills" style="display:flex;gap:4px"></div>' +
          '</div>' +
          '<button id="mc-exp-export" style="margin-left:auto;padding:7px 14px;background:linear-gradient(135deg,#0C1425 0%,#1A2744 100%);border:1px solid #C9A84C;border-radius:8px;color:#C9A84C;font-family:Outfit,sans-serif;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.5px">⬇ EXPORTAR CSV</button>' +
        '</div>' +
      '</div>' +
      '<div style="min-height:220px;padding:18px;background:rgba(255,255,255,0.4);border:1px solid rgba(26,39,68,0.06);border-radius:12px;margin-bottom:14px">'+body+'</div>' +
      '<div style="padding:14px 16px 14px 20px;background:linear-gradient(90deg,rgba(201,168,76,0.06) 0%,rgba(255,255,255,0) 100%);border-left:4px solid #C9A84C;border-radius:0 12px 12px 0">' +
        '<div style="display:flex;align-items:flex-start;gap:10px">' +
          '<span style="font-size:20px;line-height:1">🧭</span>' +
          '<div style="flex:1">' +
            '<div style="font-size:10px;font-weight:700;color:#C9A84C;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px">Insights · Análise contextual</div>' +
            '<div style="font-size:13px;color:#1F2937">'+insightHTML+'</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var sBox = block.querySelector('#mc-exp-series-pills');
    Object.keys(EXP_SERIES).forEach(function(k){
      var s=EXP_SERIES[k];
      var on=EXP_STATE.series.indexOf(k)>=0;
      var b=document.createElement('button');
      b.type='button';
      b.style.cssText='padding:6px 12px;border-radius:18px;border:1.5px solid '+(on?s.color:'rgba(26,39,68,0.15)')+';background:'+(on?s.color+'15':'transparent')+';color:'+(on?s.color:'#6B7280')+';font-family:Outfit,sans-serif;font-size:11px;font-weight:'+(on?'700':'500')+';cursor:pointer;transition:all .12s;display:flex;align-items:center;gap:6px';
      b.innerHTML='<span style="width:8px;height:8px;border-radius:50%;background:'+s.color+';opacity:'+(on?'1':'0.35')+'"></span>'+s.label;
      b.addEventListener('click',function(){
        var idx=EXP_STATE.series.indexOf(k);
        if (idx>=0) EXP_STATE.series.splice(idx,1);
        else EXP_STATE.series.push(k);
        _expRenderAll();
      });
      sBox.appendChild(b);
    });

    var pBox = block.querySelector('#mc-exp-periodo-pills');
    Object.keys(EXP_PERIODO_LABELS).forEach(function(key){
      var on = EXP_STATE.periodo===key;
      var b=document.createElement('button');
      b.type='button';
      b.textContent = EXP_PERIODO_LABELS[key];
      b.style.cssText='padding:5px 11px;border-radius:16px;border:1px solid '+(on?'rgba(12,20,37,0.35)':'rgba(26,39,68,0.15)')+';background:'+(on?'rgba(12,20,37,0.06)':'transparent')+';color:'+(on?'#0C1425':'#6B7280')+';font-family:Outfit,sans-serif;font-size:11px;font-weight:'+(on?'700':'500')+';cursor:pointer;transition:all .12s';
      b.addEventListener('click',function(){ EXP_STATE.periodo=key; _expRenderAll(); });
      pBox.appendChild(b);
    });

    var vBox = block.querySelector('#mc-exp-vista-pills');
    [{key:'tabela',label:'📊 Tabela'},{key:'linhas',label:'📈 Linhas norm.'},{key:'correl',label:'⚡ Correlação'}].forEach(function(opt){
      var on=EXP_STATE.vista===opt.key;
      var b=document.createElement('button');
      b.type='button';
      b.textContent=opt.label;
      b.style.cssText='padding:5px 11px;border-radius:16px;border:1px solid '+(on?'rgba(12,20,37,0.35)':'rgba(26,39,68,0.15)')+';background:'+(on?'rgba(12,20,37,0.06)':'transparent')+';color:'+(on?'#0C1425':'#6B7280')+';font-family:Outfit,sans-serif;font-size:11px;font-weight:'+(on?'700':'500')+';cursor:pointer;transition:all .12s';
      b.addEventListener('click',function(){ EXP_STATE.vista=opt.key; _expRenderAll(); });
      vBox.appendChild(b);
    });

    block.querySelector('#mc-exp-export').addEventListener('click',function(){
      var w = _expGetWindow();
      var rows=[['Período'].concat(EXP_STATE.series.map(function(k){return EXP_SERIES[k].label+' ('+EXP_SERIES[k].unit+')';}))];
      w.labels.forEach(function(lbl,i){
        var r=[lbl];
        EXP_STATE.series.forEach(function(k){ r.push(w.values[k][i].toFixed(2).replace('.',',')); });
        rows.push(r);
      });
      var csv = rows.map(function(r){return r.join(';');}).join('\n');
      var blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href=url; a.download='nexo_explorador_'+Date.now()+'.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  _expRenderAll();

});
