'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import FrequenciaDiariaComponent from '@/components/professor/frequencia-diaria'
import FrequenciaHoraAulaComponent from '@/components/professor/frequencia-hora-aula'

// Séries do 6º ao 9º ano usam frequência por hora-aula
const SERIES_ANOS_FINAIS = ['6', '7', '8', '9', '6º', '7º', '8º', '9º', '6º Ano', '7º Ano', '8º Ano', '9º Ano']

function isAnosFinais(serie: string): boolean {
  const num = serie.replace(/[^\d]/g, '')
  return ['6', '7', '8', '9'].includes(num)
}

interface TurmaInfo {
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
  tipo_vinculo: string
  disciplina_nome: string | null
  etapa: string | null
}

function FrequenciaTurma() {
  const params = useParams()
  const router = useRouter()
  const turmaId = params.turmaId as string

  const [turmaInfo, setTurmaInfo] = useState<TurmaInfo | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState(() => new Date().toISOString().split('T')[0])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Estado para frequência diária
  const [dadosDiaria, setDadosDiaria] = useState<any>(null)
  // Estado para frequência hora-aula
  const [dadosHoraAula, setDadosHoraAula] = useState<any>(null)

  const usaHoraAula = turmaInfo ? isAnosFinais(turmaInfo.serie) : false

  // Buscar info da turma
  useEffect(() => {
    const fetchTurma = async () => {
      try {
        const res = await fetch('/api/professor/turmas')
        if (!res.ok) throw new Error('Erro ao carregar turmas')
        const data = await res.json()
        const turma = data.turmas.find((t: any) => t.turma_id === turmaId)
        if (!turma) throw new Error('Turma não encontrada')
        setTurmaInfo(turma)
      } catch (err: any) {
        setErro(err.message)
      }
    }
    fetchTurma()
  }, [turmaId])

  // Buscar frequência quando turma ou data muda
  const fetchFrequencia = useCallback(async () => {
    if (!turmaInfo) return
    setCarregando(true)
    setErro('')

    try {
      if (isAnosFinais(turmaInfo.serie)) {
        // Frequência por hora-aula (6º-9º)
        const res = await fetch(`/api/professor/frequencia-hora-aula?turma_id=${turmaId}&data=${dataSelecionada}`)
        if (!res.ok) throw new Error('Erro ao carregar frequência')
        const data = await res.json()
        setDadosHoraAula(data)
        setDadosDiaria(null)
      } else {
        // Frequência diária (creche-5º)
        const res = await fetch(`/api/professor/frequencia-diaria?turma_id=${turmaId}&data=${dataSelecionada}`)
        if (!res.ok) throw new Error('Erro ao carregar frequência')
        const data = await res.json()
        setDadosDiaria(data)
        setDadosHoraAula(null)
      }
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [turmaInfo, turmaId, dataSelecionada])

  useEffect(() => {
    if (turmaInfo) fetchFrequencia()
  }, [turmaInfo, dataSelecionada, fetchFrequencia])

  if (erro && !turmaInfo) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-2 text-red-600 dark:text-red-400">{erro}</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {turmaInfo?.turma_nome || 'Carregando...'}
          </h1>
          {turmaInfo && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {turmaInfo.serie} - {turmaInfo.turno} | {turmaInfo.escola_nome}
              {turmaInfo.disciplina_nome && ` | ${turmaInfo.disciplina_nome}`}
            </p>
          )}
        </div>
      </div>

      {/* Tipo de frequência */}
      {turmaInfo && (
        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-block ${
          usaHoraAula
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
        }`}>
          {usaHoraAula ? 'Frequência por Hora-Aula' : 'Frequência Diária'}
        </div>
      )}

      {/* Seletor de data */}
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-gray-500" />
        <input
          type="date"
          value={dataSelecionada}
          onChange={e => setDataSelecionada(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />
      </div>

      {/* Conteúdo */}
      {carregando ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : erro ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {erro}
        </div>
      ) : usaHoraAula && dadosHoraAula ? (
        <FrequenciaHoraAulaComponent
          turmaId={turmaId}
          data={dataSelecionada}
          horarios={dadosHoraAula.horarios}
          alunos={dadosHoraAula.alunos}
          frequencias={dadosHoraAula.frequencias}
          onSalvar={fetchFrequencia}
        />
      ) : dadosDiaria ? (
        <FrequenciaDiariaComponent
          turmaId={turmaId}
          data={dataSelecionada}
          alunos={dadosDiaria.alunos}
          resumo={dadosDiaria.resumo}
          onSalvar={fetchFrequencia}
        />
      ) : null}
    </div>
  )
}

export default function FrequenciaTurmaPage() {
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <FrequenciaTurma />
    </ProtectedRoute>
  )
}
