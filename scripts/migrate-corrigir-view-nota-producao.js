/**
 * SISAM - Migration: Corrigir VIEW para incluir nota_producao
 *
 * Este script aplica a migration que adiciona o campo nota_producao
 * às VIEWs resultados_consolidados_v2 e resultados_consolidados_unificada.
 *
 * Uso: node scripts/migrate-corrigir-view-nota-producao.js
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
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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

  if (upper.includes('CREATE OR REPLACE VIEW')) {
    const match = command.match(/CREATE OR REPLACE VIEW\s+(\w+)/i);
    return { type: 'VIEW', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('COMMENT ON VIEW')) {
    const match = command.match(/COMMENT ON VIEW\s+(\w+)/i);
    return { type: 'COMMENT', name: match?.[1] || 'unknown' };
  }

  return { type: 'OTHER', name: '' };
}

async function executeMigration() {
  console.log('='.repeat(60));
  console.log('SISAM - Migration: Corrigir VIEW nota_producao');
  console.log('='.repeat(60));
  console.log('');

  const client = await pool.connect();

  try {
    // Verificar conexao
    console.log('1. Verificando conexao com o banco...');
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log(`   Conectado! Hora do servidor: ${result.rows[0].now}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    console.log('');

    // Ler arquivo SQL
    console.log('2. Lendo arquivo de migration...');
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'corrigir-view-nota-producao.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Arquivo nao encontrado: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`   Arquivo lido: ${migrationPath}`);
    console.log(`   Tamanho: ${(sql.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Dividir em comandos
    console.log('3. Processando comandos SQL...');
    const commands = splitSqlCommands(sql);
    console.log(`   Total de comandos: ${commands.length}`);
    console.log('');

    // Executar migration
    console.log('4. Executando migration...');
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const info = getCommandInfo(command);

      try {
        await client.query(command);
        successCount++;

        // Log baseado no tipo de comando
        switch (info.type) {
          case 'VIEW':
            console.log(`   [OK] View criada/atualizada: ${info.name}`);
            break;
          case 'COMMENT':
            console.log(`   [OK] Comentario adicionado em: ${info.name}`);
            break;
          default:
            console.log(`   [OK] Comando executado`);
            break;
        }
      } catch (error) {
        errorCount++;
        console.log(`   [ERRO] ${info.type} ${info.name}: ${error.message.substring(0, 100)}`);
      }
    }

    console.log('');
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('MIGRATION CONCLUIDA COM SUCESSO!');
    } else {
      console.log('MIGRATION CONCLUIDA COM ERROS');
    }

    console.log('='.repeat(60));
    console.log('');
    console.log(`   Comandos executados: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Erros: ${errorCount}`);
    }
    console.log('');

    // Verificar se as VIEWs tem nota_producao
    console.log('5. Verificando estrutura das VIEWs...');
    console.log('');

    // Verificar resultados_consolidados_v2
    try {
      const v2Result = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'resultados_consolidados_v2'
          AND column_name = 'nota_producao'
      `);

      if (v2Result.rows.length > 0) {
        console.log('   [OK] resultados_consolidados_v2 tem nota_producao');
      } else {
        console.log('   [AVISO] resultados_consolidados_v2 NAO tem nota_producao');
      }
    } catch (e) {
      console.log('   [ERRO] Erro ao verificar v2:', e.message);
    }

    // Verificar resultados_consolidados_unificada
    try {
      const unificadaResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'resultados_consolidados_unificada'
          AND column_name = 'nota_producao'
      `);

      if (unificadaResult.rows.length > 0) {
        console.log('   [OK] resultados_consolidados_unificada tem nota_producao');
      } else {
        console.log('   [AVISO] resultados_consolidados_unificada NAO tem nota_producao');
      }
    } catch (e) {
      console.log('   [ERRO] Erro ao verificar unificada:', e.message);
    }

    // Verificar se a tabela resultados_consolidados tem nota_producao
    try {
      const rcResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'resultados_consolidados'
          AND column_name = 'nota_producao'
      `);

      if (rcResult.rows.length > 0) {
        console.log('   [OK] resultados_consolidados tem nota_producao');
      } else {
        console.log('   [AVISO] resultados_consolidados NAO tem nota_producao - execute a migration add-nota-producao-nivel-aprendizagem.sql primeiro');
      }
    } catch (e) {
      console.log('   [ERRO] Erro ao verificar tabela:', e.message);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('PRONTO! A media de PROD deve aparecer nos comparativos.');
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('ERRO NA MIGRATION');
    console.error('='.repeat(60));
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

executeMigration();
