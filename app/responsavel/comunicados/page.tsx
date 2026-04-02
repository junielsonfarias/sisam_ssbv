'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, AlertTriangle, Info, Calendar, Megaphone } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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

const TIPO_CONFIG: Record<string, { cor: string; icone: typeof Bell; label: string }> = {
  aviso: { cor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icone: Info, label: 'Aviso' },
  lembrete: { cor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icone: Calendar, label: 'Lembrete' },
  urgente: { cor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icone: AlertTriangle, label: 'Urgente' },
  reuniao: { cor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', icone: Megaphone, label: 'Reuniao' },
}

export default function ComunicadosPage() {
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => router.push('/responsavel/dashboard')}
            className="flex items-center gap-2 text-amber-100 hover:text-white mb-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <h1 className="text-lg font-bold">Comunicados</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-3">
        {comunicados.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
            <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum comunicado recente</p>
          </div>
        ) : (
          comunicados.map(c => {
            const config = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.aviso
            const Icone = config.icone
            return (
              <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 p-2 rounded-lg ${config.cor}`}>
                      <Icone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${config.cor}`}>
                            {config.label}
                          </span>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5">{c.titulo}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">{c.conteudo}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
                        <span>{c.professor_nome}</span>
                        {c.turma_codigo && <span>Turma: {c.turma_codigo}</span>}
                        <span>{formatarData(c.criado_em)}</span>
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
