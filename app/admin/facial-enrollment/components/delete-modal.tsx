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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusao
          </h3>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-700">
            Tem certeza que deseja remover todos os dados faciais (consentimento e embedding)
            do aluno <strong>{aluno?.nome}</strong>?
          </p>
          <p className="text-sm text-red-600 mt-2">
            Esta acao nao pode ser desfeita.
          </p>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={deletando}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {deletando && <LoadingSpinner />}
            <Trash2 className="w-4 h-4" />
            Remover Dados
          </button>
        </div>
      </div>
    </div>
  )
}
