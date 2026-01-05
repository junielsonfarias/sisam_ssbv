const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function executarMigracao() {
  try {
    console.log('🔄 Executando migração para adicionar nota_producao e nivel_aprendizagem...\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'add-nota-producao-nivel-aprendizagem.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migração
    await pool.query(sql);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('✅ Campos nota_producao e nivel_aprendizagem adicionados à tabela resultados_consolidados');
    console.log('✅ Views atualizadas para incluir os novos campos\n');

  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executarMigracao();





