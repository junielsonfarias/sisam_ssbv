'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, MessageCircle, Send, User, Clock } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Thread {
  id: string; aluno_nome: string; serie: string; professor_nome: string
  ultima_mensagem: string; ultima_mensagem_em: string; ultimo_remetente: string
  nao_lido_responsavel: number
}

interface Mensagem {
  id: string; conteudo: string; remetente_tipo: string; remetente_nome: string
  lido: boolean; criado_em: string
}

function formatarHora(iso: string) {
  try {
    const d = new Date(iso)
    const agora = new Date()
    const diffDias = Math.floor((agora.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDias === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    if (diffDias === 1) return 'Ontem'
    if (diffDias < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

export default function MensagensResponsavel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const threadId = searchParams.get('thread_id')

  const [threads, setThreads] = useState<Thread[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [threadInfo, setThreadInfo] = useState<{ aluno_nome: string; serie: string; professor_nome: string } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [texto, setTexto] = useState('')
  const [totalNaoLido, setTotalNaoLido] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (threadId) carregarMensagens()
    else carregarThreads()
  }, [threadId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [mensagens])

  const carregarThreads = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/responsavel/mensagens', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
        setTotalNaoLido(data.total_nao_lido || 0)
      }
    } catch { /* offline */ } finally { setCarregando(false) }
  }

  const carregarMensagens = async () => {
    setCarregando(true)
    try {
      const res = await fetch(`/api/responsavel/mensagens?thread_id=${threadId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMensagens(data.mensagens || [])
        setThreadInfo(data.thread || null)
      }
    } catch { /* offline */ } finally { setCarregando(false) }
  }

  const enviarMensagem = async () => {
    if (!texto.trim() || !threadId || enviando) return
    setEnviando(true)
    try {
      const res = await fetch('/api/responsavel/mensagens', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, conteudo: texto.trim() }),
      })
      if (res.ok) {
        setTexto('')
        carregarMensagens()
      }
    } catch { /* offline */ } finally { setEnviando(false) }
  }

  if (carregando) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>

  // TELA DE CONVERSA
  if (threadId) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/responsavel/mensagens')} className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">Prof. {threadInfo?.professor_nome}</p>
              <p className="text-xs text-indigo-200 truncate">
                {threadInfo?.aluno_nome} — {threadInfo?.serie}
              </p>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {mensagens.map(m => (
            <div key={m.id} className={`flex ${m.remetente_tipo === 'responsavel' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                m.remetente_tipo === 'responsavel'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-md'
              }`}>
                {m.remetente_tipo === 'professor' && (
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">{m.remetente_nome}</p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.conteudo}</p>
                <p className={`text-[10px] mt-1 text-right ${
                  m.remetente_tipo === 'responsavel' ? 'text-indigo-200' : 'text-gray-400'
                }`}>{formatarHora(m.criado_em)}</p>
              </div>
            </div>
          ))}
          {mensagens.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-3 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-end gap-2">
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem() } }}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 resize-none border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
              style={{ maxHeight: '120px' }}
            />
            <button onClick={enviarMensagem} disabled={!texto.trim() || enviando}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:bg-gray-300 dark:disabled:bg-slate-600 transition-colors">
              {enviando ? <LoadingSpinner /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // LISTA DE THREADS
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="bg-indigo-600 text-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/responsavel/dashboard')} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <MessageCircle className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">Mensagens</h1>
            {totalNaoLido > 0 && <p className="text-xs text-indigo-200">{totalNaoLido} nao lida(s)</p>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {threads.length === 0 ? (
          <div className="text-center py-16 px-4">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">Nenhuma conversa ainda</p>
            <p className="text-sm text-gray-400 mt-1">O professor iniciara a conversa quando necessario.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {threads.map(t => (
              <button key={t.id}
                onClick={() => router.push(`/responsavel/mensagens?thread_id=${t.id}`)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 active:bg-gray-100 transition-colors text-left">
                <div className="shrink-0 w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${t.nao_lido_responsavel > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                      Prof. {t.professor_nome}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatarHora(t.ultima_mensagem_em)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.aluno_nome} — {t.serie}</p>
                  <p className={`text-xs truncate mt-0.5 ${t.nao_lido_responsavel > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'}`}>
                    {t.ultimo_remetente === 'responsavel' ? 'Voce: ' : ''}{t.ultima_mensagem}
                  </p>
                </div>
                {t.nao_lido_responsavel > 0 && (
                  <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                    {t.nao_lido_responsavel}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
