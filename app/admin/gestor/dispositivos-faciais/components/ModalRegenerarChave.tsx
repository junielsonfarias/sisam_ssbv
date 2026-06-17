import { AlertTriangle } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { Dispositivo } from './types'

interface ModalRegenerarChaveProps {
  dispositivo: Dispositivo
  salvando: boolean
  onConfirmar: () => void
  onClose: () => void
}

export function ModalRegenerarChave({
  dispositivo,
  salvando,
  onConfirmar,
  onClose,
}: ModalRegenerarChaveProps) {
  return (
    <ModalBase aberto onFechar={onClose} titulo="Regenerar Chave API" largura="md">
      <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">Atencao!</p>
          <p className="mt-1">
            Ao regenerar a chave do dispositivo <strong>{dispositivo.nome}</strong>,
            a chave anterior sera invalidada e o dispositivo perdera acesso ate que a nova
            chave seja configurada.
          </p>
        </div>
      </div>

      <ModalFooter
        onFechar={onClose}
        onSalvar={onConfirmar}
        salvando={salvando}
        textoSalvar="Regenerar Chave"
        textoSalvando="Regenerando..."
        variantePrimaria="amber"
      />
    </ModalBase>
  )
}
