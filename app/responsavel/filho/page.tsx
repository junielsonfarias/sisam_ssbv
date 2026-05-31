'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, BookOpen, CalendarCheck, TrendingUp, AlertTriangle, CheckCircle, ScanFace, LogIn, LogOut } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Aluno {
  id: string; nome: string; codigo: string; serie: string; escola_nome: string
  turma_codigo: string | null; turma_nome: string | null; situacao: string
}
interface Disciplina { id: string; nome: string; codigo: string; abreviacao: string }
interface Periodo { id: string; nome: string; numero: number }
interface Frequencia { bimestre: number; aulas_dadas: number; faltas: number; percentual_frequencia: number; periodo_nome: string }

export default function FilhoPageWrapper() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>}><FilhoPage /></Suspense>
}

function FilhoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunoId = searchParams.get('id')
  const abaInicial = searchParams.get('aba') || 'boletim'

  const [aba, setAba] = useState<'boletim' | 'frequencia' | 'presenca'>(abaInicial as any)
  const [presencaResumo, setPresencaResumo] = useState<Array<{ data: string; hora_entrada: string | null; hora_saida: string | null; metodo: string }>>([])
  const [presencaEventos, setPresencaEventos] = useState<Record<string, Array<{ tipo: 'entrada' | 'saida'; registrado_em: string; origem: string }>>>({})
  const [carregandoPresenca, setCarregandoPresenca] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [notas, setNotas] = useState<Record<string, Record<string, any>>>({})
  const [frequencia, setFrequencia] = useState<Frequencia[]>([])
  const [freqGeral, setFreqGeral] = useState(0)
  const [totalFaltas, setTotalFaltas] = useState(0)

  useEffect(() => {
    if (!alunoId) { router.push('/responsavel/dashboard'); return }
    carregarDados()
  }, [alunoId])

  // Carregar historico facial quando troca para a aba presenca
  useEffect(() => {
    if (aba !== 'presenca' || !alunoId) return
    const hoje = new Date()
    const inicio = new Date(hoje)
    inicio.setDate(inicio.getDate() - 30)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    setCarregandoPresenca(true)
    fetch(`/api/responsavel/presenca-facial?filho_id=${alunoId}&inicio=${fmt(inicio)}&fim=${fmt(hoje)}`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPresencaResumo(data.resumo || [])
          setPresencaEventos(data.eventos_por_dia || {})
        }
      })
      .finally(() => setCarregandoPresenca(false))
  }, [aba, alunoId])

  const carregarDados = async () => {
    try {
      const res = await fetch(`/api/responsavel/boletim?aluno_id=${alunoId}`, { credentials: 'include' })
      if (!res.ok) { router.push('/responsavel/dashboard'); return }
      const data = await res.json()
      setAluno(data.aluno)
      setDisciplinas(data.disciplinas || [])
      setPeriodos(data.periodos || [])
      setNotas(data.notas || {})
      setFrequencia(data.frequencia || [])
      setFreqGeral(data.frequencia_geral || 0)
      setTotalFaltas(data.total_faltas || 0)
    } catch { /* offline */ } finally {
      setCarregando(false)
    }
  }

  if (carregando) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>
  if (!aluno) return null

  const corNota = (n: number | null) => {
    if (n === null || n === undefined) return 'text-gray-400'
    return n >= 6 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  }

  const corFreq = (p: number) => {
    if (p >= 90) return 'text-green-600 dark:text-green-400'
    if (p >= 75) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => router.push('/responsavel/dashboard')}
            className="flex items-center gap-2 text-indigo-200 hover:text-white mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-lg font-bold">{aluno.nome}</h1>
          <p className="text-indigo-200 text-sm">{aluno.serie} {aluno.turma_codigo ? `— ${aluno.turma_codigo}` : ''} | {aluno.escola_nome}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex border-b border-gray-200 dark:border-slate-700 mt-1">
          <button onClick={() => setAba('boletim')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              aba === 'boletim' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <BookOpen className="w-4 h-4" /> Boletim
          </button>
          <button onClick={() => setAba('frequencia')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              aba === 'frequencia' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <CalendarCheck className="w-4 h-4" /> Frequencia
          </button>
          <button onClick={() => setAba('presenca')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              aba === 'presenca' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <ScanFace className="w-4 h-4" /> Entrada/Saida
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* ABA BOLETIM */}
        {aba === 'boletim' && (
          <>
            {disciplinas.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500">Nenhuma nota lancada ainda</p>
              </div>
            ) : (
              disciplinas.map(d => {
                const notasDisc = notas[d.id] || {}
                // Calcular media
                const vals = Object.values(notasDisc).map((n: any) => parseFloat(n.nota_final)).filter(v => !isNaN(v))
                const media = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null

                return (
                  <div key={d.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Disciplina header */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-slate-700">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{d.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{d.abreviacao}</p>
                      </div>
                      {media !== null && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Media</p>
                          <p className={`text-lg font-bold ${corNota(media)}`}>{media.toFixed(1)}</p>
                        </div>
                      )}
                    </div>
                    {/* Notas por periodo */}
                    <div className="divide-y divide-gray-50 dark:divide-slate-700">
                      {periodos.map(p => {
                        const nota = notasDisc[p.numero]
                        return (
                          <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">{p.nome}</span>
                            <div className="flex items-center gap-3">
                              {nota ? (
                                <>
                                  <span className={`text-sm font-bold ${corNota(parseFloat(nota.nota_final))}`}>
                                    {parseFloat(nota.nota_final).toFixed(1)}
                                  </span>
                                  {nota.nota_recuperacao && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400">
                                      Rec: {parseFloat(nota.nota_recuperacao).toFixed(1)}
                                    </span>
                                  )}
                                  {nota.faltas > 0 && (
                                    <span className="text-xs text-gray-400">{nota.faltas}F</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ABA FREQUENCIA */}
        {aba === 'frequencia' && (
          <>
            {/* Resumo geral */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Frequencia Geral</p>
                  <p className={`text-3xl font-bold ${corFreq(freqGeral)}`}>{freqGeral}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total de Faltas</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalFaltas}</p>
                </div>
              </div>
              {freqGeral < 75 && (
                <div className="mt-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Frequencia abaixo de 75%. Risco de reprovacao por falta.</span>
                </div>
              )}
            </div>

            {/* Por bimestre */}
            {frequencia.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
                <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500">Nenhuma frequencia lancada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {frequencia.map(f => (
                  <div key={f.bimestre} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{f.periodo_nome || `${f.bimestre}o Bimestre`}</p>
                      <p className={`text-lg font-bold ${corFreq(parseFloat(String(f.percentual_frequencia)) || 0)}`}>
                        {parseFloat(String(f.percentual_frequencia))?.toFixed(1) || '0'}%
                      </p>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Aulas: {f.aulas_dadas || 0}</span>
                      <span>Presencas: {(f.aulas_dadas || 0) - (f.faltas || 0)}</span>
                      <span className={f.faltas > 0 ? 'text-red-500 font-medium' : ''}>Faltas: {f.faltas || 0}</span>
                    </div>
                    {/* Barra visual */}
                    <div className="mt-2 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        (parseFloat(String(f.percentual_frequencia)) || 0) >= 90 ? 'bg-green-500' :
                        (parseFloat(String(f.percentual_frequencia)) || 0) >= 75 ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${Math.min(100, parseFloat(String(f.percentual_frequencia)) || 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA ENTRADA/SAIDA (terminal facial — ultimos 30 dias) */}
        {aba === 'presenca' && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <ScanFace className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Registros de entrada e saida pelo terminal de reconhecimento facial — ultimos 30 dias.
                  Scans muito proximos (&lt; 30 min) sao filtrados como duplicados para evitar erros.
                </span>
              </p>
            </div>

            {carregandoPresenca ? (
              <div className="text-center py-8 text-gray-500"><LoadingSpinner centered /></div>
            ) : presencaResumo.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
                <ScanFace className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500">Nenhum registro de entrada/saida nos ultimos 30 dias.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {presencaResumo.map((dia) => {
                  const eventos = presencaEventos[dia.data] || []
                  const dataFmt = new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                  return (
                    <div key={dia.data} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{dataFmt}</p>
                        <div className="flex gap-3 text-xs">
                          {dia.hora_entrada && (
                            <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                              <LogIn className="w-3 h-3" aria-hidden="true" /> {String(dia.hora_entrada).slice(0, 5)}
                            </span>
                          )}
                          {dia.hora_saida && (
                            <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
                              <LogOut className="w-3 h-3" aria-hidden="true" /> {String(dia.hora_saida).slice(0, 5)}
                            </span>
                          )}
                        </div>
                      </div>
                      {eventos.length > 0 && (
                        <div className="divide-y divide-gray-50 dark:divide-slate-700">
                          {eventos.map(e => {
                            const hh = new Date(e.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                            return (
                              <div key={e.registrado_em + e.tipo} className="px-4 py-2 flex items-center justify-between text-xs">
                                <span className={`flex items-center gap-1.5 ${e.tipo === 'entrada' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                  {e.tipo === 'entrada' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                                  {e.tipo === 'entrada' ? 'Entrada' : 'Saida'}
                                </span>
                                <span className="text-gray-600 dark:text-gray-300 font-mono">{hh}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
