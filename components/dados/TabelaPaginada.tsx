'use client'

import { Table, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import { TOOLTIPS_COLUNAS, CORES_NIVEL_TABELA, CORES_NIVEL_BADGE } from '@/lib/dados/constants'
import { getNotaCorTabela, getDecimalColor, calcularCodigoNivel } from '@/lib/dados/utils'
import type { ColunaTabela, Ordenacao } from '@/lib/dados/types'

interface TabelaPaginadaProps {
  dados: any[]
  colunas: ColunaTabela[]
  ordenacao: Ordenacao
  onOrdenar: (coluna: string) => void
  paginaAtual: number
  totalPaginas: number
  onPaginar: (pagina: number) => void
  totalRegistros: number
  itensPorPagina: number
  stickyHeader?: boolean
}

export default function TabelaPaginada({
  dados,
  colunas,
  ordenacao,
  onOrdenar,
  paginaAtual,
  totalPaginas,
  onPaginar,
  totalRegistros,
  itensPorPagina,
  stickyHeader = false
}: TabelaPaginadaProps) {

  const formatarValor = (valor: any, formato: string) => {
    if (valor === null || valor === undefined) return (
      <span className="text-gray-400 italic">-</span>
    )
    switch (formato) {
      case 'nota':
        const nota = parseFloat(valor)
        const corNota = getNotaCorTabela(nota)
        const isCritico = nota < 3
        const nivelNota = calcularCodigoNivel(nota)
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`inline-flex items-center justify-center px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold border-2 ${corNota} min-w-[50px] sm:min-w-[60px] ${isCritico ? 'animate-pulse' : ''}`}>
              {isCritico && <span className="mr-1">⚠</span>}
              {nota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {nivelNota && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CORES_NIVEL_BADGE[nivelNota] || ''}`}>
                {nivelNota}
              </span>
            )}
          </div>
        )
      case 'decimal':
      case 'decimal_com_nivel':
        // N/A apenas quando valor é null/undefined (disciplina não se aplica)
        if (valor === null || valor === undefined) {
          return <span className="text-gray-400 dark:text-gray-500 italic text-sm">N/A</span>
        }
        const decimal = parseFloat(valor)
        if (isNaN(decimal)) {
          return <span className="text-gray-400 dark:text-gray-500 italic text-sm">N/A</span>
        }
        // Valor 0 é válido - significa que a escola tem a disciplina mas tirou nota 0
        const corDecimal = getDecimalColor(decimal)
        const isCriticoDecimal = decimal >= 0 && decimal < 3
        const nivelDecimal = decimal > 0 ? calcularCodigoNivel(decimal) : null
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-sm font-semibold ${corDecimal} ${isCriticoDecimal ? 'animate-pulse' : ''}`}>
              {isCriticoDecimal && <span className="mr-0.5">⚠</span>}
              {decimal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {formato === 'decimal_com_nivel' && nivelDecimal && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CORES_NIVEL_BADGE[nivelDecimal] || ''}`}>
                {nivelDecimal}
              </span>
            )}
          </div>
        )
      case 'media_etapa':
        if (valor === null || valor === undefined) {
          return <span className="text-gray-400 dark:text-gray-500 italic text-sm">--</span>
        }
        const mediaEtapa = parseFloat(valor)
        if (isNaN(mediaEtapa) || mediaEtapa <= 0) {
          return <span className="text-gray-400 dark:text-gray-500 italic text-sm">--</span>
        }
        const corEtapa = getDecimalColor(mediaEtapa)
        const isCriticoEtapa = mediaEtapa < 3
        const nivelEtapa = calcularCodigoNivel(mediaEtapa)
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-sm font-semibold ${corEtapa} ${isCriticoEtapa ? 'animate-pulse' : ''}`}>
              {isCriticoEtapa && <span className="mr-0.5">⚠</span>}
              {mediaEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {nivelEtapa && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CORES_NIVEL_BADGE[nivelEtapa] || ''}`}>
                {nivelEtapa}
              </span>
            )}
          </div>
        )
      case 'presenca':
        return valor === 'P' ? (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-2 border-green-300">
            ✓ Presente
          </span>
        ) : (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-2 border-red-300">
            ✗ Faltante
          </span>
        )
      case 'nivel':
        return valor && valor !== '-' ? (
          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold border-2 ${CORES_NIVEL_TABELA[valor] || 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600'}`}>
            {valor}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 italic text-xs">-</span>
        )
      case 'serie':
        if (!valor) return <span className="text-gray-400 italic">-</span>
        const serieStr = String(valor)
        if (serieStr.toLowerCase().includes('ano')) {
          return <span className="text-sm text-gray-700 dark:text-gray-300">{serieStr}</span>
        }
        const numeroMatch = serieStr.match(/(\d+)/)
        if (!numeroMatch) {
          return <span className="text-sm text-gray-700 dark:text-gray-300">{serieStr}</span>
        }
        const numero = numeroMatch[1]
        return <span className="text-sm text-gray-700 dark:text-gray-300">{numero}º Ano</span>
      case 'badge_turmas':
        const numTurmas = parseInt(valor) || 0
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold text-sm">
            {numTurmas}
          </span>
        )
      default:
        return <span className="text-sm text-gray-700 dark:text-gray-300">{valor}</span>
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-slate-700 w-full max-w-full">
      {/* Visualizacao Mobile - Cards */}
      <div className="block md:hidden">
        {dados.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="flex flex-col items-center justify-center">
              <Table className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Nenhum registro encontrado</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {dados.map((row: any, i: number) => (
              <div key={i} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                {colunas.map((col: ColunaTabela, colIndex: number) => {
                  const valor = row[col.key]
                  const isNumero = typeof valor === 'number'
                  if (colIndex === 0) {
                    return (
                      <div key={col.key} className="font-semibold text-gray-900 dark:text-white text-sm mb-2 pb-2 border-b border-gray-100 dark:border-slate-700">
                        {valor || '-'}
                      </div>
                    )
                  }
                  return (
                    <div key={col.key} className="flex justify-between items-center py-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{col.label}:</span>
                      <span className="text-xs">
                        {col.format ? formatarValor(valor, col.format) : (
                          <span className={`${isNumero ? 'font-semibold text-gray-800 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                            {valor !== null && valor !== undefined
                              ? (isNumero ? valor.toLocaleString('pt-BR') : valor)
                              : <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                            }
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visualizacao Desktop - Tabela */}
      <div className="hidden md:block">
        <table className="w-full min-w-[400px] md:min-w-[600px] lg:min-w-[800px]">
          <thead className={`bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 border-b-2 border-gray-300 dark:border-slate-600 ${stickyHeader ? 'sticky top-[180px] sm:top-[190px] z-30' : ''}`}>
            <tr>
              {colunas.map((col: ColunaTabela) => (
                <th
                  key={col.key}
                  onClick={() => onOrdenar(col.key)}
                  title={TOOLTIPS_COLUNAS[col.key] || col.label}
                  className={`px-2 lg:px-4 py-2 lg:py-4 text-${col.align || 'left'} text-[10px] lg:text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-600 select-none whitespace-nowrap transition-colors ${col.destaque ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-x-2 border-indigo-300 dark:border-indigo-700' : 'text-gray-700 dark:text-gray-200'} ${ordenacao.coluna === col.key ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                >
                  <div className={`flex items-center gap-1 lg:gap-2 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {col.destaque && <span className="text-[8px] lg:text-[10px] ml-1">●</span>}
                    {TOOLTIPS_COLUNAS[col.key] && (
                      <span className="text-gray-400 dark:text-gray-500 text-[10px]" title={TOOLTIPS_COLUNAS[col.key]}>ⓘ</span>
                    )}
                    {ordenacao.coluna === col.key ? (
                      ordenacao.direcao === 'asc' ?
                        <ChevronUp className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-600" /> :
                        <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400 dark:text-gray-500 opacity-50 group-hover:opacity-100" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length} className="px-4 py-8 lg:py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Table className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm lg:text-base">Nenhum registro encontrado</p>
                    <p className="text-xs lg:text-sm text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros</p>
                  </div>
                </td>
              </tr>
            ) : (
              dados.map((row: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100 dark:border-slate-700"
                >
                  {colunas.map((col: ColunaTabela) => {
                    const valor = row[col.key]
                    const isNumero = typeof valor === 'number'
                    const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    const destaqueClass = col.destaque ? 'bg-indigo-50 dark:bg-indigo-900/30 border-x-2 border-indigo-200 dark:border-indigo-800' : ''

                    return (
                      <td
                        key={col.key}
                        className={`px-2 lg:px-4 py-2 lg:py-3 ${alignClass} whitespace-nowrap align-middle ${destaqueClass}`}
                      >
                        {col.format ? formatarValor(valor, col.format) : (
                          <span className={`text-xs lg:text-sm ${isNumero ? 'font-semibold text-gray-800 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                            {valor !== null && valor !== undefined
                              ? (isNumero ? valor.toLocaleString('pt-BR') : valor)
                              : <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                            }
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacao */}
      {totalPaginas > 1 && (
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t-2 border-gray-200 dark:border-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800">
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center sm:text-left">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{((paginaAtual - 1) * itensPorPagina) + 1}</span>-<span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.min(paginaAtual * itensPorPagina, totalRegistros)}</span> de{' '}
            <span className="font-bold text-gray-900 dark:text-white">{totalRegistros.toLocaleString('pt-BR')}</span>
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onPaginar(Math.max(1, paginaAtual - 1))}
              disabled={paginaAtual === 1}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ant.
            </button>
            <div className="flex gap-0.5 sm:gap-1">
              {Array.from({ length: Math.min(3, totalPaginas) }, (_, i) => {
                let p = i + 1
                if (totalPaginas > 3) {
                  if (paginaAtual <= 2) p = i + 1
                  else if (paginaAtual >= totalPaginas - 1) p = totalPaginas - 2 + i
                  else p = paginaAtual - 1 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => onPaginar(p)}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border-2 rounded-lg transition-colors ${
                      paginaAtual === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => onPaginar(Math.min(totalPaginas, paginaAtual + 1))}
              disabled={paginaAtual === totalPaginas}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prox.
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
