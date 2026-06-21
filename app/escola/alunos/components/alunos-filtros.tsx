'use client'

import { Search, GraduationCap, Users, AlertTriangle, CheckCircle } from 'lucide-react'

interface AlunosFiltrosProps {
  resumo: { total: number; ativos: number; transferidos: number; pcd: number }
  busca: string
  escolaNome: string
  filtroSerie: string
  filtroTurma: string
  filtroAno: string
  seriesDisponiveis: string[]
  turmas: any[]
  setBusca: (v: string) => void
  setFiltroSerie: (v: string) => void
  setFiltroTurma: (v: string) => void
  setFiltroAno: (v: string) => void
}

export function AlunosFiltros({
  resumo, busca, escolaNome, filtroSerie, filtroTurma, filtroAno,
  seriesDisponiveis, turmas, setBusca, setFiltroSerie, setFiltroTurma, setFiltroAno,
}: AlunosFiltrosProps) {
  return (
    <>
      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', valor: resumo.total, icon: Users, cor: 'text-blue-600' },
          { label: 'Ativos', valor: resumo.ativos, icon: CheckCircle, cor: 'text-emerald-600' },
          { label: 'Transferidos', valor: resumo.transferidos, icon: AlertTriangle, cor: 'text-orange-600' },
          { label: 'PCD', valor: resumo.pcd, icon: GraduationCap, cor: 'text-purple-600' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 text-center">
            <c.icon className={`w-5 h-5 mx-auto mb-1 ${c.cor}`} />
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{c.valor}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Aluno</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Nome do aluno..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
            <input
              type="text"
              value={escolaNome || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
            <select
              value={filtroSerie}
              onChange={e => { setFiltroSerie(e.target.value); setFiltroTurma('') }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
            >
              <option value="">Todas</option>
              {seriesDisponiveis.map(serie => <option key={serie} value={serie}>{serie}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
            <select
              value={filtroTurma}
              onChange={e => setFiltroTurma(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              disabled={!filtroSerie || turmas.length === 0}
            >
              <option value="">Todas</option>
              {turmas.map(turma => (
                <option key={turma.id} value={turma.id}>
                  {turma.codigo || turma.nome || `Turma ${turma.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
            <input
              type="text"
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
              placeholder="Ex: 2026"
            />
          </div>
        </div>
      </div>
    </>
  )
}
