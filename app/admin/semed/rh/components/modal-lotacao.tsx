'use client'

import { Loader2, Save, X } from 'lucide-react'
import { Escola, FormLotacao, INPUT_CLS } from './types'

interface Props {
  aberto: boolean
  servidorNome: string
  escolas: Escola[]
  form: FormLotacao
  salvando: boolean
  onChange: (form: FormLotacao) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalLotacao({
  aberto, servidorNome, escolas, form, salvando, onChange, onFechar, onSalvar,
}: Props) {
  if (!aberto) return null

  const set = (patch: Partial<FormLotacao>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-lotacao-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-lotacao-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Nova lotação — {servidorNome}
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (deixe em branco para SEMED)</label>
            <select value={form.escola_id} onChange={(e) => set({ escola_id: e.target.value })} className={`${INPUT_CLS} w-full`}>
              <option value="">SEMED (sede)</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Função *</label>
            <input
              type="text"
              value={form.funcao}
              onChange={(e) => set({ funcao: e.target.value })}
              placeholder="Ex: Diretor, Professor, Merendeira"
              className={`${INPUT_CLS} w-full`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Carga horária semanal *</label>
              <input type="number" min={1} max={60} value={form.carga_horaria_semanal} onChange={(e) => set({ carga_horaria_semanal: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Turno</label>
              <select value={form.turno} onChange={(e) => set({ turno: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="noturno">Noturno</option>
                <option value="integral">Integral</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vigência início *</label>
              <input type="date" value={form.vigencia_inicio} onChange={(e) => set({ vigencia_inicio: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vigência fim</label>
              <input type="date" value={form.vigencia_fim} onChange={(e) => set({ vigencia_fim: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.e_principal} onChange={(e) => set({ e_principal: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" />
            <span className="text-gray-700 dark:text-gray-200">É lotação principal (desativa outras principais vigentes)</span>
          </label>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={2} className={`${INPUT_CLS} w-full`} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
