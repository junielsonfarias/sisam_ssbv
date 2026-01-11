/**
 * Script para verificar se a correção do CASCADE foi aplicada corretamente
 */

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import pool from '../database/connection'

async function verificarCorrecao() {
  console.log('='.repeat(60))
  console.log('VERIFICAÇÃO DA CORREÇÃO DO CASCADE')
  console.log('='.repeat(60))

  try {
    // 1. Verificar se ainda existem órfãos
    console.log('\n1. VERIFICANDO DADOS ÓRFÃOS:')
    const orfaos = await pool.query(`
      SELECT COUNT(*) as total FROM resultados_provas WHERE aluno_id IS NULL
    `)
    const totalOrfaos = parseInt(orfaos.rows[0].total)
    if (totalOrfaos === 0) {
      console.log('   ✅ Nenhum registro órfão encontrado')
    } else {
      console.log(`   ❌ Ainda existem ${totalOrfaos} registros órfãos!`)
    }

    // 2. Verificar constraint atual
    console.log('\n2. VERIFICANDO CONSTRAINT:')
    const constraint = await pool.query(`
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

    if (constraint.rows.length > 0) {
      const regra = constraint.rows[0].delete_rule
      if (regra === 'CASCADE') {
        console.log(`   ✅ Constraint: ${constraint.rows[0].constraint_name}`)
        console.log(`   ✅ Regra: ON DELETE ${regra}`)
      } else {
        console.log(`   ❌ Constraint: ${constraint.rows[0].constraint_name}`)
        console.log(`   ❌ Regra ainda é: ON DELETE ${regra} (deveria ser CASCADE)`)
      }
    } else {
      console.log('   ❌ Constraint não encontrada!')
    }

    // 3. Verificar dados do 3º Ano (era onde havia duplicação)
    console.log('\n3. VERIFICANDO DADOS DO 3º ANO:')
    const dados3Ano = await pool.query(`
      SELECT
        COUNT(DISTINCT aluno_id) as alunos_unicos,
        COUNT(*) as total_registros,
        COUNT(DISTINCT questao_codigo) as questoes_unicas
      FROM resultados_provas
      WHERE serie LIKE '%3%'
        AND aluno_id IS NOT NULL
    `)
    console.log(`   Alunos únicos: ${dados3Ano.rows[0].alunos_unicos}`)
    console.log(`   Total de registros: ${dados3Ano.rows[0].total_registros}`)
    console.log(`   Questões únicas: ${dados3Ano.rows[0].questoes_unicas}`)

    // 4. Verificar se há duplicação (mesma questão para mesmo aluno)
    console.log('\n4. VERIFICANDO DUPLICAÇÕES:')
    const duplicacoes = await pool.query(`
      SELECT
        aluno_id,
        questao_codigo,
        COUNT(*) as qtd
      FROM resultados_provas
      WHERE aluno_id IS NOT NULL
      GROUP BY aluno_id, questao_codigo
      HAVING COUNT(*) > 1
      LIMIT 5
    `)
    if (duplicacoes.rows.length === 0) {
      console.log('   ✅ Nenhuma duplicação encontrada')
    } else {
      console.log(`   ⚠️ Encontradas ${duplicacoes.rows.length} duplicações:`)
      duplicacoes.rows.forEach((d: any) => {
        console.log(`      - Aluno ${d.aluno_id.substring(0, 8)}... / Questão ${d.questao_codigo}: ${d.qtd}x`)
      })
    }

    // 5. Comparar constraints de todas as tabelas relacionadas a alunos
    console.log('\n5. COMPARANDO CONSTRAINTS DE EXCLUSÃO:')
    const todasConstraints = await pool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'aluno_id'
      ORDER BY tc.table_name
    `)

    todasConstraints.rows.forEach((c: any) => {
      const status = c.delete_rule === 'CASCADE' ? '✅' : '❌'
      console.log(`   ${status} ${c.table_name}: ON DELETE ${c.delete_rule}`)
    })

    // 6. Resumo final
    console.log('\n' + '='.repeat(60))
    console.log('RESUMO DA VERIFICAÇÃO')
    console.log('='.repeat(60))

    const problemas: string[] = []

    if (totalOrfaos > 0) {
      problemas.push(`${totalOrfaos} registros órfãos ainda existem`)
    }

    if (constraint.rows.length === 0 || constraint.rows[0].delete_rule !== 'CASCADE') {
      problemas.push('Constraint não está configurada como CASCADE')
    }

    if (duplicacoes.rows.length > 0) {
      problemas.push(`${duplicacoes.rows.length} duplicações encontradas`)
    }

    if (problemas.length === 0) {
      console.log('\n✅ TUDO OK! A correção foi aplicada com sucesso.')
      console.log('\nAgora quando um aluno for excluído:')
      console.log('- Seus registros em resultados_provas serão automaticamente removidos')
      console.log('- Não haverá mais dados órfãos')
    } else {
      console.log('\n❌ PROBLEMAS ENCONTRADOS:')
      problemas.forEach(p => console.log(`   - ${p}`))
    }

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await pool.end()
  }
}

verificarCorrecao()
