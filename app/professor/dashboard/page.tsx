'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, GraduationCap, CalendarCheck, TrendingUp, AlertTriangle, FileText } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import OfflineSyncProfessor from '@/components/professor/offline-sync'

interface DashboardData {
  total_turmas: number
  total_alunos: number
  frequencia_hoje: {
    presentes: number
    ausentes: number
    total: number
    percentual: number
  }
  frequencia_semana: {
    presentes: number
    total: number
    percentual: number
  }
  turmas: Array<{
    id: string
    turma_nome: string
    serie: string
    turno: string
    escola_nome: string
    tipo_vinculo: string
    disciplina_nome: string | null
    total_alunos: number
    registros_hoje: number
  }>
}

function DashboardProfessor() {
  const router = useRouter()
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/professor/dashboard')
      if (!res.ok) throw new Error('Erro ao carregar dashboard')
      const data = await res.json()
      setDados(data)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard do Professor</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-2 text-red-600 dark:text-red-400">{erro}</p>
        <button onClick={fetchDashboard} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!dados) return null

  const kpis = [
    { icon: GraduationCap, label: 'Minhas Turmas', valor: dados.total_turmas, cor: 'bg-blue-500' },
    { icon: Users, label: 'Total de Alunos', valor: dados.total_alunos, cor: 'bg-emerald-500' },
    { icon: CalendarCheck, label: 'Frequência Hoje', valor: `${dados.frequencia_hoje.percentual}%`, cor: dados.frequencia_hoje.percentual >= 75 ? 'bg-green-500' : 'bg-red-500' },
    { icon: TrendingUp, label: 'Frequência Semana', valor: `${dados.frequencia_semana.percentual}%`, cor: dados.frequencia_semana.percentual >= 75 ? 'bg-green-500' : 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard do Professor</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`${kpi.cor} p-2 rounded-lg`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{kpi.valor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Frequência hoje resumo */}
      {dados.frequencia_hoje.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Resumo de Hoje</h2>
          <div className="flex gap-6 text-sm">
            <span className="text-green-600 dark:text-green-400">
              {dados.frequencia_hoje.presentes} presentes
            </span>
            <span className="text-red-600 dark:text-red-400">
              {dados.frequencia_hoje.ausentes} ausentes
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {dados.frequencia_hoje.total} registros
            </span>
          </div>
        </div>
      )}

      {/* Ações rápidas + Sync offline */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => router.push('/professor/frequencia')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <CalendarCheck className="h-4 w-4" /> Lançar Frequência
          </button>
          <button onClick={() => router.push('/professor/notas')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <FileText className="h-4 w-4" /> Lançar Notas
          </button>
        </div>
        <OfflineSyncProfessor />
      </div>

      {/* Turmas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Minhas Turmas</h2>
        {dados.turmas.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">Nenhuma turma vinculada</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Solicite ao administrador para vincular suas turmas.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dados.turmas.map((turma) => (
              <button
                key={turma.id}
                onClick={() => router.push(`/professor/frequencia/${turma.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{turma.turma_nome}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {turma.serie} - {turma.turno}
                    </p>
                    {turma.disciplina_nome && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        {turma.disciplina_nome}
                      </span>
                    )}
                    {turma.tipo_vinculo === 'polivalente' && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                        Polivalente
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{turma.total_alunos}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">alunos</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{turma.escola_nome}</span>
                  {parseInt(String(turma.registros_hoje)) > 0 && (
                    <span className="text-green-500">| {turma.registros_hoje} registros hoje</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProfessorDashboardPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <DashboardProfessor />
    </ProtectedRoute>
  )
}
