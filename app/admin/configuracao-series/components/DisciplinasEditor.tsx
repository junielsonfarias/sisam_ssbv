import { BookOpen, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { Disciplina, DISCIPLINAS_DISPONIVEIS, getDisciplinaColor } from '../types'

interface DisciplinasEditorProps {
  disciplinas: Disciplina[]
  isNewSerie?: boolean
  onAdicionarDisciplina: (isNewSerie: boolean) => void
  onRemoverDisciplina: (index: number, isNewSerie: boolean) => void
  onMoverDisciplina: (index: number, direcao: 'up' | 'down', isNewSerie: boolean) => void
  onAtualizarDisciplina: (index: number, campo: keyof Disciplina, valor: any, isNewSerie: boolean) => void
}

export default function DisciplinasEditor({
  disciplinas,
  isNewSerie = false,
  onAdicionarDisciplina,
  onRemoverDisciplina,
  onMoverDisciplina,
  onAtualizarDisciplina,
}: DisciplinasEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Disciplinas e Mapeamento de Questões
        </h4>
        <button
          onClick={() => onAdicionarDisciplina(isNewSerie)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {disciplinas.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Nenhuma disciplina configurada</p>
          <button
            onClick={() => onAdicionarDisciplina(isNewSerie)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
          >
            Adicionar primeira disciplina
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {disciplinas.map((disc, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${getDisciplinaColor(disc.sigla)} dark:bg-slate-700 dark:border-slate-600`}
            >
              <div className="flex items-start gap-3">
                {/* Ordem e Controles */}
                <div className="flex flex-col items-center gap-1">
                  <span className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-current flex items-center justify-center font-bold text-sm">
                    {disc.ordem}º
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => onMoverDisciplina(index, 'up', isNewSerie)}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-white/50 rounded disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onMoverDisciplina(index, 'down', isNewSerie)}
                      disabled={index === disciplinas.length - 1}
                      className="p-0.5 hover:bg-white/50 rounded disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campos */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Disciplina */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Disciplina</label>
                    <select
                      value={disc.sigla}
                      onChange={(e) => onAtualizarDisciplina(index, 'sigla', e.target.value, isNewSerie)}
                      className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                    >
                      <option value="">Selecione...</option>
                      {DISCIPLINAS_DISPONIVEIS.map(d => (
                        <option key={d.sigla} value={d.sigla}>{d.nome} ({d.sigla})</option>
                      ))}
                    </select>
                  </div>

                  {/* Questões */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Qtd. Questões</label>
                    <input
                      type="number"
                      min="1"
                      value={disc.qtd_questoes}
                      onChange={(e) => onAtualizarDisciplina(index, 'qtd_questoes', parseInt(e.target.value) || 1, isNewSerie)}
                      className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                    />
                  </div>

                  {/* Intervalo */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Intervalo</label>
                    <div className="px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border rounded font-mono">
                      Q{disc.questao_inicio} a Q{disc.questao_fim}
                    </div>
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-xs font-medium mb-1 opacity-75">Valor/Questão</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={disc.valor_questao}
                      onChange={(e) => onAtualizarDisciplina(index, 'valor_questao', parseFloat(e.target.value) || 0.5, isNewSerie)}
                      className="w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                    />
                  </div>
                </div>

                {/* Remover */}
                <button
                  onClick={() => onRemoverDisciplina(index, isNewSerie)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Resumo */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total de questões:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {disciplinas.reduce((sum, d) => sum + d.qtd_questoes, 0)} questões
                (Q1 a Q{disciplinas.length > 0 ? disciplinas[disciplinas.length - 1].questao_fim : 0})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
