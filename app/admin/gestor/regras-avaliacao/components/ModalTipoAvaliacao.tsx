import { Save, X } from 'lucide-react'
import { TipoAvaliacao, ConceitoEscala } from './types'

export interface FormTipo {
  codigo: string
  nome: string
  descricao: string
  tipo_resultado: string
  nota_minima: number
  nota_maxima: number
  permite_decimal: boolean
  escala_conceitos: ConceitoEscala[]
}

interface ModalTipoAvaliacaoProps {
  tipoEditando: TipoAvaliacao | null
  formTipo: FormTipo
  setFormTipo: React.Dispatch<React.SetStateAction<FormTipo>>
  salvandoTipo: boolean
  salvarTipo: () => void
  fechar: () => void
  adicionarConceito: () => void
  removerConceito: (idx: number) => void
  atualizarConceito: (idx: number, campo: string, valor: any) => void
}

export function ModalTipoAvaliacao({
  tipoEditando,
  formTipo,
  setFormTipo,
  salvandoTipo,
  salvarTipo,
  fechar,
  adicionarConceito,
  removerConceito,
  atualizarConceito,
}: ModalTipoAvaliacaoProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            {tipoEditando ? 'Editar Tipo de Avaliacao' : 'Novo Tipo de Avaliacao'}
          </h2>
          <button onClick={fechar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Codigo *</label>
              <input
                type="text"
                value={formTipo.codigo}
                onChange={e => setFormTipo(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                placeholder="Ex: NUMERICO_10"
                disabled={!!tipoEditando}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo Resultado *</label>
              <select
                value={formTipo.tipo_resultado}
                onChange={e => setFormTipo(prev => ({ ...prev, tipo_resultado: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="numerico">Numerico</option>
                <option value="conceito">Conceito</option>
                <option value="parecer">Parecer</option>
                <option value="misto">Misto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nome *</label>
            <input
              type="text"
              value={formTipo.nome}
              onChange={e => setFormTipo(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              placeholder="Nome do tipo"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descricao</label>
            <textarea
              value={formTipo.descricao}
              onChange={e => setFormTipo(prev => ({ ...prev, descricao: e.target.value }))}
              rows={2}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {(formTipo.tipo_resultado === 'numerico' || formTipo.tipo_resultado === 'misto') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nota Minima</label>
                <input
                  type="number"
                  value={formTipo.nota_minima}
                  onChange={e => setFormTipo(prev => ({ ...prev, nota_minima: parseFloat(e.target.value) || 0 }))}
                  className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nota Maxima</label>
                <input
                  type="number"
                  value={formTipo.nota_maxima}
                  onChange={e => setFormTipo(prev => ({ ...prev, nota_maxima: parseFloat(e.target.value) || 10 }))}
                  className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTipo.permite_decimal}
                    onChange={e => setFormTipo(prev => ({ ...prev, permite_decimal: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  Decimais
                </label>
              </div>
            </div>
          )}

          {formTipo.tipo_resultado === 'conceito' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Escala de Conceitos</label>
                <button
                  onClick={adicionarConceito}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  + Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {formTipo.escala_conceitos.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={c.codigo}
                      onChange={e => atualizarConceito(idx, 'codigo', e.target.value.toUpperCase())}
                      className="w-16 border dark:border-slate-600 rounded px-2 py-1.5 text-xs text-center dark:bg-slate-700 dark:text-white"
                      placeholder="Cod"
                    />
                    <input
                      type="text"
                      value={c.nome}
                      onChange={e => atualizarConceito(idx, 'nome', e.target.value)}
                      className="flex-1 border dark:border-slate-600 rounded px-2 py-1.5 text-xs dark:bg-slate-700 dark:text-white"
                      placeholder="Nome do conceito"
                    />
                    <input
                      type="number"
                      value={c.valor_numerico}
                      onChange={e => atualizarConceito(idx, 'valor_numerico', e.target.value)}
                      className="w-16 border dark:border-slate-600 rounded px-2 py-1.5 text-xs text-center dark:bg-slate-700 dark:text-white"
                      placeholder="Valor"
                    />
                    <button
                      onClick={() => removerConceito(idx)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
          <button
            onClick={fechar}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvarTipo}
            disabled={salvandoTipo}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {salvandoTipo ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
