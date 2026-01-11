/**
 * Script para verificar dados de questões por série
 */

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import pool from '../database/connection'

async function verificarQuestoesPorSerie() {
  console.log('='.repeat(60))
  console.log('VERIFICAÇÃO DE QUESTÕES POR SÉRIE')
  console.log('='.repeat(60))

  try {
    // Verificar para cada série
    const series = ['2º', '2º Ano', '3º', '3º Ano', '5º', '5º Ano', '8º Ano', '9º Ano']

    for (const serie of series) {
      console.log(`\n--- Série: ${serie} ---`)

      // Query igual à usada na API
      const resultado = await pool.query(`
        SELECT
          rp.questao_codigo,
          q.descricao as questao_descricao,
          COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
          COUNT(*) as total_respostas,
          COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
          COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros
        FROM resultados_provas rp
        LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
        WHERE (rp.presenca = 'P' OR rp.presenca = 'p')
        AND (rp.serie = $1 OR REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') = REGEXP_REPLACE($1::text, '[^0-9]', '', 'g'))
        GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
        HAVING COUNT(*) >= 1
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `, [serie])

      if (resultado.rows.length > 0) {
        console.log(`   Encontradas ${resultado.rows.length} questões:`)
        resultado.rows.forEach((q: any) => {
          console.log(`     ${q.questao_codigo}: ${q.total_respostas} respostas (${q.total_acertos} acertos, ${q.total_erros} erros)`)
        })
      } else {
        // Verificar se há dados SEM o filtro de presença
        const semFiltro = await pool.query(`
          SELECT COUNT(*) as total,
                 COUNT(DISTINCT questao_codigo) as questoes
          FROM resultados_provas
          WHERE serie = $1 OR REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') = REGEXP_REPLACE($1::text, '[^0-9]', '', 'g')
        `, [serie])
        console.log(`   NENHUMA questão encontrada com >= 1 respostas de presentes`)
        console.log(`   Total de registros (sem filtro presença): ${semFiltro.rows[0].total}`)
        console.log(`   Total de questões distintas: ${semFiltro.rows[0].questoes}`)
      }
    }

    // Verificar distribuição de presença
    console.log('\n--- DISTRIBUIÇÃO DE PRESENÇA ---')
    const presenca = await pool.query(`
      SELECT serie, presenca, COUNT(*) as total
      FROM resultados_provas
      WHERE serie IS NOT NULL
      GROUP BY serie, presenca
      ORDER BY serie, presenca
    `)
    presenca.rows.forEach((r: any) => {
      console.log(`   ${r.serie} - ${r.presenca || 'NULL'}: ${r.total}`)
    })

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await pool.end()
  }
}

verificarQuestoesPorSerie()
