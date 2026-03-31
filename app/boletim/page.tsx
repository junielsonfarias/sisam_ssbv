'use client'

import { useState } from 'react'
import {
  Search, GraduationCap, BookOpen, CalendarCheck, Printer,
  ArrowLeft, Accessibility, AlertTriangle, Award, BarChart3,
  ClipboardCheck, User, School, Clock, MessageSquare, Bell
} from 'lucide-react'
import Link from 'next/link'
import Rodape from '@/components/rodape'
// Formatação local de série (sem chamar API admin)
function formatSerie(serie: string | null | undefined): string {
  if (!serie) return '-'
  const num = serie.replace(/[^0-9]/g, '')
  if (num) return `${num}º Ano`
  return serie
}

interface Disciplina { id: string; nome: string; codigo: string; abreviacao: string; ordem: number }
interface Periodo { id: string; nome: string; tipo: string; numero: number }
interface NotaCell { nota_final: number | null; nota_recuperacao: number | null; faltas: number }
interface Avaliacao {
  avaliacao: string; tipo: string; presenca: string
  nota_lp: number | null; nota_mat: number | null; nota_ch: number | null
  nota_cn: number | null; nota_producao: number | null; media: number | null
  nivel: string | null; acertos_lp: number; acertos_mat: number; acertos_ch: number; acertos_cn: number
}
interface Frequencia { bimestre: number; periodo_nome: string; aulas_dadas: number; faltas: number; percentual: number | null }
interface BoletimData {
  aluno: {
    nome: string; codigo: string; serie: string; turma_codigo: string; turma_nome: string
    escola_nome: string; ano_letivo: string; situacao: string; pcd: boolean; data_nascimento: string
  }
  disciplinas: Disciplina[]
  periodos: Periodo[]
  notas: Record<string, Record<number, NotaCell>>
  avaliacoes_sisam: Avaliacao[]
  frequencia: Frequencia[]
  frequencia_geral: number | null
  total_faltas: number
  frequencia_diaria: { total_dias: number; dias_presente: number; primeira_data: string; ultima_data: string }
}

function cpfMask(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
}

function notaColor(n: number | null) {
  if (n === null) return 'text-gray-400'
  if (n >= 7) return 'text-blue-800'
  if (n >= 5) return 'text-amber-600'
  return 'text-red-600'
}

function notaBg(n: number | null) {
  if (n === null) return ''
  if (n >= 7) return 'bg-blue-50'
  if (n >= 5) return 'bg-amber-50'
  return 'bg-red-50'
}

function freqColor(p: number | null) {
  if (p === null) return 'text-gray-400'
  if (p >= 75) return 'text-blue-800'
  if (p >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function freqBarColor(p: number | null) {
  if (p === null) return 'bg-gray-300'
  if (p >= 75) return 'bg-blue-600'
  if (p >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function BoletimPage() {
  // formatSerie é função local (definida no topo do arquivo)
  const [modo, setModo] = useState<'codigo' | 'cpf'>('codigo')
  const [codigo, setCodigo] = useState('')
  const [cpf, setCpf] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState<BoletimData | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'boletim' | 'frequencia' | 'comunicados'>('boletim')
  const [freqDetalhada, setFreqDetalhada] = useState<any>(null)
  const [comunicados, setComunicados] = useState<any[]>([])
  const [carregandoExtra, setCarregandoExtra] = useState(false)

  const buscar = async () => {
    setErro('')
    setDados(null)
    setCarregando(true)

    const params = new URLSearchParams({ ano_letivo: anoLetivo })
    if (modo === 'codigo') {
      if (!codigo.trim()) { setErro('Informe o codigo do aluno.'); setCarregando(false); return }
      params.set('codigo', codigo.trim())
    } else {
      if (!cpf.trim() || !dataNasc) { setErro('Informe o CPF e a data de nascimento.'); setCarregando(false); return }
      params.set('cpf', cpf.trim())
      params.set('data_nascimento', dataNasc)
    }

    try {
      const res = await fetch(`/api/boletim?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem || 'Aluno nao encontrado.')
      } else {
        setDados(data)
      }
    } catch {
      setErro('Erro ao consultar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const carregarFrequencia = async () => {
    if (freqDetalhada) return
    setCarregandoExtra(true)
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (modo === 'codigo') params.set('codigo', codigo.trim())
      else { params.set('cpf', cpf.trim()); params.set('data_nascimento', dataNasc) }
      const res = await fetch(`/api/boletim/frequencia?${params}`)
      if (res.ok) setFreqDetalhada(await res.json())
    } catch {} finally { setCarregandoExtra(false) }
  }

  const carregarComunicados = async () => {
    if (comunicados.length > 0) return
    setCarregandoExtra(true)
    // Comunicados requerem turma_id (UUID) mas boletim público só tem turma_codigo
    // Skip silencioso — funcionalidade disponível apenas no portal do professor
    setCarregandoExtra(false)
  }

  const handleTabChange = (tab: 'boletim' | 'frequencia' | 'comunicados') => {
    setAbaAtiva(tab)
    if (tab === 'frequencia') carregarFrequencia()
    if (tab === 'comunicados') carregarComunicados()
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-slate-50 px-5 py-4 sm:py-5 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-semed.png" alt="SEMED" className="h-12 sm:h-14 w-auto object-contain" />
            <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
            <img src="/logo-prefeitura.png" alt="Prefeitura" className="h-12 sm:h-14 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-blue-900">Boletim Escolar</span>
              <p className="text-[10px] text-slate-400">SEMED — São Sebastião da Boa Vista</p>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-blue-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      {/* Print header — com logos e dados da escola */}
      <div className="hidden print:block py-4 border-b-2 border-gray-300 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-semed.png" alt="SEMED" className="h-16 w-auto" />
            <div className="w-px h-12 bg-gray-300" />
            <img src="/logo-prefeitura.png" alt="Prefeitura" className="h-16 w-auto" />
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold">Secretaria Municipal de Educação</h1>
            <p className="text-sm text-gray-500">São Sebastião da Boa Vista — Pará</p>
            <p className="text-base font-semibold mt-1">Boletim Escolar {anoLetivo}</p>
          </div>
        </div>
        {dados && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
            <div className="flex justify-between">
              <div>
                <strong>Aluno:</strong> {dados.aluno.nome}
              </div>
              <div>
                <strong>Código:</strong> {dados.aluno.codigo}
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <div>
                <strong>Escola:</strong> {dados.aluno.escola_nome}
              </div>
              <div>
                <strong>Turma:</strong> {dados.aluno.turma_codigo} — {formatSerie(dados.aluno.serie)}
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <div>
                <strong>Situação:</strong> {dados.aluno.situacao}
              </div>
              <div>
                <strong>Ano Letivo:</strong> {dados.aluno.ano_letivo}
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-8 flex-1">
        {/* Search */}
        {!dados && (
          <div className="w-full max-w-none">
            <div className="text-center mb-6 sm:mb-10">
              <h1 className="text-xl sm:text-4xl font-bold text-slate-800">Consulta de Boletim</h1>
              <p className="text-sm sm:text-lg text-slate-500 mt-1 sm:mt-3">Consulte as notas e frequência do aluno</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-10 lg:p-16 space-y-5 sm:space-y-8">
              {/* Modo toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button onClick={() => setModo('codigo')}
                  className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold transition-all ${modo === 'codigo' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Buscar por Codigo
                </button>
                <button onClick={() => setModo('cpf')}
                  className={`flex-1 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold transition-all ${modo === 'cpf' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Buscar por CPF
                </button>
              </div>

              {modo === 'codigo' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Codigo do Aluno</label>
                  <input type="search" inputMode="search" value={codigo} onChange={e => setCodigo(e.target.value)}
                    placeholder="Ex: NSL-2026-0001" className={inputClass}
                    onKeyDown={e => e.key === 'Enter' && buscar()} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF do Aluno</label>
                    <input type="text" inputMode="numeric" autoComplete="off" value={cpf} onChange={e => setCpf(cpfMask(e.target.value))}
                      placeholder="000.000.000-00" maxLength={14} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Data de Nascimento</label>
                    <input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)}
                      className={inputClass} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ano Letivo</label>
                <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)} className={inputClass}>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {erro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {erro}
                </div>
              )}

              <button onClick={buscar} disabled={carregando}
                className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold text-base sm:text-lg rounded-xl hover:from-blue-800 hover:to-blue-900 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {carregando ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Search className="w-5 h-5" /> Consultar Boletim</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Resultado */}
        {dados && (
          <div className="space-y-6">
            {/* Voltar + Imprimir */}
            <div className="flex items-center justify-between print:hidden">
              <button onClick={() => setDados(null)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Nova consulta
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            {/* Card do Aluno */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-2xl font-bold leading-tight">{dados.aluno.nome}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-blue-200 text-xs sm:text-sm">
                    <span className="flex items-center gap-1"><School className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {dados.aluno.escola_nome}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {dados.aluno.turma_codigo} - {formatSerie(dados.aluno.serie)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] sm:text-xs font-semibold">{dados.aluno.ano_letivo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                      dados.aluno.situacao === 'cursando' ? 'bg-white/20' :
                      dados.aluno.situacao === 'aprovado' ? 'bg-green-300/30' :
                      dados.aluno.situacao === 'reprovado' ? 'bg-red-400/30' : 'bg-amber-300/30'
                    }`}>{dados.aluno.situacao}</span>
                    {dados.aluno.pcd && (
                      <span className="px-2 py-0.5 bg-purple-400/30 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                        <Accessibility className="w-3 h-3" /> PCD
                      </span>
                    )}
                    {dados.aluno.codigo && (
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] sm:text-xs">{dados.aluno.codigo}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs de navegação */}
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 print:hidden">
              {[
                { key: 'boletim' as const, label: 'Boletim', icon: BookOpen },
                { key: 'frequencia' as const, label: 'Frequência', icon: CalendarCheck },
                { key: 'comunicados' as const, label: 'Comunicados', icon: Bell },
              ].map(tab => (
                <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    abaAtiva === tab.key ? 'bg-blue-50 text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo da aba Frequência Detalhada */}
            {abaAtiva === 'frequencia' && (
              <div className="space-y-4">
                {carregandoExtra ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : freqDetalhada ? (
                  <>
                    {/* Resumo geral */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Dias Letivos', value: freqDetalhada.totais.dias_letivos, color: 'text-slate-700' },
                        { label: 'Presenças', value: freqDetalhada.totais.presencas, color: 'text-blue-800' },
                        { label: 'Faltas', value: freqDetalhada.totais.faltas, color: 'text-red-600' },
                        { label: 'Frequência', value: freqDetalhada.totais.percentual !== null ? `${freqDetalhada.totais.percentual}%` : '-', color: freqDetalhada.totais.percentual >= 75 ? 'text-blue-800' : 'text-red-600' },
                      ].map((item, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                          <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Por bimestre */}
                    {freqDetalhada.frequencia_bimestral.length > 0 && (
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <BarChart3 className="w-5 h-5 text-blue-800" /> Frequência por Bimestre
                        </h3>
                        <div className="space-y-4">
                          {freqDetalhada.frequencia_bimestral.map((f: any) => (
                            <div key={f.bimestre}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-slate-700">{f.periodo_nome || `${f.bimestre}o Bimestre`}</span>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-slate-500">{f.dias_letivos} dias</span>
                                  <span className="text-blue-800 font-medium">{f.presencas}P</span>
                                  <span className="text-red-500 font-medium">{f.faltas}F</span>
                                  <span className={`font-bold text-sm ${f.percentual >= 75 ? 'text-blue-800' : f.percentual >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {f.percentual !== null ? `${f.percentual}%` : '-'}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                  f.percentual >= 75 ? 'bg-blue-600' : f.percentual >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`} style={{ width: `${Math.min(f.percentual || 0, 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Últimos dias */}
                    {freqDetalhada.frequencia_diaria?.length > 0 && (
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <CalendarCheck className="w-5 h-5 text-blue-800" /> Últimos Registros
                        </h3>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {freqDetalhada.frequencia_diaria.map((d: any, i: number) => (
                            <div key={i} className={`p-2 rounded-lg text-center text-xs ${
                              d.presente ? 'bg-blue-50 text-blue-900' : 'bg-red-50 text-red-700'
                            }`}>
                              <p className="font-bold">{d.presente ? 'P' : 'F'}</p>
                              <p className="text-[10px] opacity-70">{new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Dados de frequência não disponíveis</p>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da aba Comunicados */}
            {abaAtiva === 'comunicados' && (
              <div className="space-y-4">
                {carregandoExtra ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : comunicados.length > 0 ? (
                  comunicados.map((c: any, i: number) => (
                    <div key={c.id || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-slate-800">{c.titulo || c.assunto || 'Comunicado'}</h4>
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                          {c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{c.conteudo || c.mensagem || ''}</p>
                      {c.professor_nome && (
                        <p className="text-xs text-slate-400 mt-2">Prof. {c.professor_nome}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhum comunicado no momento</p>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo da aba Boletim (original) */}
            {abaAtiva === 'boletim' && (<>
            {/* Disciplinas e Notas */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-800" />
                <h3 className="font-bold text-sm sm:text-base text-slate-800">Notas por Disciplina</h3>
              </div>

              {dados.disciplinas.length > 0 && dados.periodos.length > 0 ? (<>
                {/* MOBILE: Cards por disciplina (visível apenas em mobile) */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {dados.disciplinas.map(disc => {
                    const notasDisc = dados.notas[disc.id] || {}
                    const valoresNotas = dados.periodos.map(p => notasDisc[p.numero]?.nota_final).filter((n): n is number => n !== null && n !== undefined)
                    const media = valoresNotas.length > 0 ? valoresNotas.reduce((a, b) => a + b, 0) / valoresNotas.length : null
                    return (
                      <div key={disc.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-slate-800">{disc.abreviacao || disc.codigo || disc.nome}</span>
                          <span className={`text-sm font-bold px-2 py-0.5 rounded ${notaBg(media)} ${notaColor(media)}`}>
                            Média: {media !== null ? media.toFixed(1) : '-'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {dados.periodos.map(p => {
                            const celula = notasDisc[p.numero]
                            const temNota = celula?.nota_final !== null && celula?.nota_final !== undefined
                            return (
                              <div key={p.id} className={`text-center py-1.5 rounded-lg ${temNota ? notaBg(celula?.nota_final ?? 0) : 'bg-gray-50'}`}>
                                <div className="text-[9px] text-slate-400 font-medium">{p.numero}ª Av.</div>
                                <div className={`text-sm font-bold ${temNota ? notaColor(celula?.nota_final ?? 0) : 'text-gray-300'}`}>
                                  {temNota && celula?.nota_final != null ? celula.nota_final.toFixed(1) : '-'}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* DESKTOP: Tabela tradicional (oculta em mobile) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Disciplina</th>
                        {dados.periodos.map(p => (
                          <th key={p.id} className="text-center px-3 py-3 font-semibold whitespace-nowrap">{p.nome}</th>
                        ))}
                        <th className="text-center px-3 py-3 font-semibold whitespace-nowrap bg-slate-100">Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.disciplinas.map(disc => {
                        const notasDisc = dados.notas[disc.id] || {}
                        const valoresNotas = dados.periodos.map(p => notasDisc[p.numero]?.nota_final).filter((n): n is number => n !== null && n !== undefined)
                        const media = valoresNotas.length > 0 ? valoresNotas.reduce((a, b) => a + b, 0) / valoresNotas.length : null

                        return (
                          <tr key={disc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                              {disc.nome}
                              <span className="ml-1 text-xs text-slate-400">({disc.abreviacao || disc.codigo})</span>
                            </td>
                            {dados.periodos.map(p => {
                              const celula = notasDisc[p.numero]
                              return (
                                <td key={p.id} className={`text-center px-3 py-3 ${celula?.nota_final !== null && celula?.nota_final !== undefined ? notaBg(celula.nota_final) : ''}`}>
                                  {celula?.nota_final !== null && celula?.nota_final !== undefined ? (
                                    <div>
                                      <span className={`font-bold ${notaColor(celula.nota_final)}`}>
                                        {celula.nota_final.toFixed(1)}
                                      </span>
                                      {celula.nota_recuperacao !== null && celula.nota_recuperacao !== undefined && (
                                        <div className="text-[10px] text-blue-500 mt-0.5">Rec: {celula.nota_recuperacao.toFixed(1)}</div>
                                      )}
                                      {celula.faltas > 0 && (
                                        <div className="text-[10px] text-red-400 mt-0.5">{celula.faltas}F</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className={`text-center px-3 py-3 bg-slate-50 ${notaBg(media)}`}>
                              <span className={`font-bold ${notaColor(media)}`}>
                                {media !== null ? media.toFixed(1) : '-'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>) : (
                <div className="px-6 py-8 text-center text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>{dados.disciplinas.length === 0 ? 'Nenhuma disciplina cadastrada' : 'Nenhum periodo letivo configurado'}</p>
                </div>
              )}
            </div>

            {/* Avaliacoes SISAM */}
            {dados.avaliacoes_sisam.length > 0 && (() => {
              const serieNum = parseInt((dados.aluno.serie || '').replace(/\D/g, '')) || 0
              const isIniciais = [1, 2, 3, 4, 5].includes(serieNum)

              const nivelBadge = (nivel: string | null) => {
                if (!nivel) return null
                const cls = nivel.includes('AVANC') ? 'bg-blue-100 text-blue-800' :
                  nivel.includes('ADEQU') ? 'bg-blue-50 text-blue-700' :
                  nivel.includes('BAS') ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{nivel}</span>
              }

              const presencaBadge = (p: string) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  p === 'P' ? 'bg-blue-100 text-blue-900' : 'bg-red-100 text-red-700'
                }`}>{p === 'P' ? 'Presente' : 'Faltou'}</span>
              )

              return (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    <h3 className="font-bold text-sm sm:text-base text-slate-800">Avaliacoes Municipais (SISAM)</h3>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs font-semibold rounded-full">
                    {dados.aluno.serie ? formatSerie(dados.aluno.serie) : ''} — {isIniciais ? 'Anos Iniciais' : 'Anos Finais'}
                  </span>
                </div>

                {/* MOBILE: Cards por avaliação */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {dados.avaliacoes_sisam.map((av, i) => (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-800">{av.avaliacao}</span>
                        <div className="flex items-center gap-2">
                          {presencaBadge(av.presenca)}
                          {nivelBadge(av.nivel)}
                        </div>
                      </div>
                      <div className={`grid ${isIniciais ? 'grid-cols-4' : 'grid-cols-5'} gap-1.5`}>
                        <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_lp)}`}>
                          <div className="text-[9px] text-slate-400 font-medium">LP</div>
                          <div className={`text-sm font-bold ${notaColor(av.nota_lp)}`}>{av.nota_lp?.toFixed(1) ?? '-'}</div>
                        </div>
                        <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_mat)}`}>
                          <div className="text-[9px] text-slate-400 font-medium">MAT</div>
                          <div className={`text-sm font-bold ${notaColor(av.nota_mat)}`}>{av.nota_mat?.toFixed(1) ?? '-'}</div>
                        </div>
                        {!isIniciais && (
                          <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_ch)}`}>
                            <div className="text-[9px] text-slate-400 font-medium">CH</div>
                            <div className={`text-sm font-bold ${notaColor(av.nota_ch)}`}>{av.nota_ch?.toFixed(1) ?? '-'}</div>
                          </div>
                        )}
                        {!isIniciais && (
                          <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_cn)}`}>
                            <div className="text-[9px] text-slate-400 font-medium">CN</div>
                            <div className={`text-sm font-bold ${notaColor(av.nota_cn)}`}>{av.nota_cn?.toFixed(1) ?? '-'}</div>
                          </div>
                        )}
                        {isIniciais && (
                          <div className={`text-center py-1.5 rounded-lg ${notaBg(av.nota_producao)}`}>
                            <div className="text-[9px] text-slate-400 font-medium">PROD</div>
                            <div className={`text-sm font-bold ${notaColor(av.nota_producao)}`}>{av.nota_producao?.toFixed(1) ?? '-'}</div>
                          </div>
                        )}
                        <div className={`text-center py-1.5 rounded-lg bg-slate-50 ${notaBg(av.media)}`}>
                          <div className="text-[9px] text-slate-400 font-medium">Media</div>
                          <div className={`text-sm font-bold ${notaColor(av.media)}`}>{av.media?.toFixed(1) ?? '-'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP: Tabela tradicional */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="text-left px-4 py-3 font-semibold">Avaliacao</th>
                        <th className="text-center px-3 py-3 font-semibold">Presenca</th>
                        <th className="text-center px-3 py-3 font-semibold">L. Portuguesa</th>
                        <th className="text-center px-3 py-3 font-semibold">Matematica</th>
                        {!isIniciais && <th className="text-center px-3 py-3 font-semibold">C. Humanas</th>}
                        {!isIniciais && <th className="text-center px-3 py-3 font-semibold">C. Natureza</th>}
                        {isIniciais && <th className="text-center px-3 py-3 font-semibold">Prod. Textual</th>}
                        <th className="text-center px-3 py-3 font-semibold bg-slate-100">Media</th>
                        <th className="text-center px-3 py-3 font-semibold">Nivel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.avaliacoes_sisam.map((av, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-slate-700">{av.avaliacao}</td>
                          <td className="text-center px-3 py-3">{presencaBadge(av.presenca)}</td>
                          <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_lp)}`}>{av.nota_lp?.toFixed(1) ?? '-'}</td>
                          <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_mat)}`}>{av.nota_mat?.toFixed(1) ?? '-'}</td>
                          {!isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_ch)}`}>{av.nota_ch?.toFixed(1) ?? '-'}</td>}
                          {!isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_cn)}`}>{av.nota_cn?.toFixed(1) ?? '-'}</td>}
                          {isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_producao)}`}>{av.nota_producao?.toFixed(1) ?? '-'}</td>}
                          <td className={`text-center px-3 py-3 bg-slate-50 font-bold ${notaColor(av.media)}`}>{av.media?.toFixed(1) ?? '-'}</td>
                          <td className="text-center px-3 py-3">{nivelBadge(av.nivel) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )
            })()}

            {/* Frequencia */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Frequencia geral */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center justify-center">
                <CalendarCheck className="w-8 h-8 text-blue-600 mb-3" />
                <p className={`text-5xl font-extrabold ${freqColor(dados.frequencia_geral)}`}>
                  {dados.frequencia_geral !== null ? `${dados.frequencia_geral}%` : '-'}
                </p>
                <p className="text-sm text-slate-500 mt-2">Frequencia Geral</p>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <span className="text-red-500 font-semibold">{dados.total_faltas} faltas</span>
                  {dados.frequencia_diaria.total_dias > 0 && (
                    <span className="text-slate-400">{dados.frequencia_diaria.dias_presente}/{dados.frequencia_diaria.total_dias} dias</span>
                  )}
                </div>
              </div>

              {/* Frequencia por bimestre */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-800" /> Frequencia por Periodo
                </h3>
                {dados.frequencia.length > 0 ? (
                  <div className="space-y-4">
                    {dados.frequencia.map(f => (
                      <div key={f.bimestre}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700">{f.periodo_nome}</span>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{f.aulas_dadas} aulas</span>
                            <span className="text-red-500 font-medium">{f.faltas} faltas</span>
                            <span className={`font-bold text-sm ${freqColor(f.percentual)}`}>
                              {f.percentual !== null ? `${f.percentual}%` : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${freqBarColor(f.percentual)}`}
                            style={{ width: `${Math.min(f.percentual || 0, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma frequencia registrada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Legenda */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 print:shadow-none">
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Nota &gt;= 7</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Nota 5 - 6.9</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Nota &lt; 5</span>
                <span className="flex items-center gap-1.5">Rec = Nota de Recuperacao</span>
                <span className="flex items-center gap-1.5">F = Faltas</span>
              </div>
            </div>
            </>)}
          </div>
        )}
      </main>
      <Rodape />
    </div>
  )
}
