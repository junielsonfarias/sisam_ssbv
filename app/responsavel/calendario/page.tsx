'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, MapPin, Clock, ClipboardList, BookOpen } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Evento { id: string; titulo: string; descricao: string | null; tipo: string; data_inicio: string; data_fim: string | null; local: string | null }
interface Tarefa { id: string; titulo: string; disciplina: string | null; data_entrega: string; tipo: string; turma_codigo: string }
interface Periodo { nome: string; numero: number; data_inicio: string; data_fim: string }

const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

const TIPO_EVENTO_COR: Record<string, string> = {
  reuniao: 'bg-indigo-500', formatura: 'bg-purple-500', jogos: 'bg-green-500',
  capacitacao: 'bg-amber-500', geral: 'bg-blue-500',
}
const TIPO_TAREFA_COR: Record<string, string> = {
  atividade: 'bg-blue-400', trabalho: 'bg-indigo-400', prova: 'bg-red-400',
  pesquisa: 'bg-amber-400', leitura: 'bg-green-400',
}

export default function CalendarioResponsavel() {
  const router = useRouter()
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [eventos, setEventos] = useState<Evento[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)

  useEffect(() => { carregar() }, [mes, ano])

  const carregar = async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/responsavel/calendario?mes=${mes}&ano=${ano}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setEventos(data.eventos || [])
        setTarefas(data.tarefas || [])
        setPeriodos(data.periodos || [])
      }
    } catch { /* offline */ } finally { setCarregando(false) }
  }

  const mesAnterior = () => { if (mes === 1) { setMes(12); setAno(a => a - 1) } else setMes(m => m - 1) }
  const mesProximo = () => { if (mes === 12) { setMes(1); setAno(a => a + 1) } else setMes(m => m + 1) }

  // Gerar dias do mes
  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  const totalDias = new Date(ano, mes, 0).getDate()
  const hoje = new Date()
  const isHoje = (dia: number) => dia === hoje.getDate() && mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()

  // Itens por dia
  const itensDia = (dia: number) => {
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const evs = eventos.filter(e => e.data_inicio.startsWith(dataStr))
    const tfs = tarefas.filter(t => t.data_entrega === dataStr)
    return { eventos: evs, tarefas: tfs }
  }

  const formatHora = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
  }

  // Itens do dia selecionado
  const itensSelecionados = diaSelecionado ? itensDia(diaSelecionado) : { eventos: [], tarefas: [] }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/responsavel/dashboard')} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <Calendar className="w-6 h-6" />
          <h1 className="text-lg font-bold">Calendario Escolar</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Navegação do mês */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={mesAnterior} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{MESES[mes - 1]} {ano}</h2>
            <button onClick={mesProximo} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
          </div>

          {carregando ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <>
              {/* Header dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
                ))}
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: totalDias }).map((_, i) => {
                  const dia = i + 1
                  const { eventos: evs, tarefas: tfs } = itensDia(dia)
                  const temItens = evs.length > 0 || tfs.length > 0
                  const selecionado = diaSelecionado === dia

                  return (
                    <button key={dia} onClick={() => setDiaSelecionado(selecionado ? null : dia)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all ${
                        selecionado ? 'bg-indigo-600 text-white' :
                        isHoje(dia) ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' :
                        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}>
                      {dia}
                      {temItens && (
                        <div className="flex gap-0.5 mt-0.5">
                          {evs.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                          {tfs.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Evento</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Tarefa</span>
              </div>
            </>
          )}
        </div>

        {/* Detalhes do dia selecionado */}
        {diaSelecionado && (itensSelecionados.eventos.length > 0 || itensSelecionados.tarefas.length > 0) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {diaSelecionado} de {MESES[mes - 1]}
            </h3>

            {itensSelecionados.eventos.map(e => (
              <div key={e.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-2 h-full min-h-[40px] rounded-full ${TIPO_EVENTO_COR[e.tipo] || 'bg-blue-500'}`} />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{e.titulo}</p>
                    {e.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{e.descricao}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatHora(e.data_inicio)}</span>
                      {e.local && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.local}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {itensSelecionados.tarefas.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-2 h-full min-h-[40px] rounded-full ${TIPO_TAREFA_COR[t.tipo] || 'bg-blue-400'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold uppercase text-gray-400">{t.tipo} — {t.turma_codigo}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{t.titulo}</p>
                    {t.disciplina && <p className="text-xs text-gray-400 mt-0.5">{t.disciplina}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Próximas tarefas */}
        {tarefas.filter(t => new Date(t.data_entrega) >= new Date(new Date().toDateString())).length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-red-500" /> Proximas Tarefas
            </h3>
            <div className="space-y-2">
              {tarefas.filter(t => new Date(t.data_entrega) >= new Date(new Date().toDateString())).slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{t.titulo}</p>
                    <p className="text-xs text-gray-400">{t.turma_codigo} {t.disciplina ? `— ${t.disciplina}` : ''}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400">
                    {new Date(t.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
