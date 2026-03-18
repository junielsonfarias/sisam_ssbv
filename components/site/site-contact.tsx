'use client'

import { MapPin, Phone, Mail, Clock } from 'lucide-react'

interface SiteContactProps {
  data: any
}

const defaultContact = {
  address: 'Secretaria Municipal de Educacao - SEMED',
  phone: '(00) 0000-0000',
  email: 'semed@municipio.gov.br',
  hours: 'Segunda a Sexta, 08h as 14h',
}

export default function SiteContact({ data }: SiteContactProps) {
  const title = data?.title || 'Entre em Contato'
  const subtitle = data?.subtitle || 'Estamos a disposicao para atende-lo'
  const contact = {
    ...defaultContact,
    ...(data?.contact || {}),
  }
  const mapsEmbed = data?.mapsEmbed || null

  const cards = [
    {
      icon: MapPin,
      label: 'Endereco',
      value: contact.address,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Phone,
      label: 'Telefone',
      value: contact.phone,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: Mail,
      label: 'E-mail',
      value: contact.email,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Clock,
      label: 'Horario de Atendimento',
      value: contact.hours,
      color: 'bg-amber-100 text-amber-600',
    },
  ]

  return (
    <section id="contato" className="py-20 sm:py-28 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <div className={`grid ${mapsEmbed ? 'lg:grid-cols-2' : 'lg:grid-cols-1 max-w-3xl mx-auto'} gap-8`}>
          {/* Contact Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {cards.map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">{card.label}</h3>
                <p className="text-slate-700 font-medium">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Maps Embed */}
          {mapsEmbed && (
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm min-h-[300px]">
              <iframe
                src={mapsEmbed}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '300px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localizacao"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
