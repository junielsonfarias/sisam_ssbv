'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, AlertTriangle, CalendarCheck, FileText } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Aluno {
  id: string; nome: string; codigo: string; data_nascimento: string
  total_presentes: number; total_ausentes: number; total_registros: number; percentual_presenca: number
  total_notas: number; media_geral: number | null
}

interface TurmaInfo {
  turma_id: string; turma_nome: string; serie: string; turno: string; escola_nome: string
}

function ListaAlunos() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string

  const [turmaInfo, setTurmaInfo] = useState<TurmaInfo | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [turmasRes, alunosRes] = await Promise.all([
          fetch('/api/professor/turmas'),
          fetch(`/api/professor/alunos/resumo?turma_id=${turmaId}`),
        ])
        const turmasData = await turmasRes.json()
        const alunosData = await alunosRes.json()

        const turma = turmasData.turmas?.find((t: any) => t.turma_id === turmaId)
        if (turma) setTurmaInfo(turma)
        setAlunos(alunosData.alunos || [])
      } catch (err: any) {
        setErro(err.message)
      } finally {
        setCarregando(false)
      }
    }
    fetchDados()
  }, [turmaId])

  if (carregando) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alunos da Turma</h1>
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  if (erro) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-2 text-red-600">{erro}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {turmaInfo?.turma_nome || 'Alunos'}
          </h1>
          {turmaInfo && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {turmaInfo.serie} - {turmaInfo.turno} | {alunos.length} alunos
            </p>
          )}
        </div>
      </div>

      {alunos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          Nenhum aluno encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {alunos.map((aluno, i) => (
            <div key={aluno.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{i + 1}</span>
                    <p className="font-medium text-gray-900 dark:text-white">{aluno.nome}</p>
                  </div>
                  {aluno.codigo && <p className="text-xs text-gray-400 ml-6">Cód: {aluno.codigo}</p>}
                </div>
              </div>

              {/* Resumo */}
              <div className="flex flex-wrap gap-4 mt-2 ml-6 text-xs">
                {/* Frequência */}
                <div className="flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3 text-gray-400" />
                  <span className={`font-medium ${
                    aluno.percentual_presenca >= 75 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {aluno.percentual_presenca}% presença
                  </span>
                  <span className="text-gray-400">
                    ({aluno.total_presentes}P / {aluno.total_ausentes}F)
                  </span>
                </div>

                {/* Notas */}
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-gray-400" />
                  {aluno.media_geral !== null ? (
                    <span className={`font-medium ${
                      aluno.media_geral >= 6 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      Média: {aluno.media_geral}
                    </span>
                  ) : (
                    <span className="text-gray-400">Sem notas</span>
                  )}
                  {aluno.total_notas > 0 && (
                    <span className="text-gray-400">({aluno.total_notas} lançamento{aluno.total_notas > 1 ? 's' : ''})</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AlunosTurmaPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <ListaAlunos />
    </ProtectedRoute>
  )
}
