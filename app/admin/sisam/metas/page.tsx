'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import {
  Target, School, Save, CheckCircle2, AlertTriangle, XCircle,
  TrendingUp, BarChart3, Users, ArrowDownCircle
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Indicador {
  key: string
  label: string
  icon: any
  unidade: string
  cor: string
  descricao: string
  inverso?: boolean // true para evasão (menor é melhor)
}

const INDICADORES: Indicador[] = [
  { key: 'frequencia', label: 'Frequência', icon: Users, unidade: '%', cor: 'blue', descricao: 'Percentual médio de frequência dos alunos' },
  { key: 'media_sisam', label: 'Média SISAM', icon: BarChart3, unidade: 'pts', cor: 'indigo', descricao: 'Média geral na avaliação SISAM (0-10)' },
  { key: 'aprovacao', label: 'Aprovação', icon: TrendingUp, unidade: '%', cor: 'emerald', descricao: 'Percentual de alunos aprovados' },
  { key: 'evasao', label: 'Evasão', icon: ArrowDownCircle, unidade: '%', cor: 'red', descricao: 'Percentual de alunos evadidos/transferidos', inverso: true },
]

function getSemaforo(meta: number | null, atual: number | null, inverso?: boolean): { cor: string; label: string; icon: any } {
  if (meta === null || atual === null) return { cor: 'gray', label: 'Sem dados', icon: XCircle }
  const diff = inverso ? meta - atual : atual - meta
  const pct = meta !== 0 ? (diff / meta) * 100 : 0
  if (diff >= 0) return { cor: 'emerald', label: 'Atingiu', icon: CheckCircle2 }
  if (pct >= -10) return { cor: 'yellow', label: 'Perto', icon: AlertTriangle }
  return { cor: 'red', label: 'Longe', icon: XCircle }
}

function getProgressPct(meta: number | null, atual: number | null, inverso?: boolean): number {
  if (meta === null || atual === null || meta === 0) return 0
  if (inverso) {
    // Para evasão: 0% de evasão é 100% do objetivo (meta é máximo aceitável)
    if (atual <= 0) return 100
    if (atual >= meta) return Math.max(0, (1 - (atual - meta) / meta) * 100)
    return 100
  }
  return Math.min(100, Math.max(0, (atual / meta) * 100))
}

export default function MetasPage() {
  const toast = useToast()
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])
  const [escolaSelecionada, setEscolaSelecionada] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [metas, setMetas] = useState<Record<string, number | null>>({
    frequencia: null, media_sisam: null, aprovacao: null, evasao: null,
  })
  const [atuais, setAtuais] = useState<Record<string, number | null>>({
    frequencia: null, media_sisam: null, aprovacao: null, evasao: null,
  })
  const [todasMetas, setTodasMetas] = useState<any[]>([])
  const [todosAtuais, setTodosAtuais] = useState<Record<string, Record<string, number>>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (escolaSelecionada) params.set('escola_id', escolaSelecionada)
      const res = await fetch(`/api/admin/metas-escola?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEscolas(data.escolas || [])
        setTodasMetas(data.metas || [])
        setTodosAtuais(data.valores_atuais || {})

        // Se escola selecionada, preencher metas e atuais
        if (escolaSelecionada) {
          const metasEscola: Record<string, number | null> = {
            frequencia: null, media_sisam: null, aprovacao: null, evasao: null,
          }
          for (const m of (data.metas || [])) {
            if (m.escola_id === escolaSelecionada) {
              metasEscola[m.indicador] = parseFloat(m.meta_valor)
            }
          }
          setMetas(metasEscola)

          const atuaisEscola = data.valores_atuais?.[escolaSelecionada] || {}
          setAtuais({
            frequencia: atuaisEscola.frequencia ?? null,
            media_sisam: atuaisEscola.media_sisam ?? null,
            aprovacao: atuaisEscola.aprovacao ?? null,
            evasao: atuaisEscola.evasao ?? null,
          })
        }
      }
    } catch (err) {
      console.error('[Metas] Erro:', (err as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [escolaSelecionada, anoLetivo])

  useEffect(() => { carregar() }, [carregar])

  const salvarMetas = async () => {
    if (!escolaSelecionada) { toast.error('Selecione uma escola'); return }
    setSalvando(true)
    try {
      for (const ind of INDICADORES) {
        const valor = metas[ind.key]
        if (valor !== null && valor !== undefined) {
          await fetch('/api/admin/metas-escola', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              escola_id: escolaSelecionada,
              ano_letivo: anoLetivo,
              indicador: ind.key,
              meta_valor: valor,
            }),
          })
        }
      }
      toast.success('Metas salvas com sucesso!')
      carregar()
    } catch {
      toast.error('Erro ao salvar metas')
    } finally {
      setSalvando(false)
    }
  }

  // Visão geral: agrupar metas por escola
  const visaoGeral = escolas.map(e => {
    const metasEscola: Record<string, number | null> = {}
    for (const m of todasMetas) {
      if (m.escola_id === e.id) metasEscola[m.indicador] = parseFloat(m.meta_valor)
    }
    const atuaisEscola = todosAtuais[e.id] || {}
    return { ...e, metas: metasEscola, atuais: atuaisEscola }
  }).filter(e => Object.keys(e.metas).length > 0)

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 dark:from-amber-700 dark:to-yellow-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Indicadores e Metas</h1>
          </div>
          <p className="text-amber-100 text-sm">Defina metas por escola e acompanhe o atingimento dos indicadores</p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Escola</label>
              <select value={escolaSelecionada} onChange={e => setEscolaSelecionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm">
                <option value="">Selecione uma escola...</option>
                {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano Letivo</label>
              <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm">
                {['2024', '2025', '2026'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              {escolaSelecionada && (
                <button onClick={salvarMetas} disabled={salvando}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
                  <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar Metas'}
                </button>
              )}
            </div>
          </div>
        </div>

        {carregando ? <LoadingSpinner text="Carregando indicadores..." centered /> : (
          <>
            {/* Cards de indicadores (quando escola selecionada) */}
            {escolaSelecionada && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INDICADORES.map(ind => {
                  const metaVal = metas[ind.key]
                  const atualVal = atuais[ind.key]
                  const semaforo = getSemaforo(metaVal, atualVal, ind.inverso)
                  const progresso = getProgressPct(metaVal, atualVal, ind.inverso)
                  const Icon = ind.icon
                  const SemaforoIcon = semaforo.icon

                  const corMap: Record<string, string> = {
                    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    gray: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                  }

                  const barCorMap: Record<string, string> = {
                    emerald: 'bg-emerald-500',
                    yellow: 'bg-yellow-500',
                    red: 'bg-red-500',
                    gray: 'bg-gray-400',
                  }

                  return (
                    <div key={ind.key} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 text-${ind.cor}-500`} />
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{ind.label}</h3>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${corMap[semaforo.cor]}`}>
                          <SemaforoIcon className="w-3 h-3" /> {semaforo.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{ind.descricao}</p>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Meta</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={ind.key === 'media_sisam' ? 10 : 100}
                              value={metaVal ?? ''}
                              onChange={e => setMetas(prev => ({ ...prev, [ind.key]: e.target.value ? parseFloat(e.target.value) : null }))}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm font-medium"
                              placeholder="Definir..."
                            />
                            <span className="text-xs text-gray-400">{ind.unidade}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Valor Atual</label>
                          <p className="text-lg font-bold text-gray-800 dark:text-white py-1">
                            {atualVal !== null ? `${atualVal}${ind.unidade}` : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Barra de progresso */}
                      {metaVal !== null && (
                        <div>
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full transition-all ${barCorMap[semaforo.cor]}`}
                              style={{ width: `${Math.min(100, progresso)}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 text-right">{progresso.toFixed(0)}% da meta</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Visão geral */}
            {visaoGeral.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Visão Geral — Metas por Escola ({anoLetivo})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Escola</th>
                        {INDICADORES.map(ind => (
                          <th key={ind.key} className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">{ind.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visaoGeral.map(e => (
                        <tr key={e.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">{e.nome}</td>
                          {INDICADORES.map(ind => {
                            const meta = e.metas[ind.key] ?? null
                            const atual = e.atuais[ind.key] ?? null
                            const sem = getSemaforo(meta, atual, ind.inverso)
                            const corClasses: Record<string, string> = {
                              emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
                              yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
                              red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
                              gray: 'text-gray-400',
                            }
                            return (
                              <td key={ind.key} className={`py-2.5 px-2 text-center text-xs font-medium ${corClasses[sem.cor]}`}>
                                {meta !== null ? (
                                  <div>
                                    <div className="font-bold">{atual ?? '-'}{ind.unidade}</div>
                                    <div className="text-[10px] text-gray-400">meta: {meta}{ind.unidade}</div>
                                  </div>
                                ) : '-'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!escolaSelecionada && visaoGeral.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
                <School className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Selecione uma escola para definir metas ou veja a visão geral</p>
                <p className="text-xs text-gray-400 mt-1">Nenhuma meta definida para {anoLetivo}</p>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
