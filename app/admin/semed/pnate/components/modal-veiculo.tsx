'use client'

import { Save } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
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
  const set = (patch: Partial<FormVeiculo>) => onChange({ ...form, ...patch })

  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo="Novo veículo" largura="2xl">
      <div className="space-y-3">
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
        <ModalFooter
          onFechar={onFechar}
          onSalvar={onSalvar}
          salvando={salvando}
          variantePrimaria="cyan"
          iconePrimario={<Save className="w-4 h-4" />}
        />
      </div>
    </ModalBase>
  )
}
