'use client'

import { MapPin } from 'lucide-react'
import {
  EscolaDetalhe,
  inputClassName,
  labelClassName,
} from './types'

export function AbaInfraestrutura({
  formData,
  updateField,
}: {
  formData: Partial<EscolaDetalhe>
  updateField: (field: string, value: any) => void
}) {
  const toggles = [
    { field: 'agua_potavel', label: 'Agua Potavel', icon: '\u{1F4A7}' },
    { field: 'energia_eletrica', label: 'Energia Eletrica', icon: '\u26A1' },
    { field: 'esgoto_sanitario', label: 'Esgoto Sanitario', icon: '\u{1F6B0}' },
    { field: 'coleta_lixo', label: 'Coleta de Lixo', icon: '\u{1F5D1}' },
    { field: 'internet', label: 'Internet', icon: '\u{1F310}' },
    { field: 'banda_larga', label: 'Banda Larga', icon: '\u{1F4E1}' },
    { field: 'quadra_esportiva', label: 'Quadra Esportiva', icon: '\u{1F3DF}' },
    { field: 'biblioteca', label: 'Biblioteca', icon: '\u{1F4DA}' },
    { field: 'laboratorio_informatica', label: 'Laboratorio de Informatica', icon: '\u{1F4BB}' },
    { field: 'laboratorio_ciencias', label: 'Laboratorio de Ciencias', icon: '\u{1F52C}' },
    { field: 'acessibilidade_deficiente', label: 'Acessibilidade PCD', icon: '\u267F' },
    { field: 'alimentacao_escolar', label: 'Alimentacao Escolar', icon: '\u{1F37D}' },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <MapPin className="w-5 h-5 text-emerald-600" />
        Infraestrutura
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {toggles.map(toggle => {
          const isAtivo = !!(formData as any)[toggle.field]
          return (
            <div
              key={toggle.field}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                ${isAtivo
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600 shadow-sm'
                  : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-gray-300'
                }`}
              onClick={() => updateField(toggle.field, !isAtivo)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{toggle.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{toggle.label}</span>
              </div>
              <div
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  isAtivo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-500'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                    isAtivo ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Coordenadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div>
          <label className={labelClassName}>Latitude</label>
          <input
            type="number"
            step="any"
            value={formData.latitude ?? ''}
            onChange={(e) => updateField('latitude', e.target.value ? parseFloat(e.target.value) : null)}
            className={inputClassName}
            placeholder="-1.7022"
          />
        </div>
        <div>
          <label className={labelClassName}>Longitude</label>
          <input
            type="number"
            step="any"
            value={formData.longitude ?? ''}
            onChange={(e) => updateField('longitude', e.target.value ? parseFloat(e.target.value) : null)}
            className={inputClassName}
            placeholder="-49.7347"
          />
        </div>
      </div>
    </div>
  )
}
