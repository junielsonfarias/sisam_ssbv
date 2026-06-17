'use client'

import { useEffect, useState } from 'react'
import { BookOpen, CalendarCheck, FileText, TrendingUp } from 'lucide-react'
import { useSeries } from '@/lib/use-series'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Secao } from './shared'
import dynamic from 'next/dynamic'

// Lazy load Recharts
const EvolucaoLineChart = dynamic(() => import('recharts').then(mod => {
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } = mod
  return function ChartWrapper({ data, linhas }: { data: any[]; linhas: { key: string; cor: string; nome: string; dash?: string }[] }) {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => value !== null ? value.toFixed(2) : '-'} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Média 5', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
          {linhas.map(l => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.nome} stroke={l.cor}
              strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}
              strokeDasharray={l.dash} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

const EvolucaoBarChart = dynamic(() => import('recharts').then(mod => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } = mod
  return function ChartWrapper({ data, barras }: { data: any[]; barras: { key: string; cor: string; nome: string }[] }) {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => value !== null ? value.toFixed(2) : '-'} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          {barras.map(b => (
            <Bar key={b.key} dataKey={b.key} name={b.nome} fill={b.cor} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

const EvolucaoRadarChart = dynamic(() => import('recharts').then(mod => {
  const { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } = mod
  return function ChartWrapper({ data, radares }: { data: any[]; radares: { key: string; cor: string; nome: string }[] }) {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid strokeOpacity={0.3} />
          <PolarAngleAxis dataKey="disciplina" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
          <Tooltip formatter={(value: number) => value !== null ? value.toFixed(2) : '-'} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          {radares.map(r => (
            <Radar key={r.key} dataKey={r.key} name={r.nome} stroke={r.cor} fill={r.cor} fillOpacity={0.15} strokeWidth={2} />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

export function AbaEvolucao({ alunoId }: { alunoId: string }) {
  const { formatSerie } = useSeries()
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        const res = await fetch(`/api/admin/alunos/${alunoId}/evolucao`)
        if (res.ok) setDados(await res.json())
      } catch (err) {
        console.error('[AbaEvolucao] Erro ao carregar evolução:', (err as Error).message)
      }
      finally { setCarregando(false) }
    }
    carregar()
  }, [alunoId])

  if (carregando) return <LoadingSpinner text="Carregando evolução..." centered />

  if (!dados || dados.anos?.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhum dado de evolução encontrado</p>
    </div>
  )

  const { anos, sisam, escola, frequencia, comparativo } = dados

  const getNivelCor = (nivel: string | null) => {
    if (!nivel) return ''
    const n = nivel.toUpperCase()
    if (n === 'N1') return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
    if (n === 'N2') return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
    if (n === 'N3') return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
    if (n === 'N4') return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
    return 'text-gray-600 bg-gray-100'
  }

  const getNotaCor = (nota: number | null) => {
    if (nota === null) return 'text-gray-400'
    if (nota >= 7) return 'text-emerald-600 dark:text-emerald-400'
    if (nota >= 5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getTendencia = (valores: (number | null)[]) => {
    const nums = valores.filter((v): v is number => v !== null)
    if (nums.length < 2) return null
    const diff = nums[nums.length - 1] - nums[nums.length - 2]
    if (diff > 0.5) return { icon: '\u2191', cor: 'text-emerald-600', label: `+${diff.toFixed(1)}` }
    if (diff < -0.5) return { icon: '\u2193', cor: 'text-red-600', label: diff.toFixed(1) }
    return { icon: '\u2192', cor: 'text-gray-500', label: '0.0' }
  }

  // Tendências LP e MAT
  const tendLP = getTendencia(comparativo.lp.map((c: any) => c.sisam))
  const tendMAT = getTendencia(comparativo.mat.map((c: any) => c.sisam))

  return (
    <div className="space-y-6">
      {/* ===== COMPARATIVO Educatec x ESCOLA ===== */}
      <Secao titulo="Comparativo SISAM x Avaliação Escolar" icon={TrendingUp}>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-slate-600">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase" rowSpan={2}>Ano</th>
                <th className="text-center py-1 px-3 text-xs font-semibold text-indigo-600 uppercase border-b border-indigo-200" colSpan={2}>Língua Portuguesa</th>
                <th className="text-center py-1 px-3 text-xs font-semibold text-emerald-600 uppercase border-b border-emerald-200" colSpan={2}>Matemática</th>
              </tr>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-center py-1 px-2 text-[10px] font-medium text-indigo-500">SISAM</th>
                <th className="text-center py-1 px-2 text-[10px] font-medium text-indigo-500">Escola</th>
                <th className="text-center py-1 px-2 text-[10px] font-medium text-emerald-500">SISAM</th>
                <th className="text-center py-1 px-2 text-[10px] font-medium text-emerald-500">Escola</th>
              </tr>
            </thead>
            <tbody>
              {anos.map((ano: string, i: number) => {
                const lp = comparativo.lp[i]
                const mat = comparativo.mat[i]
                return (
                  <tr key={ano} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">{ano}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(lp?.sisam)}`}>{lp?.sisam?.toFixed(1) ?? '-'}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(lp?.escola)}`}>{lp?.escola?.toFixed(1) ?? '-'}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(mat?.sisam)}`}>{mat?.sisam?.toFixed(1) ?? '-'}</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${getNotaCor(mat?.escola)}`}>{mat?.escola?.toFixed(1) ?? '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Tendências */}
        {(tendLP || tendMAT) && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs">
            {tendLP && (
              <span className={tendLP.cor}>
                LP SISAM: {tendLP.icon} {tendLP.label} pts
              </span>
            )}
            {tendMAT && (
              <span className={tendMAT.cor}>
                MAT SISAM: {tendMAT.icon} {tendMAT.label} pts
              </span>
            )}
          </div>
        )}
      </Secao>

      {/* ===== GRÁFICOS DE EVOLUÇÃO ===== */}
      {anos.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Linha: Educatec x Escola LP */}
          <Secao titulo="Evolução LP — SISAM x Escola" icon={TrendingUp} cor="indigo">
            <EvolucaoLineChart
              data={comparativo.lp.map((c: any) => ({ ano: c.ano, 'SISAM LP': c.sisam, 'Escola LP': c.escola }))}
              linhas={[
                { key: 'SISAM LP', cor: '#6366f1', nome: 'SISAM' },
                { key: 'Escola LP', cor: '#8b5cf6', nome: 'Escola', dash: '5 5' },
              ]}
            />
          </Secao>

          {/* Gráfico Linha: Educatec x Escola MAT */}
          <Secao titulo="Evolução MAT — SISAM x Escola" icon={TrendingUp} cor="emerald">
            <EvolucaoLineChart
              data={comparativo.mat.map((c: any) => ({ ano: c.ano, 'SISAM MAT': c.sisam, 'Escola MAT': c.escola }))}
              linhas={[
                { key: 'SISAM MAT', cor: '#10b981', nome: 'SISAM' },
                { key: 'Escola MAT', cor: '#14b8a6', nome: 'Escola', dash: '5 5' },
              ]}
            />
          </Secao>

          {/* Gráfico Barras: Média Educatec por ano */}
          <Secao titulo="Média SISAM por Avaliação" icon={FileText} cor="purple">
            {(() => {
              const dadosBarras = anos.flatMap((ano: string) =>
                (sisam[ano] || []).map((r: any) => ({
                  ano: `${ano}${r.tipo !== 'unica' ? ` (${r.tipo === 'diagnostica' ? 'Diag' : 'Final'})` : ''}`,
                  LP: r.nota_lp,
                  MAT: r.nota_mat,
                  ...(r.avalia_ch ? { CH: r.nota_ch } : {}),
                  ...(r.avalia_cn ? { CN: r.nota_cn } : {}),
                }))
              )
              const barras = [
                { key: 'LP', cor: '#6366f1', nome: 'LP' },
                { key: 'MAT', cor: '#10b981', nome: 'MAT' },
              ]
              // Adicionar CH/CN se existem em algum ano
              if (dadosBarras.some((d: any) => d.CH !== undefined)) barras.push({ key: 'CH', cor: '#f59e0b', nome: 'CH' })
              if (dadosBarras.some((d: any) => d.CN !== undefined)) barras.push({ key: 'CN', cor: '#ef4444', nome: 'CN' })
              return <EvolucaoBarChart data={dadosBarras} barras={barras} />
            })()}
          </Secao>

          {/* Gráfico Radar: Último ano — comparativo Educatec x Escola */}
          <Secao titulo="Radar — Último Ano" icon={BookOpen} cor="blue">
            {(() => {
              const ultimoAno = anos[anos.length - 1]
              const sisamUltimo = (sisam[ultimoAno] || []).slice(-1)[0]
              const escolaUltimo = escola[ultimoAno] || []

              const radarData: any[] = []

              if (sisamUltimo?.avalia_lp || escolaUltimo.find((e: any) => e.codigo === 'LP')) {
                const escolaLP = escolaUltimo.find((e: any) => e.codigo === 'LP' || e.abreviacao === 'LP' || e.disciplina?.toLowerCase().includes('portuguesa'))
                radarData.push({ disciplina: 'LP', SISAM: sisamUltimo?.nota_lp ?? 0, Escola: escolaLP?.media_final ?? 0 })
              }
              if (sisamUltimo?.avalia_mat || escolaUltimo.find((e: any) => e.codigo === 'MAT')) {
                const escolaMAT = escolaUltimo.find((e: any) => e.codigo === 'MAT' || e.abreviacao === 'MAT' || e.disciplina?.toLowerCase().includes('matem'))
                radarData.push({ disciplina: 'MAT', SISAM: sisamUltimo?.nota_mat ?? 0, Escola: escolaMAT?.media_final ?? 0 })
              }
              if (sisamUltimo?.avalia_ch) {
                const escolaCH = escolaUltimo.find((e: any) => e.disciplina?.toLowerCase().includes('human') || e.codigo === 'HIS')
                radarData.push({ disciplina: 'CH', SISAM: sisamUltimo?.nota_ch ?? 0, Escola: escolaCH?.media_final ?? 0 })
              }
              if (sisamUltimo?.avalia_cn) {
                const escolaCN = escolaUltimo.find((e: any) => e.disciplina?.toLowerCase().includes('natureza') || e.codigo === 'CIE')
                radarData.push({ disciplina: 'CN', SISAM: sisamUltimo?.nota_cn ?? 0, Escola: escolaCN?.media_final ?? 0 })
              }

              if (radarData.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Sem dados para comparação</p>

              return (
                <>
                  <EvolucaoRadarChart
                    data={radarData}
                    radares={[
                      { key: 'SISAM', cor: '#6366f1', nome: 'SISAM' },
                      { key: 'Escola', cor: '#10b981', nome: 'Escola' },
                    ]}
                  />
                  <p className="text-[10px] text-gray-400 text-center mt-1">Ano: {ultimoAno}</p>
                </>
              )
            })()}
          </Secao>
        </div>
      )}

      {/* ===== EVOLUÇÃO Educatec ANO A ANO ===== */}
      <Secao titulo="Resultados SISAM por Avaliação" icon={FileText} cor="purple">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {['Ano', 'Avaliação', 'Série', 'LP', 'MAT', 'CH', 'CN', 'Prod', 'Média', 'Nível', 'Presença'].map(h => (
                  <th key={h} className={`py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase ${h === 'Ano' || h === 'Avaliação' || h === 'Série' ? 'text-left' : 'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anos.flatMap((ano: string) =>
                (sisam[ano] || []).map((r: any, idx: number) => (
                  <tr key={`${ano}-${idx}`} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 px-2 font-semibold text-gray-800 dark:text-gray-200">{ano}</td>
                    <td className="py-2 px-2 text-gray-600 dark:text-gray-400 text-xs max-w-[120px] truncate" title={r.avaliacao}>{r.avaliacao}</td>
                    <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{formatSerie(r.serie)}</td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_lp)}`}>
                      {r.avalia_lp ? (r.nota_lp?.toFixed(1) ?? '-') : <span className="text-gray-300">{'\u2014'}</span>}
                      {r.nivel_lp && <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${getNivelCor(r.nivel_lp)}`}>{r.nivel_lp}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_mat)}`}>
                      {r.avalia_mat ? (r.nota_mat?.toFixed(1) ?? '-') : <span className="text-gray-300">{'\u2014'}</span>}
                      {r.nivel_mat && <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${getNivelCor(r.nivel_mat)}`}>{r.nivel_mat}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_ch)}`}>
                      {r.avalia_ch ? (r.nota_ch?.toFixed(1) ?? '-') : <span className="text-gray-300">{'\u2014'}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.nota_cn)}`}>
                      {r.avalia_cn ? (r.nota_cn?.toFixed(1) ?? '-') : <span className="text-gray-300">{'\u2014'}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center ${getNotaCor(r.nota_producao)}`}>
                      {r.tem_producao_textual ? (r.nota_producao?.toFixed(1) ?? '-') : <span className="text-gray-300">{'\u2014'}</span>}
                      {r.nivel_prod && <span className={`ml-1 text-[9px] px-1 py-0.5 rounded ${getNivelCor(r.nivel_prod)}`}>{r.nivel_prod}</span>}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold ${getNotaCor(r.media)}`}>{r.media?.toFixed(1) ?? '-'}</td>
                    <td className="py-2 px-2 text-center">
                      {r.nivel_aluno ? <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${getNivelCor(r.nivel_aluno)}`}>{r.nivel_aluno}</span> : '-'}
                    </td>
                    <td className={`py-2 px-2 text-center text-xs font-medium ${r.presenca === 'P' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.presenca === 'P' ? 'P' : r.presenca === 'F' ? 'F' : '-'}
                    </td>
                  </tr>
                ))
              )}
              {anos.every((ano: string) => !sisam[ano] || sisam[ano].length === 0) && (
                <tr><td colSpan={11} className="py-6 text-center text-gray-400">Sem resultados SISAM</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* ===== NOTAS ESCOLARES ANO A ANO ===== */}
      <Secao titulo="Médias Escolares por Ano" icon={BookOpen} cor="emerald">
        <div className="overflow-x-auto -mx-5 px-5">
          {(() => {
            // Coletar todas as disciplinas únicas
            const todasDisc = new Set<string>()
            for (const ano of anos) {
              for (const d of (escola[ano] || [])) {
                todasDisc.add(d.abreviacao || d.codigo || d.disciplina)
              }
            }
            const discs = [...todasDisc]

            if (discs.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Sem notas escolares registradas</p>

            return (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="py-2 px-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Ano</th>
                    {discs.map(d => (
                      <th key={d} className="py-2 px-2 text-center text-[10px] font-semibold text-gray-500 uppercase">{d}</th>
                    ))}
                    <th className="py-2 px-2 text-center text-[10px] font-semibold text-gray-500 uppercase">Freq.</th>
                  </tr>
                </thead>
                <tbody>
                  {anos.map((ano: string) => {
                    const escolaAno = escola[ano] || []
                    const freq = frequencia[ano]
                    return (
                      <tr key={ano} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-2 font-semibold text-gray-800 dark:text-gray-200">{ano}</td>
                        {discs.map(d => {
                          const disc = escolaAno.find((e: any) => (e.abreviacao || e.codigo || e.disciplina) === d)
                          return (
                            <td key={d} className={`py-2.5 px-2 text-center font-bold ${getNotaCor(disc?.media_final ?? null)}`}>
                              {disc?.media_final?.toFixed(1) ?? '-'}
                            </td>
                          )
                        })}
                        <td className={`py-2.5 px-2 text-center font-medium ${freq?.media_frequencia >= 75 ? 'text-emerald-600' : freq?.media_frequencia ? 'text-red-600' : 'text-gray-400'}`}>
                          {freq?.media_frequencia ? `${freq.media_frequencia}%` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          })()}
        </div>
      </Secao>

      {/* ===== FREQUÊNCIA ANO A ANO ===== */}
      {Object.keys(frequencia).length > 0 && (
        <Secao titulo="Frequência por Ano" icon={CalendarCheck} cor="blue">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {anos.map((ano: string) => {
              const freq = frequencia[ano]
              if (!freq) return null
              const pct = freq.media_frequencia || 0
              return (
                <div key={ano} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-center">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">{ano}</p>
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-slate-600" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" strokeWidth="3" strokeDasharray={`${pct}, 100`}
                        className={pct >= 90 ? 'stroke-emerald-500' : pct >= 75 ? 'stroke-yellow-500' : 'stroke-red-500'}
                        strokeLinecap="round" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${pct >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="text-emerald-600">{freq.total_presencas}P</span> / <span className="text-red-500">{freq.total_faltas}F</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Secao>
      )}
    </div>
  )
}
