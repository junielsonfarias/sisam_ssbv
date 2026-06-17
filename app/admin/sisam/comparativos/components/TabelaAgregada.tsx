import { School, Target, Printer } from 'lucide-react'
import { DadosComparativo } from '../types'
import { formatarNumero, getNotaColor, isAnosIniciais, calcularNivelPorMedia } from '../utils'

interface TabelaAgregadaProps {
  serie: string
  dadosAgregadosSerie: DadosComparativo[]
  melhoresAlunos: Record<string, any>
  handlePrint: () => void
}

export default function TabelaAgregada({ serie, dadosAgregadosSerie, melhoresAlunos, handlePrint }: TabelaAgregadaProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden print:border print:shadow-none">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200 flex justify-between items-center print:bg-blue-50">
        <div>
          <h3 className="text-xl font-bold text-blue-900 flex items-center">
            <School className="w-5 h-5 mr-2 print:hidden" />
            {serie} - Resumo Geral por Escola
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Dados consolidados de todas as turmas desta série
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="print:hidden flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          title="Imprimir"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden md:inline">Imprimir</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] sm:min-w-[500px] md:min-w-[600px]">
          <thead className="bg-blue-50">
            <tr>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Escola</th>
              <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden md:table-cell print:table-cell">Polo</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Turmas</th>
              <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden sm:table-cell print:table-cell">Alunos</th>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {dadosAgregadosSerie.map((item, index) => {
              const faltantes = item.total_alunos - item.alunos_presentes
              const percentualFaltantes = item.total_alunos > 0 ? ((faltantes / item.total_alunos) * 100).toFixed(1) : '0.0'
              const percentualPresentes = item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : '0.0'
              return (
              <tr key={`agregado-${item.escola_id}-${item.serie}-${index}`} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-blue-50/30 dark:bg-blue-900/10">
                <td className="py-2 px-2 md:py-3 md:px-4">
                  <div className="flex items-start">
                    <School className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white text-xs md:text-sm break-words">{item.escola_nome}</span>
                      <div className="md:hidden text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="font-medium">Polo:</span> {item.polo_nome}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden md:table-cell">
                  <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{item.polo_nome}</span>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold text-xs">
                    {item.total_turmas || 0}
                  </span>
                </td>
                <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden sm:table-cell">
                  <span className="text-gray-700 dark:text-gray-200 font-bold text-xs md:text-sm">{item.total_alunos}</span>
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
                  <div className={`inline-flex items-center justify-center px-1.5 md:px-3 py-0.5 md:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50 dark:bg-green-900/30' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    <span className={`text-xs sm:text-sm md:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                      {formatarNumero(item.media_geral)}
                    </span>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Secao de Melhores Alunos */}
      {dadosAgregadosSerie.map((item) => {
        const keyMelhores = `${item.escola_id}_${serie}`
        const melhores = melhoresAlunos[keyMelhores]

        return (
          <div key={`melhores-${item.escola_id}`} className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-t border-yellow-200">
            <h4 className="font-bold text-yellow-900 mb-3 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Melhores Desempenhos - {item.escola_nome}
            </h4>

            {melhores ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Melhor Aluno Geral */}
                {melhores.melhorGeral && (
                  <MelhorAlunoCard
                    emoji="🏆"
                    label="Melhor Média Geral"
                    nome={melhores.melhorGeral.aluno_nome}
                    turma={melhores.melhorGeral.turma_codigo}
                    valorLabel="Média"
                    valor={formatarNumero(melhores.melhorGeral.media_geral)}
                  />
                )}

                {/* Melhor por Componente LP */}
                {melhores.melhorLP && (
                  <MelhorAlunoCard
                    emoji="📚"
                    label="Melhor LP"
                    nome={melhores.melhorLP.aluno_nome}
                    turma={melhores.melhorLP.turma_codigo}
                    valorLabel="Nota"
                    valor={formatarNumero(melhores.melhorLP.nota_lp)}
                  />
                )}

                {/* Melhor por Componente CH - apenas anos finais */}
                {melhores.melhorCH && !isAnosIniciais(serie) && (
                  <MelhorAlunoCard
                    emoji="🌍"
                    label="Melhor CH"
                    nome={melhores.melhorCH.aluno_nome}
                    turma={melhores.melhorCH.turma_codigo}
                    valorLabel="Nota"
                    valor={formatarNumero(melhores.melhorCH.nota_ch)}
                  />
                )}

                {/* Melhor por Componente MAT */}
                {melhores.melhorMAT && (
                  <MelhorAlunoCard
                    emoji="🔢"
                    label="Melhor MAT"
                    nome={melhores.melhorMAT.aluno_nome}
                    turma={melhores.melhorMAT.turma_codigo}
                    valorLabel="Nota"
                    valor={formatarNumero(melhores.melhorMAT.nota_mat)}
                  />
                )}

                {/* Melhor por Componente PROD - apenas anos iniciais */}
                {melhores.melhorPROD && isAnosIniciais(serie) && parseFloat(melhores.melhorPROD.nota_producao) > 0 && (
                  <MelhorAlunoCard
                    emoji="✏️"
                    label="Melhor PROD"
                    nome={melhores.melhorPROD.aluno_nome}
                    turma={melhores.melhorPROD.turma_codigo}
                    valorLabel="Nota"
                    valor={formatarNumero(melhores.melhorPROD.nota_producao)}
                  />
                )}

                {/* Melhor por Componente CN - apenas anos finais */}
                {melhores.melhorCN && !isAnosIniciais(serie) && (
                  <MelhorAlunoCard
                    emoji="🔬"
                    label="Melhor CN"
                    nome={melhores.melhorCN.aluno_nome}
                    turma={melhores.melhorCN.turma_codigo}
                    valorLabel="Nota"
                    valor={formatarNumero(melhores.melhorCN.nota_cn)}
                  />
                )}

                {/* Melhores por Turma */}
                {melhores.melhoresPorTurma && melhores.melhoresPorTurma.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm md:col-span-2 lg:col-span-3">
                    <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">⭐ Melhor Aluno por Turma</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {melhores.melhoresPorTurma.map((melhorTurma: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded p-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            <span className="font-bold">{melhorTurma.turma_codigo || 'Sem turma'}:</span> {melhorTurma.aluno_nome}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Média: {formatarNumero(melhorTurma.media_geral)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado de melhor desempenho disponível</p>
            )}
          </div>
        )
      })}
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

function MelhorAlunoCard({ emoji, label, nome, turma, valorLabel, valor }: {
  emoji: string
  label: string
  nome: string
  turma: string | null
  valorLabel: string
  valor: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm dark:shadow-slate-900/50">
      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">{emoji} {label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{nome}</p>
      <p className="text-xs text-gray-600 mt-1">
        Turma: {turma || 'N/A'} | {valorLabel}: {valor}
      </p>
    </div>
  )
}
