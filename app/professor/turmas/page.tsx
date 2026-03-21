'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Users, CalendarCheck, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Turma {
  vinculo_id: string
  tipo_vinculo: string
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_id: string
  escola_nome: string
  disciplina_id: string | null
  disciplina_nome: string | null
  disciplina_abreviacao: string | null
  etapa: string | null
  total_alunos: number
}

function TurmasProfessor() {
  const router = useRouter()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetchTurmas()
  }, [])

  const fetchTurmas = async () => {
    try {
      const res = await fetch('/api/professor/turmas')
      if (!res.ok) throw new Error('Erro ao carregar turmas')
      const data = await res.json()
      setTurmas(data.turmas)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Turmas</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
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
      </div>
    )
  }

  // Agrupar por escola
  const turmasPorEscola = turmas.reduce((acc: Record<string, Turma[]>, t) => {
    const key = t.escola_nome
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Turmas</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {turmas.length} turma(s) vinculada(s)
      </p>

      {turmas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Nenhuma turma vinculada</p>
        </div>
      ) : (
        Object.entries(turmasPorEscola).map(([escolaNome, turmasEscola]) => (
          <div key={escolaNome}>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              {escolaNome}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {turmasEscola.map(turma => (
                <button
                  key={turma.vinculo_id}
                  onClick={() => router.push(`/professor/frequencia/${turma.turma_id}`)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{turma.turma_nome}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{turma.serie} - {turma.turno}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">{turma.total_alunos}</span>
                    </div>
                  </div>

                  {turma.tipo_vinculo === 'polivalente' ? (
                    <span className="inline-block px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                      Polivalente — Todas as disciplinas
                    </span>
                  ) : turma.disciplina_nome ? (
                    <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                      {turma.disciplina_nome}
                    </span>
                  ) : null}

                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CalendarCheck className="h-3 w-3" /> Frequência
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); router.push(`/professor/alunos/${turma.turma_id}`) }}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <Users className="h-3 w-3" /> Ver Alunos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default function TurmasProfessorPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <TurmasProfessor />
    </ProtectedRoute>
  )
}
