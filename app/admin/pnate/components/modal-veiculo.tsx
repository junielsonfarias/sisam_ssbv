'use client'

import { Loader2, Save, X } from 'lucide-react'
import { FormVeiculo, INPUT_CLS, TIPOS_VEICULO } from './types'

interface Props {
  aberto: boolean
  form: FormVeiculo
  salvando: boolean
  onChange: (form: FormVeiculo) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalVeiculo({ aberto, form, salvando, onChange, onFechar, onSalvar }: Props) {
  if (!aberto) return null
  const set = (patch: Partial<FormVeiculo>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-veiculo-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-veiculo-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo veículo</h2>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Placa *</label>
              <input type="text" value={form.placa} onChange={(e) => set({ placa: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
              <select value={form.tipo} onChange={(e) => set({ tipo: e.target.value })} className={`${INPUT_CLS} w-full`}>
                {TIPOS_VEICULO.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Marca</label>
              <input type="text" value={form.marca} onChange={(e) => set({ marca: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Modelo</label>
              <input type="text" value={form.modelo} onChange={(e) => set({ modelo: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Ano fabricação</label>
              <input type="number" min={1980} value={form.ano_fabricacao} onChange={(e) => set({ ano_fabricacao: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Capacidade *</label>
              <input type="number" min={1} value={form.capacidade} onChange={(e) => set({ capacidade: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vínculo</label>
              <select value={form.vinculo} onChange={(e) => set({ vinculo: e.target.value })} className={`${INPUT_CLS} w-full`}>
                <option value="proprio">Próprio</option>
                <option value="terceirizado">Terceirizado</option>
                <option value="conveniado">Conveniado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Combustível</label>
              <input type="text" value={form.combustivel} onChange={(e) => set({ combustivel: e.target.value })} placeholder="Diesel, Gasolina..." className={`${INPUT_CLS} w-full`} />
            </div>
            {form.vinculo === 'terceirizado' && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Empresa terceirizada</label>
                <input type="text" value={form.empresa_terceirizada} onChange={(e) => set({ empresa_terceirizada: e.target.value })} className={`${INPUT_CLS} w-full`} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vistoria — data</label>
              <input type="date" value={form.vistoria_data} onChange={(e) => set({ vistoria_data: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vistoria — validade</label>
              <input type="date" value={form.vistoria_validade} onChange={(e) => set({ vistoria_validade: e.target.value })} className={`${INPUT_CLS} w-full`} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.acessivel_pcd} onChange={(e) => set({ acessivel_pcd: e.target.checked })} className="rounded text-cyan-600 focus:ring-cyan-500" />
            <span className="text-gray-700 dark:text-gray-200">Acessível para PCD</span>
          </label>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={2} className={`${INPUT_CLS} w-full`} />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
