'use client'

import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { Distribuicao, INPUT_CLS, StatusDevolucao } from './types'

interface Props {
  distribuicao: Distribuicao | null
  status: StatusDevolucao
  observacoes: string
  salvando: boolean
  onChangeStatus: (s: StatusDevolucao) => void
  onChangeObs: (o: string) => void
  onFechar: () => void
  onConfirmar: () => void
}

export function ModalDevolucao({
  distribuicao, status, observacoes, salvando,
  onChangeStatus, onChangeObs, onFechar, onConfirmar,
}: Props) {
  if (!distribuicao) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-devolucao-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-devolucao-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Registrar devolução</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 text-sm">
            <p className="font-bold text-gray-800 dark:text-gray-200">{distribuicao.titulo}</p>
            {distribuicao.numero_tombamento && (
              <p className="text-xs text-gray-500 font-mono">#{distribuicao.numero_tombamento}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Estado *</label>
            <select value={status} onChange={(e) => onChangeStatus(e.target.value as StatusDevolucao)} className={`${INPUT_CLS} w-full`}>
              <option value="devolvido">Devolvido em bom estado</option>
              <option value="danificado">Danificado</option>
              <option value="extraviado">Extraviado</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => onChangeObs(e.target.value)}
              rows={3}
              placeholder="Descreva o estado, motivo do extravio, etc."
              className={`${INPUT_CLS} w-full`}
            />
          </div>
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Estoque é atualizado automaticamente conforme o estado
          </p>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onConfirmar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
