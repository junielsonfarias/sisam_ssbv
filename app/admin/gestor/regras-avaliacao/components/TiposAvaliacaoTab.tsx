import { Plus, Edit, ClipboardList } from 'lucide-react'
import { TipoAvaliacao, ConceitoEscala, TIPO_RESULTADO_BADGE } from './types'

interface TiposAvaliacaoTabProps {
  tipos: TipoAvaliacao[]
  abrirModalTipo: (tipo?: TipoAvaliacao) => void
  getConceitoColor: (codigo: string) => string
}

export function TiposAvaliacaoTab({ tipos, abrirModalTipo, getConceitoColor }: TiposAvaliacaoTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Tipos de Avaliacao</h2>
        <button
          onClick={() => abrirModalTipo()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Tipo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tipos.map(tipo => (
          <div
            key={tipo.id}
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 p-5 transition-all hover:shadow-md ${
              !tipo.ativo ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">{tipo.nome}</h3>
                <span className="text-xs text-gray-400 font-mono">{tipo.codigo}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_RESULTADO_BADGE[tipo.tipo_resultado]?.cor || ''}`}>
                  {TIPO_RESULTADO_BADGE[tipo.tipo_resultado]?.label || tipo.tipo_resultado}
                </span>
                <button
                  onClick={() => abrirModalTipo(tipo)}
                  className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            {tipo.descricao && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{tipo.descricao}</p>
            )}

            {tipo.tipo_resultado === 'numerico' && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Escala: <strong>{parseFloat(String(tipo.nota_minima))}</strong> a <strong>{parseFloat(String(tipo.nota_maxima))}</strong>
                {tipo.permite_decimal && <span className="text-xs text-gray-400 ml-2">(decimais)</span>}
              </div>
            )}

            {tipo.tipo_resultado === 'conceito' && tipo.escala_conceitos && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tipo.escala_conceitos.map((c: ConceitoEscala) => (
                  <span
                    key={c.codigo}
                    className={`text-xs font-semibold px-2 py-1 rounded border ${getConceitoColor(c.codigo)}`}
                    title={`${c.nome} = ${c.valor_numerico}`}
                  >
                    {c.codigo} - {c.nome}
                  </span>
                ))}
              </div>
            )}

            {!tipo.ativo && (
              <span className="text-xs text-red-500 font-medium mt-2 block">Inativo</span>
            )}
          </div>
        ))}
      </div>

      {tipos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum tipo de avaliacao cadastrado</p>
        </div>
      )}
    </div>
  )
}
