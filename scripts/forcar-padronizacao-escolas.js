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

// Função para determinar prefixo correto baseado no código
function determinarPrefixo(codigo) {
  if (!codigo) return 'EMEIF'; // Padrão
  
  const codigoUpper = codigo.toUpperCase();
  if (codigoUpper.startsWith('EMEF_')) return 'EMEF';
  if (codigoUpper.startsWith('EMEB_')) return 'EMEB';
  if (codigoUpper.startsWith('EMEIF_')) return 'EMEIF';
  if (codigoUpper.startsWith('EE_')) return 'EE';
  if (codigoUpper.startsWith('EEM_')) return 'EEM';
  
  return 'EMEIF'; // Padrão
}

async function forcarPadronizacao() {
  try {
    console.log('🔍 Forçando padronização de TODAS as escolas...\n');

    // Buscar todas as escolas
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

    console.log(`📊 Análise:\n`);
    console.log(`   - Escolas duplicadas/similares: ${Object.keys(duplicatas).length} grupo(s)\n`);

    let unificadas = 0;
    let atualizadas = 0;

    // Processar duplicatas
    if (Object.keys(duplicatas).length > 0) {
      console.log(`🔄 Processando ${Object.keys(duplicatas).length} grupo(s) de duplicatas...\n`);

      for (const chave of Object.keys(duplicatas)) {
        const grupo = duplicatas[chave];
        
        // Ordenar: preferir com prefixo, depois por vínculos
        grupo.sort((a, b) => {
          const temPrefixoA = temPrefixo(a.nome);
          const temPrefixoB = temPrefixo(b.nome);
          
          if (temPrefixoA && !temPrefixoB) return -1;
          if (!temPrefixoA && temPrefixoB) return 1;
          
          const vinculosA = parseInt(a.total_alunos) + parseInt(a.total_turmas) + 
                           parseInt(a.total_resultados) + parseInt(a.total_consolidados);
          const vinculosB = parseInt(b.total_alunos) + parseInt(b.total_turmas) + 
                           parseInt(b.total_resultados) + parseInt(b.total_consolidados);
          return vinculosB - vinculosA;
        });
        
        const principal = grupo[0];
        const secundarias = grupo.slice(1);
        
        // Determinar nome final da escola principal
        let nomeFinal = principal.nome;
        if (!temPrefixo(principal.nome)) {
          const prefixo = determinarPrefixo(principal.codigo);
          nomeFinal = `${prefixo} ${principal.nome}`.trim();
        }
        
        console.log(`📦 Grupo: "${chave}"`);
        console.log(`   ✅ Principal: "${principal.nome}" → "${nomeFinal}"`);
        
        // Atualizar nome da principal se necessário
        if (nomeFinal !== principal.nome) {
          await pool.query('UPDATE escolas SET nome = $1 WHERE id = $2', 
            [nomeFinal, principal.id]);
          console.log(`   📝 Nome atualizado`);
          atualizadas++;
        }
        
        // Unificar secundárias
        for (const secundaria of secundarias) {
          try {
            const vinculos = parseInt(secundaria.total_alunos) + parseInt(secundaria.total_turmas) + 
                            parseInt(secundaria.total_resultados) + parseInt(secundaria.total_consolidados);
            
            if (vinculos > 0) {
              console.log(`   📦 Movendo vínculos de "${secundaria.nome}"...`);
              
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
            console.log(`   ✅ "${secundaria.nome}" unificada e excluída`);
            unificadas++;
            
          } catch (error) {
            console.error(`   ❌ Erro ao unificar "${secundaria.nome}":`, error.message);
          }
        }
        console.log('');
      }
    }

    // Garantir que todas as escolas ativas tenham prefixo
    console.log(`📝 Verificando prefixos de todas as escolas...\n`);
    const todasEscolas = await pool.query(`
      SELECT id, nome, codigo FROM escolas WHERE ativo = true
    `);
    
    for (const escola of todasEscolas.rows) {
      if (!temPrefixo(escola.nome)) {
        const prefixo = determinarPrefixo(escola.codigo);
        const novoNome = `${prefixo} ${escola.nome}`.trim();
        await pool.query('UPDATE escolas SET nome = $1 WHERE id = $2', 
          [novoNome, escola.id]);
        console.log(`   ✅ "${escola.nome}" → "${novoNome}"`);
        atualizadas++;
      }
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

forcarPadronizacao();


