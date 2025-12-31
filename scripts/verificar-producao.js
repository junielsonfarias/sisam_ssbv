const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verificarProducao() {
  const erros = [];
  const avisos = [];
  const sucessos = [];

  log('\n🔍 Verificando Preparação para Produção...\n', 'blue');

  // 1. Verificar variáveis de ambiente
  log('1️⃣ Verificando variáveis de ambiente...', 'blue');
  const envVars = {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  if (!envVars.JWT_SECRET || envVars.JWT_SECRET === 'sua-chave-secreta-aqui-altere-em-producao') {
    erros.push('❌ JWT_SECRET não configurado ou usando valor padrão inseguro');
  } else if (envVars.JWT_SECRET.length < 32) {
    avisos.push('⚠️  JWT_SECRET deve ter pelo menos 32 caracteres');
  } else {
    sucessos.push('✅ JWT_SECRET configurado');
  }

  if (envVars.NODE_ENV !== 'production') {
    avisos.push('⚠️  NODE_ENV não está definido como "production"');
  } else {
    sucessos.push('✅ NODE_ENV configurado como production');
  }

  // 2. Verificar conexão com banco de dados
  log('\n2️⃣ Verificando conexão com banco de dados...', 'blue');
  try {
    const result = await pool.query('SELECT version()');
    sucessos.push('✅ Conexão com banco de dados OK');
    log(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`, 'green');
  } catch (error) {
    erros.push(`❌ Erro ao conectar no banco: ${error.message}`);
  }

  // 3. Verificar estrutura do banco
  log('\n3️⃣ Verificando estrutura do banco de dados...', 'blue');
  const tabelasEsperadas = [
    'usuarios',
    'polos',
    'escolas',
    'turmas',
    'alunos',
    'questoes',
    'resultados_provas',
    'resultados_consolidados',
  ];

  for (const tabela of tabelasEsperadas) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tabela]
      );
      if (result.rows[0].exists) {
        sucessos.push(`✅ Tabela ${tabela} existe`);
      } else {
        erros.push(`❌ Tabela ${tabela} não encontrada`);
      }
    } catch (error) {
      erros.push(`❌ Erro ao verificar tabela ${tabela}: ${error.message}`);
    }
  }

  // 4. Verificar dados críticos
  log('\n4️⃣ Verificando dados críticos...', 'blue');
  try {
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true');
    const totalUsuarios = parseInt(usuarios.rows[0].total);
    if (totalUsuarios === 0) {
      avisos.push('⚠️  Nenhum usuário ativo encontrado');
    } else {
      sucessos.push(`✅ ${totalUsuarios} usuário(s) ativo(s)`);
    }

    // Verificar se há usuário admin
    const admin = await pool.query(
      "SELECT COUNT(*) as total FROM usuarios WHERE tipo_usuario = 'administrador' AND ativo = true"
    );
    if (parseInt(admin.rows[0].total) === 0) {
      erros.push('❌ Nenhum administrador ativo encontrado');
    } else {
      sucessos.push('✅ Administrador(es) encontrado(s)');
    }

    // Verificar senha padrão
    const senhaPadrao = await pool.query(
      "SELECT COUNT(*) as total FROM usuarios WHERE senha = '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq'"
    );
    if (parseInt(senhaPadrao.rows[0].total) > 0) {
      avisos.push('⚠️  Possível senha padrão detectada - verifique usuários');
    }
  } catch (error) {
    erros.push(`❌ Erro ao verificar dados: ${error.message}`);
  }

  // 5. Verificar índices
  log('\n5️⃣ Verificando índices do banco de dados...', 'blue');
  try {
    const indices = await pool.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    if (indices.rows.length > 0) {
      sucessos.push(`✅ ${indices.rows.length} índice(s) encontrado(s)`);
    } else {
      avisos.push('⚠️  Nenhum índice encontrado - considere adicionar índices para melhor performance');
    }
  } catch (error) {
    avisos.push(`⚠️  Erro ao verificar índices: ${error.message}`);
  }

  // 6. Verificar arquivos de configuração
  log('\n6️⃣ Verificando arquivos de configuração...', 'blue');
  const arquivosNecessarios = [
    'package.json',
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.ts',
  ];

  for (const arquivo of arquivosNecessarios) {
    if (fs.existsSync(path.join(process.cwd(), arquivo))) {
      sucessos.push(`✅ ${arquivo} encontrado`);
    } else {
      erros.push(`❌ ${arquivo} não encontrado`);
    }
  }

  // 7. Verificar .env
  log('\n7️⃣ Verificando variáveis de ambiente...', 'blue');
  if (!fs.existsSync(path.join(process.cwd(), '.env'))) {
    avisos.push('⚠️  Arquivo .env não encontrado (pode estar em outro local)');
  } else {
    sucessos.push('✅ Arquivo .env encontrado');
  }

  // Resumo
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMO DA VERIFICAÇÃO', 'blue');
  log('='.repeat(60), 'blue');

  if (sucessos.length > 0) {
    log('\n✅ Sucessos:', 'green');
    sucessos.forEach((s) => log(`   ${s}`, 'green'));
  }

  if (avisos.length > 0) {
    log('\n⚠️  Avisos:', 'yellow');
    avisos.forEach((a) => log(`   ${a}`, 'yellow'));
  }

  if (erros.length > 0) {
    log('\n❌ Erros:', 'red');
    erros.forEach((e) => log(`   ${e}`, 'red'));
  }

  log('\n' + '='.repeat(60), 'blue');

  if (erros.length === 0 && avisos.length === 0) {
    log('\n🎉 Sistema pronto para produção!', 'green');
    process.exit(0);
  } else if (erros.length === 0) {
    log('\n⚠️  Sistema quase pronto - revise os avisos acima', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ Sistema não está pronto - corrija os erros acima', 'red');
    process.exit(1);
  }
}

// Executar verificação
verificarProducao()
  .then(() => {
    pool.end();
  })
  .catch((error) => {
    log(`\n❌ Erro fatal: ${error.message}`, 'red');
    pool.end();
    process.exit(1);
  });

