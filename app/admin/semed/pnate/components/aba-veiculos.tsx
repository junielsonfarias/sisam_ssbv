'use client'

import { Car } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Veiculo } from './types'

interface Props {
  veiculos: Veiculo[]
  carregando: boolean
}

export function AbaVeiculos({ veiculos, carregando }: Props) {
  if (carregando) return <LoadingSpinner centered />
  if (veiculos.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum veículo cadastrado</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-slate-700/30">
          <tr>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Placa</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Tipo</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Marca/Modelo</th>
            <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Capacidade</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Vínculo</th>
            <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Vistoria</th>
          </tr>
        </thead>
        <tbody>
          {veiculos.map((v) => {
            const vistoriaVencida = v.vistoria_validade && new Date(v.vistoria_validade) < new Date()
            return (
              <tr key={v.id} className="border-b border-gray-100 dark:border-slate-700/50">
                <td className="py-2 px-4 font-mono font-bold text-gray-800 dark:text-gray-200">{v.placa}</td>
                <td className="py-2 px-4 text-gray-700 dark:text-gray-300 capitalize">{v.tipo.replace('_', '-')}</td>
                <td className="py-2 px-4 text-gray-500">{[v.marca, v.modelo, v.ano_fabricacao].filter(Boolean).join(' ') || '—'}</td>
                <td className="py-2 px-4 text-right text-gray-700 dark:text-gray-300">{v.capacidade}</td>
                <td className="py-2 px-4 text-xs text-gray-500 capitalize">{v.vinculo}</td>
                <td className="py-2 px-4 text-xs">
                  {v.vistoria_validade ? (
                    <span className={vistoriaVencida ? 'text-red-600 font-bold' : 'text-gray-500'}>
                      {new Date(v.vistoria_validade).toLocaleDateString('pt-BR')}
                      {vistoriaVencida && ' ⚠'}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
