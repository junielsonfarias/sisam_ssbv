'use client'

import { useState } from 'react'
import { MapPin, School, ChevronDown } from 'lucide-react'

interface SiteSchoolsProps {
  data: any
  escolas: any[]
}

export default function SiteSchools({ data, escolas }: SiteSchoolsProps) {
  const title = data?.title || 'Nossas Escolas'
  const subtitle = data?.subtitle || 'Conheça as unidades escolares da rede municipal de São Sebastião da Boa Vista'
  const [showAll, setShowAll] = useState(false)

  if (!escolas || escolas.length === 0) {
    return (
      <section id="escolas" className="py-20 sm:py-28 bg-slate-50" aria-labelledby="schools-title-empty">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">Rede de ensino</p>
          <h2 id="schools-title-empty" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">{title}</h2>
          <div className="mt-12 bg-white rounded-2xl p-16 border border-slate-100 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <School className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-semibold">Informações das escolas serão disponibilizadas em breve.</p>
          </div>
        </div>
      </section>
    )
  }

  const displayedSchools = showAll ? escolas : escolas.slice(0, 8)

  return (
    <section id="escolas" className="py-12 sm:py-28 bg-slate-50" aria-labelledby="schools-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">Rede de ensino</p>
          <h2 id="schools-title" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </div>

        {/* Schools Grid - 4 cols desktop, 2 mobile */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedSchools.map((escola: any, i: number) => (
            <div
              key={escola.id || i}
              className={`group bg-white rounded-2xl p-5 border border-slate-100 border-l-4 border-l-blue-700 hover:shadow-lg hover:shadow-blue-700/5 hover:border-l-blue-800 transition-all duration-300 ${i >= 4 && !showAll ? 'hidden sm:block' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors duration-300">
                  <School className="w-5 h-5 text-blue-800" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-blue-900 transition-colors duration-300">
                    {escola.nome || escola.name || 'Escola'}
                  </h3>
                  {(escola.polo || escola.region) && (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      {escola.polo || escola.region}
                    </span>
                  )}
                  {(escola.endereco || escola.address) && (
                    <p className="flex items-start gap-1 text-xs text-slate-400 leading-snug">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
                      <span className="line-clamp-2">{escola.endereco || escola.address}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show all button */}
        {escolas.length > 8 && !showAll && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-blue-200 text-blue-800 font-bold hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
            >
              Ver todas as escolas ({escolas.length})
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {showAll && escolas.length > 8 && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setShowAll(false)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
            >
              Mostrar menos
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
