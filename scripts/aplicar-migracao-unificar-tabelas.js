const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,
});

async function aplicarMigracao() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Aplicando migração para unificar tabelas...\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'migration-unificar-tabelas.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar o SQL
    console.log('📄 Executando script SQL...');
    await client.query(sql);
    
    console.log('✅ VIEWs criadas com sucesso!\n');

    // Verificar se as VIEWs foram criadas
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name IN ('resultados_consolidados_v2', 'resultados_consolidados_unificada')
      ORDER BY table_name
    `);

    console.log('📋 VIEWs criadas:');
    views.rows.forEach(v => {
      console.log(`   ✅ ${v.table_name}`);
    });
    console.log();

    // Testar a VIEW
    console.log('🧪 Testando VIEW resultados_consolidados_unificada...');
    const teste = await client.query(`
      SELECT COUNT(*) as total
      FROM resultados_consolidados_unificada
    `);
    console.log(`   Total de registros na VIEW: ${teste.rows[0].total}`);
    console.log();

    // Verificar dados de resultados_provas
    const rp = await client.query(`
      SELECT COUNT(*) as total FROM resultados_provas
    `);
    console.log(`📊 Registros em resultados_provas: ${rp.rows[0].total}`);

    // Verificar dados de resultados_consolidados
    const rc = await client.query(`
      SELECT COUNT(*) as total FROM resultados_consolidados
    `);
    console.log(`📊 Registros em resultados_consolidados: ${rc.rows[0].total}`);
    console.log();

    if (parseInt(rp.rows[0].total) > 0) {
      console.log('✅ A VIEW vai calcular os dados dinamicamente de resultados_provas');
    } else if (parseInt(rc.rows[0].total) > 0) {
      console.log('⚠️  A VIEW vai usar resultados_consolidados como fallback (dados antigos)');
      console.log('💡 Para ter dados completos, reimporte os dados usando a rota que salva questões individuais');
    } else {
      console.log('⚠️  Nenhum dado encontrado. Importe os dados primeiro.');
    }

    await client.query('COMMIT');
    console.log('\n✅ Migração aplicada com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Teste o sistema para verificar se tudo está funcionando');
    console.log('   2. Se resultados_provas estiver vazia, reimporte os dados');
    console.log('   3. Depois de validar, você pode remover a tabela resultados_consolidados (opcional)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
if (require.main === module) {
  aplicarMigracao()
    .then(() => {
      console.log('\n🎉 Processo concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { aplicarMigracao };

