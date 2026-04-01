'use client'

import { Search } from 'lucide-react'

interface ConfiguracaoSerie {
  id: string
  serie: string
  nome_serie: string
  qtd_questoes_lp: number
  qtd_questoes_mat: number
  qtd_questoes_ch: number
  qtd_questoes_cn: number
  total_questoes_objetivas: number
  tem_producao_textual: boolean
  qtd_itens_producao: number
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
}

interface FiltrosQuestoesProps {
  busca: string
  onBuscaChange: (valor: string) => void
  filtroSerie: string
  onFiltroSerieChange: (valor: string) => void
  filtroDisciplina: string
  onFiltroDisciplinaChange: (valor: string) => void
  filtroTipo: string
  onFiltroTipoChange: (valor: string) => void
  configSeries: ConfiguracaoSerie[]
  totalFiltradas: number
  totalQuestoes: number
  onLimparFiltros: () => void
}

export default function FiltrosQuestoes({
  busca,
  onBuscaChange,
  filtroSerie,
  onFiltroSerieChange,
  filtroDisciplina,
  onFiltroDisciplinaChange,
  filtroTipo,
  onFiltroTipoChange,
  configSeries,
  totalFiltradas,
  totalQuestoes,
  onLimparFiltros,
}: FiltrosQuestoesProps) {
  const temFiltro = busca || filtroSerie || filtroTipo || filtroDisciplina

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar questões..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        <select
          value={filtroSerie}
          onChange={(e) => onFiltroSerieChange(e.target.value)}
          className="select-custom w-full"
        >
          <option value="">Todas as séries</option>
          {configSeries.map(config => (
            <option key={config.id} value={config.serie}>
              {config.nome_serie}
            </option>
          ))}
        </select>

        <select
          value={filtroDisciplina}
          onChange={(e) => onFiltroDisciplinaChange(e.target.value)}
          className="select-custom w-full"
        >
          <option value="">Todas as disciplinas</option>
          <option value="Língua Portuguesa">Língua Portuguesa</option>
          <option value="Matemática">Matemática</option>
          <option value="Ciências Humanas">Ciências Humanas</option>
          <option value="Ciências da Natureza">Ciências da Natureza</option>
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => onFiltroTipoChange(e.target.value)}
          className="select-custom w-full"
        >
          <option value="">Todos os tipos</option>
          <option value="objetiva">Objetiva</option>
          <option value="discursiva">Discursiva</option>
        </select>
      </div>

      {temFiltro && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalFiltradas} de {totalQuestoes} questões
          </span>
          <button
            onClick={onLimparFiltros}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}
