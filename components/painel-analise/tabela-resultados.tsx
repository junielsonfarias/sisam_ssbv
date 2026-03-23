'use client'

import { Eye, Users } from 'lucide-react'
import {
  isAnosIniciais,
  getPresencaColor,
} from '@/lib/dados/utils'
import { CelulaNotaComNivel, PaginationControls, TableEmptyState } from '@/components/dados'
import { ResultadoConsolidadoAnalise, PaginacaoState, FiltrosAnalise, calcularNivelPorNota, getSerieVisibility } from './types'

interface TabelaResultadosProps {
  resultados: ResultadoConsolidadoAnalise[]
  carregando: boolean
  paginaAtual: number
  paginacao: PaginacaoState
  filtros: FiltrosAnalise
  getTotalQuestoesPorSerie: (resultado: ResultadoConsolidadoAnalise, codigoDisciplina: string) => number | undefined
  onVisualizarQuestoes: (aluno: ResultadoConsolidadoAnalise) => void
  onProximaPagina: () => void
  onPaginaAnterior: () => void
}

export default function TabelaResultados({
  resultados,
  carregando,
  paginaAtual,
  paginacao,
  filtros,
  getTotalQuestoesPorSerie,
  onVisualizarQuestoes,
  onProximaPagina,
  onPaginaAnterior
}: TabelaResultadosProps) {
  const { mostrarProd, mostrarChCn } = getSerieVisibility(filtros.serie)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Resultados ({resultados.length} de {paginacao.total})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
            <tr>
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-12">
                #
              </th>
              <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 min-w-[180px]">
                Aluno
              </th>
              <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                Escola
              </th>
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                Turma
              </th>
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                Série
              </th>
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                Presença
              </th>
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                LP
              </th>
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                MAT
              </th>
              {mostrarProd && (
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                  PROD
                </th>
              )}
              {mostrarChCn && (
                <>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                    CH
                  </th>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                    CN
                  </th>
                </>
              )}
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                Média
              </th>
              <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-24">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {carregando ? (
              <TableEmptyState
                colSpan={13}
                tipo="carregando"
                titulo="Carregando..."
              />
            ) : resultados.length === 0 ? (
              <TableEmptyState
                colSpan={13}
                tipo="nao-pesquisado"
                titulo="Nenhum resultado encontrado"
                mensagem="Clique em Pesquisar para carregar os dados"
              />
            ) : (
              resultados.map((resultado, index) => {
                const anosIniciais = isAnosIniciais(resultado.serie)
                const numeroOrdem = (paginaAtual - 1) * paginacao.limite + index + 1
                return (
                  <tr key={resultado.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100 dark:border-slate-700">
                    <td className="text-center py-2 px-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                        {numeroOrdem}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => onVisualizarQuestoes(resultado)}
                        className="flex items-center w-full text-left hover:opacity-80 transition-opacity"
                        title="Clique para ver questões do aluno"
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2">
                          <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-xs">
                            {resultado.aluno_nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline text-sm truncate">
                          {resultado.aluno_nome}
                        </span>
                      </button>
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-700 dark:text-gray-200">
                      {resultado.escola_nome}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-mono text-xs font-medium">
                        {resultado.turma_codigo || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium">
                        {resultado.serie || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getPresencaColor(resultado.presenca)}`}>
                        {resultado.presenca === 'P' || resultado.presenca === 'p'
                          ? '\u2713 Presente'
                          : resultado.presenca === '-'
                          ? '\u2014 Sem dados'
                          : '\u2717 Falta'}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <CelulaNotaComNivel
                        nota={resultado.nota_lp}
                        acertos={resultado.total_acertos_lp}
                        totalQuestoes={getTotalQuestoesPorSerie(resultado, 'LP')}
                        nivel={anosIniciais ? resultado.nivel_lp : undefined}
                        presenca={resultado.presenca}
                        tamanho="md"
                      />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <CelulaNotaComNivel
                        nota={resultado.nota_mat}
                        acertos={resultado.total_acertos_mat}
                        totalQuestoes={getTotalQuestoesPorSerie(resultado, 'MAT')}
                        nivel={anosIniciais ? resultado.nivel_mat : undefined}
                        presenca={resultado.presenca}
                        tamanho="md"
                      />
                    </td>
                    {mostrarProd && (
                      <td className="py-2 px-1 text-center">
                        <CelulaNotaComNivel
                          nota={resultado.nota_producao}
                          nivel={resultado.nivel_prod || calcularNivelPorNota(resultado.nota_producao)}
                          presenca={resultado.presenca}
                          naoAplicavel={!anosIniciais}
                          tamanho="md"
                        />
                      </td>
                    )}
                    {mostrarChCn && (
                      <>
                        <td className="py-2 px-1 text-center">
                          <CelulaNotaComNivel
                            nota={resultado.nota_ch}
                            acertos={resultado.total_acertos_ch}
                            totalQuestoes={getTotalQuestoesPorSerie(resultado, 'CH')}
                            presenca={resultado.presenca}
                            naoAplicavel={anosIniciais}
                            tamanho="md"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <CelulaNotaComNivel
                            nota={resultado.nota_cn}
                            acertos={resultado.total_acertos_cn}
                            totalQuestoes={getTotalQuestoesPorSerie(resultado, 'CN')}
                            presenca={resultado.presenca}
                            naoAplicavel={anosIniciais}
                            tamanho="md"
                          />
                        </td>
                      </>
                    )}
                    <td className="py-2 px-2 text-center">
                      <CelulaNotaComNivel
                        nota={resultado.media_aluno}
                        nivel={anosIniciais ? resultado.nivel_aluno : undefined}
                        presenca={resultado.presenca}
                        tamanho="md"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => onVisualizarQuestoes(resultado)}
                        className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium shadow-sm"
                        title="Ver questões do aluno"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Ver Questões</span>
                        <span className="sm:hidden">Ver</span>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacao */}
      <PaginationControls
        paginaAtual={paginaAtual}
        totalPaginas={paginacao.totalPaginas}
        temProxima={paginacao.temProxima}
        temAnterior={paginacao.temAnterior}
        onProxima={onProximaPagina}
        onAnterior={onPaginaAnterior}
      />

      {/* Rodapé com legenda */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span>Mostrando {resultados.length} de {paginacao.total} resultados</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600 dark:text-gray-300">Bom (&ge;7.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600 dark:text-gray-300">Médio (5.0-6.9)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-600 dark:text-gray-300">Abaixo (&lt;5.0)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
