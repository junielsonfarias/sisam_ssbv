'use client'

import ProtectedRoute from '@/components/protected-route'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, User, BookOpen, CalendarCheck, FileText,
  History, GraduationCap, Edit, AlertTriangle, CheckCircle,
  XCircle, RotateCcw, ArrowLeftRight, Heart, Home, Phone,
  Shield, Users, Mail, MapPin, Clock, Printer, TrendingUp
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import dynamic from 'next/dynamic'

// Lazy load Recharts
const EvolucaoLineChart = dynamic(() => import('recharts').then(mod => {
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } = mod
  return function ChartWrapper({ data, linhas }: { data: any[]; linhas: { key: string; cor: string; nome: string; dash?: string }[] }) {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => value !== null ? value.toFixed(2) : '-'} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Média 5', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
          {linhas.map(l => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.nome} stroke={l.cor}
              strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}
              strokeDasharray={l.dash} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

const EvolucaoBarChart = dynamic(() => import('recharts').then(mod => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } = mod
  return function ChartWrapper({ data, barras }: { data: any[]; barras: { key: string; cor: string; nome: string }[] }) {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => value !== null ? value.toFixed(2) : '-'} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          {barras.map(b => (
            <Bar key={b.key} dataKey={b.key} name={b.nome} fill={b.cor} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

const EvolucaoRadarChart = dynamic(() => import('recharts').then(mod => {
  const { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } = mod
  return function ChartWrapper({ data, radares }: { data: any[]; radares: { key: string; cor: string; nome: string }[] }) {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid strokeOpacity={0.3} />
          <PolarAngleAxis dataKey="disciplina" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
          <Tooltip formatter={(value: number) => value !== null ? value.toFixed(2) : '-'} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          {radares.map(r => (
            <Radar key={r.key} dataKey={r.key} name={r.nome} stroke={r.cor} fill={r.cor} fillOpacity={0.15} strokeWidth={2} />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

const SITUACAO_CORES: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  cursando: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: 'Cursando', icon: CheckCircle },
  aprovado: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', label: 'Aprovado', icon: CheckCircle },
  reprovado: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: 'Reprovado', icon: XCircle },
  transferido: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: 'Transferido', icon: ArrowLeftRight },
  abandono: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Abandono', icon: AlertTriangle },
  remanejado: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Remanejado', icon: RotateCcw },
}

const PARECER_CORES: Record<string, { bg: string; text: string; label: string }> = {
  aprovado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aprovado' },
  reprovado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Reprovado' },
  recuperacao: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Recuperação' },
  progressao_parcial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Progressão Parcial' },
  sem_parecer: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Sem Parecer' },
}

type Aba = 'pessoal' | 'escolar' | 'notas' | 'frequencia' | 'historico' | 'sisam' | 'evolucao'

export default function AlunoDetalhePage() {
  const toast = useToast()
  const router = useRouter()
  const params = useParams()
  const alunoId = params.id as string

  const [aluno, setAluno] = useState<any>(null)
  const [dados, setDados] = useState<any>(null)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('pessoal')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Modal de transferência
  const [mostrarModalTransf, setMostrarModalTransf] = useState(false)
  const [tipoTransf, setTipoTransf] = useState<'dentro_municipio' | 'fora_municipio'>('dentro_municipio')
  const [escolaDestinoId, setEscolaDestinoId] = useState('')
  const [escolaDestinoNome, setEscolaDestinoNome] = useState('')
  const [dataTransf, setDataTransf] = useState(new Date().toISOString().split('T')[0])
  const [obsTransf, setObsTransf] = useState('')
  const [escolasLista, setEscolasLista] = useState<{ id: string; nome: string }[]>([])
  const [salvandoTransf, setSalvandoTransf] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}`)
      if (res.ok) {
        const data = await res.json()
        setAluno(data.aluno)
        setDados(data)
        setForm({ ...data.aluno })
      } else {
        toast.error('Aluno não encontrado')
        router.push('/admin/alunos')
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [alunoId])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async () => {
    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/alunos/${alunoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensagem || 'Salvo!')
        setEditando(false)
        await carregar()
      } else {
        toast.error(data.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const updateForm = (campo: string, valor: any) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const abrirModalTransferencia = async () => {
    setTipoTransf('dentro_municipio')
    setEscolaDestinoId('')
    setEscolaDestinoNome('')
    setDataTransf(new Date().toISOString().split('T')[0])
    setObsTransf('')
    setMostrarModalTransf(true)
    try {
      const res = await fetch('/api/admin/escolas')
      if (res.ok) {
        const data = await res.json()
        const lista = (data.escolas || data || [])
          .filter((e: any) => e.id !== aluno?.escola_id)
          .map((e: any) => ({ id: e.id, nome: e.nome }))
          .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
        setEscolasLista(lista)
      }
    } catch { /* silencia */ }
  }

  const executarTransferencia = async () => {
    if (!dataTransf) { toast.error('Informe a data'); return }
    if (tipoTransf === 'dentro_municipio' && !escolaDestinoId) { toast.error('Selecione a escola destino'); return }
    setSalvandoTransf(true)
    try {
      const body: any = { situacao: 'transferido', data: dataTransf, observacao: obsTransf || null, tipo_transferencia: tipoTransf }
      if (tipoTransf === 'dentro_municipio') body.escola_destino_id = escolaDestinoId
      else if (escolaDestinoNome.trim()) body.escola_destino_nome = escolaDestinoNome.trim()

      const res = await fetch(`/api/admin/alunos/${alunoId}/situacao`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) { toast.success('Transferência registrada'); setMostrarModalTransf(false); carregar() }
      else toast.error(data.mensagem || 'Erro')
    } catch { toast.error('Erro ao transferir') }
    finally { setSalvandoTransf(false) }
  }

  if (carregando) return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <LoadingSpinner text="Carregando dados do aluno..." centered />
    </ProtectedRoute>
  )

  if (!aluno || !dados) return null

  const sit = SITUACAO_CORES[aluno.situacao || 'cursando'] || SITUACAO_CORES.cursando
  const SitIcon = sit.icon
  const idade = aluno.data_nascimento ? Math.floor((Date.now() - new Date(aluno.data_nascimento).getTime()) / 31557600000) : null
  const iniciais = aluno.nome?.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?'

  const abas: { id: Aba; label: string; icon: any }[] = [
    { id: 'pessoal', label: 'Pessoal', icon: User },
    { id: 'escolar', label: 'Escolar', icon: GraduationCap },
    { id: 'notas', label: 'Notas', icon: BookOpen },
    { id: 'frequencia', label: 'Frequência', icon: CalendarCheck },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'sisam', label: 'SISAM', icon: FileText },
    { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
  ]

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <div className="space-y-6 print:space-y-4">
        {/* ==================== HERO HEADER ==================== */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg print:shadow-none">
          {/* Gradient background */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 dark:from-indigo-800 dark:via-indigo-900 dark:to-purple-900 px-6 pt-6 pb-20">
            <div className="flex items-center justify-between print:hidden">
              <button onClick={() => router.back()} className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <div className="flex items-center gap-2">
                {!editando ? (
                  <button onClick={() => setEditando(true)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition">
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                ) : (
                  <>
                    <button onClick={() => { setEditando(false); setForm({ ...aluno }) }}
                      className="px-4 py-2 text-white/80 hover:text-white border border-white/30 rounded-lg text-sm backdrop-blur-sm transition">
                      Cancelar
                    </button>
                    <button onClick={salvar} disabled={salvando}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition">
                      <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                  </>
                )}
                {aluno.situacao !== 'transferido' && (
                  <button onClick={abrirModalTransferencia}
                    className="flex items-center gap-2 bg-orange-500/80 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition">
                    <ArrowLeftRight className="w-4 h-4" /> Transferir
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile card overlapping */}
          <div className="bg-white dark:bg-slate-800 mx-4 sm:mx-6 -mt-14 rounded-xl shadow-md relative z-10 p-5">
            {/* Linha 1: Avatar + Nome + Badges */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0 -mt-10 sm:-mt-12 border-4 border-white dark:border-slate-800">
                {iniciais}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{aluno.nome}</h1>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sit.bg} ${sit.text}`}>
                    <SitIcon className="w-3 h-3" /> {sit.label}
                  </span>
                  {aluno.pcd && <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs font-medium">PCD</span>}
                  {aluno.bolsa_familia && <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">Bolsa Família</span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Código: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{aluno.codigo || '-'}</span>
                  {idade !== null && <span className="ml-3">{idade} anos</span>}
                </p>
              </div>
            </div>

            {/* Linha 2: Quick stats em grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Escola</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200" title={aluno.escola_nome}>{aluno.escola_nome}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Turma</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{aluno.turma_codigo || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Série</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{aluno.serie || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Ano Letivo</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{aluno.ano_letivo || '-'}</p>
              </div>
            </div>

            {/* Abas */}
            <div className="flex gap-1 mt-5 border-t border-gray-100 dark:border-slate-700 pt-3 overflow-x-auto -mx-5 px-5 print:hidden">
              {abas.map(aba => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    abaAtiva === aba.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <aba.icon className="w-4 h-4" /> {aba.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== CONTEÚDO DA ABA ==================== */}
        {abaAtiva === 'pessoal' && <AbaDadosPessoais aluno={aluno} form={form} editando={editando} updateForm={updateForm} />}
        {abaAtiva === 'escolar' && <AbaEscolar aluno={aluno} dados={dados} />}
        {abaAtiva === 'notas' && <AbaNotas dados={dados} />}
        {abaAtiva === 'frequencia' && <AbaFrequencia dados={dados} />}
        {abaAtiva === 'historico' && <AbaHistorico dados={dados} />}
        {abaAtiva === 'sisam' && <AbaSisam dados={dados} />}
        {abaAtiva === 'evolucao' && <AbaEvolucao alunoId={alunoId} />}

        {/* ==================== MODAL TRANSFERÊNCIA ==================== */}
        {mostrarModalTransf && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setMostrarModalTransf(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-4 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2"><ArrowLeftRight className="w-5 h-5 text-white" /></div>
                  <div><h3 className="text-lg font-bold text-white">Transferência</h3><p className="text-orange-100 text-sm truncate">{aluno.nome}</p></div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Vínculo atual</p>
                  <p className="font-medium text-gray-800 dark:text-white">{aluno.escola_nome}</p>
                  {aluno.turma_codigo && <p className="text-gray-600 dark:text-gray-300">Turma: {aluno.turma_codigo} — {aluno.serie}</p>}
                </div>
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">O aluno será desvinculado da escola e turma atuais.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['dentro_municipio', 'fora_municipio'].map(t => (
                      <button key={t} onClick={() => setTipoTransf(t as any)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${tipoTransf === t ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-slate-600 text-gray-500 hover:border-gray-300'}`}>
                        {t === 'dentro_municipio' ? 'Dentro do Município' : 'Fora do Município'}
                      </button>
                    ))}
                  </div>
                </div>
                {tipoTransf === 'dentro_municipio' ? (
                  <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Escola Destino *</label>
                    <select value={escolaDestinoId} onChange={e => setEscolaDestinoId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm">
                      <option value="">Selecione...</option>{escolasLista.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select></div>
                ) : (
                  <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Escola Destino (opcional)</label>
                    <input type="text" value={escolaDestinoNome} onChange={e => setEscolaDestinoNome(e.target.value)} placeholder="Nome da escola..." className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm" /></div>
                )}
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Data *</label>
                  <input type="date" value={dataTransf} onChange={e => setDataTransf(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Observação</label>
                  <textarea value={obsTransf} onChange={e => setObsTransf(e.target.value)} rows={2} maxLength={500} placeholder="Motivo..." className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm resize-none" /></div>
              </div>
              <div className="border-t dark:border-slate-700 px-5 py-4 flex justify-end gap-3">
                <button onClick={() => setMostrarModalTransf(false)} disabled={salvandoTransf} className="px-4 py-2.5 text-sm text-gray-600 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
                <button onClick={executarTransferencia} disabled={salvandoTransf || (tipoTransf === 'dentro_municipio' && !escolaDestinoId)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50">
                  <ArrowLeftRight className="w-4 h-4" /> {salvandoTransf ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Campo editável/visualização
// ============================================
function Campo({ label, valor, editando, campo, form, updateForm, tipo = 'text', opcoes, placeholder, icon: Icon }: any) {
  const displayVal = editando ? (form[campo] ?? '') : (valor ?? '-')

  if (editando) {
    if (opcoes) {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <select value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="">-</option>
            {opcoes.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )
    }
    if (tipo === 'boolean') {
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={!!form[campo]} onChange={e => updateForm(campo, e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          {label}
        </label>
      )
    }
    if (tipo === 'textarea') {
      return (
        <div className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <textarea value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)} rows={2} placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
      )
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <input type={tipo} value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)} placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <span className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-sm text-gray-900 dark:text-white">{typeof displayVal === 'boolean' ? (displayVal ? 'Sim' : 'Não') : (displayVal || '-')}</span>
      </div>
    </div>
  )
}

// ============================================
// Seção com título
// ============================================
function Secao({ titulo, icon: Icon, children, cor = 'indigo' }: { titulo: string; icon: any; children: React.ReactNode; cor?: string }) {
  const cores: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      <div className={`bg-gradient-to-r ${cores[cor] || cores.indigo} px-5 py-3 flex items-center gap-2`}>
        <Icon className="w-4 h-4 text-white" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{titulo}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ============================================
// Aba Dados Pessoais
// ============================================
function AbaDadosPessoais({ aluno, form, editando, updateForm }: any) {
  const generoOpcoes = [
    { value: 'masculino', label: 'Masculino' }, { value: 'feminino', label: 'Feminino' },
    { value: 'outro', label: 'Outro' }, { value: 'nao_informado', label: 'Não informado' },
  ]
  const racaOpcoes = [
    { value: 'branca', label: 'Branca' }, { value: 'preta', label: 'Preta' },
    { value: 'parda', label: 'Parda' }, { value: 'amarela', label: 'Amarela' },
    { value: 'indigena', label: 'Indígena' }, { value: 'nao_declarada', label: 'Não declarada' },
  ]

  return (
    <div className="space-y-6">
      <Secao titulo="Identificação" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Nome Completo" valor={aluno.nome} campo="nome" editando={editando} form={form} updateForm={updateForm} icon={User} />
          <Campo label="Data de Nascimento" valor={aluno.data_nascimento?.split('T')[0]} campo="data_nascimento" tipo="date" editando={editando} form={form} updateForm={updateForm} icon={CalendarCheck} />
          <Campo label="Gênero" valor={generoOpcoes.find(o => o.value === aluno.genero)?.label} campo="genero" editando={editando} form={form} updateForm={updateForm} opcoes={generoOpcoes} />
          <Campo label="Raça/Cor" valor={racaOpcoes.find(o => o.value === aluno.raca_cor)?.label} campo="raca_cor" editando={editando} form={form} updateForm={updateForm} opcoes={racaOpcoes} />
          <Campo label="Naturalidade" valor={aluno.naturalidade} campo="naturalidade" editando={editando} form={form} updateForm={updateForm} icon={MapPin} />
          <Campo label="Nacionalidade" valor={aluno.nacionalidade} campo="nacionalidade" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="CPF" valor={aluno.cpf} campo="cpf" editando={editando} form={form} updateForm={updateForm} icon={Shield} />
          <Campo label="RG" valor={aluno.rg} campo="rg" editando={editando} form={form} updateForm={updateForm} icon={Shield} />
          <Campo label="Certidão de Nascimento" valor={aluno.certidao_nascimento} campo="certidao_nascimento" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Cartão SUS" valor={aluno.sus} campo="sus" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="NIS" valor={aluno.nis} campo="nis" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="PCD" valor={aluno.pcd} campo="pcd" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </Secao>

      <Secao titulo="Família e Responsável" icon={Users} cor="purple">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Nome da Mãe" valor={aluno.nome_mae} campo="nome_mae" editando={editando} form={form} updateForm={updateForm} icon={Heart} />
          <Campo label="Nome do Pai" valor={aluno.nome_pai} campo="nome_pai" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Responsável" valor={aluno.responsavel} campo="responsavel" editando={editando} form={form} updateForm={updateForm} icon={Users} />
          <Campo label="Telefone" valor={aluno.telefone_responsavel} campo="telefone_responsavel" editando={editando} form={form} updateForm={updateForm} icon={Phone} />
        </div>
      </Secao>

      <Secao titulo="Endereço" icon={Home} cor="blue">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <div className="sm:col-span-2">
            <Campo label="Endereço" valor={aluno.endereco} campo="endereco" editando={editando} form={form} updateForm={updateForm} icon={MapPin} />
          </div>
          <Campo label="Bairro" valor={aluno.bairro} campo="bairro" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Cidade" valor={aluno.cidade} campo="cidade" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="CEP" valor={aluno.cep} campo="cep" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </Secao>

      <Secao titulo="Programas Sociais e Saúde" icon={Heart} cor="red">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Bolsa Família" valor={aluno.bolsa_familia} campo="bolsa_familia" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Projeto Contraturno" valor={aluno.projeto_contraturno} campo="projeto_contraturno" tipo="boolean" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Nome do Projeto" valor={aluno.projeto_nome} campo="projeto_nome" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Tipo de Deficiência" valor={aluno.tipo_deficiencia} campo="tipo_deficiencia" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Alergias" valor={aluno.alergia} campo="alergia" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Medicação" valor={aluno.medicacao} campo="medicacao" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
          <Campo label="Observações" valor={aluno.observacoes} campo="observacoes" tipo="textarea" editando={editando} form={form} updateForm={updateForm} />
        </div>
      </Secao>
    </div>
  )
}

// ============================================
// Aba Escolar
// ============================================
function AbaEscolar({ aluno, dados }: any) {
  return (
    <div className="space-y-6">
      <Secao titulo="Dados Escolares Atuais" icon={GraduationCap} cor="emerald">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Escola" valor={aluno.escola_nome} icon={GraduationCap} editando={false} />
          <Campo label="Polo" valor={aluno.polo_nome} icon={MapPin} editando={false} />
          <Campo label="Turma" valor={`${aluno.turma_codigo || '-'} ${aluno.turma_nome ? `(${aluno.turma_nome})` : ''}`} editando={false} />
          <Campo label="Série" valor={aluno.serie} editando={false} />
          <Campo label="Ano Letivo" valor={aluno.ano_letivo} icon={CalendarCheck} editando={false} />
          <Campo label="Data Matrícula" valor={aluno.data_matricula?.split('T')[0]} icon={Clock} editando={false} />
          <Campo label="Situação" valor={SITUACAO_CORES[aluno.situacao || 'cursando']?.label} editando={false} />
          <Campo label="Código" valor={aluno.codigo} icon={Shield} editando={false} />
        </div>
      </Secao>

      {dados.historico_turmas?.length > 0 && (
        <Secao titulo="Histórico de Matrículas" icon={History} cor="blue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {['Ano', 'Série', 'Turma', 'Escola', 'Matrícula', 'Situação'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {dados.historico_turmas.map((h: any, i: number) => {
                  const s = SITUACAO_CORES[h.situacao || 'cursando'] || SITUACAO_CORES.cursando
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 px-3 font-medium">{h.ano_letivo}</td>
                      <td className="py-2.5 px-3">{h.serie || '-'}</td>
                      <td className="py-2.5 px-3">{h.turma_codigo || '-'}</td>
                      <td className="py-2.5 px-3">{h.escola_nome}</td>
                      <td className="py-2.5 px-3 text-gray-500">{h.data_matricula?.split('T')[0] || '-'}</td>
                      <td className="py-2.5 px-3"><span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-full text-xs font-medium`}>{s.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Secao>
      )}

      {dados.conselho?.length > 0 && (
        <Secao titulo="Pareceres do Conselho" icon={Users} cor="purple">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dados.conselho.map((c: any, i: number) => {
              const p = PARECER_CORES[c.parecer] || PARECER_CORES.sem_parecer
              return (
                <div key={i} className={`${p.bg} dark:bg-opacity-20 ${p.text} px-4 py-3 rounded-lg`}>
                  <div className="font-semibold text-sm">{c.periodo_nome} ({c.ano_letivo})</div>
                  <div className="text-xs mt-0.5">{p.label}</div>
                  {c.observacao && <div className="text-xs opacity-75 mt-1 italic">{c.observacao}</div>}
                </div>
              )
            })}
          </div>
        </Secao>
      )}
    </div>
  )
}

// ============================================
// Aba Notas
// ============================================
function AbaNotas({ dados }: any) {
  const [anoAberto, setAnoAberto] = useState<string | null>(null)
  const anos = Object.keys(dados.notas || {}).sort().reverse()

  if (anos.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma nota escolar lançada</p>
    </div>
  )

  // Calcular resumo por ano
  const resumoPorAno = (ano: string) => {
    const notas = dados.notas[ano] || []
    const porDisc: Record<string, any[]> = {}
    for (const n of notas) {
      const key = n.disciplina || n.abreviacao
      if (!porDisc[key]) porDisc[key] = []
      porDisc[key].push(n)
    }
    const disciplinas = Object.keys(porDisc).length
    const todasFinais = Object.values(porDisc).map((periodos: any[]) => {
      const finais = periodos.map(p => p.nota_final).filter((f: any) => f !== null && f !== undefined) as number[]
      return finais.length > 0 ? finais.reduce((a, b) => a + b, 0) / finais.length : null
    }).filter((m): m is number => m !== null)
    const mediaGeral = todasFinais.length > 0 ? todasFinais.reduce((a, b) => a + b, 0) / todasFinais.length : null
    const abaixo = todasFinais.filter(m => m < 6).length
    const totalFaltas = notas.reduce((s: number, n: any) => s + (n.faltas || 0), 0)
    return { disciplinas, mediaGeral, abaixo, totalFaltas, totalDisc: todasFinais.length }
  }

  // Modal: organizar notas do ano selecionado
  const notasDoAno = anoAberto ? dados.notas[anoAberto] || [] : []
  const porDiscModal: Record<string, any[]> = {}
  for (const n of notasDoAno) {
    const key = n.disciplina || n.abreviacao
    if (!porDiscModal[key]) porDiscModal[key] = []
    porDiscModal[key].push(n)
  }
  // Ordenar períodos
  const disciplinasOrdenadas = Object.entries(porDiscModal).sort(([, a], [, b]) => {
    const ordemA = a[0]?.periodo_numero || 0
    const ordemB = b[0]?.periodo_numero || 0
    return ordemA - ordemB
  })

  return (
    <div className="space-y-4">
      {/* Cards de anos letivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {anos.map(ano => {
          const r = resumoPorAno(ano)
          return (
            <button
              key={ano}
              onClick={() => setAnoAberto(ano)}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-600 transition-all p-5 text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-lg p-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60 transition">
                    <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ano}</h3>
                </div>
                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition">Ver detalhes →</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Disciplinas</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{r.disciplinas}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Média Geral</p>
                  <p className={`text-sm font-bold ${r.mediaGeral !== null ? (r.mediaGeral >= 6 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                    {r.mediaGeral !== null ? r.mediaGeral.toFixed(1) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Abaixo da Média</p>
                  <p className={`text-sm font-bold ${r.abaixo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.abaixo} disciplina(s)</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Total Faltas</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{r.totalFaltas}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Modal com notas detalhadas */}
      {anoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAnoAberto(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-lg font-bold text-white">Notas Escolares — {anoAberto}</h2>
                  <p className="text-emerald-100 text-sm">{Object.keys(porDiscModal).length} disciplina(s)</p>
                </div>
              </div>
              <button onClick={() => setAnoAberto(null)} className="text-white/80 hover:text-white p-1">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-700">
                      <th className="border dark:border-slate-600 px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300" rowSpan={2}>Disciplina</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>1º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>2º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>3º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>4º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-2 text-center font-semibold text-blue-700 dark:text-blue-400" rowSpan={2}>Média Final</th>
                      <th className="border dark:border-slate-600 px-2 py-2 text-center font-semibold text-gray-700 dark:text-gray-300" rowSpan={2}>Faltas</th>
                      <th className="border dark:border-slate-600 px-2 py-2 text-center font-semibold text-gray-700 dark:text-gray-300" rowSpan={2}>Situação</th>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-slate-700/50">
                      {[1,2,3,4].map(b => (
                        <React.Fragment key={b}>
                          <th className="border dark:border-slate-600 px-1 py-1 text-center text-[10px] font-medium text-gray-500">Av</th>
                          <th className="border dark:border-slate-600 px-1 py-1 text-center text-[10px] font-medium text-orange-500">Rec</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(porDiscModal).map(([disc, periodos]) => {
                      // Organizar por período (1-4)
                      const bimestres: Record<number, any> = {}
                      for (const p of periodos) {
                        bimestres[p.periodo_numero || 0] = p
                      }
                      // Calcular média final das notas_final
                      const notasFinais = periodos
                        .map((p: any) => p.nota_final)
                        .filter((f: any) => f !== null && f !== undefined) as number[]
                      const mediaFinal = notasFinais.length > 0
                        ? notasFinais.reduce((a, b) => a + b, 0) / notasFinais.length
                        : null
                      const totalFaltas = periodos.reduce((s: number, p: any) => s + (p.faltas || 0), 0)
                      const aprovado = mediaFinal !== null && mediaFinal >= 6

                      return (
                        <tr key={disc} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="border dark:border-slate-600 px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{disc}</td>
                          {[1,2,3,4].map(b => {
                            const bim = bimestres[b]
                            return (
                              <React.Fragment key={b}>
                                <td className={`border dark:border-slate-600 px-1 py-2 text-center text-xs ${bim?.nota !== null && bim?.nota !== undefined ? '' : 'text-gray-300'}`}>
                                  {bim?.nota !== null && bim?.nota !== undefined ? bim.nota.toFixed(1) : '-'}
                                </td>
                                <td className={`border dark:border-slate-600 px-1 py-2 text-center text-xs ${bim?.nota_recuperacao !== null && bim?.nota_recuperacao !== undefined ? 'text-orange-600 font-medium' : 'text-gray-300'}`}>
                                  {bim?.nota_recuperacao !== null && bim?.nota_recuperacao !== undefined ? bim.nota_recuperacao.toFixed(1) : '-'}
                                </td>
                              </React.Fragment>
                            )
                          })}
                          <td className={`border dark:border-slate-600 px-2 py-2 text-center font-bold text-sm ${
                            mediaFinal === null ? 'text-gray-400' : mediaFinal >= 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
                          </td>
                          <td className="border dark:border-slate-600 px-2 py-2 text-center text-gray-600 dark:text-gray-400">{totalFaltas}</td>
                          <td className="border dark:border-slate-600 px-2 py-2 text-center">
                            {mediaFinal !== null ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                aprovado
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {aprovado ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {aprovado ? 'Aprovado' : 'Reprovado'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumo no rodapé do modal */}
              {(() => {
                const r = resumoPorAno(anoAberto)
                return (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Média Geral:</span>
                      <span className={`ml-1 font-bold ${r.mediaGeral !== null ? (r.mediaGeral >= 6 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                        {r.mediaGeral !== null ? r.mediaGeral.toFixed(1) : '-'}
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Disciplinas abaixo:</span>
                      <span className={`ml-1 font-bold ${r.abaixo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.abaixo}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Total faltas:</span>
                      <span className="ml-1 font-bold text-gray-800 dark:text-gray-200">{r.totalFaltas}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Situação geral:</span>
                      <span className={`ml-1 font-bold ${r.abaixo === 0 && r.mediaGeral !== null ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.mediaGeral === null ? '-' : r.abaixo === 0 ? 'Aprovado' : 'Em recuperação'}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Aba Frequência
// ============================================
function AbaFrequencia({ dados }: any) {
  // Frequência pode vir como array flat ou já agrupado por ano
  const freqData = dados.frequencia || {}
  const freqPorAno: Record<string, any[]> = Array.isArray(freqData)
    ? freqData.reduce((acc: Record<string, any[]>, f: any) => {
        const ano = f.ano_letivo || 'Sem ano'
        if (!acc[ano]) acc[ano] = []
        acc[ano].push(f)
        return acc
      }, {})
    : freqData
  const anos = Object.keys(freqPorAno).sort().reverse()

  if (anos.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma frequência registrada</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {anos.map(ano => (
        <Secao key={ano} titulo={`Frequência — ${ano}`} icon={CalendarCheck} cor="blue">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {['Período', 'Dias Letivos', 'Presenças', 'Faltas', 'Frequência'].map(h => (
                    <th key={h} className={`py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ${h === 'Período' ? 'text-left' : 'text-center'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {(freqPorAno[ano] || []).map((f: any, i: number) => {
                  const pct = f.percentual_frequencia ?? f.percentual ?? null
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 px-3 font-medium">{f.periodo_nome || f.periodo || `${f.numero || ''}º Bimestre`}</td>
                      <td className="py-2.5 px-3 text-center">{f.dias_letivos || '-'}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">{f.presencas || '-'}</td>
                      <td className="py-2.5 px-3 text-center text-red-600 font-medium">{f.faltas || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${pct !== null && pct < 75 ? 'text-red-600' : pct !== null && pct < 90 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          {pct !== null ? `${parseFloat(pct).toFixed(1)}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Secao>
      ))}
    </div>
  )
}

// ============================================
// Aba Histórico
// ============================================
function AbaHistorico({ dados }: any) {
  const historico = dados.historico_situacao || []

  if (historico.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma movimentação registrada</p>
    </div>
  )

  return (
    <Secao titulo="Histórico de Movimentações" icon={History} cor="orange">
      <div className="relative">
        {/* Timeline */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700"></div>
        <div className="space-y-4">
          {historico.map((h: any, i: number) => {
            const sitNova = SITUACAO_CORES[h.situacao || h.situacao_nova] || SITUACAO_CORES.cursando
            const sitField = h.situacao || h.situacao_nova
            const dataField = h.data || h.data_mudanca
            const obsField = h.observacao || h.motivo
            return (
              <div key={i} className="relative pl-10">
                <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${sitField === 'transferido' ? 'bg-orange-500' : sitField === 'cursando' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sitNova.bg} ${sitNova.text}`}>{sitNova.label}</span>
                    <span className="text-xs text-gray-400">{dataField ? new Date(dataField).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  {h.situacao_anterior && <p className="text-xs text-gray-500">De: <span className="capitalize">{h.situacao_anterior}</span></p>}
                  {obsField && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{obsField}</p>}
                  {(h.escola_destino_nome || h.escola_destino_ref_nome) && (
                    <p className="text-xs text-gray-500 mt-0.5">Destino: {h.escola_destino_nome || h.escola_destino_ref_nome}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Secao>
  )
}

// ============================================
// Aba SISAM
// ============================================
function AbaSisam({ dados }: any) {
  const sisam = dados.sisam || []

  if (sisam.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhum resultado SISAM encontrado</p>
    </div>
  )

  const getNivelCor = (nivel: string | null) => {
    if (!nivel) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', label: '-' }
    const n = nivel.toUpperCase()
    if (n === 'N1' || n === 'INSUFICIENTE') return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: nivel }
    if (n === 'N2' || n === 'BASICO') return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: nivel }
    if (n === 'N3' || n === 'ADEQUADO') return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: nivel }
    if (n === 'N4' || n === 'AVANCADO') return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: nivel }
    return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600', label: nivel }
  }

  return (
    <div className="space-y-6">
      {sisam.map((r: any, i: number) => {
        // Montar disciplinas
        interface DisciplinaInfo {
          disciplina: string; abrev: string; media: number | null; nivel: string | null
          acertos: number | null; total: number; percentual: number
        }
        const disciplinas: DisciplinaInfo[] = []

        if (r.avalia_lp && r.qtd_questoes_lp) {
          disciplinas.push({
            disciplina: 'Língua Portuguesa', abrev: 'LP',
            media: r.nota_lp != null ? parseFloat(r.nota_lp) : null,
            nivel: r.nivel_lp || null,
            acertos: r.total_acertos_lp != null ? parseInt(r.total_acertos_lp) : null,
            total: r.qtd_questoes_lp,
            percentual: r.total_acertos_lp != null ? (parseInt(r.total_acertos_lp) / r.qtd_questoes_lp) * 100 : 0
          })
        }
        if (r.avalia_mat && r.qtd_questoes_mat) {
          disciplinas.push({
            disciplina: 'Matemática', abrev: 'MAT',
            media: r.nota_mat != null ? parseFloat(r.nota_mat) : null,
            nivel: r.nivel_mat || null,
            acertos: r.total_acertos_mat != null ? parseInt(r.total_acertos_mat) : null,
            total: r.qtd_questoes_mat,
            percentual: r.total_acertos_mat != null ? (parseInt(r.total_acertos_mat) / r.qtd_questoes_mat) * 100 : 0
          })
        }
        if (r.avalia_ch && r.qtd_questoes_ch) {
          disciplinas.push({
            disciplina: 'Ciências Humanas', abrev: 'CH',
            media: r.nota_ch != null ? parseFloat(r.nota_ch) : null,
            nivel: null,
            acertos: r.total_acertos_ch != null ? parseInt(r.total_acertos_ch) : null,
            total: r.qtd_questoes_ch,
            percentual: r.total_acertos_ch != null ? (parseInt(r.total_acertos_ch) / r.qtd_questoes_ch) * 100 : 0
          })
        }
        if (r.avalia_cn && r.qtd_questoes_cn) {
          disciplinas.push({
            disciplina: 'Ciências da Natureza', abrev: 'CN',
            media: r.nota_cn != null ? parseFloat(r.nota_cn) : null,
            nivel: null,
            acertos: r.total_acertos_cn != null ? parseInt(r.total_acertos_cn) : null,
            total: r.qtd_questoes_cn,
            percentual: r.total_acertos_cn != null ? (parseInt(r.total_acertos_cn) / r.qtd_questoes_cn) * 100 : 0
          })
        }
        if (r.tem_producao_textual && r.qtd_itens_producao) {
          disciplinas.push({
            disciplina: 'Produção Textual', abrev: 'PROD',
            media: r.nota_producao != null ? parseFloat(r.nota_producao) : null,
            nivel: r.nivel_prod || null,
            acertos: null,
            total: r.qtd_itens_producao,
            percentual: r.nota_producao != null ? (parseFloat(r.nota_producao) / r.qtd_itens_producao) * 100 : 0
          })
        }

        const mediaAluno = r.media_aluno != null ? parseFloat(r.media_aluno) : null
        const nivelAluno = getNivelCor(r.nivel_aluno)
        const serieNum = r.serie ? r.serie.replace(/[^0-9]/g, '') : ''
        const isAnosFinais = ['6','7','8','9'].includes(serieNum) || r.tipo_avaliacao === 'anos_finais'

        return (
          <Secao key={i} titulo={`SISAM ${r.serie || ''} — ${r.ano_letivo || ''}`} icon={FileText}>
            {/* Cards por disciplina */}
            {disciplinas.length > 0 ? (
              <div className={`grid gap-4 ${disciplinas.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {disciplinas.map(d => {
                  const nivelInfo = getNivelCor(d.nivel)
                  return (
                    <div key={d.abrev} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition">
                      {/* Header da disciplina */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{d.disciplina}</h4>
                        {d.nivel && (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${nivelInfo.bg} ${nivelInfo.text}`}>
                            {nivelInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Barra de progresso */}
                      <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${d.percentual >= 70 ? 'bg-emerald-500' : d.percentual >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(d.percentual, 100)}%` }}
                        />
                      </div>

                      {/* Métricas */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-center">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Média</p>
                          <p className={`text-lg font-bold ${d.media !== null && d.media >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {d.media !== null ? d.media.toFixed(2) : '-'}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-center">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {d.abrev === 'PROD' ? 'Pontuação' : 'Acertos'}
                          </p>
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {d.acertos !== null ? d.acertos : (d.media !== null ? d.media.toFixed(0) : '-')}
                            <span className="text-xs text-gray-400 font-normal">/{d.total}</span>
                          </p>
                        </div>
                      </div>

                      {/* Percentual */}
                      <div className="mt-2 text-center">
                        <span className={`text-sm font-bold ${d.percentual >= 70 ? 'text-emerald-600' : d.percentual >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {d.percentual.toFixed(0)}% de aproveitamento
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sem dados de disciplinas</p>
            )}

            {/* Resumo geral */}
            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className={`grid gap-4 ${isAnosFinais ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {/* Média Geral */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-xl px-4 py-3 text-center">
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 uppercase font-semibold">Média Geral</p>
                  <p className={`text-2xl font-bold ${mediaAluno !== null && mediaAluno >= 5 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mediaAluno !== null ? mediaAluno.toFixed(1) : '-'}
                  </p>
                </div>

                {/* Nível do Aluno — só para anos iniciais */}
                {!isAnosFinais && (
                  <div className={`rounded-xl px-4 py-3 text-center ${nivelAluno.bg}`}>
                    <p className="text-[10px] uppercase font-semibold opacity-70">Nível Geral</p>
                    <p className={`text-2xl font-bold ${nivelAluno.text}`}>
                      {r.nivel_aluno || '-'}
                    </p>
                  </div>
                )}

                {/* Presença */}
                <div className={`rounded-xl px-4 py-3 text-center ${
                  r.presenca === 'P' || r.presenca === 'p'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <p className="text-[10px] uppercase font-semibold opacity-70">Presença</p>
                  <p className={`text-lg font-bold ${r.presenca === 'P' || r.presenca === 'p' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.presenca === 'P' || r.presenca === 'p' ? 'Presente' : r.presenca === 'F' || r.presenca === 'f' ? 'Faltou' : '-'}
                  </p>
                </div>

                {/* Questões */}
                <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Questões</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {r.total_questoes_respondidas || '-'}
                    <span className="text-xs text-gray-400 font-normal">/{r.total_questoes_esperadas || '-'}</span>
                  </p>
                </div>
              </div>
            </div>
          </Secao>
        )
      })}
    </div>
  )
}

// ============================================
// Aba Evolução
// ============================================
function AbaEvolucao({ alunoId }: { alunoId: string }) {
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        const res = await fetch(`/api/admin/alunos/${alunoId}/evolucao`)
        if (res.ok) setDados(await res.json())
      } catch { /* silencia */ }
      finally { setCarregando(false) }
    }
    carregar()
  }, [alunoId])

  if (carregando) return <LoadingSpinner text="Carregando evolução..." centered />

  if (!dados || dados.anos?.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhum dado de evolução encontrado</p>
    </div>
  )

  const { anos, sisam, escola, frequencia, comparativo } = dados

  const getNivelCor = (nivel: string | null) => {
    if (!nivel) return ''
    const n = nivel.toUpperCase()
    if (n === 'N1') return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
    if (n === 'N2') return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
    if (n === 'N3') return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
    if (n === 'N4') return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
    return 'text-gray-600 bg-gray-100'
  }

  const getNotaCor = (nota: number | null) => {
    if (nota === null) return 'text-gray-400'
    if (nota >= 7) return 'text-emerald-600 dark:text-emerald-400'
    if (nota >= 5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getTendencia = (valores: (number | null)[]) => {
    const nums = valores.filter((v): v is number => v !== null)
    if (nums.length < 2) return null
    const diff = nums[nums.length - 1] - nums[nums.length - 2]
    if (diff > 0.5) return { icon: '↑', cor: 'text-emerald-600', label: `+${diff.toFixed(1)}` }
    if (diff < -0.5) return { icon: '↓', cor: 'text-red-600', label: diff.toFixed(1) }
    return { icon: '→', cor: 'text-gray-500', label: '0.0' }
  }

  // Tendências LP e MAT
  const tendLP = getTendencia(comparativo.lp.map((c: any) => c.sisam))
  const tendMAT = getTendencia(comparativo.mat.map((c: any) => c.sisam))

  return (
    <div className="space-y-6">
      {/* ===== COMPARATIVO SISAM x ESCOLA ===== */}
      <Secao titulo="Comparativo SISAM x Avaliação Escolar" icon={TrendingUp}>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-slate-600">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase" rowSpan={2}>Ano</th>
                <th className="text-center py-1 px-3 text-xs font-semibold text-indigo-600 uppercase border-b border-indigo-200" colSpan={2}>Língua Portuguesa</th>
                <th className="text-center py-1 px-3 text-xs font-semibold text-emerald-600 uppercase border-b border-emerald-200" colSpan={2}>Matemática</th>
              </tr>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-center py-1 px-2 text-[10px] font-medium text-indigo-500">SISAM</th>
                <th className="text-center py-1 px-2 text-[10px] font-medium text-indigo-500">Escola</th>
                <th className="text-center py-1 px-2 text-[10px] font-medium text-emerald-500">SISAM</th>
                <th className="text-center py-1 px-2 text-[10px] font-medium text-emerald-500">Escola</th>
              </tr>
            </thead>
            <tbody>
              {anos.map((ano: string, i: number) => {
                const lp = comparativo.lp[i]
                const mat = comparativo.mat[i]
                return (
                  <tr key={ano} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">{ano}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(lp?.sisam)}`}>{lp?.sisam?.toFixed(1) ?? '-'}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(lp?.escola)}`}>{lp?.escola?.toFixed(1) ?? '-'}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(mat?.sisam)}`}>{mat?.sisam?.toFixed(1) ?? '-'}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(mat?.escola)}`}>{mat?.escola?.toFixed(1) ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Tendências */}
        {(tendLP || tendMAT) && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs">
            {tendLP && (
              <span className={tendLP.cor}>
                LP SISAM: {tendLP.icon} {tendLP.label} pts
              </span>
            )}
            {tendMAT && (
              <span className={tendMAT.cor}>
                MAT SISAM: {tendMAT.icon} {tendMAT.label} pts
              </span>
            )}
          </div>
        )}
      </Secao>

      {/* ===== GRÁFICOS DE EVOLUÇÃO ===== */}
      {anos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Linha: SISAM x Escola LP */}
          <Secao titulo="Evolução LP — SISAM x Escola" icon={TrendingUp} cor="indigo">
            <EvolucaoLineChart
              data={comparativo.lp.map((c: any) => ({ ano: c.ano, 'SISAM LP': c.sisam, 'Escola LP': c.escola }))}
              linhas={[
                { key: 'SISAM LP', cor: '#6366f1', nome: 'SISAM' },
                { key: 'Escola LP', cor: '#8b5cf6', nome: 'Escola', dash: '5 5' },
              ]}
            />
          </Secao>

          {/* Gráfico Linha: SISAM x Escola MAT */}
          <Secao titulo="Evolução MAT — SISAM x Escola" icon={TrendingUp} cor="emerald">
            <EvolucaoLineChart
              data={comparativo.mat.map((c: any) => ({ ano: c.ano, 'SISAM MAT': c.sisam, 'Escola MAT': c.escola }))}
              linhas={[
                { key: 'SISAM MAT', cor: '#10b981', nome: 'SISAM' },
                { key: 'Escola MAT', cor: '#14b8a6', nome: 'Escola', dash: '5 5' },
              ]}
            />
          </Secao>

          {/* Gráfico Barras: Média SISAM por ano */}
          <Secao titulo="Média SISAM por Avaliação" icon={FileText} cor="purple">
            {(() => {
              const dadosBarras = anos.flatMap((ano: string) =>
                (sisam[ano] || []).map((r: any) => ({
                  ano: `${ano}${r.tipo !== 'unica' ? ` (${r.tipo === 'diagnostica' ? 'Diag' : 'Final'})` : ''}`,
                  LP: r.nota_lp,
                  MAT: r.nota_mat,
                  ...(r.avalia_ch ? { CH: r.nota_ch } : {}),
                  ...(r.avalia_cn ? { CN: r.nota_cn } : {}),
                }))
              )
              const barras = [
                { key: 'LP', cor: '#6366f1', nome: 'LP' },
                { key: 'MAT', cor: '#10b981', nome: 'MAT' },
              ]
              // Adicionar CH/CN se existem em algum ano
              if (dadosBarras.some((d: any) => d.CH !== undefined)) barras.push({ key: 'CH', cor: '#f59e0b', nome: 'CH' })
              if (dadosBarras.some((d: any) => d.CN !== undefined)) barras.push({ key: 'CN', cor: '#ef4444', nome: 'CN' })
              return <EvolucaoBarChart data={dadosBarras} barras={barras} />
            })()}
          </Secao>

          {/* Gráfico Radar: Último ano — comparativo SISAM x Escola */}
          <Secao titulo="Radar — Último Ano" icon={BookOpen} cor="blue">
            {(() => {
              const ultimoAno = anos[anos.length - 1]
              const sisamUltimo = (sisam[ultimoAno] || []).slice(-1)[0]
              const escolaUltimo = escola[ultimoAno] || []

              const radarData: any[] = []

              if (sisamUltimo?.avalia_lp || escolaUltimo.find((e: any) => e.codigo === 'LP')) {
                const escolaLP = escolaUltimo.find((e: any) => e.codigo === 'LP' || e.abreviacao === 'LP' || e.disciplina?.toLowerCase().includes('portuguesa'))
                radarData.push({ disciplina: 'LP', SISAM: sisamUltimo?.nota_lp ?? 0, Escola: escolaLP?.media_final ?? 0 })
              }
              if (sisamUltimo?.avalia_mat || escolaUltimo.find((e: any) => e.codigo === 'MAT')) {
                const escolaMAT = escolaUltimo.find((e: any) => e.codigo === 'MAT' || e.abreviacao === 'MAT' || e.disciplina?.toLowerCase().includes('matem'))
                radarData.push({ disciplina: 'MAT', SISAM: sisamUltimo?.nota_mat ?? 0, Escola: escolaMAT?.media_final ?? 0 })
              }
              if (sisamUltimo?.avalia_ch) {
                const escolaCH = escolaUltimo.find((e: any) => e.disciplina?.toLowerCase().includes('human') || e.codigo === 'HIS')
                radarData.push({ disciplina: 'CH', SISAM: sisamUltimo?.nota_ch ?? 0, Escola: escolaCH?.media_final ?? 0 })
              }
              if (sisamUltimo?.avalia_cn) {
                const escolaCN = escolaUltimo.find((e: any) => e.disciplina?.toLowerCase().includes('natureza') || e.codigo === 'CIE')
                radarData.push({ disciplina: 'CN', SISAM: sisamUltimo?.nota_cn ?? 0, Escola: escolaCN?.media_final ?? 0 })
              }

              if (radarData.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sem dados para comparação</p>

              return (
                <>
                  <EvolucaoRadarChart
                    data={radarData}
                    radares={[
                      { key: 'SISAM', cor: '#6366f1', nome: 'SISAM' },
                      { key: 'Escola', cor: '#10b981', nome: 'Escola' },
                    ]}
                  />
                  <p className="text-[10px] text-gray-400 text-center mt-1">Ano: {ultimoAno}</p>
                </>
              )
            })()}
          </Secao>
        </div>
      )}

      {/* ===== EVOLUÇÃO SISAM ANO A ANO ===== */}
      <Secao titulo="Resultados SISAM por Avaliação" icon={FileText} cor="purple">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {['Ano', 'Avaliação', 'Série', 'LP', 'MAT', 'CH', 'CN', 'Prod', 'Média', 'Nível', 'Presença'].map(h => (
                  <th key={h} className={`py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase ${h === 'Ano' || h === 'Avaliação' || h === 'Série' ? 'text-left' : 'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anos.flatMap((ano: string) =>
                (sisam[ano] || []).map((r: any, idx: number) => (
                  <tr key={`${ano}-${idx}`} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 px-2 font-semibold text-gray-800 dark:text-gray-200">{ano}</td>
                    <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-xs max-w-[120px] truncate" title={r.avaliacao}>{r.avaliacao}</td>
                    <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{r.serie}</td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_lp)}`}>
                      {r.avalia_lp ? (r.nota_lp?.toFixed(1) ?? '-') : <span className="text-gray-300">—</span>}
                      {r.nivel_lp && <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${getNivelCor(r.nivel_lp)}`}>{r.nivel_lp}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_mat)}`}>
                      {r.avalia_mat ? (r.nota_mat?.toFixed(1) ?? '-') : <span className="text-gray-300">—</span>}
                      {r.nivel_mat && <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${getNivelCor(r.nivel_mat)}`}>{r.nivel_mat}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_ch)}`}>
                      {r.avalia_ch ? (r.nota_ch?.toFixed(1) ?? '-') : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_cn)}`}>
                      {r.avalia_cn ? (r.nota_cn?.toFixed(1) ?? '-') : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`py-2 px-2 text-center ${getNotaCor(r.nota_producao)}`}>
                      {r.tem_producao_textual ? (r.nota_producao?.toFixed(1) ?? '-') : <span className="text-gray-300">—</span>}
                      {r.nivel_prod && <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${getNivelCor(r.nivel_prod)}`}>{r.nivel_prod}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.media)}`}>{r.media?.toFixed(1) ?? '-'}</td>
                    <td className="py-2 px-2 text-center">
                      {r.nivel_aluno ? <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${getNivelCor(r.nivel_aluno)}`}>{r.nivel_aluno}</span> : '-'}
                    </td>
                    <td className={`py-2 px-2 text-center text-xs font-medium ${r.presenca === 'P' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.presenca === 'P' ? 'P' : r.presenca === 'F' ? 'F' : '-'}
                    </td>
                  </tr>
                ))
              )}
              {anos.every((ano: string) => !sisam[ano] || sisam[ano].length === 0) && (
                <tr><td colSpan={11} className="py-6 text-center text-gray-400">Sem resultados SISAM</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* ===== NOTAS ESCOLARES ANO A ANO ===== */}
      <Secao titulo="Médias Escolares por Ano" icon={BookOpen} cor="emerald">
        <div className="overflow-x-auto -mx-5 px-5">
          {(() => {
            // Coletar todas as disciplinas únicas
            const todasDisc = new Set<string>()
            for (const ano of anos) {
              for (const d of (escola[ano] || [])) {
                todasDisc.add(d.abreviacao || d.codigo || d.disciplina)
              }
            }
            const discs = [...todasDisc]

            if (discs.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Sem notas escolares registradas</p>

            return (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="py-2 px-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Ano</th>
                    {discs.map(d => (
                      <th key={d} className="py-2 px-2 text-center text-[10px] font-semibold text-gray-500 uppercase">{d}</th>
                    ))}
                    <th className="py-2 px-2 text-center text-[10px] font-semibold text-gray-500 uppercase">Freq.</th>
                  </tr>
                </thead>
                <tbody>
                  {anos.map((ano: string) => {
                    const escolaAno = escola[ano] || []
                    const freq = frequencia[ano]
                    return (
                      <tr key={ano} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-2 font-semibold text-gray-800 dark:text-gray-200">{ano}</td>
                        {discs.map(d => {
                          const disc = escolaAno.find((e: any) => (e.abreviacao || e.codigo || e.disciplina) === d)
                          return (
                            <td key={d} className={`py-2.5 px-2 text-center font-bold ${getNotaCor(disc?.media_final ?? null)}`}>
                              {disc?.media_final?.toFixed(1) ?? '-'}
                            </td>
                          )
                        })}
                        <td className={`py-2.5 px-2 text-center font-medium ${freq?.media_frequencia >= 75 ? 'text-emerald-600' : freq?.media_frequencia ? 'text-red-600' : 'text-gray-400'}`}>
                          {freq?.media_frequencia ? `${freq.media_frequencia}%` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          })()}
        </div>
      </Secao>

      {/* ===== FREQUÊNCIA ANO A ANO ===== */}
      {Object.keys(frequencia).length > 0 && (
        <Secao titulo="Frequência por Ano" icon={CalendarCheck} cor="blue">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {anos.map((ano: string) => {
              const freq = frequencia[ano]
              if (!freq) return null
              const pct = freq.media_frequencia || 0
              return (
                <div key={ano} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-center">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">{ano}</p>
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-slate-600" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" strokeWidth="3" strokeDasharray={`${pct}, 100`}
                        className={pct >= 90 ? 'stroke-emerald-500' : pct >= 75 ? 'stroke-yellow-500' : 'stroke-red-500'}
                        strokeLinecap="round" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${pct >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="text-emerald-600">{freq.total_presencas}P</span> / <span className="text-red-500">{freq.total_faltas}F</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Secao>
      )}
    </div>
  )
}
