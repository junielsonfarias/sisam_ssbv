'use client'

import { useState, useEffect } from 'react'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'
import { usePeriodos } from '@/lib/hooks/usePeriodos'
import { useDisciplinas } from '@/lib/hooks/useDisciplinas'
import { useSeries } from '@/lib/use-series'

const selectClass = 'w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white'

export interface FiltroValues {
  anoLetivo: string
  escolaId: string
  serieFiltro: string
  turmaId: string
  disciplinaId: string
  periodoId: string
}

interface SelectFiltroEscolaProps {
  /** Campos visíveis (default: todos) */
  campos?: ('ano' | 'escola' | 'serie' | 'turma' | 'disciplina' | 'periodo')[]
  /** Valores atuais */
  valores: FiltroValues
  /** Callback quando qualquer valor muda */
  onChange: (valores: FiltroValues) => void
  /** Colunas do grid (default: 3) */
  colunas?: 2 | 3 | 4
}

/**
 * Componente de filtros cascata: Ano → Escola → Série → Turma → Disciplina → Período
 * Reutilizável em qualquer página que precise selecionar turma/disciplina/período.
 *
 * Uso:
 *   <SelectFiltroEscola
 *     campos={['ano', 'escola', 'serie', 'turma', 'disciplina', 'periodo']}
 *     valores={filtros}
 *     onChange={setFiltros}
 *   />
 */
export function SelectFiltroEscola({
  campos = ['ano', 'escola', 'serie', 'turma', 'disciplina', 'periodo'],
  valores,
  onChange,
  colunas = 3,
}: SelectFiltroEscolaProps) {
  const { tipoUsuario, usuario, isEscola } = useUserType()
  const { formatSerie, getOrdem, series: seriesEscolares } = useSeries()

  // Auto-definir escola para usuario escola
  useEffect(() => {
    if (isEscola && usuario?.escola_id && !valores.escolaId) {
      onChange({ ...valores, escolaId: usuario.escola_id })
    }
  }, [isEscola, usuario?.escola_id])

  // Hooks de dados
  const { escolas } = useEscolas({ desabilitado: isEscola })
  const { turmas } = useTurmas(valores.escolaId, valores.anoLetivo)
  const { periodos } = usePeriodos(valores.anoLetivo)
  const { disciplinas } = useDisciplinas()

  // Séries únicas das turmas com nomes corretos
  const seriesUnicas = Array.from(new Set(turmas.map(t => t.serie)))
    .map(s => ({ valor: s, nome: formatSerie(s) }))
    .sort((a, b) => getOrdem(a.valor) - getOrdem(b.valor))

  // Turmas filtradas pela série
  const turmasFiltradas = valores.serieFiltro
    ? turmas.filter(t => t.serie === valores.serieFiltro)
    : turmas

  const set = (campo: keyof FiltroValues, valor: string) => {
    const novo = { ...valores, [campo]: valor }
    // Cascata: limpar dependentes
    if (campo === 'escolaId') { novo.serieFiltro = ''; novo.turmaId = ''; novo.disciplinaId = ''; novo.periodoId = '' }
    if (campo === 'serieFiltro') { novo.turmaId = '' }
    if (campo === 'anoLetivo') { novo.serieFiltro = ''; novo.turmaId = ''; novo.periodoId = '' }
    onChange(novo)
  }

  const gridClass = colunas === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
    : colunas === 4 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'

  return (
    <div className={gridClass}>
      {/* Ano Letivo */}
      {campos.includes('ano') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
          <select value={valores.anoLetivo} onChange={e => set('anoLetivo', e.target.value)} className={selectClass}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}

      {/* Escola (oculto para usuário escola) */}
      {campos.includes('escola') && !isEscola && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
          <select value={valores.escolaId} onChange={e => set('escolaId', e.target.value)} className={selectClass}>
            <option value="">Selecione a escola...</option>
            {escolas.map(e => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Série */}
      {campos.includes('serie') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
          <select value={valores.serieFiltro} onChange={e => set('serieFiltro', e.target.value)} className={selectClass}>
            <option value="">Todas as séries</option>
            {seriesUnicas.map(s => (
              <option key={s.valor} value={s.valor}>{s.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Turma */}
      {campos.includes('turma') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
          <select value={valores.turmaId} onChange={e => set('turmaId', e.target.value)} className={selectClass}>
            <option value="">Selecione a turma...</option>
            {turmasFiltradas.map(t => (
              <option key={t.id} value={t.id}>{t.codigo} - {t.nome || formatSerie(t.serie)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Disciplina */}
      {campos.includes('disciplina') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disciplina</label>
          <select value={valores.disciplinaId} onChange={e => set('disciplinaId', e.target.value)} className={selectClass}>
            <option value="">Selecione a disciplina...</option>
            {disciplinas.map(d => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Período */}
      {campos.includes('periodo') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
          <select value={valores.periodoId} onChange={e => set('periodoId', e.target.value)} className={selectClass}>
            <option value="">Selecione o período...</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

/** Valores iniciais para FiltroValues */
export const filtroValoresIniciais: FiltroValues = {
  anoLetivo: new Date().getFullYear().toString(),
  escolaId: '',
  serieFiltro: '',
  turmaId: '',
  disciplinaId: '',
  periodoId: '',
}
