'use client'

import { AlertCircle, CheckCircle } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
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
  return (
    <ModalBase aberto={!!distribuicao} onFechar={onFechar} titulo="Registrar devolução" largura="md">
      <div className="space-y-3">
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 text-sm">
          <p className="font-bold text-gray-800 dark:text-gray-200">{distribuicao?.titulo}</p>
          {distribuicao?.numero_tombamento && (
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
        <ModalFooter
          onFechar={onFechar}
          onSalvar={onConfirmar}
          salvando={salvando}
          variantePrimaria="green"
          textoSalvar="Confirmar"
          iconePrimario={<CheckCircle className="w-4 h-4" />}
        />
      </div>
    </ModalBase>
  )
}
