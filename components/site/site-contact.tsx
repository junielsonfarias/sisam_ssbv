'use client'

import { MapPin, Phone, Mail, Clock } from 'lucide-react'

interface SiteContactProps {
  data: any
}

const defaultContact = {
  address: 'Secretaria Municipal de Educação - SEMED, São Sebastião da Boa Vista - PA',
  phone: '(91) 0000-0000',
  email: 'semed@ssbv.pa.gov.br',
  hours: 'Segunda a Sexta, 08h às 14h',
}

export default function SiteContact({ data }: SiteContactProps) {
  const title = data?.title || 'Fale Conosco'
  const subtitle = data?.subtitle || 'Estamos à disposição para atendê-lo. Entre em contato por qualquer um dos canais abaixo.'
  const contact = {
    ...defaultContact,
    ...(data?.contact || {}),
  }

  const cards = [
    { icon: MapPin, label: 'Endereço', value: contact.address },
    { icon: Phone, label: 'Telefone', value: contact.phone },
    { icon: Mail, label: 'E-mail', value: contact.email },
    { icon: Clock, label: 'Horário de Atendimento', value: contact.hours },
  ]

  return (
    <section id="contato" className="py-10 sm:py-16 lg:py-20 bg-white" aria-labelledby="contact-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">Contato</p>
          <h2 id="contact-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">{title}</h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left - Contact cards */}
          <div className="space-y-3">
            {cards.map((card, i) => (
              <div
                key={i}
                className="group flex items-start gap-5 bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-700/5 transition-all duration-300"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-800 transition-all duration-300">
                  <card.icon className="w-5 h-5 text-blue-800 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{card.label}</h3>
                  <p className="text-slate-800 font-semibold">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right - Illustration / Map placeholder */}
          <div className="hidden lg:block" aria-hidden="true">
            <div className="relative aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl border border-slate-100" />
              {/* Map-like illustration */}
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  {/* Map grid lines */}
                  <line x1="50" y1="0" x2="50" y2="300" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="100" y1="0" x2="100" y2="300" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="150" y1="0" x2="150" y2="300" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="200" y1="0" x2="200" y2="300" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="250" y1="0" x2="250" y2="300" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="0" y1="100" x2="300" y2="100" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="0" y1="150" x2="300" y2="150" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="0" y1="200" x2="300" y2="200" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  <line x1="0" y1="250" x2="300" y2="250" stroke="#1e40af" strokeWidth="0.5" opacity="0.1" />
                  {/* Location pin */}
                  <circle cx="150" cy="130" r="40" fill="#1e40af" opacity="0.1" />
                  <circle cx="150" cy="130" r="25" fill="#1e40af" opacity="0.15" />
                  <path d="M150 100 C135 100 124 111 124 125 C124 145 150 170 150 170 C150 170 176 145 176 125 C176 111 165 100 150 100Z" fill="#1e40af" opacity="0.6" />
                  <circle cx="150" cy="123" r="8" fill="white" opacity="0.9" />
                  {/* Decorative roads */}
                  <path d="M30 200 Q100 180 150 200 T270 190" fill="none" stroke="#1e40af" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
                  <path d="M80 250 Q140 230 180 250 T280 240" fill="none" stroke="#1e40af" strokeWidth="1.5" opacity="0.1" strokeLinecap="round" />
                  {/* Label */}
                  <text x="150" y="210" textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="bold" opacity="0.5">SEMED</text>
                  <text x="150" y="225" textAnchor="middle" fill="#1e40af" fontSize="8" opacity="0.35">São Sebastião da Boa Vista</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
