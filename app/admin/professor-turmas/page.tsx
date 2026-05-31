'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, Search, BookOpen, GraduationCap, Users, AlertCircle,
  CheckCircle2, XCircle, Trash2, RefreshCw, Filter,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useAnoLetivo, AnoLetivoSelect } from '@/lib/contexts/ano-letivo-context'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface SlotVinculo {
  tipo: 'polivalente' | 'disciplina'
  disciplina_id: string | null
  disciplina_nome: string | null
  disciplina_abrev: string | null
  vinculo: null | {
    id: string
    professor_id: string
    professor_nome: string
    professor_email: string
  }
}
interface TurmaComSlots {
  turma_id: string
  codigo: string | null
  nome: string | null
  serie: string
  turno: string | null
  ano_letivo: string
  escola_id: string
  escola_nome: string
  polo_id: string | null
  polo_nome: string | null
  is_anos_finais: boolean
  total_disciplinas_esperadas: number
  total_disciplinas_com_professor: number
  slots: SlotVinculo[]
}
interface Professor { id: string; nome: string }
interface Escola { id: string; nome: string; polo_id: string | null }
interface Polo { id: string; nome: string }

function PainelTurmasProfessores() {
  const { anoLetivo } = useAnoLetivo()
  const [turmas, setTurmas] = useState<TurmaComSlots[]>([])
  const [professores, setProfessores] = useState<Professor[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [polos, setPolos] = useState<Polo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroPolo, setFiltroPolo] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroTurno, setFiltroTurno] = useState('')
  const [filtroVinculo, setFiltroVinculo] = useState<'todos' | 'com' | 'sem' | 'parcial'>('todos')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Estado de vinculação inline por (turma_id, slot_key)
  const [vinculandoKey, setVinculandoKey] = useState<string | null>(null)
  const [novoProfessor, setNovoProfessor] = useState('')
  const [salvandoVinculo, setSalvandoVinculo] = useState(false)

  // Confirmacao de remocao (substitui confirm() nativo)
  const [confirmandoRemocao, setConfirmandoRemocao] = useState<{
    vinculo_id: string; descricao: string
  } | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const fetchTurmas = async () => {
    setCarregando(true)
    setErro('')
    try {
      const params = new URLSearchParams({ mode: 'por_turma', ano_letivo: anoLetivo })
      if (filtroEscola) params.set('escola_id', filtroEscola)
      if (filtroPolo) params.set('polo_id', filtroPolo)
      if (filtroSerie) params.set('serie', filtroSerie)
      if (filtroTurno) params.set('turno', filtroTurno)
      const res = await fetch(`/api/admin/professor-turmas?${params.toString()}`)
      if (!res.ok) throw new Error('Erro ao carregar turmas')
      const data = await res.json()
      setTurmas(data.turmas || [])
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const fetchSelects = async () => {
    try {
      const [pRes, eRes, poRes] = await Promise.all([
        fetch('/api/admin/professores'),
        fetch('/api/admin/escolas'),
        fetch('/api/admin/polos').catch(() => null),
      ])
      const pData = await pRes.json()
      const eData = await eRes.json()
      const poData = poRes && poRes.ok ? await poRes.json() : { polos: [] }
      setProfessores(pData.professores || [])
      setEscolas(Array.isArray(eData) ? eData : eData.escolas || [])
      setPolos(Array.isArray(poData) ? poData : poData.polos || [])
    } catch {
      // selects sao opcionais — UI degradada mas funcional
    }
  }

  useEffect(() => { fetchSelects() }, [])
  useEffect(() => { fetchTurmas() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [anoLetivo, filtroEscola, filtroPolo, filtroSerie, filtroTurno])

  // Filtros client-side: busca textual e tipo de vinculo
  const turmasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return turmas.filter(t => {
      if (q) {
        const hit = (t.escola_nome + ' ' + (t.codigo || '') + ' ' + (t.nome || '') + ' ' + t.serie).toLowerCase().includes(q)
        if (!hit) return false
      }
      if (filtroVinculo === 'com') return t.total_disciplinas_com_professor === t.total_disciplinas_esperadas && t.total_disciplinas_esperadas > 0
      if (filtroVinculo === 'sem') return t.total_disciplinas_com_professor === 0
      if (filtroVinculo === 'parcial') return t.total_disciplinas_com_professor > 0 && t.total_disciplinas_com_professor < t.total_disciplinas_esperadas
      return true
    })
  }, [turmas, busca, filtroVinculo])

  // Agrupar por escola
  const porEscola = useMemo(() => {
    const map = new Map<string, { escola_nome: string; polo_nome: string | null; turmas: TurmaComSlots[] }>()
    turmasFiltradas.forEach(t => {
      const k = t.escola_id
      if (!map.has(k)) map.set(k, { escola_nome: t.escola_nome, polo_nome: t.polo_nome, turmas: [] })
      map.get(k)!.turmas.push(t)
    })
    return Array.from(map.entries())
  }, [turmasFiltradas])

  const qtdFiltrosAtivos = [filtroEscola, filtroPolo, filtroSerie, filtroTurno, filtroVinculo !== 'todos' ? 'v' : ''].filter(Boolean).length

  const limparFiltros = () => {
    setFiltroEscola(''); setFiltroPolo(''); setFiltroSerie(''); setFiltroTurno(''); setFiltroVinculo('todos')
  }

  const vincularProfessor = async (turma: TurmaComSlots, slot: SlotVinculo) => {
    if (!novoProfessor) {
      setErro('Selecione o professor')
      return
    }
    setSalvandoVinculo(true)
    setErro(''); setMensagem('')
    try {
      const body: any = {
        professor_id: novoProfessor,
        turma_id: turma.turma_id,
        tipo_vinculo: slot.tipo,
        ano_letivo: anoLetivo,
      }
      if (slot.disciplina_id) body.disciplina_id = slot.disciplina_id

      const res = await fetch('/api/admin/professor-turmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao vincular')

      setMensagem(`Professor vinculado a ${turma.codigo || turma.serie}${slot.disciplina_nome ? ` (${slot.disciplina_nome})` : ''}`)
      setVinculandoKey(null)
      setNovoProfessor('')
      fetchTurmas()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setSalvandoVinculo(false)
    }
  }

  const confirmarRemocao = async () => {
    if (!confirmandoRemocao) return
    setRemovendo(true)
    setErro(''); setMensagem('')
    try {
      const res = await fetch('/api/admin/professor-turmas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vinculo_id: confirmandoRemocao.vinculo_id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.mensagem || 'Erro ao remover')
      }
      setMensagem('Vínculo removido')
      setConfirmandoRemocao(null)
      fetchTurmas()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Turmas e Professores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Visualize todas as turmas, indicador de vinculação e acesse o diário de cada uma.
          </p>
        </div>
        <AnoLetivoSelect />
      </div>

      {/* Busca + toggle filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Buscar por escola, turma, código ou série..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            aria-label="Buscar turmas"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => setMostrarFiltros(v => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {qtdFiltrosAtivos > 0 && (
            <span className="inline-flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5">
              {qtdFiltrosAtivos}
            </span>
          )}
        </button>
        {qtdFiltrosAtivos > 0 && (
          <button onClick={limparFiltros} className="px-3 py-2 text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 inline-flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>

      {mostrarFiltros && (
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {polos.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Polo</label>
              <select value={filtroPolo} onChange={e => setFiltroPolo(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                <option value="">Todos os polos</option>
                {polos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Escola</label>
            <select value={filtroEscola} onChange={e => setFiltroEscola(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option value="">Todas as escolas</option>
              {escolas.filter(e => !filtroPolo || e.polo_id === filtroPolo).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Série</label>
            <select value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option value="">Todas</option>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => <option key={n} value={n}>{n}º Ano</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turno</label>
            <select value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option value="">Todos</option>
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="noturno">Noturno</option>
              <option value="integral">Integral</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vinculação</label>
            <select value={filtroVinculo} onChange={e => setFiltroVinculo(e.target.value as any)} className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
              <option value="todos">Todas</option>
              <option value="com">Com professor (completo)</option>
              <option value="parcial">Vinculação parcial</option>
              <option value="sem">Sem professor</option>
            </select>
          </div>
        </div>
      )}

      {/* Mensagens */}
      {mensagem && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {mensagem}
        </div>
      )}
      {erro && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {erro}
        </div>
      )}

      {/* Lista por escola */}
      {carregando ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : turmasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p>Nenhuma turma encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {porEscola.map(([escolaId, { escola_nome, polo_nome, turmas: tsEscola }]) => (
            <section key={escolaId}>
              <header className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">{escola_nome}</h2>
                  {polo_nome && <p className="text-xs text-gray-500 dark:text-gray-400">{polo_nome}</p>}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{tsEscola.length} turma(s)</span>
              </header>

              <div className="grid gap-3">
                {tsEscola.map(t => {
                  const completo = t.total_disciplinas_com_professor === t.total_disciplinas_esperadas && t.total_disciplinas_esperadas > 0
                  const parcial = t.total_disciplinas_com_professor > 0 && t.total_disciplinas_com_professor < t.total_disciplinas_esperadas
                  const sem = t.total_disciplinas_com_professor === 0

                  return (
                    <article key={t.turma_id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {/* Header da turma */}
                      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {t.codigo || t.nome || 'Sem código'}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {t.serie} · {t.turno || 'sem turno'}
                            </span>
                            {t.is_anos_finais ? (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                Anos finais
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                Anos iniciais
                              </span>
                            )}
                            {completo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                <CheckCircle2 className="h-3 w-3" /> Completo
                              </span>
                            )}
                            {parcial && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-3 w-3" /> {t.total_disciplinas_com_professor}/{t.total_disciplinas_esperadas} disciplinas
                              </span>
                            )}
                            {sem && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                <XCircle className="h-3 w-3" /> Sem professor
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/admin/turmas/${t.turma_id}/diario`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm whitespace-nowrap"
                          aria-label={`Abrir diário da turma ${t.codigo || t.serie}`}
                        >
                          <BookOpen className="h-4 w-4" />
                          Diário
                        </Link>
                      </div>

                      {/* Slots */}
                      {t.is_anos_finais && t.slots.length === 0 ? (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Sem disciplinas configuradas em <code>horarios_aula</code>. Cadastre os horários da turma antes de vincular professores.
                          </span>
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                          {t.slots.map((slot, idx) => {
                            const key = `${t.turma_id}-${slot.disciplina_id || 'polivalente'}-${idx}`
                            return (
                              <li key={key} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {slot.tipo === 'polivalente' ? (
                                    <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded">
                                      {slot.disciplina_abrev || slot.disciplina_nome?.slice(0, 3).toUpperCase()}
                                    </span>
                                  )}
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                    {slot.tipo === 'polivalente' ? 'Professor polivalente' : slot.disciplina_nome}
                                  </span>
                                  {slot.vinculo ? (
                                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                      — <span className="font-medium">{slot.vinculo.professor_nome}</span>
                                    </span>
                                  ) : (
                                    <span className="text-xs text-red-600 dark:text-red-400 italic">— sem professor</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {slot.vinculo ? (
                                    <>
                                      <button
                                        onClick={() => { setVinculandoKey(key); setNovoProfessor('') }}
                                        className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                                        title="Substituir professor"
                                        aria-label="Substituir professor"
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmandoRemocao({
                                          vinculo_id: slot.vinculo!.id,
                                          descricao: `${slot.vinculo!.professor_nome} em ${t.codigo || t.serie}${slot.disciplina_nome ? ` (${slot.disciplina_nome})` : ''}`,
                                        })}
                                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                        title="Remover vínculo"
                                        aria-label="Remover vínculo"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => { setVinculandoKey(key); setNovoProfessor('') }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Vincular
                                    </button>
                                  )}
                                </div>

                                {/* Form inline de vinculação */}
                                {vinculandoKey === key && (
                                  <div className="w-full mt-2 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <select
                                      value={novoProfessor}
                                      onChange={e => setNovoProfessor(e.target.value)}
                                      aria-label="Selecionar professor"
                                      className="flex-1 px-2 py-1.5 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                                    >
                                      <option value="">Selecione um professor</option>
                                      {professores
                                        .filter(p => p.id !== slot.vinculo?.professor_id)
                                        .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </select>
                                    <button
                                      onClick={() => vincularProfessor(t, slot)}
                                      disabled={salvandoVinculo || !novoProfessor}
                                      className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      {salvandoVinculo ? 'Salvando...' : (slot.vinculo ? 'Substituir' : 'Vincular')}
                                    </button>
                                    <button
                                      onClick={() => { setVinculandoKey(null); setNovoProfessor('') }}
                                      className="px-2 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Confirmacao de remocao de vinculo */}
      <ConfirmModal
        aberto={confirmandoRemocao !== null}
        titulo="Remover vínculo"
        mensagem={confirmandoRemocao
          ? `Remover ${confirmandoRemocao.descricao}? O professor ficará sem acesso a esta turma/disciplina. Os dados de frequência e notas já lançados são preservados.`
          : ''
        }
        variant="danger"
        textoConfirmar="Remover"
        onConfirmar={confirmarRemocao}
        onFechar={() => { if (!removendo) setConfirmandoRemocao(null) }}
        processando={removendo}
      />
    </div>
  )
}

export default function ProfessorTurmasPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <PainelTurmasProfessores />
    </ProtectedRoute>
  )
}
