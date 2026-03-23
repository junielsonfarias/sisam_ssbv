'use client'

import { TrendingUp } from 'lucide-react'
import { EstatisticasPainel } from '@/lib/dados/types'
import { getNotaColor } from '@/lib/dados/utils'

// Aliases para compatibilidade
type Estatisticas = EstatisticasPainel

export interface AbaAnalisesProps {
  estatisticas: Estatisticas
  carregando: boolean
  serieSelecionada?: string
  mediaGeralCalculada: number
}

export default function AbaAnalises({ estatisticas, carregando, serieSelecionada, mediaGeralCalculada }: AbaAnalisesProps) {
  // Base para calculo de percentuais: alunos avaliados (com P ou F)
  const basePercentual = estatisticas.totalAlunosAvaliados > 0 ? estatisticas.totalAlunosAvaliados : estatisticas.totalAlunos

  return (
    <div className={`space-y-6 ${carregando ? 'opacity-50' : ''}`}>
      {/* Aviso quando série selecionada - dados estão filtrados */}
      {serieSelecionada && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-3">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            <strong>Filtro ativo:</strong> Exibindo análises do <strong>{serieSelecionada}</strong>.
            Clique em "Todas" para ver dados de todas as séries.
          </p>
        </div>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Resumo de Analises
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Taxa de Presenca */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taxa de Presenca (avaliados)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {basePercentual > 0
                ? ((estatisticas.totalAlunosPresentes / basePercentual) * 100).toFixed(1)
                : 0}%
            </p>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${basePercentual > 0 ? (estatisticas.totalAlunosPresentes / basePercentual) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Media Geral */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Media Geral</p>
            <p className={`text-2xl font-bold ${getNotaColor(mediaGeralCalculada)}`}>
              {mediaGeralCalculada > 0 ? mediaGeralCalculada.toFixed(2) : '-'}
            </p>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${mediaGeralCalculada >= 7 ? 'bg-green-500' : mediaGeralCalculada >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(mediaGeralCalculada * 10, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Comparativo Anos */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Comparativo</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Anos Iniciais</p>
                <p className="text-lg font-bold text-emerald-600">{estatisticas.mediaAnosIniciais.toFixed(2)}</p>
              </div>
              <div className="text-gray-400">vs</div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Anos Finais</p>
                <p className="text-lg font-bold text-violet-600">{estatisticas.mediaAnosFinais.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            Para analises mais detalhadas, acesse o modulo de <strong>Graficos</strong> no menu lateral.
          </p>
        </div>
      </div>
    </div>
  )
}
