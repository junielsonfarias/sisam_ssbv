/**
 * SISAM - Migration: Corrigir calculo de media - Producao OBRIGATORIA
 *
 * Este script aplica a migration que corrige o calculo de media
 * para anos iniciais, tornando a producao textual obrigatoria.
 *
 * Uso: node scripts/migrate-media-producao-obrigatoria.js
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
  console.log('SISAM - Migration: Media Producao OBRIGATORIA');
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
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'corrigir-media-producao-obrigatoria.sql');

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

    // Verificar aluno exemplo
    console.log('5. Verificando calculo de media para alunos do 2 ano...');
    console.log('');

    try {
      const verificacao = await client.query(`
        SELECT
          a.nome as aluno,
          rc.serie,
          rc.nota_lp,
          rc.nota_mat,
          rc.nota_producao,
          v.media_aluno as media_view,
          ROUND((COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_producao, 0)) / 3.0, 2) as media_calculada
        FROM resultados_consolidados rc
        JOIN alunos a ON rc.aluno_id = a.id
        JOIN resultados_consolidados_unificada v ON rc.aluno_id = v.aluno_id
        WHERE REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
          AND rc.presenca IN ('P', 'p')
          AND rc.nota_producao IS NULL
          AND rc.nota_lp IS NOT NULL
          AND rc.nota_mat IS NOT NULL
        LIMIT 5
      `);

      if (verificacao.rows.length > 0) {
        console.log('   Alunos com PROD=NULL (media deve considerar PROD como 0):');
        for (const row of verificacao.rows) {
          console.log(`   - ${row.aluno} (${row.serie})`);
          console.log(`     LP=${row.nota_lp}, MAT=${row.nota_mat}, PROD=NULL`);
          console.log(`     Media VIEW: ${row.media_view} | Media esperada: ${row.media_calculada}`);
        }
      } else {
        console.log('   Nenhum aluno encontrado com PROD=NULL nos anos iniciais');
      }
    } catch (e) {
      console.log('   [ERRO] Erro ao verificar:', e.message);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('PRONTO! A media agora considera producao como OBRIGATORIA.');
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
