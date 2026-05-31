'use client'

import { AlertCircle, Loader2, UserPlus, X } from 'lucide-react'
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
  if (!rota) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-vincular-titulo">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 id="modal-vincular-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-200">Vincular aluno à rota</h2>
            <p className="text-xs text-gray-500">{rota.codigo} — {rota.descricao}</p>
          </div>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
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
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
          <button onClick={onVincular} disabled={salvando || !alunoSelecionado} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Vincular
          </button>
        </div>
      </div>
    </div>
  )
}
