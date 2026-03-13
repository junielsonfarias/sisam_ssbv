'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  LayoutGrid, Users, BookOpen, CalendarCheck, ArrowLeftRight,
  TrendingUp, TrendingDown, AlertTriangle, RotateCcw, GraduationCap,
  CheckCircle, XCircle, BarChart3, RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface EscolaSimples { id: string; nome: string }

interface DashboardData {
  alunos: {
    total: number; cursando: number; transferidos: number; abandono: number
    aprovados: number; reprovados: number; pcd: number
  }
  turmas: { total: number; series: number }
  notas: {
    total_alunos_com_nota: number; total_lancamentos: number
    media_geral: number; abaixo_media: number; acima_media: number
    em_recuperacao: number
    por_disciplina: { disciplina: string; abreviacao: string | null; media: number; total: number; abaixo: number }[]
  }
  frequencia: {
    total_com_frequencia: number; media_frequencia: number
    abaixo_75: number; entre_75_90: number; acima_90: number; total_faltas: number
  }
  transferencias: {
    saidas: number; entradas: number; dentro_municipio: number; fora_municipio: number
  }
  conselho: {
    total_conselhos: number; turmas_com_conselho: number; total_pareceres: number
    aprovados: number; reprovados: number; recuperacao: number; progressao: number
  }
  distribuicao_serie: { serie: string; total: number }[]
}

export default function DashboardGestorPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [data, setData] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/verificar')
        if (authRes.ok) {
          const d = await authRes.json()
          if (d.usuario) {
            const tipo = d.usuario.tipo_usuario === 'administrador' ? 'admin' : d.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (d.usuario.escola_id) {
              setEscolaId(d.usuario.escola_id)
            }
          }
        }
      } catch (e) { console.error(e) }
    }
    init()
  }, [])

  // Carregar escolas
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(d => setEscolas(Array.isArray(d) ? d : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Carregar dashboard
  const carregarDashboard = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (escolaId) params.set('escola_id', escolaId)

      const res = await fetch(`/api/admin/dashboard-gestor?${params}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        toast.error('Erro ao carregar dashboard')
      }
    } catch (e) {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (tipoUsuario) carregarDashboard()
  }, [tipoUsuario, escolaId, anoLetivo])

  const escolaNome = escolas.find(e => e.id === escolaId)?.nome

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dashboard do Gestor Escolar</h1>
                <p className="text-sm opacity-90">
                  Visão geral — {escolaNome || 'Todas as escolas'} — {anoLetivo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={anoLetivo}
                onChange={e => setAnoLetivo(e.target.value)}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                  <option key={a} value={a} className="text-gray-900">{a}</option>
                ))}
              </select>

              {tipoUsuario !== 'escola' && (
                <select
                  value={escolaId}
                  onChange={e => setEscolaId(e.target.value)}
                  className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white max-w-[200px]"
                >
                  <option value="" className="text-gray-900">Todas as escolas</option>
                  {escolas.map(e => (
                    <option key={e.id} value={e.id} className="text-gray-900">{e.nome}</option>
                  ))}
                </select>
              )}

              <button
                onClick={carregarDashboard}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando dashboard..." centered />
        ) : data ? (
          <>
            {/* Linha 1: Cards principais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <CardMetrica
                icon={Users} label="Alunos Ativos" valor={data.alunos.cursando}
                cor="blue" sublabel={`${data.alunos.total} total`}
              />
              <CardMetrica
                icon={GraduationCap} label="Turmas" valor={data.turmas.total}
                cor="indigo" sublabel={`${data.turmas.series} séries`}
              />
              <CardMetrica
                icon={TrendingUp} label="Média Geral" valor={data.notas.media_geral.toFixed(1)}
                cor={data.notas.media_geral >= 6 ? 'emerald' : 'red'}
                sublabel={`${data.notas.total_lancamentos} notas`}
              />
              <CardMetrica
                icon={CalendarCheck} label="Frequência" valor={data.frequencia.media_frequencia ? `${data.frequencia.media_frequencia}%` : '-'}
                cor={data.frequencia.media_frequencia >= 75 ? 'emerald' : 'red'}
                sublabel={`${data.frequencia.total_com_frequencia} alunos`}
              />
              <CardMetrica
                icon={ArrowLeftRight} label="Transferências"
                valor={data.transferencias.saidas + data.transferencias.entradas}
                cor="orange"
                sublabel={`${data.transferencias.saidas} saídas / ${data.transferencias.entradas} entradas`}
              />
              <CardMetrica
                icon={Users} label="Conselhos" valor={data.conselho.total_conselhos}
                cor="violet"
                sublabel={`${data.conselho.turmas_com_conselho} turmas`}
              />
            </div>

            {/* Linha 2: Situação dos Alunos + Frequência */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Situação dos Alunos */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> Situação dos Alunos
                </h3>
                <div className="space-y-3">
                  <BarraSituacao label="Cursando" valor={data.alunos.cursando} total={data.alunos.total} cor="bg-blue-500" />
                  <BarraSituacao label="Aprovados" valor={data.alunos.aprovados} total={data.alunos.total} cor="bg-emerald-500" />
                  <BarraSituacao label="Reprovados" valor={data.alunos.reprovados} total={data.alunos.total} cor="bg-red-500" />
                  <BarraSituacao label="Transferidos" valor={data.alunos.transferidos} total={data.alunos.total} cor="bg-orange-500" />
                  <BarraSituacao label="Abandono" valor={data.alunos.abandono} total={data.alunos.total} cor="bg-gray-500" />
                  {data.alunos.pcd > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {data.alunos.pcd} aluno(s) PCD
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Frequência */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4" /> Distribuição de Frequência
                </h3>
                {data.frequencia.total_com_frequencia > 0 ? (
                  <div className="space-y-3">
                    <BarraSituacao label="≥ 90% (Boa)" valor={data.frequencia.acima_90}
                      total={data.frequencia.total_com_frequencia} cor="bg-emerald-500" />
                    <BarraSituacao label="75-89% (Atenção)" valor={data.frequencia.entre_75_90}
                      total={data.frequencia.total_com_frequencia} cor="bg-yellow-500" />
                    <BarraSituacao label="< 75% (Crítico)" valor={data.frequencia.abaixo_75}
                      total={data.frequencia.total_com_frequencia} cor="bg-red-500" />
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between text-xs text-gray-500">
                      <span>Total de faltas registradas: <strong>{data.frequencia.total_faltas}</strong></span>
                      <span>Média: <strong className={data.frequencia.media_frequencia >= 75 ? 'text-emerald-600' : 'text-red-600'}>
                        {data.frequencia.media_frequencia}%
                      </strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Nenhuma frequência registrada</p>
                )}
              </div>
            </div>

            {/* Linha 3: Notas por Disciplina + Distribuição por Série */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Média por Disciplina */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Média por Disciplina
                </h3>
                {data.notas.por_disciplina.length > 0 ? (
                  <div className="space-y-3">
                    {data.notas.por_disciplina.map(d => (
                      <div key={d.disciplina} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 truncate" title={d.disciplina}>
                          {d.abreviacao || d.disciplina}
                        </span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-6 relative overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${d.media >= 6 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min((d.media / 10) * 100, 100)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                            {d.media.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 w-16 text-right">
                          {d.abaixo} abaixo
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between text-xs text-gray-500">
                      <span>{data.notas.abaixo_media} notas abaixo da média</span>
                      <span>{data.notas.em_recuperacao} em recuperação</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Nenhuma nota lançada</p>
                )}
              </div>

              {/* Distribuição por Série */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Alunos por Série
                </h3>
                {data.distribuicao_serie.length > 0 ? (
                  <div className="space-y-2">
                    {data.distribuicao_serie.map(s => {
                      const max = Math.max(...data.distribuicao_serie.map(x => x.total))
                      return (
                        <div key={s.serie} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 truncate">{s.serie}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 relative overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all"
                              style={{ width: `${max > 0 ? (s.total / max) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{s.total}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Sem dados</p>
                )}
              </div>
            </div>

            {/* Linha 4: Transferências + Conselho de Classe */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transferências */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4" /> Movimentação de Alunos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                    <TrendingDown className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.transferencias.saidas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saídas</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.transferencias.entradas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Entradas</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <span>Dentro do município: <strong>{data.transferencias.dentro_municipio}</strong></span>
                  <span>Fora do município: <strong>{data.transferencias.fora_municipio}</strong></span>
                </div>
                <div className="text-center">
                  <span className={`text-lg font-bold ${
                    data.transferencias.entradas - data.transferencias.saidas >= 0
                      ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    Saldo: {data.transferencias.entradas - data.transferencias.saidas >= 0 ? '+' : ''}
                    {data.transferencias.entradas - data.transferencias.saidas}
                  </span>
                </div>
              </div>

              {/* Conselho de Classe */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> Conselho de Classe
                </h3>
                {data.conselho.total_conselhos > 0 ? (
                  <>
                    <div className="flex items-center justify-center gap-6 py-2">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{data.conselho.total_conselhos}</p>
                        <p className="text-xs text-gray-500">Conselhos realizados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{data.conselho.total_pareceres}</p>
                        <p className="text-xs text-gray-500">Pareceres emitidos</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-gray-700 dark:text-gray-300">{data.conselho.aprovados} Aprovados</span>
                      </div>
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-gray-700 dark:text-gray-300">{data.conselho.reprovados} Reprovados</span>
                      </div>
                      <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
                        <RotateCcw className="w-4 h-4 text-orange-500" />
                        <span className="text-gray-700 dark:text-gray-300">{data.conselho.recuperacao} Recuperação</span>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">{data.conselho.progressao} Progressão</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Nenhum conselho de classe registrado</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Componentes auxiliares
// ============================================

function CardMetrica({ icon: Icon, label, valor, cor, sublabel }: {
  icon: any; label: string; valor: string | number; cor: string; sublabel?: string
}) {
  const cores: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
  }

  const coreTexto: Record<string, string> = {
    blue: 'text-blue-700 dark:text-blue-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    red: 'text-red-700 dark:text-red-300',
    orange: 'text-orange-700 dark:text-orange-300',
    indigo: 'text-indigo-700 dark:text-indigo-300',
    violet: 'text-violet-700 dark:text-violet-300',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
      <div className={`rounded-lg p-2 w-fit ${cores[cor] || cores.blue}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className={`text-2xl font-bold mt-2 ${coreTexto[cor] || coreTexto.blue}`}>{valor}</p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sublabel && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sublabel}</p>}
    </div>
  )
}

function BarraSituacao({ label, valor, total, cor }: {
  label: string; valor: number; total: number; cor: string
}) {
  const pct = total > 0 ? (valor / total) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400 w-28 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-4 relative overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">{valor}</span>
      <span className="text-[10px] text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}
