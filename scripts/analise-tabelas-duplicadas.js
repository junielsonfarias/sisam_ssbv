// Script para análise de tabelas duplicadas/redundantes
// Executar: node scripts/analise-tabelas-duplicadas.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function analisarTabelas() {
  console.log('\n' + '='.repeat(120));
  console.log('ANÁLISE DE TABELAS - IDENTIFICAÇÃO DE DUPLICAÇÕES E REDUNDÂNCIAS');
  console.log('='.repeat(120) + '\n');

  try {
    // =====================================================
    // 1. LISTAR TODAS AS TABELAS E VIEWS DO BANCO
    // =====================================================
    console.log('📋 1. TODAS AS TABELAS E VIEWS DO BANCO:');
    console.log('-'.repeat(120));

    const tabelasQuery = `
      SELECT
        table_name,
        table_type,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_colunas
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_type, table_name
    `;
    const tabelasResult = await pool.query(tabelasQuery);

    console.log('\n| Tipo        | Nome da Tabela/View                    | Colunas |');
    console.log('|-------------|----------------------------------------|---------|');
    tabelasResult.rows.forEach(row => {
      console.log(`| ${row.table_type.padEnd(11)} | ${row.table_name.padEnd(38)} | ${row.num_colunas.toString().padStart(7)} |`);
    });

    // =====================================================
    // 2. TABELAS RELACIONADAS A RESULTADOS
    // =====================================================
    console.log('\n\n📊 2. TABELAS/VIEWS RELACIONADAS A RESULTADOS:');
    console.log('-'.repeat(120));

    const resultadosTabelas = tabelasResult.rows.filter(r =>
      r.table_name.includes('resultado') ||
      r.table_name.includes('prova') ||
      r.table_name.includes('nota') ||
      r.table_name.includes('producao')
    );

    for (const tabela of resultadosTabelas) {
      console.log(`\n📦 ${tabela.table_name} (${tabela.table_type}):`);

      // Contar registros
      try {
        const countQuery = `SELECT COUNT(*) as total FROM ${tabela.table_name}`;
        const countResult = await pool.query(countQuery);
        console.log(`   Total de registros: ${countResult.rows[0].total}`);
      } catch (e) {
        console.log(`   Total de registros: Erro ao contar`);
      }

      // Listar colunas
      const colunasQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      const colunasResult = await pool.query(colunasQuery, [tabela.table_name]);
      console.log(`   Colunas: ${colunasResult.rows.map(c => c.column_name).join(', ')}`);
    }

    // =====================================================
    // 3. ANÁLISE DE SOBREPOSIÇÃO DE DADOS
    // =====================================================
    console.log('\n\n📊 3. ANÁLISE DE SOBREPOSIÇÃO DE DADOS:');
    console.log('-'.repeat(120));

    // 3.1 Comparar resultados_consolidados vs resultados_consolidados_v2
    console.log('\n  📌 3.1 resultados_consolidados vs resultados_consolidados_v2:');

    const rcCountQuery = `SELECT COUNT(DISTINCT aluno_id) as alunos FROM resultados_consolidados`;
    const v2CountQuery = `SELECT COUNT(DISTINCT aluno_id) as alunos FROM resultados_consolidados_v2`;

    const rcCount = await pool.query(rcCountQuery);
    const v2Count = await pool.query(v2CountQuery);

    console.log(`       resultados_consolidados: ${rcCount.rows[0].alunos} alunos únicos`);
    console.log(`       resultados_consolidados_v2: ${v2Count.rows[0].alunos} alunos únicos`);

    // Alunos em comum
    const comunsQuery = `
      SELECT COUNT(DISTINCT rc.aluno_id) as comuns
      FROM resultados_consolidados rc
      INNER JOIN resultados_consolidados_v2 v2 ON rc.aluno_id = v2.aluno_id
    `;
    const comunsResult = await pool.query(comunsQuery);
    console.log(`       Alunos em AMBAS as tabelas: ${comunsResult.rows[0].comuns}`);

    // Alunos apenas em RC
    const apenasRCQuery = `
      SELECT COUNT(DISTINCT rc.aluno_id) as apenas_rc
      FROM resultados_consolidados rc
      LEFT JOIN resultados_consolidados_v2 v2 ON rc.aluno_id = v2.aluno_id
      WHERE v2.aluno_id IS NULL
    `;
    const apenasRCResult = await pool.query(apenasRCQuery);
    console.log(`       Alunos APENAS em resultados_consolidados: ${apenasRCResult.rows[0].apenas_rc}`);

    // Alunos apenas em V2
    const apenasV2Query = `
      SELECT COUNT(DISTINCT v2.aluno_id) as apenas_v2
      FROM resultados_consolidados_v2 v2
      LEFT JOIN resultados_consolidados rc ON v2.aluno_id = rc.aluno_id
      WHERE rc.aluno_id IS NULL
    `;
    const apenasV2Result = await pool.query(apenasV2Query);
    console.log(`       Alunos APENAS em resultados_consolidados_v2: ${apenasV2Result.rows[0].apenas_v2}`);

    // 3.2 Comparar com resultados_provas
    console.log('\n  📌 3.2 resultados_provas (origem dos dados):');

    const rpCountQuery = `SELECT COUNT(DISTINCT aluno_id) as alunos, COUNT(*) as registros FROM resultados_provas`;
    const rpCount = await pool.query(rpCountQuery);
    console.log(`       resultados_provas: ${rpCount.rows[0].alunos} alunos únicos, ${rpCount.rows[0].registros} registros (questões)`);

    // =====================================================
    // 4. FLUXO DE DADOS ATUAL
    // =====================================================
    console.log('\n\n📊 4. FLUXO DE DADOS ATUAL:');
    console.log('-'.repeat(120));

    console.log(`
    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              FLUXO DE DADOS ATUAL                                        │
    ├─────────────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                         │
    │   ┌──────────────────────┐                                                              │
    │   │  resultados_provas   │ ─── TABELA BASE ─── Questões individuais de cada aluno       │
    │   │  (${rpCount.rows[0].registros.toString().padStart(7)} registros)  │                                                              │
    │   └──────────┬───────────┘                                                              │
    │              │                                                                          │
    │              ▼                                                                          │
    │   ┌──────────────────────────────┐                                                      │
    │   │ resultados_consolidados_v2   │ ─── VIEW ─── Calcula notas/médias automaticamente    │
    │   │ (${v2Count.rows[0].alunos.toString().padStart(4)} alunos - calculado)   │         (NÃO inclui nota_producao para anos iniciais)   │
    │   └──────────┬───────────────────┘                                                      │
    │              │                                                                          │
    │              │     ┌────────────────────────────┐                                       │
    │              │     │ resultados_consolidados    │ ─── TABELA ─── Dados importados       │
    │              │     │ (${rcCount.rows[0].alunos.toString().padStart(4)} alunos - manual)     │         (inclui nota_producao e média calculada)        │
    │              │     └──────────┬─────────────────┘                                       │
    │              │                │                                                         │
    │              ▼                ▼                                                         │
    │   ┌─────────────────────────────────────────────┐                                       │
    │   │    resultados_consolidados_unificada        │ ─── VIEW ─── FULL JOIN de ambos      │
    │   │    (VIEW FINAL - usada pelas APIs)          │                                       │
    │   └─────────────────────────────────────────────┘                                       │
    │                                                                                         │
    └─────────────────────────────────────────────────────────────────────────────────────────┘
    `);

    // =====================================================
    // 5. IDENTIFICAR INCONSISTÊNCIAS DE DADOS
    // =====================================================
    console.log('\n📊 5. INCONSISTÊNCIAS ENTRE TABELAS:');
    console.log('-'.repeat(120));

    // Comparar dados de alunos em comum
    const inconsistenciasQuery = `
      SELECT
        a.nome as aluno_nome,
        rc.serie as rc_serie,
        v2.serie as v2_serie,
        rc.nota_lp as rc_lp,
        v2.nota_lp as v2_lp,
        rc.nota_mat as rc_mat,
        v2.nota_mat as v2_mat,
        rc.nota_producao as rc_prod,
        v2.nota_producao as v2_prod,
        rc.media_aluno as rc_media,
        v2.media_aluno as v2_media
      FROM resultados_consolidados rc
      INNER JOIN resultados_consolidados_v2 v2 ON rc.aluno_id = v2.aluno_id AND rc.ano_letivo = v2.ano_letivo
      INNER JOIN alunos a ON rc.aluno_id = a.id
      WHERE rc.serie != v2.serie
         OR ABS(COALESCE(rc.nota_lp, 0) - COALESCE(v2.nota_lp, 0)) > 0.01
         OR ABS(COALESCE(rc.nota_mat, 0) - COALESCE(v2.nota_mat, 0)) > 0.01
         OR ABS(COALESCE(rc.media_aluno, 0) - COALESCE(v2.media_aluno, 0)) > 0.01
      LIMIT 10
    `;

    const inconsistenciasResult = await pool.query(inconsistenciasQuery);

    if (inconsistenciasResult.rows.length > 0) {
      console.log('\n  ⚠️ Exemplos de dados DIFERENTES entre RC e V2:');
      inconsistenciasResult.rows.forEach((row, index) => {
        console.log(`\n  ${index + 1}. ${row.aluno_nome}:`);
        if (row.rc_serie !== row.v2_serie) {
          console.log(`     Série: RC="${row.rc_serie}" vs V2="${row.v2_serie}"`);
        }
        if (Math.abs((row.rc_lp || 0) - (row.v2_lp || 0)) > 0.01) {
          console.log(`     LP: RC=${row.rc_lp} vs V2=${row.v2_lp}`);
        }
        if (Math.abs((row.rc_media || 0) - (row.v2_media || 0)) > 0.01) {
          console.log(`     Média: RC=${row.rc_media} vs V2=${row.v2_media}`);
        }
        console.log(`     PROD: RC=${row.rc_prod || 'NULL'} vs V2=${row.v2_prod || 'NULL'}`);
      });
    } else {
      console.log('\n  ✅ Dados consistentes entre as tabelas para registros em comum.');
    }

    // =====================================================
    // 6. ANÁLISE DE OUTRAS TABELAS
    // =====================================================
    console.log('\n\n📊 6. OUTRAS TABELAS RELACIONADAS:');
    console.log('-'.repeat(120));

    // resultados_producao
    try {
      const prodQuery = `SELECT COUNT(*) as total, COUNT(DISTINCT aluno_id) as alunos FROM resultados_producao`;
      const prodResult = await pool.query(prodQuery);
      console.log(`\n  📌 resultados_producao:`);
      console.log(`     Total registros: ${prodResult.rows[0].total}`);
      console.log(`     Alunos únicos: ${prodResult.rows[0].alunos}`);

      // Verificar se está sendo usada
      const prodColsQuery = `
        SELECT column_name FROM information_schema.columns WHERE table_name = 'resultados_producao'
      `;
      const prodColsResult = await pool.query(prodColsQuery);
      console.log(`     Colunas: ${prodColsResult.rows.map(c => c.column_name).join(', ')}`);
    } catch (e) {
      console.log('\n  📌 resultados_producao: Não existe ou erro ao consultar');
    }

    // =====================================================
    // 7. RESUMO DOS PROBLEMAS
    // =====================================================
    console.log('\n\n' + '='.repeat(120));
    console.log('📋 7. RESUMO DOS PROBLEMAS IDENTIFICADOS:');
    console.log('='.repeat(120));

    console.log(`
    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                           PROBLEMAS IDENTIFICADOS                                        │
    ├─────────────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                         │
    │  1. DUPLICAÇÃO DE DADOS:                                                                │
    │     - resultados_consolidados (TABELA) e resultados_consolidados_v2 (VIEW)              │
    │       armazenam/calculam os mesmos dados de formas diferentes                           │
    │     - ${comunsResult.rows[0].comuns} alunos existem em AMBAS as fontes                                         │
    │                                                                                         │
    │  2. INCONSISTÊNCIA DE CÁLCULO:                                                          │
    │     - V2 (VIEW) calcula média SEM nota_producao para anos iniciais                      │
    │     - RC (TABELA) tem nota_producao e média calculada manualmente                       │
    │     - A VIEW unificada precisa de lógica complexa para decidir qual usar                │
    │                                                                                         │
    │  3. FONTE DE VERDADE AMBÍGUA:                                                           │
    │     - Não está claro qual é a "fonte de verdade" dos dados                              │
    │     - resultados_provas é a base, mas nota_producao vem de importação manual            │
    │                                                                                         │
    │  4. MANUTENÇÃO COMPLEXA:                                                                │
    │     - Qualquer alteração precisa considerar múltiplas tabelas                           │
    │     - Série precisou ser corrigida em 3 lugares diferentes                              │
    │     - Média precisou ser recalculada em tabela E lógica da VIEW alterada                │
    │                                                                                         │
    └─────────────────────────────────────────────────────────────────────────────────────────┘
    `);

    // =====================================================
    // 8. SUGESTÕES DE SOLUÇÃO
    // =====================================================
    console.log('\n' + '='.repeat(120));
    console.log('💡 8. SUGESTÕES DE SOLUÇÃO:');
    console.log('='.repeat(120));

    console.log(`
    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              OPÇÃO 1: UNIFICAR EM UMA TABELA                             │
    ├─────────────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                         │
    │  AÇÃO: Manter apenas resultados_consolidados como tabela única                          │
    │                                                                                         │
    │  PASSOS:                                                                                │
    │  1. Migrar dados faltantes de V2 para resultados_consolidados                           │
    │  2. Garantir que todas as colunas necessárias existam em RC                             │
    │  3. Criar trigger para recalcular média quando notas são atualizadas                    │
    │  4. Remover VIEW resultados_consolidados_v2                                             │
    │  5. Simplificar VIEW resultados_consolidados_unificada (ou remover)                     │
    │                                                                                         │
    │  PRÓS:                                                                                  │
    │  ✅ Fonte de verdade única                                                              │
    │  ✅ Manutenção simplificada                                                             │
    │  ✅ Performance melhor (sem FULL JOIN)                                                  │
    │                                                                                         │
    │  CONTRAS:                                                                               │
    │  ❌ Perda da atualização automática via VIEW                                            │
    │  ❌ Precisa de processo para sincronizar com resultados_provas                          │
    │                                                                                         │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                           OPÇÃO 2: MELHORAR A VIEW V2                                    │
    ├─────────────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                         │
    │  AÇÃO: Fazer V2 incluir nota_producao de resultados_producao ou RC                      │
    │                                                                                         │
    │  PASSOS:                                                                                │
    │  1. Alterar VIEW V2 para JOIN com resultados_producao (se existir)                      │
    │  2. OU alterar V2 para JOIN com resultados_consolidados.nota_producao                   │
    │  3. Recalcular média na VIEW incluindo nota_producao                                    │
    │  4. Simplificar VIEW unificada                                                          │
    │                                                                                         │
    │  PRÓS:                                                                                  │
    │  ✅ Mantém atualização automática                                                       │
    │  ✅ Cálculo centralizado                                                                │
    │                                                                                         │
    │  CONTRAS:                                                                               │
    │  ❌ VIEW complexa                                                                       │
    │  ❌ Dependência de múltiplas tabelas                                                    │
    │                                                                                         │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                    OPÇÃO 3 (RECOMENDADA): ARQUITETURA HÍBRIDA                           │
    ├─────────────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                         │
    │  AÇÃO: Usar resultados_consolidados como tabela principal e sincronizar                 │
    │                                                                                         │
    │  ESTRUTURA PROPOSTA:                                                                    │
    │                                                                                         │
    │   ┌──────────────────────┐                                                              │
    │   │  resultados_provas   │ ─── Mantém como está (questões individuais)                  │
    │   └──────────┬───────────┘                                                              │
    │              │                                                                          │
    │              ▼                                                                          │
    │   ┌──────────────────────────────┐                                                      │
    │   │  resultados_consolidados     │ ─── TABELA ÚNICA (notas, produção, média)            │
    │   │  + trigger de recálculo      │                                                      │
    │   └──────────────────────────────┘                                                      │
    │                                                                                         │
    │  PASSOS:                                                                                │
    │  1. Adicionar colunas faltantes em resultados_consolidados (se necessário)              │
    │  2. Criar função/trigger para recalcular médias automaticamente                         │
    │  3. Criar processo de sincronização com resultados_provas                               │
    │  4. REMOVER: resultados_consolidados_v2 (VIEW)                                          │
    │  5. SIMPLIFICAR: resultados_consolidados_unificada → usar RC diretamente                │
    │                                                                                         │
    │  PRÓS:                                                                                  │
    │  ✅ Fonte de verdade única e clara                                                      │
    │  ✅ Médias sempre corretas via trigger                                                  │
    │  ✅ Fácil manutenção                                                                    │
    │  ✅ Performance otimizada                                                               │
    │                                                                                         │
    │  CONTRAS:                                                                               │
    │  ❌ Requer migração cuidadosa                                                           │
    │  ❌ Precisa testar bem os triggers                                                      │
    │                                                                                         │
    └─────────────────────────────────────────────────────────────────────────────────────────┘
    `);

    console.log('\n' + '='.repeat(120));
    console.log('FIM DA ANÁLISE');
    console.log('='.repeat(120) + '\n');

  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

analisarTabelas();
