const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Função para normalizar nome
function normalizarNome(nome) {
  if (!nome) return '';
  return nome
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Função para extrair nome base (sem prefixos)
function extrairNomeBase(nome) {
  const normalizado = normalizarNome(nome);
  const prefixos = ['EMEIF', 'EMEF', 'EE', 'EEM', 'EMEB', 'ESCOLA', 'COLÉGIO', 'INSTITUTO'];
  let nomeBase = normalizado;
  
  for (const prefixo of prefixos) {
    if (nomeBase.startsWith(prefixo + ' ')) {
      nomeBase = nomeBase.substring(prefixo.length + 1).trim();
      break;
    }
  }
  
  return nomeBase;
}

// Função para determinar qual escola manter
function escolherEscolaPrincipal(escolas) {
  return escolas.sort((a, b) => {
    // Preferir nome que começa com EMEIF
    const temEMEIF_A = /^EMEIF\s/i.test(a.nome);
    const temEMEIF_B = /^EMEIF\s/i.test(b.nome);
    if (temEMEIF_A && !temEMEIF_B) return -1;
    if (!temEMEIF_A && temEMEIF_B) return 1;
    
    // Preferir a com mais vínculos
    const vinculosA = parseInt(a.total_alunos) + parseInt(a.total_turmas) + 
                     parseInt(a.total_resultados) + parseInt(a.total_consolidados);
    const vinculosB = parseInt(b.total_alunos) + parseInt(b.total_turmas) + 
                     parseInt(b.total_resultados) + parseInt(b.total_consolidados);
    if (vinculosB !== vinculosA) return vinculosB - vinculosA;
    
    // Preferir ativa
    if (a.ativo && !b.ativo) return -1;
    if (!a.ativo && b.ativo) return 1;
    
    // Preferir nome mais longo
    return b.nome.length - a.nome.length;
  })[0];
}

async function unificarTodasEscolas() {
  try {
    console.log('🔍 Analisando todas as escolas para unificação...\n');

    // Buscar todas as escolas (ativas e inativas)
    const escolasResult = await pool.query(`
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        e.ativo,
        e.polo_id,
        p.nome as polo_nome,
        (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id) as total_alunos,
        (SELECT COUNT(*) FROM turmas WHERE escola_id = e.id) as total_turmas,
        (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = e.id) as total_resultados,
        (SELECT COUNT(*) FROM resultados_consolidados WHERE escola_id = e.id) as total_consolidados
      FROM escolas e
      INNER JOIN polos p ON e.polo_id = p.id
      ORDER BY e.nome
    `);

    const escolas = escolasResult.rows;
    console.log(`📋 Total de escolas: ${escolas.length}\n`);

    // Agrupar por nome base
    const grupos = {};
    const processadas = new Set();
    
    escolas.forEach(escola => {
      if (processadas.has(escola.id)) return;
      
      const nomeBase = extrairNomeBase(escola.nome);
      const chave = nomeBase || normalizarNome(escola.nome);
      
      if (!grupos[chave]) {
        grupos[chave] = [];
      }
      
      grupos[chave].push(escola);
      processadas.add(escola.id);
      
      // Buscar outras escolas com mesmo nome base
      escolas.forEach(outra => {
        if (outra.id === escola.id || processadas.has(outra.id)) return;
        
        const outraNomeBase = extrairNomeBase(outra.nome);
        if (outraNomeBase === nomeBase && nomeBase.length > 0) {
          grupos[chave].push(outra);
          processadas.add(outra.id);
        }
      });
    });

    // Filtrar apenas grupos com mais de uma escola
    const duplicatas = {};
    Object.keys(grupos).forEach(chave => {
      if (grupos[chave].length > 1) {
        duplicatas[chave] = grupos[chave];
      }
    });

    // Também verificar escolas que precisam ter o prefixo EMEIF adicionado
    const escolasSemPrefixo = escolas.filter(e => {
      const temPrefixo = /^(EMEIF|EMEF|EE|EEM|EMEB|ESCOLA|COLÉGIO|INSTITUTO)\s/i.test(e.nome);
      return !temPrefixo && e.ativo;
    });

    console.log(`📊 Análise:\n`);
    console.log(`   - Escolas duplicadas: ${Object.keys(duplicatas).length} grupo(s)`);
    console.log(`   - Escolas sem prefixo: ${escolasSemPrefixo.length}\n`);

    // Mostrar duplicatas
    if (Object.keys(duplicatas).length > 0) {
      console.log(`⚠️  Grupos de escolas duplicadas:\n`);
      Object.keys(duplicatas).forEach((chave, index) => {
        const grupo = duplicatas[chave];
        const principal = escolherEscolaPrincipal(grupo);
        const secundarias = grupo.filter(e => e.id !== principal.id);
        
        console.log(`${index + 1}. Grupo: "${chave}"`);
        console.log(`   ✅ Manter: "${principal.nome}" (ID: ${principal.id})`);
        console.log(`   ❌ Unificar:`);
        secundarias.forEach(escola => {
          console.log(`      - "${escola.nome}" (ID: ${escola.id}, ${escola.ativo ? 'Ativa' : 'Inativa'})`);
        });
        console.log('');
      });
    }

    // Mostrar escolas sem prefixo
    if (escolasSemPrefixo.length > 0) {
      console.log(`📝 Escolas que precisam do prefixo EMEIF:\n`);
      escolasSemPrefixo.forEach((escola, index) => {
        console.log(`${index + 1}. "${escola.nome}" → "EMEIF ${escola.nome}"`);
      });
      console.log('');
    }

    if (Object.keys(duplicatas).length === 0 && escolasSemPrefixo.length === 0) {
      console.log('✅ Nenhuma ação necessária.\n');
      process.exit(0);
    }

    // Executar unificações
    let unificadas = 0;
    let atualizadas = 0;

    if (Object.keys(duplicatas).length > 0) {
      console.log(`\n🔄 Iniciando unificação de ${Object.keys(duplicatas).length} grupo(s)...\n`);

      for (const chave of Object.keys(duplicatas)) {
        const grupo = duplicatas[chave];
        const principal = escolherEscolaPrincipal(grupo);
        const secundarias = grupo.filter(e => e.id !== principal.id);
        
        for (const secundaria of secundarias) {
          try {
            const vinculos = parseInt(secundaria.total_alunos) + parseInt(secundaria.total_turmas) + 
                            parseInt(secundaria.total_resultados) + parseInt(secundaria.total_consolidados);
            
            if (vinculos > 0) {
              console.log(`   📦 Movendo vínculos de "${secundaria.nome}" para "${principal.nome}"...`);
              
              if (parseInt(secundaria.total_alunos) > 0) {
                await pool.query('UPDATE alunos SET escola_id = $1 WHERE escola_id = $2', 
                  [principal.id, secundaria.id]);
              }
              if (parseInt(secundaria.total_turmas) > 0) {
                await pool.query('UPDATE turmas SET escola_id = $1 WHERE escola_id = $2', 
                  [principal.id, secundaria.id]);
              }
              if (parseInt(secundaria.total_resultados) > 0) {
                await pool.query('UPDATE resultados_provas SET escola_id = $1 WHERE escola_id = $2', 
                  [principal.id, secundaria.id]);
              }
              if (parseInt(secundaria.total_consolidados) > 0) {
                await pool.query('UPDATE resultados_consolidados SET escola_id = $1 WHERE escola_id = $2', 
                  [principal.id, secundaria.id]);
              }
            }
            
            await pool.query('DELETE FROM escolas WHERE id = $1', [secundaria.id]);
            console.log(`   ✅ Escola "${secundaria.nome}" unificada e excluída\n`);
            unificadas++;
            
          } catch (error) {
            console.error(`   ❌ Erro ao unificar "${secundaria.nome}":`, error.message);
          }
        }
      }
    }

    // Atualizar nomes das escolas sem prefixo
    if (escolasSemPrefixo.length > 0) {
      console.log(`\n📝 Atualizando nomes das escolas sem prefixo...\n`);
      
      for (const escola of escolasSemPrefixo) {
        try {
          const novoNome = `EMEIF ${escola.nome}`.trim();
          await pool.query('UPDATE escolas SET nome = $1 WHERE id = $2', [novoNome, escola.id]);
          console.log(`   ✅ "${escola.nome}" → "${novoNome}"`);
          atualizadas++;
        } catch (error) {
          console.error(`   ❌ Erro ao atualizar "${escola.nome}":`, error.message);
        }
      }
      console.log('');
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Escolas unificadas: ${unificadas}`);
    console.log(`   📝 Escolas atualizadas: ${atualizadas}`);
    console.log(`\n✅ Processo concluído!\n`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}

unificarTodasEscolas();

