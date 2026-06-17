'use client'

import { Trash2, UserX } from 'lucide-react'
import { Usuario } from './types'

interface Props {
  usuario: Usuario | null
  excluindo: boolean
  onFechar: () => void
  onExcluir: (hardDelete: boolean) => void
}

export function ModalUsuarioExcluir({ usuario, excluindo, onFechar, onExcluir }: Props) {
  if (!usuario) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-excluir-titulo">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500/75 dark:bg-gray-900/75" onClick={onFechar}></div>
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="px-6 py-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 id="modal-excluir-titulo" className="text-lg font-bold text-gray-900 dark:text-white">Excluir Usuário</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{usuario.nome}</p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6">Escolha uma opção para este usuário:</p>

            <div className="space-y-3">
              <button
                onClick={() => onExcluir(false)}
                disabled={excluindo}
                className="w-full px-4 py-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <UserX className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">Desativar</span>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">O usuário não poderá mais fazer login, mas os dados serão mantidos</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onExcluir(true)}
                disabled={excluindo}
                className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-left hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <span className="font-medium text-red-800 dark:text-red-200">Excluir permanentemente</span>
                    <p className="text-xs text-red-600 dark:text-red-400">Remove o usuário completamente. Esta ação não pode ser desfeita!</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={onFechar}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
