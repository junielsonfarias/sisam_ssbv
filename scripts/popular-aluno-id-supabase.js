const path = require('path');

// Carregar variáveis de ambiente do .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = require('pg');

// Configuração do pool (use as variáveis de ambiente configuradas)
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,
};

console.log('🔌 Conectando ao banco:', {
  host: config.host,
  database: config.database,
  user: config.user,
  port: config.port,
  ssl: !!config.ssl
});

const pool = new Pool(config);

async function popularAlunoIdSupabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🔄 Iniciando população do aluno_id na tabela resultados_provas...\n');

    // 1. Estatísticas ANTES
    console.log('📊 Estatísticas ANTES da atualização:');
    const statsAntes = await client.query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as com_aluno_id,
        COUNT(*) - COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as sem_aluno_id,
        COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as com_codigo,
        COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as com_nome
      FROM resultados_provas
    `);
    console.log(JSON.stringify(statsAntes.rows[0], null, 2));
    console.log();

    // 2. Atualizar por código
    console.log('🔧 Atualizando por código do aluno...');
    const updatePorCodigo = await client.query(`
      UPDATE resultados_provas rp
      SET aluno_id = a.id
      FROM alunos a
      WHERE rp.aluno_id IS NULL
        AND rp.aluno_codigo IS NOT NULL
        AND rp.aluno_codigo = a.codigo
    `);
    console.log(`✅ ${updatePorCodigo.rowCount} registros atualizados por código`);
    console.log();

    // 3. Atualizar por nome
    console.log('🔧 Atualizando por nome do aluno...');
    const updatePorNome = await client.query(`
      UPDATE resultados_provas rp
      SET aluno_id = a.id
      FROM alunos a
      WHERE rp.aluno_id IS NULL
        AND rp.aluno_nome IS NOT NULL
        AND UPPER(TRIM(rp.aluno_nome)) = UPPER(TRIM(a.nome))
        AND (
          rp.ano_letivo IS NULL 
          OR a.ano_letivo IS NULL 
          OR rp.ano_letivo = a.ano_letivo
        )
    `);
    console.log(`✅ ${updatePorNome.rowCount} registros atualizados por nome`);
    console.log();

    // 4. Estatísticas DEPOIS
    console.log('📊 Estatísticas DEPOIS da atualização:');
    const statsDepois = await client.query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as com_aluno_id,
        COUNT(*) - COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as sem_aluno_id,
        COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as com_codigo,
        COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as com_nome
      FROM resultados_provas
    `);
    console.log(JSON.stringify(statsDepois.rows[0], null, 2));
    console.log();

    // 5. Diagnosticar registros não vinculados
    const naoVinculados = await client.query(`
      SELECT 
        aluno_codigo,
        aluno_nome,
        ano_letivo,
        COUNT(*) as total_questoes
      FROM resultados_provas
      WHERE aluno_id IS NULL
      GROUP BY aluno_codigo, aluno_nome, ano_letivo
      ORDER BY total_questoes DESC
      LIMIT 10
    `);

    if (naoVinculados.rows.length > 0) {
      console.log('⚠️  Registros que não puderam ser vinculados:');
      naoVinculados.rows.forEach((r, i) => {
        console.log(`${i + 1}. Código: ${r.aluno_codigo || 'NULL'}, Nome: ${r.aluno_nome || 'NULL'}, Ano: ${r.ano_letivo || 'NULL'}, Questões: ${r.total_questoes}`);
      });
      console.log();
    } else {
      console.log('✅ Todos os registros foram vinculados com sucesso!');
      console.log();
    }

    // 6. Verificar integridade
    const integridade = await client.query(`
      SELECT 
        COUNT(DISTINCT a.id) as alunos_com_resultados,
        COUNT(DISTINCT rp.id) as total_resultados
      FROM alunos a
      INNER JOIN resultados_provas rp ON rp.aluno_id = a.id
    `);
    
    console.log('🔗 Integridade dos dados:');
    console.log(`   Alunos com resultados: ${integridade.rows[0].alunos_com_resultados}`);
    console.log(`   Total de resultados vinculados: ${integridade.rows[0].total_resultados}`);
    console.log();

    await client.query('COMMIT');
    console.log('✅ Processo concluído com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao popular aluno_id:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
if (require.main === module) {
  popularAlunoIdSupabase()
    .then(() => {
      console.log('\n🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { popularAlunoIdSupabase };

