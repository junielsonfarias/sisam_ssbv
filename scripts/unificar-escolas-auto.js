const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Função para extrair o nome base (remover prefixos)
function extrairNomeBase(nome) {
  let nomeBase = nome.toUpperCase().trim();
  
  // Remover prefixos comuns
  const prefixos = [
    'EMEIF ',
    'EMEF ',
    'EMEB ',
    'EMEI ',
    'EM ',
    'ESCOLA ',
    'COLÉGIO ',
    'INSTITUTO '
  ];
  
  for (const prefixo of prefixos) {
    if (nomeBase.startsWith(prefixo)) {
      nomeBase = nomeBase.substring(prefixo.length).trim();
      break;
    }
  }
  
  return nomeBase;
}

// Função para normalizar nome (remover acentos e caracteres especiais para comparação)
function normalizarParaComparacao(nome) {
  return nome
    .toUpperCase()
    .trim()
    .replace(/[ÀÁÂÃÄÅ]/g, 'A')
    .replace(/[ÈÉÊË]/g, 'E')
    .replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O')
    .replace(/[ÙÚÛÜ]/g, 'U')
    .replace(/[Ç]/g, 'C')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

async function unificarEscolas() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Iniciando unificação automática de escolas...\n');

    // Buscar todas as escolas
    const todasEscolas = await client.query(
      'SELECT id, nome, codigo, polo_id FROM escolas ORDER BY nome'
    );
    
    console.log(`📊 Total de escolas encontradas: ${todasEscolas.rows.length}\n`);

    // Agrupar escolas por nome base
    const escolasPorNomeBase = new Map();
    
    todasEscolas.rows.forEach(escola => {
      const nomeBase = extrairNomeBase(escola.nome);
      const nomeNormalizado = normalizarParaComparacao(nomeBase);
      
      if (!escolasPorNomeBase.has(nomeNormalizado)) {
        escolasPorNomeBase.set(nomeNormalizado, []);
      }
      
      escolasPorNomeBase.get(nomeNormalizado).push({
        ...escola,
        nomeBase,
        nomeNormalizado
      });
    });

    // Identificar duplicatas
    const escolasParaUnificar = [];
    
    escolasPorNomeBase.forEach((escolas, nomeNormalizado) => {
      if (escolas.length > 1) {
        // Ordenar: preferir nomes sem prefixo, depois por ordem alfabética
        escolas.sort((a, b) => {
          const aTemPrefixo = a.nome.toUpperCase() !== a.nomeBase;
          const bTemPrefixo = b.nome.toUpperCase() !== b.nomeBase;
          
          if (aTemPrefixo && !bTemPrefixo) return 1;
          if (!aTemPrefixo && bTemPrefixo) return -1;
          
          return a.nome.localeCompare(b.nome);
        });
        
        const escolaCorreta = escolas[0];
        
        // Unificar todas as outras para a primeira
        for (let i = 1; i < escolas.length; i++) {
          escolasParaUnificar.push({
            duplicada: escolas[i],
            correta: escolaCorreta
          });
        }
      }
    });

    if (escolasParaUnificar.length === 0) {
      console.log('✅ Nenhuma escola duplicada encontrada para unificar.');
      await client.query('COMMIT');
      return;
    }

    console.log(`🔄 Encontradas ${escolasParaUnificar.length} escola(s) para unificar:\n`);
    
    // Mostrar preview
    escolasParaUnificar.forEach(({ duplicada, correta }) => {
      console.log(`  • "${duplicada.nome}" → "${correta.nome}"`);
    });

    console.log(`\n🔄 Unificando ${escolasParaUnificar.length} escola(s)...\n`);

    // Unificar cada escola duplicada
    for (const { duplicada, correta } of escolasParaUnificar) {
      console.log(`\n📝 Unificando: "${duplicada.nome}" → "${correta.nome}"`);

      // Verificar se estão no mesmo polo
      if (duplicada.polo_id !== correta.polo_id) {
        console.log(`   ⚠ Atenção: Escolas estão em polos diferentes!`);
        console.log(`   Continuando mesmo assim...`);
      }

      // 1. Atualizar alunos
      const alunosAtualizados = await client.query(
        'UPDATE alunos SET escola_id = $1 WHERE escola_id = $2',
        [correta.id, duplicada.id]
      );
      console.log(`   ✓ ${alunosAtualizados.rowCount} aluno(s) atualizado(s)`);

      // 2. Atualizar turmas (tratando duplicatas)
      // Primeiro, verificar turmas que causariam conflito
      const turmasConflito = await client.query(
        `SELECT t1.id as turma_duplicada_id, t1.codigo, t1.ano_letivo, t2.id as turma_existente_id
         FROM turmas t1
         INNER JOIN turmas t2 ON t1.codigo = t2.codigo 
           AND t1.ano_letivo = t2.ano_letivo
           AND t2.escola_id = $1
         WHERE t1.escola_id = $2`,
        [correta.id, duplicada.id]
      );

      // Remover turmas duplicadas (manter apenas as da escola correta)
      if (turmasConflito.rows.length > 0) {
        const turmasParaRemover = turmasConflito.rows.map(r => r.turma_duplicada_id);
        await client.query(
          `DELETE FROM turmas WHERE id = ANY($1::uuid[])`,
          [turmasParaRemover]
        );
        console.log(`   ⚠ ${turmasConflito.rows.length} turma(s) duplicada(s) removida(s)`);
      }

      // Atualizar turmas restantes
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
        const usuariosAtualizados = await client.query(
          'UPDATE usuarios SET escola_id = $1 WHERE escola_id = $2',
          [correta.id, duplicada.id]
        );
        console.log(`   ✓ ${usuariosAtualizados.rowCount} usuário(s) atualizado(s)`);
      }

      // 6. Verificar referências restantes e remover/desativar
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
        await client.query('DELETE FROM escolas WHERE id = $1', [duplicada.id]);
        console.log(`   ✓ Escola duplicada removida`);
      } else {
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
    await pool.end();
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

