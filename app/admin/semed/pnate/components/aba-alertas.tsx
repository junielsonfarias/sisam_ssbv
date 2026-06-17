'use client'

import { Car, CheckCircle, CreditCard } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alerta } from './types'

interface Props {
  alertaVeiculos: Alerta[]
  alertaMotoristas: Alerta[]
  carregando: boolean
}

export function AbaAlertas({ alertaVeiculos, alertaMotoristas, carregando }: Props) {
  if (carregando) return <LoadingSpinner centered />
  const totalAlertas = alertaVeiculos.length + alertaMotoristas.length

  if (totalAlertas === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Tudo regularizado</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs">Nenhuma vistoria ou CNH vencendo nos próximos 60 dias</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          <Car className="w-4 h-4 text-red-600" /> Veículos ({alertaVeiculos.length})
        </h3>
        {alertaVeiculos.length === 0 ? <p className="text-xs text-gray-400">Tudo OK</p> : (
          <div className="space-y-2">
            {alertaVeiculos.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{v.placa}</p>
                  <p className="text-xs text-gray-500">Vistoria: {v.vistoria_validade && new Date(v.vistoria_validade).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                  {v.status_vistoria?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-red-600" /> Motoristas ({alertaMotoristas.length})
        </h3>
        {alertaMotoristas.length === 0 ? <p className="text-xs text-gray-400">Tudo OK</p> : (
          <div className="space-y-2">
            {alertaMotoristas.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{m.nome}</p>
                  <p className="text-xs text-gray-500">CNH: {m.cnh_validade && new Date(m.cnh_validade).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                  {m.alerta?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
