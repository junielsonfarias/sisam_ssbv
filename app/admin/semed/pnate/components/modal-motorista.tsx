'use client'

import { Save } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
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
  const set = (patch: Partial<FormMotorista>) => onChange({ ...form, ...patch })

  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo="Novo motorista" largura="xl">
      <div className="space-y-3">
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
