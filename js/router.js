// ============================================================
// NEXO Intelligence Web v2 — SPA Router (hash-based)
// ============================================================
const Router = {
  pages: {},

  register(name, handler) {
    this.pages[name] = handler;
  },

  init() {
    // Nav clicks
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#/' + item.dataset.page;
      });
    });

    // Hash change
    window.addEventListener('hashchange', () => this.route());

    // Initial route
    if (!window.location.hash || window.location.hash === '#/') {
      window.location.hash = '#/ruptura';
    } else {
      this.route();
    }
  },

  route() {
    const hash = window.location.hash.replace('#/', '') || 'ruptura';

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector('.nav-item[data-page="' + hash + '"]');
    if (activeNav) activeNav.classList.add('active');

    // Page titles
    const titles = {
      copiloto: ['Copiloto Estratégico', 'Insights cruzados narrativos'],
      onepage: ['OnePage', 'Painel de avião — visão consolidada'],
      ruptura: ['Ruptura & Disponibilidade', 'Estoque → Balcão AT → Self-service AS'],
      quebra: ['Quebra & Perdas', 'Controle de margem e desperdício'],
      equipe: ['Quadro de Pessoal', 'Presença, escala e absenteísmo'],
      temperatura: ['Temperatura & Equipamentos', 'Cadeia do frio — conformidade'],
      mercado: ['Mercado & Clima', 'Dados externos e sazonalidade'],
      financeiro: ['Financeiro', 'Impacto em R$ e ROI'],
      comparativo: ['Comparativo', 'Benchmark entre lojas']
    };

    const t = titles[hash] || ['NEXO Intelligence', ''];
    document.getElementById('headerTitle').textContent = t[0];
    document.getElementById('headerSub').textContent = t[1];

    // Render page
    const main = document.getElementById('mainContent');
    if (this.pages[hash]) {
      this.pages[hash](main);
    } else {
      main.innerHTML = '<div class="page-loading">Módulo "' + hash + '" — em desenvolvimento</div>';
    }
  }
};
