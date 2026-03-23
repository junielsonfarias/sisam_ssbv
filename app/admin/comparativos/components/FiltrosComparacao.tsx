import { Filter, X, School } from 'lucide-react'
import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'

interface FiltrosComparacaoProps {
  filtros: {
    polo_id: string
    ano_letivo: string
    serie: string
    turma_id: string
  }
  setFiltros: React.Dispatch<React.SetStateAction<{
    polo_id: string
    ano_letivo: string
    serie: string
    turma_id: string
  }>>
  escolasSelecionadas: string[]
  setEscolasSelecionadas: React.Dispatch<React.SetStateAction<string[]>>
  escolasFiltradas: EscolaSimples[]
  polos: PoloSimples[]
  series: string[]
  turmas: TurmaSimples[]
  usuario: any
  poloNome: string
  limparFiltros: () => void
  toggleEscola: (escolaId: string) => void
}

export default function FiltrosComparacao({
  filtros,
  setFiltros,
  escolasSelecionadas,
  setEscolasSelecionadas,
  escolasFiltradas,
  polos,
  series,
  turmas,
  usuario,
  poloNome,
  limparFiltros,
  toggleEscola,
}: FiltrosComparacaoProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-6" style={{ overflow: 'visible' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Filter className="w-5 h-5 mr-2 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Filtros de Comparação</h2>
        </div>
        {(escolasSelecionadas.length > 0 || filtros.polo_id || filtros.serie) && (
          <button
            onClick={limparFiltros}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Polo
          </label>
          {usuario?.tipo_usuario === 'polo' ? (
            <input
              type="text"
              value={poloNome || 'Carregando...'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
            />
          ) : (
            <select
              value={filtros.polo_id}
              onChange={(e) => {
                setFiltros((prev) => ({ ...prev, polo_id: e.target.value }))
                setEscolasSelecionadas([])
              }}
              className="select-custom w-full"
            >
              <option value="">Todos os polos</option>
              {polos.map((polo) => (
                <option key={polo.id} value={polo.id}>
                  {polo.nome}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ano Letivo (opcional)
          </label>
          <input
            type="text"
            value={filtros.ano_letivo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, ano_letivo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="Ex: 2026 (deixe vazio para todos)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Série
          </label>
          <select
            value={filtros.serie}
            onChange={(e) => {
              setFiltros((prev) => ({ ...prev, serie: e.target.value, turma_id: '' }))
            }}
            className="select-custom w-full"
          >
            <option value="">Todas as séries</option>
            {series.map((serie) => (
              <option key={serie} value={serie}>
                {serie}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Turma {filtros.serie ? '(opcional)' : '(selecione uma série primeiro)'}
          </label>
          <select
            value={filtros.turma_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, turma_id: e.target.value }))}
            disabled={!filtros.serie}
            className="select-custom w-full"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.codigo} - {turma.escola_nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selecao de Escolas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecionar Escolas para Comparar ({escolasSelecionadas.length} selecionadas)
        </label>
        <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white shadow-inner">
          {escolasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <School className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma escola disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {escolasFiltradas.map((escola) => {
                const isSelected = escolasSelecionadas.includes(escola.id)
                return (
                  <label
                    key={escola.id}
                    className={`
                      flex items-center space-x-3 cursor-pointer
                      p-3 rounded-lg border-2 transition-all duration-200
                      ${isSelected
                        ? 'bg-indigo-50 border-indigo-500 shadow-md'
                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30/50 hover:shadow-sm'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEscola(escola.id)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
                    />
                    <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                      {escola.nome}
                    </span>
                    {isSelected && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
