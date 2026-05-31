'use client'

import { Loader2, Save, X } from 'lucide-react'
import { FormFormacao, INPUT_CLS } from './types'

interface Props {
  aberto: boolean
  servidorNome: string
  form: FormFormacao
  salvando: boolean
  onChange: (form: FormFormacao) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalFormacao({ aberto, servidorNome, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null

  const set = (patch: Partial<FormFormacao>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-formacao-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-formacao-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Nova formação — {servidorNome}
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nome do curso *</label>
            <input type="text" value={form.nome_curso} onChange={(e) => set({ nome_curso: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Instituição</label>
              <input type="text" value={form.instituicao} onChange={(e) => set({ instituicao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Modalidade</label>
              <select value={form.modalidade} onChange={(e) => set({ modalidade: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="">—</option>
                <option value="presencial">Presencial</option>
                <option value="ead">EAD</option>
                <option value="hibrida">Híbrida</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Carga horária (h) *</label>
              <input type="number" min={1} value={form.carga_horaria} onChange={(e) => set({ carga_horaria: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => set({ status: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="inscrito">Inscrito</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="desistente">Desistente</option>
                <option value="reprovado">Reprovado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data início</label>
              <input type="date" value={form.data_inicio} onChange={(e) => set({ data_inicio: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data conclusão</label>
              <input type="date" value={form.data_conclusao} onChange={(e) => set({ data_conclusao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => set({ categoria: e.target.value })}
                placeholder="bncc, alfabetizacao, inclusao..."
                className={`${INPUT_CLS} w-full`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">URL do certificado</label>
              <input type="url" value={form.certificado_url} onChange={(e) => set({ certificado_url: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
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
