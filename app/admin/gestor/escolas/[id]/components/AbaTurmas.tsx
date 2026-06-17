'use client'

import { useEffect, useState } from 'react'
import { Users, Link as LinkIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import { Turma } from './types'

export function AbaTurmas({
  escolaId,
  anoLetivo,
}: {
  escolaId: string
  anoLetivo: string
}) {
  const { formatSerie } = useSeries()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch(`/api/admin/turmas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
        if (res.ok) {
          const data = await res.json()
          setTurmas(Array.isArray(data) ? data : data.turmas || [])
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [escolaId, anoLetivo])

  if (carregando) {
    return <LoadingSpinner text="Carregando turmas..." centered />
  }

  const turnoLabel = (turno: string) => {
    const map: Record<string, string> = {
      matutino: 'Matutino',
      vespertino: 'Vespertino',
      noturno: 'Noturno',
      integral: 'Integral',
    }
    return map[turno] || turno
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          Turmas ({anoLetivo})
        </h3>
        <a
          href={`/admin/turmas?escola_id=${escolaId}`}
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Gerenciar Turmas
        </a>
      </div>

      {turmas.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p>Nenhuma turma cadastrada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Codigo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Serie</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Turno</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Alunos</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Ocupacao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {turmas.map(turma => {
                const ocupacao = turma.capacidade
                  ? Math.round((turma.total_alunos / turma.capacidade) * 100)
                  : null
                return (
                  <tr key={turma.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-300">{turma.codigo || '-'}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{turma.nome}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{formatSerie(turma.serie)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{turnoLabel(turma.turno)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {turma.total_alunos}{turma.capacidade ? `/${turma.capacidade}` : ''}
                    </td>
                    <td className="py-3 px-4">
                      {ocupacao !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                ocupacao > 90 ? 'bg-red-500' : ocupacao > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(ocupacao, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{ocupacao}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
