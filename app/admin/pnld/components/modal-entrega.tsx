'use client'

import { AlertCircle, ArrowDownToLine, Loader2, X } from 'lucide-react'
import { AlunoBusca, FormEntrega, INPUT_CLS, Titulo } from './types'
import { BuscadorAluno } from './buscador-aluno'

interface Props {
  aberto: boolean
  titulos: Titulo[]
  form: FormEntrega
  alunoSelecionado: AlunoBusca | null
  salvando: boolean
  onChange: (form: FormEntrega) => void
  onChangeAluno: (a: AlunoBusca | null) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalEntrega({
  aberto, titulos, form, alunoSelecionado, salvando,
  onChange, onChangeAluno, onFechar, onSalvar,
}: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormEntrega>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-entrega-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-entrega-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Entrega ao aluno</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Aluno *</label>
            <BuscadorAluno selecionado={alunoSelecionado} onSelecionar={onChangeAluno} />
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
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nº tombamento</label>
              <input type="text" value={form.numero_tombamento} onChange={(e) => set({ numero_tombamento: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Data devolução prevista</label>
            <input
              type="date"
              value={form.data_devolucao_prevista}
              onChange={(e) => set({ data_devolucao_prevista: e.target.value })}
              className={`${INPUT_CLS} w-full`}
            />
          </div>
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Estoque é decrementado automaticamente
          </p>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />} Entregar
          </button>
        </div>
      </div>
    </div>
  )
}
