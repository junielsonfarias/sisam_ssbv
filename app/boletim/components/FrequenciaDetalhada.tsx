'use client'

import { CalendarCheck, BarChart3 } from 'lucide-react'

interface FrequenciaBimestral {
  bimestre: number
  periodo_nome?: string
  dias_letivos: number
  presencas: number
  faltas: number
  percentual: number | null
}

interface FrequenciaDiaria {
  data: string
  presente: boolean
  justificativa?: string
}

interface FrequenciaDetalhadaData {
  totais: {
    dias_letivos: number
    presencas: number
    faltas: number
    percentual: number | null
  }
  frequencia_bimestral: FrequenciaBimestral[]
  frequencia_diaria: FrequenciaDiaria[]
}

interface FrequenciaDetalhadaProps {
  dados: FrequenciaDetalhadaData | null
  carregando: boolean
}

export default function FrequenciaDetalhada({ dados, carregando }: FrequenciaDetalhadaProps) {
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Dados de frequência não disponíveis</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cards totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Dias Letivos', value: dados.totais.dias_letivos, color: 'text-slate-700 dark:text-slate-200' },
          { label: 'Presenças', value: dados.totais.presencas, color: 'text-blue-800 dark:text-blue-400' },
          { label: 'Faltas', value: dados.totais.faltas, color: 'text-red-600 dark:text-red-400' },
          {
            label: 'Frequência',
            value: dados.totais.percentual !== null ? `${dados.totais.percentual}%` : '-',
            color: (dados.totais.percentual ?? 0) >= 75
              ? 'text-blue-800 dark:text-blue-400'
              : 'text-red-600 dark:text-red-400',
          },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Frequência por bimestre com barras de progresso */}
      {dados.frequencia_bimestral.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-800 dark:text-blue-400" /> Frequência por Bimestre
          </h3>
          <div className="space-y-4">
            {dados.frequencia_bimestral.map((f: FrequenciaBimestral) => (
              <div key={f.bimestre}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {f.periodo_nome || `${f.bimestre}o Bimestre`}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{f.dias_letivos} dias</span>
                    <span className="text-blue-800 dark:text-blue-400 font-medium">{f.presencas}P</span>
                    <span className="text-red-500 dark:text-red-400 font-medium">{f.faltas}F</span>
                    <span className={`font-bold text-sm ${
                      (f.percentual ?? 0) >= 75 ? 'text-blue-800 dark:text-blue-400' :
                      (f.percentual ?? 0) >= 50 ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {f.percentual !== null ? `${f.percentual}%` : '-'}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (f.percentual ?? 0) >= 75 ? 'bg-blue-600' :
                      (f.percentual ?? 0) >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(f.percentual || 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline de registros diários */}
      {dados.frequencia_diaria?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <CalendarCheck className="w-5 h-5 text-blue-800 dark:text-blue-400" /> Últimos Registros
          </h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {dados.frequencia_diaria.map((d: FrequenciaDiaria, i: number) => (
              <div
                key={i}
                className={`p-2 rounded-lg text-center text-xs ${
                  d.presente
                    ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}
                title={d.justificativa || undefined}
              >
                <p className="font-bold">{d.presente ? 'P' : 'F'}</p>
                <p className="text-[10px] opacity-70">
                  {new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
