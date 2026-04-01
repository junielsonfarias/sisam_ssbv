// SISAM - Verificadores de Divergências (Fachada)
// Re-exporta todos os verificadores dos módulos especializados
// e mantém as funções orquestradoras

import {
  Divergencia,
  ResumoDivergencias,
  ResultadoVerificacao
} from './tipos'

import { limparCacheConfigSeries } from './verificadores-helpers'

// Re-exports: Integridade de Dados
export {
  verificarAlunosDuplicados,
  verificarAlunosOrfaos,
  verificarResultadosOrfaos,
  verificarMediasInconsistentes,
  verificarNotasForaRange,
  verificarTotalAcertosErrado,
  verificarAlunosSemResultados
} from './verificadores-dados'

// Re-exports: Estrutura
export {
  verificarEscolasSemPolo,
  verificarTurmasSemEscola,
  verificarSeriesNaoConfiguradas,
  verificarTurmasVazias,
  verificarPolosSemEscolas,
  verificarEscolasSemAlunos
} from './verificadores-estrutura'

// Re-exports: Regras de Negócio
export {
  verificarNivelAprendizagemIncorreto,
  verificarAnoLetivoInvalido,
  verificarPresencaInconsistente,
  verificarSerieAlunoTurmaDivergente,
  verificarImportacoesErroPendente,
  verificarQuestoesSemGabarito
} from './verificadores-regras'

// Imports diretos para uso nas funções orquestradoras
import {
  verificarAlunosDuplicados,
  verificarAlunosOrfaos,
  verificarResultadosOrfaos,
  verificarMediasInconsistentes,
  verificarNotasForaRange,
  verificarTotalAcertosErrado,
  verificarAlunosSemResultados
} from './verificadores-dados'

import {
  verificarEscolasSemPolo,
  verificarTurmasSemEscola,
  verificarSeriesNaoConfiguradas,
  verificarTurmasVazias,
  verificarPolosSemEscolas,
  verificarEscolasSemAlunos
} from './verificadores-estrutura'

import {
  verificarNivelAprendizagemIncorreto,
  verificarAnoLetivoInvalido,
  verificarPresencaInconsistente,
  verificarSerieAlunoTurmaDivergente,
  verificarImportacoesErroPendente,
  verificarQuestoesSemGabarito
} from './verificadores-regras'

/**
 * Executa todas as verificações e retorna resultado consolidado
 */
export async function executarTodasVerificacoes(): Promise<ResultadoVerificacao> {
  // Limpar cache de configurações para garantir dados atualizados
  limparCacheConfigSeries()

  const divergencias: Divergencia[] = []

  const [
    // Críticas
    alunosDuplicados,
    alunosOrfaos,
    resultadosOrfaos,
    escolasSemPolo,
    turmasSemEscola,
    // Importantes
    mediasInconsistentes,
    notasForaRange,
    questoesSemGabarito,
    seriesNaoConfiguradas,
    nivelAprendizagemErrado,
    totalAcertosErrado,
    // Avisos
    anoLetivoInvalido,
    presencaInconsistente,
    serieAlunoTurmaDivergente,
    importacoesErroPendente,
    // Informativos
    alunosSemResultados,
    escolasSemAlunos,
    polosSemEscolas,
    turmasVazias
  ] = await Promise.all([
    // Críticas
    verificarAlunosDuplicados(),
    verificarAlunosOrfaos(),
    verificarResultadosOrfaos(),
    verificarEscolasSemPolo(),
    verificarTurmasSemEscola(),
    // Importantes
    verificarMediasInconsistentes(),
    verificarNotasForaRange(),
    verificarQuestoesSemGabarito(),
    verificarSeriesNaoConfiguradas(),
    verificarNivelAprendizagemIncorreto(),
    verificarTotalAcertosErrado(),
    // Avisos
    verificarAnoLetivoInvalido(),
    verificarPresencaInconsistente(),
    verificarSerieAlunoTurmaDivergente(),
    verificarImportacoesErroPendente(),
    // Informativos
    verificarAlunosSemResultados(),
    verificarEscolasSemAlunos(),
    verificarPolosSemEscolas(),
    verificarTurmasVazias()
  ])

  const resultados = [
    alunosDuplicados,
    alunosOrfaos,
    resultadosOrfaos,
    escolasSemPolo,
    turmasSemEscola,
    mediasInconsistentes,
    notasForaRange,
    questoesSemGabarito,
    seriesNaoConfiguradas,
    nivelAprendizagemErrado,
    totalAcertosErrado,
    anoLetivoInvalido,
    presencaInconsistente,
    serieAlunoTurmaDivergente,
    importacoesErroPendente,
    alunosSemResultados,
    escolasSemAlunos,
    polosSemEscolas,
    turmasVazias
  ]

  resultados.forEach(r => {
    if (r) divergencias.push(r)
  })

  const resumo: ResumoDivergencias = {
    criticos: divergencias.filter(d => d.nivel === 'critico').reduce((acc, d) => acc + d.quantidade, 0),
    importantes: divergencias.filter(d => d.nivel === 'importante').reduce((acc, d) => acc + d.quantidade, 0),
    avisos: divergencias.filter(d => d.nivel === 'aviso').reduce((acc, d) => acc + d.quantidade, 0),
    informativos: divergencias.filter(d => d.nivel === 'informativo').reduce((acc, d) => acc + d.quantidade, 0),
    total: divergencias.reduce((acc, d) => acc + d.quantidade, 0),
    ultimaVerificacao: new Date().toISOString()
  }

  return {
    resumo,
    divergencias,
    dataVerificacao: new Date().toISOString()
  }
}

/**
 * Verifica apenas divergências críticas (para alerta no login)
 */
export async function verificarDivergenciasCriticas(): Promise<number> {
  const [
    alunosDuplicados,
    alunosOrfaos,
    resultadosOrfaos,
    escolasSemPolo,
    turmasSemEscola
  ] = await Promise.all([
    verificarAlunosDuplicados(),
    verificarAlunosOrfaos(),
    verificarResultadosOrfaos(),
    verificarEscolasSemPolo(),
    verificarTurmasSemEscola()
  ])

  let total = 0
  if (alunosDuplicados) total += alunosDuplicados.quantidade
  if (alunosOrfaos) total += alunosOrfaos.quantidade
  if (resultadosOrfaos) total += resultadosOrfaos.quantidade
  if (escolasSemPolo) total += escolasSemPolo.quantidade
  if (turmasSemEscola) total += turmasSemEscola.quantidade

  return total
}
