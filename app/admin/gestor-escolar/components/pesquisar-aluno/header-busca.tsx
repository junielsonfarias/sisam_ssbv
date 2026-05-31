'use client'

import { Filter, Search, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EscolaSimples } from '../types'
import { FiltrosBusca, TurmaDisponivel } from './types'

interface Props {
  busca: string
  buscando: boolean
  filtros: FiltrosBusca
  escolasFiltro: EscolaSimples[]
  turmasFiltro: TurmaDisponivel[]
  tipoUsuario: string
  mostrarFiltros: boolean
  anoAtual: string
  qtdFiltrosAtivos: number
  onChangeBusca: (b: string) => void
  onChangeFiltros: (f: FiltrosBusca) => void
  onToggleFiltros: () => void
  onLimparFiltros: () => void
}

export function HeaderBusca({
  busca, buscando, filtros, escolasFiltro, turmasFiltro,
  tipoUsuario, mostrarFiltros, anoAtual, qtdFiltrosAtivos,
  onChangeBusca, onChangeFiltros, onToggleFiltros, onLimparFiltros,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Pesquisar Aluno</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => onChangeBusca(e.target.value)}
          placeholder="Buscar por nome, código ou CPF..."
          className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          autoFocus
        />
        {buscando && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>
      {busca.length > 0 && busca.length < 2 && (
        <p className="text-xs text-gray-400 mt-1">Digite pelo menos 2 caracteres para buscar</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleFiltros}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
        >
          <Filter className="w-4 h-4" />
          {mostrarFiltros ? 'Ocultar filtros' : 'Filtros'}
          {qtdFiltrosAtivos > 0 && (
            <span className="inline-flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5">
              {qtdFiltrosAtivos}
            </span>
          )}
        </button>
        {qtdFiltrosAtivos > 0 && (
          <button
            type="button"
            onClick={onLimparFiltros}
            className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}
      </div>

      {mostrarFiltros && (
        <div className="mt-3 p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tipoUsuario !== 'escola' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Escola</label>
              <select
                value={filtros.escola_id}
                onChange={(e) => onChangeFiltros({ ...filtros, escola_id: e.target.value, turma_id: '' })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="">Todas as escolas</option>
                {escolasFiltro.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Série</label>
            <select
              value={filtros.serie}
              onChange={(e) => onChangeFiltros({ ...filtros, serie: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="">Todas</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={String(n)}>{n}º Ano</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turma</label>
            <select
              value={filtros.turma_id}
              onChange={(e) => onChangeFiltros({ ...filtros, turma_id: e.target.value })}
              disabled={!filtros.escola_id}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Todas</option>
              {turmasFiltro.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.codigo}{t.nome ? ` - ${t.nome}` : ''}{t.serie ? ` | ${t.serie}` : ''}
                </option>
              ))}
            </select>
            {!filtros.escola_id && (
              <p className="text-xs text-gray-400 mt-1">Selecione uma escola primeiro</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano Letivo</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={filtros.ano_letivo}
              onChange={(e) => onChangeFiltros({ ...filtros, ano_letivo: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              placeholder={anoAtual}
            />
          </div>
        </div>
      )}
    </div>
  )
}
