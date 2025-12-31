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
  let nomeBase = nome.trim();
  
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
    if (nomeBase.toUpperCase().startsWith(prefixo)) {
      nomeBase = nomeBase.substring(prefixo.length).trim();
      break;
    }
  }
  
  return nomeBase;
}

async function removerPrefixos() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Removendo prefixos dos nomes das escolas...\n');

    // Buscar todas as escolas
    const todasEscolas = await client.query(
      'SELECT id, nome FROM escolas WHERE ativo = true ORDER BY nome'
    );
    
    console.log(`📊 Total de escolas encontradas: ${todasEscolas.rows.length}\n`);

    const escolasRenomeadas = [];

    for (const escola of todasEscolas.rows) {
      const nomeBase = extrairNomeBase(escola.nome);
      
      // Se o nome mudou, atualizar
      if (nomeBase !== escola.nome) {
        escolasRenomeadas.push({
          id: escola.id,
          nomeAntigo: escola.nome,
          nomeNovo: nomeBase
        });
      }
    }

    if (escolasRenomeadas.length === 0) {
      console.log('✅ Nenhuma escola precisa ser renomeada.');
      await client.query('COMMIT');
      return;
    }

    console.log(`🔄 Renomeando ${escolasRenomeadas.length} escola(s):\n`);

    for (const { id, nomeAntigo, nomeNovo } of escolasRenomeadas) {
      console.log(`  • "${nomeAntigo}" → "${nomeNovo}"`);
      
      await client.query(
        'UPDATE escolas SET nome = $1 WHERE id = $2',
        [nomeNovo, id]
      );
    }

    await client.query('COMMIT');
    console.log('\n✅ Renomeação concluída com sucesso!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao remover prefixos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
removerPrefixos()
  .then(() => {
    console.log('\n✨ Processo finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

