/**
 * Servico de Importacao Completa — Re-export
 *
 * Este arquivo mantem compatibilidade retroativa com imports existentes.
 * A implementacao foi dividida em modulos dentro de ./importacao/
 *
 * @module services/importacao
 */

// Re-exportar tudo do modulo importacao
export {
  // Tipos
  type ImportacaoConfig,
  type ImportacaoProgresso,
  type ImportacaoResultado,
  type DadosExtraidos,
  type DadosExistentes,
  type DadosQuestoes,
  type DadosProcessados,
  // Fase 1: Parse
  inferirSerieDaTurma,
  detectarSeriePorQuestoes,
  lerSerieDoExcel,
  extrairDadosExcel,
  // Fases 2-4: Load
  carregarDadosExistentes,
  criarPolosEEscolas,
  carregarQuestoes,
  // Fase 5: Process
  processarLinhas,
  // Fases 6-9: Batch
  criarTurmas,
  criarAlunos,
  inserirConsolidados,
  inserirProducao,
  inserirResultadosProvas,
  // Fase 10: Validate
  validarImportacao,
  // Orquestrador
  processarImportacao,
} from './importacao/index'
