import {
  Plus, Edit, Trash2, ChevronDown, ChevronRight, ClipboardList
} from 'lucide-react'
import {
  RegraAvaliacao,
  TIPO_RESULTADO_BADGE,
  TIPO_PERIODO_BADGE,
  FORMULA_LABELS,
  ARREDONDAMENTO_LABELS,
} from './types'

interface RegrasAvaliacaoTabProps {
  regras: RegraAvaliacao[]
  regrasExpandidas: string[]
  toggleRegraExpandida: (id: string) => void
  abrirModalRegra: (regra?: RegraAvaliacao) => void
  excluirRegra: (regra: RegraAvaliacao) => void
}

export function RegrasAvaliacaoTab({
  regras,
  regrasExpandidas,
  toggleRegraExpandida,
  abrirModalRegra,
  excluirRegra,
}: RegrasAvaliacaoTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Regras de Avaliacao</h2>
        <button
          onClick={() => abrirModalRegra()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
        </button>
      </div>

      <div className="space-y-3">
        {regras.map(regra => {
          const expandida = regrasExpandidas.includes(regra.id)
          return (
            <div
              key={regra.id}
              className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 transition-all ${
                !regra.ativo ? 'opacity-60' : ''
              }`}
            >
              {/* Header do card */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-lg"
                onClick={() => toggleRegraExpandida(regra.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {expandida ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">{regra.nome}</h3>
                    {regra.descricao && (
                      <p className="text-xs text-gray-400 truncate">{regra.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_RESULTADO_BADGE[regra.tipo_resultado]?.cor || ''}`}>
                    {regra.tipo_avaliacao_nome}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_PERIODO_BADGE[regra.tipo_periodo]?.cor || ''}`}>
                    {TIPO_PERIODO_BADGE[regra.tipo_periodo]?.label} ({regra.qtd_periodos}p)
                  </span>
                  {parseInt(String(regra.total_series)) > 0 && (
                    <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      {regra.total_series} serie(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Detalhes expandidos */}
              {expandida && (
                <div className="border-t dark:border-slate-700 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs block">Media Aprovacao</span>
                      <strong className="text-gray-800 dark:text-white">
                        {regra.media_aprovacao != null ? parseFloat(String(regra.media_aprovacao)) : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Media Recuperacao</span>
                      <strong className="text-gray-800 dark:text-white">
                        {regra.media_recuperacao != null ? parseFloat(String(regra.media_recuperacao)) : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Nota Maxima</span>
                      <strong className="text-gray-800 dark:text-white">
                        {regra.nota_maxima != null ? parseFloat(String(regra.nota_maxima)) : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Formula</span>
                      <strong className="text-gray-800 dark:text-white">{FORMULA_LABELS[regra.formula_media] || regra.formula_media}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Recuperacao</span>
                      <strong className="text-gray-800 dark:text-white">
                        {regra.permite_recuperacao ? (regra.recuperacao_por_periodo ? 'Por periodo' : 'Final') : 'Nao'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Max. Dependencias</span>
                      <strong className="text-gray-800 dark:text-white">{regra.max_dependencias}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Arredondamento</span>
                      <strong className="text-gray-800 dark:text-white">{ARREDONDAMENTO_LABELS[regra.arredondamento] || regra.arredondamento}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Casas Decimais</span>
                      <strong className="text-gray-800 dark:text-white">{regra.casas_decimais}</strong>
                    </div>
                    {regra.aprovacao_automatica && (
                      <div>
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                          Aprovacao automatica
                        </span>
                      </div>
                    )}
                  </div>

                  {regra.pesos_periodos && regra.pesos_periodos.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-400 text-xs block mb-1">Pesos por Periodo</span>
                      <div className="flex gap-2">
                        {regra.pesos_periodos.map((p: any) => (
                          <span key={p.periodo} className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded">
                            P{p.periodo}: {p.peso}x
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirModalRegra(regra) }}
                      className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); excluirRegra(regra) }}
                      className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Desativar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {regras.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhuma regra de avaliacao cadastrada</p>
        </div>
      )}
    </div>
  )
}
