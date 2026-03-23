import { Situacao, SITUACOES } from '@/lib/situacoes-config'

export interface Turma {
  id: string
  codigo: string
  nome: string | null
  serie: string
  ano_letivo: string
  escola_id: string
  escola_nome: string
  polo_nome: string | null
  total_alunos: number
  capacidade_maxima?: number
  multiserie?: boolean
  multietapa?: boolean
}

export interface Aluno {
  id: string
  codigo: string | null
  nome: string
  serie: string | null
  ano_letivo: string | null
  ativo: boolean
  data_nascimento: string | null
  pcd: boolean
  situacao: Situacao | null
  data_matricula: string | null
  data_transferencia: string | null
}

export interface TurmaDetalhe {
  turma: {
    id: string
    codigo: string
    nome: string | null
    serie: string
    ano_letivo: string
    escola_id: string
    escola_nome: string
    polo_nome: string | null
  }
  alunos: Aluno[]
  total: number
}

export interface EscolaSimples {
  id: string
  nome: string
}

export const formInicial = {
  codigo: '',
  nome: '',
  escola_id: '',
  serie: '',
  ano_letivo: new Date().getFullYear().toString(),
  capacidade_maxima: 35,
  multiserie: false,
  multietapa: false,
}

export function getSituacaoConfig(situacao: string | null) {
  return SITUACOES.find(s => s.value === situacao) || SITUACOES[0]
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

export function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const nascimento = new Date(dataNascimento)
  if (isNaN(nascimento.getTime())) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mesAtual = hoje.getMonth()
  const mesNasc = nascimento.getMonth()
  if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nascimento.getDate())) {
    idade--
  }
  return idade
}
