'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, CalendarCheck, AlertTriangle, FileText, ArrowRight } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import OfflineSyncProfessor from '@/components/professor/offline-sync'
import KpiCards from './components/KpiCards'
import AlunosRisco from './components/AlunosRisco'
import ComparativoTurma from './components/ComparativoTurma'
import GraficoEvolucao from './components/GraficoEvolucao'

interface DashboardData {
  total_turmas: number
  total_alunos: number
  frequencia_hoje: {
    presentes: number
    ausentes: number
    justificados: number
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
  }>
}

function DashboardProfessor() {
  const router = useRouter()
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null)
  const [alunosEmRisco, setAlunosEmRisco] = useState(0)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setCarregando(true)
      const res = await fetch('/api/professor/dashboard')
      if (!res.ok) throw new Error('Erro ao carregar dashboard')
      const data = await res.json()
      setDados(data)
      // Pre-seleciona a primeira turma para Comparativo + GraficoEvolucao terem
      // dados ja na primeira renderizacao (eles tratam null mas mostram vazio)
      if (data.turmas?.length > 0 && !turmaSelecionada) {
        setTurmaSelecionada(data.turmas[0].id)
      }
      setErro('')
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
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse h-20 border border-gray-200 dark:border-slate-700" />
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

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard do Professor</h1>

      {/* KPIs ricos — usa snapshot da semana como proxy de frequencia_media.
          mediaGeral fica null (--) ate termos endpoint dedicado: mostrar
          undefined e mais honesto do que fabricar valor. */}
      <KpiCards
        totalAlunos={dados.total_alunos}
        mediaGeral={null}
        frequenciaMedia={dados.frequencia_semana.percentual}
        alunosEmRisco={alunosEmRisco}
      />

      {/* Resumo de hoje (preserva info do dashboard antigo) */}
      {dados.frequencia_hoje.total > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Resumo de Hoje</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="text-green-600 dark:text-green-400">
              <strong>{dados.frequencia_hoje.presentes}</strong> presentes
            </span>
            <span className="text-red-600 dark:text-red-400">
              <strong>{dados.frequencia_hoje.ausentes}</strong> ausentes
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              <strong>{dados.frequencia_hoje.justificados ?? 0}</strong> justificadas
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
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition">
            <CalendarCheck className="h-4 w-4" /> Lançar Frequência
          </button>
          <button onClick={() => router.push('/professor/notas')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition">
            <FileText className="h-4 w-4" /> Lançar Notas
          </button>
          <button onClick={() => router.push('/professor/turmas')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium transition">
            <GraduationCap className="h-4 w-4" /> Ver Minhas Turmas
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <OfflineSyncProfessor />
      </div>

      {/* Seletor de turma — controla Comparativo + GraficoEvolucao + AlunosRisco */}
      {dados.turmas.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-slate-700">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
            Análise por turma
          </label>
          <select
            value={turmaSelecionada || ''}
            onChange={e => setTurmaSelecionada(e.target.value || null)}
            className="w-full sm:w-auto sm:min-w-[280px] rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todas as turmas (geral)</option>
            {dados.turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.turma_nome} — {t.serie}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Comparativo + Gráfico evolução lado a lado */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ComparativoTurma turmaId={turmaSelecionada} />
        <GraficoEvolucao turmaId={turmaSelecionada} />
      </div>

      {/* Alunos em risco — atualiza KPI via onTotalChange */}
      <AlunosRisco turmaId={turmaSelecionada} onTotalChange={setAlunosEmRisco} />

      {dados.turmas.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Nenhuma turma vinculada</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Solicite ao administrador para vincular suas turmas.</p>
        </div>
      )}
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
