/**
 * Servico de Importacao Completa
 *
 * Extrai a logica de negocio da rota /api/admin/importar-completo
 * e organiza em fases bem definidas:
 *
 * Fase 1: Extrair dados unicos do Excel
 * Fase 2: Carregar dados existentes do banco
 * Fase 3: Criar polos e escolas faltantes
 * Fase 4: Carregar/criar questoes e configuracoes de series
 * Fase 5: Processar linhas (notas, acertos, presenca)
 * Fase 6: Batch insert de turmas
 * Fase 7: Batch insert de alunos
 * Fase 8: Batch insert de consolidados
 * Fase 8.5: Batch insert de producao textual
 * Fase 9: Batch insert de resultados de provas
 * Fase 10: Validacao final
 *
 * @module services/importacao
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

// Re-exportar tipos
export type {
  ImportacaoConfig,
  ImportacaoProgresso,
  ImportacaoResultado,
  DadosExtraidos,
  DadosExistentes,
  DadosQuestoes,
  DadosProcessados,
} from './types'

// Re-exportar funcoes de parse (Fase 1)
export {
  inferirSerieDaTurma,
  detectarSeriePorQuestoes,
  lerSerieDoExcel,
  extrairDadosExcel,
} from './parse'

// Re-exportar funcoes de load (Fases 2-4)
export {
  carregarDadosExistentes,
  criarPolosEEscolas,
  carregarQuestoes,
} from './load'

// Re-exportar funcoes de process (Fase 5)
export { processarLinhas } from './process'

// Re-exportar funcoes de batch (Fases 6-9)
export {
  criarTurmas,
  criarAlunos,
  inserirConsolidados,
  inserirProducao,
  inserirResultadosProvas,
} from './batch'

// Re-exportar funcoes de validate (Fase 10)
export { validarImportacao } from './validate'

// Importacoes internas para o orquestrador
import { extrairDadosExcel } from './parse'
import { carregarDadosExistentes, criarPolosEEscolas, carregarQuestoes } from './load'
import { processarLinhas } from './process'
import { criarTurmas, criarAlunos, inserirConsolidados, inserirProducao, inserirResultadosProvas } from './batch'
import { validarImportacao } from './validate'
import { ImportacaoConfig, ImportacaoResultado } from './types'

const log = createLogger('Importacao')

// ============================================================================
// ORQUESTRADOR PRINCIPAL
// ============================================================================

/**
 * Processa importacao completa orquestrando todas as fases.
 * Esta funcao e chamada em background pela rota.
 */
export async function processarImportacao(
  importacaoId: string,
  dados: Record<string, unknown>[],
  anoLetivo: string,
  usuarioId: string,
  avaliacaoId: string
): Promise<void> {
  const startTime = Date.now()
  log.info(`[IMPORTACAO ${importacaoId}] Iniciando processamento de ${dados.length} linhas`)

  try {
    const resultado: ImportacaoResultado = {
      polos: { criados: 0, existentes: 0 },
      escolas: { criados: 0, existentes: 0 },
      turmas: { criados: 0, existentes: 0 },
      alunos: { criados: 0, existentes: 0 },
      questoes: { criadas: 0, existentes: 0 },
      resultados: { processados: 0, erros: 0, duplicados: 0, novos: 0 },
    }

    const erros: string[] = []
    const config: ImportacaoConfig = { importacaoId, anoLetivo, usuarioId, avaliacaoId }

    // Fase 1: Extrair dados unicos do Excel
    const dadosExcel = extrairDadosExcel(dados)

    // Fase 2: Carregar dados existentes do banco
    const dadosExistentes = await carregarDadosExistentes(anoLetivo, avaliacaoId)

    // Fase 3: Criar polos e escolas faltantes
    await criarPolosEEscolas(dadosExcel, dadosExistentes, resultado, erros)

    // Fase 4: Carregar/criar questoes e configuracoes de series
    const dadosQuestoes = await carregarQuestoes(dadosExistentes.questoesMap, resultado)

    // Fase 5: Processar linhas do arquivo
    const {
      turmasParaInserir,
      alunosParaInserir,
      consolidadosParaInserir,
      resultadosParaInserir,
      producaoParaInserir,
    } = await processarLinhas(dados, config, dadosExistentes, dadosQuestoes, resultado, erros)

    // Fase 6: Batch insert de turmas
    await criarTurmas(turmasParaInserir, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir)

    // Fase 7: Batch insert de alunos
    await criarAlunos(alunosParaInserir, consolidadosParaInserir, resultadosParaInserir, producaoParaInserir, resultado, erros)

    // Fase 8: Batch insert de consolidados
    await inserirConsolidados(consolidadosParaInserir, erros)

    // Fase 8.5: Batch insert de producao textual
    await inserirProducao(producaoParaInserir, alunosParaInserir, consolidadosParaInserir)

    // Fase 9: Batch insert de resultados de provas
    await inserirResultadosProvas(resultadosParaInserir, resultado, erros)

    // Fase 10: Validacao final
    await validarImportacao(importacaoId, anoLetivo, dados, resultado, erros, startTime)

  } catch (error: unknown) {
    log.error('Erro no processamento:', error)
    await pool.query(
      'UPDATE importacoes SET status = \'erro\', erros = $1, concluido_em = CURRENT_TIMESTAMP WHERE id = $2',
      [(error as Error).message || 'Erro desconhecido', importacaoId]
    ).catch((e) => log.error('Erro ao atualizar status de erro:', e))
  }
}
