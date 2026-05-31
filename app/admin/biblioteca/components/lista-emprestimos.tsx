'use client'

import { Calendar } from 'lucide-react'
import { Emprestimo } from './types'

interface Props {
  emprestimos: Emprestimo[]
  onRenovar: (id: string) => void
  onDevolver: (id: string) => void
}

export function ListaEmprestimos({ emprestimos, onRenovar, onDevolver }: Props) {
  if (emprestimos.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum empréstimo ativo</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {emprestimos.map((e) => {
        const atrasado = e.dias_atraso != null && e.dias_atraso > 0
        return (
          <div
            key={e.id}
            className={`bg-white dark:bg-slate-800 rounded-xl border ${
              atrasado ? 'border-red-300' : 'border-gray-200 dark:border-slate-700'
            } p-4`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 dark:text-gray-200">{e.titulo}</p>
                <p className="text-xs text-gray-500">Para: {e.aluno_nome || e.servidor_nome || '—'}</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                  <span>Emprestado em {new Date(e.data_emprestimo).toLocaleDateString('pt-BR')}</span>
                  <span>Prazo: {new Date(e.data_prevista_devolucao).toLocaleDateString('pt-BR')}</span>
                  {e.renovacoes > 0 && <span>{e.renovacoes} renovação(ões)</span>}
                  {atrasado && <span className="text-red-600 font-bold">⚠ {e.dias_atraso} dias atrasado</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onRenovar(e.id)}
                  className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-200"
                >
                  Renovar
                </button>
                <button
                  onClick={() => onDevolver(e.id)}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                >
                  Devolver
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
