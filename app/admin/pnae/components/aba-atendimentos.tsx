'use client'

import { Calendar, ClipboardList, FileText, Users } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Escola, FAIXA_LABEL, INPUT_CLS, ResumoLinha, TIPO_REFEICAO_LABEL,
} from './types'

interface Props {
  escolas: Escola[]
  resumoAno: number
  resumoMes: number
  resumoEscola: string
  resumo: ResumoLinha[]
  carregando: boolean
  onChangeAno: (ano: number) => void
  onChangeMes: (mes: number) => void
  onChangeEscola: (id: string) => void
}

export function AbaAtendimentos({
  escolas, resumoAno, resumoMes, resumoEscola, resumo, carregando,
  onChangeAno, onChangeMes, onChangeEscola,
}: Props) {
  const totalServidoMes = resumo.reduce((s, r) => s + parseInt(r.total_alunos || '0', 10), 0)
  const diasUnicos = resumo.length > 0 ? Math.max(...resumo.map((r) => parseInt(r.dias_servidos || '0', 10))) : 0

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{totalServidoMes.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-green-600">Alunos servidos no mês</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
          <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{diasUnicos}</p>
          <p className="text-xs text-blue-600">Dias com atendimento</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
          <FileText className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{resumo.length}</p>
          <p className="text-xs text-purple-600">Combinações (faixa+refeição)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ano</label>
            <select value={resumoAno} onChange={(e) => onChangeAno(parseInt(e.target.value, 10))} className={INPUT_CLS}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Mês</label>
            <select value={resumoMes} onChange={(e) => onChangeMes(parseInt(e.target.value, 10))} className={INPUT_CLS}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (opcional)</label>
            <select value={resumoEscola} onChange={(e) => onChangeEscola(e.target.value)} className={`${INPUT_CLS} w-full`}>
              <option value="">Todas as escolas</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : resumo.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum atendimento registrado neste mês</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/30">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Faixa etária</th>
                <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Refeição</th>
                <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Alunos PNAE</th>
                <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Extras</th>
                <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Dias</th>
              </tr>
            </thead>
            <tbody>
              {resumo.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50">
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{FAIXA_LABEL[r.faixa_etaria]}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{TIPO_REFEICAO_LABEL[r.tipo_refeicao]}</td>
                  <td className="py-2 px-4 text-right font-mono text-gray-700 dark:text-gray-300">
                    {parseInt(r.total_alunos, 10).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-gray-500">
                    {parseInt(r.total_extra || '0', 10).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-gray-500">{r.dias_servidos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
