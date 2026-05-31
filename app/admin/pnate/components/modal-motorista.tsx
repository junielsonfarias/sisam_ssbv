'use client'

import { Loader2, Save, X } from 'lucide-react'
import { FormMotorista, INPUT_CLS } from './types'

interface Props {
  aberto: boolean
  form: FormMotorista
  salvando: boolean
  onChange: (form: FormMotorista) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalMotorista({ aberto, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormMotorista>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-motorista-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-motorista-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo motorista</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
              <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">CPF *</label>
              <input type="text" value={form.cpf} onChange={(e) => set({ cpf: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
              <input type="text" value={form.telefone} onChange={(e) => set({ telefone: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">CNH número *</label>
              <input type="text" value={form.cnh_numero} onChange={(e) => set({ cnh_numero: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria *</label>
              <select value={form.cnh_categoria} onChange={(e) => set({ cnh_categoria: e.target.value })} className={`${INPUT_CLS} w-full`}>
                {['B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">CNH validade *</label>
              <input type="date" value={form.cnh_validade} onChange={(e) => set({ cnh_validade: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Curso transp. escolar (validade)</label>
              <input type="date" value={form.curso_escolar_validade} onChange={(e) => set({ curso_escolar_validade: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vínculo</label>
              <select value={form.vinculo} onChange={(e) => set({ vinculo: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="concursado">Concursado</option>
                <option value="contrato">Contrato</option>
                <option value="terceirizado">Terceirizado</option>
                <option value="rpa">RPA</option>
              </select>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
