'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, AlertTriangle, Info, CheckCheck, Check } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Aviso {
  id: string
  fonte: 'disparo' | 'notificacao'
  tipo: string | null
  titulo: string | null
  mensagem: string | null
  prioridade: string | null
  lida: boolean
  criado_em: string
}

function fmtQuando(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function estiloDe(a: Aviso) {
  const t = (a.tipo || '').toLowerCase()
  const alta = (a.prioridade || '').toLowerCase() === 'alta'
  if (t.includes('infreq') || alta) {
    return { Icon: AlertTriangle, cor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  }
  return { Icon: Info, cor: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' }
}

export default function AvisosResponsavel() {
  const router = useRouter()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [marcando, setMarcando] = useState(false)

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    try {
      const res = await fetch('/api/responsavel/notificacoes', { credentials: 'include' })
      if (res.ok) { const d = await res.json(); setAvisos(d.avisos || []) }
    } catch { /* offline */ } finally {
      setCarregando(false)
    }
  }

  const marcarUm = async (a: Aviso) => {
    if (a.lida) return
    setAvisos(prev => prev.map(x => x.id === a.id ? { ...x, lida: true } : x))
    try {
      await fetch('/api/responsavel/notificacoes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ fonte: a.fonte, id: a.id }),
      })
    } catch { /* */ }
  }

  const marcarTodas = async () => {
    setMarcando(true)
    setAvisos(prev => prev.map(x => ({ ...x, lida: true })))
    try {
      await fetch('/api/responsavel/notificacoes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ todas: true }),
      })
    } catch { /* */ } finally { setMarcando(false) }
  }

  const naoLidos = avisos.filter(a => !a.lida).length

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner centered />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-gray-50 dark:from-slate-900 dark:to-slate-900 pb-12">
      {/* HERO */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-8">
          <button onClick={() => router.push('/responsavel/dashboard')}
            className="inline-flex items-center gap-1.5 text-indigo-100 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <Bell className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-indigo-200 text-[11px] font-medium uppercase tracking-wider">Central de avisos</p>
              <h1 className="text-xl font-bold leading-tight">{naoLidos > 0 ? `${naoLidos} não lido(s)` : 'Tudo em dia'}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-4 relative z-10 space-y-3">
        {avisos.length > 0 && naoLidos > 0 && (
          <div className="flex justify-end">
            <button onClick={marcarTodas} disabled={marcando}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700 active:scale-95 transition min-h-[40px]">
              <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
            </button>
          </div>
        )}

        {avisos.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7 text-gray-300 dark:text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum aviso por enquanto.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Alertas de frequência e comunicados da escola aparecem aqui.</p>
          </div>
        ) : (
          avisos.map(a => {
            const { Icon, cor, bg } = estiloDe(a)
            return (
              <button key={`${a.fonte}-${a.id}`} onClick={() => marcarUm(a)}
                className={`w-full text-left rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-colors ${
                  a.lida
                    ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-100 dark:ring-indigo-900/40'
                }`}>
                <div className={`w-10 h-10 rounded-xl ${bg} ${cor} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${a.lida ? 'font-medium text-gray-700 dark:text-gray-200' : 'font-bold text-gray-900 dark:text-white'}`}>
                      {a.titulo || 'Aviso'}
                    </p>
                    {!a.lida && <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1" aria-label="Não lido" />}
                    {a.lida && <Check className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />}
                  </div>
                  {a.mensagem && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{a.mensagem}</p>}
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">{fmtQuando(a.criado_em)}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
