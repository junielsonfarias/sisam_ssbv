'use client'

import { Loader2, Save, X } from 'lucide-react'
import { Escola, FormEstoque, INPUT_CLS, Titulo } from './types'

interface Props {
  aberto: boolean
  escolas: Escola[]
  titulos: Titulo[]
  form: FormEstoque
  salvando: boolean
  onChange: (form: FormEstoque) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalEstoque({ aberto, escolas, titulos, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormEstoque>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-estoque-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-estoque-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Atualizar estoque</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
            <select value={form.escola_id} onChange={(e) => set({ escola_id: e.target.value })} className={`${INPUT_CLS} w-full`}>
              <option value="">Selecione</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
            <select value={form.titulo_id} onChange={(e) => set({ titulo_id: e.target.value })} className={`${INPUT_CLS} w-full`}>
              <option value="">Selecione</option>
              {titulos.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
              <input type="text" value={form.ano_letivo} onChange={(e) => set({ ano_letivo: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd total *</label>
              <input type="number" min={0} value={form.qtd_total} onChange={(e) => set({ qtd_total: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd disponível</label>
              <input type="number" min={0} value={form.qtd_disponivel} onChange={(e) => set({ qtd_disponivel: e.target.value })} placeholder="igual ao total" className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd danificada</label>
              <input type="number" min={0} value={form.qtd_danificada} onChange={(e) => set({ qtd_danificada: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd extraviada</label>
              <input type="number" min={0} value={form.qtd_extraviada} onChange={(e) => set({ qtd_extraviada: e.target.value })} className={`${INPUT_CLS} w-full`} />
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
