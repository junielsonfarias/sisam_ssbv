'use client'

import { CreditCard } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Motorista } from './types'

interface Props {
  motoristas: Motorista[]
  carregando: boolean
}

export function AbaMotoristas({ motoristas, carregando }: Props) {
  if (carregando) return <LoadingSpinner centered />
  if (motoristas.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum motorista cadastrado</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-slate-700/30">
          <tr>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Nome</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">CNH</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Cat.</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Validade CNH</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Curso esc.</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Telefone</th>
          </tr>
        </thead>
        <tbody>
          {motoristas.map((m) => {
            const cnhVencida = new Date(m.cnh_validade) < new Date()
            const cursoVencido = m.curso_escolar_validade && new Date(m.curso_escolar_validade) < new Date()
            return (
              <tr key={m.id} className="border-b border-gray-100 dark:border-slate-700/50">
                <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{m.nome}</td>
                <td className="py-2 px-4 font-mono text-xs text-gray-500">{m.cnh_numero}</td>
                <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.cnh_categoria}</td>
                <td className={`py-2 px-4 text-xs ${cnhVencida ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                  {new Date(m.cnh_validade).toLocaleDateString('pt-BR')}{cnhVencida && ' ⚠'}
                </td>
                <td className={`py-2 px-4 text-xs ${cursoVencido ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                  {m.curso_escolar_validade ? new Date(m.curso_escolar_validade).toLocaleDateString('pt-BR') : '—'}
                  {cursoVencido && ' ⚠'}
                </td>
                <td className="py-2 px-4 text-xs text-gray-500">{m.telefone || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
