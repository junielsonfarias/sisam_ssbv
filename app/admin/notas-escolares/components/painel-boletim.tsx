'use client'

import React, { useState } from 'react'
import { CheckCircle, Printer, ArrowLeft } from 'lucide-react'
import { useSeries } from '@/lib/use-series'
import type { Periodo, BoletimDisciplina, ConfigNotas } from './types'

interface PainelBoletimProps {
  aluno: any
  periodos: Periodo[]
  boletim: BoletimDisciplina[]
  config: ConfigNotas
  voltar: () => void
  imprimir: () => void
  frequencia?: any[]
  recuperacao?: any[]
}

export function PainelBoletim({
  aluno, periodos, boletim, config, voltar, imprimir,
  frequencia, recuperacao,
}: PainelBoletimProps) {
  const { formatSerie } = useSeries()
  const [abaAtiva, setAbaAtiva] = useState<'notas' | 'recuperacao'>('notas')
  const temRecuperacao = recuperacao && recuperacao.length > 0

  return (
    <div className="space-y-4">
      {/* Header do boletim */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={voltar} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Boletim de {aluno.nome}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {aluno.escola_nome} | Turma: {aluno.turma_codigo || '-'} | Série: {formatSerie(aluno.serie)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={imprimir}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mt-3 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setAbaAtiva('notas')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === 'notas'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Boletim Geral
          </button>
          <button
            onClick={() => setAbaAtiva('recuperacao')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              abaAtiva === 'recuperacao'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Recuperação
            {temRecuperacao && (
              <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] px-1.5 py-0.5 rounded-full">
                {recuperacao!.reduce((s, d) => s + d.periodos.length, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {abaAtiva === 'notas' ? (
        <>
          {/* Tabela do boletim */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th rowSpan={2} className="text-left py-2 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-slate-600">Disciplina</th>
                    {periodos.map(p => (
                      <th key={p.id} colSpan={2} className="text-center py-2 px-1 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-slate-600">
                        {p.nome}
                      </th>
                    ))}
                    <th rowSpan={2} className="text-center py-2 px-2 text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase bg-blue-50 dark:bg-blue-900/20 w-16">Média</th>
                    <th rowSpan={2} className="text-center py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-14">Faltas</th>
                    <th rowSpan={2} className="text-center py-2 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-20">Situação</th>
                  </tr>
                  <tr>
                    {periodos.map(p => (
                      <React.Fragment key={`sub-${p.id}`}>
                        <th className="text-center py-1 px-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-slate-600/50">Av.</th>
                        <th className="text-center py-1 px-1 text-[10px] font-medium text-orange-500 dark:text-orange-400 border-r border-gray-200 dark:border-slate-600">Rec.</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {boletim.map((d, idx) => (
                    <tr key={d.disciplina_id} className={idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}>
                      <td className="py-2.5 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-slate-600 whitespace-nowrap">{d.disciplina_nome}</td>
                      {d.periodos.map(p => {
                        const abaixo = p.nota !== null && p.nota < config.media_aprovacao
                        const substituiu = p.nota_recuperacao !== null && p.nota !== null && p.nota_recuperacao > p.nota
                        return (
                          <React.Fragment key={p.periodo_id}>
                            <td className={`py-2.5 px-1 text-center border-r border-gray-100 dark:border-slate-600/50 ${substituiu ? 'line-through opacity-50' : ''}`}>
                              <span className={`text-sm ${abaixo && !substituiu ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                {p.nota !== null ? p.nota.toFixed(1) : '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-1 text-center border-r border-gray-200 dark:border-slate-600">
                              {p.nota_recuperacao !== null ? (
                                <span className={`text-sm font-semibold ${substituiu ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}`}>
                                  {p.nota_recuperacao.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-sm">-</span>
                              )}
                            </td>
                          </React.Fragment>
                        )
                      })}
                      <td className="py-2.5 px-2 text-center bg-blue-50/50 dark:bg-blue-900/10">
                        <span className={`text-sm font-bold ${
                          d.media_anual !== null
                            ? (d.media_anual >= config.media_aprovacao ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')
                            : 'text-gray-400'
                        }`}>
                          {d.media_anual !== null ? d.media_anual.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-sm text-gray-700 dark:text-gray-300">{d.total_faltas}</td>
                      <td className="py-2.5 px-2 text-center">
                        {d.situacao === 'aprovado' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Aprovado
                          </span>
                        ) : d.situacao === 'reprovado' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Reprovado
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Frequencia Unificada */}
            {frequencia && frequencia.some(f => f.dias_letivos !== null) && (
              <div className="border-t border-gray-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-50 dark:bg-purple-900/20">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase border-r border-gray-200 dark:border-slate-600">Frequência Geral</th>
                        {frequencia.map(f => (
                          <th key={f.periodo_id} colSpan={2} className="text-center py-2 px-1 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase border-r border-gray-200 dark:border-slate-600">
                            {f.periodo_nome}
                          </th>
                        ))}
                        <th className="text-center py-2 px-2 text-xs font-semibold text-purple-600 dark:text-purple-300 w-16">Média</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-purple-600 dark:text-purple-300 w-14">Total</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-purple-50/30 dark:bg-purple-900/5">
                        <td className="py-2 px-4 text-sm font-medium text-purple-700 dark:text-purple-300 border-r border-gray-200 dark:border-slate-600">Presenças / Faltas</td>
                        {frequencia.map(f => (
                          <td key={f.periodo_id} colSpan={2} className="py-2 px-1 text-center border-r border-gray-200 dark:border-slate-600">
                            {f.dias_letivos !== null ? (
                              <div>
                                <span className={`text-sm font-semibold ${
                                  f.percentual !== null ? (f.percentual >= 75 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-500'
                                }`}>
                                  {f.percentual !== null ? `${f.percentual.toFixed(0)}%` : '-'}
                                </span>
                                <span className="block text-[10px] text-gray-400">
                                  {f.presencas}/{f.dias_letivos} dias | {f.faltas}F
                                </span>
                              </div>
                            ) : <span className="text-gray-300 text-sm">-</span>}
                          </td>
                        ))}
                        <td className="py-2 px-2 text-center">
                          {(() => {
                            const comDados = frequencia.filter(f => f.percentual !== null)
                            if (comDados.length === 0) return <span className="text-gray-300">-</span>
                            const media = comDados.reduce((s, f) => s + f.percentual, 0) / comDados.length
                            return <span className={`text-sm font-bold ${media >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>{media.toFixed(0)}%</span>
                          })()}
                        </td>
                        <td className="py-2 px-2 text-center text-sm text-gray-700 dark:text-gray-300">
                          {frequencia.reduce((s, f) => s + (f.faltas || 0), 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Legenda */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
              <span>Média aprovação: <strong>{config.media_aprovacao}</strong></span>
              <span>Nota máxima: <strong>{config.nota_maxima}</strong></span>
              {config.formula_media === 'media_ponderada' && config.pesos_periodos?.length && (
                <span className="text-blue-500">
                  Média Ponderada (pesos: {config.pesos_periodos.map(p => p.peso).join(', ')})
                </span>
              )}
              <span className="text-red-500">Vermelho = abaixo da média</span>
              <span className="text-emerald-500">Verde na Rec. = substituiu a nota</span>
              <span className="line-through opacity-50">Riscado = substituída pela recuperação</span>
            </div>
          </div>
        </>
      ) : (
        /* Aba de Recuperacao */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          {temRecuperacao ? (
            <>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Regra de recuperação:</strong> A nota de recuperação substitui a avaliação quando for maior.
                  São 4 avaliações e 4 recuperações (1 por bimestre).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Disciplina</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Período</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nota Avaliação</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-orange-600 dark:text-orange-300 uppercase">Nota Recuperação</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase">Nota Final</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {recuperacao!.flatMap((d, di) =>
                      d.periodos.map((p: any, pi: number) => (
                        <tr key={`${di}-${pi}`} className={pi % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}>
                          {pi === 0 && (
                            <td rowSpan={d.periodos.length} className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-slate-600">
                              {d.disciplina}
                            </td>
                          )}
                          <td className="py-3 px-3 text-center text-sm text-gray-700 dark:text-gray-300">{p.periodo}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm ${p.substituiu ? 'line-through opacity-50' : 'font-semibold text-red-600 dark:text-red-400'}`}>
                              {p.nota_original !== null ? p.nota_original.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm font-semibold ${p.substituiu ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500'}`}>
                              {p.nota_recuperacao !== null ? p.nota_recuperacao.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm font-bold ${
                              p.nota_final !== null && p.nota_final >= config.media_aprovacao
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {p.nota_final !== null ? p.nota_final.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {p.substituiu ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <CheckCircle className="w-3 h-3" /> Substituiu
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Manteve original
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Resumo da recuperacao */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                <span>{recuperacao!.length} disciplina(s) com recuperação</span>
                <span>{recuperacao!.reduce((s, d) => s + d.periodos.length, 0)} prova(s) de recuperação</span>
                <span className="text-emerald-500">
                  {recuperacao!.reduce((s, d) => s + d.periodos.filter((p: any) => p.substituiu).length, 0)} nota(s) substituída(s)
                </span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-300 dark:text-emerald-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma prova de recuperação registrada</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">O aluno não realizou recuperação em nenhum bimestre</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
