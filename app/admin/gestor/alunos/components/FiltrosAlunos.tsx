'use client'

import { Search } from 'lucide-react'
import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'

interface FiltrosAlunosProps {
  busca: string
  setBusca: (v: string) => void
  filtroPolo: string
  setFiltroPolo: (v: string) => void
  filtroEscola: string
  setFiltroEscola: (v: string) => void
  filtroTurma: string
  setFiltroTurma: (v: string) => void
  filtroSerie: string
  setFiltroSerie: (v: string) => void
  filtroAno: string
  setFiltroAno: (v: string) => void
  polos: PoloSimples[]
  escolas: EscolaSimples[]
  turmas: TurmaSimples[]
  seriesDisponiveis: string[]
  anosDisponiveis: string[]
  carregando: boolean
  onPesquisar: () => void
  onPoloChange: (poloId: string) => void
}

export default function FiltrosAlunos({
  busca, setBusca,
  filtroPolo, setFiltroPolo,
  filtroEscola, setFiltroEscola,
  filtroTurma, setFiltroTurma,
  filtroSerie, setFiltroSerie,
  filtroAno, setFiltroAno,
  polos, escolas, turmas,
  seriesDisponiveis, anosDisponiveis,
  carregando, onPesquisar, onPoloChange,
}: FiltrosAlunosProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Buscar por nome ou codigo..." value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
        </div>
        <select value={filtroPolo} onChange={(e) => { setFiltroPolo(e.target.value); setFiltroEscola(''); setFiltroTurma(''); if (e.target.value) onPoloChange(e.target.value); }}
          className="select-custom w-full">
          <option value="">Todos os polos</option>
          {polos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroEscola} onChange={(e) => { setFiltroEscola(e.target.value); setFiltroTurma(''); }}
          className="select-custom w-full" disabled={!filtroPolo}>
          <option value="">Todas as escolas</option>
          {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}
          className="select-custom w-full" disabled={!filtroEscola}>
          <option value="">Todas as turmas</option>
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.codigo} - {t.nome || ''}</option>)}
        </select>
        <select value={filtroSerie} onChange={(e) => setFiltroSerie(e.target.value)} className="select-custom w-full">
          <option value="">Todas as series</option>
          {seriesDisponiveis.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className="select-custom w-full">
          <option value="">Todos os anos</option>
          {anosDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={onPesquisar} disabled={carregando}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-colors">
          <Search className="w-4 h-4" />
          {carregando ? 'Pesquisando...' : 'Pesquisar'}
        </button>
      </div>
    </div>
  )
}
