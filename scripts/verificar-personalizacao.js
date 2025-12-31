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

async function verificarPersonalizacao() {
  try {
    console.log('🎨 Verificando personalização...\n');

    const result = await pool.query('SELECT * FROM personalizacao');

    if (result.rows.length === 0) {
      console.log('❌ Nenhuma configuração de personalização encontrada!');
      return;
    }

    const config = result.rows[0];
    
    console.log('✅ Configuração encontrada:');
    console.log('   ID:', config.id);
    console.log('   Tipo:', config.tipo);
    console.log('   Título:', config.login_titulo);
    console.log('   Subtítulo:', config.login_subtitulo);
    console.log('   Cor Primária:', config.login_cor_primaria);
    console.log('   Cor Secundária:', config.login_cor_secundaria);
    
    if (config.login_imagem_url) {
      const tamanho = config.login_imagem_url.length;
      const isBase64 = config.login_imagem_url.startsWith('data:image/');
      const tamanhoMB = (tamanho / (1024 * 1024)).toFixed(2);
      
      console.log('\n📷 Logo:');
      console.log('   Formato:', isBase64 ? 'Base64 (Data URL)' : 'URL externa');
      console.log('   Tamanho:', tamanho, 'caracteres');
      console.log('   Tamanho estimado:', tamanhoMB, 'MB');
      
      if (parseFloat(tamanhoMB) > 1) {
        console.log('\n⚠️  ATENÇÃO: A imagem é muito grande!');
        console.log('   Imagens Base64 acima de 1MB podem causar:');
        console.log('   - Lentidão no carregamento');
        console.log('   - Timeouts em produção');
        console.log('   - Problemas de performance');
        console.log('\n💡 Recomendação:');
        console.log('   - Use uma imagem menor (máximo 200KB)');
        console.log('   - Comprima a imagem antes de fazer upload');
        console.log('   - Ou hospede a imagem externamente e use a URL');
      } else {
        console.log('   ✅ Tamanho adequado');
      }
      
      if (isBase64) {
        const preview = config.login_imagem_url.substring(0, 50) + '...';
        console.log('   Preview:', preview);
      } else {
        console.log('   URL:', config.login_imagem_url);
      }
    } else {
      console.log('\n📷 Logo: Não configurada');
    }
    
    console.log('\n🦶 Rodapé:');
    console.log('   Texto:', config.rodape_texto || 'Não configurado');
    console.log('   Ativo:', config.rodape_ativo ? 'Sim' : 'Não');
    
    if (config.rodape_link) {
      console.log('   Link:', config.rodape_link);
      console.log('   Texto do Link:', config.rodape_link_texto || 'Não configurado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Detalhes:', error);
  } finally {
    await pool.end();
  }
}

verificarPersonalizacao();

