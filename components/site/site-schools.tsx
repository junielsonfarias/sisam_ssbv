'use client'

import { MapPin, School } from 'lucide-react'

interface SiteSchoolsProps {
  data: any
  escolas: any[]
}

export default function SiteSchools({ data, escolas }: SiteSchoolsProps) {
  const title = data?.title || 'Escolas da Rede Municipal'
  const subtitle = data?.subtitle || 'Conheca as unidades escolares que fazem parte do SISAM'

  if (!escolas || escolas.length === 0) {
    return (
      <section id="escolas" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">{title}</h2>
          <div className="mt-10 bg-slate-50 rounded-2xl p-12 border border-slate-100">
            <School className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Informacoes das escolas serao disponibilizadas em breve.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="escolas" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Schools Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {escolas.map((escola: any, i: number) => (
            <div
              key={escola.id || i}
              className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <School className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1.5 line-clamp-2">
                    {escola.nome || escola.name || 'Escola'}
                  </h3>
                  {(escola.endereco || escola.address) && (
                    <p className="flex items-start gap-1.5 text-xs text-slate-400 leading-snug">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{escola.endereco || escola.address}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
