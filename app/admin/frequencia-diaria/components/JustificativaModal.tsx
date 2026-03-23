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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onFechar}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Justificativa de Falta</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Informe o motivo da ausencia do aluno
        </p>
        <textarea
          value={justificativaTexto}
          onChange={e => setJustificativaTexto(e.target.value)}
          placeholder="Ex: Atestado medico, motivo familiar..."
          rows={3}
          autoFocus
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
