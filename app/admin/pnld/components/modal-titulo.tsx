'use client'

import { Loader2, Save, X } from 'lucide-react'
import { FormTitulo, INPUT_CLS, TIPOS_OBRA } from './types'

interface Props {
  aberto: boolean
  form: FormTitulo
  salvando: boolean
  onChange: (form: FormTitulo) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalTitulo({ aberto, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormTitulo>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-titulo-pnld">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-titulo-pnld" className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo título PNLD</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
              <input type="text" value={form.titulo} onChange={(e) => set({ titulo: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
              <select value={form.tipo_obra} onChange={(e) => set({ tipo_obra: e.target.value })} className={`${INPUT_CLS} w-full`}>
                {TIPOS_OBRA.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ano PNLD *</label>
              <input type="number" min={2000} max={2100} value={form.ano_pnld} onChange={(e) => set({ ano_pnld: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Autor</label>
              <input type="text" value={form.autor} onChange={(e) => set({ autor: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Editora</label>
              <input type="text" value={form.editora} onChange={(e) => set({ editora: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">ISBN</label>
              <input type="text" value={form.isbn} onChange={(e) => set({ isbn: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Código PNLD</label>
              <input type="text" value={form.codigo_pnld} onChange={(e) => set({ codigo_pnld: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Edição</label>
              <input type="text" value={form.edicao} onChange={(e) => set({ edicao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ano escolar (1-9)</label>
              <input type="number" min={1} max={9} value={form.ano_escolar} onChange={(e) => set({ ano_escolar: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Componente (código BNCC)</label>
              <input type="text" value={form.componente_id} onChange={(e) => set({ componente_id: e.target.value })} placeholder="LP, MA, CN..." className={`${INPUT_CLS} w-full`} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={2} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
