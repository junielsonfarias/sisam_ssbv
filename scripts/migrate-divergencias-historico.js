/**
 * SISAM - Migration: Tabela de Histórico de Divergências
 *
 * Este script cria a tabela divergencias_historico para armazenar
 * o histórico de correções realizadas no sistema.
 *
 * Uso: npm run migrate-divergencias
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Divide o SQL em comandos individuais, respeitando blocos $$ de funções
 */
function splitSqlCommands(sql) {
  const commands = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Ignorar linhas de comentário puro
    if (trimmedLine.startsWith('--') && !inDollarQuote) {
      continue;
    }

    current += line + '\n';

    // Detectar início/fim de blocos $$
    const dollarMatches = line.match(/\$\$|\$[a-zA-Z_][a-zA-Z0-9_]*\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match;
        } else if (match === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }

    // Se não estamos em um bloco $$ e a linha termina com ;
    if (!inDollarQuote && trimmedLine.endsWith(';')) {
      const command = current.trim();
      if (command && !command.startsWith('--')) {
        commands.push(command);
      }
      current = '';
    }
  }

  // Adicionar comando restante se houver
  if (current.trim() && !current.trim().startsWith('--')) {
    commands.push(current.trim());
  }

  return commands;
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('SISAM - Migration: Tabela de Histórico de Divergências');
  console.log('='.repeat(60));

  try {
    // Testar conexão
    console.log('\n1. Testando conexão com o banco...');
    await pool.query('SELECT 1');
    console.log('   ✓ Conexão estabelecida com sucesso!');

    // Ler arquivo SQL da migration
    console.log('\n2. Lendo arquivo de migration...');
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '004_divergencias_historico.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo não encontrado: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('   ✓ Arquivo lido com sucesso!');

    // Dividir em comandos
    console.log('\n3. Processando comandos SQL...');
    const commands = splitSqlCommands(sql);
    console.log(`   ✓ ${commands.length} comando(s) encontrado(s)`);

    // Executar cada comando
    console.log('\n4. Executando migration...');
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const preview = command.substring(0, 60).replace(/\n/g, ' ');

      try {
        await pool.query(command);
        console.log(`   [${i + 1}/${commands.length}] ✓ ${preview}...`);
      } catch (error) {
        // Ignorar erros de "já existe"
        if (error.code === '42P07' || error.code === '42710' ||
            error.message.includes('already exists') ||
            error.message.includes('já existe')) {
          console.log(`   [${i + 1}/${commands.length}] ~ ${preview}... (já existe)`);
        } else {
          console.error(`   [${i + 1}/${commands.length}] ✗ Erro: ${error.message}`);
          throw error;
        }
      }
    }

    // Verificar se a tabela foi criada
    console.log('\n5. Verificando criação da tabela...');
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'divergencias_historico'
    `);

    if (result.rows.length > 0) {
      console.log('   ✓ Tabela divergencias_historico criada com sucesso!');
    } else {
      throw new Error('Tabela não foi encontrada após migration');
    }

    // Verificar função de limpeza
    const funcResult = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name = 'limpar_historico_divergencias'
    `);

    if (funcResult.rows.length > 0) {
      console.log('   ✓ Função limpar_historico_divergencias criada com sucesso!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration concluída com sucesso!');
    console.log('='.repeat(60));
    console.log('\nA área de Divergências está pronta para uso em:');
    console.log('   /admin/divergencias');
    console.log('');

  } catch (error) {
    console.error('\n✗ Erro durante a migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar migration
runMigration();
