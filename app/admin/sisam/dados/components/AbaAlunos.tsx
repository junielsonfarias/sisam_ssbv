'use client'

import { Award, Eye, Search } from 'lucide-react'
import { NivelBadge } from '@/components/dados'
import { isAnosIniciais as isAnosIniciaisLib } from '@/lib/disciplinas-mapping'
import type { AlunoDetalhado } from '@/lib/dados/types'
import {
  formatarSerie,
  getPresencaColor,
  formatarNota,
  getNotaNumero,
  getNotaColor,
  getNotaBgColor,
} from '@/lib/dados/utils'
import type { Disciplina } from '@/lib/disciplinas-por-serie'
import type { AbaAlunosProps } from './types'

export default function AbaAlunos({
  pesquisaRealizada,
  alunosPaginados,
  alunosOrdenados,
  disciplinasExibir,
  filtroSerie,
  filtroTipoEnsino,
  filtroDisciplina,
  filtroAnoLetivo,
  ordenacao,
  handleOrdenacao,
  paginaAtual,
  totalPaginas,
  setPaginaAtual,
  itensPorPagina,
  isDisciplinaAplicavel,
  getTotalQuestoesPorSerie,
  setAlunoSelecionado,
  setModalAberto,
}: AbaAlunosProps) {

  const getNivelColor = (nivel: string | undefined | null): string => {
    if (!nivel) return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
    const nivelLower = nivel.toLowerCase()
    if (nivelLower.includes('avancado') || nivelLower.includes('avançado')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300'
    if (nivelLower.includes('adequado')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300'
    if (nivelLower.includes('basico') || nivelLower.includes('básico')) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300'
    if (nivelLower.includes('insuficiente')) return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300'
    return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'
  }

  if (!pesquisaRealizada) {
    return (
      <div className="space-y-4 mt-4">
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
          <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Visualizacao Mobile - Cards */}
      <div className="block sm:hidden space-y-4 p-4">
        {alunosPaginados.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</p>
            <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">Importe os dados primeiro</p>
          </div>
        ) : (
          alunosPaginados.map((resultado: AlunoDetalhado, index: number) => {
            const mediaNum = getNotaNumero(resultado.media_aluno)

            return (
              <div key={resultado.id || index} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm dark:shadow-slate-900/50">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex-shrink-0">
                      {index + 1 + (paginaAtual - 1) * itensPorPagina}
                    </span>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold text-xs">
                        {resultado.aluno?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">{resultado.aluno}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                        {resultado.escola && <div className="whitespace-normal break-words">Escola: {resultado.escola}</div>}
                        {resultado.turma && <div>Turma: {resultado.turma}</div>}
                        {resultado.serie && <div>Serie: {formatarSerie(resultado.serie)}</div>}
                        <div className="flex items-center gap-2">
                          <span>Presenca: </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(
                              resultado.presenca || 'P'
                            )}`}
                          >
                            {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : resultado.presenca === '-' ? '— Sem dados' : '✗ Falta'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notas em Grid - Dinamico baseado na serie */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {disciplinasExibir.map((disciplina: Disciplina) => {
                    const disciplinaAplicavel = isDisciplinaAplicavel(resultado.serie, disciplina.codigo)
                    if (!disciplinaAplicavel) return null

                    const nota = getNotaNumero(resultado[disciplina.campo_nota] as number | string | null)
                    const acertos = disciplina.campo_acertos ? (Number(resultado[disciplina.campo_acertos]) || 0) : null
                    const nivelAprendizagem = disciplina.tipo === 'nivel' ? resultado.nivel_aprendizagem : null

                    return (
                      <div key={disciplina.codigo} className={`p-3 rounded-lg ${getNotaBgColor(nota)} border border-gray-200 dark:border-slate-600`}>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{disciplina.nome}</div>
                        {disciplina.tipo === 'nivel' ? (
                          <div className={`text-sm font-bold ${nivelAprendizagem ? getNivelColor(nivelAprendizagem).replace('bg-', 'text-').split(' ')[0] : 'text-gray-500'}`}>
                            {nivelAprendizagem || '-'}
                          </div>
                        ) : (
                          <>
                            {!!getTotalQuestoesPorSerie(resultado, disciplina.codigo) && acertos !== null && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{acertos}/{getTotalQuestoesPorSerie(resultado, disciplina.codigo)}</div>
                            )}
                            <div className={`text-lg font-bold ${getNotaColor(nota)} mb-1`}>
                              {formatarNota(nota, resultado.presenca, resultado.media_aluno, disciplina.codigo, resultado.serie)}
                            </div>
                            {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Media e Nivel */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700">
                  <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl ${
                    mediaNum !== null && mediaNum >= 7 ? 'bg-green-50 border-green-500' :
                    mediaNum !== null && mediaNum >= 5 ? 'bg-yellow-50 border-yellow-500' :
                    'bg-red-50 border-red-500'
                  } border-2`}>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Media</div>
                    <div className={`text-2xl font-extrabold ${
                      mediaNum !== null && mediaNum >= 7 ? 'text-green-600' :
                      mediaNum !== null && mediaNum >= 5 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                    </div>
                  </div>
                  {resultado.nivel_aprendizagem && (
                    <div className="text-center">
                      <div className="text-xs font-semibold text-gray-600 mb-1">Nivel</div>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{resultado.nivel_aprendizagem}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Visualizacao Tablet/Desktop - Tabela */}
      <div className="hidden sm:block w-full">
        <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/50 dark:to-indigo-800/50 sticky top-[180px] sm:top-[190px] z-10">
            <tr>
              <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-8 md:w-10 lg:w-12">
                #
              </th>
              <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
                Aluno
              </th>
              <th className="hidden lg:table-cell text-left py-1 px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 min-w-[150px]">
                Escola
              </th>
              <th className="hidden md:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16 md:w-20">
                Turma
              </th>
              <th className="hidden xl:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-20">
                Serie
              </th>
              <th className="hidden lg:table-cell text-center py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-20">
                Presenca
              </th>
              {disciplinasExibir.map((disciplina: Disciplina) => {
                const isDestaque = filtroDisciplina === disciplina.codigo ||
                  (filtroDisciplina === 'PT' && disciplina.codigo === 'PROD')
                return (
                  <th key={disciplina.codigo} className={`text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b w-14 md:w-16 lg:w-18 ${isDestaque ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400' : 'text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700'}`}>
                    {disciplina.codigo}
                    {isDestaque && <span className="ml-1 text-[8px]">●</span>}
                  </th>
                )
              })}
              <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-14 md:w-16 lg:w-18">
                Media
              </th>
              <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] sm:text-xs md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16 md:w-20 lg:w-24">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {alunosPaginados.length === 0 ? (
              <tr>
                <td colSpan={6 + disciplinasExibir.length + 1} className="py-8 sm:py-12 text-center text-gray-500 dark:text-gray-400 px-4">
                  <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-base sm:text-lg font-medium">Nenhum resultado encontrado</p>
                  <p className="text-xs sm:text-sm mt-1">Importe os dados primeiro</p>
                </td>
              </tr>
            ) : (
              alunosPaginados.map((resultado: AlunoDetalhado, index: number) => {
                const mediaNum = getNotaNumero(resultado.media_aluno)

                return (
                  <tr key={resultado.id || index} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100 dark:border-slate-700">
                    <td className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                        {index + 1 + (paginaAtual - 1) * itensPorPagina}
                      </span>
                    </td>
                    <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                      <div className="flex flex-col">
                        <div className="flex items-center w-full text-left mb-1">
                          <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-9 rounded-full bg-indigo-100 flex items-center justify-center mr-1 sm:mr-1.5 md:mr-2">
                            <span className="text-indigo-600 font-semibold text-[9px] sm:text-[10px] md:text-xs">
                              {resultado.aluno?.charAt(0).toUpperCase() || 'A'}
                            </span>
                          </div>
                          <span className="font-semibold text-indigo-600 hover:text-indigo-800 underline text-[10px] sm:text-[11px] md:text-xs lg:text-sm truncate">{resultado.aluno}</span>
                        </div>
                        <div className="lg:hidden text-[9px] sm:text-[10px] md:text-xs text-gray-500 dark:text-gray-400 space-y-0.5 ml-6 sm:ml-7 md:ml-8 lg:ml-10">
                          {resultado.escola && <div className="whitespace-normal break-words">Escola: {resultado.escola}</div>}
                          {resultado.turma && <div>Turma: {resultado.turma}</div>}
                          {resultado.serie && <div>Serie: {formatarSerie(resultado.serie)}</div>}
                          <div className="flex items-center gap-2">
                            <span>Presenca: </span>
                            <span
                              className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getPresencaColor(
                                resultado.presenca || 'P'
                              )}`}
                            >
                              {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : resultado.presenca === '-' ? '— Sem dados' : '✗ Falta'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                      <span className="text-gray-700 dark:text-gray-200 font-medium text-[10px] md:text-xs lg:text-sm block whitespace-normal break-words">{resultado.escola}</span>
                    </td>
                    <td className="hidden md:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                      <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-mono text-[9px] md:text-[10px] lg:text-xs font-medium">
                        {resultado.turma || '-'}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                      <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[9px] md:text-[10px] lg:text-xs font-medium">
                        {formatarSerie(resultado.serie)}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm ${getPresencaColor(
                          resultado.presenca || 'P'
                        )}`}
                      >
                        {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                      </span>
                    </td>
                    {disciplinasExibir.map((disciplina: Disciplina) => {
                      const disciplinaAplicavel = isDisciplinaAplicavel(resultado.serie, disciplina.codigo)
                      const nota = disciplinaAplicavel ? getNotaNumero(resultado[disciplina.campo_nota] as number | string | null) : null
                      const acertos = disciplinaAplicavel && disciplina.campo_acertos ? (Number(resultado[disciplina.campo_acertos]) || 0) : null
                      const nivelAprendizagem = disciplina.tipo === 'nivel' ? resultado.nivel_aprendizagem : null
                      const isDestaqueDisciplina = filtroDisciplina === disciplina.codigo ||
                        (filtroDisciplina === 'PT' && disciplina.codigo === 'PROD')

                      // Se a disciplina nao e aplicavel a serie do aluno, mostrar N/A
                      if (!disciplinaAplicavel) {
                        return (
                          <td key={disciplina.codigo} className={`py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center ${isDestaqueDisciplina ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                            <span className="text-gray-400 dark:text-gray-500 text-xs italic">N/A</span>
                          </td>
                        )
                      }

                      // Obter nivel correspondente a disciplina (Anos Iniciais)
                      const nivelDisciplina = disciplina.codigo === 'LP' ? resultado.nivel_lp :
                                               disciplina.codigo === 'MAT' ? resultado.nivel_mat :
                                               disciplina.codigo === 'PROD' ? resultado.nivel_prod : null

                      return (
                        <td key={disciplina.codigo} className={`py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center ${isDestaqueDisciplina ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
                          {disciplina.tipo === 'nivel' ? (
                            <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold ${getNivelColor(nivelAprendizagem || '')}`}>
                              {nivelAprendizagem || '-'}
                            </span>
                          ) : (
                            <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(nota)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                              {getTotalQuestoesPorSerie(resultado, disciplina.codigo) && acertos !== null && (
                                <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 dark:text-gray-400 mb-0.5 font-medium">
                                  {acertos}/{getTotalQuestoesPorSerie(resultado, disciplina.codigo)}
                                </div>
                              )}
                              <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(nota)}`}>
                                {formatarNota(nota, resultado.presenca, resultado.media_aluno, disciplina.codigo, resultado.serie)}
                              </div>
                              {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                  <div
                                    className={`h-0.5 md:h-1 rounded-full ${
                                      nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              )}
                              {/* Badge de nivel dentro da celula (Anos Iniciais) */}
                              {isAnosIniciaisLib(resultado.serie) && nivelDisciplina && (
                                <div className="mt-0.5">
                                  <NivelBadge nivel={nivelDisciplina} />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                      <div className={`inline-flex flex-col items-center justify-center px-0.5 sm:px-1 md:px-1.5 lg:px-2 py-0.5 sm:py-1 md:py-1.5 lg:py-2 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                        mediaNum !== null && mediaNum >= 7 ? 'border-green-500' :
                        mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' :
                        'border-red-500'
                      } w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                        <div className={`text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                          {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                        </div>
                        {mediaNum !== null && mediaNum !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                          <div className="mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
                            Media
                          </div>
                        )}
                        {/* Nivel geral do aluno (Anos Iniciais) */}
                        {isAnosIniciaisLib(resultado.serie) && resultado.nivel_aluno && (
                          <NivelBadge nivel={resultado.nivel_aluno} className="mt-0.5 font-extrabold" />
                        )}
                      </div>
                    </td>
                    <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-3 lg:px-2 text-center">
                      <button
                        onClick={() => {
                          setAlunoSelecionado({
                            id: resultado.id || resultado.aluno_id || '',
                            anoLetivo: filtroAnoLetivo || undefined,
                            mediaAluno: resultado.media_aluno,
                            notasDisciplinas: {
                              nota_lp: resultado.nota_lp,
                              nota_ch: resultado.nota_ch,
                              nota_mat: resultado.nota_mat,
                              nota_cn: resultado.nota_cn,
                            },
                            niveisDisciplinas: {
                              nivel_lp: resultado.nivel_lp,
                              nivel_mat: resultado.nivel_mat,
                              nivel_prod: resultado.nivel_prod,
                              nivel_aluno: resultado.nivel_aluno,
                            },
                          })
                          setModalAberto(true)
                        }}
                        className="w-full inline-flex items-center justify-center px-1 sm:px-1.5 md:px-2 lg:px-3 py-1 sm:py-1 md:py-1.5 lg:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[9px] sm:text-[10px] md:text-xs font-medium shadow-sm"
                        title="Ver questoes do aluno"
                      >
                        <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 mr-0.5 sm:mr-1 flex-shrink-0" />
                        <span className="hidden md:inline">Ver Questoes</span>
                        <span className="md:hidden">Ver</span>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Paginacao */}
        {totalPaginas > 1 && (
          <div className="px-6 py-4 border-t-2 border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-gray-100">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mostrando <span className="font-bold text-indigo-600 dark:text-indigo-400">{((paginaAtual - 1) * itensPorPagina) + 1}</span> ate{' '}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.min(paginaAtual * itensPorPagina, alunosOrdenados.length)}</span> de{' '}
              <span className="font-bold text-gray-900 dark:text-white">{alunosOrdenados.length.toLocaleString('pt-BR')}</span> registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                disabled={paginaAtual === 1}
                className="px-4 py-2 text-sm font-medium border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let p = i + 1
                  if (totalPaginas > 5) {
                    if (paginaAtual <= 3) p = i + 1
                    else if (paginaAtual >= totalPaginas - 2) p = totalPaginas - 4 + i
                    else p = paginaAtual - 2 + i
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPaginaAtual(p)}
                      className={`px-3 py-2 text-sm font-semibold border-2 rounded-lg transition-colors ${
                        paginaAtual === p
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'border-gray-300 dark:border-slate-600 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="px-4 py-2 text-sm font-medium border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Proximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
