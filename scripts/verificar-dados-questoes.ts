/**
 * Script para verificar dados de questões no banco de dados
 * Verifica se há dados nas tabelas necessárias para exibir análises de questões
 */

import dotenv from 'dotenv'
import path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import pool from '../database/connection'

async function verificarDadosQuestoes() {
  console.log('='.repeat(60))
  console.log('VERIFICAÇÃO DE DADOS DE QUESTÕES')
  console.log('='.repeat(60))

  try {
    // 1. Verificar tabela resultados_provas
    console.log('\n1. TABELA resultados_provas:')
    const rpCount = await pool.query('SELECT COUNT(*) as total FROM resultados_provas')
    console.log(`   Total de registros: ${rpCount.rows[0].total}`)

    // Verificar se há campo acertou preenchido
    const rpAcertou = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE acertou = true) as acertos,
        COUNT(*) FILTER (WHERE acertou = false) as erros,
        COUNT(*) FILTER (WHERE acertou IS NULL) as sem_info
      FROM resultados_provas
    `)
    console.log(`   Acertos: ${rpAcertou.rows[0].acertos}`)
    console.log(`   Erros: ${rpAcertou.rows[0].erros}`)
    console.log(`   Sem info: ${rpAcertou.rows[0].sem_info}`)

    // Verificar campos questao_codigo e questao_id
    const rpQuestao = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE questao_codigo IS NOT NULL AND questao_codigo != '') as com_codigo,
        COUNT(*) FILTER (WHERE questao_id IS NOT NULL) as com_id,
        COUNT(*) FILTER (WHERE questao_codigo IS NULL OR questao_codigo = '') as sem_codigo
      FROM resultados_provas
    `)
    console.log(`   Com código de questão: ${rpQuestao.rows[0].com_codigo}`)
    console.log(`   Com ID de questão: ${rpQuestao.rows[0].com_id}`)
    console.log(`   Sem código: ${rpQuestao.rows[0].sem_codigo}`)

    // 2. Verificar tabela questoes
    console.log('\n2. TABELA questoes:')
    const qCount = await pool.query('SELECT COUNT(*) as total FROM questoes')
    console.log(`   Total de questões: ${qCount.rows[0].total}`)

    // Amostra de questões
    const qAmostra = await pool.query(`
      SELECT id, codigo, descricao, disciplina
      FROM questoes
      LIMIT 5
    `)
    if (qAmostra.rows.length > 0) {
      console.log('   Amostra de questões:')
      qAmostra.rows.forEach((q: any) => {
        console.log(`     - ${q.codigo || q.id}: ${q.descricao?.substring(0, 50) || 'Sem descrição'}... (${q.disciplina || 'Sem disciplina'})`)
      })
    }

    // 3. Verificar se há dados por disciplina em resultados_provas
    console.log('\n3. DISTRIBUIÇÃO POR DISCIPLINA (resultados_provas):')
    const rpDisciplinas = await pool.query(`
      SELECT
        COALESCE(disciplina, area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE acertou = true) as acertos,
        COUNT(*) FILTER (WHERE acertou = false) as erros
      FROM resultados_provas
      GROUP BY COALESCE(disciplina, area_conhecimento, 'Não informado')
      ORDER BY total DESC
    `)
    if (rpDisciplinas.rows.length > 0) {
      rpDisciplinas.rows.forEach((d: any) => {
        console.log(`   ${d.disciplina}: ${d.total} registros (${d.acertos} acertos, ${d.erros} erros)`)
      })
    } else {
      console.log('   Nenhum dado por disciplina')
    }

    // 4. Verificar se há dados por série em resultados_provas
    console.log('\n4. DISTRIBUIÇÃO POR SÉRIE (resultados_provas):')
    const rpSeries = await pool.query(`
      SELECT
        serie,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE acertou = true) as acertos,
        COUNT(*) FILTER (WHERE acertou = false) as erros
      FROM resultados_provas
      WHERE serie IS NOT NULL
      GROUP BY serie
      ORDER BY serie
    `)
    if (rpSeries.rows.length > 0) {
      rpSeries.rows.forEach((s: any) => {
        console.log(`   ${s.serie}: ${s.total} registros (${s.acertos} acertos, ${s.erros} erros)`)
      })
    } else {
      console.log('   Nenhum dado por série')
    }

    // 5. Simular a query de questões com mais erros
    console.log('\n5. SIMULAÇÃO DA QUERY DE QUESTÕES COM MAIS ERROS:')
    const questoesErros = await pool.query(`
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      WHERE (rp.presenca = 'P' OR rp.presenca = 'p')
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 5
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 10
    `)
    if (questoesErros.rows.length > 0) {
      console.log(`   Encontradas ${questoesErros.rows.length} questões:`)
      questoesErros.rows.forEach((q: any, i: number) => {
        console.log(`   ${i + 1}. ${q.questao_codigo} (${q.disciplina}): ${q.taxa_erro}% erro (${q.total_erros}/${q.total_respostas})`)
      })
    } else {
      console.log('   NENHUMA QUESTÃO ENCONTRADA!')
      console.log('   Possíveis causas:')
      console.log('   - Tabela resultados_provas está vazia')
      console.log('   - Campo questao_codigo não está preenchido')
      console.log('   - Filtro HAVING COUNT(*) >= 5 elimina todas as questões')
    }

    // 6. Verificar estrutura da tabela resultados_provas
    console.log('\n6. ESTRUTURA DA TABELA resultados_provas:')
    const colunas = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'resultados_provas'
      ORDER BY ordinal_position
    `)
    colunas.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await pool.end()
  }
}

verificarDadosQuestoes()
