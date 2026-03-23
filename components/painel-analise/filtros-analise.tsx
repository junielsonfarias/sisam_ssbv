'use client'

import { Search, Filter, X } from 'lucide-react'
import { OpcaoSelect } from '@/lib/dados/types'
import { FiltrosAnalise, AvaliacaoOption } from './types'

interface FiltrosAnaliseComponentProps {
  filtros: FiltrosAnalise
  busca: string
  setBusca: (value: string) => void
  handleFiltroChange: (campo: keyof FiltrosAnalise, valor: string) => void
  limparFiltros: () => void
  temFiltrosAtivos: boolean
  carregando: boolean
  onBuscar: () => void
  onLimparBusca: () => void

  // Options
  polos: OpcaoSelect[]
  escolasFiltradas: OpcaoSelect[]
  turmas: OpcaoSelect[]
  series: string[]
  avaliacoesOpcoes: AvaliacaoOption[]

  // Visibility flags
  mostrarFiltroPolo: boolean
  mostrarFiltroEscola: boolean
  escolaIdFixo?: string
  poloIdFixo?: string
}

export default function FiltrosAnaliseComponent({
  filtros,
  busca,
  setBusca,
  handleFiltroChange,
  limparFiltros,
  temFiltrosAtivos,
  carregando,
  onBuscar,
  onLimparBusca,
  polos,
  escolasFiltradas,
  turmas,
  series,
  avaliacoesOpcoes,
  mostrarFiltroPolo,
  mostrarFiltroEscola,
  escolaIdFixo,
  poloIdFixo
}: FiltrosAnaliseComponentProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Filter className="w-5 h-5 mr-2 text-indigo-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Filtros</h2>
        </div>
        {temFiltrosAtivos && (
          <button
            onClick={limparFiltros}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-4">
        {mostrarFiltroPolo && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Polo
            </label>
            <select
              value={filtros.polo_id || ''}
              onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
              className="select-custom w-full"
              disabled={!!poloIdFixo}
            >
              <option value="">Todos os polos</option>
              {polos.map((polo) => (
                <option key={polo.id} value={polo.id}>
                  {polo.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {mostrarFiltroEscola && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Escola
            </label>
            <select
              value={filtros.escola_id || ''}
              onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
              className="select-custom w-full"
              disabled={!!escolaIdFixo}
            >
              <option value="">Todas as escolas</option>
              {escolasFiltradas.map((escola) => (
                <option key={escola.id} value={escola.id}>
                  {escola.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Ano Letivo
          </label>
          <input
            type="text"
            value={filtros.ano_letivo || ''}
            onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            placeholder="Ex: 2026"
          />
        </div>

        {avaliacoesOpcoes.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Avaliação
            </label>
            <select
              value={filtros.avaliacao_id || ''}
              onChange={(e) => handleFiltroChange('avaliacao_id', e.target.value)}
              className="select-custom w-full"
            >
              <option value="">Todas as avaliações</option>
              {avaliacoesOpcoes.map((av) => (
                <option key={av.id} value={av.id}>
                  {av.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Serie
          </label>
          <select
            value={filtros.serie || ''}
            onChange={(e) => handleFiltroChange('serie', e.target.value)}
            className="select-custom w-full"
          >
            <option value="">Todas as series</option>
            {series.map((serie) => (
              <option key={serie} value={serie}>
                {serie}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Turma
          </label>
          <select
            value={filtros.turma_id || ''}
            onChange={(e) => handleFiltroChange('turma_id', e.target.value)}
            className="select-custom w-full"
            disabled={!filtros.serie || turmas.length === 0}
          >
            <option value="">Todas as turmas</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.codigo || turma.nome || `Turma ${turma.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Tipo de Ensino
          </label>
          <select
            value={filtros.tipo_ensino || ''}
            onChange={(e) => handleFiltroChange('tipo_ensino', e.target.value)}
            className="select-custom w-full"
          >
            <option value="">Todos</option>
            <option value="anos_iniciais">Anos Iniciais (1o-5o)</option>
            <option value="anos_finais">Anos Finais (6o-9o)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Presenca
          </label>
          <select
            value={filtros.presenca || ''}
            onChange={(e) => handleFiltroChange('presenca', e.target.value)}
            className="select-custom w-full"
          >
            <option value="">Todos</option>
            <option value="P">Presentes</option>
            <option value="F">Faltosos</option>
          </select>
        </div>
      </div>

      {/* Busca - pesquisa no servidor em todas as páginas */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onBuscar()
              }
            }}
            placeholder="Buscar por nome do aluno ou escola..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
        <button
          onClick={onBuscar}
          disabled={carregando}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Buscar</span>
        </button>
        {busca && (
          <button
            onClick={onLimparBusca}
            className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
