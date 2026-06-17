'use client'

import { AlertCircle, ArrowDownToLine } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { AlunoBusca, FormEntrega, INPUT_CLS, Titulo } from './types'
import { BuscadorAluno } from './buscador-aluno'

interface Props {
  aberto: boolean
  titulos: Titulo[]
  form: FormEntrega
  alunoSelecionado: AlunoBusca | null
  salvando: boolean
  onChange: (form: FormEntrega) => void
  onChangeAluno: (a: AlunoBusca | null) => void
  onFechar: () => void
  onSalvar: () => void
}

export function ModalEntrega({
  aberto, titulos, form, alunoSelecionado, salvando,
  onChange, onChangeAluno, onFechar, onSalvar,
}: Props) {
  const set = (patch: Partial<FormEntrega>) => onChange({ ...form, ...patch })

  return (
    <ModalBase aberto={aberto} onFechar={onFechar} titulo="Entrega ao aluno" largura="md">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Aluno *</label>
          <BuscadorAluno selecionado={alunoSelecionado} onSelecionar={onChangeAluno} />
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
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nº tombamento</label>
            <input type="text" value={form.numero_tombamento} onChange={(e) => set({ numero_tombamento: e.target.value })} className={`${INPUT_CLS} w-full`} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Data devolução prevista</label>
          <input
            type="date"
            value={form.data_devolucao_prevista}
            onChange={(e) => set({ data_devolucao_prevista: e.target.value })}
            className={`${INPUT_CLS} w-full`}
          />
        </div>
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Estoque é decrementado automaticamente
        </p>
        <ModalFooter
          onFechar={onFechar}
          onSalvar={onSalvar}
          salvando={salvando}
          variantePrimaria="teal"
          textoSalvar="Entregar"
          iconePrimario={<ArrowDownToLine className="w-4 h-4" />}
        />
      </div>
    </ModalBase>
  )
}
