'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Search,
  X,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  Download,
  Ban,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface Solicitacao {
  id: string
  usuario_id: string
  usuario_nome: string | null
  usuario_email: string | null
  tipo_usuario: string | null
  tipo: 'exportar' | 'portabilidade' | 'exclusao'
  status: 'pendente' | 'concluida' | 'cancelada'
  motivo: string | null
  prevista_para: string | null
  concluida_em: string | null
  criada_em: string
  ip_solicitacao: string | null
}

interface Estatisticas {
  pendentes: string
  vencendo: string
  atrasadas: string
  concluidas_mes: string
  total_exclusao: string
  total_exportacao: string
  total_portabilidade: string
}

const TIPO_LABEL: Record<string, string> = {
  exportar: 'Exportação de dados',
  portabilidade: 'Portabilidade',
  exclusao: 'Exclusão',
}

const TIPO_BADGE: Record<string, string> = {
  exportar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  portabilidade: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  exclusao: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const STATUS_BADGE: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  concluida: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelada: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
}

function LgpdAdmin() {
  const toast = useToast()
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [observacao, setObservacao] = useState('')
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (busca.trim().length > 2) params.set('busca', busca.trim())
      const [solRes, statsRes] = await Promise.all([
        fetch(`/api/admin/lgpd?${params}`),
        fetch('/api/admin/lgpd?estatisticas=true'),
      ])
      const solData = await solRes.json()
      const statsData = await statsRes.json()
      setSolicitacoes(solData.solicitacoes || [])
      setEstatisticas(statsData.estatisticas || null)
    } catch {
      toast.error('Erro ao carregar solicitações LGPD')
    } finally {
      setCarregando(false)
    }
  }, [filtroStatus, filtroTipo, busca, toast])

  useEffect(() => {
    const t = setTimeout(() => carregar(), 300)
    return () => clearTimeout(t)
  }, [carregar])

  const [modalConfirmacao, setModalConfirmacao] = useState<{ id: string; acao: 'cancelar' | 'concluir' | 'executar_exclusao' } | null>(null)

  function abrirConfirmacaoAcao(id: string, acao: 'cancelar' | 'concluir' | 'executar_exclusao') {
    setModalConfirmacao({ id, acao })
  }

  async function processarAcao(id: string, acao: 'cancelar' | 'concluir' | 'executar_exclusao') {
    setProcessando(true)
    try {
      const res = await fetch(`/api/admin/lgpd?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, observacao: observacao.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      const data = await res.json()
      toast.success(data.mensagem)
      setObservacao('')
      setExpandido(null)
      setModalConfirmacao(null)
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setProcessando(false)
    }
  }

  async function baixarDados(usuarioId: string) {
    try {
      const res = await fetch(`/api/admin/lgpd?exportar_dados=${usuarioId}`)
      if (!res.ok) throw new Error('Erro ao gerar')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data.dados, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lgpd-titular-${usuarioId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Dados gerados — entregue ao titular')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function diasParaPrazo(prevista: string | null): { dias: number; vencida: boolean } | null {
    if (!prevista) return null
    const diff = Math.ceil((new Date(prevista).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return { dias: diff, vencida: diff < 0 }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">LGPD — Solicitações de Titulares</h1>
            <p className="text-violet-100 text-sm">Lei 13.709/2018 — Atendimento em até 15 dias úteis</p>
          </div>
        </div>
      </div>

      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{estatisticas.pendentes}</p>
            <p className="text-xs text-amber-600">Pendentes</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{estatisticas.vencendo}</p>
            <p className="text-xs text-orange-600">Vencendo em 3 dias</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{estatisticas.atrasadas}</p>
            <p className="text-xs text-red-600">Atrasadas</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{estatisticas.concluidas_mes}</p>
            <p className="text-xs text-green-600">Concluídas no mês</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail do titular..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={inputCls}>
            <option value="">Todos os tipos</option>
            <option value="exportar">Exportação</option>
            <option value="portabilidade">Portabilidade</option>
            <option value="exclusao">Exclusão</option>
          </select>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : solicitacoes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma solicitação encontrada com os filtros atuais</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map((s) => {
            const prazo = diasParaPrazo(s.prevista_para)
            return (
              <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => { setExpandido(expandido === s.id ? null : s.id); setObservacao('') }}
                  className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIPO_BADGE[s.tipo]}`}>{TIPO_LABEL[s.tipo]}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                        {s.status === 'pendente' && prazo && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${prazo.vencida ? 'bg-red-100 text-red-700' : prazo.dias <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {prazo.vencida ? `${Math.abs(prazo.dias)}d atrasado` : `${prazo.dias}d restantes`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.usuario_nome || 'Titular removido'}</p>
                      <p className="text-xs text-gray-500">
                        {s.usuario_email} {s.tipo_usuario && `• ${s.tipo_usuario}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Solicitada em {new Date(s.criada_em).toLocaleString('pt-BR')}
                        {s.prevista_para && ` • Prazo: ${new Date(s.prevista_para).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    {expandido === s.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {expandido === s.id && (
                  <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50 space-y-4">
                    {s.motivo && (
                      <div>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Motivo / contexto:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s.motivo}</p>
                      </div>
                    )}
                    {s.ip_solicitacao && <p className="text-xs text-gray-400">IP de origem: {s.ip_solicitacao}</p>}

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Observação para registro (opcional)</label>
                      <textarea
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        rows={2}
                        placeholder="Como o pedido foi atendido, contato com o titular, etc."
                        className={`${inputCls} w-full`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {s.usuario_id && (
                        <button
                          onClick={() => baixarDados(s.usuario_id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4" /> Baixar dados do titular
                        </button>
                      )}

                      {s.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => abrirConfirmacaoAcao(s.id, 'concluir')}
                            disabled={processando}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                          >
                            {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Marcar concluída
                          </button>
                          {s.tipo === 'exclusao' && (
                            <button
                              onClick={() => abrirConfirmacaoAcao(s.id, 'executar_exclusao')}
                              disabled={processando}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                            >
                              {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                              Executar exclusão
                            </button>
                          )}
                          <button
                            onClick={() => abrirConfirmacaoAcao(s.id, 'cancelar')}
                            disabled={processando}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-300 disabled:opacity-50"
                          >
                            <Ban className="w-4 h-4" /> Cancelar
                          </button>
                        </>
                      )}
                    </div>

                    {s.status === 'concluida' && s.concluida_em && (
                      <p className="text-xs text-green-700 dark:text-green-300">
                        ✓ Concluída em {new Date(s.concluida_em).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalConfirmacao && (() => {
        const CFG: Record<typeof modalConfirmacao.acao, { titulo: string; mensagem: string; variant: 'danger' | 'warning' | 'info'; textoConfirmar: string }> = {
          cancelar: {
            titulo: 'Cancelar solicitação LGPD?',
            mensagem: 'O titular NÃO terá seu pedido atendido. Esta ação é registrada na auditoria e pode ter implicações legais (Lei 13.709/2018, art. 18).',
            variant: 'danger',
            textoConfirmar: 'Cancelar pedido',
          },
          concluir: {
            titulo: 'Marcar como concluída?',
            mensagem: 'Indica que o pedido foi atendido (export entregue, dados corrigidos, etc). Registra na auditoria.',
            variant: 'info',
            textoConfirmar: 'Marcar concluída',
          },
          executar_exclusao: {
            titulo: 'Executar exclusão dos dados?',
            mensagem: 'Marca a exclusão como executada. A exclusão real dos dados ocorre via cron job. Esta ação é registrada na auditoria e é IRREVERSÍVEL.',
            variant: 'danger',
            textoConfirmar: 'Executar exclusão',
          },
        }
        const cfg = CFG[modalConfirmacao.acao]
        return (
          <ConfirmModal
            aberto
            titulo={cfg.titulo}
            mensagem={cfg.mensagem}
            variant={cfg.variant}
            textoConfirmar={cfg.textoConfirmar}
            processando={processando}
            onConfirmar={() => processarAcao(modalConfirmacao.id, modalConfirmacao.acao)}
            onFechar={() => setModalConfirmacao(null)}
          />
        )
      })()}
    </div>
  )
}

export default function LgpdAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LgpdAdmin />
    </ProtectedRoute>
  )
}
