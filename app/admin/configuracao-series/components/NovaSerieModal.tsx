import { X, Plus } from 'lucide-react'
import { Disciplina } from '../types'
import DisciplinasEditor from './DisciplinasEditor'

interface NovaSerieData {
  serie: string
  nome_serie: string
  tipo_ensino: 'anos_iniciais' | 'anos_finais'
  tem_producao_textual: boolean
  qtd_itens_producao: number
  usa_nivel_aprendizagem: boolean
  disciplinas: Disciplina[]
}

interface NovaSerieModalProps {
  novaSerieData: NovaSerieData
  salvando: string | null
  onFechar: () => void
  onCriar: () => void
  onAtualizarDados: (dados: NovaSerieData) => void
  onAdicionarDisciplina: (isNewSerie: boolean) => void
  onRemoverDisciplina: (index: number, isNewSerie: boolean) => void
  onMoverDisciplina: (index: number, direcao: 'up' | 'down', isNewSerie: boolean) => void
  onAtualizarDisciplina: (index: number, campo: keyof Disciplina, valor: any, isNewSerie: boolean) => void
}

export default function NovaSerieModal({
  novaSerieData,
  salvando,
  onFechar,
  onCriar,
  onAtualizarDados,
  onAdicionarDisciplina,
  onRemoverDisciplina,
  onMoverDisciplina,
  onAtualizarDisciplina,
}: NovaSerieModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-60" onClick={onFechar}></div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full relative z-10 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nova Configuração de Série</h3>
              <button onClick={onFechar} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número da Série *</label>
                <input
                  type="text"
                  value={novaSerieData.serie}
                  onChange={(e) => onAtualizarDados({ ...novaSerieData, serie: e.target.value.replace(/\D/g, '') })}
                  placeholder="Ex: 6"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Série *</label>
                <input
                  type="text"
                  value={novaSerieData.nome_serie}
                  onChange={(e) => onAtualizarDados({ ...novaSerieData, nome_serie: e.target.value })}
                  placeholder="Ex: 6º Ano"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Ensino *</label>
                <select
                  value={novaSerieData.tipo_ensino}
                  onChange={(e) => onAtualizarDados({ ...novaSerieData, tipo_ensino: e.target.value as 'anos_iniciais' | 'anos_finais' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="anos_iniciais">Anos Iniciais</option>
                  <option value="anos_finais">Anos Finais</option>
                </select>
              </div>
            </div>

            {/* Opções adicionais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Produção Textual</span>
                  {novaSerieData.tem_producao_textual && (
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-xs text-gray-500">Itens:</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={novaSerieData.qtd_itens_producao}
                        onChange={(e) => onAtualizarDados({ ...novaSerieData, qtd_itens_producao: parseInt(e.target.value) || 8 })}
                        className="w-16 px-2 py-2 text-center text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                      />
                    </div>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={novaSerieData.tem_producao_textual}
                  onChange={(e) => onAtualizarDados({
                    ...novaSerieData,
                    tem_producao_textual: e.target.checked,
                    qtd_itens_producao: e.target.checked ? 8 : 0
                  })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <span className="font-medium text-gray-700 dark:text-gray-300">Nível de Aprendizagem</span>
                <input
                  type="checkbox"
                  checked={novaSerieData.usa_nivel_aprendizagem}
                  onChange={(e) => onAtualizarDados({ ...novaSerieData, usa_nivel_aprendizagem: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
              </div>
            </div>

            {/* Editor de Disciplinas */}
            <DisciplinasEditor
              disciplinas={novaSerieData.disciplinas}
              isNewSerie={true}
              onAdicionarDisciplina={onAdicionarDisciplina}
              onRemoverDisciplina={onRemoverDisciplina}
              onMoverDisciplina={onMoverDisciplina}
              onAtualizarDisciplina={onAtualizarDisciplina}
            />
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={onFechar}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={onCriar}
              disabled={salvando === 'nova'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {salvando === 'nova' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Série
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
