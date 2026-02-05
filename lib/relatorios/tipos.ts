/**
 * Tipos e Interfaces para o Sistema de Relatórios PDF
 * @module lib/relatorios/tipos
 *
 * Este módulo define todas as interfaces utilizadas no sistema de geração
 * de relatórios PDF, incluindo tipos para consultas SQL, dados de relatório,
 * gráficos e componentes PDF.
 *
 * @example
 * ```typescript
 * import { DadosRelatorioEscola, FiltroRelatorio } from '@/lib/relatorios/tipos';
 *
 * const filtro: FiltroRelatorio = {
 *   tipo: 'escola',
 *   id: 'uuid-da-escola',
 *   ano_letivo: '2025'
 * };
 * ```
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export type TipoRelatorio = 'escola' | 'polo';

/**
 * Séries disponíveis no sistema
 */
export type SerieDisponivel = '2º Ano' | '3º Ano' | '5º Ano' | '8º Ano' | '9º Ano';

/**
 * Séries que possuem avaliação de Produção Textual
 */
export const SERIES_COM_PRODUCAO_TEXTUAL: SerieDisponivel[] = ['2º Ano', '3º Ano', '5º Ano'];

/**
 * Séries que possuem avaliação de CH e CN
 */
export const SERIES_COM_CH_CN: SerieDisponivel[] = ['8º Ano', '9º Ano'];

// ============================================================================
// TIPOS PARA ROWS DO BANCO DE DADOS
// ============================================================================

/**
 * Row retornada pela query de escola
 */
export interface EscolaRow {
  id: string;
  nome: string;
  codigo: string;
  polo_id: string | null;
  polo_nome: string;
}

/**
 * Row retornada pela query de polo
 */
export interface PoloRow {
  id: string;
  nome: string;
  codigo: string;
}

/**
 * Row retornada pela query de estatísticas
 */
export interface EstatisticasRow {
  total_alunos: string;
  total_turmas: string;
  total_avaliacoes: string;
  media_geral: string;
  taxa_participacao: string;
}

/**
 * Row retornada pela query de disciplinas
 */
export interface DisciplinaRow {
  disciplina: string;
  disciplina_nome: string;
  media: string;
  acertos_total: string;
  total_registros: string;
}

/**
 * Row retornada pela query de turmas
 */
export interface TurmaRow {
  id: string;
  codigo: string;
  nome: string;
  serie: string;
  total_alunos: string;
  media_geral: string;
  media_lp: string;
  media_mat: string;
  media_ch: string;
  media_cn: string;
}

/**
 * Row retornada pela query de questões
 */
export interface QuestaoRow {
  questao_id: string;
  numero: string;
  disciplina: string;
  total_respostas: string;
  acertos: string;
  percentual_acerto: string;
}

/**
 * Row retornada pela query de níveis de aprendizagem
 */
export interface NivelRow {
  nivel: string;
  cor: string;
  quantidade: string;
}

/**
 * Row retornada pela query de produção textual
 */
export interface ProducaoTextualRow {
  media_producao: string;
  item_1: string;
  item_2: string;
  item_3: string;
  item_4: string;
  item_5: string;
  item_6: string;
  item_7: string;
  item_8: string;
}

/**
 * Row retornada pela query de comparativo com polo
 */
export interface ComparativoPoloRow {
  media_escola: string;
  media_polo: string;
  diferenca: string;
  posicao_ranking: string;
  total_escolas: string;
}

/**
 * Row retornada pela query de escolas do polo
 */
export interface EscolaPoloRow {
  id: string;
  nome: string;
  codigo: string;
  total_alunos: string;
  total_turmas: string;
  media_geral: string;
  ranking_posicao: string;
}

/**
 * Row retornada pela query de comparativo entre escolas
 */
export interface ComparativoEscolaRow {
  escola_nome: string;
  lp: string;
  mat: string;
  ch: string;
  cn: string;
  media: string;
}

// ============================================================================
// TIPOS DE ERRO
// ============================================================================

/**
 * Códigos de erro do sistema de relatórios
 */
export enum CodigoErroRelatorio {
  ESCOLA_NAO_ENCONTRADA = 'ESCOLA_NAO_ENCONTRADA',
  POLO_NAO_ENCONTRADO = 'POLO_NAO_ENCONTRADO',
  DADOS_INSUFICIENTES = 'DADOS_INSUFICIENTES',
  ERRO_GERACAO_GRAFICO = 'ERRO_GERACAO_GRAFICO',
  ERRO_GERACAO_PDF = 'ERRO_GERACAO_PDF',
  ERRO_CONSULTA_BD = 'ERRO_CONSULTA_BD',
  TIMEOUT_GRAFICO = 'TIMEOUT_GRAFICO',
  PARAMETROS_INVALIDOS = 'PARAMETROS_INVALIDOS'
}

/**
 * Classe de erro customizada para o sistema de relatórios
 */
export class ErroRelatorio extends Error {
  constructor(
    public readonly codigo: CodigoErroRelatorio,
    message: string,
    public readonly detalhes?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ErroRelatorio';
  }
}

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

/**
 * Filtros para geração de relatório
 */
export interface FiltroRelatorio {
  /** Tipo de relatório: 'escola' ou 'polo' */
  tipo: TipoRelatorio;
  /** UUID da escola ou polo */
  id: string;
  /** Ano letivo no formato 'YYYY' */
  ano_letivo: string;
  /** Série específica para filtrar (opcional) */
  serie?: SerieDisponivel;
  /** Incluir gráficos no relatório (default: true) */
  incluir_graficos?: boolean;
  /** Incluir seção de projeções (default: true) */
  incluir_projecoes?: boolean;
  /** Incluir detalhamento por turma/escola (default: true) */
  incluir_detalhamento?: boolean;
}

/**
 * Estatísticas gerais de uma unidade (escola ou polo)
 */
export interface EstatisticasGerais {
  total_alunos: number;
  total_turmas: number;
  total_avaliacoes: number;
  media_geral: number;
  taxa_participacao: number;
  total_presentes?: number;
  total_ausentes?: number;
}

export interface ProducaoTextual {
  media_geral: number;
  itens: Array<{
    codigo: string;
    nome: string;
    media: number;
  }>;
}

export interface DesempenhoDisciplina {
  disciplina: string;
  disciplina_nome: string;
  media: number;
  total_questoes: number;
  acertos_medio: number;
  percentual_acerto: number;
}

export interface DistribuicaoNivel {
  nivel: string;
  cor?: string;
  quantidade: number;
  percentual: number;
}

export interface TurmaRelatorio {
  id: string;
  codigo: string;
  nome: string;
  serie: string;
  total_alunos: number;
  total_presentes?: number;
  total_ausentes?: number;
  media_geral: number;
  medias_disciplinas: Record<string, number>;
  distribuicao_niveis: DistribuicaoNivel[];
}

/**
 * Dados de faltas/ausências por série
 */
export interface FaltasSerie {
  serie: string;
  total_matriculados: number;
  total_presentes: number;
  total_ausentes: number;
  taxa_participacao: number;
}

/**
 * Item de produção textual avaliado
 */
export interface ItemProducaoAvaliado {
  item_id: string;
  item_codigo: string;
  item_nome: string;
  ordem: number;
  total_alunos: number;
  media_item: number;
  nota_maxima: number;
  percentual_acerto: number;
}

/**
 * Análise de questões agrupada por série
 */
export interface AnaliseQuestoesSerie {
  serie: string;
  questoes: AnaliseQuestao[];
  media_acerto_geral: number;
  questoes_dificeis: AnaliseQuestao[];
  questoes_faceis: AnaliseQuestao[];
  /** Itens de produção textual (apenas para 2º, 3º e 5º Ano) */
  itens_producao?: ItemProducaoAvaliado[];
}

export interface AnaliseQuestao {
  questao_id: string;
  numero: number;
  disciplina: string;
  total_respostas: number;
  acertos: number;
  percentual_acerto: number;
  dificuldade_calculada: 'facil' | 'media' | 'dificil';
  distribuicao_respostas: Record<string, number>;
}

export interface Projecoes {
  tendencia_media: 'crescente' | 'estavel' | 'decrescente';
  areas_atencao: string[];
  pontos_fortes: string[];
  recomendacoes: string[];
}

export interface DadosGraficos {
  evolucao_mensal?: Array<{ mes: string; media: number }>;
  comparativo_disciplinas: Array<{ disciplina: string; escola: number; polo: number; rede: number }>;
  distribuicao_notas: Array<{ faixa: string; quantidade: number }>;
  radar_competencias: Array<{ area: string; valor: number }>;
}

/**
 * Dados específicos de um segmento (Anos Iniciais ou Anos Finais)
 */
export interface DadosSegmento {
  nome_segmento: string;
  series: string[];
  estatisticas: {
    total_alunos: number;
    total_turmas: number;
    media_geral: number;
    taxa_participacao: number;
    total_presentes?: number;
    total_ausentes?: number;
  };
  desempenho_disciplinas: DesempenhoDisciplina[];
  distribuicao_niveis?: DistribuicaoNivel[];
  producao_textual?: ProducaoTextual;
  turmas: TurmaRelatorio[];
  // Análise de questões por série dentro do segmento
  analise_questoes_por_serie?: AnaliseQuestoesSerie[];
}

export interface DadosRelatorioEscola {
  escola: {
    id: string;
    nome: string;
    codigo: string;
    polo_nome: string;
    polo_id?: string;
  };
  ano_letivo: string;
  serie_filtro?: string;
  data_geracao: string;
  estatisticas: EstatisticasGerais;
  desempenho_disciplinas: DesempenhoDisciplina[];
  turmas: TurmaRelatorio[];
  analise_questoes: AnaliseQuestao[];
  projecoes: Projecoes;
  graficos: DadosGraficos;
  // Dados específicos para Anos Iniciais
  producao_textual?: ProducaoTextual;
  distribuicao_niveis?: DistribuicaoNivel[];
  // Comparativo com polo
  comparativo_polo?: {
    media_polo: number;
    media_escola: number;
    diferenca: number;
    posicao_ranking?: number;
    total_escolas_polo?: number;
  };
  // Dados por segmento
  anos_iniciais?: DadosSegmento;
  anos_finais?: DadosSegmento;
  // Dados de faltas por série
  faltas_por_serie?: FaltasSerie[];
  // Análise de questões por série
  analise_questoes_por_serie?: AnaliseQuestoesSerie[];
}

export interface EscolaComparativo {
  id: string;
  nome: string;
  codigo: string;
  total_alunos: number;
  total_turmas: number;
  media_geral: number;
  ranking_posicao: number;
}

export interface ComparativoEscola {
  escola_nome: string;
  lp: number;
  mat: number;
  ch?: number;
  cn?: number;
  media: number;
}

export interface DadosRelatorioPolo {
  polo: {
    id: string;
    nome: string;
    codigo: string;
  };
  ano_letivo: string;
  serie_filtro?: string;
  data_geracao: string;
  estatisticas: EstatisticasGerais;
  desempenho_disciplinas: DesempenhoDisciplina[];
  escolas: EscolaComparativo[];
  comparativo_escolas: ComparativoEscola[];
  analise_questoes: AnaliseQuestao[];
  projecoes: Projecoes;
  graficos: DadosGraficos;
  // Dados específicos para Anos Iniciais
  producao_textual?: ProducaoTextual;
  distribuicao_niveis?: DistribuicaoNivel[];
  // Dados por segmento
  anos_iniciais?: DadosSegmento;
  anos_finais?: DadosSegmento;
}

/**
 * Buffers de imagens dos gráficos gerados
 */
export interface GraficosBuffer {
  /** Gráfico de barras - desempenho por disciplina */
  disciplinas: Buffer;
  /** Gráfico de pizza - distribuição de notas */
  distribuicao: Buffer;
  /** Gráfico radar - competências por área */
  radar: Buffer;
  /** Gráfico de barras - taxa de acerto por questão */
  questoes: Buffer;
  /** Gráfico horizontal - comparativo entre escolas (apenas polo) */
  comparativoEscolas?: Buffer;
  /** Gráfico de barras - produção textual (apenas Anos Iniciais) */
  producaoTextual?: Buffer;
  /** Gráfico de pizza - níveis de aprendizagem */
  niveisAprendizagem?: Buffer;
}

// ============================================================================
// FUNÇÕES DE VALIDAÇÃO E UTILITÁRIOS
// ============================================================================

/**
 * Valida se uma string é uma série válida do sistema
 * @param serie - String a ser validada
 * @returns True se for uma série válida
 *
 * @example
 * ```typescript
 * isSerieValida('5º Ano') // true
 * isSerieValida('6º Ano') // false
 * ```
 */
export function isSerieValida(serie: string): serie is SerieDisponivel {
  const seriesValidas: string[] = ['2º Ano', '3º Ano', '5º Ano', '8º Ano', '9º Ano'];
  return seriesValidas.includes(serie);
}

/**
 * Verifica se uma série possui avaliação de Produção Textual
 * @param serie - Série a ser verificada
 * @returns True se a série possui Produção Textual
 */
export function serieTemProducaoTextual(serie?: string): boolean {
  if (!serie) return true; // Sem filtro = inclui todas
  return SERIES_COM_PRODUCAO_TEXTUAL.includes(serie as SerieDisponivel);
}

/**
 * Verifica se uma série possui avaliação de CH e CN
 * @param serie - Série a ser verificada
 * @returns True se a série possui CH e CN
 */
export function serieTemCHCN(serie?: string): boolean {
  if (!serie) return true; // Sem filtro = inclui todas
  return SERIES_COM_CH_CN.includes(serie as SerieDisponivel);
}

/**
 * Valida os parâmetros de filtro do relatório
 * @param filtro - Filtro a ser validado
 * @throws ErroRelatorio se os parâmetros forem inválidos
 */
export function validarFiltroRelatorio(filtro: Partial<FiltroRelatorio>): void {
  if (!filtro.id || typeof filtro.id !== 'string' || filtro.id.length < 10) {
    throw new ErroRelatorio(
      CodigoErroRelatorio.PARAMETROS_INVALIDOS,
      'ID inválido: deve ser um UUID válido',
      { id: filtro.id }
    );
  }

  if (!filtro.ano_letivo || !/^\d{4}$/.test(filtro.ano_letivo)) {
    throw new ErroRelatorio(
      CodigoErroRelatorio.PARAMETROS_INVALIDOS,
      'Ano letivo inválido: deve estar no formato YYYY',
      { ano_letivo: filtro.ano_letivo }
    );
  }

  if (filtro.serie && !isSerieValida(filtro.serie)) {
    throw new ErroRelatorio(
      CodigoErroRelatorio.PARAMETROS_INVALIDOS,
      'Série inválida: deve ser uma das séries disponíveis (2º, 3º, 5º, 8º ou 9º Ano)',
      { serie: filtro.serie }
    );
  }
}

/**
 * Converte string para número com fallback para 0
 * @param valor - Valor a ser convertido
 * @returns Número convertido ou 0
 */
export function parseNumero(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const parsed = typeof valor === 'number' ? valor : parseFloat(valor);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Converte string para inteiro com fallback para 0
 * @param valor - Valor a ser convertido
 * @returns Inteiro convertido ou 0
 */
export function parseInteiro(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const parsed = typeof valor === 'number' ? Math.round(valor) : parseInt(valor, 10);
  return isNaN(parsed) ? 0 : parsed;
}
