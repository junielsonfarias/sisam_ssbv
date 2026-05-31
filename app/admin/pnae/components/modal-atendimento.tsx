'use client'

import { CheckCircle, Loader2, X } from 'lucide-react'
import {
  Escola, FAIXAS, FAIXA_LABEL, FormAtendimento, INPUT_CLS,
  TIPOS_REFEICAO, TIPO_REFEICAO_LABEL,
} from './types'

interface Props {
  aberto: boolean
  escolas: Escola[]
  form: FormAtendimento
  salvando: boolean
  onChange: (form: FormAtendimento) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalAtendimento({ aberto, escolas, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormAtendimento>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-atendimento-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-atendimento-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Registrar atendimento diário
          </h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data *</label>
              <input type="date" value={form.data_atendimento} onChange={(e) => set({ data_atendimento: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Faixa etária *</label>
              <select value={form.faixa_etaria} onChange={(e) => set({ faixa_etaria: e.target.value })} className={`${INPUT_CLS} w-full`}>
                {FAIXAS.map((f) => <option key={f} value={f}>{FAIXA_LABEL[f]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Refeição *</label>
              <select value={form.tipo_refeicao} onChange={(e) => set({ tipo_refeicao: e.target.value })} className={`${INPUT_CLS} w-full`}>
                {TIPOS_REFEICAO.map((t) => <option key={t} value={t}>{TIPO_REFEICAO_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd alunos PNAE *</label>
              <input type="number" min={0} value={form.qtd_alunos} onChange={(e) => set({ qtd_alunos: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd extra (visitantes)</label>
              <input type="number" min={0} value={form.qtd_extra} onChange={(e) => set({ qtd_extra: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={2} className={`${INPUT_CLS} w-full`} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}
