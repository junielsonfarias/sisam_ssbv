const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuracao do pool com SSL para Supabase
const isSupabase = (process.env.DB_HOST || '').includes('supabase');
const sslConfig = isSupabase || process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: sslConfig,
});

async function executarMigracao() {
  const client = await pool.connect();

  try {
    console.log('='.repeat(60));
    console.log('MIGRACAO: Adicionar CHECK Constraints');
    console.log('='.repeat(60));
    console.log('');

    // Verificar conexao
    console.log('Verificando conexao com o banco de dados...');
    const testResult = await client.query('SELECT NOW() as time, current_database() as db');
    console.log(`Conectado ao banco: ${testResult.rows[0].db}`);
    console.log(`Hora do servidor: ${testResult.rows[0].time}`);
    console.log('');

    // Verificar dados existentes antes da migracao
    console.log('Analisando dados existentes...');
    console.log('');

    // Verificar notas fora do range
    const notasInvalidas = await client.query(`
      SELECT COUNT(*) as total
      FROM resultados_provas
      WHERE nota IS NOT NULL AND (nota < 0 OR nota > 10)
    `);
    console.log(`Notas invalidas em resultados_provas: ${notasInvalidas.rows[0].total}`);

    // Verificar presenca invalida
    const presencaInvalida = await client.query(`
      SELECT COUNT(*) as total
      FROM resultados_provas
      WHERE presenca IS NOT NULL AND UPPER(TRIM(presenca)) NOT IN ('P', 'F')
    `);
    console.log(`Presencas invalidas em resultados_provas: ${presencaInvalida.rows[0].total}`);

    // Verificar respostas invalidas
    const respostasInvalidas = await client.query(`
      SELECT COUNT(*) as total
      FROM resultados_provas
      WHERE resposta_aluno IS NOT NULL
      AND resposta_aluno != ''
      AND UPPER(TRIM(resposta_aluno)) NOT IN ('A', 'B', 'C', 'D', 'E')
    `);
    console.log(`Respostas invalidas em resultados_provas: ${respostasInvalidas.rows[0].total}`);

    console.log('');
    console.log('Executando migracao...');
    console.log('');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'add-check-constraints.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo de migracao nao encontrado: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migracao
    await client.query(sql);

    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRACAO CONCLUIDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('');

    // Listar constraints criadas
    console.log('Constraints CHECK criadas:');
    console.log('');

    const constraints = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'CHECK'
      AND tc.table_schema = 'public'
      AND tc.constraint_name LIKE 'chk_%'
      ORDER BY tc.table_name, tc.constraint_name
    `);

    let currentTable = '';
    for (const row of constraints.rows) {
      if (row.table_name !== currentTable) {
        console.log(`\n  ${row.table_name}:`);
        currentTable = row.table_name;
      }
      console.log(`    - ${row.constraint_name}`);
    }

    console.log('');
    console.log('Resumo:');
    console.log(`  Total de constraints: ${constraints.rows.length}`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('ERRO NA MIGRACAO');
    console.error('='.repeat(60));
    console.error('');
    console.error('Mensagem:', error.message);

    if (error.detail) {
      console.error('Detalhe:', error.detail);
    }

    if (error.hint) {
      console.error('Dica:', error.hint);
    }

    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Verificar se dotenv esta disponivel
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // dotenv nao instalado, usar variaveis de ambiente do sistema
}

executarMigracao();
