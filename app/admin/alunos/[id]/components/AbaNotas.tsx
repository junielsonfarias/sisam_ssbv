'use client'

import React, { useState } from 'react'
import { BookOpen, CalendarCheck, CheckCircle, XCircle } from 'lucide-react'

export function AbaNotas({ dados }: any) {
  const [anoAberto, setAnoAberto] = useState<string | null>(null)
  const anos = Object.keys(dados.notas || {}).sort().reverse()

  if (anos.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma nota escolar lançada</p>
    </div>
  )

  // Calcular resumo por ano
  const resumoPorAno = (ano: string) => {
    const notas = dados.notas[ano] || []
    const porDisc: Record<string, any[]> = {}
    for (const n of notas) {
      const key = n.disciplina || n.abreviacao
      if (!porDisc[key]) porDisc[key] = []
      porDisc[key].push(n)
    }
    const disciplinas = Object.keys(porDisc).length
    const todasFinais = Object.values(porDisc).map((periodos: any[]) => {
      const finais = periodos.map(p => p.nota_final).filter((f: any) => f !== null && f !== undefined) as number[]
      return finais.length > 0 ? finais.reduce((a, b) => a + b, 0) / finais.length : null
    }).filter((m): m is number => m !== null)
    const mediaGeral = todasFinais.length > 0 ? todasFinais.reduce((a, b) => a + b, 0) / todasFinais.length : null
    const abaixo = todasFinais.filter(m => m < 6).length
    const totalFaltas = notas.reduce((s: number, n: any) => s + (n.faltas || 0), 0)
    return { disciplinas, mediaGeral, abaixo, totalFaltas, totalDisc: todasFinais.length }
  }

  // Modal: organizar notas do ano selecionado
  const notasDoAno = anoAberto ? dados.notas[anoAberto] || [] : []
  const porDiscModal: Record<string, any[]> = {}
  for (const n of notasDoAno) {
    const key = n.disciplina || n.abreviacao
    if (!porDiscModal[key]) porDiscModal[key] = []
    porDiscModal[key].push(n)
  }
  // Ordenar períodos
  const disciplinasOrdenadas = Object.entries(porDiscModal).sort(([, a], [, b]) => {
    const ordemA = a[0]?.periodo_numero || 0
    const ordemB = b[0]?.periodo_numero || 0
    return ordemA - ordemB
  })

  return (
    <div className="space-y-4">
      {/* Cards de anos letivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {anos.map(ano => {
          const r = resumoPorAno(ano)
          return (
            <button
              key={ano}
              onClick={() => setAnoAberto(ano)}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-600 transition-all p-5 text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-lg p-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60 transition">
                    <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ano}</h3>
                </div>
                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition">Ver detalhes →</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Disciplinas</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{r.disciplinas}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Média Geral</p>
                  <p className={`text-sm font-bold ${r.mediaGeral !== null ? (r.mediaGeral >= 6 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                    {r.mediaGeral !== null ? r.mediaGeral.toFixed(1) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Abaixo da Média</p>
                  <p className={`text-sm font-bold ${r.abaixo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.abaixo} disciplina(s)</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Total Faltas</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{r.totalFaltas}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Modal com notas detalhadas */}
      {anoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAnoAberto(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-lg font-bold text-white">Notas Escolares — {anoAberto}</h2>
                  <p className="text-emerald-100 text-sm">{Object.keys(porDiscModal).length} disciplina(s)</p>
                </div>
              </div>
              <button onClick={() => setAnoAberto(null)} className="text-white/80 hover:text-white p-1">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-700">
                      <th className="border dark:border-slate-600 px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300" rowSpan={2}>Disciplina</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>1º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>2º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>3º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300" colSpan={2}>4º Bim</th>
                      <th className="border dark:border-slate-600 px-2 py-2 text-center font-semibold text-blue-700 dark:text-blue-400" rowSpan={2}>Média Final</th>
                      <th className="border dark:border-slate-600 px-2 py-2 text-center font-semibold text-gray-700 dark:text-gray-300" rowSpan={2}>Faltas</th>
                      <th className="border dark:border-slate-600 px-2 py-2 text-center font-semibold text-gray-700 dark:text-gray-300" rowSpan={2}>Situação</th>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-slate-700/50">
                      {[1,2,3,4].map(b => (
                        <React.Fragment key={b}>
                          <th className="border dark:border-slate-600 px-1 py-1 text-center text-[10px] font-medium text-gray-500">Av</th>
                          <th className="border dark:border-slate-600 px-1 py-1 text-center text-[10px] font-medium text-orange-500">Rec</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(porDiscModal).map(([disc, periodos]) => {
                      // Organizar por período (1-4)
                      const bimestres: Record<number, any> = {}
                      for (const p of periodos) {
                        bimestres[p.periodo_numero || 0] = p
                      }
                      // Calcular média final das notas_final
                      const notasFinais = periodos
                        .map((p: any) => p.nota_final)
                        .filter((f: any) => f !== null && f !== undefined) as number[]
                      const mediaFinal = notasFinais.length > 0
                        ? notasFinais.reduce((a, b) => a + b, 0) / notasFinais.length
                        : null
                      const totalFaltas = periodos.reduce((s: number, p: any) => s + (p.faltas || 0), 0)
                      const aprovado = mediaFinal !== null && mediaFinal >= 6

                      return (
                        <tr key={disc} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="border dark:border-slate-600 px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{disc}</td>
                          {[1,2,3,4].map(b => {
                            const bim = bimestres[b]
                            return (
                              <React.Fragment key={b}>
                                <td className={`border dark:border-slate-600 px-1 py-2 text-center text-xs ${bim?.nota !== null && bim?.nota !== undefined ? '' : 'text-gray-300'}`}>
                                  {bim?.nota !== null && bim?.nota !== undefined ? bim.nota.toFixed(1) : '-'}
                                </td>
                                <td className={`border dark:border-slate-600 px-1 py-2 text-center text-xs ${bim?.nota_recuperacao !== null && bim?.nota_recuperacao !== undefined ? 'text-orange-600 font-medium' : 'text-gray-300'}`}>
                                  {bim?.nota_recuperacao !== null && bim?.nota_recuperacao !== undefined ? bim.nota_recuperacao.toFixed(1) : '-'}
                                </td>
                              </React.Fragment>
                            )
                          })}
                          <td className={`border dark:border-slate-600 px-2 py-2 text-center font-bold text-sm ${
                            mediaFinal === null ? 'text-gray-400' : mediaFinal >= 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
                          </td>
                          <td className="border dark:border-slate-600 px-2 py-2 text-center text-gray-600 dark:text-gray-400">{totalFaltas}</td>
                          <td className="border dark:border-slate-600 px-2 py-2 text-center">
                            {mediaFinal !== null ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                aprovado
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {aprovado ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {aprovado ? 'Aprovado' : 'Reprovado'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumo no rodapé do modal */}
              {(() => {
                const r = resumoPorAno(anoAberto)
                return (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Média Geral:</span>
                      <span className={`ml-1 font-bold ${r.mediaGeral !== null ? (r.mediaGeral >= 6 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                        {r.mediaGeral !== null ? r.mediaGeral.toFixed(1) : '-'}
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Disciplinas abaixo:</span>
                      <span className={`ml-1 font-bold ${r.abaixo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{r.abaixo}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Total faltas:</span>
                      <span className="ml-1 font-bold text-gray-800 dark:text-gray-200">{r.totalFaltas}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">Situação geral:</span>
                      <span className={`ml-1 font-bold ${r.abaixo === 0 && r.mediaGeral !== null ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.mediaGeral === null ? '-' : r.abaixo === 0 ? 'Aprovado' : 'Em recuperação'}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
