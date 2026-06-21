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
  dados: Record<string, unknown>[],
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
  log.info(`  - Escolas: ${resultado.escolas.criados} criadas, ${resultado.escolas.existentes} existentes, ${resultado.escolas.divergentes} divergentes (gate Gestor)`)
  log.info(`  - Turmas: ${resultado.turmas.criados} criadas, ${resultado.turmas.existentes} existentes, ${resultado.turmas.divergentes} divergentes (gate Gestor)`)
  log.info(`  - Alunos: ${resultado.alunos.criados} criados, ${resultado.alunos.existentes} existentes, ${resultado.alunos.divergentes} divergentes (gate Gestor)`)
  log.info(`  - Consolidados: ${totalConsolidadosNoBanco} no banco`)
  log.info(`  - Resultados: ${resultado.resultados.novos} novos, ${resultado.resultados.duplicados} duplicados`)
  log.info(`  - Erros: ${resultado.resultados.erros} linhas com erro`)
  const totalDivergencias = resultado.escolas.divergentes + resultado.turmas.divergentes + resultado.alunos.divergentes
  if (totalDivergencias > 0) {
    log.warn(
      `  - DIVERGENCIAS (gate Gestor): ${totalDivergencias} registro(s) de cadastro mestre ausentes. ` +
      `Consulte o relatorio de erros da importacao e regularize no modulo Gestor.`
    )
  }

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

  // Atualiza a materialized view consumida pelo painel do Semed (mv_sisam_media)
  // para que os dados nao fiquem stale apos a importacao. Nao deve derrubar a
  // importacao caso a MV ainda nao exista ou o refresh falhe.
  await atualizarMvSisamMedia()
}

/**
 * Atualiza a materialized view mv_sisam_media de forma concorrente (sem lock de
 * leitura) ao final do fluxo de importacao do Sisam, mantendo o painel do Semed
 * sincronizado. Tolerante a falhas: registra o erro mas nao interrompe o fluxo.
 *
 * Usa CONCURRENTLY (exige indice unico na MV — garantido pela migration
 * create-mv-sisam-media / refresh-mv-sisam-media-indice-unico). Cai para um
 * REFRESH simples caso o concorrente falhe (ex.: MV nunca populada).
 */
async function atualizarMvSisamMedia(): Promise<void> {
  try {
    log.info('[VALIDACAO] Atualizando mv_sisam_media (CONCURRENTLY)...')
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sisam_media')
    log.info('[VALIDACAO] mv_sisam_media atualizada com sucesso')
  } catch (errConcurrent) {
    log.warn(
      `[VALIDACAO] REFRESH CONCURRENTLY falhou, tentando REFRESH simples: ${(errConcurrent as Error).message}`
    )
    try {
      await pool.query('REFRESH MATERIALIZED VIEW mv_sisam_media')
      log.info('[VALIDACAO] mv_sisam_media atualizada (REFRESH simples)')
    } catch (errPlain) {
      log.error(
        '[VALIDACAO] Falha ao atualizar mv_sisam_media (painel do Semed pode ficar stale)',
        errPlain
      )
    }
  }
}
