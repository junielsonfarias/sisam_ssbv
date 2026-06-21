'use client'

import type { FiltroStatus, FiltroTipo } from './tipos'

interface FiltrosTriagemProps {
  status: FiltroStatus
  tipo: FiltroTipo
  onStatusChange: (status: FiltroStatus) => void
  onTipoChange: (tipo: FiltroTipo) => void
}

const SELECT_CLASSE =
  'rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500'

/** Filtros de status e tipo da listagem de divergências. */
export function FiltrosTriagem({
  status,
  tipo,
  onStatusChange,
  onTipoChange,
}: FiltrosTriagemProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="flex flex-col">
        <label
          htmlFor="filtro-status"
          className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
        >
          Status
        </label>
        <select
          id="filtro-status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as FiltroStatus)}
          className={SELECT_CLASSE}
        >
          <option value="">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="vinculado">Vinculados</option>
          <option value="ignorado">Ignorados</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label
          htmlFor="filtro-tipo"
          className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
        >
          Tipo
        </label>
        <select
          id="filtro-tipo"
          value={tipo}
          onChange={(e) => onTipoChange(e.target.value as FiltroTipo)}
          className={SELECT_CLASSE}
        >
          <option value="">Todos</option>
          <option value="turma">Turmas</option>
          <option value="aluno">Alunos</option>
        </select>
      </div>
    </div>
  )
}
