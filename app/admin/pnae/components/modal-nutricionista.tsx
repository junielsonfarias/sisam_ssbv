'use client'

import { Loader2, Save, X } from 'lucide-react'
import { FormNutricionista, INPUT_CLS } from './types'

interface Props {
  aberto: boolean
  form: FormNutricionista
  salvando: boolean
  onChange: (form: FormNutricionista) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalNutricionista({ aberto, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormNutricionista>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-nutricionista-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-nutricionista-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova nutricionista</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
            <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">CRN * (Conselho Regional de Nutricionistas)</label>
            <input type="text" value={form.crn} onChange={(e) => set({ crn: e.target.value })} placeholder="Ex: CRN-1 12345" className={`${INPUT_CLS} w-full`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
              <input type="text" value={form.telefone} onChange={(e) => set({ telefone: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
            <input
              type="checkbox"
              checked={form.responsavel_tecnico}
              onChange={(e) => set({ responsavel_tecnico: e.target.checked })}
              className="rounded text-green-600 mt-0.5"
            />
            <span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">Responsável Técnico (RT) FNDE</span>
              <span className="block text-xs text-gray-500">
                Profissional responsável pelo PAE municipal (Resolução FNDE 06/2020)
              </span>
            </span>
          </label>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
