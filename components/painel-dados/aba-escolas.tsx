'use client'

import { School } from 'lucide-react'
import { EscolaPainel } from '@/lib/dados/types'
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
type Escola = EscolaPainel
const calcularNivel = calcularCodigoNivel

export interface AbaEscolasProps {
  escolas: Escola[]
  busca: string
  setBusca: (v: string) => void
  carregando: boolean
  pesquisou: boolean
  onPesquisar: () => void
  serieSelecionada?: string
}

export default function AbaEscolas({ escolas, busca, setBusca, carregando, pesquisou, onPesquisar, serieSelecionada }: AbaEscolasProps) {
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
        placeholder="Buscar escola por nome..."
        busca={busca}
        setBusca={setBusca}
        onPesquisar={onPesquisar}
        carregando={carregando}
      />

      {/* Lista de Escolas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {carregando ? (
          <TabelaCarregando Icone={School} mensagem="Carregando escolas..." />
        ) : !pesquisou ? (
          <EstadoBuscaInicial
            titulo="Pesquise as escolas"
            mensagem="Clique no botão Pesquisar para carregar a lista de escolas. Use o campo de busca para filtrar por nome."
          />
        ) : escolas.length === 0 ? (
          <div className="text-center py-12">
            <School className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma escola encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full min-w-[800px] lg:min-w-[1000px]">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[180px]">Escola</th>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[100px]">Polo</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Turmas</th>
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
                {escolas.map((escola) => (
                  <tr key={escola.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="py-2 px-2 lg:px-3">
                      <div className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm truncate max-w-[200px]" title={escola.nome}>{escola.nome}</div>
                    </td>
                    <td className="py-2 px-2 lg:px-3 text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={escola.polo_nome || '-'}>{escola.polo_nome || '-'}</td>
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold text-xs lg:text-sm">
                        {escola.total_turmas || 0}
                      </span>
                    </td>
                    <td className="py-2 px-1 lg:px-2 text-center text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{escola.total_alunos || 0}</td>
                    {/* Média Geral + Nível */}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-bold text-xs lg:text-sm ${getNotaColor(escola.media_geral)}`}>
                          {escola.media_geral != null ? escola.media_geral.toFixed(2) : '-'}
                        </span>
                        {escola.media_geral != null && calcularNivel(escola.media_geral) && (
                          <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_geral))}`}>
                            {calcularNivel(escola.media_geral)}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* LP */}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_lp)}`}>
                          {escola.media_lp != null ? escola.media_lp.toFixed(2) : '-'}
                        </span>
                        {escola.media_lp != null && calcularNivel(escola.media_lp) && (
                          <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_lp))}`}>
                            {calcularNivel(escola.media_lp)}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* MAT */}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_mat)}`}>
                          {escola.media_mat != null ? escola.media_mat.toFixed(2) : '-'}
                        </span>
                        {escola.media_mat != null && calcularNivel(escola.media_mat) && (
                          <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_mat))}`}>
                            {calcularNivel(escola.media_mat)}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* PROD - mostrar para anos iniciais (2, 3, 5) ou quando sem filtro */}
                    {mostrarProd && (
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_prod)}`}>
                            {escola.media_prod != null ? escola.media_prod.toFixed(2) : '-'}
                          </span>
                          {escola.media_prod != null && calcularNivel(escola.media_prod) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_prod))}`}>
                              {calcularNivel(escola.media_prod)}
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
                            <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_ch)}`}>
                              {escola.media_ch != null ? escola.media_ch.toFixed(2) : '-'}
                            </span>
                            {escola.media_ch != null && calcularNivel(escola.media_ch) && (
                              <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_ch))}`}>
                                {calcularNivel(escola.media_ch)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-1 lg:px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_cn)}`}>
                              {escola.media_cn != null ? escola.media_cn.toFixed(2) : '-'}
                            </span>
                            {escola.media_cn != null && calcularNivel(escola.media_cn) && (
                              <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_cn))}`}>
                                {calcularNivel(escola.media_cn)}
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <span className="text-xs lg:text-sm text-green-600 dark:text-green-400 font-medium">{escola.presentes || 0}</span>
                    </td>
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <span className="text-xs lg:text-sm text-red-600 dark:text-red-400 font-medium">{escola.faltantes || 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
