'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Users, ClipboardList, FileText, BookOpen,
  Calendar, GraduationCap, Building2, AlertCircle, Filter,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/toast'

// ============================================================================
// Tipos do payload (espelha o endpoint /api/admin/turmas/[id]/diario-completo)
// ============================================================================
type Tipo = 'todos' | 'frequencia' | 'notas' | 'conteudo'

interface Periodo {
  id: string
  nome: string
  tipo: string
  numero: number
  ano_letivo: string
  data_inicio: string | null
  data_fim: string | null
  ativo?: boolean
}

interface TurmaInfo {
  id: string
  codigo: string
  nome: string | null
  serie: string
  turno: string
  ano_letivo: string
  escola_id: string
  escola_nome: string
}

interface ProfessorInfo {
  vinculo_id: string
  tipo_vinculo: 'polivalente' | 'disciplina'
  professor_id: string
  professor_nome: string
  professor_email: string
  disciplina_id: string | null
  disciplina_nome: string | null
}

interface FrequenciaLinha {
  aluno_id: string
  aluno_nome: string
  freq_id: string | null
  dias_letivos: number | null
  presencas: number | null
  faltas: number | null
  faltas_justificadas: number | null
  percentual_frequencia: string | number | null
  observacao: string | null
  metodo: string | null
  registrado_por_nome: string | null
  periodo_nome: string | null
  periodo_numero: number | null
}

interface NotaLinha {
  aluno_id: string
  aluno_nome: string
  nota_id: string | null
  disciplina_id: string | null
  disciplina_nome: string | null
  periodo_id: string | null
  periodo_nome: string | null
  periodo_numero: number | null
  nota: string | number | null
  nota_recuperacao: string | number | null
  nota_final: string | number | null
  faltas: number | null
  observacao: string | null
  parecer_descritivo: string | null
  registrado_por_nome: string | null
}

interface ConteudoLinha {
  id: string
  data_aula: string
  conteudo: string | null
  metodologia: string | null
  observacoes: string | null
  criado_em: string
  professor_id: string
  professor_nome: string
  disciplina_id: string | null
  disciplina_nome: string | null
}

interface DiarioPayload {
  turma: TurmaInfo
  periodo: Periodo | null
  professores: ProfessorInfo[]
  frequencia: FrequenciaLinha[] | null
  notas: NotaLinha[] | null
  conteudo: ConteudoLinha[] | null
}

// ============================================================================
// Helpers
// ============================================================================
function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarNota(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return n.toFixed(1).replace('.', ',')
}

function formatarPercentual(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return `${n.toFixed(1).replace('.', ',')}%`
}

function corPercentual(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'text-gray-400'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return 'text-gray-400'
  if (n >= 75) return 'text-emerald-600 dark:text-emerald-400'
  if (n >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function corNota(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'text-gray-400'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return 'text-gray-400'
  if (n >= 7) return 'text-emerald-600 dark:text-emerald-400'
  if (n >= 5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// ============================================================================
// Página
// ============================================================================
function DiarioTurmaContent() {
  const toast = useToast()
  const router = useRouter()
  const params = useParams()
  const turmaId = params.turmaId as string

  const [carregando, setCarregando] = useState(true)
  const [diario, setDiario] = useState<DiarioPayload | null>(null)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [periodoId, setPeriodoId] = useState<string>('')
  const [tipo, setTipo] = useState<Tipo>('todos')
  const [erro, setErro] = useState<string | null>(null)

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

  // Agrupa notas por aluno → disciplina → períodos para uma visão pivotada útil
  const notasAgrupadas = useMemo(() => {
    if (!diario?.notas) return new Map<string, Map<string, NotaLinha[]>>()
    const out = new Map<string, Map<string, NotaLinha[]>>()
    for (const n of diario.notas) {
      if (!n.nota_id) continue // ignora linhas vazias do LEFT JOIN sem nota
      if (!out.has(n.aluno_id)) out.set(n.aluno_id, new Map())
      const porDisciplina = out.get(n.aluno_id)!
      const disc = n.disciplina_nome || '—'
      if (!porDisciplina.has(disc)) porDisciplina.set(disc, [])
      porDisciplina.get(disc)!.push(n)
    }
    return out
  }, [diario?.notas])

  // Lista única de alunos para usar como linhas das tabelas
  const alunos = useMemo(() => {
    const set = new Map<string, string>()
    diario?.frequencia?.forEach(f => set.set(f.aluno_id, f.aluno_nome))
    diario?.notas?.forEach(n => set.set(n.aluno_id, n.aluno_nome))
    return Array.from(set, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [diario?.frequencia, diario?.notas])

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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{turma.escola_nome}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Diário de Classe — {turma.codigo}
              {turma.nome ? ` (${turma.nome})` : ''}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mt-2">
              <span><GraduationCap className="inline w-4 h-4 mr-1" /> {turma.serie}</span>
              <span><Calendar className="inline w-4 h-4 mr-1" /> {turma.ano_letivo}</span>
              <span className="capitalize">{turma.turno}</span>
            </div>
          </div>
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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 w-full sm:w-auto sm:mb-0">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Período</label>
          <select
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white min-w-[180px]"
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
              { v: 'todos', label: 'Tudo', Icon: ClipboardList },
              { v: 'frequencia', label: 'Frequência', Icon: ClipboardList },
              { v: 'notas', label: 'Notas', Icon: BookOpen },
              { v: 'conteudo', label: 'Conteúdo', Icon: FileText },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                onClick={() => setTipo(v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  tipo === v
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        {periodo && (
          <div className="ml-auto text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
            <div>Período selecionado:</div>
            <div className="font-semibold text-gray-700 dark:text-gray-200">
              {formatarData(periodo.data_inicio)} – {formatarData(periodo.data_fim)}
            </div>
          </div>
        )}
      </div>

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

      {/* Seção: Frequência */}
      {mostrarFreq && frequencia && frequencia.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Frequência {periodo ? `— ${periodo.nome}` : '(consolidado de todos os períodos)'}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{frequencia.length} alunos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">Aluno</th>
                  {!periodoId && <th className="px-4 py-2 font-semibold">Período</th>}
                  <th className="px-4 py-2 font-semibold text-right">Dias Letivos</th>
                  <th className="px-4 py-2 font-semibold text-right">Presenças</th>
                  <th className="px-4 py-2 font-semibold text-right">Faltas</th>
                  <th className="px-4 py-2 font-semibold text-right">Just.</th>
                  <th className="px-4 py-2 font-semibold text-right">%</th>
                  <th className="px-4 py-2 font-semibold">Lançado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {frequencia.map((f, i) => (
                  <tr key={`${f.aluno_id}-${f.freq_id || i}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{f.aluno_nome}</td>
                    {!periodoId && (
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                        {f.periodo_numero ? `${f.periodo_numero}º` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.dias_letivos ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.presencas ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.faltas ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.faltas_justificadas ?? '—'}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${corPercentual(f.percentual_frequencia)}`}>
                      {formatarPercentual(f.percentual_frequencia)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{f.registrado_por_nome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Seção: Notas */}
      {mostrarNotas && notas && notas.filter(n => n.nota_id).length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Notas {periodo ? `— ${periodo.nome}` : '(todos os períodos)'}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{notasAgrupadas.size} alunos com notas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">Aluno</th>
                  <th className="px-4 py-2 font-semibold">Disciplina</th>
                  {!periodoId && <th className="px-4 py-2 font-semibold">Período</th>}
                  <th className="px-4 py-2 font-semibold text-right">Nota</th>
                  <th className="px-4 py-2 font-semibold text-right">Recuperação</th>
                  <th className="px-4 py-2 font-semibold text-right">Final</th>
                  <th className="px-4 py-2 font-semibold text-right">Faltas</th>
                  <th className="px-4 py-2 font-semibold">Lançado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {notas.filter(n => n.nota_id).map(n => (
                  <tr key={n.nota_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{n.aluno_nome}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{n.disciplina_nome || '—'}</td>
                    {!periodoId && (
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                        {n.periodo_numero ? `${n.periodo_numero}º` : '—'}
                      </td>
                    )}
                    <td className={`px-4 py-2 text-right font-semibold ${corNota(n.nota)}`}>{formatarNota(n.nota)}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">{formatarNota(n.nota_recuperacao)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${corNota(n.nota_final)}`}>{formatarNota(n.nota_final)}</td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{n.faltas ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{n.registrado_por_nome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Seção: Conteúdo do diário */}
      {mostrarConteudo && conteudo && conteudo.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Conteúdo do diário {periodo ? `— ${periodo.nome}` : '(todos os períodos)'}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{conteudo.length} aulas</span>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {conteudo.map(c => (
              <li key={c.id} className="p-5 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded">
                    <Calendar className="w-3 h-3" />
                    {formatarData(c.data_aula)}
                  </span>
                  {c.disciplina_nome && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded">
                      {c.disciplina_nome}
                    </span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400">por <strong className="font-medium">{c.professor_nome}</strong></span>
                </div>
                {c.conteudo && (
                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Conteúdo</div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{c.conteudo}</p>
                  </div>
                )}
                {c.metodologia && (
                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Metodologia</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.metodologia}</p>
                  </div>
                )}
                {c.observacoes && (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Observações</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.observacoes}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
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
