export interface Escola { id: string; nome: string }

export interface Veiculo {
  id: string
  placa: string
  tipo: string
  marca: string | null
  modelo: string | null
  ano_fabricacao: number | null
  capacidade: number
  vinculo: string
  empresa_terceirizada: string | null
  vistoria_validade: string | null
  acessivel_pcd: boolean
}

export interface Motorista {
  id: string
  nome: string
  cpf: string
  cnh_numero: string
  cnh_categoria: string
  cnh_validade: string
  curso_escolar_validade: string | null
  telefone: string | null
  vinculo: string
}

export interface RotaResumo {
  id: string
  codigo: string
  descricao: string
  escolas_ids: string[]
  turno: string | null
  distancia_km: number | null
  hora_inicio: string | null
  hora_fim: string | null
  veiculo_placa: string | null
  motorista_nome: string | null
  qtd_alunos: string
}

export interface Alerta {
  id: string
  placa?: string
  nome?: string
  cnh_numero?: string
  vistoria_validade?: string
  cnh_validade?: string
  curso_escolar_validade?: string | null
  status_vistoria?: string
  alerta?: string
}

export interface AlunoBuscaPnate {
  id: string
  nome: string
  codigo?: string | null
  serie?: string | null
}

export interface Parada {
  ordem: number
  endereco: string
  ponto_referencia: string
  hora_estimada: string
}

export interface FormVeiculo {
  placa: string
  tipo: string
  marca: string
  modelo: string
  ano_fabricacao: string
  capacidade: string
  combustivel: string
  vinculo: string
  empresa_terceirizada: string
  vistoria_data: string
  vistoria_validade: string
  acessivel_pcd: boolean
  observacoes: string
}

export interface FormMotorista {
  nome: string
  cpf: string
  cnh_numero: string
  cnh_categoria: string
  cnh_validade: string
  curso_escolar_validade: string
  telefone: string
  vinculo: string
}

export interface FormRota {
  codigo: string
  descricao: string
  escolas_ids: string[]
  veiculo_id: string
  motorista_id: string
  turno: string
  distancia_km: string
  hora_inicio: string
  hora_fim: string
  paradas: Parada[]
}

export interface FormParada {
  endereco: string
  ponto_referencia: string
  hora_estimada: string
}

export type TipoUso = 'ida' | 'volta' | 'ida_volta'
export type AbaPnate = 'rotas' | 'veiculos' | 'motoristas' | 'alertas'

export const TIPOS_VEICULO = [
  { v: 'onibus', label: 'Ônibus' },
  { v: 'micro_onibus', label: 'Micro-ônibus' },
  { v: 'van', label: 'Van' },
  { v: 'kombi', label: 'Kombi' },
  { v: 'lancha', label: 'Lancha' },
  { v: 'barco', label: 'Barco' },
  { v: 'outro', label: 'Outro' },
] as const

export const TURNOS = ['matutino', 'vespertino', 'noturno', 'integral'] as const

export const VEICULO_VAZIO: FormVeiculo = {
  placa: '',
  tipo: 'onibus',
  marca: '',
  modelo: '',
  ano_fabricacao: '',
  capacidade: '40',
  combustivel: '',
  vinculo: 'proprio',
  empresa_terceirizada: '',
  vistoria_data: '',
  vistoria_validade: '',
  acessivel_pcd: false,
  observacoes: '',
}

export const MOTORISTA_VAZIO: FormMotorista = {
  nome: '',
  cpf: '',
  cnh_numero: '',
  cnh_categoria: 'D',
  cnh_validade: '',
  curso_escolar_validade: '',
  telefone: '',
  vinculo: 'concursado',
}

export const ROTA_VAZIA: FormRota = {
  codigo: '',
  descricao: '',
  escolas_ids: [],
  veiculo_id: '',
  motorista_id: '',
  turno: '',
  distancia_km: '',
  hora_inicio: '',
  hora_fim: '',
  paradas: [],
}

export const PARADA_VAZIA: FormParada = { endereco: '', ponto_referencia: '', hora_estimada: '' }

export const INPUT_CLS =
  'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 outline-none'

export function toggleArr<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}
