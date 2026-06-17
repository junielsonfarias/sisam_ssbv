'use client'

import { Edit, Trash2, Users, Eye } from 'lucide-react'
import { Turma } from './types'

interface TurmaListItemProps {
  turma: Turma
  tipoUsuario: string
  formatSerie: (serie: string) => string
  onVerAlunos: (turmaId: string) => void
  onEditar: (turma: Turma) => void
  onExcluir: (turma: Turma) => void
}

export function TurmaListItem({
  turma,
  tipoUsuario,
  formatSerie,
  onVerAlunos,
  onEditar,
  onExcluir,
}: TurmaListItemProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 dark:text-white">{turma.codigo}</span>
            {turma.nome && (
              <span className="text-sm text-gray-500 dark:text-gray-400">({turma.nome})</span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {formatSerie(turma.serie)}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
              {turma.ano_letivo}
            </span>
            {turma.multiserie && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Multisseriada
              </span>
            )}
            {turma.multietapa && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                Multietapa
              </span>
            )}
            {turma.capacidade_maxima && (
              <span className="text-xs text-gray-400 dark:text-gray-500" title="Capacidade máxima">
                {turma.total_alunos}/{turma.capacidade_maxima}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {turma.escola_nome}
            {turma.polo_nome && <span className="ml-1">({turma.polo_nome})</span>}
          </p>
        </div>

        <button
          onClick={() => onVerAlunos(turma.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          title="Ver alunos"
        >
          <Eye className="w-3.5 h-3.5" />
          <Users className="w-3.5 h-3.5" />
          <span>{turma.total_alunos}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditar(turma)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          {tipoUsuario === 'admin' && (
            <button
              onClick={() => onExcluir(turma)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
