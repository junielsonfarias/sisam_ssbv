'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/protected-route'
import { ArrowLeft, MessageCircle, Send, User, Plus, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Thread {
  id: string; aluno_id: string; responsavel_id: string
  aluno_nome: string; aluno_codigo: string; serie: string
  responsavel_nome: string; tipo_vinculo: string
  ultima_mensagem: string; ultima_mensagem_em: string; ultimo_remetente: string
  nao_lido_professor: number
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

export default function MensagensProfessorWrapper() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>}><MensagensProfessor /></Suspense>
}

function MensagensProfessor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const threadId = searchParams.get('thread_id')

  const [threads, setThreads] = useState<Thread[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [texto, setTexto] = useState('')
  const [totalNaoLido, setTotalNaoLido] = useState(0)
  const [threadAtual, setThreadAtual] = useState<Thread | null>(null)
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
      const res = await fetch('/api/professor/mensagens', { credentials: 'include' })
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
      const res = await fetch(`/api/professor/mensagens?thread_id=${threadId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMensagens(data.mensagens || [])
      }
      // Buscar info do thread da lista
      const tRes = await fetch('/api/professor/mensagens', { credentials: 'include' })
      if (tRes.ok) {
        const tData = await tRes.json()
        const t = (tData.threads || []).find((t: Thread) => t.id === threadId)
        if (t) setThreadAtual(t)
      }
    } catch { /* offline */ } finally { setCarregando(false) }
  }

  const enviarMensagem = async () => {
    if (!texto.trim() || !threadAtual || enviando) return
    setEnviando(true)
    try {
      const res = await fetch('/api/professor/mensagens', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: threadAtual.aluno_id,
          responsavel_id: threadAtual.responsavel_id,
          conteudo: texto.trim(),
        }),
      })
      if (res.ok) {
        setTexto('')
        carregarMensagens()
      }
    } catch { /* offline */ } finally { setEnviando(false) }
  }

  if (carregando) return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>
    </ProtectedRoute>
  )

  // TELA DE CONVERSA
  if (threadId) {
    return (
      <ProtectedRoute tiposPermitidos={['professor']}>
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
          <div className="bg-emerald-600 text-white px-4 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/professor/mensagens')} className="p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{threadAtual?.responsavel_nome || 'Responsavel'}</p>
                <p className="text-xs text-emerald-200 truncate">
                  {threadAtual?.aluno_nome} — {threadAtual?.serie}
                  {threadAtual?.tipo_vinculo ? ` (${threadAtual.tipo_vinculo})` : ''}
                </p>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {mensagens.map(m => (
              <div key={m.id} className={`flex ${m.remetente_tipo === 'professor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  m.remetente_tipo === 'professor'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-bl-md'
                }`}>
                  {m.remetente_tipo === 'responsavel' && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{m.remetente_nome}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.conteudo}</p>
                  <p className={`text-[10px] mt-1 text-right ${
                    m.remetente_tipo === 'professor' ? 'text-emerald-200' : 'text-gray-400'
                  }`}>{formatarHora(m.criado_em)}</p>
                </div>
              </div>
            ))}
            {mensagens.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">Inicie a conversa enviando uma mensagem</p>
              </div>
            )}
          </div>

          <div className="shrink-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-3 py-3"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-end gap-2">
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem() } }}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="flex-1 resize-none border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400"
                style={{ maxHeight: '120px' }}
              />
              <button onClick={enviarMensagem} disabled={!texto.trim() || enviando}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-emerald-600 text-white disabled:bg-gray-300 dark:disabled:bg-slate-600 transition-colors">
                {enviando ? <LoadingSpinner /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // LISTA DE THREADS
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="bg-emerald-600 text-white px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button onClick={() => router.push('/professor/dashboard')} className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <MessageCircle className="w-6 h-6" />
            <div className="flex-1">
              <h1 className="text-lg font-bold">Mensagens</h1>
              {totalNaoLido > 0 && <p className="text-xs text-emerald-200">{totalNaoLido} nao lida(s)</p>}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          {threads.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma conversa ainda</p>
              <p className="text-sm text-gray-400 mt-1">As conversas aparecerao quando voce enviar mensagem para um responsavel via perfil do aluno.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {threads.map(t => (
                <button key={t.id}
                  onClick={() => router.push(`/professor/mensagens?thread_id=${t.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 active:bg-gray-100 transition-colors text-left">
                  <div className="shrink-0 w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${t.nao_lido_professor > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {t.responsavel_nome}
                        {t.tipo_vinculo ? ` (${t.tipo_vinculo})` : ''}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatarHora(t.ultima_mensagem_em)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.aluno_nome} — {t.serie}</p>
                    <p className={`text-xs truncate mt-0.5 ${t.nao_lido_professor > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'}`}>
                      {t.ultimo_remetente === 'professor' ? 'Voce: ' : ''}{t.ultima_mensagem}
                    </p>
                  </div>
                  {t.nao_lido_professor > 0 && (
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                      {t.nao_lido_professor}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
