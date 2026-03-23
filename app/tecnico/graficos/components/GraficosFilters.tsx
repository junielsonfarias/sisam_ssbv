'use client'

import { Filter } from 'lucide-react'
import { FiltrosGraficos } from './constants'

interface GraficosFiltersProps {
  tipoUsuario: string
  tipoVisualizacao: string
  setTipoVisualizacao: (v: string) => void
  filtros: FiltrosGraficos
  handleFiltroChange: (campo: keyof FiltrosGraficos, valor: string) => void
  polos: any[]
  escolas: any[]
  turmas: any[]
  series: string[]
  disciplinasDisponiveis: { value: string; label: string }[]
  carregando: boolean
  dados: any
  handleBuscarGraficos: () => void
}

export default function GraficosFilters({
  tipoUsuario,
  tipoVisualizacao,
  setTipoVisualizacao,
  filtros,
  handleFiltroChange,
  polos,
  escolas,
  turmas,
  series,
  disciplinasDisponiveis,
  carregando,
  dados,
  handleBuscarGraficos,
}: GraficosFiltersProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-3 sm:p-4 md:p-6">
      <div className="flex items-center mb-3 sm:mb-4">
        <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-white">Filtros</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Tipo de Visualização
          </label>
          <select
            value={tipoVisualizacao}
            onChange={(e) => setTipoVisualizacao(e.target.value)}
            className="select-custom w-full text-sm sm:text-base"
          >
            <option value="geral">Visão Geral</option>
            <option value="disciplinas">Por Disciplina</option>
            <option value="escolas">Por Escola</option>
            <option value="series">Por Série</option>
            <option value="polos">Por Polo</option>
            <option value="distribuicao">Distribuição de Notas</option>
            <option value="presenca">Presença/Falta</option>
            <option value="comparativo_escolas">Comparativo Detalhado</option>
            <option value="acertos_erros">Acertos e Erros</option>
            <option value="questoes">Taxa de Acerto por Questão</option>
            <option value="heatmap">Heatmap de Desempenho</option>
            <option value="radar">Perfil de Desempenho (Radar)</option>
            <option value="boxplot">Distribuição Detalhada (Box Plot)</option>
            <option value="correlacao">Correlação entre Disciplinas</option>
            <option value="ranking">Ranking Interativo</option>
            <option value="aprovacao">Taxa de Aprovação</option>
            <option value="gaps">Análise de Gaps</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Ano Letivo
          </label>
          <input
            type="text"
            value={filtros.ano_letivo || ''}
            onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400"
            placeholder="Ex: 2025"
          />
        </div>

        {(tipoUsuario === 'admin' || tipoUsuario === 'administrador' || tipoUsuario === 'tecnico') && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Polo
            </label>
            <select
              value={filtros.polo_id || ''}
              onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
              className="select-custom w-full text-sm sm:text-base"
            >
              <option value="">Todos</option>
              {polos.map((polo) => (
                <option key={polo.id} value={polo.id}>
                  {polo.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {(tipoUsuario === 'admin' || tipoUsuario === 'administrador' || tipoUsuario === 'tecnico' || tipoUsuario === 'polo') && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Escola
            </label>
            <select
              value={filtros.escola_id || ''}
              onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
              className="select-custom w-full text-sm sm:text-base"
            >
              <option value="">Todas</option>
              {escolas
                .filter((e) => !filtros.polo_id || e.polo_id === filtros.polo_id)
                .map((escola) => (
                  <option key={escola.id} value={escola.id}>
                    {escola.nome}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Série
          </label>
          <select
            value={filtros.serie || ''}
            onChange={(e) => handleFiltroChange('serie', e.target.value)}
            className="select-custom w-full text-sm sm:text-base"
          >
            <option value="">Todas</option>
            {series.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Disciplina
          </label>
          <select
            value={filtros.disciplina || ''}
            onChange={(e) => handleFiltroChange('disciplina', e.target.value)}
            className="select-custom w-full text-sm sm:text-base"
          >
            <option value="">Todas</option>
            {disciplinasDisponiveis.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {filtros.escola_id && filtros.escola_id !== '' && filtros.escola_id !== 'undefined' && filtros.escola_id.toLowerCase() !== 'todas' && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Turma
            </label>
            <select
              value={filtros.turma_id || ''}
              onChange={(e) => handleFiltroChange('turma_id', e.target.value)}
              className="select-custom w-full text-sm sm:text-base"
              disabled={turmas.length === 0}
            >
              <option value="">Todas</option>
              {turmas.length > 0 ? (
                turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo || t.nome || `Turma ${t.id}`}
                  </option>
                ))
              ) : (
                <option value="" disabled>Nenhuma turma encontrada</option>
              )}
            </select>
            {turmas.length === 0 && filtros.escola_id && (
              <p className="text-xs text-gray-500 mt-1">
                Nenhuma turma encontrada para esta escola{filtros.ano_letivo ? ` no ano ${filtros.ano_letivo}` : ''}{filtros.serie ? ` e série ${filtros.serie}` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleBuscarGraficos}
          disabled={carregando}
          className="bg-indigo-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
        >
          {carregando ? 'Carregando...' : 'Gerar Gráficos'}
        </button>

        {dados && (
          <button
            onClick={() => {
              window.print()
            }}
            className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
          >
            📄 Imprimir/Exportar
          </button>
        )}
      </div>
    </div>
  )
}
