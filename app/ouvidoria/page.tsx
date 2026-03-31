'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Search, Send, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import SiteHeader from '@/components/site/site-header'
import SiteFooter from '@/components/site/site-footer'

interface Escola {
  id: string
  nome: string
}

interface ConsultaResult {
  protocolo: string
  tipo: string
  assunto: string
  status: string
  resposta: string | null
  respondido_em: string | null
  criado_em: string
}

const TIPOS = [
  { value: 'denuncia', label: 'Denúncia' },
  { value: 'sugestao', label: 'Sugestão' },
  { value: 'elogio', label: 'Elogio' },
  { value: 'reclamacao', label: 'Reclamação' },
  { value: 'informacao', label: 'Solicitação de Informação' },
]

const STATUS_LABELS: Record<string, { label: string; cls: string; icon: any }> = {
  aberto: { label: 'Aberto', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  em_analise: { label: 'Em Análise', cls: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  respondido: { label: 'Respondido', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  encerrado: { label: 'Encerrado', cls: 'bg-slate-100 text-slate-700', icon: CheckCircle },
}

export default function OuvidoriaPage() {
  const [aba, setAba] = useState<'enviar' | 'consultar'>('enviar')
  const [escolas, setEscolas] = useState<Escola[]>([])

  // Form state
  const [tipo, setTipo] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [escolaId, setEscolaId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [protocoloGerado, setProtocoloGerado] = useState('')
  const [erroEnvio, setErroEnvio] = useState('')

  // Consulta state
  const [protocoloConsulta, setProtocoloConsulta] = useState('')
  const [consultando, setConsultando] = useState(false)
  const [resultado, setResultado] = useState<ConsultaResult | null>(null)
  const [erroConsulta, setErroConsulta] = useState('')

  useEffect(() => {
    fetch('/api/transparencia')
      .then(r => r.ok ? r.json() : { escolas: [] })
      .then(data => setEscolas((data.escolas || []).map((e: any) => ({ id: e.id, nome: e.nome }))))
      .catch(() => setEscolas([]))
  }, [])

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!tipo || !assunto.trim() || !mensagem.trim()) {
      setErroEnvio('Preencha os campos obrigatórios: tipo, assunto e mensagem.')
      return
    }
    setEnviando(true)
    setErroEnvio('')
    try {
      const res = await fetch('/api/ouvidoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, nome: nome || null, email: email || null, telefone: telefone || null, escola_id: escolaId || null, assunto, mensagem }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar')
      setProtocoloGerado(data.protocolo)
      // Reset form
      setTipo('')
      setNome('')
      setEmail('')
      setTelefone('')
      setEscolaId('')
      setAssunto('')
      setMensagem('')
    } catch (err: any) {
      setErroEnvio(err.message || 'Erro ao enviar manifestação')
    } finally {
      setEnviando(false)
    }
  }

  async function handleConsultar(e: React.FormEvent) {
    e.preventDefault()
    if (!protocoloConsulta.trim()) return
    setConsultando(true)
    setErroConsulta('')
    setResultado(null)
    try {
      const res = await fetch(`/api/ouvidoria?protocolo=${encodeURIComponent(protocoloConsulta.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Protocolo não encontrado')
      setResultado(data)
    } catch (err: any) {
      setErroConsulta(err.message || 'Erro ao consultar')
    } finally {
      setConsultando(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader data={{}} />

      {/* Hero */}
      <div className="pt-32 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-4">Cidadania</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Ouvidoria Digital
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Canal direto para enviar sugestões, elogios, reclamações e denúncias
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => { setAba('enviar'); setProtocoloGerado('') }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              aba === 'enviar' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            Enviar Manifestação
          </button>
          <button
            onClick={() => setAba('consultar')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              aba === 'consultar' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            Consultar Protocolo
          </button>
        </div>

        {/* Enviar */}
        {aba === 'enviar' && (
          <>
            {protocoloGerado ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-blue-800 mb-2">Manifestação Registrada!</h2>
                <p className="text-slate-600 mb-4">Guarde seu número de protocolo para acompanhamento:</p>
                <p className="text-3xl font-mono font-extrabold text-blue-700 bg-white rounded-xl py-4 px-6 inline-block border border-blue-200">
                  {protocoloGerado}
                </p>
                <p className="text-sm text-slate-500 mt-4">Use este protocolo na aba &quot;Consultar Protocolo&quot; para acompanhar o andamento.</p>
              </div>
            ) : (
              <form onSubmit={handleEnviar} className="space-y-5">
                {erroEnvio && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{erroEnvio}</div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Manifestação *</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls} required>
                    <option value="">Selecione...</option>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome (opcional)</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail (opcional)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="seu@email.com" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone (opcional)</label>
                    <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Escola (opcional)</label>
                    <select value={escolaId} onChange={(e) => setEscolaId(e.target.value)} className={inputCls}>
                      <option value="">Nenhuma escola</option>
                      {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assunto *</label>
                  <input type="text" value={assunto} onChange={(e) => setAssunto(e.target.value)} className={inputCls} placeholder="Resumo da manifestação" required />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mensagem *</label>
                  <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={6} className={inputCls} placeholder="Descreva detalhadamente sua manifestação..." required />
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/25"
                >
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {enviando ? 'Enviando...' : 'Enviar Manifestação'}
                </button>
              </form>
            )}
          </>
        )}

        {/* Consultar */}
        {aba === 'consultar' && (
          <div>
            <form onSubmit={handleConsultar} className="flex gap-3 mb-8">
              <input
                type="text"
                value={protocoloConsulta}
                onChange={(e) => setProtocoloConsulta(e.target.value)}
                placeholder="Ex: OUV-20260328-1234"
                className={`flex-1 ${inputCls}`}
              />
              <button
                type="submit"
                disabled={consultando}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {consultando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Consultar
              </button>
            </form>

            {erroConsulta && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{erroConsulta}</div>
            )}

            {resultado && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono font-bold text-slate-900">{resultado.protocolo}</p>
                  {(() => {
                    const st = STATUS_LABELS[resultado.status] || STATUS_LABELS.aberto
                    const StIcon = st.icon
                    return (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>
                        <StIcon className="w-3.5 h-3.5" />
                        {st.label}
                      </span>
                    )
                  })()}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{resultado.assunto}</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tipo: {TIPOS.find(t => t.value === resultado.tipo)?.label || resultado.tipo} | Criado em: {new Date(resultado.criado_em).toLocaleDateString('pt-BR')}
                </p>
                {resultado.resposta && (
                  <div className="bg-blue-50 rounded-xl p-4 mt-4">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Resposta:</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{resultado.resposta}</p>
                    {resultado.respondido_em && (
                      <p className="text-xs text-slate-400 mt-2">Respondido em: {new Date(resultado.respondido_em).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <SiteFooter data={{}} />
    </div>
  )
}
