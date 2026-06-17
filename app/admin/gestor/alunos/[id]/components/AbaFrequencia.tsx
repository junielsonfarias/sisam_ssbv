import { CalendarCheck } from 'lucide-react'
import { Secao } from './shared'

import type { DadosAluno } from './types'

export function AbaFrequencia({ dados }: { dados: DadosAluno }) {
  // Frequência pode vir como array flat ou já agrupado por ano
  const freqData = dados.frequencia || {}
  const freqPorAno: Record<string, any[]> = Array.isArray(freqData)
    ? freqData.reduce((acc: Record<string, any[]>, f: any) => {
        const ano = f.ano_letivo || 'Sem ano'
        if (!acc[ano]) acc[ano] = []
        acc[ano].push(f)
        return acc
      }, {})
    : freqData
  const anos = Object.keys(freqPorAno).sort().reverse()

  if (anos.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhuma frequência registrada</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {anos.map(ano => (
        <Secao key={ano} titulo={`Frequência — ${ano}`} icon={CalendarCheck} cor="blue">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {['Período', 'Dias Letivos', 'Presenças', 'Faltas', 'Frequência'].map(h => (
                    <th key={h} className={`py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ${h === 'Período' ? 'text-left' : 'text-center'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {(freqPorAno[ano] || []).map((f: any, i: number) => {
                  const pct = f.percentual_frequencia ?? f.percentual ?? null
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 px-3 font-medium">{f.periodo_nome || f.periodo || `${f.numero || ''}º Bimestre`}</td>
                      <td className="py-2.5 px-3 text-center">{f.dias_letivos || '-'}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">{f.presencas || '-'}</td>
                      <td className="py-2.5 px-3 text-center text-red-600 font-medium">{f.faltas || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${pct !== null && pct < 75 ? 'text-red-600' : pct !== null && pct < 90 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          {pct !== null ? `${parseFloat(pct).toFixed(1)}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Secao>
      ))}
    </div>
  )
}
