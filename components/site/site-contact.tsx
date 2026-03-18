'use client'

import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react'

interface SiteContactProps {
  data: any
}

const defaultContact = {
  address: 'Secretaria Municipal de Educacao - SEMED, Sao Sebastiao da Boa Vista - PA',
  phone: '(00) 0000-0000',
  email: 'semed@municipio.gov.br',
  hours: 'Segunda a Sexta, 08h as 14h',
}

export default function SiteContact({ data }: SiteContactProps) {
  const title = data?.title || 'Entre em Contato'
  const subtitle = data?.subtitle || 'Estamos a disposicao para atende-lo. Entre em contato conosco por qualquer um dos canais abaixo.'
  const contact = {
    ...defaultContact,
    ...(data?.contact || {}),
  }

  const cards = [
    {
      icon: MapPin,
      label: 'Endereco',
      value: contact.address,
    },
    {
      icon: Phone,
      label: 'Telefone',
      value: contact.phone,
    },
    {
      icon: Mail,
      label: 'E-mail',
      value: contact.email,
    },
    {
      icon: Clock,
      label: 'Horario de Atendimento',
      value: contact.hours,
    },
  ]

  return (
    <section id="contato" className="relative py-24 sm:py-32 bg-white overflow-hidden">
      {/* Subtle gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-emerald-50/50 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">Fale conosco</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left - Contact cards stacked */}
          <div className="space-y-5">
            {cards.map((card, i) => (
              <div
                key={i}
                className="group flex items-start gap-5 bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-200 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-500">
                  <card.icon className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors duration-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1.5">{card.label}</h3>
                  <p className="text-slate-800 font-semibold text-lg">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right - Decorative illustration */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              {/* Background shapes */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl" />
              <div className="absolute inset-4 bg-white/60 rounded-2xl border border-emerald-100/50" />

              {/* SVG Illustration */}
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  {/* Envelope base */}
                  <rect x="40" y="80" width="220" height="160" rx="16" fill="white" stroke="#059669" strokeWidth="2" opacity="0.9" />
                  {/* Envelope flap */}
                  <path d="M 40 80 L 150 170 L 260 80" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                  {/* Lines */}
                  <rect x="80" y="130" width="100" height="6" rx="3" fill="#d1fae5" />
                  <rect x="80" y="148" width="140" height="6" rx="3" fill="#d1fae5" />
                  <rect x="80" y="166" width="80" height="6" rx="3" fill="#d1fae5" />
                  {/* Decorative circles */}
                  <circle cx="60" cy="60" r="20" fill="#d1fae5" />
                  <circle cx="250" cy="50" r="15" fill="#fef3c7" />
                  <circle cx="40" cy="260" r="12" fill="#dbeafe" />
                  {/* Chat bubble */}
                  <rect x="180" y="30" width="80" height="50" rx="12" fill="#059669" opacity="0.15" />
                  <circle cx="200" cy="55" r="3" fill="#059669" opacity="0.4" />
                  <circle cx="215" cy="55" r="3" fill="#059669" opacity="0.4" />
                  <circle cx="230" cy="55" r="3" fill="#059669" opacity="0.4" />
                  {/* Location pin */}
                  <circle cx="70" cy="260" r="8" fill="none" stroke="#059669" strokeWidth="1.5" />
                  <circle cx="70" cy="258" r="3" fill="#059669" />
                </svg>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-3 -left-3 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Atendimento</p>
                  <p className="text-xs text-emerald-600 font-medium">Seg a Sex, 8h-14h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
