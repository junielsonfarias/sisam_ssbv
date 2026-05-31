'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import FrequenciaDiariaComponent from '@/components/professor/frequencia-diaria'
import FrequenciaHoraAulaComponent from '@/components/professor/frequencia-hora-aula'
import HistoricoFrequencia from '@/components/professor/historico-frequencia'
import ContextoLancamento from '@/components/professor/contexto-lancamento'

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
  // Versao do historico (incrementa apos cada save para invalidar o cache)
  const [historicoVersao, setHistoricoVersao] = useState(0)

  const usaHoraAula = turmaInfo ? isAnosFinais(turmaInfo.serie) : false

  // Buscar info da turma
  useEffect(() => {
    const fetchTurma = async () => {
      try {
        const res = await fetch('/api/professor/turmas')
        if (!res.ok) throw new Error('Erro ao carregar turmas')
        const data = await res.json()
        const lista = Array.isArray(data?.turmas) ? data.turmas : []
        const turma = lista.find((t: any) => t.turma_id === turmaId)
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

  const dataFormatada = (() => {
    const [y, m, d] = dataSelecionada.split('-')
    return d && m && y ? `${d}/${m}/${y}` : dataSelecionada
  })()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {usaHoraAula ? 'Frequência por Hora-Aula' : 'Lançamento de Frequência'}
        </h1>
      </div>

      {/* Cartao de contexto: escola, turma, serie, turno, disciplina, data */}
      {turmaInfo && (
        <ContextoLancamento
          titulo={usaHoraAula ? 'Frequência por Hora-Aula' : 'Frequência Diária'}
          escola={turmaInfo.escola_nome}
          turma={turmaInfo.turma_nome}
          serie={turmaInfo.serie}
          turno={turmaInfo.turno}
          disciplina={turmaInfo.disciplina_nome}
          data={dataFormatada}
          cor={usaHoraAula ? 'blue' : 'emerald'}
        />
      )}

      {/* Seletor de data */}
      <div className="flex flex-wrap items-center gap-3">
        <Calendar className="h-4 w-4 text-gray-500" />
        <input
          type="date"
          value={dataSelecionada}
          onChange={e => setDataSelecionada(e.target.value)}
          aria-label="Data da frequência"
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />
        <button
          type="button"
          onClick={() => setDataSelecionada(new Date().toISOString().split('T')[0])}
          className="px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
        >
          Hoje
        </button>
      </div>

      {/* Historico de dias com frequencia (apenas diaria — hora-aula tem
          fluxo proprio por aulas). */}
      {turmaInfo && !usaHoraAula && (
        <HistoricoFrequencia
          turmaId={turmaId}
          dataSelecionada={dataSelecionada}
          onSelecionarData={setDataSelecionada}
          refreshKey={historicoVersao}
        />
      )}

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
          chegadasFacial={dadosHoraAula.chegadas_facial}
          onSalvar={() => { fetchFrequencia(); setHistoricoVersao(v => v + 1) }}
        />
      ) : dadosDiaria ? (
        <FrequenciaDiariaComponent
          turmaId={turmaId}
          data={dataSelecionada}
          alunos={dadosDiaria.alunos}
          resumo={dadosDiaria.resumo}
          onSalvar={() => { fetchFrequencia(); setHistoricoVersao(v => v + 1) }}
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
