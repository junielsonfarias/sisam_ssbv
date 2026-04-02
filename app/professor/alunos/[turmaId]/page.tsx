'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, AlertTriangle, CalendarCheck, FileText, TrendingUp, BarChart3 } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Aluno {
  id: string; nome: string; codigo: string; data_nascimento: string
  total_presentes: number; total_ausentes: number; total_registros: number; percentual_presenca: number
  total_notas: number; media_geral: number | null
}

interface TurmaInfo {
  turma_id: string; turma_nome: string; serie: string; turno: string; escola_nome: string
}

interface DisciplinaDesempenho {
  disciplina: string
  abreviacao: string
  media: string
  total_alunos: string
  acima_media: string
  abaixo_media: string
}

interface ResumoDesempenho {
  total_alunos: string
  media_turma: string | null
  acima_media: string
  abaixo_media: string
}

function ListaAlunos() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string

  const [turmaInfo, setTurmaInfo] = useState<TurmaInfo | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [disciplinas, setDisciplinas] = useState<DisciplinaDesempenho[]>([])
  const [resumo, setResumo] = useState<ResumoDesempenho | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [turmasRes, alunosRes, desempenhoRes] = await Promise.all([
          fetch('/api/professor/turmas'),
          fetch(`/api/professor/alunos/resumo?turma_id=${turmaId}`),
          fetch(`/api/professor/turma-desempenho?turma_id=${turmaId}`),
        ])
        const turmasData = await turmasRes.json()
        const alunosData = await alunosRes.json()

        const turma = turmasData.turmas?.find((t: any) => t.turma_id === turmaId)
        if (turma) setTurmaInfo(turma)
        setAlunos(alunosData.alunos || [])

        if (desempenhoRes.ok) {
          const desempenhoData = await desempenhoRes.json()
          setDisciplinas(desempenhoData.disciplinas || [])
          setResumo(desempenhoData.resumo || null)
        }
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

      {/* Resumo de Desempenho */}
      {resumo && resumo.media_turma !== null && (
        <div className="space-y-4">
          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Media da Turma</span>
              </div>
              <p className={`text-xl font-bold mt-1 ${
                parseFloat(resumo.media_turma!) >= 6 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {resumo.media_turma}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Acima da Media</span>
              </div>
              <p className="text-xl font-bold mt-1 text-emerald-600">{resumo.acima_media}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Abaixo da Media</span>
              </div>
              <p className="text-xl font-bold mt-1 text-red-600">{resumo.abaixo_media}</p>
            </div>
          </div>

          {/* Gráfico de barras por disciplina */}
          {disciplinas.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" /> Media por Disciplina
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={disciplinas.map(d => ({
                  nome: d.abreviacao || d.disciplina.substring(0, 6),
                  media: parseFloat(d.media),
                }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="media" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

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
