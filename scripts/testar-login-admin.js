const bcrypt = require('bcryptjs');
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

async function testarLogin() {
  try {
    console.log('🔍 Testando login do administrador...\n');

    // Buscar usuário
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      ['admin@sisam.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado!');
      return;
    }

    const usuario = result.rows[0];
    console.log('✅ Usuário encontrado:');
    console.log('   ID:', usuario.id);
    console.log('   Nome:', usuario.nome);
    console.log('   Email:', usuario.email);
    console.log('   Tipo:', usuario.tipo_usuario);
    console.log('   Ativo:', usuario.ativo);
    console.log('   Auth UID:', usuario.auth_uid || 'Não vinculado');
    console.log('   Senha Hash:', usuario.senha.substring(0, 20) + '...\n');

    // Testar senhas comuns
    const senhasTeste = ['admin123', 'Admin123', 'admin', 'senha123'];
    
    console.log('🔐 Testando senhas comuns...\n');
    
    for (const senhaAtual of senhasTeste) {
      const match = await bcrypt.compare(senhaAtual, usuario.senha);
      if (match) {
        console.log(`✅ SENHA CORRETA: "${senhaAtual}"`);
        console.log('\n📝 Use estas credenciais para login:');
        console.log(`   Email: ${usuario.email}`);
        console.log(`   Senha: ${senhaAtual}`);
        return;
      } else {
        console.log(`❌ Senha incorreta: "${senhaAtual}"`);
      }
    }

    console.log('\n⚠️  Nenhuma das senhas testadas está correta.');
    console.log('\n💡 Para redefinir a senha do administrador, execute:');
    console.log('   npm run seed-supabase');
    console.log('\n   Isso criará/atualizará o usuário com a senha: admin123');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testarLogin();

