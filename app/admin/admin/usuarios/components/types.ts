import type { TipoUsuario } from '@/lib/types'

export interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  polo_id: string | null
  escola_id: string | null
  ativo: boolean
  acesso_sisam: boolean
  acesso_gestor: boolean
  acesso_semed?: boolean
  acesso_transparencia?: boolean
  acesso_admin?: boolean
}

export interface Polo { id: string; nome: string }
export interface Escola { id: string; nome: string; polo_id: string }

export type FiltroStatus = 'todos' | 'ativos' | 'inativos'

export interface FormDataUsuario {
  nome: string
  email: string
  senha: string
  tipo_usuario: TipoUsuario
  polo_id: string
  escola_id: string
  ativo: boolean
  acesso_sisam: boolean
  acesso_gestor: boolean
  acesso_semed: boolean
  acesso_transparencia: boolean
  acesso_admin: boolean
}

export const FORM_DATA_INICIAL: FormDataUsuario = {
  nome: '',
  email: '',
  senha: '',
  tipo_usuario: 'escola',
  polo_id: '',
  escola_id: '',
  ativo: true,
  acesso_sisam: true,
  acesso_gestor: false,
  acesso_semed: false,
  acesso_transparencia: false,
  acesso_admin: false,
}

export function getTipoColor(tipo: TipoUsuario | string): string {
  const tipoNormalizado = tipo === 'admin' ? 'administrador' : tipo
  const colors: Record<TipoUsuario, string> = {
    administrador: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
    tecnico: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    polo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200',
    escola: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    professor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200',
    editor: 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200',
    publicador: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200',
    responsavel: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
  }
  return colors[tipoNormalizado as TipoUsuario] || 'bg-gray-100 text-gray-800'
}

export function getTipoLabel(tipo: TipoUsuario | string): string {
  const tipoNormalizado = tipo === 'admin' ? 'administrador' : tipo
  const labels: Record<TipoUsuario, string> = {
    administrador: 'Administrador',
    tecnico: 'Técnico',
    polo: 'Polo',
    escola: 'Escola',
    professor: 'Professor',
    editor: 'Editor de Notícias',
    publicador: 'Publicador',
    responsavel: 'Responsável',
  }
  return labels[tipoNormalizado as TipoUsuario] || tipo
}
