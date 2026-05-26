'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, GraduationCap, Users, BookOpen, AlertCircle } from 'lucide-react'

// ============================================================================
// Tipos (compartilhados com a página pai)
// ============================================================================
export interface Professor {
  id: string
  nome: string
  email: string
  escolas?: string[] // vem do ARRAY_AGG do service de professores
}

export interface Turma {
  id: string
  codigo?: string
  nome: string | null
  serie: string
  turno: string
  escola_id: string
  escola_nome: string
}

export interface Disciplina {
  id: string
  nome: string
}

export interface Escola {
  id: string
  nome: string
}

interface Props {
  anoLetivo: string
  professores: Professor[]
  turmas: Turma[]
  disciplinas: Disciplina[]
  carregandoDados: boolean
  onSubmit: (payload: {
    professor_id: string
    turma_id: string
    tipo_vinculo: 'polivalente' | 'disciplina'
    disciplina_id?: string
  }) => Promise<void>
  onCancel: () => void
}

function isAnosFinais(serie: string): boolean {
  const num = serie.replace(/[^\d]/g, '')
  return ['6', '7', '8', '9'].includes(num)
}

// Ordem pedagógica: ed. infantil (creche → pré II) antes do fundamental (1º → 9º).
// Códigos não previstos caem no final em ordem alfabética.
const SERIE_ORDEM = ['CRE', 'PRE1', 'PRE2', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function ordenarSeries(series: string[]): string[] {
  return [...series].sort((a, b) => {
    const ia = SERIE_ORDEM.indexOf(a)
    const ib = SERIE_ORDEM.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

// Converte o código curto da série (ex: "3", "PRE1") em label legível (ex: "3º Ano", "Pré I")
function formatarSerie(s: string): string {
  if (s === 'CRE') return 'Creche'
  if (s === 'PRE1') return 'Pré I'
  if (s === 'PRE2') return 'Pré II'
  if (/^\d+$/.test(s)) return `${s}º Ano`
  return s
}

export function FormNovoVinculo({
  anoLetivo, professores, turmas, disciplinas, carregandoDados, onSubmit, onCancel,
}: Props) {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregandoEscolas, setCarregandoEscolas] = useState(true)

  // Filtros em cascata
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')

  // Seleção
  const [formProfessor, setFormProfessor] = useState('')
  const [formTurma, setFormTurma] = useState('')
  const [formDisciplina, setFormDisciplina] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  // Carregar escolas com base no ano letivo (filtrado por permissão no backend)
  useEffect(() => {
    setCarregandoEscolas(true)
    fetch(`/api/admin/escolas?ano_letivo=${anoLetivo}`)
      .then(r => r.ok ? r.json() : [])
      .then((data) => {
        const lista: Escola[] = Array.isArray(data) ? data : []
        setEscolas(lista)
        // Se o usuário tem acesso a uma única escola (tipo 'escola'), auto-seleciona
        if (lista.length === 1 && !filtroEscola) setFiltroEscola(lista[0].id)
      })
      .catch(() => setEscolas([]))
      .finally(() => setCarregandoEscolas(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoLetivo])

  // Quando troca a escola, limpa série e turma (cascata)
  useEffect(() => { setFiltroSerie(''); setFormTurma('') }, [filtroEscola])
  useEffect(() => { setFormTurma('') }, [filtroSerie])

  // Séries disponíveis derivadas das turmas filtradas pela escola.
  // Ordem pedagógica (creche → pré → fundamental) via SERIE_ORDEM.
  const seriesDisponiveis = useMemo(() => {
    const base = filtroEscola ? turmas.filter(t => t.escola_id === filtroEscola) : turmas
    const set = new Set(base.map(t => t.serie))
    return ordenarSeries(Array.from(set))
  }, [turmas, filtroEscola])

  // Turmas filtradas por escola + série
  const turmasFiltradas = useMemo(() => {
    return turmas.filter(t =>
      (!filtroEscola || t.escola_id === filtroEscola) &&
      (!filtroSerie || t.serie === filtroSerie)
    )
  }, [turmas, filtroEscola, filtroSerie])

  const turmaSelecionada = turmas.find(t => t.id === formTurma)
  const professorSelecionado = professores.find(p => p.id === formProfessor)
  const tipoVinculoAuto: 'polivalente' | 'disciplina' | '' = turmaSelecionada
    ? (isAnosFinais(turmaSelecionada.serie) ? 'disciplina' : 'polivalente')
    : ''

  // Quando seleciona turma, sincroniza filtro de escola (UX: usuário vê de onde veio)
  useEffect(() => {
    if (turmaSelecionada && filtroEscola !== turmaSelecionada.escola_id) {
      setFiltroEscola(turmaSelecionada.escola_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formTurma])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!formProfessor || !formTurma || !tipoVinculoAuto) {
      setErro('Selecione professor e turma')
      return
    }
    if (tipoVinculoAuto === 'disciplina' && !formDisciplina) {
      setErro('Selecione a disciplina')
      return
    }
    setEnviando(true)
    try {
      await onSubmit({
        professor_id: formProfessor,
        turma_id: formTurma,
        tipo_vinculo: tipoVinculoAuto,
        ...(tipoVinculoAuto === 'disciplina' ? { disciplina_id: formDisciplina } : {}),
      })
    } catch (err) {
      setErro((err as Error).message || 'Erro ao criar vínculo')
    } finally {
      setEnviando(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 outline-none'
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1'

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Novo Vínculo</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Ano letivo: <strong className="text-gray-700 dark:text-gray-300">{anoLetivo}</strong>
        </span>
      </div>

      {/* Filtros em cascata: Escola → Série */}
      {escolas.length > 1 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}><Building2 className="inline w-3 h-3 mr-1" />Escola</label>
            <select
              value={filtroEscola}
              onChange={e => setFiltroEscola(e.target.value)}
              disabled={carregandoEscolas}
              className={inputCls}
            >
              <option value="">
                {carregandoEscolas ? 'Carregando escolas...' : 'Todas as escolas'}
              </option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}><GraduationCap className="inline w-3 h-3 mr-1" />Série</label>
            <select
              value={filtroSerie}
              onChange={e => setFiltroSerie(e.target.value)}
              disabled={!filtroEscola || seriesDisponiveis.length === 0}
              className={inputCls}
            >
              <option value="">
                {!filtroEscola
                  ? 'Selecione uma escola primeiro'
                  : seriesDisponiveis.length === 0
                    ? 'Nenhuma série nesta escola'
                    : 'Todas as séries'}
              </option>
              {seriesDisponiveis.map(s => (
                <option key={s} value={s}>{formatarSerie(s)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Selects principais: Professor + Turma */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}><Users className="inline w-3 h-3 mr-1" />Professor</label>
          <select
            value={formProfessor}
            onChange={e => setFormProfessor(e.target.value)}
            required
            disabled={carregandoDados || professores.length === 0}
            className={inputCls}
          >
            <option value="">
              {carregandoDados
                ? 'Carregando professores...'
                : professores.length === 0
                  ? 'Nenhum professor cadastrado'
                  : 'Selecione o professor'}
            </option>
            {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {professorSelecionado?.escolas && professorSelecionado.escolas.length > 0 && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
              <Building2 className="inline w-3 h-3 mr-1" />
              Atua em: <strong>{professorSelecionado.escolas.join(', ')}</strong>
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}><BookOpen className="inline w-3 h-3 mr-1" />Turma</label>
          <select
            value={formTurma}
            onChange={e => setFormTurma(e.target.value)}
            required
            disabled={carregandoDados || turmasFiltradas.length === 0}
            className={inputCls}
          >
            <option value="">
              {carregandoDados
                ? 'Carregando turmas...'
                : turmasFiltradas.length === 0
                  ? `Nenhuma turma${filtroEscola ? ' nesta escola' : ''}${filtroSerie ? ' nesta série' : ''} em ${anoLetivo}`
                  : 'Selecione a turma'}
            </option>
            {turmasFiltradas.map(t => (
              <option key={t.id} value={t.id}>
                {t.codigo || t.nome || 'Turma'} · {formatarSerie(t.serie)} · {t.turno}
                {!filtroEscola ? ` — ${t.escola_nome}` : ''}
              </option>
            ))}
          </select>
          {turmaSelecionada && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
              <Building2 className="inline w-3 h-3 mr-1" />
              {turmaSelecionada.escola_nome} · <span className="capitalize">{turmaSelecionada.turno}</span>
            </p>
          )}
        </div>
      </div>

      {/* Disciplina (só se anos finais — vínculo por disciplina) */}
      {tipoVinculoAuto === 'disciplina' && (
        <div className="max-w-md">
          <label className={labelCls}>Disciplina (obrigatório para anos finais)</label>
          <select
            value={formDisciplina}
            onChange={e => setFormDisciplina(e.target.value)}
            required
            className={inputCls}
          >
            <option value="">Selecione a disciplina</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
      )}

      {/* Badge do tipo de vínculo (só aparece após selecionar turma) */}
      {tipoVinculoAuto && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Tipo de vínculo:</span>
          <span className={`px-2.5 py-1 font-medium rounded-full ${
            tipoVinculoAuto === 'polivalente'
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          }`}>
            {tipoVinculoAuto === 'polivalente' ? 'Polivalente (anos iniciais)' : 'Por disciplina (anos finais)'}
          </span>
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {erro}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
        <button
          type="submit"
          disabled={enviando || !formProfessor || !formTurma}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {enviando ? 'Criando...' : 'Criar Vínculo'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={enviando}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
