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
  try {
    console.log('Executando migração para adicionar constraint UNIQUE em alunos...\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'add-aluno-unique-constraint.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migração
    await pool.query(sql);

    console.log('Migração executada com sucesso!');
    console.log('Constraint UNIQUE adicionada para (nome, escola_id, ano_letivo)');

  } catch (error) {
    console.error('Erro ao executar migração:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executarMigracao();
