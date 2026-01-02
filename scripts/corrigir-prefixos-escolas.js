const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function corrigirPrefixos() {
  try {
    console.log('🔍 Verificando e corrigindo prefixos das escolas...\n');

    // Buscar todas as escolas
    const escolasResult = await pool.query(`
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        p.nome as polo_nome
      FROM escolas e
      INNER JOIN polos p ON e.polo_id = p.id
      WHERE e.ativo = true
      ORDER BY e.nome
    `);

    const escolas = escolasResult.rows;
    console.log(`📋 Total de escolas: ${escolas.length}\n`);

    // Mapear códigos para prefixos corretos
    const prefixosPorCodigo = {
      'EMEIF_ALACID_NUNES': 'EMEIF',
      'EMEIF_CAETÉ': 'EMEIF',
      'EMEIF_CASTANHAL': 'EMEIF',
      'CRUZEIRO': 'EMEIF',
      'EMEB_EMMANOEL': 'EMEB',
      'EMEIF_HAYDEE_MAIA': 'EMEIF',
      'INDEPENDÊNCIA': 'EMEIF',
      'EMEF_MAGALHÃES_BARATA': 'EMEF',
      'EMEIF_MALOCA': 'EMEIF',
      'EMEIF_MANOEL_R._PINHEIRO': 'EMEIF',
      'NSA_SRA_DE_LOURDES': 'EMEIF',
      'PADRE_SILVÉRIO': 'EMEIF',
      'EMEF_PDE_JOSÉ_DE_ANCHIETA': 'EMEF',
      'PEDRO_NOGUEIRA': 'EMEIF',
      'RAQUEL': 'EMEIF',
      'SÃO_BENEDITO': 'EMEIF',
      'SÃO_JOSÉ': 'EMEIF',
      'SÃO_LUCAS': 'EMEIF',
      'VER._ENGRÁCIO': 'EMEIF',
    };

    const correcoes = [];

    escolas.forEach(escola => {
      const codigo = escola.codigo;
      const nomeAtual = escola.nome;
      
      // Verificar se já tem prefixo
      const temPrefixo = /^(EMEIF|EMEF|EE|EEM|EMEB|ESCOLA|COLÉGIO|INSTITUTO)\s/i.test(nomeAtual);
      
      if (!temPrefixo && codigo && prefixosPorCodigo[codigo]) {
        const prefixo = prefixosPorCodigo[codigo];
        const nomeBase = nomeAtual.replace(/^EMEIF\s/i, '').trim();
        const novoNome = `${prefixo} ${nomeBase}`;
        
        if (novoNome !== nomeAtual) {
          correcoes.push({
            id: escola.id,
            nomeAtual,
            novoNome,
            codigo
          });
        }
      } else if (temPrefixo) {
        // Verificar se o prefixo está correto
        const prefixoAtual = nomeAtual.match(/^(EMEIF|EMEF|EE|EEM|EMEB|ESCOLA|COLÉGIO|INSTITUTO)\s/i)?.[1];
        const prefixoCorreto = codigo && prefixosPorCodigo[codigo];
        
        if (prefixoCorreto && prefixoAtual && prefixoAtual.toUpperCase() !== prefixoCorreto) {
          const nomeBase = nomeAtual.replace(/^(EMEIF|EMEF|EE|EEM|EMEB|ESCOLA|COLÉGIO|INSTITUTO)\s/i, '').trim();
          const novoNome = `${prefixoCorreto} ${nomeBase}`;
          
          correcoes.push({
            id: escola.id,
            nomeAtual,
            novoNome,
            codigo
          });
        }
      }
    });

    if (correcoes.length === 0) {
      console.log('✅ Todas as escolas já têm os prefixos corretos.\n');
      process.exit(0);
    }

    console.log(`📝 Escolas que precisam de correção: ${correcoes.length}\n`);
    correcoes.forEach((correcao, index) => {
      console.log(`${index + 1}. "${correcao.nomeAtual}" → "${correcao.novoNome}"`);
      console.log(`   Código: ${correcao.codigo}\n`);
    });

    console.log(`\n🔄 Aplicando correções...\n`);

    for (const correcao of correcoes) {
      try {
        await pool.query('UPDATE escolas SET nome = $1 WHERE id = $2', 
          [correcao.novoNome, correcao.id]);
        console.log(`   ✅ "${correcao.nomeAtual}" → "${correcao.novoNome}"`);
      } catch (error) {
        console.error(`   ❌ Erro ao corrigir "${correcao.nomeAtual}":`, error.message);
      }
    }

    console.log(`\n✅ Correções aplicadas!\n`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}

corrigirPrefixos();

