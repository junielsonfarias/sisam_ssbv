require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function verificar() {
  try {
    // Verificar configuração de séries
    const series = await pool.query(`
      SELECT cs.id, cs.serie, cs.nome_serie, cs.tipo_ensino, cs.qtd_itens_producao,
             cs.avalia_lp, cs.avalia_mat, cs.avalia_ch, cs.avalia_cn,
             cs.qtd_questoes_lp, cs.qtd_questoes_mat, cs.qtd_questoes_ch, cs.qtd_questoes_cn
      FROM configuracao_series cs
      ORDER BY cs.serie
    `);

    console.log('=== CONFIGURAÇÃO DE SÉRIES ===');
    series.rows.forEach(s => {
      console.log(`Série: '${s.serie}' (ID: ${s.id}) - Nome: ${s.nome_serie} - Tipo: ${s.tipo_ensino}`);
      console.log(`  LP: ${s.avalia_lp ? s.qtd_questoes_lp : 'N'} | MAT: ${s.avalia_mat ? s.qtd_questoes_mat : 'N'} | CH: ${s.avalia_ch ? s.qtd_questoes_ch : 'N'} | CN: ${s.avalia_cn ? s.qtd_questoes_cn : 'N'}`);
      console.log(`  Itens Produção: ${s.qtd_itens_producao || 0}`);
    });

    // Verificar disciplinas configuradas
    const disciplinas = await pool.query(`
      SELECT cs.serie, cs.nome_serie, csd.disciplina, csd.sigla, csd.ordem,
             csd.questao_inicio, csd.questao_fim, csd.qtd_questoes
      FROM configuracao_series cs
      LEFT JOIN configuracao_series_disciplinas csd ON cs.id = csd.serie_id AND csd.ativo = true
      ORDER BY cs.serie, csd.ordem
    `);

    console.log('\n=== DISCIPLINAS POR SÉRIE ===');
    let currentSerie = '';
    disciplinas.rows.forEach(d => {
      if (d.serie !== currentSerie) {
        currentSerie = d.serie;
        console.log(`\nSérie ${d.serie} (${d.nome_serie}):`);
      }
      if (d.disciplina) {
        console.log(`  ${d.ordem}. ${d.sigla} (${d.disciplina}): Q${d.questao_inicio}-Q${d.questao_fim} (${d.qtd_questoes} questões)`);
      } else {
        console.log(`  (Sem disciplinas configuradas)`);
      }
    });

    await pool.end();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

verificar();
