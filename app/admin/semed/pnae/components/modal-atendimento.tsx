'use client'

import { CheckCircle } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
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
  const set = (patch: Partial<FormAtendimento>) => onChange({ ...form, ...patch })

  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo="Registrar atendimento diário" largura="lg">
      <div className="space-y-3">
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
        <ModalFooter
          onFechar={onFechar}
          onSalvar={onSalvar}
          salvando={salvando}
          variantePrimaria="green"
          textoSalvar="Registrar"
          iconePrimario={<CheckCircle className="w-4 h-4" />}
        />
      </div>
    </ModalBase>
  )
}
