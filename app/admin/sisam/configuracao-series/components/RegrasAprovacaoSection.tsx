import { Save, AlertTriangle } from 'lucide-react'
import { ConfiguracaoSerie, RegrasAprovacao } from '../types'

interface RegrasAprovacaoSectionProps {
  config: ConfiguracaoSerie
  regras: RegrasAprovacao
  salvandoRegras: string | null
  onAtualizarRegra: (serieId: string, campo: keyof RegrasAprovacao, valor: any) => void
  onSalvarRegras: (serieId: string) => void
}

export default function RegrasAprovacaoSection({
  config,
  regras,
  salvandoRegras,
  onAtualizarRegra,
  onSalvarRegras,
}: RegrasAprovacaoSectionProps) {
  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Regras de Aprovação
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Média para Aprovação</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={regras.media_aprovacao}
            onChange={(e) => onAtualizarRegra(config.id, 'media_aprovacao', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Média para Recuperação</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={regras.media_recuperacao}
            onChange={(e) => onAtualizarRegra(config.id, 'media_recuperacao', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nota Máxima</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={regras.nota_maxima}
            onChange={(e) => onAtualizarRegra(config.id, 'nota_maxima', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Máx. Dependências
            {config.tipo_ensino === 'anos_iniciais' && (
              <span className="text-xs text-gray-400 ml-1">(N/A para anos iniciais)</span>
            )}
          </label>
          <input
            type="number"
            min="0"
            max="10"
            value={regras.max_dependencias}
            onChange={(e) => onAtualizarRegra(config.id, 'max_dependencias', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
          />
          <p className="text-xs text-gray-400 mt-1">Apenas para 6º ao 9º ano</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fórmula da Nota Final</label>
          <select
            value={regras.formula_nota_final}
            onChange={(e) => onAtualizarRegra(config.id, 'formula_nota_final', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="media_aritmetica">Média Aritmética</option>
            <option value="media_ponderada">Média Ponderada</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={() => onSalvarRegras(config.id)}
          disabled={salvandoRegras === config.id}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm"
        >
          {salvandoRegras === config.id ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Regras
            </>
          )}
        </button>
      </div>
    </div>
  )
}
