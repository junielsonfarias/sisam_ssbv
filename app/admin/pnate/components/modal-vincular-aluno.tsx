'use client'

import { AlertCircle, UserPlus } from 'lucide-react'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { AlunoBuscaPnate, INPUT_CLS, RotaResumo, TipoUso } from './types'
import { BuscadorAluno } from './buscador-aluno'

interface Props {
  rota: RotaResumo | null
  alunoSelecionado: AlunoBuscaPnate | null
  tipoUso: TipoUso
  vigenciaInicio: string
  salvando: boolean
  onChangeAluno: (a: AlunoBuscaPnate | null) => void
  onChangeTipoUso: (t: TipoUso) => void
  onChangeVigencia: (v: string) => void
  onFechar: () => void
  onVincular: () => void
}

export function ModalVincularAluno({
  rota, alunoSelecionado, tipoUso, vigenciaInicio, salvando,
  onChangeAluno, onChangeTipoUso, onChangeVigencia, onFechar, onVincular,
}: Props) {
  return (
    <ModalBase aberto={!!rota} onFechar={onFechar} titulo="Vincular aluno à rota" largura="lg">
      <div className="space-y-3">
        {rota && (
          <p className="text-xs text-gray-500 -mt-1">{rota.codigo} — {rota.descricao}</p>
        )}

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Aluno *</label>
          <BuscadorAluno selecionado={alunoSelecionado} onSelecionar={onChangeAluno} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de uso *</label>
            <select value={tipoUso} onChange={(e) => onChangeTipoUso(e.target.value as TipoUso)} className={`${INPUT_CLS} w-full`}>
              <option value="ida_volta">Ida e volta</option>
              <option value="ida">Apenas ida</option>
              <option value="volta">Apenas volta</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Vigência a partir de</label>
            <input type="date" value={vigenciaInicio} onChange={(e) => onChangeVigencia(e.target.value)} className={`${INPUT_CLS} w-full`} />
          </div>
        </div>

        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Se aluno já estava vinculado à mesma rota, dados são atualizados
        </p>

        <ModalFooter
          onFechar={onFechar}
          onSalvar={onVincular}
          salvando={salvando}
          desabilitado={!alunoSelecionado}
          variantePrimaria="cyan"
          textoSalvar="Vincular"
          iconePrimario={<UserPlus className="w-4 h-4" />}
        />
      </div>
    </ModalBase>
  )
}
