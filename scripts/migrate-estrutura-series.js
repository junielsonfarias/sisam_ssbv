/**
 * SISAM - Migration: Estrutura de Avaliação por Série
 *
 * Este script aplica a migration que adiciona suporte para diferentes
 * estruturas de avaliação:
 *
 * - 8º e 9º ANO: 60 questões objetivas (LP, CH, MAT, CN)
 * - 2º e 3º ANO: 28 questões (14 LP + 14 MAT) + 8 itens produção
 * - 5º ANO: 34 questões (14 LP + 20 MAT) + 8 itens produção
 *
 * Uso: npm run migrate-estrutura-series
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

    // Se não estamos em bloco $$ e a linha termina com ;
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
 * Extrai informação sobre o tipo de comando SQL
 */
function getCommandInfo(command) {
  const upper = command.toUpperCase();

  if (upper.includes('CREATE TABLE')) {
    const match = command.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
    return { type: 'CREATE TABLE', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('ALTER TABLE')) {
    const match = command.match(/ALTER TABLE\s+(\w+)/i);
    const action = upper.includes('ADD COLUMN') ? 'ADD COLUMN' :
                   upper.includes('ADD CONSTRAINT') ? 'ADD CONSTRAINT' : 'ALTER';
    return { type: 'ALTER TABLE', name: match?.[1] || 'unknown', action };
  }

  if (upper.includes('CREATE INDEX')) {
    const match = command.match(/CREATE INDEX(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
    return { type: 'CREATE INDEX', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('INSERT INTO')) {
    const match = command.match(/INSERT INTO\s+(\w+)/i);
    return { type: 'INSERT', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('CREATE OR REPLACE FUNCTION')) {
    const match = command.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/i);
    return { type: 'FUNCTION', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('CREATE OR REPLACE VIEW')) {
    const match = command.match(/CREATE OR REPLACE VIEW\s+(\w+)/i);
    return { type: 'VIEW', name: match?.[1] || 'unknown' };
  }

  if (upper.includes('CREATE TRIGGER') || upper.includes('DROP TRIGGER')) {
    const match = command.match(/(?:CREATE|DROP)\s+TRIGGER(?:\s+IF (?:NOT )?EXISTS)?\s+(\w+)/i);
    return { type: 'TRIGGER', name: match?.[1] || 'unknown' };
  }

  if (upper.startsWith('DO $$') || upper.startsWith('DO $')) {
    return { type: 'DO BLOCK', name: 'anonymous' };
  }

  return { type: 'OTHER', name: '' };
}

async function executeMigration() {
  console.log('='.repeat(60));
  console.log('SISAM - Migration: Estrutura de Avaliação por Série');
  console.log('='.repeat(60));
  console.log('');

  const client = await pool.connect();

  try {
    // Verificar conexão
    console.log('1. Verificando conexão com o banco...');
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log(`   Conectado! Hora do servidor: ${result.rows[0].now}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    console.log('');

    // Ler arquivo SQL
    console.log('2. Lendo arquivo de migration...');
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_estrutura_series.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Arquivo não encontrado: ${migrationPath}`);
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
            console.log(`   ✓ Índice criado: ${info.name}`);
            break;
          case 'INSERT':
            console.log(`   ✓ Dados inseridos em: ${info.name}`);
            break;
          case 'FUNCTION':
            console.log(`   ✓ Função criada: ${info.name}`);
            break;
          case 'VIEW':
            console.log(`   ✓ View criada: ${info.name}`);
            break;
          case 'TRIGGER':
            console.log(`   ✓ Trigger: ${info.name}`);
            break;
          case 'DO BLOCK':
            console.log(`   ✓ Bloco anônimo executado`);
            break;
          default:
            // Não logar outros comandos
            break;
        }
      } catch (error) {
        const errorMsg = error.message || '';

        // Erros que podemos ignorar
        if (errorMsg.includes('already exists') ||
            errorMsg.includes('does not exist') ||
            errorMsg.includes('duplicate key')) {
          skipCount++;
        } else {
          errorCount++;
          console.log(`   ⚠ Erro em ${info.type} ${info.name}: ${errorMsg.substring(0, 80)}`);
        }
      }
    }

    console.log('');
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('MIGRATION CONCLUÍDA COM SUCESSO!');
    } else {
      console.log('MIGRATION CONCLUÍDA COM AVISOS');
    }

    console.log('='.repeat(60));
    console.log('');
    console.log(`   Comandos executados: ${successCount}`);
    console.log(`   Comandos ignorados: ${skipCount}`);
    if (errorCount > 0) {
      console.log(`   Erros: ${errorCount}`);
    }
    console.log('');

    // Verificar estrutura criada
    console.log('5. Verificando estrutura criada...');
    console.log('');

    // Verificar tabelas
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('configuracao_series', 'itens_producao', 'resultados_producao', 'niveis_aprendizagem')
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('   ⚠ Nenhuma nova tabela encontrada!');
    } else {
      console.log('   Novas tabelas:');
      tablesResult.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
    }
    console.log('');

    // Verificar configuração das séries
    try {
      const seriesResult = await client.query(`
        SELECT serie, nome_serie, total_questoes_objetivas, tem_producao_textual, qtd_itens_producao
        FROM configuracao_series
        ORDER BY serie::integer
      `);

      if (seriesResult.rows.length > 0) {
        console.log('   Configuração das séries:');
        console.log('   ┌──────────┬──────────┬──────────┬───────┐');
        console.log('   │ Série    │ Questões │ Produção │ Itens │');
        console.log('   ├──────────┼──────────┼──────────┼───────┤');
        seriesResult.rows.forEach(row => {
          const producao = row.tem_producao_textual ? 'Sim' : 'Não';
          console.log(`   │ ${row.nome_serie.padEnd(8)} │ ${String(row.total_questoes_objetivas).padStart(8)} │ ${producao.padStart(8)} │ ${String(row.qtd_itens_producao).padStart(5)} │`);
        });
        console.log('   └──────────┴──────────┴──────────┴───────┘');
      }
    } catch (e) {
      console.log('   ⚠ Erro ao verificar séries:', e.message);
    }
    console.log('');

    // Verificar itens de produção
    try {
      const itensResult = await client.query(`
        SELECT codigo, nome FROM itens_producao ORDER BY ordem
      `);

      if (itensResult.rows.length > 0) {
        console.log('   Itens de produção textual:');
        itensResult.rows.forEach(row => {
          console.log(`   ✓ ${row.codigo}: ${row.nome}`);
        });
      }
    } catch (e) {
      console.log('   ⚠ Erro ao verificar itens:', e.message);
    }
    console.log('');

    // Verificar níveis de aprendizagem
    try {
      const niveisResult = await client.query(`
        SELECT codigo, nome, nota_minima, nota_maxima, cor FROM niveis_aprendizagem ORDER BY ordem
      `);

      if (niveisResult.rows.length > 0) {
        console.log('   Níveis de aprendizagem:');
        niveisResult.rows.forEach(row => {
          console.log(`   ✓ ${row.nome}: ${row.nota_minima} - ${row.nota_maxima}`);
        });
      }
    } catch (e) {
      console.log('   ⚠ Erro ao verificar níveis:', e.message);
    }
    console.log('');

    // Verificar colunas adicionadas em resultados_consolidados
    try {
      const colunasResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'resultados_consolidados'
          AND column_name IN ('nota_producao', 'nivel_aprendizagem', 'nivel_aprendizagem_id',
                              'item_producao_1', 'item_producao_2', 'item_producao_3',
                              'item_producao_4', 'item_producao_5', 'item_producao_6',
                              'item_producao_7', 'item_producao_8')
        ORDER BY column_name
      `);

      if (colunasResult.rows.length > 0) {
        console.log('   Novas colunas em resultados_consolidados:');
        colunasResult.rows.forEach(row => {
          console.log(`   ✓ ${row.column_name}`);
        });
      }
    } catch (e) {
      console.log('   ⚠ Erro ao verificar colunas:', e.message);
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('ESTRUTURA PRONTA PARA USO!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Atualizar a lógica de importação para identificar a série');
    console.log('2. Atualizar as páginas de resultados e gráficos');
    console.log('3. Testar a importação com dados de diferentes séries');
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
