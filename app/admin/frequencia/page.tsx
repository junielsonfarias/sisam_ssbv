'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Save, Search, AlertCircle, CheckCircle, ArrowLeft, Scan, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'
import { usePeriodos } from '@/lib/hooks/usePeriodos'
interface AlunoFreq {
  id: string; nome: string; codigo: string | null; situacao: string | null; pcd: boolean
}
interface FreqAluno {
  presencas: number
  faltas: number
  faltas_justificadas: number
  percentual_frequencia: number | null
  observacao: string
  metodo?: string | null
}

type Modo = 'selecao' | 'lancamento'

export default function FrequenciaPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()
  const [modo, setModo] = useState<Modo>('selecao')

  // Seleção
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  // Auth via hook
  const { tipoUsuario, usuario, isEscola } = useUserType({
    onUsuarioCarregado: (u) => {
      if (u.escola_id) setEscolaId(u.escola_id)
    }
  })

  // Dados via hooks
  const { escolas } = useEscolas({ desabilitado: isEscola })
  const { turmas } = useTurmas(escolaId, anoLetivo)
  const { periodos } = usePeriodos(anoLetivo)

  // Reset turmaId quando escola/ano mudam
  useEffect(() => { setTurmaId('') }, [escolaId, anoLetivo])

  // Lançamento
  const [alunos, setAlunos] = useState<AlunoFreq[]>([])
  const [frequencias, setFrequencias] = useState<Record<string, FreqAluno>>({})
  const [diasLetivos, setDiasLetivos] = useState(50)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Labels selecionados
  const turmaSelecionada = turmas.find(t => t.id === turmaId)
  const periodoSelecionado = periodos.find(p => p.id === periodoId)

  // Carregar frequências
  const carregarFrequencias = useCallback(async () => {
    if (!turmaId || !periodoId) return

    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/frequencia?turma_id=${turmaId}&periodo_id=${periodoId}`)
      if (!res.ok) {
        toast.error('Erro ao carregar frequências')
        return
      }

      const data = await res.json()
      const alunosList: AlunoFreq[] = data.alunos || []
      const freqMap: Record<string, any> = data.frequencias || {}

      setAlunos(alunosList)

      // Montar estado das frequências
      const freqState: Record<string, FreqAluno> = {}
      for (const aluno of alunosList) {
        if (freqMap[aluno.id]) {
          const f = freqMap[aluno.id]
          freqState[aluno.id] = {
            presencas: f.presencas ?? 0,
            faltas: f.faltas ?? 0,
            faltas_justificadas: f.faltas_justificadas ?? 0,
            percentual_frequencia: f.percentual_frequencia ? parseFloat(f.percentual_frequencia) : null,
            observacao: f.observacao || '',
            metodo: f.metodo || 'manual',
          }
          // Atualizar dias letivos do primeiro registro encontrado
          if (f.dias_letivos && f.dias_letivos > 0) {
            setDiasLetivos(f.dias_letivos)
          }
        } else {
          freqState[aluno.id] = {
            presencas: 0, faltas: 0, faltas_justificadas: 0,
            percentual_frequencia: null, observacao: '',
          }
        }
      }
      setFrequencias(freqState)
      setModo('lancamento')
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }, [turmaId, periodoId, toast])

  // Atualizar frequência de um aluno
  const updateFreq = (alunoId: string, campo: keyof FreqAluno, valor: any) => {
    setFrequencias(prev => {
      const atual = prev[alunoId] || { presencas: 0, faltas: 0, faltas_justificadas: 0, percentual_frequencia: null, observacao: '' }
      const novo = { ...atual, [campo]: valor }

      // Auto-calcular: ao digitar faltas, calcula presenças e vice-versa
      if (campo === 'faltas') {
        novo.presencas = Math.max(0, diasLetivos - (valor || 0))
      } else if (campo === 'presencas') {
        novo.faltas = Math.max(0, diasLetivos - (valor || 0))
      }

      // Calcular percentual
      novo.percentual_frequencia = diasLetivos > 0
        ? Math.round(((novo.presencas || 0) / diasLetivos) * 10000) / 100
        : 0

      return { ...prev, [alunoId]: novo }
    })
  }

  // Atualizar todos ao mudar dias letivos
  const handleDiasLetivosChange = (novoDias: number) => {
    setDiasLetivos(novoDias)
    setFrequencias(prev => {
      const novo: Record<string, FreqAluno> = {}
      for (const [alunoId, freq] of Object.entries(prev)) {
        const presencas = Math.max(0, novoDias - (freq.faltas || 0))
        const pct = novoDias > 0 ? Math.round((presencas / novoDias) * 10000) / 100 : 0
        novo[alunoId] = { ...freq, presencas, percentual_frequencia: pct }
      }
      return novo
    })
  }

  // Salvar
  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const freqArray = Object.entries(frequencias).map(([aluno_id, freq]) => ({
        aluno_id,
        presencas: freq.presencas,
        faltas: freq.faltas,
        faltas_justificadas: freq.faltas_justificadas,
        observacao: freq.observacao || null,
      }))

      const res = await fetch('/api/admin/frequencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turmaId,
          periodo_id: periodoId,
          dias_letivos: diasLetivos,
          frequencias: freqArray,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.mensagem || 'Erro ao salvar')
        return
      }

      toast.success(data.mensagem || 'Frequência salva com sucesso')
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSalvando(false)
    }
  }

  // Anos dinâmicos
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const getCorFrequencia = (pct: number | null) => {
    if (pct === null) return 'text-gray-400'
    if (pct >= 90) return 'text-green-600 dark:text-green-400'
    if (pct >= 75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const alunosAtivos = alunos.filter(a => !['transferido', 'abandono'].includes(a.situacao || ''))
  const alunosInativos = alunos.filter(a => ['transferido', 'abandono'].includes(a.situacao || ''))

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Frequência Escolar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Lançamento de frequência por bimestre
            </p>
          </div>
          <div className="flex items-center gap-2">
            {modo === 'lancamento' && turmaId && (
              <Link
                href={`/admin/frequencia-diaria?turma_id=${turmaId}${escolaId ? `&escola_id=${escolaId}` : ''}`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                <Scan className="w-4 h-4" />
                Ver Frequência Diária
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            {modo === 'lancamento' && (
              <button
                onClick={() => setModo('selecao')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
          </div>
        </div>

        {modo === 'selecao' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Selecione a turma e o bimestre</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ano */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ano Letivo</label>
                <select
                  value={anoLetivo}
                  onChange={e => setAnoLetivo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Escola */}
              {tipoUsuario !== 'escola' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escola</label>
                  <select
                    value={escolaId}
                    onChange={e => setEscolaId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione</option>
                    {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              )}

              {/* Turma */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turma</label>
                <select
                  value={turmaId}
                  onChange={e => setTurmaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo}{t.nome ? ` - ${t.nome}` : ''} ({formatSerie(t.serie)})</option>)}
                </select>
              </div>

              {/* Período */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bimestre</label>
                <select
                  value={periodoId}
                  onChange={e => setPeriodoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={carregarFrequencias}
                disabled={!turmaId || !periodoId || carregando}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {carregando ? <LoadingSpinner /> : <Search className="w-4 h-4" />}
                Carregar
              </button>
            </div>
          </div>
        )}

        {modo === 'lancamento' && (
          <>
            {/* Info da seleção */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {turmaSelecionada?.codigo}{turmaSelecionada?.nome ? ` - ${turmaSelecionada.nome}` : ''} ({formatSerie(turmaSelecionada?.serie)})
                </span>
                <span className="w-px h-4 bg-indigo-300 dark:bg-indigo-600" />
                <span className="text-indigo-600 dark:text-indigo-400">{periodoSelecionado?.nome}</span>
                <span className="w-px h-4 bg-indigo-300 dark:bg-indigo-600" />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Dias Letivos:</label>
                  <input
                    type="number"
                    value={diasLetivos}
                    onChange={e => handleDiasLetivosChange(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    className="w-16 px-2 py-1 text-sm text-center border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Tabela de lançamento */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-10">Ord.</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Aluno</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-20">Faltas</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-20">Justif.</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-24">Presenças</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-20">%</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-20">Método</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {alunosAtivos.map((aluno, idx) => {
                      const freq = frequencias[aluno.id] || { presencas: 0, faltas: 0, faltas_justificadas: 0, percentual_frequencia: null, observacao: '' }
                      const pct = freq.percentual_frequencia
                      return (
                        <tr key={aluno.id} className={`border-b border-gray-100 dark:border-slate-700/40 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/60'}`}>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{aluno.nome}</span>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <input
                              type="number"
                              value={freq.faltas || ''}
                              onChange={e => updateFreq(aluno.id, 'faltas', parseInt(e.target.value) || 0)}
                              min={0}
                              max={diasLetivos}
                              className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <input
                              type="number"
                              value={freq.faltas_justificadas || ''}
                              onChange={e => updateFreq(aluno.id, 'faltas_justificadas', parseInt(e.target.value) || 0)}
                              min={0}
                              max={freq.faltas}
                              className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {freq.presencas}/{diasLetivos}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <span className={`text-sm font-bold ${getCorFrequencia(pct)}`}>
                              {pct !== null ? `${pct}%` : '-'}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            {freq.metodo && freq.metodo !== 'manual' ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                freq.metodo === 'facial' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                freq.metodo === 'qrcode' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {freq.metodo === 'facial' ? 'Facial' : freq.metodo === 'qrcode' ? 'QR Code' : 'Manual'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">Manual</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            {pct !== null && pct < 75 && (
                              <span title="Frequência abaixo de 75%"><AlertCircle className="w-4 h-4 text-red-500 mx-auto" /></span>
                            )}
                            {pct !== null && pct >= 90 && (
                              <span title="Frequência adequada"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></span>
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Alunos inativos (transferidos/abandono) */}
                    {alunosInativos.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={8} className="px-4 py-2 bg-gray-100 dark:bg-slate-700/30">
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                              Transferidos / Saídas ({alunosInativos.length})
                            </span>
                          </td>
                        </tr>
                        {alunosInativos.map((aluno, idx) => {
                          const freq = frequencias[aluno.id] || { presencas: 0, faltas: 0, faltas_justificadas: 0, percentual_frequencia: null, observacao: '' }
                          const pct = freq.percentual_frequencia
                          return (
                            <tr key={aluno.id} className="border-b border-gray-100 dark:border-slate-700/40 bg-gray-50/70 dark:bg-slate-900/30 opacity-60">
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 text-xs font-bold text-gray-400 dark:text-gray-500">
                                  {alunosAtivos.length + idx + 1}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-sm font-medium text-gray-400 dark:text-gray-500 line-through whitespace-nowrap">{aluno.nome}</span>
                                <span className="block text-[10px] text-red-400">{aluno.situacao === 'transferido' ? 'Transferido' : 'Abandono'}</span>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <input
                                  type="number"
                                  value={freq.faltas || ''}
                                  onChange={e => updateFreq(aluno.id, 'faltas', parseInt(e.target.value) || 0)}
                                  min={0}
                                  max={diasLetivos}
                                  className="w-16 px-2 py-1.5 text-sm text-center border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <input
                                  type="number"
                                  value={freq.faltas_justificadas || ''}
                                  onChange={e => updateFreq(aluno.id, 'faltas_justificadas', parseInt(e.target.value) || 0)}
                                  min={0}
                                  className="w-16 px-2 py-1.5 text-sm text-center border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <span className="text-sm text-gray-400 dark:text-gray-500">{freq.presencas}/{diasLetivos}</span>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <span className={`text-sm font-bold ${getCorFrequencia(pct)}`}>
                                  {pct !== null ? `${pct}%` : '-'}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <span className="text-[10px] text-gray-400">-</span>
                              </td>
                              <td className="px-2 py-2.5" />
                            </tr>
                          )
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer com resumo e botão salvar */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{alunosAtivos.length} aluno{alunosAtivos.length !== 1 ? 's' : ''} ativo{alunosAtivos.length !== 1 ? 's' : ''}</span>
                  {(() => {
                    const abaixo75 = alunosAtivos.filter(a => {
                      const f = frequencias[a.id]
                      return f && f.percentual_frequencia !== null && f.percentual_frequencia < 75
                    }).length
                    return abaixo75 > 0 ? (
                      <>
                        <span className="w-px h-3 bg-gray-300 dark:bg-slate-600" />
                        <span className="text-red-500 font-medium">{abaixo75} abaixo de 75%</span>
                      </>
                    ) : null
                  })()}
                </div>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {salvando ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
                  {salvando ? 'Salvando...' : 'Salvar Frequência'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
