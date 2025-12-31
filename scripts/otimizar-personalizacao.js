const { Pool } = require('pg');

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

async function otimizarPersonalizacao() {
  try {
    console.log('🎨 Otimizando personalização para produção...\n');

    const result = await pool.query('SELECT * FROM personalizacao');

    if (result.rows.length === 0) {
      console.log('❌ Nenhuma configuração encontrada!');
      return;
    }

    const config = result.rows[0];
    
    if (!config.login_imagem_url) {
      console.log('ℹ️  Nenhuma logo configurada. Nada a otimizar.');
      return;
    }

    const tamanhoOriginal = config.login_imagem_url.length;
    const tamanhoMB = (tamanhoOriginal / (1024 * 1024)).toFixed(2);
    
    console.log('📊 Logo atual:');
    console.log('   Tamanho:', tamanhoOriginal, 'caracteres');
    console.log('   Tamanho:', tamanhoMB, 'MB\n');

    if (parseFloat(tamanhoMB) > 0.5) {
      console.log('⚠️  A logo é grande e pode causar problemas em produção!\n');
      console.log('💡 Recomendações:');
      console.log('   1. Comprima a imagem em: https://tinypng.com/');
      console.log('   2. Redimensione para no máximo 400x400 pixels');
      console.log('   3. Tamanho ideal: menos de 200 KB');
      console.log('   4. Ou use hospedagem externa (Imgur, Cloudinary, etc.)\n');
      console.log('📝 Para remover a logo atual e usar URL externa:');
      console.log('   1. Faça upload da imagem em https://imgur.com/');
      console.log('   2. Copie a URL da imagem');
      console.log('   3. Acesse /admin/personalizacao');
      console.log('   4. Cole a URL no campo de imagem\n');
      
      // Perguntar se quer remover
      console.log('❓ Deseja remover a logo atual do banco?');
      console.log('   (Você precisará adicionar uma URL externa depois)');
      console.log('\n   Execute este comando para remover:');
      console.log('   npm run remover-logo');
    } else {
      console.log('✅ Tamanho da logo está OK para produção!');
      console.log('   A logo deve carregar normalmente no Vercel.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

otimizarPersonalizacao();

