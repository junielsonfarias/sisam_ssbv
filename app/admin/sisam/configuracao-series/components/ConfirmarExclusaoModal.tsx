import { AlertTriangle, Trash2 } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { ConfiguracaoSerie } from '../types'

interface ConfirmarExclusaoModalProps {
  config: ConfiguracaoSerie
  excluindoSerie: string | null
  onConfirmar: (config: ConfiguracaoSerie) => void
  onCancelar: () => void
}

export default function ConfirmarExclusaoModal({
  config,
  excluindoSerie,
  onConfirmar,
  onCancelar,
}: ConfirmarExclusaoModalProps) {
  const salvando = excluindoSerie === config.id
  return (
    <ModalBase aberto={true} onFechar={onCancelar} titulo="Excluir Série" largura="md">
      <div className="space-y-4">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir a série <strong>{config.nome_serie}</strong>?
          <br />
          <span className="text-sm text-red-500">Esta ação não pode ser desfeita.</span>
        </p>
        <ModalFooter
          onFechar={onCancelar}
          onSalvar={() => onConfirmar(config)}
          salvando={salvando}
          variantePrimaria="red"
          textoSalvar="Excluir"
          textoSalvando="Excluindo..."
        />
      </div>
    </ModalBase>
  )
}
