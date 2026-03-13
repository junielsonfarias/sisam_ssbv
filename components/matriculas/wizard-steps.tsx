'use client'

import { Check } from 'lucide-react'

interface WizardStepsProps {
  etapaAtual: number
  etapas: string[]
}

export default function WizardSteps({ etapaAtual, etapas }: WizardStepsProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {etapas.map((etapa, index) => {
          const numero = index + 1
          const concluida = etapaAtual > numero
          const ativa = etapaAtual === numero

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    concluida
                      ? 'bg-green-500 text-white'
                      : ativa
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {concluida ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : numero}
                </div>
                <span
                  className={`mt-1.5 text-[10px] sm:text-xs text-center max-w-[60px] sm:max-w-[80px] leading-tight ${
                    ativa
                      ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                      : concluida
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {etapa}
                </span>
              </div>
              {index < etapas.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-all ${
                    concluida ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
