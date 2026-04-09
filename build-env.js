// ============================================================
// NEXO Intelligence Web — Build Env
// Executa no Vercel durante o deploy.
// Gera env.js com credenciais via variáveis de ambiente.
// NUNCA commitar env.js — está no .gitignore
// ============================================================
var fs = require('fs');

var url = process.env.SUPABASE_URL;
var key = process.env.SUPABASE_KEY;

if (!url || !key) {
    console.error('[NEXO Build] ERRO: Variáveis de ambiente ausentes.');
    console.error('  SUPABASE_URL:', url ? 'OK' : 'FALTANDO');
    console.error('  SUPABASE_KEY:', key ? 'OK' : 'FALTANDO');
    process.exit(1);
}

var content = 'window.__NEXO_ENV__ = {\n'
    + '  SUPABASE_URL: "' + url + '",\n'
    + '  SUPABASE_KEY: "' + key + '"\n'
    + '};\n';

fs.writeFileSync('env.js', content);
console.log('[NEXO Build] env.js gerado com sucesso.');
