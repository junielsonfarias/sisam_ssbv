/**
 * SISAM - Migration: Corrigir CASCADE em resultados_provas e criar tabela de historico de divergencias
 *
 * Este script executa duas migrations:
 * 1. 003_corrigir_cascade_resultados_provas.sql - Corrige ON DELETE SET NULL para CASCADE
 * 2. 004_divergencias_historico.sql - Cria tabela para historico de divergencias
 *
 * Uso: npm run migrate-cascade-divergencias
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuracao do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

/**
 * Divide o SQL em comandos individuais, respeitando blocos $$ de funcoes
 */
function splitSqlCommands(sql) {
  const commands = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Ignorar linhas de comentario puro
    if (trimmedLine.startsWith('--') && !inDollarQuote) {
      continue;
    }

    current += line + '\n';

    // Detectar inicio/fim de blocos $$
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

    // Se nao estamos em bloco $$ e a linha termina com ;
    if (!inDollarQuote && trimmedLine.endsWith(';')) {
      const cmd = current.trim();
      if (cmd.length > 0 && !cmd.startsWith('--')) {
        commands.push(cmd);
      }
      current = '';
    }
  }

  // Adicionar qualquer comando restante
  if (current.trim().length > 0 && !current.trim().startsWith('--')) {
    commands.push(current.trim());
  }

  return commands;
}

/**
 * Extrai informacao sobre o tipo de comando SQL
 */
function getCommandInfo(command) {
  const upper = command.toUpperCase();

  if (upper.includes('CREATE TABLE')) {
    const match = command.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
    return { type: 'CREATE TABLE', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('ALTER TABLE')) {
    const match = command.match(/ALTER TABLE\s+(\w+)/i);
    const action = upper.includes('DROP CONSTRAINT') ? 'DROP CONSTRAINT' :
                   upper.includes('ADD CONSTRAINT') ? 'ADD CONSTRAINT' :
                   upper.includes('ADD COLUMN') ? 'ADD COLUMN' : 'ALTER';
    return { type: 'ALTER TABLE', name: match?.[1] || 'unknown', action };
  }

  if (upper.includes('CREATE INDEX')) {
    const match = command.match(/CREATE INDEX(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
    return { type: 'CREATE INDEX', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('DELETE FROM')) {
    const match = command.match(/DELETE FROM\s+(\w+)/i);
    return { type: 'DELETE', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('CREATE OR REPLACE FUNCTION')) {
    const match = command.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/i);
    return { type: 'FUNCTION', name: match?.[1] || 'unknown' };
  }

  if (upper.startsWith('DO $$') || upper.startsWith('DO $')) {
    return { type: 'DO BLOCK', name: 'anonymous' };
  }

  if (upper.includes('COMMENT ON')) {
    return { type: 'COMMENT', name: '' };
  }

  return { type: 'OTHER', name: '' };
}

/**
 * Executa uma migration
 */
async function executeMigrationFile(client, migrationName, filePath) {
  console.log('');
  console.log(`----- Executando: ${migrationName} -----`);
  console.log('');

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠ Arquivo nao encontrado: ${filePath}`);
    return { success: false, error: 'Arquivo nao encontrado' };
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`   Arquivo lido: ${path.basename(filePath)}`);

  const commands = splitSqlCommands(sql);
  console.log(`   Comandos a executar: ${commands.length}`);
  console.log('');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    const info = getCommandInfo(command);

    try {
      await client.query(command);
      successCount++;

      // Log baseado no tipo de comando
      switch (info.type) {
        case 'CREATE TABLE':
          console.log(`   ✓ Tabela criada: ${info.name}`);
          break;
        case 'ALTER TABLE':
          console.log(`   ✓ Tabela ${info.name}: ${info.action || 'alterada'}`);
          break;
        case 'CREATE INDEX':
          console.log(`   ✓ Indice criado: ${info.name}`);
          break;
        case 'DELETE':
          console.log(`   ✓ Registros deletados de: ${info.name}`);
          break;
        case 'FUNCTION':
          console.log(`   ✓ Funcao criada: ${info.name}`);
          break;
        case 'DO BLOCK':
          console.log(`   ✓ Bloco anonimo executado`);
          break;
        case 'COMMENT':
          // Nao logar comentarios
          break;
        default:
          break;
      }
    } catch (error) {
      const errorMsg = error.message || '';

      // Erros que podemos ignorar
      if (errorMsg.includes('already exists') ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('duplicate key')) {
        skipCount++;
        console.log(`   ~ Ignorado (ja existe): ${info.type} ${info.name}`);
      } else {
        errorCount++;
        console.log(`   ✗ Erro em ${info.type} ${info.name}: ${errorMsg.substring(0, 100)}`);
      }
    }
  }

  console.log('');
  console.log(`   Resultado: ${successCount} executados, ${skipCount} ignorados, ${errorCount} erros`);

  return { success: errorCount === 0, successCount, skipCount, errorCount };
}

async function executeMigrations() {
  console.log('');
  console.log('='.repeat(70));
  console.log('SISAM - Migration: Corrigir CASCADE e Criar Historico de Divergencias');
  console.log('='.repeat(70));
  console.log('');

  // Mostrar configuracao (sem senha)
  console.log('Configuracao do banco:');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Porta: ${process.env.DB_PORT || '5432'}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   Usuario: ${process.env.DB_USER}`);
  console.log('');

  const client = await pool.connect();

  try {
    // Verificar conexao
    console.log('1. Verificando conexao com o banco...');
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log(`   Conectado! Hora do servidor: ${result.rows[0].now}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    console.log('');

    // Verificar estado atual antes da migration
    console.log('2. Verificando estado atual...');

    // Verificar orfaos
    const orfaosResult = await client.query(
      'SELECT COUNT(*) as total FROM resultados_provas WHERE aluno_id IS NULL'
    );
    const totalOrfaos = parseInt(orfaosResult.rows[0].total);
    console.log(`   Registros orfaos em resultados_provas: ${totalOrfaos}`);

    // Verificar se tabela divergencias_historico existe
    const tabelaExiste = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'divergencias_historico'
      ) as existe
    `);
    console.log(`   Tabela divergencias_historico existe: ${tabelaExiste.rows[0].existe ? 'Sim' : 'Nao'}`);
    console.log('');

    // Executar migrations
    console.log('3. Executando migrations...');

    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

    // Migration 1: Corrigir CASCADE
    const result1 = await executeMigrationFile(
      client,
      '003_corrigir_cascade_resultados_provas',
      path.join(migrationsDir, '003_corrigir_cascade_resultados_provas.sql')
    );

    // Migration 2: Criar tabela de historico
    const result2 = await executeMigrationFile(
      client,
      '004_divergencias_historico',
      path.join(migrationsDir, '004_divergencias_historico.sql')
    );

    // Verificar resultado final
    console.log('');
    console.log('4. Verificando resultado final...');

    // Verificar orfaos restantes
    const orfaosRestantes = await client.query(
      'SELECT COUNT(*) as total FROM resultados_provas WHERE aluno_id IS NULL'
    );
    console.log(`   Registros orfaos apos limpeza: ${orfaosRestantes.rows[0].total}`);

    // Verificar constraint
    const constraintResult = await client.query(`
      SELECT conname, confdeltype
      FROM pg_constraint
      WHERE conname = 'resultados_provas_aluno_id_fkey'
    `);
    if (constraintResult.rows.length > 0) {
      const deleteType = constraintResult.rows[0].confdeltype;
      const deleteAction = deleteType === 'c' ? 'CASCADE' : deleteType === 'n' ? 'SET NULL' : deleteType;
      console.log(`   Constraint resultados_provas_aluno_id_fkey: ON DELETE ${deleteAction}`);
    }

    // Verificar tabela de historico
    const historicoExiste = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'divergencias_historico'
      ) as existe
    `);
    console.log(`   Tabela divergencias_historico criada: ${historicoExiste.rows[0].existe ? 'Sim' : 'Nao'}`);

    // Resumo final
    console.log('');
    console.log('='.repeat(70));

    const allSuccess = result1.success && result2.success;

    if (allSuccess) {
      console.log('MIGRATIONS CONCLUIDAS COM SUCESSO!');
    } else {
      console.log('MIGRATIONS CONCLUIDAS COM AVISOS');
    }

    console.log('='.repeat(70));
    console.log('');
    console.log('Resumo:');
    console.log(`   - Registros orfaos removidos: ${totalOrfaos - parseInt(orfaosRestantes.rows[0].total)}`);
    console.log(`   - Constraint alterada para CASCADE: ${constraintResult.rows.length > 0 && constraintResult.rows[0].confdeltype === 'c' ? 'Sim' : 'Verificar'}`);
    console.log(`   - Tabela de historico criada: ${historicoExiste.rows[0].existe ? 'Sim' : 'Nao'}`);
    console.log('');

    if (allSuccess) {
      console.log('Agora quando um aluno for excluido, todos os seus registros em');
      console.log('resultados_provas serao deletados automaticamente (CASCADE).');
      console.log('');
    }

  } catch (error) {
    console.error('');
    console.error('='.repeat(70));
    console.error('ERRO NA MIGRATION');
    console.error('='.repeat(70));
    console.error('');
    console.error('Mensagem:', error.message);
    console.error('');
    if (error.detail) {
      console.error('Detalhe:', error.detail);
    }
    if (error.hint) {
      console.error('Dica:', error.hint);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigrations();
