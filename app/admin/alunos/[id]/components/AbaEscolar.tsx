import {
  GraduationCap, MapPin, CalendarCheck, Clock, Shield, History, Users
} from 'lucide-react'
import { useSeries } from '@/lib/use-series'
import { Campo, Secao } from './shared'
import { SITUACAO_CORES, PARECER_CORES } from './types'

export function AbaEscolar({ aluno, dados }: any) {
  const { formatSerie } = useSeries()
  return (
    <div className="space-y-6">
      <Secao titulo="Dados Escolares Atuais" icon={GraduationCap} cor="emerald">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Campo label="Escola" valor={aluno.escola_nome} icon={GraduationCap} editando={false} />
          <Campo label="Polo" valor={aluno.polo_nome} icon={MapPin} editando={false} />
          <Campo label="Turma" valor={`${aluno.turma_codigo || '-'} ${aluno.turma_nome ? `(${aluno.turma_nome})` : ''}`} editando={false} />
          <Campo label="Série" valor={formatSerie(aluno.serie)} editando={false} />
          <Campo label="Ano Letivo" valor={aluno.ano_letivo} icon={CalendarCheck} editando={false} />
          <Campo label="Data Matrícula" valor={aluno.data_matricula?.split('T')[0]} icon={Clock} editando={false} />
          <Campo label="Situação" valor={SITUACAO_CORES[aluno.situacao || 'cursando']?.label} editando={false} />
          <Campo label="Código" valor={aluno.codigo} icon={Shield} editando={false} />
        </div>
      </Secao>

      {dados.historico_turmas?.length > 0 && (
        <Secao titulo="Histórico de Matrículas" icon={History} cor="blue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {['Ano', 'Série', 'Turma', 'Escola', 'Matrícula', 'Situação'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {dados.historico_turmas.map((h: any, i: number) => {
                  const s = SITUACAO_CORES[h.situacao || 'cursando'] || SITUACAO_CORES.cursando
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 px-3 font-medium">{h.ano_letivo}</td>
                      <td className="py-2.5 px-3">{formatSerie(h.serie) || '-'}</td>
                      <td className="py-2.5 px-3">{h.turma_codigo || '-'}</td>
                      <td className="py-2.5 px-3">{h.escola_nome}</td>
                      <td className="py-2.5 px-3 text-gray-500">{h.data_matricula?.split('T')[0] || '-'}</td>
                      <td className="py-2.5 px-3"><span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-full text-xs font-medium`}>{s.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Secao>
      )}

      {dados.conselho?.length > 0 && (
        <Secao titulo="Pareceres do Conselho" icon={Users} cor="purple">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dados.conselho.map((c: any, i: number) => {
              const p = PARECER_CORES[c.parecer] || PARECER_CORES.sem_parecer
              return (
                <div key={i} className={`${p.bg} dark:bg-opacity-20 ${p.text} px-4 py-3 rounded-lg`}>
                  <div className="font-semibold text-sm">{c.periodo_nome} ({c.ano_letivo})</div>
                  <div className="text-xs mt-0.5">{p.label}</div>
                  {c.observacao && <div className="text-xs opacity-75 mt-1 italic">{c.observacao}</div>}
                </div>
              )
            })}
          </div>
        </Secao>
      )}
    </div>
  )
}
