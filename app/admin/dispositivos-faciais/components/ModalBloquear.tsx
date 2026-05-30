import { ShieldAlert } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { Dispositivo } from './types'

interface ModalBloquearProps {
  dispositivo: Dispositivo
  salvando: boolean
  onConfirmar: () => void
  onClose: () => void
}

export function ModalBloquear({
  dispositivo,
  salvando,
  onConfirmar,
  onClose,
}: ModalBloquearProps) {
  return (
    <ModalBase aberto onFechar={onClose} titulo="Bloquear Dispositivo" largura="md">
      <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-800 dark:text-red-200">
          <p className="font-medium">Tem certeza que deseja bloquear este dispositivo?</p>
          <p className="mt-1">
            O dispositivo <strong>{dispositivo.nome}</strong> sera bloqueado
            e perdera acesso ao sistema imediatamente. Sua chave API sera invalidada.
          </p>
        </div>
      </div>

      <ModalFooter
        onFechar={onClose}
        onSalvar={onConfirmar}
        salvando={salvando}
        textoSalvar="Bloquear"
        textoSalvando="Bloqueando..."
        variantePrimaria="red"
      />
    </ModalBase>
  )
}
