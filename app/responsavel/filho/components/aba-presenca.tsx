'use client'

import { ScanFace, LogIn, LogOut } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from './shared'

interface AbaPresencaProps {
  carregandoPresenca: boolean
  presencaResumo: Array<{ data: string; hora_entrada: string | null; hora_saida: string | null; metodo: string }>
  presencaEventos: Record<string, Array<{ tipo: 'entrada' | 'saida'; registrado_em: string; origem: string }>>
}

export function AbaPresenca({ carregandoPresenca, presencaResumo, presencaEventos }: AbaPresencaProps) {
  return (
    <>
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 p-3.5 flex items-start gap-2.5">
        <ScanFace className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          Registros pelo terminal de reconhecimento facial — <strong>últimos 30 dias</strong>.
          Scans muito próximos (&lt; 30 min) são filtrados como duplicados.
        </p>
      </div>

      {carregandoPresenca ? (
        <div className="py-10"><LoadingSpinner centered /></div>
      ) : presencaResumo.length === 0 ? (
        <EmptyState Icon={ScanFace} texto="Nenhum registro de entrada/saída nos últimos 30 dias." />
      ) : (
        presencaResumo.map((dia) => {
          const eventos = presencaEventos[dia.data] || []
          const dataFmt = new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
          return (
            <div key={dia.data} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-slate-700/60">
                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{dataFmt}</p>
                <div className="flex gap-2">
                  {dia.hora_entrada && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <LogIn className="w-3 h-3" aria-hidden="true" /> {String(dia.hora_entrada).slice(0, 5)}
                    </span>
                  )}
                  {dia.hora_saida && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      <LogOut className="w-3 h-3" aria-hidden="true" /> {String(dia.hora_saida).slice(0, 5)}
                    </span>
                  )}
                </div>
              </div>
              {eventos.length > 0 && (
                <div className="divide-y divide-gray-50 dark:divide-slate-700/60">
                  {eventos.map(e => {
                    const hh = new Date(e.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                    const entrada = e.tipo === 'entrada'
                    return (
                      <div key={e.registrado_em + e.tipo} className="px-4 py-2.5 flex items-center justify-between text-xs">
                        <span className={`flex items-center gap-2 font-medium ${entrada ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${entrada ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                            {entrada ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                          </span>
                          {entrada ? 'Entrada' : 'Saída'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-300 font-mono">{hh}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
