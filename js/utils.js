// ============================================================
// NEXO Intelligence Web v2 — Utilities
// ============================================================
const Utils = {

  // Date helpers
  today() { return new Date().toISOString().slice(0, 10); },

  daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  },

  monthStart(date) {
    const d = new Date(date || Date.now());
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  },

  yearStart() {
    return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  },

  dayOfWeek(dateStr) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias[new Date(dateStr + 'T12:00:00').getDay()];
  },

  dowIndex(dateStr) {
    return new Date(dateStr + 'T12:00:00').getDay();
  },

  monthName(dateStr) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[new Date(dateStr + 'T12:00:00').getMonth()];
  },

  monthKey(dateStr) {
    return dateStr.slice(0, 7);
  },

  formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return d + '/' + m + '/' + y;
  },

  formatDateShort(dateStr) {
    const [, m, d] = dateStr.split('-');
    return d + '/' + m;
  },

  // Grouping
  groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = typeof key === 'function' ? key(item) : item[key];
      (acc[k] = acc[k] || []).push(item);
      return acc;
    }, {});
  },

  // Math
  pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10;
  },

  round1(n) {
    return Math.round(n * 10) / 10;
  },

  // Currency
  formatBRL(val) {
    return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // Sort
  sortDesc(arr, key) {
    return [...arr].sort((a, b) => b[key] - a[key]);
  },

  sortAsc(arr, key) {
    return [...arr].sort((a, b) => a[key] - b[key]);
  },

  // Period filter — ancora na data mais recente dos dados, nao em hoje
  periodRange(days, refDate) {
    var ateDate = refDate ? new Date(refDate + 'T12:00:00') : new Date();
    var ate = ateDate.toISOString().slice(0, 10);
    var d1 = new Date(ateDate); d1.setDate(d1.getDate() - days);
    var desde = d1.toISOString().slice(0, 10);
    var d2 = new Date(ateDate); d2.setDate(d2.getDate() - days - 1);
    var ateAnterior = d2.toISOString().slice(0, 10);
    var d3 = new Date(ateDate); d3.setDate(d3.getDate() - days * 2 - 1);
    var desdeAnterior = d3.toISOString().slice(0, 10);
    return { desde, ate, desdeAnterior, ateAnterior };
  }

};
