const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function excluirEscolasSemAlunos() {
  try {
    console.log('🔍 Buscando escolas sem alunos vinculados...\n');

    // Buscar escolas que não têm alunos vinculados (nem ativos nem inativos)
    const escolasSemAlunos = await pool.query(`
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        p.nome as polo_nome
      FROM escolas e
      LEFT JOIN alunos a ON e.id = a.escola_id
      INNER JOIN polos p ON e.polo_id = p.id
      WHERE e.ativo = true
      GROUP BY e.id, e.nome, e.codigo, p.nome
      HAVING COUNT(a.id) = 0
      ORDER BY e.nome
    `);

    if (escolasSemAlunos.rows.length === 0) {
      console.log('✅ Nenhuma escola sem alunos encontrada.');
      process.exit(0);
    }

    console.log(`📋 Encontradas ${escolasSemAlunos.rows.length} escola(s) sem alunos:\n`);
    escolasSemAlunos.rows.forEach((escola, index) => {
      console.log(`${index + 1}. ${escola.nome} (${escola.codigo || 'sem código'}) - Polo: ${escola.polo_nome}`);
    });

    console.log('\n🗑️  Excluindo escolas sem alunos...\n');

    let excluidas = 0;
    let erros = 0;

    for (const escola of escolasSemAlunos.rows) {
      try {
        // Verificar se há resultados ou turmas vinculadas
        const verificarVinculos = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM turmas WHERE escola_id = $1) as total_turmas,
            (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = $1) as total_resultados,
            (SELECT COUNT(*) FROM resultados_consolidados WHERE escola_id = $1) as total_consolidados,
            (SELECT COUNT(*) FROM usuarios WHERE escola_id = $1) as total_usuarios
        `, [escola.id]);

        const vinculos = verificarVinculos.rows[0];
        
        if (vinculos.total_turmas > 0 || vinculos.total_resultados > 0 || 
            vinculos.total_consolidados > 0 || vinculos.total_usuarios > 0) {
          console.log(`⚠️  Escola "${escola.nome}" tem vínculos (turmas: ${vinculos.total_turmas}, resultados: ${vinculos.total_resultados}, consolidados: ${vinculos.total_consolidados}, usuários: ${vinculos.total_usuarios}). Pulando...`);
          continue;
        }

        // Excluir a escola
        await pool.query('DELETE FROM escolas WHERE id = $1', [escola.id]);
        console.log(`✅ Escola "${escola.nome}" excluída com sucesso.`);
        excluidas++;
      } catch (error) {
        console.error(`❌ Erro ao excluir escola "${escola.nome}":`, error.message);
        erros++;
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Excluídas: ${excluidas}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   ⚠️  Puladas (com vínculos): ${escolasSemAlunos.rows.length - excluidas - erros}`);

  } catch (error) {
    console.error('❌ Erro ao processar exclusão:', error);
    process.exit(1);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}

excluirEscolasSemAlunos();

