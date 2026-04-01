'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, UserX, TrendingDown } from 'lucide-react'

interface AlunoRisco {
  id: string
  nome: string
  turma_nome: string
  turma_id: string
  motivos_risco: string[]
  gravidade: 'alta' | 'media' | 'baixa'
}

interface AlunosRiscoProps {
  turmaId: string | null
  onTotalChange?: (total: number) => void
}

export default function AlunosRisco({ turmaId, onTotalChange }: AlunosRiscoProps) {
  const [alunos, setAlunos] = useState<AlunoRisco[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    setCarregando(true)
    const url = turmaId
      ? `/api/professor/dashboard/alunos-risco?turma_id=${turmaId}`
      : '/api/professor/dashboard/alunos-risco'
    fetch(url)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setAlunos(data.alunos)
          setTotal(data.total)
          onTotalChange?.(data.total)
        }
      })
      .finally(() => setCarregando(false))
  }, [turmaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const corGravidade = {
    alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    baixa: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Alunos em Risco</h3>
        </div>
        {total > 0 && (
          <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            {total}
          </span>
        )}
      </div>

      <div className="p-4">
        {carregando ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : alunos.length === 0 ? (
          <div className="text-center py-8">
            <UserX className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Nenhum aluno em situação de risco
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {alunos.map((aluno) => (
              <div
                key={aluno.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className={`mt-0.5 p-1.5 rounded-lg ${corGravidade[aluno.gravidade]}`}>
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {aluno.nome}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{aluno.turma_nome}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {aluno.motivos_risco.map((motivo, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      >
                        {motivo}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${corGravidade[aluno.gravidade]}`}
                >
                  {aluno.gravidade}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
