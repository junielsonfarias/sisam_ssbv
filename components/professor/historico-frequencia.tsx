'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Check, AlertCircle } from 'lucide-react'

interface DiaHistorico {
  data: string
  total_registros: number
  presentes: number
  faltas: number
  justificadas: number
  percentual_presenca: number
  completo: boolean
}

interface Props {
  turmaId: string
  dataSelecionada: string
  onSelecionarData: (data: string) => void
  /** Recarrega quando a frequencia eh salva (timestamp). */
  refreshKey?: number
}

/**
 * Strip horizontal com os ultimos dias da turma. Cada cartao mostra:
 *  - data (dia/mes)
 *  - dia da semana
 *  - icone (verde se completo, ambar se parcial, cinza se sem registro)
 *  - percentual de presenca
 *
 * Clicar em um dia altera a data selecionada — a pagina de frequencia
 * recarrega os registros daquela data e o professor pode editar via
 * UPSERT.
 */
export default function HistoricoFrequencia({ turmaId, dataSelecionada, onSelecionarData, refreshKey = 0 }: Props) {
  const [dias, setDias] = useState<DiaHistorico[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    if (!turmaId) return
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/professor/frequencia-diaria/historico?turma_id=${turmaId}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.mensagem || 'Erro ao carregar historico')
      }
      const data = await res.json()
      setDias(Array.isArray(data?.dias) ? data.dias : [])
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar historico')
      setDias([])
    } finally {
      setCarregando(false)
    }
  }, [turmaId])

  useEffect(() => {
    carregar()
  }, [carregar, refreshKey])

  // Sempre incluir a data selecionada na lista (mesmo que sem registro)
  // para destacar "voce esta editando este dia".
  const diasComSelecao = (() => {
    const map = new Map<string, DiaHistorico>()
    dias.forEach(d => map.set(d.data, d))
    if (dataSelecionada && !map.has(dataSelecionada)) {
      map.set(dataSelecionada, {
        data: dataSelecionada,
        total_registros: 0,
        presentes: 0,
        faltas: 0,
        justificadas: 0,
        percentual_presenca: 0,
        completo: false,
      })
    }
    return Array.from(map.values()).sort((a, b) => (a.data > b.data ? -1 : 1))
  })()

  if (erro) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="h-4 w-4" />
        {erro}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          Histórico (últimos 30 dias)
        </h2>
        {carregando && <span className="text-xs text-gray-400">Carregando…</span>}
      </div>

      {diasComSelecao.length === 0 ? (
        <div className="text-xs text-gray-500 dark:text-gray-400 italic p-2">
          Nenhuma frequência lançada nos últimos 30 dias.
        </div>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 px-1 snap-x">
          {diasComSelecao.map(dia => {
            const [ano, mes, diaNum] = dia.data.split('-')
            const dataObj = new Date(`${dia.data}T12:00:00`)
            const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
            const selecionado = dia.data === dataSelecionada
            const semRegistro = dia.total_registros === 0
            const corStatus = semRegistro
              ? 'text-gray-400 dark:text-gray-500'
              : dia.percentual_presenca >= 75
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'

            return (
              <button
                key={dia.data}
                onClick={() => onSelecionarData(dia.data)}
                aria-pressed={selecionado}
                aria-label={`${diaNum}/${mes}/${ano} — ${semRegistro ? 'sem registro' : `${dia.percentual_presenca}% presença`}`}
                className={`snap-start flex-shrink-0 w-20 px-2 py-2 rounded-lg border text-center transition-all ${
                  selecionado
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                    : semRegistro
                      ? 'bg-white dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:border-emerald-400'
                }`}
              >
                <div className="text-[10px] uppercase opacity-70">{diaSemana}</div>
                <div className="text-base font-bold leading-tight">{diaNum}/{mes}</div>
                {semRegistro ? (
                  <div className="text-[10px] mt-0.5 opacity-70">sem registro</div>
                ) : (
                  <div className={`text-[11px] mt-0.5 font-semibold flex items-center justify-center gap-0.5 ${selecionado ? 'text-white' : corStatus}`}>
                    {dia.completo && !selecionado && <Check className="h-2.5 w-2.5" />}
                    {dia.percentual_presenca}%
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-emerald-600" /> selecionado
        </span>
        <span className="flex items-center gap-1">
          <Check className="h-2.5 w-2.5 text-green-600" /> dia completo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm border border-dashed border-gray-400" /> sem registro
        </span>
      </div>
    </div>
  )
}
