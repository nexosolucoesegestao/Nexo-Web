// ============================================================
// NEXO Intelligence Web — pages/mercado.js
// Mercado & Clima — v1.0
// Sessão: 16 Abr 2026
// ============================================================

Router.register('#/mercado', function() {

  // ── dados simulados (substituir por API real) ──────────────
  var MESES = ['Nov/25','Dez/25','Jan/26','Fev/26','Mar/26','Abr/26'];

  var COT_DATA = {
    boi:    { vals:[318.4,328.9,335.2,348.6,356.8,366.2], lc:'#C0504D', fc:'rgba(192,80,77,0.10)' },
    suino:  { vals:[7.42,7.38,7.51,7.30,7.16,6.96],      lc:'#2D8653', fc:'rgba(45,134,83,0.10)'  },
    frango: { vals:[8.22,8.18,8.15,8.12,8.09,8.10],      lc:'#7153A0', fc:'rgba(113,83,160,0.10)' }
  };

  var IPCA_DATA = [
    {m:'Nov/25',g:0.39,a:0.62,c:0.82},
    {m:'Dez/25',g:0.52,a:0.75,c:0.96},
    {m:'Jan/26',g:0.42,a:0.83,c:1.05},
    {m:'Fev/26',g:0.48,a:0.88,c:1.12},
    {m:'Mar/26',g:0.44,a:0.90,c:1.08},
    {m:'Abr/26*',g:0.50,a:0.71,c:0.95}
  ];

  // ── helpers ────────────────────────────────────────────────
  function fmt2(v){ return v.toFixed(2); }
  function fmt0(v){ return v.toFixed(0); }
  function fmtD(v,dec){ var s=(v>=0?'+':'')+v.toFixed(dec); return s; }
  function pct(v){ return (v>=0?'+':'')+v.toFixed(1)+'%'; }

  function varRow(data, fmtFn) {
    return data.map(function(v,i){
      if(i===0) return '<td class="mc-tna">—</td>';
      var d = v - data[i-1];
      var p = d/data[i-1]*100;
      var cls = d>0 ? 'mc-tup' : 'mc-tdn';
      var ar  = d>0 ? '▲' : '▼';
      return '<td class="'+cls+'">'+ar+' '+fmtFn(Math.abs(d))+'</td>';
    }).join('');
  }
  function pctRow(data) {
    return data.map(function(v,i){
      if(i===0) return '<td class="mc-tna">—</td>';
      var p = (v-data[i-1])/data[i-1]*100;
      var cls = p>0 ? 'mc-tup' : 'mc-tdn';
      var ar  = p>0 ? '▲' : '▼';
      return '<td class="'+cls+'">'+ar+' '+Math.abs(p).toFixed(1)+'%</td>';
    }).join('');
  }

  // ── HTML ───────────────────────────────────────────────────
  var html = '' +

  // TOOLBAR DE LOCALIZAÇÃO
  '<div class="mc-toolbar">' +
    '<span class="mc-tb-label">Localização</span>' +
    '<select class="filter-select"><option>MG — Minas Gerais</option><option>SP — São Paulo</option><option>PR — Paraná</option></select>' +
    '<select class="filter-select"><option>Patrocínio</option><option>Uberlândia</option><option>Belo Horizonte</option></select>' +
    '<button class="mc-loc-btn">📍 Usar minha localização</button>' +
    '<div class="mc-tb-sep"></div>' +
    '<span class="mc-tb-label">Histórico</span>' +
    '<select class="filter-select"><option>Últimas 6 semanas</option><option>Últimos 6 meses</option></select>' +
  '</div>' +

  // ── BLOCO 1: PAINEL DE CONTEXTO (9 cards, 1 linha) ─────────
  '<div class="section-header anim d1">' +
    '<div class="sh-dot"></div>' +
    '<span class="sh-title">Painel de Contexto</span>' +
    '<span class="sh-badge">Bate-olho · Atualizado agora</span>' +
  '</div>' +
  '<div class="section-block anim d1 mc-ctx-block">' +
    '<div class="mc-ctx-grid">' +

      // Card 1 — Clima
      _ctxCard('c1','Clima Hoje','☀️',
        '33°C','','Patrocínio · Sol · Min 19°C','wn','Sáb 36°C previsto',
        'Calor no fim de semana → demanda churrasco ALTA. Monitorar cadeia do frio.',
        'Clima Hoje','Temperatura atual na cidade selecionada. Fonte: OpenWeather API.',
        '✓ Abaixo 28°C: clima neutro','✗ Acima 32°C: atenção na cadeia do frio') +

      // Card 2 — Próxima data
      _ctxCard('c2','Próxima Data','📅',
        'Dia das Mães','sm','11 dias','wn','Alto impacto · 11/05',
        'Iniciar comunicação no balcão esta semana. Kit churrasco família.',
        'Datas Estratégicas','Próxima data comemorativa relevante para açougue e rotisseria.',
        '✓ Com 7+ dias: tempo hábil','✗ Menos de 3 dias: ação emergencial') +

      // Card 3 — Boi Gordo
      _ctxCard('c3','Boi Gordo','🐄',
        '366<span class="mc-unit">/@</span>','','',
        'up','▲ +4,2% no mês',
        'Tendência de alta — revisar preço do traseiro esta semana.',
        'Boi Gordo (CEPEA)','Cotação R$/arroba em SP. R$10/@ de alta ≈ +R$0,67/kg na carne.',
        '✓ Estável/queda: margem protegida','✗ Alta 2+ meses: revisar preço do traseiro') +

      // Card 4 — Suíno
      _ctxCard('c4','Suíno Vivo','🐷',
        '6,96<span class="mc-unit">/kg</span>','','',
        'dn','▼ -2,8% semana',
        'Janela de compra aberta — reforçar mix suíno agora.',
        'Suíno Vivo (CEPEA)','Cotação R$/kg posto SP. Base de custo para costelinha, lombo e pernil.',
        '✓ Em queda: janela de compra aberta','✗ Acima R$8,00: revisar preços') +

      // Card 5 — Frango
      _ctxCard('c5','Frango Cong.','🐔',
        '8,10<span class="mc-unit">/kg</span>','','',
        'nt','↔ Estável',
        'Margem protegida · Favorável para rotisseria.',
        'Frango Atacado (CEPEA)','Cotação R$/kg frango congelado atacado SP. Referência para rotisseria.',
        '✓ Estável: margem previsível','✗ Alta acima 10%: revisar frango assado') +

      // Card 6 — IPCA
      _ctxCard('c6','IPCA Alim.','📊',
        '+0,9%','','Acum. 12m: +8,1%',
        'up','▲ Acima da meta',
        'Consumidor pressionado — priorizar mix de valor percebido alto.',
        'IPCA Alimentação (IBGE)','Variação mensal dos preços de alimentos. 2× acima do geral = consumidor migra para cortes baratos.',
        '✓ Abaixo 0,5%/mês: pressão baixa','✗ Acima 0,8%/mês: reforce mix de valor') +

      // Card 7 — Boi Futuro B3
      _ctxCard('c7','Boi Futuro B3','📉',
        '342<span class="mc-unit">/@</span>','','Mai/26 · B3',
        'dn','▼ -6,6% vs físico',
        'Mercado prevê queda em maio — avaliar adiar compra de boi gordo.',
        'Contrato Futuro Boi (B3)','Preço que o mercado espera para o boi gordo. Futuro abaixo físico = mercado prevê queda.',
        '✓ Futuro abaixo físico: aguardar para comprar','✗ Futuro acima físico: antecipar compra agora') +

      // Card 8 — Exportação
      _ctxCard('c8','Export. Bovina','🌍',
        '+15,1%','sm','vs Abr/2025 · COMEX',
        'up','▲ Recorde Abr/26',
        'Exportação recorde → pressão de alta no boi. Antecipar compras bovinas.',
        'Exportação Carne Bovina (COMEX)','Exportação em alta = frigoríficos preferem mercado externo = boi interno tende a subir.',
        '✓ Estável/queda: oferta interna normal','✗ Em alta: boi interno tende a subir') +

      // Card 9 — Próx. Pagamento
      _ctxCard('c9','Próx. Pagamento','💰',
        'Dia 20','sm','4 dias',
        'wn','Pico de demanda',
        'Entrada de salário em 4 dias — garantir estoque de bovino e suíno antes.',
        'Calendário de Pagamentos','Dias 5, 10, 15 e último útil do mês concentram maior fluxo de compras de carne no varejo.',
        '✓ Com 3+ dias: preparar estoque antecipado','✗ Amanhã: último momento para reposição') +

    '</div>' +
  '</div>' +

  // ── BLOCO 2: ANÁLISE INTEGRADA ─────────────────────────────
  '<div class="section-header anim d1" style="margin-top:20px">' +
    '<div class="sh-dot"></div>' +
    '<span class="sh-title">Análise Integrada</span>' +
    '<span class="sh-badge">Insights cruzados · Clima × Cotações × Exportação × Sazonalidade</span>' +
  '</div>' +
  '<div class="section-block anim d1 mc-ins-block">' +
    '<div class="mc-ins-grid">' +

      '<div class="mc-ins-card mc-ins-cr">' +
        '<div class="mc-ins-type mc-cr">⚠ Crítico — Revisão de Preço</div>' +
        '<div class="mc-ins-title">Boi gordo em alta + exportação recorde. Dupla pressão no traseiro.</div>' +
        '<div class="mc-ins-body">Físico em <strong>R$366/@</strong> (+4,2% mês) com exportação <strong>+15,1%</strong> acima de Abr/25. Apesar do futuro Mai/26 a R$342, o curto prazo segue pressionado.</div>' +
        '<div class="mc-ins-action">→ Revisar alcatra, contrafilé e picanha esta semana. Monitorar futuro B3 para janela em maio.</div>' +
        '<div class="mc-ins-srcs"><span class="mc-src">CEPEA</span><span class="mc-src">B3</span><span class="mc-src">COMEX</span></div>' +
      '</div>' +

      '<div class="mc-ins-card mc-ins-op">' +
        '<div class="mc-ins-type mc-op">✓ Oportunidade — Compra + Pagamento</div>' +
        '<div class="mc-ins-title">Suíno em queda + Dia da Carne Suína + salário em 4 dias.</div>' +
        '<div class="mc-ins-body">Suíno caiu <strong>-2,8%</strong> na semana. Dia 25/04 é Dia da Carne Suína. Entrada de salário no dia 20 (4 dias) vai amplificar a demanda. Três fatores simultâneos favoráveis.</div>' +
        '<div class="mc-ins-action">→ Aumentar pedido de costelinha e lombo agora. Comunicar no balcão antes do dia 20.</div>' +
        '<div class="mc-ins-srcs"><span class="mc-src">CEPEA</span><span class="mc-src">Sazonalidade</span><span class="mc-src">Pagamentos</span></div>' +
      '</div>' +

      '<div class="mc-ins-card mc-ins-at">' +
        '<div class="mc-ins-type mc-at">◉ Atenção — Operacional + Estoque</div>' +
        '<div class="mc-ins-title">Fim de semana 36°C + pico de demanda. Dois riscos simultâneos.</div>' +
        '<div class="mc-ins-body">Sábado <strong>36°C</strong> previsto com demanda elevada de churrasco. Calor extremo eleva risco na cadeia do frio no momento de maior movimento.</div>' +
        '<div class="mc-ins-action">→ Monitorar balcão a cada 2h no sábado. Reforçar estoque de picanha, costela e linguiça.</div>' +
        '<div class="mc-ins-srcs"><span class="mc-src">Clima</span><span class="mc-src">Temperatura</span></div>' +
      '</div>' +

    '</div>' +
  '</div>' +

  // ── BLOCO 3: COTAÇÕES ───────────────────────────────────────
  '<div class="section-header anim d2">' +
    '<div class="sh-dot"></div>' +
    '<span class="sh-title">Cotações de Insumos</span>' +
    '<span class="sh-badge">CEPEA/Esalq · Atualizado diariamente 18h</span>' +
  '</div>' +
  '<div class="section-block anim d2 mc-cot-block">' +
    '<div class="mc-pills" id="mc-pills-cot">' +
      '<button class="mc-pill" data-p="dia">Dia</button>' +
      '<button class="mc-pill" data-p="semana">Semana</button>' +
      '<button class="mc-pill active" data-p="mes">Mês</button>' +
    '</div>' +
    '<div class="mc-cot-grid">' +

      // BOI
      '<div class="mc-cot-card" id="mc-card-boi">' +
        '<div class="mc-cot-head">' +
          '<span class="mc-cot-icon">🐄</span>' +
          '<span class="mc-cot-ttl">Boi Gordo</span>' +
          _hb('Boi Gordo (R$/@)','Preço por arroba no mercado paulista. R$10/@ de alta ≈ +R$0,67/kg.','✓ Estável: margem protegida','✗ Alta 2+ meses: repasse obrigatório') +
        '</div>' +
        '<div class="mc-cot-bn">366<span class="mc-unit">/@</span></div>' +
        '<div class="mc-cot-badges">' +
          '<span class="mc-badge up">▲ +4,2% mês</span>' +
          '<span class="mc-badge up">▲ +11,8% trim.</span>' +
        '</div>' +
        '<div class="mc-chart-wrap"><canvas id="mc-cvs-boi"></canvas></div>' +
        '<table class="mc-tbl" id="mc-tbl-boi"><colgroup id="mc-cg-boi"></colgroup>' +
          '<tbody>' +
            '<tr><td class="mc-tlbl">Valor</td>'   + COT_DATA.boi.vals.map(function(v){ return '<td class="mc-tval">'+fmt0(v)+'</td>'; }).join('') + '</tr>' +
            '<tr><td class="mc-tlbl">Var.</td>'    + varRow(COT_DATA.boi.vals, function(d){ return d.toFixed(1); }) + '</tr>' +
            '<tr><td class="mc-tlbl">Var.%</td>'   + pctRow(COT_DATA.boi.vals) + '</tr>' +
          '</tbody>' +
        '</table>' +
        '<div class="mc-cot-pill mc-pill-warn">⚠ Cruzar 380/@ → repassar no traseiro</div>' +
      '</div>' +

      // SUÍNO
      '<div class="mc-cot-card" id="mc-card-suino">' +
        '<div class="mc-cot-head">' +
          '<span class="mc-cot-icon">🐷</span>' +
          '<span class="mc-cot-ttl">Suíno Vivo</span>' +
          _hb('Suíno Vivo (R$/kg)','Cotação posto SP. Base de custo para costelinha, lombo e pernil.','✓ Em queda: compre mais','✗ Acima R$8,00: revisar preços') +
        '</div>' +
        '<div class="mc-cot-bn">6,96<span class="mc-unit">/kg</span></div>' +
        '<div class="mc-cot-badges">' +
          '<span class="mc-badge dn">▼ -2,8% sem.</span>' +
          '<span class="mc-badge dn">▼ -1,2% mês</span>' +
        '</div>' +
        '<div class="mc-chart-wrap"><canvas id="mc-cvs-suino"></canvas></div>' +
        '<table class="mc-tbl" id="mc-tbl-suino"><colgroup id="mc-cg-suino"></colgroup>' +
          '<tbody>' +
            '<tr><td class="mc-tlbl">Valor</td>'  + COT_DATA.suino.vals.map(function(v){ return '<td class="mc-tval">'+fmt2(v)+'</td>'; }).join('') + '</tr>' +
            '<tr><td class="mc-tlbl">Var.</td>'   + varRow(COT_DATA.suino.vals, function(d){ return d.toFixed(2); }) + '</tr>' +
            '<tr><td class="mc-tlbl">Var.%</td>'  + pctRow(COT_DATA.suino.vals) + '</tr>' +
          '</tbody>' +
        '</table>' +
        '<div class="mc-cot-pill mc-pill-opp">✓ Janela de compra — reforçar costelinha e lombo</div>' +
      '</div>' +

      // FRANGO
      '<div class="mc-cot-card" id="mc-card-frango">' +
        '<div class="mc-cot-head">' +
          '<span class="mc-cot-icon">🐔</span>' +
          '<span class="mc-cot-ttl">Frango Congelado</span>' +
          _hb('Frango Atacado (R$/kg)','Cotação frango congelado atacado SP. Referência de custo para rotisseria.','✓ Estável: margem previsível','✗ Alta acima 10%: revisar frango assado') +
        '</div>' +
        '<div class="mc-cot-bn">8,10<span class="mc-unit">/kg</span></div>' +
        '<div class="mc-cot-badges">' +
          '<span class="mc-badge nt">↔ +0,1% sem.</span>' +
          '<span class="mc-badge nt">↔ Estável 3m</span>' +
        '</div>' +
        '<div class="mc-chart-wrap"><canvas id="mc-cvs-frango"></canvas></div>' +
        '<table class="mc-tbl" id="mc-tbl-frango"><colgroup id="mc-cg-frango"></colgroup>' +
          '<tbody>' +
            '<tr><td class="mc-tlbl">Valor</td>'  + COT_DATA.frango.vals.map(function(v){ return '<td class="mc-tval">'+fmt2(v)+'</td>'; }).join('') + '</tr>' +
            '<tr><td class="mc-tlbl">Var.</td>'   + varRow(COT_DATA.frango.vals, function(d){ return d.toFixed(2); }) + '</tr>' +
            '<tr><td class="mc-tlbl">Var.%</td>'  + pctRow(COT_DATA.frango.vals) + '</tr>' +
          '</tbody>' +
        '</table>' +
        '<div class="mc-cot-pill mc-pill-ok">◎ Margem protegida · Rotisseria favorável</div>' +
      '</div>' +

    '</div>' +
  '</div>' +

  // ── BLOCO 4: IPCA ───────────────────────────────────────────
  '<div class="section-header anim d3">' +
    '<div class="sh-dot"></div>' +
    '<span class="sh-title">IPCA & Macro</span>' +
    '<span class="sh-badge">IBGE/SIDRA · Banco Central · Mensal</span>' +
  '</div>' +
  '<div class="section-block anim d3 mc-ipca-block">' +
    '<div class="mc-pills" id="mc-pills-ipca">' +
      '<button class="mc-pill">Dia</button>' +
      '<button class="mc-pill">Semana</button>' +
      '<button class="mc-pill active">Mês</button>' +
    '</div>' +
    '<div class="mc-ipca-layout">' +

      // Cards laterais
      '<div class="mc-ipca-bns">' +
        _ipca_bn('fw','Atenção','w','IPCA Geral','orange','<strong>+5,48%</strong>','Acumulado 12m · Meta: 3,5%',
          'IPCA Geral','Índice oficial de inflação do Brasil (IBGE). Meta BCB 2026: 3,5%/ano.',
          '✓ Abaixo de 4%: economia sob controle','✗ Acima de 5%: custos operacionais crescentes') +
        _ipca_bn('fr','Crítico','r','IPCA Alimentação','red','<strong>+8,1%</strong>','Acumulado 12m · Acima do geral',
          'IPCA Alimentação','Variação de preços de alimentos. 2× acima do geral = consumidor migra para cortes baratos.',
          '✓ Próximo ao geral: pressão equilibrada','✗ 2× acima: consumidor corta cortes nobres') +
        _ipca_bn('fr','Crítico','r','IPCA Carnes','red','<strong>+10,3%</strong>','Acumulado 12m · 2× acima do geral',
          'IPCA Carnes','Subcomponente específico para carnes. Quanto o consumidor final pagou a mais.',
          '✓ Abaixo de 5%: consumidor compra com conforto','✗ Acima de 8%: promova proteínas alternativas') +
        _ipca_bn('fb','Monitorar','b','Dólar Comercial','blue','<strong>R$ 5,72</strong>','Comercial venda · Banco Central',
          'Dólar Comercial (BCB)','Câmbio do BCB. Dólar alto encarece cortes exportáveis: picanha e alcatra.',
          '✓ Abaixo R$5,50: pressão cambial baixa','✗ Acima R$6,00: risco de alta nos cortes nobres') +
      '</div>' +

      // Gráfico + alertas
      '<div class="mc-ipca-chart-area">' +
        '<div class="mc-ipca-chart-ttl">Evolução mensal — últimos 6 meses</div>' +
        '<div class="mc-ipca-bars" id="mc-ipca-bars"></div>' +
        '<div class="mc-ipca-leg">' +
          '<div class="mc-il"><div class="mc-lsq" style="background:rgba(12,20,37,0.28)"></div>IPCA Geral</div>' +
          '<div class="mc-il"><div class="mc-lsq" style="background:#C97B2C"></div>IPCA Alimentação</div>' +
          '<div class="mc-il"><div class="mc-lsq" style="background:#C0504D"></div>IPCA Carnes</div>' +
        '</div>' +
        '<div id="mc-ipca-alerts"></div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  // ── BLOCO 5: CALENDÁRIO ─────────────────────────────────────
  '<div class="section-header anim d4">' +
    '<div class="sh-dot"></div>' +
    '<span class="sh-title">Calendário Estratégico</span>' +
    '<span class="sh-badge">Sazonalidade · Feriados · Pagamentos · Eventos</span>' +
  '</div>' +
  '<div class="section-block anim d4 mc-cal-block">' +
    '<div class="mc-cal-nav">' +
      '<button class="mc-cnb">‹</button>' +
      '<span class="mc-cal-month">Abril 2026</span>' +
      '<button class="mc-cnb">›</button>' +
      '<button class="mc-cal-add">+ Adicionar evento</button>' +
    '</div>' +
    '<div class="mc-cal-grid">' +
      '<div class="mc-cdow">Dom</div><div class="mc-cdow">Seg</div><div class="mc-cdow">Ter</div>' +
      '<div class="mc-cdow">Qua</div><div class="mc-cdow">Qui</div><div class="mc-cdow">Sex</div><div class="mc-cdow">Sáb</div>' +
      _cd('other','29',[]) + _cd('other','30',[]) + _cd('other','31',[]) +
      _cd('','1',[['feriado','Tira-dentes']]) +
      _cd('','2',[]) + _cd('','3',[]) +
      _cd('','4',[['clima','☀ 36°C']]) +
      _cd('','5',[['pagto','💰 Pagto. 5']]) +
      _cd('','6',[]) + _cd('','7',[]) + _cd('','8',[]) + _cd('','9',[]) +
      _cd('','10',[['feriado','Paixão de Cristo'],['pagto','💰 Pagto. 10']]) +
      _cd('','11',[]) +
      _cd('','12',[['feriado','Páscoa']]) +
      _cd('','13',[]) + _cd('','14',[]) +
      _cd('','15',[['pagto','💰 Pagto. 15']]) +
      _cd('today','16',[]) +
      _cd('','17',[]) + _cd('','18',[['clima','☀ 34°C']]) + _cd('','19',[]) +
      _cd('pagto','20',[['pagto','💰 Pagto. FGTS']]) +
      _cd('','21',[['feriado','Tiradentes']]) +
      _cd('','22',[['sazon','Dia da Terra']]) +
      _cd('','23',[['custom','Reunião Rede']]) +
      _cd('','24',[]) +
      _cd('calhov','25',[['sazon','🐷 Dia Suíno']],'tip-suino') +
      _cd('','26',[]) + _cd('','27',[]) + _cd('','28',[]) + _cd('','29',[]) +
      _cd('pagto','30',[['pagto','💰 Último útil']]) +
      _cd('other','1',[]) + _cd('other','2',[]) +
    '</div>' +

    // Legenda
    '<div class="mc-cal-legend">' +
      '<span class="mc-cev feriado">Feriado</span>' +
      '<span class="mc-cev sazon">Sazonalidade</span>' +
      '<span class="mc-cev pagto">💰 Pagamento</span>' +
      '<span class="mc-cev clima">Clima</span>' +
      '<span class="mc-cev custom">Evento próprio</span>' +
    '</div>' +

    '<div class="mc-mes-insight">' +
      '<span class="mc-mes-icon">🧭</span>' +
      '<div>' +
        '<div class="mc-mes-ttl">Análise de Abril 2026</div>' +
        '<div class="mc-mes-body"><strong>3 feriados + 5 picos de pagamento</strong> neste mês. Páscoa exige mix focado em aves e suíno. Dia da Carne Suína (25/04) + FGTS dia 20 = janela dupla para suíno. Exportação bovina recorde pressiona preço do boi no curto prazo.</div>' +
        '<div class="mc-mes-action">→ Prioridade: Suíno (preço + data + pagamento) · Aves (Páscoa + Rotisseria) · Bovino (antecipar revisão de preço)</div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  // ── BLOCO 6: EXPLORADOR ─────────────────────────────────────
  '<div class="section-header anim d5">' +
    '<div class="sh-dot"></div>' +
    '<span class="sh-title">Explorador de Dados</span>' +
    '<span class="sh-badge">Tabela pivot · Heatmap automático</span>' +
  '</div>' +
  '<div class="section-block anim d5 mc-exp-block">' +
    '<div class="mc-exp-ctrl">' +
      '<span class="mc-el">Linhas</span>' +
      '<select class="filter-select"><option>Produto</option><option>Mês</option></select>' +
      '<span class="mc-el">Colunas</span>' +
      '<select class="filter-select"><option>Mês</option><option>Semana</option></select>' +
      '<span class="mc-el">Métrica</span>' +
      '<select class="filter-select"><option>Cotação Média</option><option>Variação %</option></select>' +
      '<button class="mc-exp-export">↓ Excel</button>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table class="mc-pvt">' +
        '<thead><tr>' +
          '<th style="text-align:left">Produto</th>' +
          '<th>Nov/25</th><th>Dez/25</th><th>Jan/26</th><th>Fev/26</th><th>Mar/26</th><th>Abr/26</th>' +
          '<th style="background:rgba(201,168,76,0.22);color:#6A4C00">Média</th>' +
        '</tr></thead>' +
        '<tbody>' +
          '<tr><td>🐄 Boi Gordo (R$/@)</td><td><span class="hc n0">318,40</span></td><td><span class="hc u1">328,90</span></td><td><span class="hc u1">335,20</span></td><td><span class="hc u2">348,60</span></td><td><span class="hc u2">356,80</span></td><td><span class="hc u3">366,20</span></td><td><span class="hc u2">342,35</span></td></tr>' +
          '<tr><td>🐄 Boi Futuro B3 (R$/@)</td><td><span class="hc n0">312,00</span></td><td><span class="hc u1">318,50</span></td><td><span class="hc u1">322,00</span></td><td><span class="hc u1">330,00</span></td><td><span class="hc u1">338,00</span></td><td><span class="hc d2">342,00</span></td><td><span class="hc n0">327,08</span></td></tr>' +
          '<tr><td>🐷 Suíno Vivo (R$/kg)</td><td><span class="hc u2">7,42</span></td><td><span class="hc u1">7,38</span></td><td><span class="hc u1">7,51</span></td><td><span class="hc n0">7,30</span></td><td><span class="hc d1">7,16</span></td><td><span class="hc d2">6,96</span></td><td><span class="hc n0">7,29</span></td></tr>' +
          '<tr><td>🐔 Frango Cong. (R$/kg)</td><td><span class="hc d1">8,22</span></td><td><span class="hc n0">8,18</span></td><td><span class="hc n0">8,15</span></td><td><span class="hc n0">8,12</span></td><td><span class="hc n0">8,09</span></td><td><span class="hc n0">8,10</span></td><td><span class="hc n0">8,14</span></td></tr>' +
          '<tr><td>📊 IPCA Alim. (%)</td><td><span class="hc u1">+0,62</span></td><td><span class="hc u1">+0,75</span></td><td><span class="hc u2">+0,83</span></td><td><span class="hc u2">+0,88</span></td><td><span class="hc u2">+0,90</span></td><td><span class="hc u1">+0,71*</span></td><td><span class="hc u2">+0,78</span></td></tr>' +
        '</tbody>' +
        '<tfoot><tr>' +
          '<td>Var. Período</td><td>—</td>' +
          '<td><span class="hc u1" style="font-size:10px">+2,1%</span></td>' +
          '<td><span class="hc u1" style="font-size:10px">+1,8%</span></td>' +
          '<td><span class="hc u2" style="font-size:10px">+3,4%</span></td>' +
          '<td><span class="hc u1" style="font-size:10px">+2,3%</span></td>' +
          '<td><span class="hc u2" style="font-size:10px">+2,9%</span></td>' +
          '<td style="font-size:10px;color:var(--t3)">*parcial</td>' +
        '</tr></tfoot>' +
      '</table>' +
    '</div>' +
    '<div class="mc-heat-legend">' +
      '<span style="font-size:10px;color:var(--t3);font-weight:600">Heatmap:</span>' +
      '<span class="hc u3" style="font-size:10px;padding:2px 8px">Alta forte</span>' +
      '<span class="hc u1" style="font-size:10px;padding:2px 8px">Alta leve</span>' +
      '<span class="hc n0" style="font-size:10px;padding:2px 8px">Estável</span>' +
      '<span class="hc d1" style="font-size:10px;padding:2px 8px">Queda leve</span>' +
      '<span class="hc d3" style="font-size:10px;padding:2px 8px">Queda forte</span>' +
    '</div>' +
  '</div>' +

  // tooltip calendário (fora do fluxo)
  '<div class="mc-cal-tip" id="tip-suino">' +
    '<div class="mc-ct-title">🐷 Dia da Carne Suína</div>' +
    '<div class="mc-ct-date">Sábado, 25 de Abril · 9 dias</div>' +
    '<div class="mc-ct-body">Suíno vivo em queda (-2,8%) + FGTS dia 20 = janela dupla. Margem favorável para ação promocional com alta demanda.</div>' +
    '<div class="mc-ct-action">→ Reforçar costelinha, lombo e pernil. Comunicar no balcão antes do dia 20.</div>' +
  '</div>';

  // ── HELPER FUNCTIONS ───────────────────────────────────────

  function _hb(title, body, good, bad) {
    return '<div class="mc-hb">?<div class="mc-ht">' +
      '<div class="mc-ht-t">'+title+'</div>'+body+
      '<div class="mc-ht-g">'+good+'</div>'+
      '<div class="mc-ht-r">'+bad+'</div>'+
    '</div></div>';
  }

  function _ctxCard(cls, lbl, icon, val, valCls, sub, bdgCls, bdgTxt, insight, htTitle, htBody, htG, htR) {
    var subHtml = sub
      ? '<div class="mc-cc-sub'+(sub==='11 dias'||sub==='4 dias'?' mc-bold':'')+'">'+sub+'</div>'
      : '<div class="mc-cc-sub mc-empty">—</div>';
    return '<div class="mc-cc '+cls+'">' +
      '<div class="mc-cc-top">' +
        '<div class="mc-cc-lbl">'+lbl+'</div>' +
        '<div class="mc-cc-icons">'+_hb(htTitle,htBody,htG,htR)+'<span class="mc-cc-icon">'+icon+'</span></div>' +
      '</div>' +
      '<div class="mc-cc-val'+(valCls?' '+valCls:'')+'">'+val+'</div>' +
      subHtml +
      '<div class="mc-cc-badge-row"><span class="mc-badge '+bdgCls+'">'+bdgTxt+'</span></div>' +
      '<div class="mc-cc-insight">'+insight+'</div>' +
    '</div>';
  }

  function _ipca_bn(borderCls, farolTxt, farolCls, lbl, valColor, val, sub, htTitle, htBody, htG, htR) {
    return '<div class="mc-ibn mc-'+borderCls+'">' +
      '<div class="mc-ibn-top">' +
        '<div style="display:flex;align-items:center;gap:5px">' +
          '<div class="mc-ibn-lbl">'+lbl+'</div>' +
          _hb(htTitle,htBody,htG,htR) +
        '</div>' +
        '<div class="mc-farol mc-f'+farolCls+'"><div class="mc-fd"></div>'+farolTxt+'</div>' +
      '</div>' +
      '<div class="mc-ibn-val" style="color:var(--'+valColor+')">'+val+'</div>' +
      '<div class="mc-ibn-sub">'+sub+'</div>' +
    '</div>';
  }

  function _cd(extraCls, num, events, tipId) {
    var evHtml = events.map(function(e){ return '<div class="mc-cev '+e[0]+'">'+e[1]+'</div>'; }).join('');
    var todayNum = extraCls==='today'
      ? '<span style="background:var(--navy);color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px">'+num+'</span>'
      : num;
    var hovAttr = tipId ? ' data-tip="'+tipId+'"' : '';
    return '<div class="mc-cd '+(extraCls?extraCls:'')+'" '+hovAttr+'>' +
      '<div class="mc-cdn">'+todayNum+'</div>' +
      (evHtml ? '<div class="mc-cevts">'+evHtml+'</div>' : '') +
    '</div>';
  }

  // ── RENDER ─────────────────────────────────────────────────
  document.getElementById('page-content').innerHTML = html;

  // ── PILLS ──────────────────────────────────────────────────
  document.querySelectorAll('.mc-pills').forEach(function(g){
    g.querySelectorAll('.mc-pill').forEach(function(p){
      p.addEventListener('click', function(){
        g.querySelectorAll('.mc-pill').forEach(function(x){ x.classList.remove('active'); });
        p.classList.add('active');
      });
    });
  });

  // ── COTAÇÕES: Chart.js + alinhamento padrão Equipe ─────────
  var N = MESES.length; // 6

  function buildCotChart(id, data, lc, fc, fmtFn) {
    var cvs = document.getElementById('mc-cvs-'+id);
    var tbl = document.getElementById('mc-tbl-'+id);
    var cg  = document.getElementById('mc-cg-'+id);
    if (!cvs) return;

    var mn = Math.min.apply(null, data);
    var mx = Math.max.apply(null, data);
    var pad = (mx - mn) * 0.20 || 0.1;

    var chart = new Chart(cvs, {
      type: 'line',
      data: {
        labels: MESES,
        datasets: [{
          data: data,
          borderColor: lc,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          backgroundColor: function(ctx) {
            var g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 100);
            g.addColorStop(0, fc.replace('0.10', '0.18'));
            g.addColorStop(1, 'rgba(255,255,255,0)');
            return g;
          },
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: lc,
          pointBorderWidth: 2.5,
          pointHoverRadius: 5,
          clip: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: function(ctx){ return ' '+fmtFn(ctx.parsed.y); } }
          }
        },
        scales: {
          x: {
            display: false,
            offset: false  // pontos nas extremidades — essencial para alinhar com tabela
          },
          y: {
            display: false,
            min: mn - pad,
            max: mx + pad
          }
        },
        // padding será calculado dinamicamente após render
        layout: { padding: { top: 22, left: 0, right: 0, bottom: 0 } }
      },
      plugins: [{
        id: 'datalabels-custom',
        afterDraw: function(ch) {
          var ctx2 = ch.ctx;
          var ds = ch.data.datasets[0];
          ds.data.forEach(function(v, i) {
            var px = ch.scales.x.getPixelForValue(i);
            var py = ch.scales.y.getPixelForValue(v);
            ctx2.save();
            ctx2.font = '700 9px Outfit, sans-serif';
            ctx2.fillStyle = '#1F2937';
            ctx2.textAlign = 'center';
            ctx2.textBaseline = 'bottom';
            ctx2.fillText(fmtFn(v), px, py - 5);
            ctx2.restore();
          });
        }
      }]
    });

    // ── ALINHAMENTO GRÁFICO + TABELA (regra Dossiê v3.10) ──
    // Usa ResizeObserver para pegar largura real após render
    var observer = new ResizeObserver(function() {
      // canvas.width = pixels físicos (já inclui devicePixelRatio)
      var W = cvs.width;
      var colW = 36; // largura da coluna de label (mc-tlbl)
      var nTk = N;   // 6 meses
      var dW = (W - colW) / nTk;
      var pL = Math.round(colW + dW / 2);
      var pR = Math.round(dW / 2);

      // Atualizar padding do chart
      chart.options.layout.padding.left  = pL;
      chart.options.layout.padding.right = pR;
      chart.update('none');

      // Atualizar colgroup da tabela
      while (cg.firstChild) cg.removeChild(cg.firstChild);
      var c0 = document.createElement('col');
      c0.style.width = colW + 'px';
      cg.appendChild(c0);
      var colDataW = Math.floor(dW) + 'px';
      for (var i = 0; i < N; i++) {
        var c = document.createElement('col');
        c.style.width = colDataW;
        cg.appendChild(c);
      }

      observer.disconnect(); // basta uma vez
    });
    observer.observe(cvs.parentElement);
  }

  buildCotChart('boi',    COT_DATA.boi.vals,    COT_DATA.boi.lc,    COT_DATA.boi.fc,    fmt0);
  buildCotChart('suino',  COT_DATA.suino.vals,  COT_DATA.suino.lc,  COT_DATA.suino.fc,  fmt2);
  buildCotChart('frango', COT_DATA.frango.vals, COT_DATA.frango.lc, COT_DATA.frango.fc, fmt2);

  // ── IPCA BARS ──────────────────────────────────────────────
  (function() {
    var el = document.getElementById('mc-ipca-bars');
    if (!el) return;
    var allV = IPCA_DATA.reduce(function(a,d){ return a.concat([d.g,d.a,d.c]); }, []);
    var MX = Math.max.apply(null, allV);
    var H = 110;
    var COLS = ['rgba(12,20,37,0.28)','#C97B2C','#C0504D'];

    IPCA_DATA.forEach(function(d) {
      var vals = [d.g, d.a, d.c];
      var grp = document.createElement('div');
      grp.className = 'mc-ig';

      // rótulos acima de cada barra na sua própria sub-coluna
      var lblRow = document.createElement('div');
      lblRow.className = 'mc-ig-lbls';
      vals.forEach(function(v) {
        var l = document.createElement('div');
        l.className = 'mc-ig-lbl';
        l.textContent = '+' + v.toFixed(2);
        lblRow.appendChild(l);
      });

      var bRow = document.createElement('div');
      bRow.className = 'mc-ig-bars';
      vals.forEach(function(v, j) {
        var b = document.createElement('div');
        b.className = 'mc-ig-b';
        b.style.height = Math.max(3, Math.round(v / MX * H)) + 'px';
        b.style.background = COLS[j];
        bRow.appendChild(b);
      });

      var base = document.createElement('div');
      base.className = 'mc-ig-base';

      var lm = document.createElement('div');
      lm.className = 'mc-ig-x';
      lm.textContent = d.m;

      grp.appendChild(lblRow);
      grp.appendChild(bRow);
      grp.appendChild(base);
      grp.appendChild(lm);
      el.appendChild(grp);
    });
  })();

  // ── ALERTAS DINÂMICOS IPCA ─────────────────────────────────
  (function() {
    var ul = IPCA_DATA[IPCA_DATA.length - 1];
    var defs = [
      { cond: ul.c > 0.9,                           cls:'r', ttl:'⚠ Crítico — IPCA Carnes',      body:'Carnes sobem <strong>2× mais</strong> que a inflação geral nos últimos 6 meses. Consumidor pressionado — reforce sobrecoxa, coxão mole e linguiça.' },
      { cond: ul.a > 0.7 && (ul.a/ul.g) > 1.4,     cls:'w', ttl:'⚠ Atenção — IPCA Alimentação', body:'Alimentação subindo <strong>'+(ul.a/ul.g).toFixed(1)+'×</strong> acima do IPCA geral. Foco em itens de alto valor percebido.' },
      { cond: 5.72 > 5.5,                            cls:'b', ttl:'◉ Monitorar — Câmbio',         body:'Dólar em <strong>R$ 5,72</strong>, acima do patamar neutro de R$ 5,50. Cortes exportáveis (picanha, alcatra) podem sofrer pressão de alta.' }
    ];
    var aw = document.getElementById('mc-ipca-alerts');
    if (!aw) return;
    defs.forEach(function(a) {
      if (!a.cond) return;
      var div = document.createElement('div');
      div.className = 'mc-ial mc-ial-' + a.cls;
      div.innerHTML = '<div class="mc-ial-ttl mc-'+a.cls+'">'+a.ttl+'</div><div class="mc-ial-body">'+a.body+'</div>';
      aw.appendChild(div);
    });
  })();

  // ── TOOLTIPS CALENDÁRIO ────────────────────────────────────
  document.querySelectorAll('.mc-cd.calhov').forEach(function(day) {
    day.addEventListener('mouseenter', function(e) {
      var tip = document.getElementById(this.getAttribute('data-tip'));
      if (!tip) return;
      var r = this.getBoundingClientRect();
      tip.style.left = Math.max(8, r.left - 60) + 'px';
      tip.style.top  = (r.top + window.scrollY - 180) + 'px';
      tip.classList.add('mc-on');
    });
    day.addEventListener('mouseleave', function() {
      document.querySelectorAll('.mc-cal-tip').forEach(function(t){ t.classList.remove('mc-on'); });
    });
  });
});
