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

// Função para verificar se tem prefixo
function temPrefixo(nome) {
  return /^(EMEIF|EMEF|EE|EEM|EMEB|ESCOLA|COLÉGIO|INSTITUTO)\s/i.test(nome);
}

// Função para extrair prefixo
function extrairPrefixo(nome) {
  const match = nome.match(/^(EMEIF|EMEF|EE|EEM|EMEB|ESCOLA|COLÉGIO|INSTITUTO)\s/i);
  return match ? match[1].toUpperCase() : null;
}

// Função para determinar qual escola manter (SEMPRE preferir a com prefixo)
function escolherEscolaPrincipal(escolas) {
  return escolas.sort((a, b) => {
    const temPrefixoA = temPrefixo(a.nome);
    const temPrefixoB = temPrefixo(b.nome);
    
    // SEMPRE preferir escola com prefixo sobre sem prefixo
    if (temPrefixoA && !temPrefixoB) return -1;
    if (!temPrefixoA && temPrefixoB) return 1;
    
    // Se ambas têm prefixo, preferir EMEIF
    if (temPrefixoA && temPrefixoB) {
      const prefixoA = extrairPrefixo(a.nome);
      const prefixoB = extrairPrefixo(b.nome);
      if (prefixoA === 'EMEIF' && prefixoB !== 'EMEIF') return -1;
      if (prefixoA !== 'EMEIF' && prefixoB === 'EMEIF') return 1;
    }
    
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

// Função para garantir que a escola principal tenha prefixo EMEIF se não tiver nenhum
function garantirPrefixo(escola) {
  if (temPrefixo(escola.nome)) {
    return escola.nome; // Já tem prefixo, manter
  }
  return `EMEIF ${escola.nome}`.trim(); // Adicionar EMEIF se não tiver
}

async function unificarEscolasSimilares() {
  try {
    console.log('🔍 Analisando escolas para unificar nomes similares...\n');

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

    // Agrupar por nome base (mais agressivo - busca por similaridade)
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
      
      // Buscar outras escolas com mesmo nome base (incluindo comparação direta)
      escolas.forEach(outra => {
        if (outra.id === escola.id || processadas.has(outra.id)) return;
        
        const outraNomeBase = extrairNomeBase(outra.nome);
        const outraNormalizado = normalizarNome(outra.nome);
        const escolaNormalizado = normalizarNome(escola.nome);
        
        // Verificar se são similares:
        // 1. Mesmo nome base
        // 2. Um contém o outro (ex: "CAETÉ" contém "EMEIF CAETÉ" após remover prefixo)
        // 3. Nomes normalizados são similares
        if (nomeBase.length > 0 && outraNomeBase === nomeBase) {
          grupos[chave].push(outra);
          processadas.add(outra.id);
        } else if (nomeBase.length > 0 && outraNormalizado.includes(nomeBase)) {
          grupos[chave].push(outra);
          processadas.add(outra.id);
        } else if (outraNomeBase.length > 0 && escolaNormalizado.includes(outraNomeBase)) {
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

    // Escolas sem prefixo que precisam ser atualizadas
    const escolasSemPrefixo = escolas.filter(e => {
      const temPrefixoEscola = temPrefixo(e.nome);
      return !temPrefixoEscola && e.ativo;
    });

    console.log(`📊 Análise:\n`);
    console.log(`   - Escolas duplicadas/similares: ${Object.keys(duplicatas).length} grupo(s)`);
    console.log(`   - Escolas sem prefixo: ${escolasSemPrefixo.length}\n`);

    // Mostrar duplicatas
    if (Object.keys(duplicatas).length > 0) {
      console.log(`⚠️  Grupos de escolas similares encontradas:\n`);
      Object.keys(duplicatas).forEach((chave, index) => {
        const grupo = duplicatas[chave];
        const principal = escolherEscolaPrincipal(grupo);
        const secundarias = grupo.filter(e => e.id !== principal.id);
        
        const nomeFinal = garantirPrefixo(principal);
        
        console.log(`${index + 1}. Grupo: "${chave}"`);
        console.log(`   ✅ Manter: "${principal.nome}" → "${nomeFinal}" (ID: ${principal.id})`);
        if (!temPrefixo(principal.nome)) {
          console.log(`      ⚠️  Será atualizado para ter prefixo EMEIF`);
        }
        console.log(`   ❌ Unificar:`);
        secundarias.forEach(escola => {
          console.log(`      - "${escola.nome}" (ID: ${escola.id}, ${escola.ativo ? 'Ativa' : 'Inativa'})`);
        });
        console.log('');
      });
    }

    // Mostrar escolas sem prefixo
    if (escolasSemPrefixo.length > 0) {
      console.log(`📝 Escolas sem prefixo que serão atualizadas:\n`);
      escolasSemPrefixo.forEach((escola, index) => {
        const novoNome = garantirPrefixo(escola);
        console.log(`${index + 1}. "${escola.nome}" → "${novoNome}"`);
      });
      console.log('');
    }

    if (Object.keys(duplicatas).length === 0 && escolasSemPrefixo.length === 0) {
      console.log('✅ Nenhuma ação necessária. Todas as escolas já estão unificadas e padronizadas.\n');
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
        
        // Garantir que a escola principal tenha prefixo
        const nomeFinal = garantirPrefixo(principal);
        if (nomeFinal !== principal.nome) {
          await pool.query('UPDATE escolas SET nome = $1 WHERE id = $2', 
            [nomeFinal, principal.id]);
          console.log(`   📝 Atualizado nome principal: "${principal.nome}" → "${nomeFinal}"`);
          atualizadas++;
        }
        
        for (const secundaria of secundarias) {
          try {
            const vinculos = parseInt(secundaria.total_alunos) + parseInt(secundaria.total_turmas) + 
                            parseInt(secundaria.total_resultados) + parseInt(secundaria.total_consolidados);
            
            if (vinculos > 0) {
              console.log(`   📦 Movendo vínculos de "${secundaria.nome}" para "${nomeFinal}"...`);
              
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

    // Atualizar nomes das escolas sem prefixo (que não foram unificadas)
    if (escolasSemPrefixo.length > 0) {
      console.log(`\n📝 Atualizando nomes das escolas sem prefixo...\n`);
      
      for (const escola of escolasSemPrefixo) {
        try {
          // Verificar se a escola ainda existe (não foi unificada)
          const existe = await pool.query('SELECT id FROM escolas WHERE id = $1', [escola.id]);
          if (existe.rows.length === 0) {
            console.log(`   ⏭️  Escola "${escola.nome}" já foi unificada, pulando...`);
            continue;
          }
          
          const novoNome = garantirPrefixo(escola);
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

unificarEscolasSimilares();

