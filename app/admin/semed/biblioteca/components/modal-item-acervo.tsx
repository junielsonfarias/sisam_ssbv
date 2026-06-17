'use client'

import { Loader2, Save, X } from 'lucide-react'
import { CATEGORIAS_BIBLIOTECA, Escola, FormNovoItem, INPUT_CLS } from './types'

interface Props {
  aberto: boolean
  form: FormNovoItem
  escolas: Escola[]
  salvando: boolean
  onChange: (form: FormNovoItem) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalItemAcervo({ aberto, form, escolas, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null

  const set = (patch: Partial<FormNovoItem>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-item-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-item-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo item no acervo</h2>
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
              <label className="text-xs font-medium text-gray-500 mb-1 block">Autor</label>
              <input type="text" value={form.autor} onChange={(e) => set({ autor: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">ISBN</label>
              <input type="text" value={form.isbn} onChange={(e) => set({ isbn: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Editora</label>
              <input type="text" value={form.editora} onChange={(e) => set({ editora: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Edição</label>
              <input type="text" value={form.edicao} onChange={(e) => set({ edicao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ano publicação</label>
              <input type="number" min={1000} max={2100} value={form.ano_publicacao} onChange={(e) => set({ ano_publicacao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Quantidade *</label>
              <input type="number" min={1} value={form.qtd_total} onChange={(e) => set({ qtd_total: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
              <select value={form.categoria} onChange={(e) => set({ categoria: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                {CATEGORIAS_BIBLIOTECA.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Gênero</label>
              <input type="text" value={form.genero} onChange={(e) => set({ genero: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Classificação (CDD/CDU)</label>
              <input type="text" value={form.classificacao} onChange={(e) => set({ classificacao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Escola</label>
              <select value={form.escola_id} onChange={(e) => set({ escola_id: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">SEMED (sede)</option>
                {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Estante</label>
              <input type="text" value={form.estante} onChange={(e) => set({ estante: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Prateleira</label>
              <input type="text" value={form.prateleira} onChange={(e) => set({ prateleira: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={2} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
