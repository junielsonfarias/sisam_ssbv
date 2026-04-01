'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, CheckCheck, AlertTriangle, Info, Clock, X } from 'lucide-react'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  prioridade: string
  lida: boolean
  criado_em: string
  escola_nome: string | null
}

interface NotificacoesResponse {
  notificacoes: Notificacao[]
  nao_lidas: number
}

const ICONE_POR_TIPO: Record<string, typeof Bell> = {
  periodo_aberto: Clock,
  resultados_publicados: Check,
  aviso_admin: Info,
  prazo_notas: AlertTriangle,
  infrequencia: AlertTriangle,
  nota_baixa: AlertTriangle,
  recuperacao: Info,
  geral: Bell,
}

const COR_PRIORIDADE: Record<string, string> = {
  urgente: 'border-l-red-500',
  alta: 'border-l-amber-500',
  media: 'border-l-blue-500',
  baixa: 'border-l-gray-400',
}

function formatarTempo(dataStr: string): string {
  const agora = new Date()
  const data = new Date(dataStr)
  const diffMs = agora.getTime() - data.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d`
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function NotificacoesBadge() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [aberto, setAberto] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const buscar = useCallback(async () => {
    try {
      const res = await fetch('/api/professor/notificacoes?limite=20')
      if (!res.ok) return
      const data: NotificacoesResponse = await res.json()
      setNotificacoes(data.notificacoes)
      setNaoLidas(data.nao_lidas)
    } catch {
      // silencioso — offline ou erro de rede
    }
  }, [])

  useEffect(() => {
    buscar()
    const interval = setInterval(buscar, 60000)
    return () => clearInterval(interval)
  }, [buscar])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    if (aberto) document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [aberto])

  const marcarComoLida = async (id: string) => {
    try {
      const res = await fetch('/api/professor/notificacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      if (res.ok) {
        setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
        setNaoLidas(prev => Math.max(0, prev - 1))
      }
    } catch { /* silencioso */ }
  }

  const marcarTodasComoLidas = async () => {
    try {
      const res = await fetch('/api/professor/notificacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marcar_todas: true }),
      })
      if (res.ok) {
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
        setNaoLidas(0)
      }
    } catch { /* silencioso */ }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botao do sino */}
      <button
        onClick={() => setAberto(!aberto)}
        className="relative p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
        aria-label={`Notificacoes${naoLidas > 0 ? ` (${naoLidas} nao lidas)` : ''}`}
        title="Notificacoes"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-800 animate-pulse">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-[60]">
          {/* Header do dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
              Notificacoes
            </h3>
            <div className="flex items-center gap-2">
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasComoLidas}
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Marcar todas</span>
                </button>
              )}
              <button
                onClick={() => setAberto(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de notificacoes */}
          <div className="overflow-y-auto max-h-[calc(70vh-52px)]">
            {notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                <Bell className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificacao</p>
              </div>
            ) : (
              notificacoes.map((n) => {
                const Icone = ICONE_POR_TIPO[n.tipo] || Bell
                const corBorda = COR_PRIORIDADE[n.prioridade] || COR_PRIORIDADE.media
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-l-4 ${corBorda} border-b border-gray-100 dark:border-slate-700/50 cursor-pointer transition-colors
                      ${n.lida
                        ? 'bg-white dark:bg-slate-800 opacity-70'
                        : 'bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    onClick={() => !n.lida && marcarComoLida(n.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !n.lida && marcarComoLida(n.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icone className={`w-4 h-4 ${n.lida ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${n.lida ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-white font-medium'}`}>
                        {n.titulo}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {n.mensagem}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {formatarTempo(n.criado_em)}
                        </span>
                        {n.escola_nome && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                            {n.escola_nome}
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.lida && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
