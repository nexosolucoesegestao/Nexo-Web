// ============================================================
// NEXO Intelligence Web — Engine v1.0
// Motor de inteligência rules-based (Níveis 1-5)
// Sem dependência de API de IA — roda 100% no browser
// ============================================================
window.NEXO = window.NEXO || {};

window.NEXO.engine = (() => {

    // ══════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════

    function groupBy(arr, fn) {
        return arr.reduce((acc, item) => {
            const key = typeof fn === 'string' ? item[fn] : fn(item);
            (acc[key] = acc[key] || []).push(item);
            return acc;
        }, {});
    }

    function dayOfWeek(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return d.getDay();
    }

    function dayName(dow) {
        return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dow];
    }

    function last(arr, n) { return arr.slice(-n); }

    function pct(part, total) { return total === 0 ? 0 : Math.round((part / total) * 1000) / 10; }

    function avg(arr) { return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length; }

    // ══════════════════════════════════════════════════════════
    // NÍVEL 1 — Padrões Temporais
    // "Pernil tem ruptura em 4 das 5 últimas segundas"
    // ══════════════════════════════════════════════════════════

    function analyzeTemporalPatterns(disponibilidade, produtos) {
        const insights = [];
        const prodMap = {};
        produtos.forEach(p => prodMap[p.id] = p.corte || p.id);

        const rupturas = disponibilidade.filter(d => d.tem_estoque === 'NÃO');
        const byProduto = groupBy(rupturas, 'produto_id');

        Object.entries(byProduto).forEach(([prodId, records]) => {
            const byDow = groupBy(records, r => dayOfWeek(r.data));

            Object.entries(byDow).forEach(([dow, dayRecords]) => {
                const totalDaysForDow = [...new Set(
                    disponibilidade.filter(d => d.produto_id === prodId && dayOfWeek(d.data) === parseInt(dow))
                        .map(d => d.data)
                )].length;

                const ruptureDays = [...new Set(dayRecords.map(d => d.data))].length;
                const rate = pct(ruptureDays, totalDaysForDow);

                if (rate >= 60 && ruptureDays >= 3) {
                    insights.push({
                        level: 1,
                        type: 'ruptura_recorrente',
                        severity: rate >= 80 ? 'critical' : 'warning',
                        produto: prodMap[prodId] || prodId,
                        produto_id: prodId,
                        dia: dayName(parseInt(dow)),
                        dow: parseInt(dow),
                        ocorrencias: ruptureDays,
                        total: totalDaysForDow,
                        taxa: rate,
                        acao: `Aumentar pedido de ${prodMap[prodId] || prodId} para ${dayName(parseInt(dow))}. Ruptura em ${ruptureDays} de ${totalDaysForDow} ${dayName(parseInt(dow))}s.`
                    });
                }
            });
        });

        // Padrão de indisponibilidade AT
        const semEstoqueAT = disponibilidade.filter(d => d.tem_estoque === 'SIM' && d.disponivel_at === 'NÃO');
        const byProdAT = groupBy(semEstoqueAT, 'produto_id');

        Object.entries(byProdAT).forEach(([prodId, records]) => {
            const totalComEstoque = disponibilidade.filter(d => d.produto_id === prodId && d.tem_estoque === 'SIM').length;
            const rate = pct(records.length, totalComEstoque);

            if (rate >= 15 && records.length >= 5) {
                insights.push({
                    level: 1,
                    type: 'indisponibilidade_at',
                    severity: 'warning',
                    produto: prodMap[prodId] || prodId,
                    taxa: rate,
                    ocorrencias: records.length,
                    acao: `${prodMap[prodId] || prodId} tem estoque mas não chega ao balcão AT em ${rate}% das vezes. Verificar fluxo de reposição.`
                });
            }
        });

        return insights.sort((a, b) => b.taxa - a.taxa);
    }

    // ══════════════════════════════════════════════════════════
    // NÍVEL 2 — Correlações Operacionais
    // "Costela exposta na segunda, quebra na quarta"
    // ══════════════════════════════════════════════════════════

    function analyzeCorrelations(disponibilidade, quebra, presenca, produtos) {
        const insights = [];
        const prodMap = {};
        produtos.forEach(p => prodMap[p.id] = p.corte || p.id);

        // Correlação: disponibilidade → quebra (produto exposto D, quebra D+2/D+3)
        const quebraByProd = groupBy(quebra, 'produto_id');
        const dispByProd = groupBy(disponibilidade.filter(d => d.tem_estoque === 'SIM'), 'produto_id');

        Object.entries(quebraByProd).forEach(([prodId, quebras]) => {
            if (quebras.length < 3) return;
            const quebraDates = quebras.map(q => q.data);
            const dispDates = (dispByProd[prodId] || []).map(d => d.data);

            let correlatedCount = 0;
            quebraDates.forEach(qd => {
                const qdDate = new Date(qd + 'T12:00:00');
                for (let offset = 1; offset <= 3; offset++) {
                    const checkDate = new Date(qdDate);
                    checkDate.setDate(checkDate.getDate() - offset);
                    const checkStr = checkDate.toISOString().slice(0, 10);
                    if (dispDates.includes(checkStr)) { correlatedCount++; break; }
                }
            });

            const rate = pct(correlatedCount, quebras.length);
            if (rate >= 50 && correlatedCount >= 3) {
                insights.push({
                    level: 2,
                    type: 'exposicao_quebra',
                    severity: 'warning',
                    produto: prodMap[prodId] || prodId,
                    correlacao: rate,
                    ocorrencias: correlatedCount,
                    acao: `${prodMap[prodId] || prodId}: ${rate}% das quebras ocorrem 1-3 dias após exposição. Ação: reduzir batch de exposição.`
                });
            }
        });

        // Correlação: faltas → ruptura (dias com falta têm mais ruptura?)
        const presByDate = groupBy(presenca, 'data');
        const dispByDate = groupBy(disponibilidade, 'data');

        let diasComFalta = 0, rupturaComFalta = 0, rupturaSemFalta = 0, diasSemFalta = 0;

        Object.entries(dispByDate).forEach(([data, disps]) => {
            const presDay = presByDate[data] || [];
            const faltas = presDay.filter(p => !p.presente).length;
            const totalRuptura = disps.filter(d => d.tem_estoque === 'NÃO').length;
            const totalDisp = disps.length;

            if (faltas > 0) {
                diasComFalta++;
                rupturaComFalta += pct(totalRuptura, totalDisp);
            } else {
                diasSemFalta++;
                rupturaSemFalta += pct(totalRuptura, totalDisp);
            }
        });

        const avgRuptComFalta = diasComFalta > 0 ? rupturaComFalta / diasComFalta : 0;
        const avgRuptSemFalta = diasSemFalta > 0 ? rupturaSemFalta / diasSemFalta : 0;

        if (avgRuptComFalta > avgRuptSemFalta * 1.3 && diasComFalta >= 3) {
            insights.push({
                level: 2,
                type: 'falta_ruptura',
                severity: 'warning',
                taxaComFalta: Math.round(avgRuptComFalta * 10) / 10,
                taxaSemFalta: Math.round(avgRuptSemFalta * 10) / 10,
                acao: `Dias com faltas de funcionários têm ${Math.round(avgRuptComFalta * 10) / 10}% de ruptura vs ${Math.round(avgRuptSemFalta * 10) / 10}% nos dias completos. Plano de contingência recomendado.`
            });
        }

        return insights;
    }

    // ══════════════════════════════════════════════════════════
    // NÍVEL 3 — Impacto Financeiro
    // "Quebra de costela: R$420 em 4 semanas"
    // ══════════════════════════════════════════════════════════

    function analyzeFinancialImpact(quebra, disponibilidade, produtos) {
        const insights = [];
        const prodMap = {};
        produtos.forEach(p => prodMap[p.id] = p.corte || p.id);

        // Total de quebra por produto em R$
        const quebraByProd = groupBy(quebra, 'produto_id');
        const quebraRanking = Object.entries(quebraByProd).map(([prodId, records]) => {
            const totalValor = records.reduce((sum, r) => sum + (parseFloat(r.valor_estimado) || 0), 0);
            const totalPeso = records.reduce((sum, r) => sum + (parseFloat(r.peso_kg) || 0), 0);
            return {
                produto: prodMap[prodId] || prodId,
                produto_id: prodId,
                valor: Math.round(totalValor * 100) / 100,
                peso: Math.round(totalPeso * 100) / 100,
                ocorrencias: records.length
            };
        }).sort((a, b) => b.valor - a.valor);

        const totalQuebra = quebraRanking.reduce((s, r) => s + r.valor, 0);

        if (quebraRanking.length > 0) {
            insights.push({
                level: 3,
                type: 'quebra_total',
                severity: totalQuebra > 2000 ? 'critical' : totalQuebra > 800 ? 'warning' : 'info',
                valor: Math.round(totalQuebra * 100) / 100,
                ranking: quebraRanking.slice(0, 5),
                acao: `Quebra total no período: R$ ${totalQuebra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Top 3: ${quebraRanking.slice(0, 3).map(r => r.produto).join(', ')}.`
            });
        }

        // Custo estimado de ruptura (venda perdida)
        const totalDisp = disponibilidade.length;
        const totalRuptura = disponibilidade.filter(d => d.tem_estoque === 'NÃO').length;
        const taxaRuptura = pct(totalRuptura, totalDisp);
        const PRECO_MEDIO_KG = 42;
        const VENDA_MEDIA_KG_DIA = 2.5;
        const vendaPerdidaEstimada = totalRuptura * VENDA_MEDIA_KG_DIA * PRECO_MEDIO_KG * 0.3;

        if (vendaPerdidaEstimada > 500) {
            insights.push({
                level: 3,
                type: 'venda_perdida',
                severity: vendaPerdidaEstimada > 5000 ? 'critical' : 'warning',
                valor: Math.round(vendaPerdidaEstimada),
                taxaRuptura: taxaRuptura,
                totalRupturas: totalRuptura,
                acao: `Venda perdida estimada por ruptura: R$ ${Math.round(vendaPerdidaEstimada).toLocaleString('pt-BR')}. Taxa de ruptura: ${taxaRuptura}%.`
            });
        }

        return insights;
    }

    // ══════════════════════════════════════════════════════════
    // NÍVEL 4 — Score Preditivo
    // "Amanhã é segunda. Risco ruptura: Pernil 85%"
    // ══════════════════════════════════════════════════════════

    function analyzePredictiveScore(disponibilidade, produtos) {
        const insights = [];
        const prodMap = {};
        produtos.forEach(p => prodMap[p.id] = p.corte || p.id);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDow = tomorrow.getDay();
        const tomorrowName = dayName(tomorrowDow);

        if (tomorrowDow === 0) return insights;

        const byProduto = groupBy(disponibilidade, 'produto_id');
        const predictions = [];

        Object.entries(byProduto).forEach(([prodId, records]) => {
            const sameDow = records.filter(r => dayOfWeek(r.data) === tomorrowDow);
            if (sameDow.length < 3) return;

            const rupturas = sameDow.filter(r => r.tem_estoque === 'NÃO').length;
            const riskScore = pct(rupturas, sameDow.length);

            if (riskScore >= 40) {
                predictions.push({
                    produto: prodMap[prodId] || prodId,
                    produto_id: prodId,
                    risco: riskScore,
                    historico: `${rupturas}/${sameDow.length} ${tomorrowName}s`
                });
            }
        });

        predictions.sort((a, b) => b.risco - a.risco);

        if (predictions.length > 0) {
            insights.push({
                level: 4,
                type: 'previsao_ruptura',
                severity: predictions[0].risco >= 70 ? 'critical' : 'warning',
                dia: tomorrowName,
                predictions: predictions.slice(0, 5),
                acao: `Amanhã (${tomorrowName}): ${predictions.length} produtos com risco elevado de ruptura. Top: ${predictions.slice(0, 3).map(p => `${p.produto} (${p.risco}%)`).join(', ')}.`
            });
        }

        return insights;
    }

    // ══════════════════════════════════════════════════════════
    // NÍVEL 5 — Mercado + Clima (dados simulados na v1)
    // "CEPEA mostra queda de 3% no suíno"
    // ══════════════════════════════════════════════════════════

    function analyzeMarketClimate() {
        const insights = [];

        // Dados simulados — na v2, virão de web scraping CEPEA + API clima
        const mercado = {
            boi_gordo: { preco: 312.50, variacao: -1.8 },
            suino_vivo: { preco: 8.45, variacao: -3.2 },
            frango_congelado: { preco: 7.20, variacao: 0.5 },
            atacado_traseiro: { preco: 22.80, variacao: -2.1 },
            atacado_dianteiro: { preco: 16.50, variacao: 1.3 },
        };

        const clima = {
            temperatura_max: 34,
            previsao: 'Ensolarado, máxima 34°C',
            fim_de_semana: 'Sol com nuvens, máx 32°C'
        };

        // Oportunidades de compra
        Object.entries(mercado).forEach(([item, data]) => {
            if (data.variacao <= -2.5) {
                const nomeFormatado = item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                insights.push({
                    level: 5,
                    type: 'oportunidade_compra',
                    severity: 'info',
                    item: nomeFormatado,
                    preco: data.preco,
                    variacao: data.variacao,
                    acao: `${nomeFormatado} caiu ${Math.abs(data.variacao)}% na semana. Oportunidade de compra para melhorar margem.`
                });
            }
        });

        // Clima quente = mais churrasco
        if (clima.temperatura_max >= 32) {
            insights.push({
                level: 5,
                type: 'clima_oportunidade',
                severity: 'info',
                temperatura: clima.temperatura_max,
                previsao: clima.previsao,
                acao: `Previsão ${clima.temperatura_max}°C — reforçar mix de churrasco: costela, linguiça, picanha. Fim de semana: ${clima.fim_de_semana}.`
            });
        }

        return { insights, mercado, clima };
    }

    // ══════════════════════════════════════════════════════════
    // SCORECARD — Nota consolidada por loja
    // ══════════════════════════════════════════════════════════

    function calculateScorecard(disponibilidade, quebra, temperatura, presenca, lojaId) {
        const dispLoja = lojaId ? disponibilidade.filter(d => d.loja_id === lojaId) : disponibilidade;
        const quebraLoja = lojaId ? quebra.filter(q => q.loja_id === lojaId) : quebra;
        const tempLoja = lojaId ? temperatura.filter(t => t.loja_id === lojaId) : temperatura;
        const presLoja = lojaId ? presenca.filter(p => p.loja_id === lojaId) : presenca;

        // Ruptura: % sem estoque (menor = melhor)
        const totalDisp = dispLoja.length;
        const rupturas = dispLoja.filter(d => d.tem_estoque === 'NÃO').length;
        const taxaRuptura = pct(rupturas, totalDisp);
        const notaRuptura = Math.max(0, 100 - (taxaRuptura * 4));

        // Disponibilidade AT: % com estoque E no balcão
        const comEstoque = dispLoja.filter(d => d.tem_estoque === 'SIM');
        const noAT = comEstoque.filter(d => d.disponivel_at === 'SIM').length;
        const notaDisponibilidade = pct(noAT, comEstoque.length);

        // Quebra: valor/dia (menor = melhor)
        const dias = [...new Set(quebraLoja.map(q => q.data))].length || 1;
        const totalQuebraValor = quebraLoja.reduce((s, q) => s + (parseFloat(q.valor_estimado) || 0), 0);
        const quebraDia = totalQuebraValor / dias;
        const notaQuebra = Math.max(0, 100 - (quebraDia * 0.8));

        // Temperatura: % dentro da faixa
        const FAIXAS = {
            'Câmara Fria': { min: -2, max: 4 },
            'Balcão Refrigerado': { min: 0, max: 8 },
            'Balcão Congelados': { min: -25, max: -12 }
        };
        const tempConformes = tempLoja.filter(t => {
            const faixa = FAIXAS[t.equipamento];
            if (!faixa) return true;
            return t.temperatura >= faixa.min && t.temperatura <= faixa.max;
        }).length;
        const notaTemperatura = pct(tempConformes, tempLoja.length);

        // Presença: % presentes
        const presentes = presLoja.filter(p => p.presente).length;
        const notaPresenca = pct(presentes, presLoja.length);

        // Score final ponderado
        const score = Math.round(
            notaRuptura * 0.25 +
            notaDisponibilidade * 0.20 +
            notaQuebra * 0.20 +
            notaTemperatura * 0.20 +
            notaPresenca * 0.15
        );

        return {
            score,
            ruptura: { taxa: taxaRuptura, nota: Math.round(notaRuptura), total: rupturas, registros: totalDisp },
            disponibilidade: { taxa: pct(noAT, comEstoque.length), nota: Math.round(notaDisponibilidade) },
            quebra: { valorTotal: Math.round(totalQuebraValor), porDia: Math.round(quebraDia), nota: Math.round(notaQuebra), ocorrencias: quebraLoja.length },
            temperatura: { conformidade: pct(tempConformes, tempLoja.length), nota: Math.round(notaTemperatura), anomalias: tempLoja.length - tempConformes },
            presenca: { taxa: pct(presentes, presLoja.length), nota: Math.round(notaPresenca) }
        };
    }

    // ══════════════════════════════════════════════════════════
    // BRIEFING — Gera briefing estruturado para o Copiloto
    // ══════════════════════════════════════════════════════════

    function generateBriefing(data) {
        const { disponibilidade, quebra, temperatura, presenca, produtos, lojas } = data;

        const n1 = analyzeTemporalPatterns(disponibilidade, produtos);
        const n2 = analyzeCorrelations(disponibilidade, quebra, presenca, produtos);
        const n3 = analyzeFinancialImpact(quebra, disponibilidade, produtos);
        const n4 = analyzePredictiveScore(disponibilidade, produtos);
        const { insights: n5, mercado, clima } = analyzeMarketClimate();

        const allInsights = [...n1, ...n2, ...n3, ...n4, ...n5];
        const critical = allInsights.filter(i => i.severity === 'critical');
        const warnings = allInsights.filter(i => i.severity === 'warning');
        const info = allInsights.filter(i => i.severity === 'info');

        // Scorecard geral
        const scorecard = calculateScorecard(disponibilidade, quebra, temperatura, presenca);

        // Scorecard por loja
        const scorecardLojas = lojas.map(loja => ({
            loja: loja,
            ...calculateScorecard(disponibilidade, quebra, temperatura, presenca, loja.id)
        })).sort((a, b) => b.score - a.score);

        return {
            geradoEm: new Date().toISOString(),
            scorecard,
            scorecardLojas,
            alertas: critical,
            atencao: warnings,
            oportunidades: info,
            insights: { n1, n2, n3, n4, n5 },
            mercado,
            clima,
            totalInsights: allInsights.length
        };
    }

    return {
        analyzeTemporalPatterns, analyzeCorrelations, analyzeFinancialImpact,
        analyzePredictiveScore, analyzeMarketClimate, calculateScorecard,
        generateBriefing, groupBy, pct, dayName
    };
})();
