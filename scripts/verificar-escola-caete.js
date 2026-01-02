const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verificarEscolaCaete() {
  try {
    console.log('🔍 Verificando escola CAETÉ...\n');

    // Buscar escola CAETÉ
    const escolaResult = await pool.query(`
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        e.ativo,
        p.nome as polo_nome,
        (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id) as total_alunos,
        (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ativo = true) as alunos_ativos,
        (SELECT COUNT(*) FROM turmas WHERE escola_id = e.id) as total_turmas,
        (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = e.id) as total_resultados,
        (SELECT COUNT(*) FROM resultados_consolidados WHERE escola_id = e.id) as total_consolidados
      FROM escolas e
      INNER JOIN polos p ON e.polo_id = p.id
      WHERE UPPER(e.nome) LIKE '%CAETÉ%' OR UPPER(e.codigo) LIKE '%CAETÉ%'
    `);

    if (escolaResult.rows.length === 0) {
      console.log('❌ Nenhuma escola com nome CAETÉ encontrada.');
    } else {
      escolaResult.rows.forEach((escola) => {
        console.log(`📋 Escola encontrada:`);
        console.log(`   Nome: ${escola.nome}`);
        console.log(`   Código: ${escola.codigo || 'sem código'}`);
        console.log(`   Polo: ${escola.polo_nome}`);
        console.log(`   Ativo: ${escola.ativo ? 'Sim' : 'Não'}`);
        console.log(`   Total de Alunos: ${escola.total_alunos}`);
        console.log(`   Alunos Ativos: ${escola.alunos_ativos}`);
        console.log(`   Total de Turmas: ${escola.total_turmas}`);
        console.log(`   Total de Resultados: ${escola.total_resultados}`);
        console.log(`   Total Consolidados: ${escola.total_consolidados}`);
        
        if (escola.total_alunos === 0 && escola.total_turmas === 0 && escola.total_resultados === 0 && escola.total_consolidados === 0) {
          console.log(`\n✅ Esta escola pode ser excluída (sem vínculos).`);
        } else {
          console.log(`\n⚠️  Esta escola tem vínculos e não deve ser excluída.`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro ao verificar:', error);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}

verificarEscolaCaete();

