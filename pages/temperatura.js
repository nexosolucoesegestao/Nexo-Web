/* ══════════════════════════════════════════════════════════════
   TEMPERATURA — CSS CLASSES (tmp-*) — PATCH v2 CORRIGIDO
   Resolve: padding, cores claras, fontes, espaçamento
   Adicionar ao final do styles.css (SUBSTITUI o patch anterior)
   ══════════════════════════════════════════════════════════════ */

/* ── Section block accents (::before) ── */
.section-block.frost::before{background:linear-gradient(180deg,#93C5FD,#3B82F6,#1E40AF)}
.section-block.leit::before{background:linear-gradient(180deg,#86EFAC,#2D8653,#3670A0,#7153A0)}

/* ══════════════════════════════════════════════════════════════
   BLOCO 1: Termometros
   ══════════════════════════════════════════════════════════════ */
.tmp-thermo-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:0 20px 20px}
.tmp-tc{display:flex;align-items:stretch;border-radius:14px;border:1px solid rgba(0,0,0,.05);overflow:hidden;transition:box-shadow .3s,transform .25s;background:#fff}
.tmp-tc:hover{box-shadow:0 8px 28px rgba(12,20,37,.08);transform:translateY(-2px)}
.tmp-tc-thermo{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 14px 12px;position:relative;min-width:90px}
.tmp-tc-thermo::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.tmp-tc.balcao .tmp-tc-thermo{background:rgba(45,134,83,.04)}.tmp-tc.balcao .tmp-tc-thermo::before{background:linear-gradient(90deg,#86EFAC,#2D8653)}
.tmp-tc.resf .tmp-tc-thermo{background:rgba(54,112,160,.04)}.tmp-tc.resf .tmp-tc-thermo::before{background:linear-gradient(90deg,#93C5FD,#3670A0)}
.tmp-tc.cong .tmp-tc-thermo{background:rgba(113,83,160,.04)}.tmp-tc.cong .tmp-tc-thermo::before{background:linear-gradient(90deg,#C4B5FD,#7153A0)}
.tmp-tc-label{font-size:11px;font-weight:700;color:#4B5563;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;text-align:center;line-height:1.2}
.tmp-tc-faixa{font-size:10px;color:#6B7280;font-weight:500;display:block;margin-top:2px}
.tmp-tc-big{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;margin-top:4px}
.tmp-tc-big.ok{color:var(--green)}.tmp-tc-big.warn{color:var(--orange)}.tmp-tc-big.danger{color:var(--red)}
.tmp-tc-unit{font-size:14px;font-weight:500;color:#6B7280}
.tmp-tc-divider{width:1px;background:rgba(0,0,0,.06);margin:10px 0}
.tmp-tc-metrics{flex:1;display:flex;flex-direction:column;justify-content:center;padding:14px 16px;gap:10px}
.tmp-tc-comp{display:flex;align-items:center;gap:8px}
.tmp-tc-comp-label{font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:.3px;line-height:1.2}
.tmp-tc-comp-val{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
.tmp-tc-comp-val.up{color:var(--red)}.tmp-tc-comp-val.down-good{color:var(--green)}.tmp-tc-comp-val.stable{color:#6B7280}
.tmp-tc-conf{display:flex;align-items:center;gap:10px}
.tmp-tc-donut-wrap{position:relative;width:48px;height:48px;flex-shrink:0}
.tmp-tc-donut-wrap canvas{width:48px;height:48px}
.tmp-tc-donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
.tmp-tc-conf-meta{display:flex;flex-direction:column;gap:2px}
.tmp-tc-conf-label{font-size:11px;color:#4B5563;font-weight:600;text-transform:uppercase;letter-spacing:.3px}
.tmp-tc-conf-detail{font-size:12px;color:#374151;font-weight:500}

/* ══════════════════════════════════════════════════════════════
   BLOCO 2: Tendencia Conformidade
   ══════════════════════════════════════════════════════════════ */
.tmp-trend-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:0 20px 20px}
.tmp-trend-card{background:rgba(255,255,255,.6);border:1px solid rgba(0,0,0,.04);border-radius:14px;padding:16px 14px 10px;display:flex;flex-direction:column}
.tmp-trc-title{font-size:11px;font-weight:700;color:#4B5563;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.tmp-trc-bn-row{display:flex;align-items:baseline;gap:8px;margin-bottom:10px}
.tmp-trc-bn{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}
.tmp-trc-bn.ok{color:var(--green)}.tmp-trc-bn.warn{color:var(--orange)}.tmp-trc-bn.danger{color:var(--red)}
.tmp-trc-var{font-size:12px;font-weight:700;padding:2px 8px;border-radius:10px}
.tmp-trc-var.up-bad{background:rgba(192,80,77,.1);color:var(--red)}
.tmp-trc-var.down-good{background:rgba(45,134,83,.1);color:var(--green)}
.tmp-trc-var.stable{background:rgba(107,114,128,.1);color:#6B7280}
.tmp-trc-chart{height:120px;margin-bottom:4px;position:relative}
.tmp-trc-tbl{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
.tmp-trc-tbl td{padding:3px 0;text-align:center;font-variant-numeric:tabular-nums;vertical-align:middle;color:#374151}
.tmp-trc-tbl td:first-child{text-align:left;font-weight:700;color:#6B7280;width:52px;font-size:10px;text-transform:uppercase;letter-spacing:.3px}

/* Variation colors in tables */
.v-up{color:var(--red);font-weight:700}.v-down{color:var(--green);font-weight:700}.v-eq{color:#6B7280}

/* ══════════════════════════════════════════════════════════════
   BLOCO 2B: Leituras Matrix
   ══════════════════════════════════════════════════════════════ */
.tmp-matrix{display:grid;grid-template-columns:140px repeat(3,1fr);gap:0;padding:0 20px 10px}
.tmp-mcol-h{font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.4px;text-align:center;padding:0 0 10px}
.tmp-mcol-sp{}
.tmp-mrow-label{display:flex;flex-direction:column;justify-content:center;padding:8px 12px 8px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.tmp-mrow-label:last-of-type{border-bottom:none}
.tmp-mrl-name{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#1F2937}
.tmp-mrl-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.tmp-mrl-faixa{font-size:11px;font-weight:500;color:#6B7280;margin-top:2px;margin-left:14px}
.tmp-mcell{padding:6px;border-bottom:1px solid rgba(0,0,0,.04);border-left:1px solid rgba(0,0,0,.03)}
.tmp-mcell.last{border-bottom:none}
.tmp-mcell-inner{height:78px;background:rgba(255,255,255,.5);border-radius:8px;border:1px solid rgba(0,0,0,.04);padding:4px}
.tmp-mlegend{display:flex;justify-content:center;gap:18px;padding:0 20px;margin-top:8px;font-size:11px;color:#6B7280;font-weight:500}
.tmp-mleg-item{display:flex;align-items:center;gap:5px}
.tmp-mleg-zone{width:16px;height:8px;border-radius:2px;background:rgba(45,134,83,.18);border:1px dashed rgba(45,134,83,.5)}
.tmp-mleg-dot{width:7px;height:7px;border-radius:50%;border:1.5px solid #fff;box-shadow:0 0 0 .5px rgba(0,0,0,.15)}

/* ══════════════════════════════════════════════════════════════
   BLOCO 3: Mapa Conformidade
   ══════════════════════════════════════════════════════════════ */
.tmp-bn-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 20px}
.tmp-bn-table{width:100%;border-collapse:separate;border-spacing:3px;font-size:13px}
.tmp-bn-table th{background:var(--navy);color:#fff;font-weight:600;font-size:12px;padding:8px 6px;text-align:center;white-space:nowrap;border-radius:5px}
.tmp-bn-table th:first-child{text-align:left;padding-left:12px;min-width:120px}
.tmp-bn-table td{padding:8px 4px;text-align:center;border-radius:5px;vertical-align:middle}
.tmp-bn-table td:first-child{text-align:left;padding-left:12px;background:rgba(255,255,255,.7);font-weight:600;color:#1F2937;font-size:13px}
.tmp-cell-ok{background:rgba(45,134,83,.08)}.tmp-cell-nok{background:rgba(192,80,77,.08)}.tmp-cell-na{background:rgba(0,0,0,.02)}
.tmp-farol{display:inline-block;width:12px;height:12px;border-radius:50%;cursor:pointer;transition:transform .15s,box-shadow .15s}
.tmp-farol:hover{transform:scale(1.4);box-shadow:0 0 0 3px rgba(0,0,0,.06)}
.tmp-farol-ok{background:var(--green);box-shadow:0 0 0 2px rgba(45,134,83,.15)}
.tmp-farol-nok{background:var(--red);box-shadow:0 0 0 2px rgba(192,80,77,.15)}
.tmp-farol-na{background:#D1D5DB;cursor:default}.tmp-farol-na:hover{transform:none;box-shadow:none}

/* Tooltip */
.tmp-bn-tooltip{position:fixed;z-index:1000;background:rgba(12,20,37,.94);color:#fff;border-radius:8px;padding:8px 12px;font-size:12px;font-family:'Outfit',sans-serif;pointer-events:none;opacity:0;transition:opacity .15s;max-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.2);line-height:1.5}
.tmp-bn-tooltip.show{opacity:1}
.tmp-tt-date{font-weight:700;font-size:13px;margin-bottom:4px;color:#E5E7EB}
.tmp-tt-row{display:flex;align-items:center;gap:6px;font-size:12px}
.tmp-tt-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.tmp-tt-val{font-weight:700;font-variant-numeric:tabular-nums}
.tmp-tt-ok{color:#86EFAC}.tmp-tt-nok{color:#FCA5A5}
.tmp-tt-label{color:#9CA3AF;font-weight:400}

/* Legend */
.tmp-bn-legend{display:flex;gap:18px;padding:0 20px;margin-top:12px;font-size:12px;color:#4B5563;font-weight:500}
.tmp-bn-legend-item{display:flex;align-items:center;gap:6px}
.tmp-leg-d{width:10px;height:10px;border-radius:50%}

/* ══════════════════════════════════════════════════════════════
   BLOCO 4: Ranking
   ══════════════════════════════════════════════════════════════ */
.tmp-rk-grid{display:grid;grid-template-columns:30px 120px 1fr 12px 1fr 12px 1fr;align-items:center;padding:0 20px}
.tmp-rk-col-head{display:flex;align-items:center;justify-content:center;gap:5px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.3px;padding-bottom:12px}
.tmp-rk-col-head-left{justify-content:flex-start;padding-left:2px}
.tmp-rk-eq-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.tmp-rk-col-sep{padding-bottom:12px}
.tmp-rk-divider{grid-column:1/-1;height:2px;background:rgba(0,0,0,.06);margin-bottom:10px}
.tmp-rk-total-row{display:grid;grid-template-columns:30px 120px 1fr 12px 1fr 12px 1fr;align-items:center;background:rgba(12,20,37,.03);border-radius:10px;padding:12px 20px;margin:0 20px 12px}
.tmp-rk-total-label{grid-column:1/3;font-size:13px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.5px}
.tmp-rk-eq{display:flex;align-items:center;gap:8px;padding:0 6px}
.tmp-rk-bar-wrap{flex:1;height:7px;background:rgba(0,0,0,.04);border-radius:4px;overflow:hidden;min-width:50px}
.tmp-rk-bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
.tmp-rk-pct{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;min-width:40px;text-align:right}
.tmp-rk-var{font-size:11px;font-weight:600;padding:2px 7px;border-radius:8px;min-width:58px;text-align:center;white-space:nowrap}
.tmp-rk-var.up{background:rgba(45,134,83,.1);color:var(--green)}.tmp-rk-var.down{background:rgba(192,80,77,.1);color:var(--red)}.tmp-rk-var.eq{background:rgba(107,114,128,.08);color:#6B7280}
.tmp-rk-sep{display:flex;justify-content:center;align-items:center}.tmp-rk-sep-line{width:1px;height:28px;background:rgba(0,0,0,.06)}
.tmp-rk-data-row{display:grid;grid-template-columns:30px 120px 1fr 12px 1fr 12px 1fr;align-items:center;padding:10px 20px;border-bottom:1px solid rgba(0,0,0,.04);transition:background .15s;border-radius:6px}
.tmp-rk-data-row:hover{background:rgba(255,255,255,.7)}.tmp-rk-data-row:last-child{border-bottom:none}
.tmp-rk-pos{text-align:center;font-size:13px;font-weight:700;color:#6B7280;font-variant-numeric:tabular-nums}
.tmp-rk-loja{font-size:14px;font-weight:600;color:#1F2937;padding-left:2px}
.tmp-rk-total-row .tmp-rk-bar-wrap{height:9px}.tmp-rk-total-row .tmp-rk-pct{font-size:16px;font-weight:800}.tmp-rk-total-row .tmp-rk-var{font-size:12px;font-weight:700}

/* ══════════════════════════════════════════════════════════════
   PILLS override (temperatura-specific, higher specificity)
   ══════════════════════════════════════════════════════════════ */
.section-block .eq-pills{padding:0 20px 14px;display:flex;gap:6px;flex-wrap:wrap}
.section-block .eq-pill{font-size:12px;font-weight:600;padding:5px 14px;border-radius:20px;border:1px solid rgba(0,0,0,.08);background:#fff;color:#4B5563;cursor:pointer;transition:all .2s;font-family:'Outfit',sans-serif}
.section-block .eq-pill:hover{border-color:var(--blue);color:var(--blue)}
.section-block .eq-pill.active{background:var(--navy);color:#fff;border-color:var(--navy)}

/* ══════════════════════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════════════════════ */
@media(max-width:900px){
  .tmp-thermo-row,.tmp-trend-grid{grid-template-columns:1fr}
  .tmp-matrix{grid-template-columns:1fr}
  .tmp-mcol-h,.tmp-mcol-sp{display:none}
  .tmp-mrow-label{padding:8px 20px 4px}
  .tmp-rk-grid,.tmp-rk-total-row,.tmp-rk-data-row{grid-template-columns:24px 80px 1fr 8px 1fr 8px 1fr}
  .tmp-rk-var{display:none}
}
