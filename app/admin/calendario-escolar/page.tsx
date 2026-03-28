'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Periodo {
  id: string
  numero: number
  nome: string
  tipo: string
  data_inicio: string | null
  data_fim: string | null
  ano_letivo: string
  dias_letivos_estimados: number
}

interface Evento {
  id: string
  titulo: string
  tipo: string
  data_inicio: string
  data_fim: string | null
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function dateInRange(date: Date, inicio: string | null, fim: string | null): boolean {
  if (!inicio || !fim) return false
  const d = date.getTime()
  const s = new Date(inicio + 'T00:00:00').getTime()
  const e = new Date(fim + 'T23:59:59').getTime()
  return d >= s && d <= e
}

function CalendarioEscolar() {
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()))
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i + 1))

  const fetchDados = useCallback(async () => {
    try {
      setCarregando(true)
      const res = await fetch(`/api/admin/calendario-escolar?ano_letivo=${anoLetivo}`)
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setPeriodos(data.periodos || [])
      setEventos(data.eventos || [])
    } catch {
      setPeriodos([])
      setEventos([])
    } finally {
      setCarregando(false)
    }
  }, [anoLetivo])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  // Classificar cada dia
  function getDayClass(year: number, month: number, day: number): string {
    const date = new Date(year, month, day)
    const dow = date.getDay()

    // Fim de semana
    if (dow === 0 || dow === 6) return 'bg-gray-100 dark:bg-slate-700 text-gray-400'

    // Evento neste dia?
    const temEvento = eventos.some(ev => {
      const evDate = new Date(ev.data_inicio)
      return evDate.getFullYear() === year && evDate.getMonth() === month && evDate.getDate() === day
    })
    if (temEvento) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'

    // Período letivo?
    for (const p of periodos) {
      if (dateInRange(date, p.data_inicio, p.data_fim)) {
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
      }
    }

    return 'text-gray-600 dark:text-gray-400'
  }

  // Total dias letivos
  const totalDiasLetivos = useMemo(() => periodos.reduce((acc, p) => acc + (p.dias_letivos_estimados || 0), 0), [periodos])

  const anoNum = parseInt(anoLetivo)

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Calendário Escolar</h1>
              <p className="text-green-100 text-sm">Visualização do ano letivo</p>
            </div>
          </div>
          <select
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-bold border-0 outline-none"
          >
            {anos.map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
          </select>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300" />
          <span className="text-gray-600 dark:text-gray-300">Dia Letivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300" />
          <span className="text-gray-600 dark:text-gray-300">Evento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-gray-100 dark:bg-slate-700 border border-gray-300" />
          <span className="text-gray-600 dark:text-gray-300">Fim de semana / Recesso</span>
        </div>
      </div>

      {/* Resumo bimestres */}
      {periodos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {periodos.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{p.nome || `${p.numero}º Bimestre`}</p>
              <p className="text-lg font-extrabold text-emerald-600">{p.dias_letivos_estimados}</p>
              <p className="text-xs text-gray-400">dias letivos</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 mb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total estimado de dias letivos: <span className="font-extrabold text-emerald-600 text-lg">{totalDiasLetivos}</span></p>
      </div>

      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando calendário...</div>
      ) : (
        /* Calendário 4x3 grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, mesIdx) => {
            const totalDias = getDaysInMonth(anoNum, mesIdx)
            const primeiroDia = getFirstDayOfWeek(anoNum, mesIdx)
            return (
              <div key={mesIdx} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 text-center">{MESES[mesIdx]}</h3>
                <div className="grid grid-cols-7 gap-px text-center">
                  {DIAS_SEMANA_CURTOS.map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-gray-400 py-0.5">{d}</div>
                  ))}
                  {Array.from({ length: primeiroDia }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {Array.from({ length: totalDias }).map((_, i) => {
                    const dia = i + 1
                    const cls = getDayClass(anoNum, mesIdx, dia)
                    return (
                      <div key={dia} className={`text-[11px] py-0.5 rounded ${cls}`}>
                        {dia}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CalendarioEscolarPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <CalendarioEscolar />
    </ProtectedRoute>
  )
}
