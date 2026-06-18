'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, MessageCircle, Send, User } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyCard } from '@/components/ui/empty-card'

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

function iniciaisDe(nome?: string) {
  return (nome || '').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function MensagensResponsavelWrapper() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>}><MensagensResponsavel /></Suspense>
}

function MensagensResponsavel() {
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

  // ===================== TELA DE CONVERSA =====================
  if (threadId) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-b from-indigo-50/40 to-gray-50 dark:from-slate-900 dark:to-slate-900">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white px-4 py-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/responsavel/mensagens')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/15 active:bg-white/25 transition" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/30 flex items-center justify-center text-sm font-bold shrink-0">
              {iniciaisDe(threadInfo?.professor_nome)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">Prof. {threadInfo?.professor_nome}</p>
              <p className="text-xs text-indigo-200 truncate">{threadInfo?.aluno_nome} · {threadInfo?.serie}</p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {mensagens.map(m => {
            const meu = m.remetente_tipo === 'responsavel'
            return (
              <div key={m.id} className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  meu ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-100 dark:border-slate-700 rounded-bl-md'
                }`}>
                  {!meu && <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">{m.remetente_nome}</p>}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.conteudo}</p>
                  <p className={`text-[10px] mt-1 text-right ${meu ? 'text-indigo-200' : 'text-gray-400'}`}>{formatarHora(m.criado_em)}</p>
                </div>
              </div>
            )
          })}
          {mensagens.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
            </div>
          )}
        </div>

        <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-3 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-end gap-2">
            <textarea
              value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem() } }}
              placeholder="Digite sua mensagem..." rows={1}
              className="flex-1 resize-none border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
              style={{ maxHeight: '120px' }}
            />
            <button onClick={enviarMensagem} disabled={!texto.trim() || enviando}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:bg-gray-300 dark:disabled:bg-slate-600 hover:bg-indigo-700 active:scale-95 transition">
              {enviando ? <LoadingSpinner /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===================== LISTA DE THREADS =====================
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-gray-50 dark:from-slate-900 dark:to-slate-900 pb-10">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-7">
          <button onClick={() => router.push('/responsavel/dashboard')}
            className="inline-flex items-center gap-1.5 text-indigo-100 hover:text-white text-sm font-medium min-h-[44px] active:scale-95 transition">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-12 h-12 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Mensagens</h1>
              <p className="text-indigo-200 text-sm">{totalNaoLido > 0 ? `${totalNaoLido} não lida(s)` : 'Conversas com os professores'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-3 relative z-10 space-y-2.5">
        {threads.length === 0 ? (
          <EmptyCard Icon={MessageCircle} titulo="Nenhuma conversa ainda" texto="O professor iniciará a conversa quando necessário." />
        ) : (
          threads.map(t => (
            <button key={t.id}
              onClick={() => router.push(`/responsavel/mensagens?thread_id=${t.id}`)}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/40 active:scale-[0.99] transition text-left">
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${t.nao_lido_responsavel > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>
                    Prof. {t.professor_nome}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">{formatarHora(t.ultima_mensagem_em)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.aluno_nome} · {t.serie}</p>
                <p className={`text-xs truncate mt-0.5 ${t.nao_lido_responsavel > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'}`}>
                  {t.ultimo_remetente === 'responsavel' ? 'Você: ' : ''}{t.ultima_mensagem}
                </p>
              </div>
              {t.nao_lido_responsavel > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                  {t.nao_lido_responsavel}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
