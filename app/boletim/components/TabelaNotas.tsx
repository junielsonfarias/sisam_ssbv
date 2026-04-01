'use client'

import { BookOpen, Award } from 'lucide-react'

interface Disciplina { id: string; nome: string; codigo: string; abreviacao: string; ordem: number }
interface Periodo { id: string; nome: string; tipo: string; numero: number }
interface NotaCell { nota_final: number | null; nota_recuperacao: number | null; faltas: number }
interface Avaliacao {
  avaliacao: string; tipo: string; presenca: string
  nota_lp: number | null; nota_mat: number | null; nota_ch: number | null
  nota_cn: number | null; nota_producao: number | null; media: number | null
  nivel: string | null; acertos_lp: number; acertos_mat: number; acertos_ch: number; acertos_cn: number
}

interface TabelaNotasProps {
  disciplinas: Disciplina[]
  periodos: Periodo[]
  notas: Record<string, Record<number, NotaCell>>
  avaliacoes_sisam: Avaliacao[]
  serie: string
  formatSerie: (serie: string | null | undefined) => string
}

function notaColor(n: number | null) {
  if (n === null) return 'text-gray-400'
  if (n >= 7) return 'text-blue-800'
  if (n >= 5) return 'text-amber-600'
  return 'text-red-600'
}

function notaBg(n: number | null) {
  if (n === null) return ''
  if (n >= 7) return 'bg-blue-50'
  if (n >= 5) return 'bg-amber-50'
  return 'bg-red-50'
}

export default function TabelaNotas({
  disciplinas,
  periodos,
  notas,
  avaliacoes_sisam,
  serie,
  formatSerie,
}: TabelaNotasProps) {
  const serieNum = parseInt((serie || '').replace(/\D/g, '')) || 0
  const isIniciais = [1, 2, 3, 4, 5].includes(serieNum)

  const nivelBadge = (nivel: string | null) => {
    if (!nivel) return null
    const cls = nivel.includes('AVANC') ? 'bg-blue-100 text-blue-800' :
      nivel.includes('ADEQU') ? 'bg-blue-50 text-blue-700' :
      nivel.includes('BAS') ? 'bg-amber-100 text-amber-700' :
      'bg-red-100 text-red-700'
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{nivel}</span>
  }

  const presencaBadge = (p: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      p === 'P' ? 'bg-blue-100 text-blue-900' : 'bg-red-100 text-red-700'
    }`}>{p === 'P' ? 'Presente' : 'Faltou'}</span>
  )

  return (
    <>
      {/* Disciplinas e Notas */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-800" />
          <h3 className="font-bold text-sm sm:text-base text-slate-800">Notas por Disciplina</h3>
        </div>

        {disciplinas.length > 0 && periodos.length > 0 ? (<>
          {/* MOBILE: Cards por disciplina */}
          <div className="sm:hidden divide-y divide-gray-100">
            {disciplinas.map(disc => {
              const notasDisc = notas[disc.id] || {}
              const valoresNotas = periodos.map(p => notasDisc[p.numero]?.nota_final).filter((n): n is number => n !== null && n !== undefined)
              const media = valoresNotas.length > 0 ? valoresNotas.reduce((a, b) => a + b, 0) / valoresNotas.length : null
              return (
                <div key={disc.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-slate-800">{disc.abreviacao || disc.codigo || disc.nome}</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${notaBg(media)} ${notaColor(media)}`}>
                      Média: {media !== null ? media.toFixed(1) : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {periodos.map(p => {
                      const celula = notasDisc[p.numero]
                      const temNota = celula?.nota_final !== null && celula?.nota_final !== undefined
                      return (
                        <div key={p.id} className={`text-center py-1.5 rounded-lg ${temNota ? notaBg(celula?.nota_final ?? 0) : 'bg-gray-50'}`}>
                          <div className="text-[9px] text-slate-400 font-medium">{p.numero}&#170; Av.</div>
                          <div className={`text-sm font-bold ${temNota ? notaColor(celula?.nota_final ?? 0) : 'text-gray-300'}`}>
                            {temNota && celula?.nota_final != null ? celula.nota_final.toFixed(1) : '-'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP: Tabela tradicional */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Disciplina</th>
                  {periodos.map(p => (
                    <th key={p.id} className="text-center px-3 py-3 font-semibold whitespace-nowrap">{p.nome}</th>
                  ))}
                  <th className="text-center px-3 py-3 font-semibold whitespace-nowrap bg-slate-100">Média</th>
                </tr>
              </thead>
              <tbody>
                {disciplinas.map(disc => {
                  const notasDisc = notas[disc.id] || {}
                  const valoresNotas = periodos.map(p => notasDisc[p.numero]?.nota_final).filter((n): n is number => n !== null && n !== undefined)
                  const media = valoresNotas.length > 0 ? valoresNotas.reduce((a, b) => a + b, 0) / valoresNotas.length : null

                  return (
                    <tr key={disc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {disc.nome}
                        <span className="ml-1 text-xs text-slate-400">({disc.abreviacao || disc.codigo})</span>
                      </td>
                      {periodos.map(p => {
                        const celula = notasDisc[p.numero]
                        return (
                          <td key={p.id} className={`text-center px-3 py-3 ${celula?.nota_final !== null && celula?.nota_final !== undefined ? notaBg(celula.nota_final) : ''}`}>
                            {celula?.nota_final !== null && celula?.nota_final !== undefined ? (
                              <div>
                                <span className={`font-bold ${notaColor(celula.nota_final)}`}>
                                  {celula.nota_final.toFixed(1)}
                                </span>
                                {celula.nota_recuperacao !== null && celula.nota_recuperacao !== undefined && (
                                  <div className="text-[10px] text-blue-500 mt-0.5">Rec: {celula.nota_recuperacao.toFixed(1)}</div>
                                )}
                                {celula.faltas > 0 && (
                                  <div className="text-[10px] text-red-400 mt-0.5">{celula.faltas}F</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className={`text-center px-3 py-3 bg-slate-50 ${notaBg(media)}`}>
                        <span className={`font-bold ${notaColor(media)}`}>
                          {media !== null ? media.toFixed(1) : '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>) : (
          <div className="px-6 py-8 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>{disciplinas.length === 0 ? 'Nenhuma disciplina cadastrada' : 'Nenhum periodo letivo configurado'}</p>
          </div>
        )}
      </div>

      {/* Avaliacoes SISAM */}
      {avaliacoes_sisam.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <h3 className="font-bold text-sm sm:text-base text-slate-800">Avaliacoes Municipais (SISAM)</h3>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs font-semibold rounded-full">
              {serie ? formatSerie(serie) : ''} — {isIniciais ? 'Anos Iniciais' : 'Anos Finais'}
            </span>
          </div>

          {/* MOBILE: Cards por avaliação */}
          <div className="sm:hidden divide-y divide-gray-100">
            {avaliacoes_sisam.map((av, i) => (
              <div key={i} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">{av.avaliacao}</span>
                  <div className="flex items-center gap-2">
                    {presencaBadge(av.presenca)}
                    {nivelBadge(av.nivel)}
                  </div>
                </div>
                <div className={`grid ${isIniciais ? 'grid-cols-4' : 'grid-cols-5'} gap-1.5`}>
                  <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_lp)}`}>
                    <div className="text-[9px] text-slate-400 font-medium">LP</div>
                    <div className={`text-sm font-bold ${notaColor(av.nota_lp)}`}>{av.nota_lp?.toFixed(1) ?? '-'}</div>
                  </div>
                  <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_mat)}`}>
                    <div className="text-[9px] text-slate-400 font-medium">MAT</div>
                    <div className={`text-sm font-bold ${notaColor(av.nota_mat)}`}>{av.nota_mat?.toFixed(1) ?? '-'}</div>
                  </div>
                  {!isIniciais && (
                    <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_ch)}`}>
                      <div className="text-[9px] text-slate-400 font-medium">CH</div>
                      <div className={`text-sm font-bold ${notaColor(av.nota_ch)}`}>{av.nota_ch?.toFixed(1) ?? '-'}</div>
                    </div>
                  )}
                  {!isIniciais && (
                    <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_cn)}`}>
                      <div className="text-[9px] text-slate-400 font-medium">CN</div>
                      <div className={`text-sm font-bold ${notaColor(av.nota_cn)}`}>{av.nota_cn?.toFixed(1) ?? '-'}</div>
                    </div>
                  )}
                  {isIniciais && (
                    <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_producao)}`}>
                      <div className="text-[9px] text-slate-400 font-medium">PROD</div>
                      <div className={`text-sm font-bold ${notaColor(av.nota_producao)}`}>{av.nota_producao?.toFixed(1) ?? '-'}</div>
                    </div>
                  )}
                  <div className={`text-center py-1.5 rounded-lg bg-slate-50 ${notaBg(av.media)}`}>
                    <div className="text-[9px] text-slate-400 font-medium">Media</div>
                    <div className={`text-sm font-bold ${notaColor(av.media)}`}>{av.media?.toFixed(1) ?? '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Tabela tradicional */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Avaliacao</th>
                  <th className="text-center px-3 py-3 font-semibold">Presenca</th>
                  <th className="text-center px-3 py-3 font-semibold">L. Portuguesa</th>
                  <th className="text-center px-3 py-3 font-semibold">Matematica</th>
                  {!isIniciais && <th className="text-center px-3 py-3 font-semibold">C. Humanas</th>}
                  {!isIniciais && <th className="text-center px-3 py-3 font-semibold">C. Natureza</th>}
                  {isIniciais && <th className="text-center px-3 py-3 font-semibold">Prod. Textual</th>}
                  <th className="text-center px-3 py-3 font-semibold bg-slate-100">Media</th>
                  <th className="text-center px-3 py-3 font-semibold">Nivel</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes_sisam.map((av, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{av.avaliacao}</td>
                    <td className="text-center px-3 py-3">{presencaBadge(av.presenca)}</td>
                    <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_lp)}`}>{av.nota_lp?.toFixed(1) ?? '-'}</td>
                    <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_mat)}`}>{av.nota_mat?.toFixed(1) ?? '-'}</td>
                    {!isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_ch)}`}>{av.nota_ch?.toFixed(1) ?? '-'}</td>}
                    {!isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_cn)}`}>{av.nota_cn?.toFixed(1) ?? '-'}</td>}
                    {isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_producao)}`}>{av.nota_producao?.toFixed(1) ?? '-'}</td>}
                    <td className={`text-center px-3 py-3 bg-slate-50 font-bold ${notaColor(av.media)}`}>{av.media?.toFixed(1) ?? '-'}</td>
                    <td className="text-center px-3 py-3">{nivelBadge(av.nivel) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
