/**
 * Script para verificar e limpar dados órfãos em resultados_provas
 */

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import pool from '../database/connection'

async function verificarDadosOrfaos() {
  console.log('='.repeat(60))
  console.log('VERIFICAÇÃO DE DADOS ÓRFÃOS')
  console.log('='.repeat(60))

  try {
    // 1. Verificar quantos órfãos existem
    console.log('\n1. DADOS ÓRFÃOS (aluno_id = NULL):')
    const orfaos = await pool.query(`
      SELECT
        COUNT(*) as total_orfaos,
        COUNT(DISTINCT aluno_codigo) as codigos_unicos,
        COUNT(DISTINCT aluno_nome) as nomes_unicos
      FROM resultados_provas
      WHERE aluno_id IS NULL
    `)
    console.log(`   Total de registros órfãos: ${orfaos.rows[0].total_orfaos}`)
    console.log(`   Códigos de alunos únicos: ${orfaos.rows[0].codigos_unicos}`)
    console.log(`   Nomes de alunos únicos: ${orfaos.rows[0].nomes_unicos}`)

    // 2. Detalhes por série
    console.log('\n2. ÓRFÃOS POR SÉRIE:')
    const orfaosPorSerie = await pool.query(`
      SELECT
        serie,
        COUNT(*) as total,
        COUNT(DISTINCT aluno_codigo) as alunos
      FROM resultados_provas
      WHERE aluno_id IS NULL
      GROUP BY serie
      ORDER BY serie
    `)
    if (orfaosPorSerie.rows.length > 0) {
      orfaosPorSerie.rows.forEach((r: any) => {
        console.log(`   ${r.serie || 'NULL'}: ${r.total} registros de ${r.alunos} aluno(s)`)
      })
    } else {
      console.log('   Nenhum dado órfão encontrado!')
    }

    // 3. Detalhes dos alunos órfãos
    if (parseInt(orfaos.rows[0].total_orfaos) > 0) {
      console.log('\n3. ALUNOS COM DADOS ÓRFÃOS:')
      const alunosOrfaos = await pool.query(`
        SELECT
          aluno_codigo,
          aluno_nome,
          serie,
          COUNT(*) as total_questoes
        FROM resultados_provas
        WHERE aluno_id IS NULL
        GROUP BY aluno_codigo, aluno_nome, serie
        ORDER BY serie, aluno_nome
      `)
      alunosOrfaos.rows.forEach((a: any) => {
        console.log(`   - ${a.aluno_nome} (${a.aluno_codigo}) - ${a.serie}: ${a.total_questoes} questões`)
      })
    }

    // 4. Comparar com alunos válidos
    console.log('\n4. COMPARAÇÃO COM ALUNOS VÁLIDOS:')
    const alunosValidos = await pool.query(`
      SELECT
        serie,
        COUNT(DISTINCT aluno_id) as total_alunos
      FROM resultados_provas
      WHERE aluno_id IS NOT NULL
      GROUP BY serie
      ORDER BY serie
    `)
    alunosValidos.rows.forEach((a: any) => {
      console.log(`   ${a.serie}: ${a.total_alunos} aluno(s) com aluno_id válido`)
    })

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await pool.end()
  }
}

verificarDadosOrfaos()
