'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, GraduationCap, Users, BookOpen, AlertCircle, CheckSquare, Square, X } from 'lucide-react'
import {
  tipoDaSerie, ordenarSeries, ordenarTurmas, formatarSerie,
  type Professor, type Turma, type Disciplina, type Escola, type VinculoSubmitPayload,
} from './vinculo-helpers'

// Re-export para preservar imports existentes no projeto (page.tsx etc.)
export type { Professor, Turma, Disciplina, Escola, VinculoSubmitPayload }

interface Props {
  anoLetivo: string
  professores: Professor[]
  turmas: Turma[]
  disciplinas: Disciplina[]
  carregandoDados: boolean
  onSubmit: (payload: VinculoSubmitPayload) => Promise<void>
  onCancel: () => void
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
  const [formTurmas, setFormTurmas] = useState<Set<string>>(new Set())
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

  // Quando troca a escola, limpa série e turmas selecionadas (cascata)
  useEffect(() => { setFiltroSerie(''); setFormTurmas(new Set()) }, [filtroEscola])
  // Trocar série NÃO limpa seleção (usuário pode estar acumulando turmas de várias séries)

  // Séries disponíveis derivadas das turmas filtradas pela escola.
  const seriesDisponiveis = useMemo(() => {
    const base = filtroEscola ? turmas.filter(t => t.escola_id === filtroEscola) : turmas
    const set = new Set(base.map(t => t.serie))
    return ordenarSeries(Array.from(set))
  }, [turmas, filtroEscola])

  // Turmas filtradas por escola + série, em ordem pedagógica
  const turmasFiltradas = useMemo(() => {
    const base = turmas.filter(t =>
      (!filtroEscola || t.escola_id === filtroEscola) &&
      (!filtroSerie || t.serie === filtroSerie)
    )
    return ordenarTurmas(base)
  }, [turmas, filtroEscola, filtroSerie])

  // Turmas selecionadas (com dados completos)
  const turmasSelecionadas = useMemo(() => {
    return turmas.filter(t => formTurmas.has(t.id))
  }, [turmas, formTurmas])

  // Inspeção do tipo de vínculo derivado das séries selecionadas
  const tiposSelecionados = useMemo(() => {
    return new Set(turmasSelecionadas.map(t => tipoDaSerie(t.serie)))
  }, [turmasSelecionadas])

  const tipoVinculoAuto: 'polivalente' | 'disciplina' | '' =
    tiposSelecionados.size === 1 ? Array.from(tiposSelecionados)[0] : ''
  const tipoMisto = tiposSelecionados.size > 1

  const professorSelecionado = professores.find(p => p.id === formProfessor)

  function toggleTurma(turmaId: string) {
    setFormTurmas(prev => {
      const next = new Set(prev)
      if (next.has(turmaId)) next.delete(turmaId)
      else next.add(turmaId)
      return next
    })
  }

  function selecionarTodasFiltradas() {
    setFormTurmas(prev => {
      const next = new Set(prev)
      turmasFiltradas.forEach(t => next.add(t.id))
      return next
    })
  }

  function limparSelecao() {
    setFormTurmas(new Set())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!formProfessor) {
      setErro('Selecione o professor')
      return
    }
    if (formTurmas.size === 0) {
      setErro('Selecione pelo menos uma turma')
      return
    }
    if (tipoMisto) {
      setErro('As turmas selecionadas misturam vínculos polivalente (anos iniciais) e por disciplina (anos finais). Crie vínculos em lotes separados.')
      return
    }
    if (tipoVinculoAuto === 'disciplina' && !formDisciplina) {
      setErro('Selecione a disciplina (será aplicada a todas as turmas selecionadas)')
      return
    }

    setEnviando(true)
    try {
      await onSubmit({
        professor_id: formProfessor,
        turma_ids: Array.from(formTurmas),
        tipo_vinculo: tipoVinculoAuto as 'polivalente' | 'disciplina',
        ...(tipoVinculoAuto === 'disciplina' ? { disciplina_id: formDisciplina } : {}),
      })
    } catch (err) {
      setErro((err as Error).message || 'Erro ao criar vínculos')
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

      {/* Professor (single) */}
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

      {/* Filtros em cascata: Escola → Série */}
      <div className="grid gap-3 sm:grid-cols-2">
        {escolas.length > 1 && (
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
        )}
        <div>
          <label className={labelCls}><GraduationCap className="inline w-3 h-3 mr-1" />Filtrar por série</label>
          <select
            value={filtroSerie}
            onChange={e => setFiltroSerie(e.target.value)}
            disabled={seriesDisponiveis.length === 0}
            className={inputCls}
          >
            <option value="">
              {seriesDisponiveis.length === 0 ? 'Nenhuma série disponível' : 'Todas as séries'}
            </option>
            {seriesDisponiveis.map(s => (
              <option key={s} value={s}>{formatarSerie(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de turmas (multi-select via cards-checkbox) */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
          <label className={labelCls + ' mb-0'}>
            <BookOpen className="inline w-3 h-3 mr-1" />Turmas
            <span className="ml-2 text-gray-700 dark:text-gray-300 normal-case">
              ({formTurmas.size} selecionada{formTurmas.size === 1 ? '' : 's'} · {turmasFiltradas.length} visível{turmasFiltradas.length === 1 ? '' : 'eis'})
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selecionarTodasFiltradas}
              disabled={turmasFiltradas.length === 0}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckSquare className="w-3 h-3" />
              Selecionar todas filtradas
            </button>
            <button
              type="button"
              onClick={limparSelecao}
              disabled={formTurmas.size === 0}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-3 h-3" />
              Limpar
            </button>
          </div>
        </div>

        {turmasFiltradas.length === 0 ? (
          <div className="p-4 bg-gray-50 dark:bg-slate-900/30 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-xs text-gray-500 dark:text-gray-400 text-center">
            {carregandoDados
              ? 'Carregando turmas...'
              : `Nenhuma turma${filtroEscola ? ' nesta escola' : ''}${filtroSerie ? ' nesta série' : ''} em ${anoLetivo}.`}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-80 overflow-y-auto pr-1">
            {turmasFiltradas.map(t => {
              const checked = formTurmas.has(t.id)
              const tipo = tipoDaSerie(t.serie)
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggleTurma(t.id)}
                  className={`text-left p-3 rounded-lg border transition flex items-start gap-2.5 ${
                    checked
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 shadow-sm'
                      : 'bg-white dark:bg-slate-900/30 border-gray-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                  }`}
                >
                  {checked
                    ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    : <Square className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {t.codigo || t.nome || 'Turma'}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatarSerie(t.serie)} · <span className="capitalize">{t.turno}</span>
                    </div>
                    {!filtroEscola && (
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {t.escola_nome}
                      </div>
                    )}
                    <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded ${
                      tipo === 'polivalente'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    }`}>
                      {tipo === 'polivalente' ? 'Polivalente' : 'Por disciplina'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Aviso de tipos mistos */}
      {tipoMisto && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Atenção:</strong> as turmas selecionadas misturam <strong>polivalente</strong> (anos iniciais) e <strong>por disciplina</strong> (anos finais). Crie em lotes separados — cada tipo precisa de um vínculo diferente.
          </div>
        </div>
      )}

      {/* Disciplina (só se TODAS selecionadas forem por disciplina) */}
      {tipoVinculoAuto === 'disciplina' && (
        <div className="max-w-md">
          <label className={labelCls}>Disciplina (será aplicada a todas as turmas selecionadas)</label>
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

      {/* Badge do tipo de vínculo */}
      {tipoVinculoAuto && !tipoMisto && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Tipo de vínculo:</span>
          <span className={`px-2.5 py-1 font-medium rounded-full ${
            tipoVinculoAuto === 'polivalente'
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          }`}>
            {tipoVinculoAuto === 'polivalente' ? 'Polivalente (anos iniciais)' : 'Por disciplina (anos finais)'}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            · {formTurmas.size} vínculo{formTurmas.size === 1 ? '' : 's'} será{formTurmas.size === 1 ? '' : 'ão'} criado{formTurmas.size === 1 ? '' : 's'}
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
          disabled={enviando || !formProfessor || formTurmas.size === 0 || tipoMisto}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {enviando
            ? 'Criando...'
            : formTurmas.size <= 1
              ? 'Criar Vínculo'
              : `Criar ${formTurmas.size} Vínculos`}
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
