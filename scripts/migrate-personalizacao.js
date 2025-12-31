const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Criando tabela de personalização...');

    // Criar tabela de configurações de personalização
    await client.query(`
      CREATE TABLE IF NOT EXISTS personalizacao (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tipo VARCHAR(50) UNIQUE NOT NULL,
        
        -- Configurações do Login
        login_titulo VARCHAR(255),
        login_subtitulo TEXT,
        login_imagem_url TEXT,
        login_cor_primaria VARCHAR(7),
        login_cor_secundaria VARCHAR(7),
        
        -- Configurações do Rodapé (aparece em todo o sistema)
        rodape_texto TEXT,
        rodape_link TEXT,
        rodape_link_texto VARCHAR(255),
        rodape_ativo BOOLEAN DEFAULT true,
        
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inserir configuração padrão
    await client.query(`
      INSERT INTO personalizacao (tipo, login_titulo, login_subtitulo, rodape_texto, rodape_ativo)
      VALUES ('principal', 'SISAM', 'Sistema de Análise de Provas', '© 2026 SISAM - Todos os direitos reservados', true)
      ON CONFLICT (tipo) DO NOTHING;
    `);

    console.log('✅ Tabela de personalização criada com sucesso!');

    await client.query('COMMIT');
    console.log('\n✅ Migration concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { migrate };

