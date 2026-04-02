'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, BookOpen, CalendarCheck, Bell, LogOut, GraduationCap, TrendingUp, AlertTriangle, MessageCircle, Calendar, ClipboardList } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Filho {
  id: string
  nome: string
  codigo: string
  serie: string
  ano_letivo: string
  situacao: string
  escola_nome: string
  turma_codigo: string | null
  turma_nome: string | null
  tipo_vinculo: string
}

export default function DashboardResponsavel() {
  const router = useRouter()
  const [filhos, setFilhos] = useState<Filho[]>([])
  const [carregando, setCarregando] = useState(true)
  const [nomeUsuario, setNomeUsuario] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('educatec_offline_user')
    if (user) {
      try { setNomeUsuario(JSON.parse(user).nome || '') } catch { /* */ }
    }
    carregarFilhos()
  }, [])

  const carregarFilhos = async () => {
    try {
      const res = await fetch('/api/responsavel/filhos', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setFilhos(data.filhos || [])
      }
    } catch { /* offline */ } finally {
      setCarregando(false)
    }
  }

  const sair = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    localStorage.removeItem('educatec_offline_user')
    router.push('/login')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner centered />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2.5">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Portal do Responsavel</p>
                <h1 className="text-lg sm:text-xl font-bold">
                  Ola, {nomeUsuario.split(' ')[0] || 'Responsavel'}!
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => router.push('/responsavel/calendario')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Calendario">
                <Calendar className="w-5 h-5" />
              </button>
              <button onClick={() => router.push('/responsavel/mensagens')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Mensagens">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button onClick={sair}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Filhos */}
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {filhos.length === 1 ? 'Seu filho(a)' : `Seus filhos (${filhos.length})`}
        </h2>

        {filhos.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-slate-700">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-400" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Nenhum aluno vinculado</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Entre em contato com a escola para vincular seus filhos a sua conta.
            </p>
          </div>
        ) : (
          filhos.map(filho => (
            <div key={filho.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Info do aluno */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{filho.nome}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {filho.serie} {filho.turma_codigo ? `— ${filho.turma_codigo}` : ''} | {filho.escola_nome}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    filho.situacao === 'cursando'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {filho.situacao === 'cursando' ? 'Cursando' : filho.situacao}
                  </span>
                </div>
              </div>

              {/* Acoes rapidas */}
              <div className="border-t border-gray-100 dark:border-slate-700 grid grid-cols-3 divide-x divide-gray-100 dark:divide-slate-700">
                <button
                  onClick={() => router.push(`/responsavel/filho?id=${filho.id}`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 transition-colors">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Boletim</span>
                </button>
                <button
                  onClick={() => router.push(`/responsavel/filho?id=${filho.id}&aba=frequencia`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-green-50 dark:hover:bg-green-900/20 active:bg-green-100 transition-colors">
                  <CalendarCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Frequencia</span>
                </button>
                <button
                  onClick={() => router.push(`/responsavel/comunicados?aluno_id=${filho.id}`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:bg-amber-100 transition-colors">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Comunicados</span>
                </button>
              </div>
            </div>
          ))
        )}

        {/* Info */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 flex items-start gap-3 border border-indigo-200 dark:border-indigo-800">
          <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
            <p className="font-semibold mb-1">SISAM — Portal do Responsavel</p>
            <p>Acompanhe as notas, frequencia e comunicados dos seus filhos. Em caso de duvidas, entre em contato com a secretaria da escola.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
