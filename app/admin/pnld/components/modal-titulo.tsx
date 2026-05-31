'use client'

import { Save } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { FormTitulo, INPUT_CLS, TIPOS_OBRA } from './types'

interface Props {
  aberto: boolean
  form: FormTitulo
  salvando: boolean
  onChange: (form: FormTitulo) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalTitulo({ aberto, form, salvando, onChange, onFechar, onSalvar }: Props) {
  const set = (patch: Partial<FormTitulo>) => onChange({ ...form, ...patch })

  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo="Novo título PNLD" largura="2xl">
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
            <input type="text" value={form.titulo} onChange={(e) => set({ titulo: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
            <select value={form.tipo_obra} onChange={(e) => set({ tipo_obra: e.target.value })} className={`${INPUT_CLS} w-full`}>
              {TIPOS_OBRA.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ano PNLD *</label>
            <input type="number" min={2000} max={2100} value={form.ano_pnld} onChange={(e) => set({ ano_pnld: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Autor</label>
            <input type="text" value={form.autor} onChange={(e) => set({ autor: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Editora</label>
            <input type="text" value={form.editora} onChange={(e) => set({ editora: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">ISBN</label>
            <input type="text" value={form.isbn} onChange={(e) => set({ isbn: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Código PNLD</label>
            <input type="text" value={form.codigo_pnld} onChange={(e) => set({ codigo_pnld: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Edição</label>
            <input type="text" value={form.edicao} onChange={(e) => set({ edicao: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ano escolar (1-9)</label>
            <input type="number" min={1} max={9} value={form.ano_escolar} onChange={(e) => set({ ano_escolar: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Componente (código BNCC)</label>
            <input type="text" value={form.componente_id} onChange={(e) => set({ componente_id: e.target.value })} placeholder="LP, MA, CN..." className={`${INPUT_CLS} w-full`} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} rows={2} className={`${INPUT_CLS} w-full`} />
          </div>
        </div>
        <ModalFooter
          onFechar={onFechar}
          onSalvar={onSalvar}
          salvando={salvando}
          variantePrimaria="teal"
          iconePrimario={<Save className="w-4 h-4" />}
        />
      </div>
    </ModalBase>
  )
}
