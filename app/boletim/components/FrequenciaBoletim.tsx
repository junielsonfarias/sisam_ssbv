'use client'

import { CalendarCheck, BarChart3, Clock } from 'lucide-react'

interface Frequencia { bimestre: number; periodo_nome: string; aulas_dadas: number; faltas: number; percentual: number | null }

interface FrequenciaBoletimProps {
  frequencia: Frequencia[]
  frequencia_geral: number | null
  total_faltas: number
  frequencia_diaria: { total_dias: number; dias_presente: number; primeira_data: string; ultima_data: string }
}

function freqColor(p: number | null) {
  if (p === null) return 'text-gray-400'
  if (p >= 75) return 'text-blue-800'
  if (p >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function freqBarColor(p: number | null) {
  if (p === null) return 'bg-gray-300'
  if (p >= 75) return 'bg-blue-600'
  if (p >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function FrequenciaBoletim({
  frequencia,
  frequencia_geral,
  total_faltas,
  frequencia_diaria,
}: FrequenciaBoletimProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Frequencia geral */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center justify-center">
        <CalendarCheck className="w-8 h-8 text-blue-600 mb-3" />
        <p className={`text-5xl font-extrabold ${freqColor(frequencia_geral)}`}>
          {frequencia_geral !== null ? `${frequencia_geral}%` : '-'}
        </p>
        <p className="text-sm text-slate-500 mt-2">Frequencia Geral</p>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="text-red-500 font-semibold">{total_faltas} faltas</span>
          {frequencia_diaria.total_dias > 0 && (
            <span className="text-slate-400">{frequencia_diaria.dias_presente}/{frequencia_diaria.total_dias} dias</span>
          )}
        </div>
      </div>

      {/* Frequencia por bimestre */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-800" /> Frequencia por Periodo
        </h3>
        {frequencia.length > 0 ? (
          <div className="space-y-4">
            {frequencia.map(f => (
              <div key={f.bimestre}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{f.periodo_nome}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{f.aulas_dadas} aulas</span>
                    <span className="text-red-500 font-medium">{f.faltas} faltas</span>
                    <span className={`font-bold text-sm ${freqColor(f.percentual)}`}>
                      {f.percentual !== null ? `${f.percentual}%` : '-'}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${freqBarColor(f.percentual)}`}
                    style={{ width: `${Math.min(f.percentual || 0, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma frequencia registrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
