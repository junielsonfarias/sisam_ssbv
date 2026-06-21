'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, AlertTriangle, Info, Calendar, Megaphone } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyCard } from '@/components/ui/empty-card'

interface Comunicado {
  id: string
  titulo: string
  conteudo: string
  tipo: string
  criado_em: string
  professor_nome: string
  turma_codigo: string | null
  turma_nome: string | null
}

const TIPO_CONFIG: Record<string, { cor: string; barra: string; icone: typeof Bell; label: string }> = {
  aviso: { cor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', barra: 'bg-blue-500', icone: Info, label: 'Aviso' },
  lembrete: { cor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', barra: 'bg-amber-500', icone: Calendar, label: 'Lembrete' },
  urgente: { cor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', barra: 'bg-red-500', icone: AlertTriangle, label: 'Urgente' },
  reuniao: { cor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', barra: 'bg-indigo-500', icone: Megaphone, label: 'Reunião' },
}

function ComunicadosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunoId = searchParams.get('aluno_id')

  const [comunicados, setComunicados] = useState<Comunicado[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregarComunicados() }, [alunoId])

  const carregarComunicados = async () => {
    try {
      const url = alunoId
        ? `/api/responsavel/comunicados?aluno_id=${alunoId}`
        : '/api/responsavel/comunicados'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setComunicados(data.comunicados || [])
      }
    } catch { /* offline */ } finally {
      setCarregando(false)
    }
  }

  const formatarData = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  if (carregando) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 to-gray-50 dark:from-slate-900 dark:to-slate-900 pb-10">
      {/* HERO */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-7">
          <button onClick={() => router.push('/responsavel/dashboard')}
            className="inline-flex items-center gap-1.5 text-amber-100 hover:text-white text-sm font-medium min-h-[44px] active:scale-95 transition">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-12 h-12 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Comunicados</h1>
              <p className="text-amber-100 text-sm">{comunicados.length} {comunicados.length === 1 ? 'mensagem' : 'mensagens'} da escola</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-3 relative z-10 space-y-3">
        {comunicados.length === 0 ? (
          <EmptyCard Icon={Bell} titulo="Nenhum comunicado recente" texto="Avisos e recados da escola aparecerão aqui." />
        ) : (
          comunicados.map(c => {
            const config = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.aviso
            const Icone = config.icone
            return (
              <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex">
                <div className={`w-1.5 shrink-0 ${config.barra}`} />
                <div className="p-4 flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.cor}`}>
                      <Icone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${config.cor}`}>
                        {config.label}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5">{c.titulo}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{c.conteudo}</p>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                        <span className="font-medium text-gray-500 dark:text-gray-400">{c.professor_nome}</span>
                        {c.turma_codigo && <span>· Turma {c.turma_codigo}</span>}
                        <span>· {formatarData(c.criado_em)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function ComunicadosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>}>
      <ComunicadosContent />
    </Suspense>
  )
}
