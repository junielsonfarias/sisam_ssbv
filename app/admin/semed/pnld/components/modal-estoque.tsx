'use client'

import { Save } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { Escola, FormEstoque, INPUT_CLS, Titulo } from './types'

interface Props {
  aberto: boolean
  escolas: Escola[]
  titulos: Titulo[]
  form: FormEstoque
  salvando: boolean
  onChange: (form: FormEstoque) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalEstoque({ aberto, escolas, titulos, form, salvando, onChange, onFechar, onSalvar }: Props) {
  const set = (patch: Partial<FormEstoque>) => onChange({ ...form, ...patch })

  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo="Atualizar estoque" largura="lg">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
          <select value={form.escola_id} onChange={(e) => set({ escola_id: e.target.value })} className={`${INPUT_CLS} w-full`}>
            <option value="">Selecione</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
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
            <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd total *</label>
            <input type="number" min={0} value={form.qtd_total} onChange={(e) => set({ qtd_total: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd disponível</label>
            <input type="number" min={0} value={form.qtd_disponivel} onChange={(e) => set({ qtd_disponivel: e.target.value })} placeholder="igual ao total" className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd danificada</label>
            <input type="number" min={0} value={form.qtd_danificada} onChange={(e) => set({ qtd_danificada: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd extraviada</label>
            <input type="number" min={0} value={form.qtd_extraviada} onChange={(e) => set({ qtd_extraviada: e.target.value })} className={`${INPUT_CLS} w-full`} />
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
