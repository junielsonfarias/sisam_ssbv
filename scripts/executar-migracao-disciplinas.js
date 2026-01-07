/**
 * Script para executar migração de disciplinas por série
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function executarMigracao() {
  const client = await pool.connect();

  try {
    console.log('=== Executando Migração: Disciplinas por Série ===\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../database/migrations/add-disciplinas-por-serie.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migração
    console.log('Executando SQL...\n');
    await client.query(sql);

    // Verificar resultado
    console.log('=== Verificando Resultado ===\n');

    const result = await client.query(`
      SELECT
        cs.serie,
        cs.tipo_ensino,
        csd.disciplina,
        csd.sigla,
        csd.ordem,
        CONCAT('Q', csd.questao_inicio, ' a Q', csd.questao_fim) as questoes,
        csd.qtd_questoes,
        csd.valor_questao
      FROM configuracao_series cs
      LEFT JOIN configuracao_series_disciplinas csd ON cs.id = csd.serie_id
      ORDER BY cs.serie, csd.ordem
    `);

    let currentSerie = '';
    for (const row of result.rows) {
      if (row.serie !== currentSerie) {
        currentSerie = row.serie;
        console.log(`\n${row.serie}º Ano (${row.tipo_ensino}):`);
      }
      if (row.disciplina) {
        console.log(`  ${row.ordem}. ${row.disciplina} (${row.sigla}): ${row.questoes} - ${row.qtd_questoes} questões - R$ ${row.valor_questao}/questão`);
      }
    }

    console.log('\n\nMigração concluída com sucesso!');

  } catch (error) {
    console.error('Erro na migração:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executarMigracao();
