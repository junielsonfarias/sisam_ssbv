'use client'

import { useState } from 'react'
import { Calendar, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import type { LacunasPayload } from './types'

interface Props {
  lacunas: LacunasPayload
}

function corCobertura(pct: number): { bg: string; text: string; border: string } {
  if (pct >= 90) return {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  }
  if (pct >= 70) return {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  }
  return {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  }
}

function formatarDataChip(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function formatarDataChipDia(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return iso
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${formatarDataChip(iso)} (${dia})`
}

export default function CoberturaDiario({ lacunas }: Props) {
  const [mesesExpandidos, setMesesExpandidos] = useState<Set<string>>(new Set())

  const pctNumber = parseFloat(lacunas.resumo.percentual_cobertura)
  const corGlobal = corCobertura(pctNumber)

  function toggleMes(chave: string) {
    setMesesExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

  if (lacunas.resumo.dias_letivos_total === 0) {
    return (
      <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          Cobertura do diário — nenhum dia letivo no período selecionado.
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Cobertura do diário
          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
            (dias letivos vs lançamentos no diário de classe)
          </span>
        </h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-slate-700">
        <div className="bg-white dark:bg-slate-800 px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Cobertura
          </div>
          <div className={`text-2xl font-bold ${corGlobal.text}`}>
            {lacunas.resumo.percentual_cobertura}%
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Dias letivos
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {lacunas.resumo.dias_letivos_total}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Com lançamento
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {lacunas.resumo.dias_com_lancamento}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
            Lacunas
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {lacunas.resumo.lacunas_total}
          </div>
        </div>
      </div>

      {/* Grade de meses */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        {lacunas.lacunas_por_mes.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhum dia letivo no escopo selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {lacunas.lacunas_por_mes.map(m => {
              const chave = `${m.ano}-${m.mes}`
              const expandido = mesesExpandidos.has(chave)
              const pct = m.dias_letivos === 0 ? 0 : (m.dias_com_lancamento / m.dias_letivos) * 100
              const cor = corCobertura(pct)
              const temLacunas = m.lacunas > 0

              return (
                <div
                  key={chave}
                  className={`rounded-lg border ${cor.border} ${cor.bg} overflow-hidden`}
                >
                  <button
                    onClick={() => temLacunas && toggleMes(chave)}
                    disabled={!temLacunas}
                    className={`w-full px-3 py-2.5 flex items-center justify-between text-left ${
                      temLacunas ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold ${cor.text}`}>
                        {m.mes_nome} <span className="opacity-70">/ {m.ano}</span>
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                        {m.dias_com_lancamento}/{m.dias_letivos} dias
                        {temLacunas && (
                          <span className={`ml-2 font-semibold ${cor.text}`}>
                            • {m.lacunas} lacuna{m.lacunas > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`text-sm font-bold ${cor.text}`}>
                        {pct.toFixed(0)}%
                      </div>
                      {temLacunas && (
                        expandido
                          ? <ChevronUp className={`w-4 h-4 ${cor.text}`} />
                          : <ChevronDown className={`w-4 h-4 ${cor.text}`} />
                      )}
                    </div>
                  </button>

                  {expandido && temLacunas && (
                    <div className="px-3 pb-3 pt-1 border-t border-current/10">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                        Datas sem lançamento
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.lacunas_datas.map(d => (
                          <span
                            key={d}
                            className="inline-block px-2 py-0.5 bg-white dark:bg-slate-900/60 text-[10px] font-medium text-gray-700 dark:text-gray-200 rounded border border-gray-200 dark:border-slate-700"
                            title={d}
                          >
                            {formatarDataChipDia(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-5 py-2 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/30 border-t border-gray-200 dark:border-slate-700">
        Lacuna = dia letivo sem nenhum registro no diário de classe (independente da disciplina).
        Considera feriados, recessos e reposições do calendário escolar.
      </div>
    </section>
  )
}
