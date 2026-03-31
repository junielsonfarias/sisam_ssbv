// Script de migração para unificar tabelas de resultados
// Executar: node scripts/migracao-unificar-tabelas.js
//
// ATENÇÃO: Este script faz alterações permanentes no banco de dados!
// Certifique-se de ter um backup antes de executar.

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

async function executarMigracao() {
  console.log('\n' + '='.repeat(100));
  console.log('MIGRAÇÃO: UNIFICAÇÃO DE TABELAS DE RESULTADOS');
  console.log('='.repeat(100) + '\n');

  const client = await pool.connect();

  try {
    // Iniciar transação
    await client.query('BEGIN');

    // =====================================================
    // PASSO 1: Criar função para recalcular média
    // =====================================================
    console.log('🔧 PASSO 1: Criando função de recálculo de média...');

    const criarFuncaoQuery = `
      CREATE OR REPLACE FUNCTION calcular_media_aluno()
      RETURNS TRIGGER AS $$
      DECLARE
        v_serie_numero TEXT;
        v_soma NUMERIC := 0;
        v_count INTEGER := 0;
      BEGIN
        -- Extrair número da série
        v_serie_numero := REGEXP_REPLACE(NEW.serie::TEXT, '[^0-9]', '', 'g');

        -- Anos Iniciais (2, 3, 5): média = (LP + MAT + PROD) / disciplinas > 0
        IF v_serie_numero IN ('2', '3', '5') THEN
          IF COALESCE(NEW.nota_lp, 0) > 0 THEN
            v_soma := v_soma + NEW.nota_lp;
            v_count := v_count + 1;
          END IF;
          IF COALESCE(NEW.nota_mat, 0) > 0 THEN
            v_soma := v_soma + NEW.nota_mat;
            v_count := v_count + 1;
          END IF;
          IF COALESCE(NEW.nota_producao, 0) > 0 THEN
            v_soma := v_soma + NEW.nota_producao;
            v_count := v_count + 1;
          END IF;
        -- Anos Finais (6, 7, 8, 9): média = (LP + CH + MAT + CN) / disciplinas > 0
        ELSE
          IF COALESCE(NEW.nota_lp, 0) > 0 THEN
            v_soma := v_soma + NEW.nota_lp;
            v_count := v_count + 1;
          END IF;
          IF COALESCE(NEW.nota_ch, 0) > 0 THEN
            v_soma := v_soma + NEW.nota_ch;
            v_count := v_count + 1;
          END IF;
          IF COALESCE(NEW.nota_mat, 0) > 0 THEN
            v_soma := v_soma + NEW.nota_mat;
            v_count := v_count + 1;
          END IF;
          IF COALESCE(NEW.nota_cn, 0) > 0 THEN
            v_soma := v_soma + NEW.nota_cn;
            v_count := v_count + 1;
          END IF;
        END IF;

        -- Calcular média
        IF v_count > 0 THEN
          NEW.media_aluno := ROUND(v_soma / v_count, 2);
        ELSE
          NEW.media_aluno := NULL;
        END IF;

        -- Atualizar timestamp
        NEW.atualizado_em := NOW();

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await client.query(criarFuncaoQuery);
    console.log('   ✅ Função calcular_media_aluno() criada');

    // =====================================================
    // PASSO 2: Criar trigger na tabela resultados_consolidados
    // =====================================================
    console.log('\n🔧 PASSO 2: Criando trigger de recálculo automático...');

    // Remover trigger existente se houver
    await client.query('DROP TRIGGER IF EXISTS trigger_calcular_media ON resultados_consolidados');

    const criarTriggerQuery = `
      CREATE TRIGGER trigger_calcular_media
      BEFORE INSERT OR UPDATE OF nota_lp, nota_mat, nota_ch, nota_cn, nota_producao, serie
      ON resultados_consolidados
      FOR EACH ROW
      EXECUTE FUNCTION calcular_media_aluno();
    `;

    await client.query(criarTriggerQuery);
    console.log('   ✅ Trigger trigger_calcular_media criado');

    // =====================================================
    // PASSO 3: Remover VIEW resultados_consolidados_v2 PRIMEIRO
    // =====================================================
    console.log('\n🔧 PASSO 3: Removendo VIEW resultados_consolidados_v2...');

    await client.query('DROP VIEW IF EXISTS resultados_consolidados_v2 CASCADE');
    console.log('   ✅ VIEW resultados_consolidados_v2 removida');

    // =====================================================
    // PASSO 4: Dropar e recriar VIEW resultados_consolidados_unificada
    // =====================================================
    console.log('\n🔧 PASSO 4: Recriando VIEW resultados_consolidados_unificada...');

    // Dropar a view existente primeiro (para evitar conflito de tipos)
    await client.query('DROP VIEW IF EXISTS resultados_consolidados_unificada CASCADE');

    const simplificarViewQuery = `
      CREATE VIEW resultados_consolidados_unificada AS
      SELECT
        aluno_id,
        escola_id,
        turma_id,
        ano_letivo,
        serie,
        presenca::TEXT as presenca,
        total_acertos_lp,
        total_acertos_ch,
        total_acertos_mat,
        total_acertos_cn,
        nota_lp,
        nota_ch,
        nota_mat,
        nota_cn,
        nota_producao,
        media_aluno,
        criado_em,
        atualizado_em
      FROM resultados_consolidados;
    `;

    await client.query(simplificarViewQuery);
    console.log('   ✅ VIEW resultados_consolidados_unificada recriada (simplificada)');

    // =====================================================
    // PASSO 5: Remover tabela resultados_producao (vazia)
    // =====================================================
    console.log('\n🔧 PASSO 5: Removendo tabela resultados_producao...');

    // Verificar se está vazia
    const countProd = await client.query('SELECT COUNT(*) as total FROM resultados_producao');
    if (parseInt(countProd.rows[0].total) === 0) {
      await client.query('DROP TABLE IF EXISTS resultados_producao CASCADE');
      console.log('   ✅ Tabela resultados_producao removida (estava vazia)');
    } else {
      console.log(`   ⚠️ Tabela resultados_producao NÃO removida (tem ${countProd.rows[0].total} registros)`);
    }

    // =====================================================
    // PASSO 6: Verificar estrutura final
    // =====================================================
    console.log('\n📊 PASSO 6: Verificando estrutura final...');

    const verificarQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'resultado%'
      ORDER BY table_name
    `;

    const verificarResult = await client.query(verificarQuery);

    console.log('\n   Tabelas/Views de resultados:');
    verificarResult.rows.forEach(row => {
      console.log(`   - ${row.table_name} (${row.table_type})`);
    });

    // Verificar se trigger foi criado
    const triggerQuery = `
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_calcular_media'
    `;

    const triggerResult = await client.query(triggerQuery);
    if (triggerResult.rows.length > 0) {
      console.log('\n   Trigger ativo:');
      triggerResult.rows.forEach(row => {
        console.log(`   - ${row.trigger_name} (${row.action_timing} ${row.event_manipulation})`);
      });
    }

    // Commit da transação
    await client.query('COMMIT');

    console.log('\n' + '='.repeat(100));
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(100));

    console.log(`
    RESUMO DAS ALTERAÇÕES:
    ----------------------
    1. ✅ Função calcular_media_aluno() - Criada
    2. ✅ Trigger trigger_calcular_media - Criado
    3. ✅ VIEW resultados_consolidados_v2 - REMOVIDA
    4. ✅ VIEW resultados_consolidados_unificada - Simplificada
    5. ✅ Tabela resultados_producao - REMOVIDA

    NOVA ESTRUTURA:
    ---------------
    resultados_provas (TABELA) → Questões individuais
           ↓
    resultados_consolidados (TABELA) → Dados consolidados + Trigger de média
           ↓
    resultados_consolidados_unificada (VIEW) → Acesso simplificado (aponta para RC)
    `);

  } catch (error) {
    // Rollback em caso de erro
    await client.query('ROLLBACK');
    console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n⚠️ Todas as alterações foram revertidas (ROLLBACK)');
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar migração
executarMigracao();
