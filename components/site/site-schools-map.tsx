'use client'

import { MapPin, School } from 'lucide-react'

interface SiteSchoolsMapProps {
  escolas: Array<{
    id?: number
    nome?: string
    name?: string
    endereco?: string
    address?: string
  }>
}

export default function SiteSchoolsMap({ escolas }: SiteSchoolsMapProps) {
  if (!escolas || escolas.length === 0) return null

  return (
    <section
      id="mapa-escolas"
      className="py-10 sm:py-16 lg:py-20 bg-white dark:bg-slate-900"
      aria-labelledby="mapa-escolas-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-400">
              Localização
            </p>
          </div>
          <h2
            id="mapa-escolas-title"
            className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4"
          >
            Mapa das Escolas
          </h2>
          <p className="text-sm sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Veja a localização das unidades escolares da rede municipal de São Sebastião da Boa Vista
          </p>
        </div>

        {/* Conteúdo: mapa + lista */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Mapa — ocupa 3 colunas no desktop */}
          <div className="lg:col-span-3 order-1">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800">
              <iframe
                title="Mapa de São Sebastião da Boa Vista"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-49.58,-1.75,-49.47,-1.68&layer=mapnik&marker=-1.7131,-49.5272"
                className="w-full h-[300px] sm:h-[400px] lg:h-[500px]"
                loading="lazy"
                allowFullScreen
                aria-label="Mapa interativo de São Sebastião da Boa Vista no OpenStreetMap"
              />
              {/* Link para abrir no OpenStreetMap completo */}
              <a
                href="https://www.openstreetmap.org/?mlat=-1.7131&mlon=-49.5272#map=14/-1.7131/-49.5272"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-xs font-semibold text-blue-700 dark:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Ver mapa completo
              </a>
            </div>
          </div>

          {/* Lista de escolas — 2 colunas no desktop */}
          <div className="lg:col-span-2 order-2">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 h-full">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Escolas da Rede ({escolas.length})
              </h3>
              <div
                className="space-y-2 max-h-[260px] sm:max-h-[350px] lg:max-h-[420px] overflow-y-auto pr-1 scrollbar-thin"
                role="list"
                aria-label="Lista de escolas"
              >
                {escolas.map((escola, i) => {
                  const nome = escola.nome || escola.name || 'Escola'
                  const endereco = escola.endereco || escola.address
                  return (
                    <div
                      key={escola.id || i}
                      role="listitem"
                      className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-600 transition-colors duration-200"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                          {i + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
                          {nome}
                        </p>
                        {endereco && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {endereco}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
