'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, BookOpen, GraduationCap } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EscolaDetalhe, EstatisticasSituacao, EstatisticasSerie } from './types'

export function AbaEstatisticas({
  escola,
  escolaId,
  anoLetivo,
}: {
  escola: EscolaDetalhe
  escolaId: string
  anoLetivo: string
}) {
  const [situacoes, setSituacoes] = useState<EstatisticasSituacao[]>([])
  const [porSerie, setPorSerie] = useState<EstatisticasSerie[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch(`/api/admin/dashboard-gestor?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
        if (res.ok) {
          const data = await res.json()
          // Montar situacoes a partir dos dados do dashboard
          const sits: EstatisticasSituacao[] = []
          if (data.alunos?.cursando) sits.push({ situacao: 'cursando', total: data.alunos.cursando })
          if (data.alunos?.transferidos) sits.push({ situacao: 'transferido', total: data.alunos.transferidos })
          if (data.alunos?.abandono) sits.push({ situacao: 'abandono', total: data.alunos.abandono })
          if (data.alunos?.aprovados) sits.push({ situacao: 'aprovado', total: data.alunos.aprovados })
          if (data.alunos?.reprovados) sits.push({ situacao: 'reprovado', total: data.alunos.reprovados })
          setSituacoes(sits)

          // Montar por serie a partir da distribuicao
          if (data.distribuicao_serie) {
            setPorSerie(data.distribuicao_serie.map((s: any) => ({
              serie: s.serie,
              nome_serie: `${s.serie}º Ano`,
              total: s.total,
            })))
          }
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [escolaId, anoLetivo])

  const situacaoLabel = (sit: string) => {
    const map: Record<string, string> = {
      cursando: 'Cursando',
      transferido: 'Transferido',
      evadido: 'Evadido',
      aprovado: 'Aprovado',
      reprovado: 'Reprovado',
      concluido: 'Concluido',
      desistente: 'Desistente',
      remanejado: 'Remanejado',
    }
    return map[sit] || sit
  }

  const situacaoCor = (sit: string) => {
    const map: Record<string, string> = {
      cursando: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      transferido: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      evadido: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      aprovado: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      reprovado: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      concluido: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    }
    return map[sit] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-emerald-600" />
        Estatisticas ({anoLetivo})
      </h3>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{escola.total_alunos}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Alunos</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2">
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{escola.total_turmas}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Turmas</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
              <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{escola.total_pcd}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alunos PCD</p>
            </div>
          </div>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner text="Carregando estatisticas..." centered />
      ) : (
        <>
          {/* Por situacao */}
          {situacoes.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Alunos por Situacao</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {situacoes.map(s => (
                  <div key={s.situacao} className={`rounded-lg p-3 ${situacaoCor(s.situacao)}`}>
                    <p className="text-xl font-bold">{s.total}</p>
                    <p className="text-sm">{situacaoLabel(s.situacao)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Por serie */}
          {porSerie.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Alunos por Serie</h4>
              <div className="space-y-2">
                {porSerie.map(s => {
                  const maxTotal = Math.max(...porSerie.map(x => x.total), 1)
                  const percent = (s.total / maxTotal) * 100
                  return (
                    <div key={s.serie} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-24 text-right">
                        {s.nome_serie || `${s.serie}º Ano`}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(percent, 8)}%` }}
                        >
                          <span className="text-xs font-semibold text-white">{s.total}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
