'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, Users, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Turma {
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
  tipo_vinculo: string
  disciplina_nome: string | null
  total_alunos: number
}

function SelecionarTurma() {
  const router = useRouter()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/professor/turmas')
      .then(r => r.json())
      .then(data => setTurmas(data.turmas))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançar Frequência</h1>
        <p className="text-gray-500 dark:text-gray-400">Selecione uma turma:</p>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançar Frequência</h1>
      <p className="text-gray-500 dark:text-gray-400">Selecione uma turma para lançar frequência:</p>

      {turmas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Nenhuma turma vinculada</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {turmas.map(turma => (
            <button
              key={turma.turma_id + (turma.disciplina_nome || '')}
              onClick={() => router.push(`/professor/frequencia/${turma.turma_id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-colors text-left"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{turma.turma_nome}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{turma.serie} - {turma.turno}</p>
                  {turma.disciplina_nome && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                      {turma.disciplina_nome}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{turma.total_alunos}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CalendarCheck className="h-3 w-3" />
                <span>{turma.escola_nome}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FrequenciaPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <SelecionarTurma />
    </ProtectedRoute>
  )
}
