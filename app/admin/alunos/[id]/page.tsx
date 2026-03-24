'use client'

import ProtectedRoute from '@/components/protected-route'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, User, BookOpen, CalendarCheck, FileText,
  History, GraduationCap, Edit, AlertTriangle,
  ArrowLeftRight, TrendingUp, ScanFace
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import {
  SITUACAO_CORES,
  AbaDadosPessoais,
  AbaEscolar,
  AbaNotas,
  AbaFrequencia,
  AbaHistorico,
  AbaSisam,
  AbaEvolucao,
  AbaFacial,
} from './components'
import type { Aba } from './components'

export default function AlunoDetalhePage() {
  const toast = useToast()
  const router = useRouter()
  const params = useParams()
  const alunoId = params.id as string
  const { formatSerie } = useSeries()

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
    } catch (err) {
      console.error('[AlunoDetalhe] Erro ao carregar escolas para transferência:', (err as Error).message)
    }
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
    { id: 'sisam', label: 'Avaliações', icon: FileText },
    { id: 'evolucao', label: 'Evolução', icon: TrendingUp },
    { id: 'facial', label: 'Facial', icon: ScanFace },
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
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatSerie(aluno.serie) || '-'}</p>
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
        {abaAtiva === 'facial' && <AbaFacial alunoId={alunoId} alunoNome={aluno?.nome || ''} />}

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
                  {aluno.turma_codigo && <p className="text-gray-600 dark:text-gray-300">Turma: {aluno.turma_codigo} — {formatSerie(aluno.serie)}</p>}
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
