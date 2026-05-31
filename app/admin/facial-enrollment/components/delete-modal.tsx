'use client'

import { AlertTriangle, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ModalBase } from '@/components/ui/modal-base'
import { AlunoFacial } from '../types'

interface DeleteModalProps {
  aluno: AlunoFacial | undefined
  deletando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export function DeleteModal({ aluno, deletando, onConfirmar, onCancelar }: DeleteModalProps) {
  return (
    <ModalBase aberto={!!aluno} onFechar={onCancelar} titulo="Confirmar Exclusão" largura="md">
      <div className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Tem certeza que deseja remover todos os dados faciais (consentimento e embedding) do aluno{' '}
          <strong className="text-gray-900 dark:text-white">{aluno?.nome}</strong>?
        </p>
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            Esta ação não pode ser desfeita.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
          <button
            onClick={onCancelar}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={deletando}
            aria-busy={deletando}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {deletando && <LoadingSpinner />}
            <Trash2 className="w-4 h-4" />
            Remover Dados
          </button>
        </div>
      </div>
    </ModalBase>
  )
}
