'use client'

import { Save, AlertCircle, CheckCircle, ArrowLeft, Eye } from 'lucide-react'
import type { AlunoTurma, NotaAluno, ConfigNotas, ConceitoEscala, AvaliacaoTurma, FreqUnificadaAluno } from './types'

interface PainelLancamentoProps {
  alunos: AlunoTurma[]
  notas: Record<string, NotaAluno>
  config: ConfigNotas
  turmaNome: string
  disciplinaNome: string
  periodoNome: string
  mostrarRecuperacao: boolean
  setMostrarRecuperacao: (v: boolean) => void
  atualizarNota: (alunoId: string, campo: keyof NotaAluno, valor: any) => void
  salvarNotas: () => void
  salvando: boolean
  voltar: () => void
  verBoletim: (aluno: AlunoTurma) => void
  freqUnificada: boolean
  diasLetivos: number
  setDiasLetivos: (v: number) => void
  frequencias: Record<string, FreqUnificadaAluno>
  atualizarFrequencia: (alunoId: string, campo: keyof FreqUnificadaAluno, valor: number) => void
  avaliacaoTurma: AvaliacaoTurma | null
}

export function PainelLancamento({
  alunos, notas, config,
  turmaNome, disciplinaNome, periodoNome,
  mostrarRecuperacao, setMostrarRecuperacao,
  atualizarNota, salvarNotas, salvando,
  voltar, verBoletim,
  freqUnificada, diasLetivos, setDiasLetivos,
  frequencias, atualizarFrequencia,
  avaliacaoTurma,
}: PainelLancamentoProps) {
  const alunosAtivos = alunos.filter((a: AlunoTurma) => a.situacao === 'cursando' || !a.situacao)

  const tipoResultado = avaliacaoTurma?.tipo_avaliacao?.tipo_resultado || 'numerico'
  const isParecer = tipoResultado === 'parecer'
  const isConceito = tipoResultado === 'conceito'
  const escalaConceitos: ConceitoEscala[] = avaliacaoTurma?.tipo_avaliacao?.escala_conceitos || []

  // Contadores
  const totalLancados = alunosAtivos.filter((a: AlunoTurma) => {
    const n = notas[a.id]
    if (isParecer) return n?.parecer_descritivo
    if (isConceito) return n?.conceito
    return n?.nota !== null && n?.nota !== undefined
  }).length

  const totalAbaixoMedia = !isParecer ? alunosAtivos.filter((a: AlunoTurma) => {
    const n = notas[a.id]
    if (isConceito) {
      if (!n?.conceito || escalaConceitos.length === 0) return false
      const c = escalaConceitos.find((c: ConceitoEscala) => c.codigo === n.conceito)
      return c ? c.valor_numerico < config.media_aprovacao : false
    }
    return n?.nota !== null && n?.nota !== undefined && n.nota < config.media_aprovacao
  }).length : 0

  const totalBaixaFreq = freqUnificada && !isParecer ? alunosAtivos.filter((a: AlunoTurma) => {
    const f = frequencias[a.id]
    if (!f || diasLetivos <= 0) return false
    const pct = (f.presencas / diasLetivos) * 100
    return pct < 75
  }).length : 0

  // Label do tipo
  const tipoLabel = isParecer ? 'Parecer Descritivo' : isConceito ? 'Conceito' : `Nota (0-${config.nota_maxima})`
  const subtitulo = isParecer ? `${turmaNome} | ${periodoNome}` : `${turmaNome} | ${periodoNome}`

  return (
    <div className="space-y-4">
      {/* Barra de contexto */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={voltar} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {isParecer ? 'Parecer Descritivo' : disciplinaNome}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{subtitulo}</p>
            </div>
            {/* Badge tipo de avaliacao */}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isParecer ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' :
              isConceito ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {tipoLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
              {totalLancados}/{alunosAtivos.length} lançados
            </span>
            {totalAbaixoMedia > 0 && (
              <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-3 py-1 rounded-full">
                {totalAbaixoMedia} abaixo da média
              </span>
            )}
            {freqUnificada && !isParecer && totalBaixaFreq > 0 && (
              <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full">
                {totalBaixaFreq} abaixo de 75% freq.
              </span>
            )}
            {freqUnificada && !isParecer && (
              <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs">
                Freq. Unificada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dias Letivos (frequencia unificada, nao para parecer) */}
      {freqUnificada && !isParecer && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-center gap-4">
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Dias Letivos no Período:</span>
          <input
            type="number"
            value={diasLetivos}
            onChange={e => setDiasLetivos(parseInt(e.target.value) || 0)}
            min={0}
            max={200}
            className="w-20 text-center rounded-lg border border-purple-300 dark:border-purple-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold"
          />
          <span className="text-xs text-purple-500 dark:text-purple-400">
            Frequência unificada — vale para todas as disciplinas deste período
          </span>
        </div>
      )}

      {/* Aviso frequencia por aula (6o-9o) */}
      {!freqUnificada && !isParecer && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 dark:text-amber-400 text-lg">&#9432;</span>
            <span className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Faltas por disciplina</strong> — calculadas automaticamente a partir da frequência por aula.
              Gerencie no <strong>Painel da Turma</strong> e agregue os dados ao final do período.
            </span>
          </div>
          <a
            href="/admin/painel-turma"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Painel da Turma
          </a>
        </div>
      )}

      {/* Info parecer */}
      {isParecer && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 flex items-center gap-3">
          <span className="text-violet-600 dark:text-violet-400 text-lg">&#9998;</span>
          <span className="text-sm text-violet-700 dark:text-violet-300">
            <strong>Avaliação por Parecer Descritivo</strong> — escreva o parecer individual de cada aluno.
            Não há nota numérica. A aprovação é automática para esta etapa.
          </span>
        </div>
      )}

      {/* Info conceito */}
      {isConceito && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg">&#9733;</span>
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Avaliação por Conceito</strong> — selecione o conceito de cada aluno.
            <span className="ml-2">
              {escalaConceitos.map((c: ConceitoEscala) => (
                <span key={c.codigo} className="inline-flex items-center gap-0.5 mr-2">
                  <strong>{c.codigo}</strong>={c.nome} ({c.valor_numerico})
                </span>
              ))}
            </span>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        {!isParecer && !isConceito && config.permite_recuperacao && (
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-sm">
            <input
              type="checkbox"
              checked={mostrarRecuperacao}
              onChange={e => setMostrarRecuperacao(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-emerald-600"
            />
            Mostrar Recuperação
          </label>
        )}
        <button
          onClick={salvarNotas}
          disabled={salvando}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 text-sm font-medium transition-colors ml-auto"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : isParecer ? 'Salvar Pareceres' : freqUnificada ? 'Salvar Notas e Frequência' : 'Salvar Notas'}
        </button>
      </div>

      {/* ============================================ */}
      {/* TABELA: PARECER DESCRITIVO */}
      {/* ============================================ */}
      {isParecer ? (
        <div className="space-y-4">
          {alunosAtivos.map((aluno: AlunoTurma, idx: number) => {
            const nota = notas[aluno.id]
            const parecer = nota?.parecer_descritivo || ''

            return (
              <div key={aluno.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-gray-400 font-mono w-6">{idx + 1}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{aluno.nome}</span>
                  {aluno.pcd && (
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">PCD</span>
                  )}
                  {parecer.length > 0 && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                  )}
                </div>
                <textarea
                  value={parecer}
                  onChange={e => atualizarNota(aluno.id, 'parecer_descritivo', e.target.value)}
                  placeholder="Escreva o parecer descritivo do aluno..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y placeholder:text-gray-400"
                />
              </div>
            )
          })}
          {alunosAtivos.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
              Nenhum aluno ativo nesta turma
            </div>
          )}
        </div>
      ) : (
        /* ============================================ */
        /* TABELA: CONCEITO / NUMERICO */
        /* ============================================ */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-8">#</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Aluno</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-28">
                    {isConceito ? 'Conceito' : `Nota (0-${config.nota_maxima})`}
                  </th>
                  {!isConceito && mostrarRecuperacao && (
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-24">Recuperação</th>
                  )}
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-20">
                    {isConceito ? 'Valor' : 'Nota Final'}
                  </th>
                  {freqUnificada ? (
                    <>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase w-16 bg-purple-50/50 dark:bg-purple-900/10">Faltas</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase w-16 bg-purple-50/50 dark:bg-purple-900/10">Pres.</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-purple-600 dark:text-purple-300 uppercase w-16 bg-purple-50/50 dark:bg-purple-900/10">%</th>
                    </>
                  ) : (
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-16">Faltas</th>
                  )}
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-20">Status</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase w-16">Boletim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {alunosAtivos.map((aluno: AlunoTurma, idx: number) => {
                  const nota = notas[aluno.id]
                  const notaVal = nota?.nota
                  const notaFinal = nota?.nota_final
                  const conceitoVal = nota?.conceito

                  // Para conceito, calcular valor numerico localmente
                  let conceitoNumerico: number | null = null
                  if (isConceito && conceitoVal && escalaConceitos.length > 0) {
                    const c = escalaConceitos.find((c: ConceitoEscala) => c.codigo === conceitoVal)
                    if (c) conceitoNumerico = c.valor_numerico
                  }

                  const valorExibicao = isConceito ? conceitoNumerico : notaFinal
                  const abaixo = valorExibicao !== null && valorExibicao !== undefined && valorExibicao < config.media_aprovacao

                  return (
                    <tr key={aluno.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                      <td className="py-2 px-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{aluno.nome}</span>
                          {aluno.pcd && (
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">PCD</span>
                          )}
                        </div>
                      </td>

                      {/* Input de conceito ou nota */}
                      <td className="py-2 px-3 text-center">
                        {isConceito ? (
                          <select
                            value={conceitoVal || ''}
                            onChange={e => atualizarNota(aluno.id, 'conceito', e.target.value || null)}
                            className={`w-24 text-center rounded-lg border px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold
                              ${abaixo ? 'border-red-300 dark:border-red-600' : 'border-amber-300 dark:border-amber-600'}`}
                          >
                            <option value="">-</option>
                            {escalaConceitos.map((c: ConceitoEscala) => (
                              <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nome}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={notaVal ?? ''}
                            onChange={e => {
                              const v = e.target.value === '' ? null : parseFloat(e.target.value)
                              atualizarNota(aluno.id, 'nota', v)
                            }}
                            min={0}
                            max={config.nota_maxima}
                            step={0.1}
                            className={`w-20 text-center rounded-lg border px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                              ${abaixo && !mostrarRecuperacao ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'}`}
                          />
                        )}
                      </td>

                      {/* Recuperacao (so numerico) */}
                      {!isConceito && mostrarRecuperacao && (
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            value={nota?.nota_recuperacao ?? ''}
                            onChange={e => {
                              const v = e.target.value === '' ? null : parseFloat(e.target.value)
                              atualizarNota(aluno.id, 'nota_recuperacao', v)
                            }}
                            min={0}
                            max={config.nota_maxima}
                            step={0.1}
                            className="w-20 text-center rounded-lg border border-orange-300 dark:border-orange-600 px-2 py-1.5 text-sm bg-orange-50 dark:bg-orange-900/20 text-gray-900 dark:text-white"
                            placeholder="-"
                          />
                        </td>
                      )}

                      {/* Nota Final / Valor */}
                      <td className="py-2 px-3 text-center">
                        {isConceito ? (
                          <span className={`text-sm font-semibold ${
                            conceitoNumerico !== null
                              ? (conceitoNumerico >= config.media_aprovacao
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400')
                              : 'text-gray-400'
                          }`}>
                            {conceitoNumerico !== null ? conceitoNumerico.toFixed(1) : '-'}
                          </span>
                        ) : (
                          <span className={`text-sm font-semibold ${
                            notaFinal !== null && notaFinal !== undefined
                              ? (notaFinal >= config.media_aprovacao
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400')
                              : 'text-gray-400'
                          }`}>
                            {notaFinal !== null && notaFinal !== undefined ? notaFinal.toFixed(1) : '-'}
                          </span>
                        )}
                      </td>

                      {/* Frequencia */}
                      {freqUnificada ? (() => {
                        const freq = frequencias[aluno.id] || { presencas: diasLetivos, faltas: 0, faltas_justificadas: 0 }
                        const pct = diasLetivos > 0 ? ((freq.presencas / diasLetivos) * 100) : 0
                        const corPct = pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                        return (
                          <>
                            <td className="py-2 px-3 text-center bg-purple-50/30 dark:bg-purple-900/5">
                              <input
                                type="number"
                                value={freq.faltas}
                                onChange={e => atualizarFrequencia(aluno.id, 'faltas', parseInt(e.target.value) || 0)}
                                min={0}
                                max={diasLetivos}
                                className="w-14 text-center rounded-lg border border-purple-300 dark:border-purple-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-center bg-purple-50/30 dark:bg-purple-900/5">
                              <input
                                type="number"
                                value={freq.presencas}
                                onChange={e => atualizarFrequencia(aluno.id, 'presencas', parseInt(e.target.value) || 0)}
                                min={0}
                                max={diasLetivos}
                                className="w-14 text-center rounded-lg border border-purple-300 dark:border-purple-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-center bg-purple-50/30 dark:bg-purple-900/5">
                              <span className={`text-sm font-semibold ${corPct}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </td>
                          </>
                        )
                      })() : (
                        <td className="py-2 px-3 text-center" title="Faltas calculadas automaticamente a partir da frequência por aula. Acesse o Painel da Turma para gerenciar.">
                          <span className="inline-block w-14 text-center rounded-lg border border-gray-200 dark:border-slate-600 px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 cursor-help">
                            {nota?.faltas ?? 0}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {isConceito ? (
                          conceitoNumerico !== null ? (
                            conceitoNumerico >= config.media_aprovacao ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )
                        ) : (
                          notaFinal !== null && notaFinal !== undefined ? (
                            notaFinal >= config.media_aprovacao ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )
                        )}
                      </td>

                      {/* Boletim */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => verBoletim(aluno)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title="Ver boletim"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {alunosAtivos.length === 0 && (
                  <tr>
                    <td colSpan={!isConceito && mostrarRecuperacao ? (freqUnificada ? 10 : 8) : (freqUnificada ? 9 : 7)} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum aluno ativo nesta turma
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botao salvar fixo no mobile */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
        <button
          onClick={salvarNotas}
          disabled={salvando}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl shadow-lg hover:bg-emerald-700 disabled:bg-emerald-400 text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : isParecer ? 'Salvar Pareceres' : freqUnificada ? 'Salvar Notas e Frequência' : 'Salvar Notas'}
        </button>
      </div>
    </div>
  )
}
