'use client'

import { useState, useEffect } from 'react'
import Rodape from '@/components/rodape'
import {
  GraduationCap, ArrowLeft, ArrowRight, Search, CheckCircle,
  Clock, XCircle, AlertTriangle, FileText, User, Phone, MapPin,
  School, Loader2
} from 'lucide-react'
import Link from 'next/link'

const PARENTESCOS = [
  { value: 'mae', label: 'Mãe' },
  { value: 'pai', label: 'Pai' },
  { value: 'avo', label: 'Avó/Avô' },
  { value: 'tio', label: 'Tio/Tia' },
  { value: 'outro', label: 'Outro' },
]

const GENEROS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
]

const SERIES = [
  '1_ano_ef', '2_ano_ef', '3_ano_ef', '4_ano_ef', '5_ano_ef',
  '6_ano_ef', '7_ano_ef', '8_ano_ef', '9_ano_ef',
  'pre_escola_i', 'pre_escola_ii',
]

const SERIES_LABELS: Record<string, string> = {
  '1_ano_ef': '1o Ano EF', '2_ano_ef': '2o Ano EF', '3_ano_ef': '3o Ano EF',
  '4_ano_ef': '4o Ano EF', '5_ano_ef': '5o Ano EF', '6_ano_ef': '6o Ano EF',
  '7_ano_ef': '7o Ano EF', '8_ano_ef': '8o Ano EF', '9_ano_ef': '9o Ano EF',
  'pre_escola_i': 'Pré-Escola I', 'pre_escola_ii': 'Pré-Escola II',
}

interface EscolaOption { id: string; nome: string }
interface ConsultaResult {
  protocolo: string; aluno_nome: string; serie_pretendida: string
  ano_letivo: string; status: string; motivo_rejeicao: string | null
  escola_nome: string | null; criado_em: string; analisado_em: string | null
}

function cpfMask(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
}

function phoneMask(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  em_analise: { label: 'Em Análise', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Search },
  aprovada: { label: 'Aprovada', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  rejeitada: { label: 'Rejeitada', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  matriculada: { label: 'Matriculada', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: GraduationCap },
}

export default function MatriculaPage() {
  const [aba, setAba] = useState<'formulario' | 'consulta'>('formulario')
  const [etapa, setEtapa] = useState(1)
  const [escolas, setEscolas] = useState<EscolaOption[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState<{ protocolo: string } | null>(null)

  // Formulário
  const [form, setForm] = useState({
    aluno_nome: '', aluno_data_nascimento: '', aluno_cpf: '', aluno_genero: '', aluno_pcd: false,
    responsavel_nome: '', responsavel_cpf: '', responsavel_telefone: '', responsavel_email: '', parentesco: '',
    endereco: '', bairro: '', escola_pretendida_id: '', serie_pretendida: '',
    ano_letivo: String(new Date().getFullYear()),
  })

  // Consulta
  const [protocolo, setProtocolo] = useState('')
  const [consultaResult, setConsultaResult] = useState<ConsultaResult | null>(null)
  const [consultaErro, setConsultaErro] = useState('')

  useEffect(() => {
    fetch('/api/offline/escolas')
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : data.escolas || []
        setEscolas(lista.map((e: any) => ({ id: e.id, nome: e.nome })))
      })
      .catch(() => {})
  }, [])

  const setField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const validarEtapa = (n: number): string | null => {
    if (n === 1) {
      if (!form.aluno_nome.trim()) return 'Informe o nome do aluno.'
      if (!form.aluno_data_nascimento) return 'Informe a data de nascimento.'
    }
    if (n === 2) {
      if (!form.responsavel_nome.trim()) return 'Informe o nome do responsável.'
      if (!form.responsavel_telefone.trim() || form.responsavel_telefone.replace(/\D/g, '').length < 10)
        return 'Informe um telefone válido.'
    }
    if (n === 3) {
      if (!form.serie_pretendida) return 'Selecione a série pretendida.'
    }
    return null
  }

  const avancar = () => {
    const erro = validarEtapa(etapa)
    if (erro) { setErro(erro); return }
    setErro('')
    setEtapa(etapa + 1)
  }

  const enviar = async () => {
    const erro = validarEtapa(3)
    if (erro) { setErro(erro); return }
    setErro('')
    setCarregando(true)
    try {
      const res = await fetch('/api/pre-matricula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          aluno_cpf: form.aluno_cpf || null,
          responsavel_cpf: form.responsavel_cpf || null,
          responsavel_email: form.responsavel_email || null,
          escola_pretendida_id: form.escola_pretendida_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.mensagem || 'Erro ao enviar.'); return }
      setSucesso({ protocolo: data.protocolo })
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const consultar = async () => {
    if (!protocolo.trim()) { setConsultaErro('Informe o protocolo.'); return }
    setConsultaErro('')
    setConsultaResult(null)
    setCarregando(true)
    try {
      const res = await fetch(`/api/pre-matricula?protocolo=${encodeURIComponent(protocolo.trim())}`)
      const data = await res.json()
      if (!res.ok) { setConsultaErro(data.mensagem || 'Não encontrado.'); return }
      setConsultaResult(data)
    } catch {
      setConsultaErro('Erro de conexão.')
    } finally {
      setCarregando(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-semed.png" alt="SEMED" className="h-12 sm:h-14 w-auto object-contain" />
            <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
            <img src="/logo-prefeitura.png" alt="Prefeitura" className="h-12 sm:h-14 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-blue-900">Pré-Matrícula</span>
              <p className="text-[10px] text-slate-400">SEMED — São Sebastião da Boa Vista</p>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-blue-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1">
        {/* Título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Pré-Matrícula Online</h1>
          <p className="text-slate-500 mt-2">SEMED - São Sebastião da Boa Vista</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 max-w-md mx-auto mb-8">
          <button onClick={() => { setAba('formulario'); setSucesso(null); setErro('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${aba === 'formulario' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
            Nova Pré-Matrícula
          </button>
          <button onClick={() => { setAba('consulta'); setErro('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${aba === 'consulta' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
            Consultar Protocolo
          </button>
        </div>

        {/* FORMULÁRIO */}
        {aba === 'formulario' && !sucesso && (
          <div className="max-w-lg mx-auto">
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    etapa === n ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' :
                    etapa > n ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                  }`}>{n}</div>
                  {n < 3 && <div className={`w-8 h-0.5 ${etapa > n ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500 mb-6">
              {etapa === 1 && 'Dados do Aluno'}
              {etapa === 2 && 'Dados do Responsável'}
              {etapa === 3 && 'Escola e Série'}
            </p>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
              {/* Etapa 1: Dados do Aluno */}
              {etapa === 1 && (
                <>
                  <div>
                    <label className={labelClass}>Nome completo do aluno *</label>
                    <input type="text" value={form.aluno_nome} onChange={e => setField('aluno_nome', e.target.value)}
                      placeholder="Nome completo" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Data de nascimento *</label>
                    <input type="date" value={form.aluno_data_nascimento}
                      onChange={e => setField('aluno_data_nascimento', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CPF do aluno (opcional)</label>
                    <input type="text" inputMode="numeric" autoComplete="off" value={form.aluno_cpf} onChange={e => setField('aluno_cpf', cpfMask(e.target.value))}
                      placeholder="000.000.000-00" maxLength={14} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Gênero</label>
                      <select value={form.aluno_genero} onChange={e => setField('aluno_genero', e.target.value)} className={inputClass}>
                        <option value="">Selecione</option>
                        {GENEROS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                        <input type="checkbox" checked={form.aluno_pcd} onChange={e => setField('aluno_pcd', e.target.checked)}
                          className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-sm text-slate-700">PCD (Pessoa com Deficiência)</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Etapa 2: Responsável */}
              {etapa === 2 && (
                <>
                  <div>
                    <label className={labelClass}>Nome do responsável *</label>
                    <input type="text" value={form.responsavel_nome} onChange={e => setField('responsavel_nome', e.target.value)}
                      placeholder="Nome completo" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CPF do responsável (opcional)</label>
                    <input type="text" inputMode="numeric" autoComplete="off" value={form.responsavel_cpf} onChange={e => setField('responsavel_cpf', cpfMask(e.target.value))}
                      placeholder="000.000.000-00" maxLength={14} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone *</label>
                    <input type="tel" inputMode="tel" autoComplete="tel" value={form.responsavel_telefone}
                      onChange={e => setField('responsavel_telefone', phoneMask(e.target.value))}
                      placeholder="(91) 99999-0000" maxLength={15} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email (opcional)</label>
                    <input type="email" inputMode="email" autoComplete="email" value={form.responsavel_email} onChange={e => setField('responsavel_email', e.target.value)}
                      placeholder="email@exemplo.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Parentesco</label>
                    <select value={form.parentesco} onChange={e => setField('parentesco', e.target.value)} className={inputClass}>
                      <option value="">Selecione</option>
                      {PARENTESCOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Endereço</label>
                    <input type="text" value={form.endereco} onChange={e => setField('endereco', e.target.value)}
                      placeholder="Rua, número, comunidade" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Bairro</label>
                    <input type="text" value={form.bairro} onChange={e => setField('bairro', e.target.value)}
                      placeholder="Bairro" className={inputClass} />
                  </div>
                </>
              )}

              {/* Etapa 3: Escola e Série */}
              {etapa === 3 && (
                <>
                  <div>
                    <label className={labelClass}>Escola pretendida</label>
                    <select value={form.escola_pretendida_id} onChange={e => setField('escola_pretendida_id', e.target.value)} className={inputClass}>
                      <option value="">Sem preferência</option>
                      {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Série pretendida *</label>
                    <select value={form.serie_pretendida} onChange={e => setField('serie_pretendida', e.target.value)} className={inputClass}>
                      <option value="">Selecione a série</option>
                      {SERIES.map(s => <option key={s} value={s}>{SERIES_LABELS[s] || s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ano letivo</label>
                    <input type="text" value={form.ano_letivo} readOnly className={`${inputClass} bg-gray-50`} />
                  </div>
                </>
              )}

              {/* Erro */}
              {erro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {erro}
                </div>
              )}

              {/* Botões navegação */}
              <div className="flex gap-3 pt-2">
                {etapa > 1 && (
                  <button onClick={() => { setEtapa(etapa - 1); setErro('') }}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                )}
                {etapa < 3 ? (
                  <button onClick={avancar}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                    Próximo <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={enviar} disabled={carregando}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                    {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Enviar Pré-Matrícula</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUCESSO */}
        {aba === 'formulario' && sucesso && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Pré-Matrícula Enviada!</h2>
              <p className="text-slate-500 mb-6">Sua solicitação foi registrada com sucesso.</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-emerald-700 font-medium mb-1">Seu protocolo:</p>
                <p className="text-2xl font-bold text-emerald-800 font-mono">{sucesso.protocolo}</p>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Guarde este protocolo para acompanhar o andamento da sua solicitação.
                Você pode consultar o status a qualquer momento na aba "Consultar Protocolo".
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setSucesso(null); setEtapa(1); setForm({
                  aluno_nome: '', aluno_data_nascimento: '', aluno_cpf: '', aluno_genero: '', aluno_pcd: false,
                  responsavel_nome: '', responsavel_cpf: '', responsavel_telefone: '', responsavel_email: '', parentesco: '',
                  endereco: '', bairro: '', escola_pretendida_id: '', serie_pretendida: '', ano_letivo: String(new Date().getFullYear()),
                }) }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Nova Pré-Matrícula
                </button>
                <button onClick={() => { setAba('consulta'); setProtocolo(sucesso.protocolo) }}
                  className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">
                  Consultar Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONSULTA */}
        {aba === 'consulta' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
              <div>
                <label className={labelClass}>Número do Protocolo</label>
                <input type="text" value={protocolo} onChange={e => setProtocolo(e.target.value.toUpperCase())}
                  placeholder="MAT-XXXXXXXX-XXXX" className={inputClass}
                  onKeyDown={e => e.key === 'Enter' && consultar()} />
              </div>
              {consultaErro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {consultaErro}
                </div>
              )}
              <button onClick={consultar} disabled={carregando}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Consultar</>}
              </button>
            </div>

            {/* Resultado da consulta */}
            {consultaResult && (() => {
              const cfg = statusConfig[consultaResult.status] || statusConfig.pendente
              const StatusIcon = cfg.icon
              return (
                <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Protocolo: {consultaResult.protocolo}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.color}`}>
                      <StatusIcon className="w-4 h-4" /> {cfg.label}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Aluno:</span> {consultaResult.aluno_nome}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <School className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Série:</span> {SERIES_LABELS[consultaResult.serie_pretendida] || consultaResult.serie_pretendida}
                    </div>
                    {consultaResult.escola_nome && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">Escola:</span> {consultaResult.escola_nome}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Solicitado em:</span> {new Date(consultaResult.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                    {consultaResult.analisado_em && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">Analisado em:</span> {new Date(consultaResult.analisado_em).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {consultaResult.motivo_rejeicao && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                        <span className="font-medium">Motivo da rejeição:</span> {consultaResult.motivo_rejeicao}
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Histórico</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500" />
                        <div><p className="text-sm font-medium text-slate-700">Solicitação recebida</p>
                          <p className="text-xs text-slate-400">{new Date(consultaResult.criado_em).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      {(consultaResult.status === 'em_analise' || consultaResult.status === 'aprovada' || consultaResult.status === 'rejeitada') && (
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
                          <div><p className="text-sm font-medium text-slate-700">Em análise</p></div>
                        </div>
                      )}
                      {(consultaResult.status === 'aprovada' || consultaResult.status === 'rejeitada') && consultaResult.analisado_em && (
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 mt-1.5 rounded-full ${consultaResult.status === 'aprovada' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{consultaResult.status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}</p>
                            <p className="text-xs text-slate-400">{new Date(consultaResult.analisado_em).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </main>

      <Rodape />
    </div>
  )
}
