'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  GraduationCap, Users, AlertTriangle, Calendar, BookOpen, Building2, X,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { BarraFiltros } from './components/barra-filtros'
import { CardTurma } from './components/card-turma'
import {
  type Turma, type AnoDisponivel, type PeriodoLetivo, type FiltrosState,
  FILTROS_DEFAULT, STORAGE_KEY_FILTROS, normalizarTexto,
} from './components/tipos'

function TurmasProfessor() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [anoSelecionado, setAnoSelecionado] = useState<string>('')
  const [anoAtivo, setAnoAtivo] = useState<string>('')
  const [anosDisponiveis, setAnosDisponiveis] = useState<AnoDisponivel[]>([])
  const [periodoAtivo, setPeriodoAtivo] = useState<PeriodoLetivo | null>(null)
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_DEFAULT)

  // Carrega filtros persistidos
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FILTROS)
      if (raw) setFiltros({ ...FILTROS_DEFAULT, ...JSON.parse(raw) })
    } catch { /* ignora storage corrompido */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_FILTROS, JSON.stringify(filtros)) } catch { /* quota cheia */ }
  }, [filtros])

  const fetchTurmas = useCallback(async (ano?: string) => {
    try {
      setCarregando(true)
      const url = ano ? `/api/professor/turmas?ano_letivo=${ano}` : '/api/professor/turmas'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao carregar turmas')
      const data = await res.json()
      setTurmas(Array.isArray(data?.turmas) ? data.turmas : [])
      setAnoSelecionado(data.ano_letivo || '')
      setAnoAtivo(data.ano_letivo_ativo || '')
      setAnosDisponiveis(data.anos_disponiveis || [])
      setErro('')
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { fetchTurmas() }, [fetchTurmas])

  // Busca periodo letivo ativo do ano selecionado
  useEffect(() => {
    if (!anoSelecionado) return
    let cancelado = false
    fetch(`/api/admin/periodos-letivos?ano_letivo=${anoSelecionado}`)
      .then(r => r.ok ? r.json() : [])
      .then((lista: PeriodoLetivo[]) => {
        if (cancelado || !Array.isArray(lista)) return
        const ativo = lista.find(p => p.ativo) ?? null
        setPeriodoAtivo(ativo)
      })
      .catch(() => { if (!cancelado) setPeriodoAtivo(null) })
    return () => { cancelado = true }
  }, [anoSelecionado])

  const handleAnoChange = (novoAno: string) => {
    if (novoAno && novoAno !== anoSelecionado) fetchTurmas(novoAno)
  }

  // Aplica filtros (client-side)
  const turmasFiltradas = useMemo(() => {
    const buscaNorm = normalizarTexto(filtros.busca.trim())
    return turmas.filter(t => {
      if (filtros.escolas.length > 0 && !filtros.escolas.includes(t.escola_id)) return false
      if (filtros.turnos.length > 0 && !filtros.turnos.includes(t.turno)) return false
      if (filtros.serie && t.serie !== filtros.serie) return false
      if (filtros.tipoVinculo !== 'todos' && t.tipo_vinculo !== filtros.tipoVinculo) return false
      if (buscaNorm) {
        const hay = normalizarTexto([t.turma_nome, t.serie, t.disciplina_nome ?? '', t.escola_nome].join(' '))
        if (!hay.includes(buscaNorm)) return false
      }
      return true
    })
  }, [turmas, filtros])

  const totalAlunos = useMemo(
    () => turmasFiltradas.reduce((acc, t) => acc + (t.total_alunos ?? 0), 0),
    [turmasFiltradas]
  )

  const turmasPorEscola = useMemo(() => {
    return turmasFiltradas.reduce((acc: Record<string, Turma[]>, t) => {
      const key = t.escola_nome
      if (!acc[key]) acc[key] = []
      acc[key].push(t)
      return acc
    }, {})
  }, [turmasFiltradas])

  const temFiltrosAtivos =
    filtros.busca !== '' ||
    filtros.escolas.length > 0 ||
    filtros.turnos.length > 0 ||
    filtros.serie !== '' ||
    filtros.tipoVinculo !== 'todos'

  const anoAtualEhAtivo = anoSelecionado === anoAtivo
  const opcoesAno = (() => {
    const itens = anosDisponiveis.map(a => a.ano)
    if (anoAtivo && !itens.includes(anoAtivo)) itens.unshift(anoAtivo)
    if (anoSelecionado && !itens.includes(anoSelecionado)) itens.unshift(anoSelecionado)
    return Array.from(new Set(itens))
  })()

  const formatarPeriodoBadge = (p: PeriodoLetivo): string => {
    const tipo = p.tipo === 'semestral' ? 'Semestre' : p.tipo === 'trimestral' ? 'Trimestre' : 'Bimestre'
    return `${p.numero}º ${tipo}`
  }

  const formatarData = (iso: string | null): string => {
    if (!iso) return ''
    const d = iso.slice(0, 10).split('-')
    return `${d[2]}/${d[1]}`
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Turmas</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 animate-pulse h-40 border border-gray-200 dark:border-slate-700" />
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

  return (
    <div className="space-y-5">
      {/* Header + KPIs + ano letivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Turmas</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <strong className="text-gray-700 dark:text-gray-200">{turmasFiltradas.length}</strong>
              {turmasFiltradas.length === 1 ? 'turma' : 'turmas'}
              {temFiltrosAtivos && turmasFiltradas.length !== turmas.length && (
                <span className="text-xs text-gray-400">de {turmas.length}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <strong className="text-gray-700 dark:text-gray-200">{totalAlunos}</strong>
              {totalAlunos === 1 ? 'aluno' : 'alunos'}
            </span>
            {periodoAtivo && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <strong className="text-gray-700 dark:text-gray-200">{formatarPeriodoBadge(periodoAtivo)}</strong>
                {periodoAtivo.data_fim && (
                  <span className="text-xs text-gray-400">até {formatarData(periodoAtivo.data_fim)}</span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <label htmlFor="ano-letivo" className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Ano letivo
          </label>
          <select
            id="ano-letivo"
            value={anoSelecionado}
            onChange={(e) => handleAnoChange(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {opcoesAno.length === 0 && anoSelecionado && (
              <option value={anoSelecionado}>{anoSelecionado}</option>
            )}
            {opcoesAno.map(ano => (
              <option key={ano} value={ano}>
                {ano}{ano === anoAtivo ? ' (ativo)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!anoAtualEhAtivo && anoAtivo && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Visualizando ano letivo finalizado. Selecione {anoAtivo} para o ano ativo.
        </div>
      )}

      <BarraFiltros turmas={turmas} filtros={filtros} onChange={setFiltros} />

      {/* Lista de turmas */}
      {turmasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          {temFiltrosAtivos ? (
            <>
              <p className="mt-3 text-gray-700 dark:text-gray-200 font-medium">
                Nenhuma turma corresponde aos filtros
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tente ajustar a busca ou remover os filtros aplicados.
              </p>
              <button
                onClick={() => setFiltros(FILTROS_DEFAULT)}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition"
              >
                <X className="h-4 w-4" /> Limpar filtros
              </button>
            </>
          ) : (
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Nenhuma turma vinculada em {anoSelecionado || 'ano selecionado'}
            </p>
          )}
        </div>
      ) : (
        Object.entries(turmasPorEscola).map(([escolaNome, turmasEscola]) => {
          const alunosEscola = turmasEscola.reduce((acc, t) => acc + (t.total_alunos ?? 0), 0)
          return (
            <div key={escolaNome}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{escolaNome}</h2>
                <span className="text-xs text-gray-400">
                  · {turmasEscola.length} {turmasEscola.length === 1 ? 'turma' : 'turmas'}
                  {' · '}{alunosEscola} {alunosEscola === 1 ? 'aluno' : 'alunos'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {turmasEscola.map(turma => <CardTurma key={turma.vinculo_id} turma={turma} />)}
              </div>
            </div>
          )
        })
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
