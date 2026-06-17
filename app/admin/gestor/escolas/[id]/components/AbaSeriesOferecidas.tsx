'use client'

import { useEffect, useState } from 'react'
import { BookOpen, GraduationCap } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  SerieEscola,
  SerieEscolar,
  ETAPA_LABELS,
  ETAPA_CORES,
} from './types'

export function AbaSeriesOferecidas({
  escolaId,
  anoLetivo,
  seriesEscola,
  onRecarregar,
  toast,
}: {
  escolaId: string
  anoLetivo: string
  seriesEscola: SerieEscola[]
  onRecarregar: () => Promise<void>
  toast: any
}) {
  const [todasSeries, setTodasSeries] = useState<SerieEscolar[]>([])
  const [carregando, setCarregando] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch('/api/admin/series-escolares')
        if (res.ok) {
          const data = await res.json()
          setTodasSeries(Array.isArray(data) ? data : data.series || [])
        }
      } catch (error) {
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const seriesVinculadas = new Set(seriesEscola.map(s => s.serie))

  const handleToggleSerie = async (codigo: string) => {
    setToggling(codigo)
    try {
      if (seriesVinculadas.has(codigo)) {
        const res = await fetch(
          `/api/admin/escolas/${escolaId}/series?serie=${codigo}&ano_letivo=${anoLetivo}`,
          { method: 'DELETE' }
        )
        if (res.ok) {
          toast.success('Serie removida')
          await onRecarregar()
        } else {
          const data = await res.json()
          toast.error(data.mensagem || 'Erro ao remover serie')
        }
      } else {
        const res = await fetch(`/api/admin/escolas/${escolaId}/series`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serie: codigo, ano_letivo: anoLetivo }),
        })
        if (res.ok) {
          toast.success('Serie vinculada')
          await onRecarregar()
        } else {
          const data = await res.json()
          toast.error(data.mensagem || 'Erro ao vincular serie')
        }
      }
    } catch (error) {
      toast.error('Erro ao alternar serie')
    } finally {
      setToggling(null)
    }
  }

  if (carregando) {
    return <LoadingSpinner text="Carregando series..." centered />
  }

  // Agrupar por etapa
  const etapas = ['educacao_infantil', 'fundamental_anos_iniciais', 'fundamental_anos_finais', 'eja']
  const porEtapa = etapas.map(etapa => ({
    etapa,
    label: ETAPA_LABELS[etapa] || etapa,
    series: todasSeries.filter(s => s.etapa === etapa).sort((a, b) => a.ordem - b.ordem),
  })).filter(g => g.series.length > 0)

  const totalVinculadas = seriesVinculadas.size

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          Series Oferecidas ({anoLetivo})
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalVinculadas} de {todasSeries.length} series ativas
        </span>
      </div>

      {porEtapa.map(grupo => (
        <div key={grupo.etapa}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ETAPA_CORES[grupo.etapa] || 'bg-gray-100 text-gray-700'}`}>
              {grupo.label}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {grupo.series.map(serie => {
              const vinculada = seriesVinculadas.has(serie.codigo)
              return (
                <div
                  key={serie.id}
                  className={`p-4 rounded-xl border transition-all ${
                    vinculada
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600 shadow-sm'
                      : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className={`w-5 h-5 ${vinculada ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{serie.nome}</span>
                    </div>
                    <button
                      onClick={() => handleToggleSerie(serie.codigo)}
                      disabled={toggling === serie.codigo}
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        vinculada ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'
                      } ${toggling === serie.codigo ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                        vinculada ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    {serie.media_aprovacao != null && (
                      <p>Media: <strong>{serie.media_aprovacao}</strong> | Rec: <strong>{serie.media_recuperacao ?? '-'}</strong> | Nota max: <strong>{serie.nota_maxima ?? 10}</strong></p>
                    )}
                    {serie.max_dependencias > 0 && (
                      <p>Max dependencias: <strong>{serie.max_dependencias}</strong></p>
                    )}
                    <p>
                      {serie.total_disciplinas > 0 ? `${serie.total_disciplinas} disciplinas` : 'Sem disciplinas'}
                      {serie.permite_recuperacao && ' | Recuperacao'}
                    </p>
                    {(serie.idade_minima || serie.idade_maxima) && (
                      <p>Idade: {serie.idade_minima ?? '?'} - {serie.idade_maxima ?? '?'} anos</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Configure as regras de cada serie em <a href="/admin/series-escolares" className="text-emerald-600 hover:underline">Series Escolares</a>.
      </p>
    </div>
  )
}
