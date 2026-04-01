'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'

interface SerieEscolar {
  id: string
  codigo: string
  nome: string
  etapa: string
  ordem: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  max_dependencias: number
  formula_nota_final: string
  permite_recuperacao: boolean
  idade_minima: number | null
  idade_maxima: number | null
  ativo: boolean
  total_disciplinas: number
  tipo_avaliacao_id: string | null
  regra_avaliacao_id: string | null
}

interface EtapaInfo {
  valor: string
  label: string
  cor: string
}

interface SidebarSeriesProps {
  etapas: EtapaInfo[]
  series: SerieEscolar[]
  etapasAbertas: string[]
  serieSelecionada: SerieEscolar | null
  onToggleEtapa: (etapa: string) => void
  onSelecionarSerie: (serie: SerieEscolar) => void
}

export default function SidebarSeries({
  etapas,
  series,
  etapasAbertas,
  serieSelecionada,
  onToggleEtapa,
  onSelecionarSerie,
}: SidebarSeriesProps) {
  const seriesPorEtapa = (etapa: string) => series.filter(s => s.etapa === etapa)

  return (
    <div className="lg:w-1/3 space-y-3">
      {etapas.map(etapa => {
        const seriesEtapa = seriesPorEtapa(etapa.valor)
        const aberta = etapasAbertas.includes(etapa.valor)

        return (
          <div key={etapa.valor} className="bg-white rounded-lg shadow-sm border">
            <button
              onClick={() => onToggleEtapa(etapa.valor)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {aberta ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${etapa.cor}`}>
                  {etapa.label}
                </span>
                <span className="text-xs text-gray-400">({seriesEtapa.length})</span>
              </div>
            </button>

            {aberta && (
              <div className="border-t">
                {seriesEtapa.map(serie => (
                  <button
                    key={serie.id}
                    onClick={() => onSelecionarSerie(serie)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                      serieSelecionada?.id === serie.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                    }`}
                  >
                    <div>
                      <span className="font-medium text-sm">{serie.nome}</span>
                      <span className="text-xs text-gray-400 ml-2">({serie.codigo})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {serie.total_disciplinas > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {serie.total_disciplinas} disc.
                        </span>
                      )}
                      {!serie.ativo && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inativo</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
