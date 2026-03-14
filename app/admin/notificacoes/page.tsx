'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  Bell, AlertTriangle, BookOpen, ArrowLeftRight, Clock,
  RotateCcw, CheckCircle, Filter, RefreshCw, CheckCheck,
  ChevronDown, Play, Eye, EyeOff
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Notificacao {
  id: string; tipo: string; titulo: string; mensagem: string
  prioridade: string; lida: boolean; lida_em: string | null
  criado_em: string; escola_id: string | null; aluno_id: string | null
  turma_id: string | null; escola_nome: string | null
  aluno_nome: string | null; turma_codigo: string | null
}

const tipoConfig: Record<string, { icon: any; cor: string; label: string }> = {
  infrequencia: { icon: AlertTriangle, cor: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', label: 'Infrequência' },
  nota_baixa: { icon: BookOpen, cor: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400', label: 'Nota Baixa' },
  prazo_conselho: { icon: Clock, cor: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', label: 'Prazo Conselho' },
  transferencia: { icon: ArrowLeftRight, cor: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', label: 'Transferência' },
  fila_espera: { icon: Clock, cor: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Fila de Espera' },
  recuperacao: { icon: RotateCcw, cor: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400', label: 'Recuperação' },
  geral: { icon: Bell, cor: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400', label: 'Geral' }
}

const prioridadeCor: Record<string, string> = {
  baixa: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  media: 'bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  alta: 'bg-orange-200 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  urgente: 'bg-red-200 text-red-700 dark:bg-red-900/50 dark:text-red-300'
}

export default function NotificacoesPage() {
  const toast = useToast()

  const [tipoUsuario, setTipoUsuario] = useState('')
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [carregando, setCarregando] = useState(true)

  const [filtroTipo, setFiltroTipo] = useState('')
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('usuario')
    if (u) {
      const parsed = JSON.parse(u)
      setTipoUsuario(parsed.tipo_usuario)
    }
    carregarNotificacoes()
  }, [])

  useEffect(() => {
    carregarNotificacoes()
  }, [filtroTipo, apenasNaoLidas])

  const carregarNotificacoes = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (apenasNaoLidas) params.set('apenas_nao_lidas', 'true')
      params.set('limite', '100')

      const res = await fetch(`/api/admin/notificacoes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setNotificacoes(data.notificacoes)
        setNaoLidas(data.nao_lidas)
      }
    } catch {
      toast.error('Erro ao carregar notificações')
    } finally {
      setCarregando(false)
    }
  }

  const marcarComoLida = async (ids: string[]) => {
    try {
      const res = await fetch('/api/admin/notificacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      })
      if (res.ok) {
        setNotificacoes(prev => prev.map(n => ids.includes(n.id) ? { ...n, lida: true, lida_em: new Date().toISOString() } : n))
        setNaoLidas(prev => Math.max(0, prev - ids.length))
      }
    } catch {
      toast.error('Erro ao marcar')
    }
  }

  const marcarTodasLidas = async () => {
    try {
      const res = await fetch('/api/admin/notificacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marcar_todas: true })
      })
      if (res.ok) {
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
        setNaoLidas(0)
        toast.success('Todas marcadas como lidas')
      }
    } catch {
      toast.error('Erro ao marcar')
    }
  }

  const gerarNotificacoes = async (tipo: string) => {
    setGerando(true)
    try {
      const res = await fetch('/api/admin/notificacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_geracao: tipo })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.geradas} notificação(ões) gerada(s)`)
        carregarNotificacoes()
      } else {
        const err = await res.json()
        toast.error(err.mensagem || 'Erro ao gerar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setGerando(false)
    }
  }

  const formatarData = (data: string) => {
    const d = new Date(data)
    const agora = new Date()
    const diff = agora.getTime() - d.getTime()
    const minutos = Math.floor(diff / 60000)
    const horas = Math.floor(diff / 3600000)
    const dias = Math.floor(diff / 86400000)

    if (minutos < 60) return `${minutos}min atrás`
    if (horas < 24) return `${horas}h atrás`
    if (dias < 7) return `${dias}d atrás`
    return d.toLocaleDateString('pt-BR')
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2 relative">
                <Bell className="w-6 h-6" />
                {naoLidas > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {naoLidas > 99 ? '99+' : naoLidas}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">Notificações</h1>
                <p className="text-sm text-gray-300">
                  {naoLidas > 0 ? `${naoLidas} não lida(s)` : 'Todas as notificações lidas'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasLidas}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition"
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={carregarNotificacoes}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Gerar notificações (admin/técnico) */}
        {(tipoUsuario === 'administrador' || tipoUsuario === 'tecnico') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Play className="w-4 h-4" /> Gerar Alertas Automáticos
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { tipo: 'infrequencia', label: 'Infrequência (< 75%)', icon: AlertTriangle },
                { tipo: 'nota_baixa', label: 'Notas Abaixo da Média', icon: BookOpen },
                { tipo: 'recuperacao', label: 'Recuperação Pendente', icon: RotateCcw },
                { tipo: 'todas', label: 'Gerar Todas', icon: RefreshCw }
              ].map(item => (
                <button
                  key={item.tipo}
                  onClick={() => gerarNotificacoes(item.tipo)}
                  disabled={gerando}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    item.tipo === 'todas'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="border dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm dark:bg-slate-800 dark:text-white"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(tipoConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setApenasNaoLidas(!apenasNaoLidas)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              apenasNaoLidas
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {apenasNaoLidas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {apenasNaoLidas ? 'Apenas não lidas' : 'Todas'}
          </button>
        </div>

        {/* Lista de notificações */}
        {carregando ? (
          <LoadingSpinner text="Carregando notificações..." centered />
        ) : notificacoes.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma notificação encontrada</p>
            {(tipoUsuario === 'administrador' || tipoUsuario === 'tecnico') && (
              <p className="text-sm mt-1">Use os botões acima para gerar alertas automáticos</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {notificacoes.map(n => {
              const cfg = tipoConfig[n.tipo] || tipoConfig.geral
              const IconeTipo = cfg.icon
              return (
                <div
                  key={n.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-l-4 p-4 transition hover:shadow-md ${
                    n.lida
                      ? 'border-l-gray-300 dark:border-l-slate-600 opacity-70'
                      : n.prioridade === 'urgente' ? 'border-l-red-500'
                      : n.prioridade === 'alta' ? 'border-l-orange-500'
                      : 'border-l-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 flex-shrink-0 ${cfg.cor}`}>
                      <IconeTipo className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-semibold ${n.lida ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                          {n.titulo}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${prioridadeCor[n.prioridade]}`}>
                            {n.prioridade}
                          </span>
                          <span className="text-xs text-gray-400">{formatarData(n.criado_em)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.mensagem}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {n.escola_nome && <span>Escola: {n.escola_nome}</span>}
                        {n.aluno_nome && <span>Aluno: {n.aluno_nome}</span>}
                        {n.turma_codigo && <span>Turma: {n.turma_codigo}</span>}
                        {!n.lida && (
                          <button
                            onClick={() => marcarComoLida([n.id])}
                            className="ml-auto text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Marcar como lida
                          </button>
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
    </ProtectedRoute>
  )
}
