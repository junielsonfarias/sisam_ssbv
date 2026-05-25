'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  Plus,
  X,
  Loader2,
  Save,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
  Server,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Atualizacao {
  id: string
  status: string
  mensagem: string
  criado_em: string
  autor_nome: string | null
}

interface Incidente {
  id: string
  tipo: string
  severidade: string
  titulo: string
  descricao: string
  servicos_afetados: string[]
  status: string
  inicio_em: string
  resolucao_em: string | null
  criado_por_nome: string | null
  atualizacoes: Atualizacao[]
}

interface Saude {
  status_global: string
  servicos: Array<{ nome: string; status: string; latencia_ms?: number; mensagem?: string }>
  incidentes_recentes: number
  verificado_em: string
}

const TIPOS = [
  { v: 'incidente', label: 'Incidente' },
  { v: 'manutencao_planejada', label: 'Manutenção planejada' },
  { v: 'degradacao', label: 'Degradação' },
  { v: 'comunicado', label: 'Comunicado' },
]

const TIPO_BADGE: Record<string, string> = {
  incidente: 'bg-red-100 text-red-700',
  manutencao_planejada: 'bg-blue-100 text-blue-700',
  degradacao: 'bg-amber-100 text-amber-700',
  comunicado: 'bg-slate-100 text-slate-700',
}

const SEVERIDADE_BADGE: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  critica: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  investigando: 'Investigando',
  identificado: 'Identificado',
  monitorando: 'Monitorando',
  resolvido: 'Resolvido',
}

const STATUS_BADGE: Record<string, string> = {
  investigando: 'bg-red-100 text-red-700',
  identificado: 'bg-orange-100 text-orange-700',
  monitorando: 'bg-blue-100 text-blue-700',
  resolvido: 'bg-green-100 text-green-700',
}

const STATUS_GLOBAL_LABEL: Record<string, string> = {
  operacional: 'Operacional',
  degradado: 'Degradado',
  parcialmente_indisponivel: 'Parcialmente indisponível',
  indisponivel: 'Indisponível',
  manutencao: 'Manutenção',
}

const STATUS_GLOBAL_COLOR: Record<string, string> = {
  operacional: 'text-green-700 bg-green-50 border-green-200',
  degradado: 'text-amber-700 bg-amber-50 border-amber-200',
  parcialmente_indisponivel: 'text-orange-700 bg-orange-50 border-orange-200',
  indisponivel: 'text-red-700 bg-red-50 border-red-200',
  manutencao: 'text-blue-700 bg-blue-50 border-blue-200',
}

const SERVICOS_COMUNS = ['portal', 'api', 'banco', 'cache', 'email', 'mobile', 'reconhecimento_facial', 'pwa']

const incidenteVazio = {
  tipo: 'incidente',
  severidade: 'media',
  titulo: '',
  descricao: '',
  servicos_afetados: [] as string[],
  primeira_atualizacao: '',
}

function StatusPageAdmin() {
  const toast = useToast()
  const [incidentes, setIncidentes] = useState<Incidente[]>([])
  const [saude, setSaude] = useState<Saude | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [apenasAtivos, setApenasAtivos] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  const [modalCriar, setModalCriar] = useState(false)
  const [novoInc, setNovoInc] = useState(incidenteVazio)
  const [novoStatus, setNovoStatus] = useState('')
  const [novaMensagem, setNovaMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const p = new URLSearchParams()
      if (apenasAtivos) p.set('apenas_ativos', 'true')
      const [incRes, saudeRes] = await Promise.all([
        fetch(`/api/admin/status-page?${p}`),
        fetch('/api/admin/status-page?saude=true'),
      ])
      const incData = await incRes.json()
      const saudeData = await saudeRes.json()
      setIncidentes(incData.incidentes || [])
      setSaude(saudeData)
    } catch {
      toast.error('Erro ao carregar status')
    } finally {
      setCarregando(false)
    }
  }, [apenasAtivos, toast])

  useEffect(() => { carregar() }, [carregar])

  async function criarIncidente() {
    if (novoInc.titulo.trim().length < 2 || novoInc.descricao.trim().length < 5) {
      toast.error('Título (≥2 chars) e descrição (≥5 chars) são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        tipo: novoInc.tipo,
        severidade: novoInc.severidade,
        titulo: novoInc.titulo.trim(),
        descricao: novoInc.descricao.trim(),
        servicos_afetados: novoInc.servicos_afetados,
      }
      if (novoInc.primeira_atualizacao.trim()) body.primeira_atualizacao = novoInc.primeira_atualizacao.trim()

      const res = await fetch('/api/admin/status-page?acao=criar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Incidente criado — visível na Status Page pública')
      setModalCriar(false)
      setNovoInc(incidenteVazio)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function atualizarStatus(id: string) {
    if (!novoStatus || novaMensagem.trim().length < 5) {
      toast.error('Status e mensagem (≥5 chars) obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/status-page?acao=atualizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: novoStatus, mensagem: novaMensagem.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(novoStatus === 'resolvido' ? 'Incidente resolvido' : 'Atualização publicada')
      setNovoStatus('')
      setNovaMensagem('')
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-700 to-blue-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Status Page — Gestão de Incidentes</h1>
              <p className="text-indigo-100 text-sm">Comunicação pública sobre disponibilidade dos serviços</p>
            </div>
          </div>
          <button onClick={() => { setNovoInc(incidenteVazio); setModalCriar(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50">
            <Plus className="w-4 h-4" /> Novo incidente
          </button>
        </div>
      </div>

      {saude && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${STATUS_GLOBAL_COLOR[saude.status_global] || 'border-gray-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase font-bold opacity-70">Status global</p>
              <p className="text-2xl font-bold">{STATUS_GLOBAL_LABEL[saude.status_global] || saude.status_global}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70">Verificado em</p>
              <p className="text-sm">{new Date(saude.verificado_em).toLocaleString('pt-BR')}</p>
              <p className="text-xs opacity-70 mt-1">{saude.incidentes_recentes} incidentes resolvidos nos últimos 7d</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
            {saude.servicos.map((s) => (
              <div key={s.nome} className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 text-xs">{s.nome}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_GLOBAL_COLOR[s.status] || 'bg-gray-100'}`}>
                    {STATUS_GLOBAL_LABEL[s.status]}
                  </span>
                </div>
                {s.latencia_ms != null && <p className="text-xs text-gray-500 mt-1">{s.latencia_ms}ms</p>}
                {s.mensagem && <p className="text-xs text-gray-500 mt-1">{s.mensagem}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={apenasAtivos} onChange={(e) => setApenasAtivos(e.target.checked)} className="rounded text-indigo-600" />
          Apenas incidentes ativos
        </label>
      </div>

      {carregando ? <LoadingSpinner centered /> : incidentes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Nenhum incidente ativo</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Tudo funcionando normalmente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidentes.map((i) => (
            <div key={i.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => { setExpandido(expandido === i.id ? null : i.id); setNovoStatus(i.status); setNovaMensagem('') }} className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIPO_BADGE[i.tipo]}`}>{TIPOS.find((t) => t.v === i.tipo)?.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${SEVERIDADE_BADGE[i.severidade]}`}>{i.severidade}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{i.titulo}</p>
                    <p className="text-xs text-gray-500">
                      Início: {new Date(i.inicio_em).toLocaleString('pt-BR')}
                      {i.resolucao_em && ` • Resolvido em ${new Date(i.resolucao_em).toLocaleString('pt-BR')}`}
                      {i.criado_por_nome && ` • por ${i.criado_por_nome}`}
                    </p>
                    {(i.servicos_afetados?.length || 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {i.servicos_afetados.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {expandido === i.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {expandido === i.id && (
                <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Descrição:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{i.descricao}</p>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4">
                    {i.status !== 'resolvido' && (
                      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2">
                        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300">Publicar atualização</h4>
                        <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className={`${inputCls} w-full`}>
                          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <textarea value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} rows={3} placeholder="Mensagem pública (≥5 caracteres)" className={`${inputCls} w-full`} />
                        <button onClick={() => atualizarStatus(i.id)} disabled={salvando} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50">
                          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publicar
                        </button>
                      </div>
                    )}

                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
                      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3">Timeline pública</h4>
                      {i.atualizacoes?.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Sem atualizações</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {i.atualizacoes.map((a) => (
                            <div key={a.id} className="border-b border-gray-100 dark:border-slate-700 pb-2 last:border-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                                <span className="text-xs text-gray-400">{new Date(a.criado_em).toLocaleString('pt-BR')}</span>
                              </div>
                              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.mensagem}</p>
                              {a.autor_nome && <p className="text-xs text-gray-400 mt-1">— {a.autor_nome}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalCriar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Registrar novo incidente</h2>
              <button onClick={() => setModalCriar(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
                  <select value={novoInc.tipo} onChange={(e) => setNovoInc({ ...novoInc, tipo: e.target.value })} className={`${inputCls} w-full`}>
                    {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Severidade *</label>
                  <select value={novoInc.severidade} onChange={(e) => setNovoInc({ ...novoInc, severidade: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <input type="text" value={novoInc.titulo} onChange={(e) => setNovoInc({ ...novoInc, titulo: e.target.value })} placeholder="Resumo do problema" className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição * (≥5 chars)</label>
                <textarea value={novoInc.descricao} onChange={(e) => setNovoInc({ ...novoInc, descricao: e.target.value })} rows={3} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Serviços afetados</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICOS_COMUNS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNovoInc({ ...novoInc, servicos_afetados: toggleArr(novoInc.servicos_afetados, s) })}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        novoInc.servicos_afetados.includes(s)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Primeira atualização pública (opcional)</label>
                <textarea value={novoInc.primeira_atualizacao} onChange={(e) => setNovoInc({ ...novoInc, primeira_atualizacao: e.target.value })} rows={2} placeholder="Ex: Estamos investigando relatos de lentidão no portal..." className={`${inputCls} w-full`} />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalCriar(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={criarIncidente} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />} Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StatusPageAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <StatusPageAdmin />
    </ProtectedRoute>
  )
}
