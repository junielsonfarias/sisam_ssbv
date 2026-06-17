'use client'

import { FileText } from 'lucide-react'
import { useSeries } from '@/lib/use-series'
import type { EscolaSimples, Disciplina, Periodo, AvaliacaoTurma } from './types'

interface PainelSelecaoProps {
  tipoUsuario: string
  escolas: EscolaSimples[]
  turmas: { id: string; codigo: string; nome: string | null; serie: string }[]
  series: { valor: string; nome: string }[]
  disciplinas: Disciplina[]
  periodos: Periodo[]
  escolaId: string
  serieFiltro: string
  turmaId: string
  disciplinaId: string
  periodoId: string
  anoLetivo: string
  setEscolaId: (v: string) => void
  setSerieFiltro: (v: string) => void
  setTurmaId: (v: string) => void
  setDisciplinaId: (v: string) => void
  setPeriodoId: (v: string) => void
  setAnoLetivo: (v: string) => void
  onIniciar: () => void
  avaliacaoTurma: AvaliacaoTurma | null
}

export function PainelSelecao({
  tipoUsuario, escolas, turmas, series, disciplinas, periodos,
  escolaId, serieFiltro, turmaId, disciplinaId, periodoId, anoLetivo,
  setEscolaId, setSerieFiltro, setTurmaId, setDisciplinaId, setPeriodoId, setAnoLetivo,
  onIniciar, avaliacaoTurma,
}: PainelSelecaoProps) {
  const { formatSerie } = useSeries()
  const tipoResultado = avaliacaoTurma?.tipo_avaliacao?.tipo_resultado
  const isParecer = tipoResultado === 'parecer'
  // Parecer nao precisa de disciplina
  const podeIniciar = turmaId && periodoId && (isParecer || disciplinaId)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Selecione a turma e disciplina</h2>

      {/* Badge do tipo de avaliacao */}
      {avaliacaoTurma && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
          tipoResultado === 'parecer' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' :
          tipoResultado === 'conceito' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current" />
          {avaliacaoTurma.tipo_avaliacao.nome}
          {avaliacaoTurma.regra_avaliacao && (
            <span className="text-xs opacity-70">| {avaliacaoTurma.regra_avaliacao.nome}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ano letivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
          <select
            value={anoLetivo}
            onChange={e => setAnoLetivo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Escola (so admin/tecnico) */}
        {tipoUsuario !== 'escola' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
            <select
              value={escolaId}
              onChange={e => setEscolaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Selecione a escola...</option>
              {escolas.map((e: any) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Serie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
          <select
            value={serieFiltro}
            onChange={e => setSerieFiltro(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">Todas as séries</option>
            {series.map((s: any) => (
              <option key={s.valor} value={s.valor}>{s.nome}</option>
            ))}
          </select>
        </div>

        {/* Turma */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
          <select
            value={turmaId}
            onChange={e => setTurmaId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">Selecione a turma...</option>
            {turmas.map((t: any) => (
              <option key={t.id} value={t.id}>{t.codigo} - {t.nome || formatSerie(t.serie)}</option>
            ))}
          </select>
        </div>

        {/* Disciplina — ocultar para Parecer */}
        {!isParecer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
            <select
              value={disciplinaId}
              onChange={e => setDisciplinaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">Selecione a disciplina...</option>
              {disciplinas.map((d: any) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Periodo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
          <select
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">Selecione o período...</option>
            {periodos.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onIniciar}
        disabled={!podeIniciar}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
          podeIniciar
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        <FileText className="w-4 h-4" />
        {isParecer ? 'Lançar Pareceres' : 'Lançar Notas'}
      </button>
    </div>
  )
}
