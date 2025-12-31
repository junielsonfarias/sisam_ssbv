const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST?.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : false
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function perguntar(pergunta) {
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      resolve(resposta);
    });
  });
}

async function removerLogo() {
  try {
    console.log('🗑️  Remover Logo do Banco de Dados\n');
    console.log('⚠️  Esta ação removerá a logo Base64 do banco.');
    console.log('    Você poderá adicionar uma URL externa depois.\n');

    const confirmacao = await perguntar('Deseja continuar? (s/N): ');
    
    if (confirmacao.toLowerCase() !== 's') {
      console.log('\n❌ Operação cancelada.');
      rl.close();
      return;
    }

    console.log('\n🔄 Removendo logo...');

    const result = await pool.query(
      `UPDATE personalizacao 
       SET login_imagem_url = NULL, 
           atualizado_em = CURRENT_TIMESTAMP
       WHERE tipo = 'principal'
       RETURNING id`
    );

    if (result.rows.length > 0) {
      console.log('✅ Logo removida com sucesso!\n');
      console.log('📝 Próximos passos:');
      console.log('   1. Faça upload da logo em: https://imgur.com/');
      console.log('   2. Copie a URL da imagem (clique direito → Copiar endereço da imagem)');
      console.log('   3. Acesse: /admin/personalizacao');
      console.log('   4. Cole a URL no campo "URL da Logo"');
      console.log('   5. Salve as alterações\n');
      console.log('💡 Vantagens de usar URL externa:');
      console.log('   - Carregamento mais rápido');
      console.log('   - Sem problemas de tamanho');
      console.log('   - CDN automático');
    } else {
      console.log('⚠️  Nenhuma configuração encontrada para atualizar.');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    rl.close();
    await pool.end();
  }
}

removerLogo();

