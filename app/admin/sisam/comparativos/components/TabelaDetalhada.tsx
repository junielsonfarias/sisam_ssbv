import { BookOpen, Eye, Printer } from 'lucide-react'
import { DadosComparativo } from '../types'
import { formatarNumero, getNotaColor, isAnosIniciais, calcularNivelPorMedia } from '../utils'

interface TabelaDetalhadaProps {
  serie: string
  dadosSerie: DadosComparativo[]
  filtros: { turma_id: string }
  handlePrint: () => void
  onVerAlunos: (item: DadosComparativo) => void
}

export default function TabelaDetalhada({ serie, dadosSerie, filtros, handlePrint, onVerAlunos }: TabelaDetalhadaProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border print:shadow-none">
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200 flex justify-between items-center print:bg-indigo-50">
        <h3 className="text-xl font-bold text-indigo-900 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 print:hidden" />
          {serie} - Detalhado por Turma
        </h3>
        <button
          onClick={handlePrint}
          className="print:hidden flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          title="Imprimir"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden md:inline">Imprimir</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px] sm:min-w-[400px] md:min-w-[500px]">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Escola</th>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden md:table-cell print:table-cell">Polo</th>
              {!filtros.turma_id && (
                <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden sm:table-cell print:table-cell">Turma</th>
              )}
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Alunos</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Presentes</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Faltantes</th>
              <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">LP</th>
              <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">MAT</th>
              {isAnosIniciais(serie) ? (
                <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">PROD</th>
              ) : (
                <>
                  <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">CH</th>
                  <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">CN</th>
                </>
              )}
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Média</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Nível</th>
              {!filtros.turma_id && (
                <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap print:hidden">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {dadosSerie.map((item, index) => {
              const faltantes = item.total_alunos - item.alunos_presentes
              const percentualFaltantes = item.total_alunos > 0 ? ((faltantes / item.total_alunos) * 100).toFixed(1) : '0.0'
              const percentualPresentes = item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : '0.0'
              return (
              <tr key={`${item.escola_id}-${item.serie}-${item.turma_id || 'sem-turma'}-${index}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="py-2 px-2 md:py-3 md:px-4">
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm break-words block">{item.escola_nome}</span>
                    <div className="md:hidden text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                      <div><span className="font-medium">Polo:</span> {item.polo_nome}</div>
                      {!filtros.turma_id && item.turma_codigo && (
                        <div><span className="font-medium">Turma:</span> {item.turma_codigo}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden md:table-cell">
                  <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{item.polo_nome}</span>
                </td>
                {!filtros.turma_id && (
                  <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden sm:table-cell">
                    <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 font-mono text-xs font-medium">
                      {item.turma_codigo || '-'}
                    </span>
                  </td>
                )}
                <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                  <span className="text-gray-700 dark:text-gray-200 font-medium text-xs md:text-sm">{item.total_alunos}</span>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                  <span className="text-green-700 dark:text-green-400 font-medium text-xs md:text-sm">
                    {item.alunos_presentes} ({percentualPresentes}%)
                  </span>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                  <span className={`font-medium text-xs md:text-sm ${faltantes > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {faltantes} ({percentualFaltantes}%)
                  </span>
                </td>
                <NotaCell media={item.media_lp} />
                <NotaCell media={item.media_mat} />
                {isAnosIniciais(item.serie) ? (
                  <NotaCell media={item.media_producao} />
                ) : (
                  <>
                    <NotaCell media={item.media_ch} />
                    <NotaCell media={item.media_cn} />
                  </>
                )}
                <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                  <div className={`inline-flex flex-col items-center justify-center gap-0.5 px-1.5 md:px-3 py-0.5 md:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50 dark:bg-green-900/30' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    <span className={`text-xs sm:text-sm md:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                      {formatarNumero(item.media_geral)}
                    </span>
                    {(() => {
                      const nivel = calcularNivelPorMedia(item.media_geral)
                      return nivel.codigo !== '-' ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                          {nivel.codigo}
                        </span>
                      ) : null
                    })()}
                  </div>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                  {(() => {
                    const nivel = calcularNivelPorMedia(item.media_geral)
                    return (
                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${nivel.bgColor} ${nivel.cor}`}>
                        {nivel.codigo}
                      </span>
                    )
                  })()}
                </td>
                {!filtros.turma_id && (
                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                    {item.turma_id && (
                      <button
                        onClick={() => onVerAlunos(item)}
                        className="inline-flex items-center px-1.5 md:px-3 py-1 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm font-medium"
                        title="Ver todos os alunos desta turma"
                      >
                        <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                        <span className="hidden md:inline ml-1">Ver</span>
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NotaCell({ media }: { media: number | string | undefined }) {
  return (
    <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-xs md:text-sm font-bold ${getNotaColor(media)}`}>
          {formatarNumero(media)}
        </span>
        {(() => {
          const nivel = calcularNivelPorMedia(media)
          return nivel.codigo !== '-' ? (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
              {nivel.codigo}
            </span>
          ) : null
        })()}
      </div>
    </td>
  )
}
