'use client'

import { useState } from 'react'
import { Search, Filter, X, Building2 } from 'lucide-react'
import type { FiltrosState, Turma } from './tipos'
import { corDoTurno, etapaDaSerie, ORDEM_ETAPA, FILTROS_DEFAULT } from './tipos'

interface Props {
  turmas: Turma[]
  filtros: FiltrosState
  onChange: (f: FiltrosState) => void
}

export function BarraFiltros({ turmas, filtros, onChange }: Props) {
  const [aberto, setAberto] = useState(false)

  if (turmas.length === 0) return null

  // Opcoes derivadas das turmas carregadas
  const escolasMap = new Map<string, string>()
  turmas.forEach(t => escolasMap.set(t.escola_id, t.escola_nome))
  const escolas = Array.from(escolasMap.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const turnosSet = new Set<string>()
  turmas.forEach(t => { if (t.turno) turnosSet.add(t.turno) })
  const turnos = Array.from(turnosSet).sort()

  const seriesPorEtapaMap = new Map<string, Set<string>>()
  turmas.forEach(t => {
    const etapa = etapaDaSerie(t.serie, t.etapa)
    if (!seriesPorEtapaMap.has(etapa)) seriesPorEtapaMap.set(etapa, new Set())
    seriesPorEtapaMap.get(etapa)!.add(t.serie)
  })
  const seriesPorEtapa = ORDEM_ETAPA
    .filter(e => seriesPorEtapaMap.has(e))
    .map(e => ({ etapa: e, series: Array.from(seriesPorEtapaMap.get(e)!).sort() }))

  const tiposVinculo = new Set(turmas.map(t => t.tipo_vinculo))
  const temAmbosVinculos = tiposVinculo.has('polivalente') && tiposVinculo.has('disciplina')

  const temFiltrosAtivos =
    filtros.busca !== '' ||
    filtros.escolas.length > 0 ||
    filtros.turnos.length > 0 ||
    filtros.serie !== '' ||
    filtros.tipoVinculo !== 'todos'

  const contagemAtivos =
    (filtros.busca ? 1 : 0) +
    filtros.escolas.length +
    filtros.turnos.length +
    (filtros.serie ? 1 : 0) +
    (filtros.tipoVinculo !== 'todos' ? 1 : 0)

  const set = (patch: Partial<FiltrosState>) => onChange({ ...filtros, ...patch })

  const toggleTurno = (turno: string) =>
    set({ turnos: filtros.turnos.includes(turno)
        ? filtros.turnos.filter(x => x !== turno)
        : [...filtros.turnos, turno] })

  const toggleEscola = (id: string) =>
    set({ escolas: filtros.escolas.includes(id)
        ? filtros.escolas.filter(x => x !== id)
        : [...filtros.escolas, id] })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 space-y-3">
      {/* Linha 1: busca + toggle mobile + limpar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar turma, série ou disciplina…"
            value={filtros.busca}
            onChange={e => set({ busca: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => setAberto(v => !v)}
          className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          aria-expanded={aberto}
        >
          <Filter className="h-4 w-4" />
          {contagemAtivos > 0 && (
            <span className="ml-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
              {contagemAtivos}
            </span>
          )}
        </button>
        {temFiltrosAtivos && (
          <button
            onClick={() => onChange(FILTROS_DEFAULT)}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
      </div>

      {/* Linha 2: filtros (sempre visivel em desktop; togglable em mobile) */}
      <div className={`${aberto ? 'block' : 'hidden'} sm:block space-y-3`}>
        {/* Turno — chips */}
        {turnos.length > 1 && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Turno</label>
            <div className="flex flex-wrap gap-1.5">
              {turnos.map(turno => {
                const ativo = filtros.turnos.includes(turno)
                const cor = corDoTurno(turno)
                const Icon = cor.icone
                return (
                  <button
                    key={turno}
                    onClick={() => toggleTurno(turno)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full border transition min-h-[32px] ${
                      ativo
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="capitalize">{turno}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Escola — chips (somente se > 1) */}
        {escolas.length > 1 && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Escola</label>
            <div className="flex flex-wrap gap-1.5">
              {escolas.map(esc => {
                const ativo = filtros.escolas.includes(esc.id)
                return (
                  <button
                    key={esc.id}
                    onClick={() => toggleEscola(esc.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full border transition min-h-[32px] ${
                      ativo
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-600 hover:border-emerald-400'
                    }`}
                    title={esc.nome}
                  >
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{esc.nome}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Serie + Tipo vinculo lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seriesPorEtapa.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Série / Etapa</label>
              <select
                value={filtros.serie}
                onChange={e => set({ serie: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todas as séries</option>
                {seriesPorEtapa.map(({ etapa, series }) => (
                  <optgroup key={etapa} label={etapa}>
                    {series.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {temAmbosVinculos && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tipo de vínculo</label>
              <div className="inline-flex bg-gray-100 dark:bg-slate-900/50 p-1 rounded-lg w-full">
                {([
                  { v: 'todos', l: 'Tudo' },
                  { v: 'polivalente', l: 'Polivalente' },
                  { v: 'disciplina', l: 'Disciplina' },
                ] as const).map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => set({ tipoVinculo: v })}
                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition ${
                      filtros.tipoVinculo === v
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {temFiltrosAtivos && (
          <div className="sm:hidden">
            <button
              onClick={() => onChange(FILTROS_DEFAULT)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
