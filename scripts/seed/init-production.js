const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Configuração SSL para produção
const sslConfig = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
  ? {
      rejectUnauthorized: false,
    }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: sslConfig,
});

async function initProduction() {
  try {
    console.log('🚀 Inicializando sistema em produção...');
    console.log('📊 Configurações do banco:');
    console.log(`   Host: ${process.env.DB_HOST || 'não configurado'}`);
    console.log(`   Port: ${process.env.DB_PORT || 'não configurado'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'não configurado'}`);
    console.log(`   User: ${process.env.DB_USER || 'não configurado'}`);
    console.log(`   SSL: ${sslConfig ? 'Habilitado' : 'Desabilitado'}`);

    // Verificar se as variáveis estão configuradas
    if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      console.warn('⚠️  Variáveis de ambiente do banco não configuradas!');
      console.warn('   Configure: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
      console.warn('   Pulando inicialização do banco...');
      process.exit(0); // Não falhar o build, apenas avisar
    }

    // Testar conexão
    console.log('🔌 Testando conexão com banco de dados...');
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco estabelecida!');

    // Verificar se tabela usuarios existe
    console.log('📋 Verificando estrutura do banco...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.warn('⚠️  Tabela "usuarios" não encontrada!');
      console.warn('   Execute o schema SQL primeiro: database/schema.sql');
      console.warn('   Pulando criação do usuário admin...');
      process.exit(0); // Não falhar o build
    }
    console.log('✅ Estrutura do banco verificada!');

    // Verificar se já existe admin
    console.log('👤 Verificando usuário administrador...');
    const checkAdmin = await pool.query(
      "SELECT id, nome, email FROM usuarios WHERE email = 'admin@sisam.com' OR tipo_usuario = 'administrador' LIMIT 1"
    );

    if (checkAdmin.rows.length > 0) {
      console.log('ℹ️  Usuário administrador já existe:');
      console.log(`   Email: ${checkAdmin.rows[0].email}`);
      console.log(`   Nome: ${checkAdmin.rows[0].nome}`);
    } else {
      // Criar usuário admin
      console.log('➕ Criando usuário administrador padrão...');
      const senhaHash = await bcrypt.hash('admin123', 10);
      
      const result = await pool.query(
        `INSERT INTO usuarios (nome, email, senha, tipo_usuario) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha, tipo_usuario = EXCLUDED.tipo_usuario
         RETURNING id, nome, email`,
        ['Administrador', 'admin@sisam.com', senhaHash, 'administrador']
      );

      if (result.rows.length > 0) {
        console.log('✅ Usuário administrador criado/atualizado com sucesso!');
        console.log('   Email: admin@sisam.com');
        console.log('   Senha: admin123');
        console.log('   ⚠️  ALTERE A SENHA APÓS O PRIMEIRO ACESSO!');
      }
    }

    console.log('\n🎉 Inicialização concluída com sucesso!');
  } catch (error) {
    console.warn('⚠️  Erro durante inicialização:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.warn('\n💡 Dica: Verifique se:');
      console.warn('   - O host do banco está correto (DB_HOST)');
      console.warn('   - A porta está correta (DB_PORT)');
      console.warn('   - O banco está acessível da Vercel');
      console.warn('   - O firewall permite conexões da Vercel');
    } else if (error.code === '28P01') {
      console.warn('\n💡 Dica: Verifique usuário e senha do banco (DB_USER, DB_PASSWORD)');
    } else if (error.code === '3D000') {
      console.warn('\n💡 Dica: O banco de dados não existe. Crie o banco primeiro.');
    }
    
    // Não falhar o build, apenas avisar
    console.warn('   O build continuará, mas o usuário admin não foi criado.');
    console.warn('   Você pode criar manualmente via API: /api/admin/criar-admin');
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Executar apenas se for produção ou se DB_HOST estiver configurado
if (process.env.NODE_ENV === 'production' || process.env.DB_HOST) {
  initProduction();
} else {
  console.log('ℹ️  Ambiente de desenvolvimento detectado. Pulando inicialização de produção.');
}

