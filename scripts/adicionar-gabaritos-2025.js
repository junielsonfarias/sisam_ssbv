const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ============================================
// GABARITO OFICIAL 2025 - 8º E 9º ANO
// ============================================
// ATENÇÃO: Edite os valores abaixo com os gabaritos corretos
// Formato: 'Q1': 'A' (onde A, B, C, D ou E é a resposta correta)
// ============================================

const gabaritos2025 = {
  '8º Ano': {
    // Língua Portuguesa (Q1-Q20)
    'Q1': 'A', 'Q2': 'B', 'Q3': 'C', 'Q4': 'D', 'Q5': 'E',
    'Q6': 'A', 'Q7': 'B', 'Q8': 'C', 'Q9': 'D', 'Q10': 'E',
    'Q11': 'A', 'Q12': 'B', 'Q13': 'C', 'Q14': 'D', 'Q15': 'E',
    'Q16': 'A', 'Q17': 'B', 'Q18': 'C', 'Q19': 'D', 'Q20': 'E',
    // Ciências Humanas (Q21-Q30)
    'Q21': 'A', 'Q22': 'B', 'Q23': 'C', 'Q24': 'D', 'Q25': 'E',
    'Q26': 'A', 'Q27': 'B', 'Q28': 'C', 'Q29': 'D', 'Q30': 'E',
    // Matemática (Q31-Q50)
    'Q31': 'A', 'Q32': 'B', 'Q33': 'C', 'Q34': 'D', 'Q35': 'E',
    'Q36': 'A', 'Q37': 'B', 'Q38': 'C', 'Q39': 'D', 'Q40': 'E',
    'Q41': 'A', 'Q42': 'B', 'Q43': 'C', 'Q44': 'D', 'Q45': 'E',
    'Q46': 'A', 'Q47': 'B', 'Q48': 'C', 'Q49': 'D', 'Q50': 'E',
    // Ciências da Natureza (Q51-Q60)
    'Q51': 'A', 'Q52': 'B', 'Q53': 'C', 'Q54': 'D', 'Q55': 'E',
    'Q56': 'A', 'Q57': 'B', 'Q58': 'C', 'Q59': 'D', 'Q60': 'E',
  },
  '9º Ano': {
    // Língua Portuguesa (Q1-Q20)
    'Q1': 'A', 'Q2': 'B', 'Q3': 'C', 'Q4': 'D', 'Q5': 'E',
    'Q6': 'A', 'Q7': 'B', 'Q8': 'C', 'Q9': 'D', 'Q10': 'E',
    'Q11': 'A', 'Q12': 'B', 'Q13': 'C', 'Q14': 'D', 'Q15': 'E',
    'Q16': 'A', 'Q17': 'B', 'Q18': 'C', 'Q19': 'D', 'Q20': 'E',
    // Ciências Humanas (Q21-Q30)
    'Q21': 'A', 'Q22': 'B', 'Q23': 'C', 'Q24': 'D', 'Q25': 'E',
    'Q26': 'A', 'Q27': 'B', 'Q28': 'C', 'Q29': 'D', 'Q30': 'E',
    // Matemática (Q31-Q50)
    'Q31': 'A', 'Q32': 'B', 'Q33': 'C', 'Q34': 'D', 'Q35': 'E',
    'Q36': 'A', 'Q37': 'B', 'Q38': 'C', 'Q39': 'D', 'Q40': 'E',
    'Q41': 'A', 'Q42': 'B', 'Q43': 'C', 'Q44': 'D', 'Q45': 'E',
    'Q46': 'A', 'Q47': 'B', 'Q48': 'C', 'Q49': 'D', 'Q50': 'E',
    // Ciências da Natureza (Q51-Q60)
    'Q51': 'A', 'Q52': 'B', 'Q53': 'C', 'Q54': 'D', 'Q55': 'E',
    'Q56': 'A', 'Q57': 'B', 'Q58': 'C', 'Q59': 'D', 'Q60': 'E',
  }
};

async function adicionarGabaritos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Adicionando gabaritos para 2025 (8º e 9º ano)...\n');

    // Buscar todas as questões do ano 2025
    const questoesResult = await client.query(
      `SELECT id, codigo, ano_letivo FROM questoes WHERE ano_letivo = '2025' ORDER BY codigo`
    );

    if (questoesResult.rows.length === 0) {
      console.log('⚠️  Nenhuma questão encontrada para o ano 2025.');
      console.log('   Por favor, certifique-se de que as questões foram cadastradas com ano_letivo = 2025.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`✅ Encontradas ${questoesResult.rows.length} questões para 2025\n`);

    let totalAdicionados = 0;
    let totalAtualizados = 0;

    // Processar cada série
    for (const [serie, gabaritos] of Object.entries(gabaritos2025)) {
      console.log(`📝 Processando gabaritos para ${serie}...`);

      for (const [codigoQuestao, gabarito] of Object.entries(gabaritos)) {
        // Encontrar a questão pelo código
        const questao = questoesResult.rows.find(q => q.codigo === codigoQuestao);
        
        if (!questao) {
          console.log(`   ⚠️  Questão ${codigoQuestao} não encontrada no banco de dados`);
          continue;
        }

        // Verificar se já existe gabarito para esta questão e série
        const existe = await client.query(
          'SELECT id FROM questoes_gabaritos WHERE questao_id = $1 AND serie = $2',
          [questao.id, serie]
        );

        if (existe.rows.length > 0) {
          // Atualizar gabarito existente
          await client.query(
            `UPDATE questoes_gabaritos 
             SET gabarito = $1, atualizado_em = CURRENT_TIMESTAMP 
             WHERE questao_id = $2 AND serie = $3`,
            [gabarito, questao.id, serie]
          );
          totalAtualizados++;
        } else {
          // Inserir novo gabarito
          await client.query(
            `INSERT INTO questoes_gabaritos (questao_id, serie, gabarito)
             VALUES ($1, $2, $3)`,
            [questao.id, serie, gabarito]
          );
          totalAdicionados++;
        }
      }
      
      console.log(`   ✅ ${serie}: ${Object.keys(gabaritos).length} gabaritos processados\n`);
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Processo concluído!');
    console.log(`   📊 Total de gabaritos adicionados: ${totalAdicionados}`);
    console.log(`   📊 Total de gabaritos atualizados: ${totalAtualizados}`);
    console.log(`\n💡 Dica: Use 'npm run listar-gabaritos-2025' para verificar os gabaritos cadastrados.\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao adicionar gabaritos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Função para listar gabaritos existentes
async function listarGabaritos() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT q.codigo, q.ano_letivo, g.serie, g.gabarito
       FROM questoes q
       INNER JOIN questoes_gabaritos g ON q.id = g.questao_id
       WHERE q.ano_letivo = '2025'
       ORDER BY q.codigo, g.serie`
    );

    if (result.rows.length === 0) {
      console.log('Nenhum gabarito encontrado para 2025.');
      return;
    }

    console.log('\n📋 Gabaritos existentes para 2025:\n');
    const porSerie = {};
    
    result.rows.forEach(row => {
      if (!porSerie[row.serie]) {
        porSerie[row.serie] = [];
      }
      porSerie[row.serie].push({ codigo: row.codigo, gabarito: row.gabarito });
    });

    for (const [serie, questoes] of Object.entries(porSerie)) {
      console.log(`${serie}:`);
      questoes.forEach(q => {
        console.log(`  ${q.codigo}: ${q.gabarito}`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('Erro ao listar gabaritos:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
const comando = process.argv[2];

if (comando === 'listar') {
  listarGabaritos();
} else {
  adicionarGabaritos();
}

