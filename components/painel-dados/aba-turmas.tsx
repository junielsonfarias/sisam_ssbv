'use client'

import { BookOpen } from 'lucide-react'
import { TurmaPainel } from '@/lib/dados/types'
import {
  calcularCodigoNivel,
  getNivelBadgeClass,
  getNotaColor,
} from '@/lib/dados/utils'
import {
  BarraBuscaPesquisar,
  TabelaCarregando,
  EstadoBuscaInicial
} from '@/components/dados'

// Aliases para compatibilidade
type Turma = TurmaPainel
const calcularNivel = calcularCodigoNivel

export interface AbaTurmasProps {
  turmas: Turma[]
  busca: string
  setBusca: (v: string) => void
  carregando: boolean
  pesquisou: boolean
  onPesquisar: () => void
  serieSelecionada?: string
}

export default function AbaTurmas({ turmas, busca, setBusca, carregando, pesquisou, onPesquisar, serieSelecionada }: AbaTurmasProps) {
  // Detectar tipo de série para mostrar disciplinas corretas
  // Anos iniciais (2, 3, 5): LP, MAT, PROD
  // Anos finais (6, 7, 8, 9): LP, MAT, CH, CN
  const numSerie = serieSelecionada?.replace(/[^0-9]/g, '') || ''
  const isAnosIniciaisSerie = ['2', '3', '5'].includes(numSerie)
  const isAnosFinaisSerie = ['6', '7', '8', '9'].includes(numSerie)
  const temFiltroSerie = !!serieSelecionada && serieSelecionada.trim() !== ''

  // Lógica de exibição:
  // - Sem filtro: mostrar TODAS as disciplinas (LP, MAT, PROD, CH, CN)
  // - Anos iniciais: mostrar apenas LP, MAT, PROD
  // - Anos finais: mostrar apenas LP, MAT, CH, CN
  const mostrarProd = !temFiltroSerie || isAnosIniciaisSerie
  const mostrarChCn = !temFiltroSerie || isAnosFinaisSerie

  return (
    <div className="space-y-4">
      {/* Busca e Botão Pesquisar */}
      <BarraBuscaPesquisar
        placeholder="Buscar turma por código ou escola..."
        busca={busca}
        setBusca={setBusca}
        onPesquisar={onPesquisar}
        carregando={carregando}
      />

      {/* Lista de Turmas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {carregando ? (
          <TabelaCarregando Icone={BookOpen} mensagem="Carregando turmas..." />
        ) : !pesquisou ? (
          <EstadoBuscaInicial
            titulo="Pesquise as turmas"
            mensagem="Clique no botão Pesquisar para carregar a lista de turmas. Use o campo de busca para filtrar por código ou escola."
          />
        ) : turmas.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma turma encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full min-w-[800px] lg:min-w-[1000px]">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[100px]">Turma</th>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[150px]">Escola</th>
                  <th className="text-left py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Série</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Alunos</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Média</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">LP</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">MAT</th>
                  {/* PROD - mostrar para anos iniciais (2, 3, 5) ou quando sem filtro */}
                  {mostrarProd && (
                    <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">PROD</th>
                  )}
                  {/* CH/CN - mostrar para anos finais (6, 7, 8, 9) ou quando sem filtro */}
                  {mostrarChCn && (
                    <>
                      <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">CH</th>
                      <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">CN</th>
                    </>
                  )}
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Pres.</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Falt.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {turmas.map((turma) => {
                  const sn = (turma.serie || '').replace(/[^0-9]/g, '')
                  const mediaGeral = ['2', '3', '5'].includes(sn)
                    ? (turma.media_lp != null && turma.media_mat != null && turma.media_prod != null ? (turma.media_lp + turma.media_mat + turma.media_prod) / 3 : null)
                    : (turma.media_lp != null && turma.media_mat != null && turma.media_ch != null && turma.media_cn != null ? (turma.media_lp + turma.media_mat + turma.media_ch + turma.media_cn) / 4 : null)
                  return (
                    <tr key={turma.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="py-2 px-2 lg:px-3">
                        <div className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm">{turma.codigo || turma.nome || '-'}</div>
                      </td>
                      <td className="py-2 px-2 lg:px-3 text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[180px]" title={turma.escola_nome || '-'}>{turma.escola_nome || '-'}</td>
                      <td className="py-2 px-1 lg:px-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">{turma.serie || '-'}</td>
                      <td className="py-2 px-1 lg:px-2 text-center text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{turma.total_alunos || 0}</td>
                      {/* Média Geral + Nível */}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-bold text-xs lg:text-sm ${getNotaColor(mediaGeral)}`}>
                            {mediaGeral != null ? mediaGeral.toFixed(2) : '-'}
                          </span>
                          {mediaGeral != null && calcularNivel(mediaGeral) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(mediaGeral))}`}>
                              {calcularNivel(mediaGeral)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* LP */}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_lp)}`}>
                            {turma.media_lp != null ? turma.media_lp.toFixed(2) : '-'}
                          </span>
                          {turma.media_lp != null && calcularNivel(turma.media_lp) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_lp))}`}>
                              {calcularNivel(turma.media_lp)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* MAT */}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_mat)}`}>
                            {turma.media_mat != null ? turma.media_mat.toFixed(2) : '-'}
                          </span>
                          {turma.media_mat != null && calcularNivel(turma.media_mat) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_mat))}`}>
                              {calcularNivel(turma.media_mat)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* PROD - mostrar para anos iniciais (2, 3, 5) ou quando sem filtro */}
                      {mostrarProd && (
                        <td className="py-2 px-1 lg:px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_prod)}`}>
                              {turma.media_prod != null ? turma.media_prod.toFixed(2) : '-'}
                            </span>
                            {turma.media_prod != null && calcularNivel(turma.media_prod) && (
                              <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_prod))}`}>
                                {calcularNivel(turma.media_prod)}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {/* CH/CN - mostrar para anos finais (6, 7, 8, 9) ou quando sem filtro */}
                      {mostrarChCn && (
                        <>
                          <td className="py-2 px-1 lg:px-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_ch)}`}>
                                {turma.media_ch != null ? turma.media_ch.toFixed(2) : '-'}
                              </span>
                              {turma.media_ch != null && calcularNivel(turma.media_ch) && (
                                <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_ch))}`}>
                                  {calcularNivel(turma.media_ch)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1 lg:px-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_cn)}`}>
                                {turma.media_cn != null ? turma.media_cn.toFixed(2) : '-'}
                              </span>
                              {turma.media_cn != null && calcularNivel(turma.media_cn) && (
                                <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_cn))}`}>
                                  {calcularNivel(turma.media_cn)}
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <span className="text-xs lg:text-sm text-green-600 dark:text-green-400 font-medium">{turma.presentes || 0}</span>
                      </td>
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <span className="text-xs lg:text-sm text-red-600 dark:text-red-400 font-medium">{turma.faltantes || 0}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
