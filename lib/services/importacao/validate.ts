/**
 * Fase 10: Validacao final da importacao
 *
 * @module services/importacao/validate
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { ImportacaoResultado } from './types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 10: VALIDACAO FINAL
// ============================================================================

/**
 * Fase 10: Valida contagens finais e atualiza registro de importacao
 */
export async function validarImportacao(
  importacaoId: string,
  anoLetivo: string,
  dados: any[],
  resultado: ImportacaoResultado,
  erros: string[],
  startTime: number
): Promise<void> {
  log.info('[VALIDACAO] Verificando dados importados...')
  const alunosImportados = await pool.query(
    'SELECT COUNT(*) as total FROM alunos WHERE ano_letivo = $1',
    [anoLetivo]
  )
  const consolidadosImportados = await pool.query(
    'SELECT COUNT(*) as total FROM resultados_consolidados WHERE ano_letivo = $1',
    [anoLetivo]
  )
  const resultadosImportados = await pool.query(
    'SELECT COUNT(*) as total FROM resultados_provas WHERE ano_letivo = $1',
    [anoLetivo]
  )

  const totalAlunosNoBanco = parseInt(alunosImportados.rows[0].total)
  const totalConsolidadosNoBanco = parseInt(consolidadosImportados.rows[0].total)
  const totalResultadosNoBanco = parseInt(resultadosImportados.rows[0].total)

  log.info(`  -> Alunos no banco: ${totalAlunosNoBanco}`)
  log.info(`  -> Consolidados no banco: ${totalConsolidadosNoBanco}`)
  log.info(`  -> Resultados de provas no banco: ${totalResultadosNoBanco}`)

  const alunosEsperados = dados.length
  if (totalAlunosNoBanco < alunosEsperados) {
    const faltando = alunosEsperados - totalAlunosNoBanco
    log.error(`ATENCAO: Faltam ${faltando} alunos! Esperado: ${alunosEsperados}, Importado: ${totalAlunosNoBanco}`)
    erros.push(`FALTAM ${faltando} ALUNOS: Esperado ${alunosEsperados}, mas apenas ${totalAlunosNoBanco} foram importados`)
  } else if (totalAlunosNoBanco > alunosEsperados) {
    log.info(`Mais alunos no banco (${totalAlunosNoBanco}) que no arquivo (${alunosEsperados}) - pode haver alunos de importacoes anteriores`)
  } else {
    log.info(`Todos os ${alunosEsperados} alunos foram importados com sucesso!`)
  }

  // Finalizacao
  const endTime = Date.now()
  const duracao = ((endTime - startTime) / 1000).toFixed(2)
  log.info(`[IMPORTACAO ${importacaoId}] Concluida em ${duracao}s`)
  log.info(`[RESUMO FINAL]`)
  log.info(`  - Alunos: ${resultado.alunos.criados} criados, ${resultado.alunos.existentes} existentes`)
  log.info(`  - Consolidados: ${totalConsolidadosNoBanco} no banco`)
  log.info(`  - Resultados: ${resultado.resultados.novos} novos, ${resultado.resultados.duplicados} duplicados`)
  log.info(`  - Erros: ${resultado.resultados.erros} linhas com erro`)

  await pool.query(
    `UPDATE importacoes
     SET linhas_processadas = $1, linhas_com_erro = $2,
         status = $3, concluido_em = CURRENT_TIMESTAMP,
         erros = $4,
         polos_criados = $5, polos_existentes = $6,
         escolas_criadas = $7, escolas_existentes = $8,
         turmas_criadas = $9, turmas_existentes = $10,
         alunos_criados = $11, alunos_existentes = $12,
         questoes_criadas = $13, questoes_existentes = $14,
         resultados_novos = $15, resultados_duplicados = $16
     WHERE id = $17`,
    [
      resultado.resultados.processados,
      resultado.resultados.erros,
      resultado.resultados.erros === dados.length ? 'erro' : 'concluido',
      erros.length > 0 ? erros.slice(0, 50).join('\n') : null,
      resultado.polos.criados, resultado.polos.existentes,
      resultado.escolas.criados, resultado.escolas.existentes,
      resultado.turmas.criados, resultado.turmas.existentes,
      resultado.alunos.criados, resultado.alunos.existentes,
      resultado.questoes.criadas, resultado.questoes.existentes,
      resultado.resultados.novos, resultado.resultados.duplicados,
      importacaoId,
    ]
  )
}
