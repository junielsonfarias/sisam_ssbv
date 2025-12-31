const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Mapeamento de escolas duplicadas
// Formato: { nome_duplicado: nome_correto }
const escolasDuplicadas = {
  'MAG. BARATA': 'EMEF MAGALHÃES BARATA',
  'MAG BARATA': 'EMEF MAGALHÃES BARATA',
  'MAGALHÃES BARATA': 'EMEF MAGALHÃES BARATA',
  'ANCHIETA': 'EMEF PDE JOSÉ DE ANCHIETA',
  'EMEF PDE JOSÉ DE ANCHIETA': 'EMEF PDE JOSÉ DE ANCHIETA',
  'EMANNOEL LOBATO': 'EMEB EMMANOEL',
  'EMEIF EMMANOEL': 'EMEB EMMANOEL',
  'EMEB EMMANOEL': 'EMEB EMMANOEL',
};

async function unificarEscolas() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Iniciando unificação de escolas...\n');

    // Buscar todas as escolas
    const todasEscolas = await client.query('SELECT id, nome, codigo FROM escolas ORDER BY nome');
    
    console.log(`📊 Total de escolas encontradas: ${todasEscolas.rows.length}\n`);

    // Criar mapa de nomes normalizados para IDs
    const escolasMap = new Map();
    const escolasParaUnificar = [];

    todasEscolas.rows.forEach(escola => {
      const nomeNormalizado = escola.nome.toUpperCase().trim();
      escolasMap.set(nomeNormalizado, escola);
    });

    // Identificar escolas duplicadas
    for (const [nomeDuplicado, nomeCorreto] of Object.entries(escolasDuplicadas)) {
      const nomeDuplicadoUpper = nomeDuplicado.toUpperCase().trim();
      const nomeCorretoUpper = nomeCorreto.toUpperCase().trim();

      const escolaDuplicada = escolasMap.get(nomeDuplicadoUpper);
      const escolaCorreta = escolasMap.get(nomeCorretoUpper);

      if (escolaDuplicada && escolaCorreta) {
        if (escolaDuplicada.id !== escolaCorreta.id) {
          escolasParaUnificar.push({
            duplicada: escolaDuplicada,
            correta: escolaCorreta
          });
          console.log(`✓ Encontrada duplicata: "${escolaDuplicada.nome}" → "${escolaCorreta.nome}"`);
        }
      } else if (escolaDuplicada && !escolaCorreta) {
        // Se a escola correta não existe, renomear a duplicada
        console.log(`⚠ Renomeando: "${escolaDuplicada.nome}" → "${nomeCorreto}"`);
        await client.query(
          'UPDATE escolas SET nome = $1 WHERE id = $2',
          [nomeCorreto, escolaDuplicada.id]
        );
      }
    }

    if (escolasParaUnificar.length === 0) {
      console.log('\n✅ Nenhuma escola duplicada encontrada para unificar.');
      await client.query('COMMIT');
      return;
    }

    console.log(`\n🔄 Unificando ${escolasParaUnificar.length} escola(s)...\n`);

    // Unificar cada escola duplicada
    for (const { duplicada, correta } of escolasParaUnificar) {
      console.log(`\n📝 Unificando: "${duplicada.nome}" → "${correta.nome}"`);

      // 1. Atualizar alunos
      const alunosAtualizados = await client.query(
        'UPDATE alunos SET escola_id = $1 WHERE escola_id = $2',
        [correta.id, duplicada.id]
      );
      console.log(`   ✓ ${alunosAtualizados.rowCount} aluno(s) atualizado(s)`);

      // 2. Atualizar turmas
      const turmasAtualizadas = await client.query(
        'UPDATE turmas SET escola_id = $1 WHERE escola_id = $2',
        [correta.id, duplicada.id]
      );
      console.log(`   ✓ ${turmasAtualizadas.rowCount} turma(s) atualizada(s)`);

      // 3. Atualizar resultados_provas
      const resultadosProvasAtualizados = await client.query(
        'UPDATE resultados_provas SET escola_id = $1 WHERE escola_id = $2',
        [correta.id, duplicada.id]
      );
      console.log(`   ✓ ${resultadosProvasAtualizados.rowCount} resultado(s) de prova(s) atualizado(s)`);

      // 4. Atualizar resultados_consolidados
      const resultadosConsolidadosAtualizados = await client.query(
        'UPDATE resultados_consolidados SET escola_id = $1 WHERE escola_id = $2',
        [correta.id, duplicada.id]
      );
      console.log(`   ✓ ${resultadosConsolidadosAtualizados.rowCount} resultado(s) consolidado(s) atualizado(s)`);

      // 5. Verificar se há usuários vinculados
      const usuariosVinculados = await client.query(
        'SELECT COUNT(*) as total FROM usuarios WHERE escola_id = $1',
        [duplicada.id]
      );
      
      if (parseInt(usuariosVinculados.rows[0].total) > 0) {
        await client.query(
          'UPDATE usuarios SET escola_id = $1 WHERE escola_id = $2',
          [correta.id, duplicada.id]
        );
        console.log(`   ✓ Usuário(s) atualizado(s)`);
      }

      // 6. Desativar ou remover a escola duplicada
      // Primeiro, verificar se há alguma referência restante
      const referenciasRestantes = await client.query(
        `SELECT 
          (SELECT COUNT(*) FROM alunos WHERE escola_id = $1) as alunos,
          (SELECT COUNT(*) FROM turmas WHERE escola_id = $1) as turmas,
          (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = $1) as resultados_provas,
          (SELECT COUNT(*) FROM resultados_consolidados WHERE escola_id = $1) as resultados_consolidados,
          (SELECT COUNT(*) FROM usuarios WHERE escola_id = $1) as usuarios`,
        [duplicada.id]
      );

      const refs = referenciasRestantes.rows[0];
      const totalRefs = parseInt(refs.alunos) + parseInt(refs.turmas) + 
                       parseInt(refs.resultados_provas) + parseInt(refs.resultados_consolidados) + 
                       parseInt(refs.usuarios);

      if (totalRefs === 0) {
        // Remover a escola duplicada
        await client.query('DELETE FROM escolas WHERE id = $1', [duplicada.id]);
        console.log(`   ✓ Escola duplicada removida`);
      } else {
        // Apenas desativar
        await client.query('UPDATE escolas SET ativo = false WHERE id = $1', [duplicada.id]);
        console.log(`   ⚠ Escola duplicada desativada (ainda há ${totalRefs} referência(s))`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Unificação concluída com sucesso!');

    // Mostrar resumo final
    const escolasFinais = await client.query(
      'SELECT COUNT(*) as total FROM escolas WHERE ativo = true'
    );
    console.log(`\n📊 Total de escolas ativas: ${escolasFinais.rows[0].total}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao unificar escolas:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
unificarEscolas()
  .then(() => {
    console.log('\n✨ Processo finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

