import { ModalBase, ModalFooter } from '@/components/ui/modal-base'

interface JustificativaModalProps {
  justificativaTexto: string
  setJustificativaTexto: (v: string) => void
  onFechar: () => void
  onSalvar: () => void
}

export function JustificativaModal({
  justificativaTexto,
  setJustificativaTexto,
  onFechar,
  onSalvar,
}: JustificativaModalProps) {
  return (
    <ModalBase aberto={true} onFechar={onFechar} titulo="Justificativa de Falta" largura="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Informe o motivo da ausência do aluno
        </p>
        <textarea
          value={justificativaTexto}
          onChange={e => setJustificativaTexto(e.target.value)}
          placeholder="Ex: Atestado médico, motivo familiar..."
          rows={3}
          autoFocus
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
        <ModalFooter onFechar={onFechar} onSalvar={onSalvar} />
      </div>
    </ModalBase>
  )
}
