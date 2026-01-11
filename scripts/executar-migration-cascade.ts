/**
 * Script para executar a migration de correção do CASCADE em resultados_provas
 */

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import pool from '../database/connection'

async function executarMigration() {
  console.log('='.repeat(60))
  console.log('EXECUTANDO MIGRATION: Corrigir CASCADE em resultados_provas')
  console.log('='.repeat(60))

  const client = await pool.connect()

  try {
    // Iniciar transação
    await client.query('BEGIN')

    // 1. Verificar quantos órfãos existem
    console.log('\n1. VERIFICANDO DADOS ÓRFÃOS...')
    const orfaos = await client.query(`
      SELECT COUNT(*) as total FROM resultados_provas WHERE aluno_id IS NULL
    `)
    const totalOrfaos = parseInt(orfaos.rows[0].total)
    console.log(`   Total de registros órfãos encontrados: ${totalOrfaos}`)

    // 2. Deletar registros órfãos
    if (totalOrfaos > 0) {
      console.log('\n2. DELETANDO REGISTROS ÓRFÃOS...')
      const deleted = await client.query(`
        DELETE FROM resultados_provas WHERE aluno_id IS NULL
      `)
      console.log(`   Registros deletados: ${deleted.rowCount}`)
    } else {
      console.log('\n2. Nenhum registro órfão para deletar.')
    }

    // 3. Verificar constraint atual
    console.log('\n3. VERIFICANDO CONSTRAINT ATUAL...')
    const constraintAtual = await client.query(`
      SELECT
        tc.constraint_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'resultados_provas'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name LIKE '%aluno_id%'
    `)

    if (constraintAtual.rows.length > 0) {
      console.log(`   Constraint encontrada: ${constraintAtual.rows[0].constraint_name}`)
      console.log(`   Regra atual: ON DELETE ${constraintAtual.rows[0].delete_rule}`)
    }

    // 4. Remover constraint antiga
    console.log('\n4. REMOVENDO CONSTRAINT ANTIGA...')
    await client.query(`
      ALTER TABLE resultados_provas
      DROP CONSTRAINT IF EXISTS resultados_provas_aluno_id_fkey
    `)
    console.log('   Constraint removida com sucesso.')

    // 5. Adicionar nova constraint com CASCADE
    console.log('\n5. ADICIONANDO NOVA CONSTRAINT COM CASCADE...')
    await client.query(`
      ALTER TABLE resultados_provas
      ADD CONSTRAINT resultados_provas_aluno_id_fkey
      FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
    `)
    console.log('   Nova constraint adicionada com sucesso.')

    // 6. Verificar nova constraint
    console.log('\n6. VERIFICANDO NOVA CONSTRAINT...')
    const novaConstraint = await client.query(`
      SELECT
        tc.constraint_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'resultados_provas'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name LIKE '%aluno_id%'
    `)

    if (novaConstraint.rows.length > 0) {
      console.log(`   Constraint: ${novaConstraint.rows[0].constraint_name}`)
      console.log(`   Nova regra: ON DELETE ${novaConstraint.rows[0].delete_rule}`)
    }

    // 7. Verificar se ainda há órfãos
    console.log('\n7. VERIFICAÇÃO FINAL...')
    const orfaosRestantes = await client.query(`
      SELECT COUNT(*) as total FROM resultados_provas WHERE aluno_id IS NULL
    `)
    const restantes = parseInt(orfaosRestantes.rows[0].total)

    if (restantes === 0) {
      console.log('   ✅ Nenhum registro órfão restante.')
    } else {
      console.log(`   ⚠️ Ainda existem ${restantes} registros órfãos!`)
    }

    // Commit da transação
    await client.query('COMMIT')

    console.log('\n' + '='.repeat(60))
    console.log('✅ MIGRATION EXECUTADA COM SUCESSO!')
    console.log('='.repeat(60))
    console.log(`\nResumo:`)
    console.log(`- Registros órfãos deletados: ${totalOrfaos}`)
    console.log(`- Constraint alterada para: ON DELETE CASCADE`)
    console.log(`\nAgora quando um aluno for excluído, seus resultados serão`)
    console.log(`automaticamente removidos de resultados_provas.`)

  } catch (error) {
    // Rollback em caso de erro
    await client.query('ROLLBACK')
    console.error('\n❌ ERRO NA MIGRATION:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

executarMigration()
