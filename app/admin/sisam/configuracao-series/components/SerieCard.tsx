import { Settings, Save, Trash2, BookOpen } from 'lucide-react'
import { ConfiguracaoSerie, Disciplina, RegrasAprovacao, getTipoEnsinoColor, getDisciplinaColor } from '../types'
import DisciplinasEditor from './DisciplinasEditor'
import RegrasAprovacaoSection from './RegrasAprovacaoSection'

interface SerieCardProps {
  config: ConfiguracaoSerie
  estaEditando: boolean
  disciplinasEditando: Disciplina[]
  salvando: string | null
  regras: RegrasAprovacao | undefined
  salvandoRegras: string | null
  onEditarDisciplinas: (config: ConfiguracaoSerie) => void
  onSalvarDisciplinas: (serieId: string) => void
  onCancelarEdicao: () => void
  onAtualizarTipoEnsino: (serieId: string, tipoEnsino: string) => void
  onConfirmarExclusao: (config: ConfiguracaoSerie) => void
  onAdicionarDisciplina: (isNewSerie: boolean) => void
  onRemoverDisciplina: (index: number, isNewSerie: boolean) => void
  onMoverDisciplina: (index: number, direcao: 'up' | 'down', isNewSerie: boolean) => void
  onAtualizarDisciplina: (index: number, campo: keyof Disciplina, valor: any, isNewSerie: boolean) => void
  onAtualizarRegra: (serieId: string, campo: keyof RegrasAprovacao, valor: any) => void
  onSalvarRegras: (serieId: string) => void
}

export default function SerieCard({
  config,
  estaEditando,
  disciplinasEditando,
  salvando,
  regras,
  salvandoRegras,
  onEditarDisciplinas,
  onSalvarDisciplinas,
  onCancelarEdicao,
  onAtualizarTipoEnsino,
  onConfirmarExclusao,
  onAdicionarDisciplina,
  onRemoverDisciplina,
  onMoverDisciplina,
  onAtualizarDisciplina,
  onAtualizarRegra,
  onSalvarRegras,
}: SerieCardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 transition-all ${
        estaEditando ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' : 'border-gray-200 dark:border-slate-700'
      }`}
    >
      {/* Cabeçalho do Card */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 px-6 py-4 border-b border-indigo-200 dark:border-indigo-800 rounded-t-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
              {config.serie}º
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{config.nome_serie}</h3>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={config.tipo_ensino || 'anos_iniciais'}
                  onChange={(e) => onAtualizarTipoEnsino(config.id, e.target.value)}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTipoEnsinoColor(config.tipo_ensino || 'anos_iniciais')} bg-transparent cursor-pointer`}
                >
                  <option value="anos_iniciais">Anos Iniciais</option>
                  <option value="anos_finais">Anos Finais</option>
                </select>
                {config.tem_producao_textual && (
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                    + Produção Textual
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {config.disciplinas?.reduce((sum, d) => sum + d.qtd_questoes, 0) || config.total_questoes_objetivas}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">questões objetivas</p>
            </div>
            <button
              onClick={() => onConfirmarExclusao(config)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Excluir série"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Corpo do Card */}
      <div className="p-6">
        {estaEditando ? (
          <>
            <DisciplinasEditor
              disciplinas={disciplinasEditando}
              onAdicionarDisciplina={onAdicionarDisciplina}
              onRemoverDisciplina={onRemoverDisciplina}
              onMoverDisciplina={onMoverDisciplina}
              onAtualizarDisciplina={onAtualizarDisciplina}
            />

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={onCancelarEdicao}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => onSalvarDisciplinas(config.id)}
                disabled={salvando === config.id}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {salvando === config.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Disciplinas
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Visualização das Disciplinas */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Mapeamento de Questões
              </h4>

              {config.disciplinas && config.disciplinas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {config.disciplinas.map((disc: Disciplina, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border-2 ${getDisciplinaColor(disc.sigla)} dark:bg-slate-700 dark:border-slate-600`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-xs font-bold">
                          {disc.ordem}º
                        </span>
                        <span className="font-semibold">{disc.sigla}</span>
                      </div>
                      <p className="text-sm">{disc.disciplina}</p>
                      <div className="mt-2 text-xs space-y-1 opacity-75">
                        <p>Questões: <span className="font-mono font-bold">Q{disc.questao_inicio}-Q{disc.questao_fim}</span></p>
                        <p>Total: <span className="font-bold">{disc.qtd_questoes}</span> | Valor: <span className="font-bold">{disc.valor_questao}</span>/questão</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma disciplina configurada</p>
                </div>
              )}
            </div>

            {/* Regras de Aprovação */}
            {regras && (
              <RegrasAprovacaoSection
                config={config}
                regras={regras}
                salvandoRegras={salvandoRegras}
                onAtualizarRegra={onAtualizarRegra}
                onSalvarRegras={onSalvarRegras}
              />
            )}

            {/* Botão Editar */}
            <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => onEditarDisciplinas(config)}
                className="flex items-center gap-2 px-4 py-2 border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Editar Disciplinas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
