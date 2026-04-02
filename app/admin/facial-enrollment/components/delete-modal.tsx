'use client'

import { AlertTriangle, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlunoFacial } from '../types'

interface DeleteModalProps {
  aluno: AlunoFacial | undefined
  deletando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export function DeleteModal({ aluno, deletando, onConfirmar, onCancelar }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" role="presentation">
      <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-xl rounded-t-2xl shadow-xl" role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-desc">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full mx-auto mb-3 sm:hidden" />
          <h3 id="delete-title" className="text-base font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusao
          </h3>
        </div>

        {/* Conteudo */}
        <div id="delete-desc" className="px-5 py-5">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Tem certeza que deseja remover todos os dados faciais (consentimento e embedding)
            do aluno <strong className="text-gray-900 dark:text-white">{aluno?.nome}</strong>?
          </p>
          <div className="mt-3 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Esta acao nao pode ser desfeita.
            </p>
          </div>
        </div>

        {/* Botoes */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button onClick={onCancelar}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={deletando}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {deletando && <LoadingSpinner />}
            <Trash2 className="w-4 h-4" />
            Remover Dados
          </button>
        </div>
      </div>
    </div>
  )
}
