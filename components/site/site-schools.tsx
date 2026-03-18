'use client'

import { useState } from 'react'
import { MapPin, School, ChevronDown } from 'lucide-react'

interface SiteSchoolsProps {
  data: any
  escolas: any[]
}

export default function SiteSchools({ data, escolas }: SiteSchoolsProps) {
  const title = data?.title || 'Nossas Escolas'
  const subtitle = data?.subtitle || 'Conheca as unidades escolares que fazem parte da rede municipal de ensino'
  const [showAll, setShowAll] = useState(false)

  if (!escolas || escolas.length === 0) {
    return (
      <section id="escolas" className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">Rede de ensino</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">{title}</h2>
          <div className="mt-12 bg-white rounded-2xl p-16 border border-slate-100 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <School className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-medium">Informacoes das escolas serao disponibilizadas em breve.</p>
          </div>
        </div>
      </section>
    )
  }

  const displayedSchools = showAll ? escolas : escolas.slice(0, 12)

  return (
    <section id="escolas" className="py-24 sm:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">Rede de ensino</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Schools Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedSchools.map((escola: any, i: number) => (
            <div
              key={escola.id || i}
              className="group bg-white rounded-2xl p-6 border border-slate-100 border-l-4 border-l-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors duration-300">
                  <School className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 leading-snug mb-2 line-clamp-2 group-hover:text-emerald-700 transition-colors duration-300">
                    {escola.nome || escola.name || 'Escola'}
                  </h3>
                  {(escola.endereco || escola.address) && (
                    <p className="flex items-start gap-1.5 text-sm text-slate-400 leading-snug">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                      <span className="line-clamp-2">{escola.endereco || escola.address}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show all button */}
        {escolas.length > 12 && !showAll && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-emerald-200 text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
            >
              Ver todas as escolas ({escolas.length})
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
