'use client'

import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react'

interface SiteContactProps {
  data: any
}

const defaultContact = {
  address: 'Secretaria Municipal de Educacao - SEMED, Sao Sebastiao da Boa Vista - PA',
  phone: '(91) 0000-0000',
  email: 'semed@ssbv.pa.gov.br',
  hours: 'Segunda a Sexta, 08h as 14h',
}

/** Opcoes de assunto do formulario */
const ASSUNTOS = [
  { value: '', label: 'Selecione o assunto' },
  { value: 'informacao', label: 'Informacoes' },
  { value: 'matricula', label: 'Matricula' },
  { value: 'boletim', label: 'Boletim' },
  { value: 'reclamacao', label: 'Reclamacao' },
  { value: 'outro', label: 'Outro' },
]

/** Mapear assunto do formulario para tipo da ouvidoria */
const TIPO_POR_ASSUNTO: Record<string, string> = {
  informacao: 'informacao',
  matricula: 'informacao',
  boletim: 'informacao',
  reclamacao: 'reclamacao',
  outro: 'sugestao',
}

export default function SiteContact({ data }: SiteContactProps) {
  const title = data?.title || 'Fale Conosco'
  const subtitle = data?.subtitle || 'Estamos a disposicao para atende-lo. Entre em contato por qualquer um dos canais abaixo.'
  const contact = { ...defaultContact, ...(data?.contact || {}) }

  const [form, setForm] = useState({ nome: '', email: '', assunto: '', mensagem: '' })
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ tipo: 'sucesso' | 'erro'; texto: string; protocolo?: string } | null>(null)

  const cards = [
    { icon: MapPin, label: 'Endereco', value: contact.address },
    { icon: Phone, label: 'Telefone', value: contact.phone },
    { icon: Mail, label: 'E-mail', value: contact.email },
    { icon: Clock, label: 'Horario de Atendimento', value: contact.hours },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (resultado) setResultado(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setResultado(null)

    try {
      const tipo = TIPO_POR_ASSUNTO[form.assunto] || 'informacao'
      const assuntoLabel = ASSUNTOS.find(a => a.value === form.assunto)?.label || form.assunto

      const res = await fetch('/api/ouvidoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          nome: form.nome,
          email: form.email || null,
          assunto: assuntoLabel,
          mensagem: form.mensagem,
        }),
      })

      if (res.ok) {
        const dados = await res.json()
        setResultado({
          tipo: 'sucesso',
          texto: 'Mensagem enviada com sucesso! Guarde seu protocolo para acompanhamento.',
          protocolo: dados.protocolo,
        })
        setForm({ nome: '', email: '', assunto: '', mensagem: '' })
      } else {
        setResultado({ tipo: 'erro', texto: 'Nao foi possivel enviar a mensagem. Tente novamente.' })
      }
    } catch {
      setResultado({ tipo: 'erro', texto: 'Erro de conexao. Verifique sua internet e tente novamente.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section id="contato" className="py-10 sm:py-16 lg:py-20 bg-white dark:bg-slate-900" aria-labelledby="contact-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabecalho */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-400 mb-4">Contato</p>
          <h2 id="contact-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            {title}
          </h2>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Coluna esquerda — Cards de contato */}
          <div className="space-y-3">
            {cards.map((card, i) => (
              <div
                key={i}
                className="group flex items-start gap-5 bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6
                           border border-slate-100 dark:border-slate-700
                           hover:border-blue-200 dark:hover:border-blue-800
                           hover:shadow-lg hover:shadow-blue-700/5 transition-all duration-300"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30
                                flex items-center justify-center flex-shrink-0
                                group-hover:bg-blue-800 dark:group-hover:bg-blue-700 transition-all duration-300">
                  <card.icon className="w-5 h-5 text-blue-800 dark:text-blue-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    {card.label}
                  </h3>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Coluna direita — Formulario */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8
                          border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Envie sua mensagem
            </h3>

            {/* Mensagem de resultado */}
            {resultado && (
              <div
                role="alert"
                className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
                  resultado.tipo === 'sucesso'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                {resultado.tipo === 'sucesso'
                  ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p>{resultado.texto}</p>
                  {resultado.protocolo && (
                    <p className="mt-1 font-bold">Protocolo: {resultado.protocolo}</p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Nome */}
              <div>
                <label htmlFor="contato-nome" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Nome <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="contato-nome"
                  name="nome"
                  required
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                             bg-white dark:bg-slate-700 px-4 py-3 text-sm
                             text-slate-900 dark:text-white
                             placeholder:text-slate-400 dark:placeholder:text-slate-500
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                             transition-colors"
                  aria-required="true"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contato-email" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  E-mail <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  type="email"
                  id="contato-email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                             bg-white dark:bg-slate-700 px-4 py-3 text-sm
                             text-slate-900 dark:text-white
                             placeholder:text-slate-400 dark:placeholder:text-slate-500
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                             transition-colors"
                  aria-required="true"
                />
              </div>

              {/* Assunto */}
              <div>
                <label htmlFor="contato-assunto" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Assunto <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="contato-assunto"
                  name="assunto"
                  required
                  value={form.assunto}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                             bg-white dark:bg-slate-700 px-4 py-3 text-sm
                             text-slate-900 dark:text-white
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                             transition-colors"
                  aria-required="true"
                >
                  {ASSUNTOS.map(a => (
                    <option key={a.value} value={a.value} disabled={a.value === ''}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mensagem */}
              <div>
                <label htmlFor="contato-mensagem" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Mensagem <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="contato-mensagem"
                  name="mensagem"
                  required
                  rows={4}
                  value={form.mensagem}
                  onChange={handleChange}
                  placeholder="Descreva sua solicitacao..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                             bg-white dark:bg-slate-700 px-4 py-3 text-sm
                             text-slate-900 dark:text-white
                             placeholder:text-slate-400 dark:placeholder:text-slate-500
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                             transition-colors resize-none"
                  aria-required="true"
                />
              </div>

              {/* Botao enviar */}
              <button
                type="submit"
                disabled={enviando || !form.nome || !form.email || !form.assunto || !form.mensagem}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
                           bg-blue-800 hover:bg-blue-700 disabled:bg-blue-800/50
                           text-white font-semibold text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                           dark:bg-blue-700 dark:hover:bg-blue-600 dark:disabled:bg-blue-700/50
                           dark:focus:ring-offset-slate-800
                           transition-colors"
              >
                {enviando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Mensagem
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
