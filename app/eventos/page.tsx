'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react'
import SiteHeader from '@/components/site/site-header'
import SiteFooter from '@/components/site/site-footer'

interface Evento {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  data_inicio: string
  data_fim: string | null
  local: string | null
}

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  reuniao: { label: 'Reunião', cls: 'bg-blue-100 text-blue-700' },
  formatura: { label: 'Formatura', cls: 'bg-purple-100 text-purple-700' },
  jogos: { label: 'Jogos', cls: 'bg-amber-100 text-amber-700' },
  capacitacao: { label: 'Capacitação', cls: 'bg-emerald-100 text-emerald-700' },
  geral: { label: 'Geral', cls: 'bg-slate-100 text-slate-700' },
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function EventosPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth())
  const [ano, setAno] = useState(now.getFullYear())
  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)

  const fetchEventos = useCallback(async () => {
    try {
      setCarregando(true)
      const res = await fetch(`/api/eventos?mes=${mes + 1}&ano=${ano}`)
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setEventos(data.eventos || [])
    } catch {
      setEventos([])
    } finally {
      setCarregando(false)
    }
  }, [mes, ano])

  useEffect(() => {
    fetchEventos()
  }, [fetchEventos])

  function navMes(delta: number) {
    let newMes = mes + delta
    let newAno = ano
    if (newMes < 0) { newMes = 11; newAno-- }
    if (newMes > 11) { newMes = 0; newAno++ }
    setMes(newMes)
    setAno(newAno)
  }

  // Agrupar eventos por dia
  const eventosPorDia = useMemo(() => {
    const map: Record<number, Evento[]> = {}
    eventos.forEach(e => {
      const d = new Date(e.data_inicio)
      const dia = d.getDate()
      if (!map[dia]) map[dia] = []
      map[dia].push(e)
    })
    return map
  }, [eventos])

  const totalDias = getDaysInMonth(ano, mes)
  const primeiroDia = getFirstDayOfWeek(ano, mes)

  // Eventos futuros (para lista abaixo)
  const eventosProximos = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return eventos
      .filter(e => new Date(e.data_inicio) >= hoje)
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
  }, [eventos])

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader data={{}} />

      {/* Hero */}
      <div className="pt-32 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">Agenda</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Agenda de Eventos
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              SEMED — Confira os eventos e atividades programadas
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Navegação do mês */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navMes(-1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">
            {MESES[mes]} {ano}
          </h2>
          <button onClick={() => navMes(1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Calendário */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-10">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-3 text-center text-xs font-bold text-slate-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Células */}
          <div className="grid grid-cols-7">
            {Array.from({ length: primeiroDia }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100 bg-slate-50/50" />
            ))}
            {Array.from({ length: totalDias }).map((_, i) => {
              const dia = i + 1
              const evs = eventosPorDia[dia] || []
              const isHoje = dia === now.getDate() && mes === now.getMonth() && ano === now.getFullYear()
              return (
                <div
                  key={dia}
                  className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 ${isHoje ? 'bg-emerald-50' : ''}`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    isHoje ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}>
                    {dia}
                  </span>
                  {evs.slice(0, 2).map((ev) => {
                    const badge = TIPO_BADGE[ev.tipo] || TIPO_BADGE.geral
                    return (
                      <div key={ev.id} className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${badge.cls}`}>
                        {ev.titulo}
                      </div>
                    )
                  })}
                  {evs.length > 2 && (
                    <p className="text-[10px] text-slate-400 mt-0.5 px-1">+{evs.length - 2} mais</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Lista de próximos eventos */}
        <h3 className="text-lg font-bold text-slate-900 mb-4">Próximos Eventos</h3>
        {carregando ? (
          <div className="text-center py-12 text-slate-400">Carregando...</div>
        ) : eventosProximos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Nenhum evento futuro neste mês</div>
        ) : (
          <div className="space-y-4">
            {eventosProximos.map((ev) => {
              const badge = TIPO_BADGE[ev.tipo] || TIPO_BADGE.geral
              const dataObj = new Date(ev.data_inicio)
              return (
                <div key={ev.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-900/5 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-emerald-50 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-emerald-600 uppercase">{MESES[dataObj.getMonth()].substring(0, 3)}</span>
                      <span className="text-lg font-extrabold text-emerald-700">{dataObj.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">{ev.titulo}</h4>
                      {ev.descricao && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-2">{ev.descricao}</p>
                      )}
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {ev.local && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {ev.local}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <SiteFooter data={{}} />
    </div>
  )
}
