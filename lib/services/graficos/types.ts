/**
 * Tipos e interfaces do módulo de gráficos
 *
 * @module services/graficos/types
 */

/** Tipo genérico para rows retornados do PostgreSQL */
export type DbValue = string | number | boolean | null
export type DbRow = Record<string, DbValue>

export interface GraficosFiltros {
  tipoGrafico: string
  anoLetivo: string | null
  poloId: string | null
  escolaId: string | null
  serie: string | null
  disciplina: string | null
  turmaId: string | null
  tipoEnsino: string | null
  tipoRanking?: string | null
}

/** Dados de média por disciplina (gráfico disciplinas) */
export interface DisciplinasDataSingle {
  labels: string[]
  dados: number[]
  totalAlunos: number
}

export interface DisciplinasDataAll extends DisciplinasDataSingle {
  desvios: number[]
  taxas_aprovacao: number[]
  totalAlunosPT: number
  anosIniciais: number
  anosFinais: number
  faixas: {
    insuficiente: number[]
    regular: number[]
    bom: number[]
    excelente: number[]
  }
}

export type DisciplinasData = DisciplinasDataSingle | DisciplinasDataAll

/** Dados de gráfico com labels/dados/totais/disciplina */
export interface LabelDadosTotaisData {
  labels: string[]
  dados: number[]
  totais: number[]
  disciplina: string
}

/** Dados do gráfico de escolas (com rankings) */
export interface EscolasData extends LabelDadosTotaisData {
  rankings: number[]
}

/** Dados de distribuição de notas */
export interface DistribuicaoData {
  labels: string[]
  dados: number[]
  disciplina: string
}

/** Dados de presença */
export interface PresencaData {
  labels: string[]
  dados: number[]
}

/** Dados do comparativo de escolas */
export interface ComparativoEscolasData {
  escolas: string[]
  mediaGeral: number[]
  mediaLP: number[]
  mediaCH: number[]
  mediaMAT: number[]
  mediaCN: number[]
  mediaPT: number[]
  totais: number[]
  temAnosIniciais: boolean
  temAnosFinais: boolean
}

/** Item de acertos/erros por questão */
export interface AcertosErrosQuestaoItem {
  nome: string
  questao: string
  acertos: number
  erros: number
  total_alunos: number
  tipo: string
}

/** Item de acertos/erros por escola ou turma */
export interface AcertosErrosAgregadoItem {
  nome: string
  serie?: string
  turma?: string | null
  escola?: string
  acertos: number
  erros: number
  total_alunos: number
  total_questoes?: number
}

export type AcertosErrosItem = AcertosErrosQuestaoItem | AcertosErrosAgregadoItem

/** Metadados de acertos/erros */
export interface AcertosErrosMeta {
  tipo: string
  disciplina: string | null
  total_questoes: number
  total_alunos_cadastrados: number
  total_presentes: number
  total_faltantes: number
}

/** Item do gráfico de questões */
export interface QuestaoItem {
  codigo: string
  numero: number
  descricao: string
  disciplina: string | number | boolean | null
  area_conhecimento: string | number | boolean | null
  total_respostas: number
  total_acertos: number
  taxa_acerto: number
}

/** Item do heatmap */
export interface HeatmapItem {
  escola: string | number | boolean | null
  escola_id: string | number | boolean | null
  anos_iniciais: string | number | boolean | null
  LP: number
  CH: number | null
  MAT: number
  CN: number | null
  PT: number | null
  Geral: number
}

/** Item do radar */
export interface RadarItem {
  nome: string | number | boolean | null
  anos_iniciais: string | number | boolean | null
  LP: number
  CH: number | null
  MAT: number
  CN: number | null
  PT: number | null
}

/** Item do boxplot */
export interface BoxplotItem {
  categoria: string
  min: number
  q1: number
  mediana: number
  q3: number
  max: number
  media: number
  total: number
}

/** Item de correlação */
export interface CorrelacaoItem {
  tipo: string
  LP: number
  CH: number | null
  MAT: number
  CN: number | null
  PT: number | null
}

/** Metadados de correlação */
export interface CorrelacaoMeta {
  tem_anos_finais: boolean
  tem_anos_iniciais: boolean
  total_anos_finais: number
  total_anos_iniciais: number
}

/** Item de ranking (escolas) */
export interface RankingEscolaItem {
  posicao: number
  id: string | number | boolean | null
  nome: string | number | boolean | null
  total_alunos: number
  media_geral: number
  media_lp: number
  media_ch: number
  media_mat: number
  media_cn: number
  media_producao: number
  media_ai: number
  media_af: number
}

/** Item de ranking (turmas) */
export interface RankingTurmaItem {
  posicao: number
  id: string | number | boolean | null
  nome: string | number | boolean | null
  serie: string | number | boolean | null
  escola: string | number | boolean | null
  total_alunos: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number
  media_cn: number
  media_producao: number
  anos_iniciais: string | number | boolean | null
}

export type RankingItem = RankingEscolaItem | RankingTurmaItem

/** Metadados do ranking */
export interface RankingMeta {
  tem_anos_iniciais: boolean
  tem_anos_finais: boolean
}

/** Item de aprovação */
export interface AprovacaoItem {
  categoria: string | number | boolean | null
  total_alunos: number
  aprovados_6: number
  aprovados_7: number
  aprovados_8: number
  taxa_6: number
  taxa_7: number
  taxa_8: number
  media_geral: number
}

/** Item de gaps */
export interface GapsItem {
  categoria: string | number | boolean | null
  melhor_media: number
  pior_media: number
  media_geral: number
  gap: number
  total_alunos: number
}

/** Distribuição de níveis por disciplina */
export interface NiveisCounts {
  N1: number
  N2: number
  N3: number
  N4: number
}

export interface NiveisDisciplinaData {
  LP: NiveisCounts
  MAT: NiveisCounts
  PROD: NiveisCounts
  GERAL: NiveisCounts
  total_presentes: number
  tem_anos_iniciais: boolean
  tem_anos_finais: boolean
}

/** Item de médias por etapa */
export interface MediasEtapaItem {
  escola: string | number | boolean | null
  escola_id: string | number | boolean | null
  media_ai: number | null
  media_af: number | null
  media_geral: number
  total_ai: number
  total_af: number
  total_alunos: number
}

/** Totais gerais de médias por etapa */
export interface MediasEtapaTotais {
  total_ai: number
  total_af: number
  total_alunos: number
}

/** Item de níveis por turma */
export interface NiveisTurmaItem {
  turma_id: string | number | boolean | null
  turma: string | number | boolean | null
  serie: string | number | boolean | null
  escola: string | number | boolean | null
  anos_iniciais: string | number | boolean | null
  niveis: NiveisCounts
  media_turma: number
  total_alunos: number
  nivel_predominante: string
}

export interface GraficosResponse {
  series_disponiveis: string[]
  disciplinas?: DisciplinasData | null
  escolas?: EscolasData | null
  series?: LabelDadosTotaisData | null
  polos?: LabelDadosTotaisData | null
  distribuicao?: DistribuicaoData | null
  presenca?: PresencaData | null
  comparativo_escolas?: ComparativoEscolasData | null
  acertos_erros?: AcertosErrosItem[]
  acertos_erros_meta?: AcertosErrosMeta
  questoes?: QuestaoItem[]
  heatmap?: HeatmapItem[]
  radar?: RadarItem[]
  boxplot?: BoxplotItem[]
  boxplot_disciplina?: string
  correlacao?: CorrelacaoItem[]
  correlacao_meta?: CorrelacaoMeta
  ranking?: RankingItem[]
  ranking_disciplina?: string
  ranking_meta?: RankingMeta
  aprovacao?: AprovacaoItem[]
  aprovacao_disciplina?: string
  gaps?: GapsItem[]
  gaps_disciplina?: string
  niveis_disciplina?: NiveisDisciplinaData | null
  medias_etapa?: MediasEtapaItem[]
  medias_etapa_totais?: MediasEtapaTotais
  niveis_turma?: NiveisTurmaItem[]
}

export interface BuildFiltersResult {
  whereClause: string
  params: (string | null)[]
  paramIndex: number
  deveRemoverLimites: boolean
}
