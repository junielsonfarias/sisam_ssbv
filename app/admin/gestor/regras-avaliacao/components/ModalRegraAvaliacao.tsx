import { Save, X } from 'lucide-react'
import { TipoAvaliacao, RegraAvaliacao } from './types'

export interface FormRegra {
  nome: string
  descricao: string
  tipo_avaliacao_id: string
  tipo_periodo: string
  qtd_periodos: number
  media_aprovacao: number
  media_recuperacao: number
  nota_maxima: number
  permite_recuperacao: boolean
  recuperacao_por_periodo: boolean
  max_dependencias: number
  formula_media: string
  arredondamento: string
  casas_decimais: number
  aprovacao_automatica: boolean
}

interface ModalRegraAvaliacaoProps {
  regraEditando: RegraAvaliacao | null
  formRegra: FormRegra
  setFormRegra: React.Dispatch<React.SetStateAction<FormRegra>>
  salvandoRegra: boolean
  salvarRegra: () => void
  fechar: () => void
  tipos: TipoAvaliacao[]
  handleTipoPeriodoChange: (valor: string) => void
}

export function ModalRegraAvaliacao({
  regraEditando,
  formRegra,
  setFormRegra,
  salvandoRegra,
  salvarRegra,
  fechar,
  tipos,
  handleTipoPeriodoChange,
}: ModalRegraAvaliacaoProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            {regraEditando ? 'Editar Regra de Avaliacao' : 'Nova Regra de Avaliacao'}
          </h2>
          <button onClick={fechar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nome *</label>
            <input
              type="text"
              value={formRegra.nome}
              onChange={e => setFormRegra(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              placeholder="Ex: Nota Bimestral (6o ao 9o Ano)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descricao</label>
            <textarea
              value={formRegra.descricao}
              onChange={e => setFormRegra(prev => ({ ...prev, descricao: e.target.value }))}
              rows={2}
              className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo de Avaliacao *</label>
              <select
                value={formRegra.tipo_avaliacao_id}
                onChange={e => setFormRegra(prev => ({ ...prev, tipo_avaliacao_id: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Selecione...</option>
                {tipos.filter(t => t.ativo).map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Periodo</label>
              <select
                value={formRegra.tipo_periodo}
                onChange={e => handleTipoPeriodoChange(e.target.value)}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="anual">Anual (1 periodo)</option>
                <option value="semestral">Semestral (2 periodos)</option>
                <option value="trimestral">Trimestral (3 periodos)</option>
                <option value="bimestral">Bimestral (4 periodos)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Media Aprovacao</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formRegra.media_aprovacao}
                onChange={e => setFormRegra(prev => ({ ...prev, media_aprovacao: parseFloat(e.target.value) || 0 }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Media Recuperacao</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formRegra.media_recuperacao}
                onChange={e => setFormRegra(prev => ({ ...prev, media_recuperacao: parseFloat(e.target.value) || 0 }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nota Maxima</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formRegra.nota_maxima}
                onChange={e => setFormRegra(prev => ({ ...prev, nota_maxima: parseFloat(e.target.value) || 0 }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Formula da Media</label>
              <select
                value={formRegra.formula_media}
                onChange={e => setFormRegra(prev => ({ ...prev, formula_media: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="media_aritmetica">Media Aritmetica</option>
                <option value="media_ponderada">Media Ponderada</option>
                <option value="maior_nota">Maior Nota</option>
                <option value="soma_dividida">Soma Dividida</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Arredondamento</label>
              <select
                value={formRegra.arredondamento}
                onChange={e => setFormRegra(prev => ({ ...prev, arredondamento: e.target.value }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="normal">Normal</option>
                <option value="cima">Para Cima</option>
                <option value="baixo">Para Baixo</option>
                <option value="nenhum">Nenhum</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Max. Dependencias</label>
              <input
                type="number"
                min="0"
                max="10"
                value={formRegra.max_dependencias}
                onChange={e => setFormRegra(prev => ({ ...prev, max_dependencias: parseInt(e.target.value) || 0 }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Casas Decimais</label>
              <input
                type="number"
                min="0"
                max="3"
                value={formRegra.casas_decimais}
                onChange={e => setFormRegra(prev => ({ ...prev, casas_decimais: parseInt(e.target.value) || 0 }))}
                className="w-full border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formRegra.permite_recuperacao}
                onChange={e => setFormRegra(prev => ({ ...prev, permite_recuperacao: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              Permite Recuperacao
            </label>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formRegra.recuperacao_por_periodo}
                onChange={e => setFormRegra(prev => ({ ...prev, recuperacao_por_periodo: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              Recuperacao por Periodo
            </label>
            <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formRegra.aprovacao_automatica}
                onChange={e => setFormRegra(prev => ({ ...prev, aprovacao_automatica: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              Aprovacao Automatica
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
          <button
            onClick={fechar}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvarRegra}
            disabled={salvandoRegra}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {salvandoRegra ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
