/**
 * Módulo de Geração de Relatórios PDF
 * @module lib/relatorios
 *
 * Este módulo exporta todas as funcionalidades necessárias para gerar
 * relatórios PDF de escolas e polos no SISAM.
 *
 * @example
 * ```typescript
 * import {
 *   buscarDadosRelatorioEscola,
 *   gerarGraficosEscola,
 *   RelatorioEscolaPDF,
 *   ErroRelatorio,
 *   CodigoErroRelatorio
 * } from '@/lib/relatorios';
 * ```
 */

// Tipos e Interfaces
export {
  // Tipos base
  type TipoRelatorio,
  type SerieDisponivel,
  SERIES_COM_PRODUCAO_TEXTUAL,
  SERIES_COM_CH_CN,

  // Tipos de filtro
  type FiltroRelatorio,

  // Tipos de dados
  type EstatisticasGerais,
  type ProducaoTextual,
  type DesempenhoDisciplina,
  type DistribuicaoNivel,
  type TurmaRelatorio,
  type AnaliseQuestao,
  type Projecoes,
  type DadosGraficos,
  type DadosRelatorioEscola,
  type DadosRelatorioPolo,
  type EscolaComparativo,
  type ComparativoEscola,
  type GraficosBuffer,

  // Tipos para rows do banco
  type EscolaRow,
  type PoloRow,
  type EstatisticasRow,
  type DisciplinaRow,
  type TurmaRow,
  type QuestaoRow,
  type NivelRow,
  type ProducaoTextualRow,
  type ComparativoPoloRow,
  type EscolaPoloRow,
  type ComparativoEscolaRow,

  // Erros
  ErroRelatorio,
  CodigoErroRelatorio,

  // Funções utilitárias
  isSerieValida,
  serieTemProducaoTextual,
  serieTemCHCN,
  validarFiltroRelatorio,
  parseNumero,
  parseInteiro
} from './tipos';

// Consultas SQL
export {
  buscarDadosRelatorioEscola,
  buscarDadosRelatorioPolo
} from './consultas-relatorio';

// Cálculos e Projeções
export {
  calcularProjecoes,
  calcularDistribuicaoNotas,
  calcularEstatisticas,
  classificarNivel
} from './calculos-projecoes';

// Geração de Gráficos
export {
  gerarGraficoBarrasDisciplinas,
  gerarGraficoComparativoEscolas,
  gerarGraficoDistribuicaoNotas,
  gerarGraficoRadarCompetencias,
  gerarGraficoErrosAcertos,
  gerarGraficosEscola,
  gerarGraficosPolo
} from './gerador-graficos';

// Componentes PDF
export {
  RelatorioEscolaPDF,
  RelatorioPoloPDF
} from './gerador-pdf';
