/**
 * Calcula o nível baseado na nota (fallback quando nivel_prod não está no banco)
 * Faixas: N1: <3, N2: 3-4.99, N3: 5-7.49, N4: >=7.5
 */
export function calcularNivelPorNota(nota: number | string | null | undefined): string | null {
  if (nota === null || nota === undefined) return null
  const notaNum = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(notaNum) || notaNum <= 0) return null
  if (notaNum < 3) return 'N1'
  if (notaNum < 5) return 'N2'
  if (notaNum < 7.5) return 'N3'
  return 'N4'
}

export interface ResultadoConsolidadoAnalise {
  id: string
  aluno_id?: string
  aluno_nome: string
  escola_nome: string
  escola_id?: string
  polo_id?: string
  polo_nome?: string
  turma_codigo: string
  serie: string
  presenca: string
  total_acertos_lp: number | string
  total_acertos_ch: number | string
  total_acertos_mat: number | string
  total_acertos_cn: number | string
  nota_lp: number | string | null
  nota_ch: number | string | null
  nota_mat: number | string | null
  nota_cn: number | string | null
  nota_producao?: number | string | null
  media_aluno: number | string | null
  qtd_questoes_lp?: number | null
  qtd_questoes_mat?: number | null
  qtd_questoes_ch?: number | null
  qtd_questoes_cn?: number | null
  nivel_lp?: string | null
  nivel_mat?: string | null
  nivel_prod?: string | null
  nivel_aluno?: string | null
}

export interface FiltrosAnalise {
  polo_id?: string
  escola_id?: string
  turma_id?: string
  ano_letivo?: string
  avaliacao_id?: string
  serie?: string
  presenca?: string
  tipo_ensino?: string
}

export interface AvaliacaoOption {
  id: string
  nome: string
  tipo: string
}

export interface EstatisticasAnalise {
  totalAlunos: number
  totalPresentes: number
  totalFaltas: number
  mediaGeral: number
  mediaLP: number
  mediaCH: number
  mediaMAT: number
  mediaCN: number
  mediaProd: number
}

export interface PainelAnaliseProps {
  tipoUsuario: 'admin' | 'escola' | 'tecnico' | 'polo'
  titulo: string
  subtitulo: string
  resultadosEndpoint: string
  escolasEndpoint?: string
  turmasEndpoint?: string
  polosEndpoint?: string
  mostrarFiltroPolo?: boolean
  mostrarFiltroEscola?: boolean
  escolaIdFixo?: string
  poloIdFixo?: string
}

export interface PaginacaoState {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  temProxima: boolean
  temAnterior: boolean
}

/**
 * Helper to compute serie visibility flags used across multiple sub-components.
 */
export function getSerieVisibility(serie?: string) {
  const numSerie = serie?.replace(/[^0-9]/g, '') || ''
  const serieIsAnosIniciais = ['2', '3', '5'].includes(numSerie)
  const serieIsAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
  const temFiltroSerie = !!serie && serie.trim() !== ''

  return {
    mostrarProd: !temFiltroSerie || serieIsAnosIniciais,
    mostrarChCn: !temFiltroSerie || serieIsAnosFinais,
  }
}
