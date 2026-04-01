/**
 * Tipos e interfaces do Dashboard
 *
 * Contém todos os tipos de linhas do banco de dados (DB Rows),
 * interfaces de resposta e tipos de filtro.
 *
 * @module services/dashboard/types
 */

import { QueryParamValue } from '@/lib/types'

// ============================================================================
// TIPOS DE LINHAS DO BANCO DE DADOS (DB ROWS)
// ============================================================================

/** Linha retornada pela query de métricas do dashboard */
export interface MetricasDbRow {
  total_alunos: string | null
  total_escolas: string | null
  total_turmas: string | null
  total_polos: string | null
  total_presentes: string | null
  total_faltantes: string | null
  media_geral: string | null
  media_lp: string | null
  media_mat: string | null
  media_ch: string | null
  media_cn: string | null
  media_producao: string | null
  menor_media: string | null
  maior_media: string | null
}

/** Linha retornada pela query de níveis de aprendizagem */
export interface NivelDbRow {
  nivel: string
  quantidade: string
}

/** Linha retornada pela query de médias por série */
export interface MediaSerieDbRow {
  serie: string | null
  total_alunos: string | null
  presentes: string | null
  media_geral: string | null
  media_lp: string | null
  media_mat: string | null
  media_ch: string | null
  media_cn: string | null
  media_prod: string | null
}

/** Linha retornada pela query de médias por polo */
export interface MediaPoloDbRow {
  polo_id: string
  polo: string
  total_alunos: string | null
  media_geral: string | null
  media_lp: string | null
  media_mat: string | null
  presentes: string | null
  faltantes: string | null
}

/** Linha retornada pela query de médias por escola */
export interface MediaEscolaDbRow {
  escola_id: string
  escola: string
  polo: string | null
  total_turmas: string | null
  total_alunos: string | null
  media_geral: string | null
  media_lp: string | null
  media_mat: string | null
  media_ch: string | null
  media_cn: string | null
  media_prod: string | null
  presentes: string | null
  faltantes: string | null
}

/** Linha retornada pela query de médias por turma */
export interface MediaTurmaDbRow {
  turma_id: string
  turma: string | null
  escola: string
  serie: string | null
  total_alunos: string | null
  media_geral: string | null
  media_lp: string | null
  media_mat: string | null
  media_ch: string | null
  media_cn: string | null
  media_prod: string | null
  presentes: string | null
  faltantes: string | null
}

/** Linha retornada pela query de faixas de nota */
export interface FaixaNotaDbRow {
  faixa: string
  quantidade: string
}

/** Linha retornada pela query de distribuição de presença */
export interface PresencaDbRow {
  status: string
  quantidade: string
}

/** Linha retornada pela query de top alunos */
export interface TopAlunoDbRow {
  aluno: string
  escola: string
  serie: string | null
  turma: string | null
  media_aluno: string | null
  nota_lp: string | null
  nota_mat: string | null
  nota_ch: string | null
  nota_cn: string | null
  presenca: string | null
  nivel_aprendizagem: string | null
}

/** Linha retornada pela query de alunos detalhados */
export interface AlunoDetalhadoDbRow {
  id: string
  aluno: string
  codigo: string | null
  escola_id: string
  escola: string
  polo: string | null
  serie: string | null
  turma_id: string | null
  turma: string | null
  presenca: string | null
  media_aluno: string | null
  nota_lp: string | null
  nota_mat: string | null
  nota_ch: string | null
  nota_cn: string | null
  nota_producao: string | null
  nivel_aprendizagem: string | null
  total_acertos_lp: string | null
  total_acertos_ch: string | null
  total_acertos_mat: string | null
  total_acertos_cn: string | null
  qtd_questoes_lp: string | null
  qtd_questoes_mat: string | null
  qtd_questoes_ch: string | null
  qtd_questoes_cn: string | null
  nivel_lp: string | null
  nivel_mat: string | null
  nivel_prod: string | null
  nivel_aluno: string | null
}

/** Linha retornada pela query de total de alunos */
export interface TotalDbRow {
  total: string | null
}

/** Linha retornada pela query de filtro de polos */
export interface PoloFiltroDbRow {
  id: string
  nome: string
}

/** Linha retornada pela query de filtro de escolas */
export interface EscolaFiltroDbRow {
  id: string
  nome: string
  polo_id: string
}

/** Linha retornada pela query de filtro de séries */
export interface SerieFiltroDbRow {
  serie: string
  serie_numero: number
}

/** Linha retornada pela query de filtro de turmas */
export interface TurmaFiltroDbRow {
  id: string
  codigo: string
  escola_id: string
}

/** Linha retornada pela query de filtro de anos letivos */
export interface AnoLetivoFiltroDbRow {
  ano_letivo: string
}

/** Linha retornada pela query de filtro de níveis */
export interface NivelFiltroDbRow {
  nivel: string
}

/** Linha retornada pela query de taxa de acerto por disciplina */
export interface TaxaAcertoDisciplinaDbRow {
  disciplina: string
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
  taxa_acerto: string | null
  taxa_erro: string | null
}

/** Linha retornada pela query de taxa de acerto geral */
export interface TaxaAcertoGeralDbRow {
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
  taxa_acerto_geral: string | null
  taxa_erro_geral: string | null
}

/** Linha retornada pela query de questões com acertos/erros */
export interface QuestaoAcertoDbRow {
  questao_codigo: string | null
  questao_descricao: string | null
  disciplina: string
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
  taxa_acerto: string | null
  taxa_erro: string | null
}

/** Linha retornada pela query de escolas com acertos/erros */
export interface EscolaAcertoDbRow {
  escola_id: string
  escola: string
  polo: string | null
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
  taxa_acerto: string | null
  taxa_erro: string | null
  total_alunos: string | null
}

/** Linha retornada pela query de turmas com acertos/erros */
export interface TurmaAcertoDbRow {
  turma_id: string
  turma: string | null
  escola: string
  serie: string | null
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
  taxa_acerto: string | null
  taxa_erro: string | null
  total_alunos: string | null
}

/** Linha retornada pela query de resumo de questões por série */
export interface ResumoQuestaoDbRow {
  questao_codigo: string | null
  questao_descricao: string | null
  disciplina: string
  serie: string | null
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
}

/** Linha retornada pela query de resumo de escolas por série */
export interface ResumoEscolaDbRow {
  escola_id: string
  escola: string
  polo: string | null
  serie: string | null
  disciplina: string
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
  total_alunos: string | null
}

/** Linha retornada pela query de resumo de turmas por série */
export interface ResumoTurmaDbRow {
  turma_id: string
  turma: string | null
  escola: string
  serie: string | null
  disciplina: string
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
  total_alunos: string | null
}

/** Linha retornada pela query de resumo de disciplinas por série */
export interface ResumoDisciplinaDbRow {
  disciplina: string
  serie: string | null
  total_respostas: string | null
  total_acertos: string | null
  total_erros: string | null
}

// ============================================================================
// TIPOS E INTERFACES PÚBLICAS
// ============================================================================

/** Estatísticas de acerto/erro por disciplina */
export interface TaxaAcertoDisciplina {
  disciplina: string
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto: number
  taxa_erro: number
}

/** Estatísticas de acerto/erro de uma questão */
export interface QuestaoAcertoErro {
  questao_codigo: string | null
  questao_descricao: string
  disciplina: string
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto: number
  taxa_erro: number
}

/** Estatísticas de acerto/erro de uma escola */
export interface EscolaAcertoErro {
  escola_id: string
  escola: string
  polo: string | null
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto: number
  taxa_erro: number
  total_alunos: number
}

/** Estatísticas de acerto/erro de uma turma */
export interface TurmaAcertoErro {
  turma_id: string
  turma: string | null
  escola: string
  serie: string | null
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto: number
  taxa_erro: number
  total_alunos: number
}

/** Taxa de acerto geral */
export interface TaxaAcertoGeral {
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto_geral: number
  taxa_erro_geral: number
}

/** Resumo de questão por série */
export interface ResumoQuestaoPorSerie {
  questao_codigo: string | null
  questao_descricao: string
  disciplina: string
  serie: string | null
  total_respostas: number
  total_acertos: number
  total_erros: number
}

/** Resumo de escola por série */
export interface ResumoEscolaPorSerie {
  escola_id: string
  escola: string
  polo: string | null
  serie: string | null
  disciplina: string
  total_respostas: number
  total_acertos: number
  total_erros: number
  total_alunos: number
}

/** Resumo de turma por série */
export interface ResumoPorSerieTurma {
  turma_id: string
  turma: string | null
  escola: string
  serie: string | null
  disciplina: string
  total_respostas: number
  total_acertos: number
  total_erros: number
  total_alunos: number
}

/** Resumo de disciplina por série */
export interface ResumoDisciplinaPorSerie {
  disciplina: string
  serie: string | null
  total_respostas: number
  total_acertos: number
  total_erros: number
}

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface DashboardFiltros {
  poloId: string | null
  escolaId: string | null
  anoLetivo: string | null
  avaliacaoId: string | null
  serie: string | null
  turmaId: string | null
  presenca: string | null
  tipoEnsino: string | null
  nivelAprendizagem: string | null
  faixaMedia: string | null
  disciplina: string | null
  taxaAcertoMin: string | null
  taxaAcertoMax: string | null
  questaoCodigo: string | null
  areaConhecimento: string | null
  tipoAnalise: string | null
}

export interface PaginacaoAlunos {
  pagina: number
  limite: number
  offset: number
}

export interface PaginacaoAlunosResponse {
  paginaAtual: number
  itensPorPagina: number
  totalItens: number
  totalPaginas: number
}

export interface MetricasDashboard {
  total_alunos: number
  total_escolas: number
  total_turmas: number
  total_polos: number
  total_presentes: number
  total_faltantes: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number
  media_cn: number
  media_producao: number
  menor_media: number
  maior_media: number
  taxa_presenca: number
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto_geral: number
  taxa_erro_geral: number
}

export interface NivelDistribuicao {
  nivel: string
  quantidade: number
}

export interface MediaPorSerie {
  serie: string | null
  total_alunos: number
  presentes: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number | null
  media_cn: number | null
  media_prod: number | null
}

export interface MediaPorPolo {
  polo_id: string
  polo: string
  total_alunos: number
  media_geral: number
  media_lp: number
  media_mat: number
  presentes: number
  faltantes: number
}

export interface MediaPorEscola {
  escola_id: string
  escola: string
  polo: string | null
  total_turmas: number
  total_alunos: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number | null
  media_cn: number | null
  media_prod: number | null
  presentes: number
  faltantes: number
}

export interface MediaPorTurma {
  turma_id: string
  turma: string | null
  escola: string
  serie: string | null
  total_alunos: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number | null
  media_cn: number | null
  media_prod: number | null
  presentes: number
  faltantes: number
}

export interface FaixaNota {
  faixa: string
  quantidade: number
}

export interface PresencaDistribuicao {
  status: string
  quantidade: number
}

export interface FiltrosDisponiveis {
  polos: PoloFiltroDbRow[]
  escolas: EscolaFiltroDbRow[]
  series: string[]
  turmas: TurmaFiltroDbRow[]
  anosLetivos: string[]
  niveis: string[]
  faixasMedia: string[]
}

export interface AnaliseAcertosErros {
  taxaAcertoGeral: TaxaAcertoGeral | null
  taxaAcertoPorDisciplina: TaxaAcertoDisciplina[]
  questoesComMaisErros: QuestaoAcertoErro[]
  escolasComMaisErros: EscolaAcertoErro[]
  turmasComMaisErros: TurmaAcertoErro[]
  questoesComMaisAcertos: QuestaoAcertoErro[]
  escolasComMaisAcertos: EscolaAcertoErro[]
  turmasComMaisAcertos: TurmaAcertoErro[]
}

export interface ResumosPorSerie {
  questoes: ResumoQuestaoPorSerie[]
  escolas: ResumoEscolaPorSerie[]
  turmas: ResumoPorSerieTurma[]
  disciplinas: ResumoDisciplinaPorSerie[]
}

export interface DashboardResponse {
  metricas: MetricasDashboard
  niveis: NivelDistribuicao[]
  mediasPorSerie: MediaPorSerie[]
  mediasPorPolo: MediaPorPolo[]
  mediasPorEscola: MediaPorEscola[]
  mediasPorTurma: MediaPorTurma[]
  faixasNota: FaixaNota[]
  presenca: PresencaDistribuicao[]
  topAlunos: TopAlunoDbRow[]
  alunosDetalhados: AlunoDetalhadoDbRow[]
  paginacaoAlunos: PaginacaoAlunosResponse
  filtros: FiltrosDisponiveis
  analiseAcertosErros: AnaliseAcertosErros
  resumosPorSerie: ResumosPorSerie
}

/** Resultado de buildDashboardFilters com todas as variantes de WHERE necessárias */
export interface DashboardFilterResult {
  whereClause: string
  whereClauseBase: string
  params: QueryParamValue[]
  paramsBase: QueryParamValue[]
  /** Condições para queries de filtros dropdown */
  filtrosParams: QueryParamValue[]
  filtrosWhereClauseComPresenca: string
  /** Condições para queries de resultados_provas */
  rpWhereClauseComPresenca: string
  rpParams: QueryParamValue[]
  rpWhereClauseSemSerie: string
  rpParamsSemSerie: QueryParamValue[]
  /** JOIN para nivel_aprendizagem */
  joinNivelAprendizagem: string
  /** Queries de filtro separadas */
  seriesWhereClause: string
  turmasWhereClause: string
  anosLetivosWhereClause: string
}

// ============================================================================
// MAPEAMENTO DE DISCIPLINAS
// ============================================================================

export const DISCIPLINA_MAP: Record<string, { campo: string; usarTabela: boolean }> = {
  'LP': { campo: 'nota_lp', usarTabela: false },
  'MAT': { campo: 'nota_mat', usarTabela: false },
  'CH': { campo: 'nota_ch', usarTabela: false },
  'CN': { campo: 'nota_cn', usarTabela: false },
  'PT': { campo: 'nota_producao', usarTabela: true }
}
