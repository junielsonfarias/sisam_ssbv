'use client'

import { Filter, X } from 'lucide-react'
import { EscolaSimples, TurmaSimples } from '@/lib/dados/types'

interface FiltrosComparativo {
  ano_letivo: string
  serie: string
  escola_id: string
  turma_id: string
}

interface Props {
  filtros: FiltrosComparativo
  series: string[]
  escolas: EscolaSimples[]
  turmas: TurmaSimples[]
  polosSelecionadosCount: number
  onChangeFiltros: (f: FiltrosComparativo) => void
  onLimpar: () => void
}

export function Filtros({
  filtros, series, escolas, turmas, polosSelecionadosCount, onChangeFiltros, onLimpar,
}: Props) {
  const podeMostrarLimpar = polosSelecionadosCount > 0 || filtros.serie || filtros.escola_id

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Filter className="w-5 h-5 mr-2 text-indigo-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Filtros de Comparação</h2>
        </div>
        {podeMostrarLimpar && (
          <button
            onClick={onLimpar}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo (opcional)</label>
          <input
            type="text"
            value={filtros.ano_letivo}
            onChange={(e) => onChangeFiltros({ ...filtros, ano_letivo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="Ex: 2026 (deixe vazio para todos)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Série</label>
          <select
            value={filtros.serie}
            onChange={(e) => onChangeFiltros({ ...filtros, serie: e.target.value, turma_id: '', escola_id: '' })}
            className="select-custom w-full"
          >
            <option value="">Todas as séries</option>
            {series.map((serie) => (
              <option key={serie} value={serie}>{serie}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Escola</label>
          <select
            value={filtros.escola_id}
            onChange={(e) => onChangeFiltros({ ...filtros, escola_id: e.target.value, turma_id: '' })}
            disabled={polosSelecionadosCount !== 2 || !filtros.serie}
            className="select-custom w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Todas as escolas</option>
            {escolas.map((escola) => (
              <option key={escola.id} value={escola.id}>{escola.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
          <select
            value={filtros.turma_id}
            onChange={(e) => onChangeFiltros({ ...filtros, turma_id: e.target.value })}
            disabled={!filtros.escola_id || !filtros.serie || turmas.length === 0}
            className="select-custom w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.codigo || turma.nome || `Turma ${turma.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
