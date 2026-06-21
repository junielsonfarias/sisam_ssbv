'use client'

import type { Divergencia, StatusDivergencia, TipoDivergencia } from './tipos'

const STATUS_BADGE: Record<StatusDivergencia, { rotulo: string; classe: string }> = {
  pendente: {
    rotulo: 'Pendente',
    classe: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  vinculado: {
    rotulo: 'Vinculado',
    classe: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  ignorado: {
    rotulo: 'Ignorado',
    classe: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300',
  },
}

const TIPO_BADGE: Record<TipoDivergencia, { rotulo: string; classe: string }> = {
  turma: {
    rotulo: 'Turma',
    classe: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  aluno: {
    rotulo: 'Aluno',
    classe: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
}

/** Badge colorido para o status de uma divergência. */
export function BadgeStatus({ status }: { status: StatusDivergencia }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.pendente
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.classe}`}>
      {cfg.rotulo}
    </span>
  )
}

/** Badge colorido para o tipo (turma/aluno). */
export function BadgeTipo({ tipo }: { tipo: TipoDivergencia }) {
  const cfg = TIPO_BADGE[tipo] ?? TIPO_BADGE.turma
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.classe}`}>
      {cfg.rotulo}
    </span>
  )
}

/** Lê um campo string do dado_etl (JSONB) de forma segura. */
export function campoStr(dado: Record<string, unknown>, chave: string): string {
  const v = dado?.[chave]
  return typeof v === 'string' && v.trim() !== '' ? v : ''
}

/** Rótulo descritivo do registro proposto pela divergência. */
export function descricaoDado(divergencia: Divergencia): string {
  const dado = divergencia.dado_etl ?? {}
  const nome = campoStr(dado, 'nome')
  const codigo = campoStr(dado, 'codigo')
  if (nome && codigo) return `${nome} (${codigo})`
  return nome || codigo || '—'
}
