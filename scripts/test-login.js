const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui-altere-em-producao';

async function testarLogin() {
  try {
    console.log('🔍 Testando login...\n');
    
    // Buscar primeiro usuário ativo
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE ativo = true LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário ativo encontrado');
      pool.end();
      return;
    }
    
    const usuario = result.rows[0];
    console.log('✅ Usuário encontrado:');
    console.log('  - ID:', usuario.id);
    console.log('  - Email:', usuario.email);
    console.log('  - Nome:', usuario.nome);
    console.log('  - Tipo:', usuario.tipo_usuario);
    console.log('  - Tem senha:', !!usuario.senha);
    console.log('  - Polo ID:', usuario.polo_id);
    console.log('  - Escola ID:', usuario.escola_id);
    console.log('');
    
    // Validar tipo_usuario
    const tiposValidos = ['administrador', 'tecnico', 'polo', 'escola'];
    const tipoUsuario = String(usuario.tipo_usuario || '').toLowerCase();
    
    if (!tipoUsuario || !tiposValidos.includes(tipoUsuario)) {
      console.log('❌ Tipo de usuário inválido:', usuario.tipo_usuario);
      pool.end();
      return;
    }
    
    console.log('✅ Tipo de usuário válido:', tipoUsuario);
    console.log('');
    
    // Preparar payload do token
    const tokenPayload = {
      userId: String(usuario.id),
      email: String(usuario.email),
      tipoUsuario: tipoUsuario,
      poloId: usuario.polo_id ? String(usuario.polo_id) : null,
      escolaId: usuario.escola_id ? String(usuario.escola_id) : null,
    };
    
    console.log('📦 Payload do token:');
    console.log(JSON.stringify(tokenPayload, null, 2));
    console.log('');
    
    // Tentar gerar token
    try {
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
      console.log('✅ Token gerado com sucesso!');
      console.log('  Token (primeiros 50 chars):', token.substring(0, 50) + '...');
      console.log('');
      
      // Verificar token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verificado com sucesso!');
      console.log('  Decoded:', JSON.stringify(decoded, null, 2));
    } catch (tokenError) {
      console.log('❌ Erro ao gerar/verificar token:');
      console.log('  Erro:', tokenError.message);
      console.log('  Stack:', tokenError.stack);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    pool.end();
  }
}

testarLogin();

