'use client'

import { Save } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { FormNutricionista, INPUT_CLS } from './types'

interface Props {
  aberto: boolean
  form: FormNutricionista
  salvando: boolean
  onChange: (form: FormNutricionista) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalNutricionista({ aberto, form, salvando, onChange, onFechar, onSalvar }: Props) {
  const set = (patch: Partial<FormNutricionista>) => onChange({ ...form, ...patch })

  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo="Nova nutricionista" largura="lg">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
          <input type="text" value={form.nome} onChange={(e) => set({ nome: e.target.value })} className={`${INPUT_CLS} w-full`} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">CRN * (Conselho Regional de Nutricionistas)</label>
          <input type="text" value={form.crn} onChange={(e) => set({ crn: e.target.value })} placeholder="Ex: CRN-1 12345" className={`${INPUT_CLS} w-full`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
            <input type="text" value={form.telefone} onChange={(e) => set({ telefone: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">E-mail</label>
            <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm cursor-pointer p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
          <input
            type="checkbox"
            checked={form.responsavel_tecnico}
            onChange={(e) => set({ responsavel_tecnico: e.target.checked })}
            className="rounded text-green-600 mt-0.5"
          />
          <span>
            <span className="font-semibold text-gray-700 dark:text-gray-200">Responsável Técnico (RT) FNDE</span>
            <span className="block text-xs text-gray-500">
              Profissional responsável pelo PAE municipal (Resolução FNDE 06/2020)
            </span>
          </span>
        </label>
        <ModalFooter
          onFechar={onFechar}
          onSalvar={onSalvar}
          salvando={salvando}
          variantePrimaria="green"
          iconePrimario={<Save className="w-4 h-4" />}
        />
      </div>
    </ModalBase>
  )
}
