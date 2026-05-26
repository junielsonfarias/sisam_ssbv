'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Users, ClipboardList, FileText, BookOpen,
  Calendar, GraduationCap, Building2, AlertCircle, Filter, Printer,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type {
  Tipo, Periodo, DiarioPayload, LacunasPayload,
} from './components/types'
import { imprimirDiario } from './components/printDiario'
import CoberturaDiario from './components/CoberturaDiario'
import SecaoFrequencia from './components/SecaoFrequencia'
import SecaoNotas from './components/SecaoNotas'
import SecaoConteudo from './components/SecaoConteudo'
import { formatarData } from './components/formatters'

function DiarioTurmaContent() {
  const router = useRouter()
  const params = useParams()
  const turmaId = params.turmaId as string

  const [carregando, setCarregando] = useState(true)
  const [diario, setDiario] = useState<DiarioPayload | null>(null)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [periodoId, setPeriodoId] = useState<string>('')
  const [tipo, setTipo] = useState<Tipo>('todos')
  const [erro, setErro] = useState<string | null>(null)
  const [lacunas, setLacunas] = useState<LacunasPayload | null>(null)
  const [carregandoLacunas, setCarregandoLacunas] = useState(false)

  // 1) Carrega o diário (sem período no primeiro fetch — assim já recebe a turma com ano_letivo)
  const carregarDiario = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const url = new URL(`/api/admin/turmas/${turmaId}/diario-completo`, window.location.origin)
      if (periodoId) url.searchParams.set('periodo_id', periodoId)
      if (tipo !== 'todos') url.searchParams.set('tipos', tipo)
      const res = await fetch(url.toString())
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem || 'Erro ao carregar diário')
        return
      }
      setDiario(data)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [turmaId, periodoId, tipo])

  // 2) Quando temos o ano_letivo da turma, carrega a lista de períodos disponíveis
  useEffect(() => {
    if (!diario?.turma?.ano_letivo) return
    fetch(`/api/admin/periodos-letivos?ano_letivo=${encodeURIComponent(diario.turma.ano_letivo)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Periodo[]) => {
        if (Array.isArray(data)) setPeriodos(data.sort((a, b) => a.numero - b.numero))
      })
      .catch(() => { /* silencioso — fica "Todos" */ })
  }, [diario?.turma?.ano_letivo])

  useEffect(() => {
    carregarDiario()
  }, [carregarDiario])

  // 3) Carrega lacunas em paralelo (depende do periodoId, não do tipo)
  useEffect(() => {
    let cancelado = false
    setCarregandoLacunas(true)
    const url = new URL(`/api/admin/turmas/${turmaId}/diario-lacunas`, window.location.origin)
    if (periodoId) url.searchParams.set('periodo_id', periodoId)
    fetch(url.toString())
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelado) setLacunas(data) })
      .catch(() => { if (!cancelado) setLacunas(null) })
      .finally(() => { if (!cancelado) setCarregandoLacunas(false) })
    return () => { cancelado = true }
  }, [turmaId, periodoId])

  // Conta alunos distintos com notas (usado pelo badge da seção Notas)
  const totalAlunosComNotas = useMemo(() => {
    if (!diario?.notas) return 0
    const set = new Set<string>()
    for (const n of diario.notas) {
      if (n.nota_id) set.add(n.aluno_id)
    }
    return set.size
  }, [diario?.notas])

  if (carregando && !diario) {
    return <LoadingSpinner centered />
  }

  if (erro) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 dark:text-red-300 font-medium">{erro}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    )
  }

  if (!diario) return null
  const { turma, periodo, professores, frequencia, notas, conteudo } = diario

  const mostrarFreq = tipo === 'todos' || tipo === 'frequencia'
  const mostrarNotas = tipo === 'todos' || tipo === 'notas'
  const mostrarConteudo = tipo === 'todos' || tipo === 'conteudo'
  const filtroPorPeriodo = Boolean(periodoId)

  return (
    <div className="space-y-6">
      {/* Voltar */}
      <Link
        href="/admin/professor-turmas"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para vínculos
      </Link>

      {/* Header da turma */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{turma.escola_nome}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Diário de Classe — {turma.codigo}
              {turma.nome ? ` (${turma.nome})` : ''}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2">
              <span><GraduationCap className="inline w-4 h-4 mr-1" /> {turma.serie}</span>
              <span><Calendar className="inline w-4 h-4 mr-1" /> {turma.ano_letivo}</span>
              <span className="capitalize">{turma.turno}</span>
            </div>
          </div>
          <button
            onClick={() => imprimirDiario(diario, { tipo, filtroPeriodoSelecionado: filtroPorPeriodo })}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg shadow-sm transition shrink-0"
            title="Abre uma nova janela com o diário formatado para impressão / salvar em PDF"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar </span>PDF
          </button>
        </div>

        {/* Professores vinculados */}
        {professores.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              <Users className="w-3.5 h-3.5" />
              Professor(es) vinculado(s)
            </div>
            <div className="flex flex-wrap gap-2">
              {professores.map(p => (
                <span
                  key={p.vinculo_id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
                  title={p.professor_email}
                >
                  {p.professor_nome}
                  {p.tipo_vinculo === 'disciplina' && p.disciplina_nome && (
                    <span className="px-1.5 py-0.5 bg-white/60 dark:bg-slate-900/40 text-[10px] rounded">
                      {p.disciplina_nome}
                    </span>
                  )}
                  {p.tipo_vinculo === 'polivalente' && (
                    <span className="px-1.5 py-0.5 bg-white/60 dark:bg-slate-900/40 text-[10px] rounded">
                      polivalente
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Período</label>
            <select
              value={periodoId}
              onChange={e => setPeriodoId(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Todos os períodos</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.numero}º {p.tipo}{p.ativo ? ' (ativo)' : ''} — {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Visualizar</label>
            <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-lg">
              {([
                { v: 'todos', label: 'Tudo', shortLabel: 'Tudo', Icon: ClipboardList },
                { v: 'frequencia', label: 'Frequência', shortLabel: 'Freq.', Icon: ClipboardList },
                { v: 'notas', label: 'Notas', shortLabel: 'Notas', Icon: BookOpen },
                { v: 'conteudo', label: 'Conteúdo', shortLabel: 'Cont.', Icon: FileText },
              ] as const).map(({ v, label, shortLabel, Icon }) => (
                <button
                  key={v}
                  onClick={() => setTipo(v)}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    tipo === v
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{shortLabel ?? label}</span>
                </button>
              ))}
            </div>
          </div>
          {periodo && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight sm:text-right">
              <div>Período selecionado:</div>
              <div className="font-semibold text-gray-700 dark:text-gray-200">
                {formatarData(periodo.data_inicio)} – {formatarData(periodo.data_fim)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cobertura do diário (vs calendário escolar) */}
      {lacunas && <CoberturaDiario lacunas={lacunas} />}
      {!lacunas && carregandoLacunas && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Calculando cobertura do diário…
        </div>
      )}

      {/* Aviso quando não há dados */}
      {!frequencia?.length && !notas?.length && !conteudo?.length && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
          <ClipboardList className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            Nenhum lançamento encontrado para os filtros selecionados.
          </p>
          {periodoId && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Tente selecionar &quot;Todos os períodos&quot; para ver todo o histórico.
            </p>
          )}
        </div>
      )}

      {mostrarFreq && frequencia && frequencia.length > 0 && (
        <SecaoFrequencia
          frequencia={frequencia}
          periodo={periodo}
          filtroPorPeriodo={filtroPorPeriodo}
        />
      )}

      {mostrarNotas && notas && notas.filter(n => n.nota_id).length > 0 && (
        <SecaoNotas
          notas={notas}
          periodo={periodo}
          filtroPorPeriodo={filtroPorPeriodo}
          totalAlunosComNotas={totalAlunosComNotas}
        />
      )}

      {mostrarConteudo && conteudo && conteudo.length > 0 && (
        <SecaoConteudo conteudo={conteudo} periodo={periodo} />
      )}
    </div>
  )
}

export default function DiarioTurmaPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <DiarioTurmaContent />
    </ProtectedRoute>
  )
}
