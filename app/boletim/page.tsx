'use client'

import { useState } from 'react'
import {
  Search, GraduationCap, BookOpen, CalendarCheck, Printer,
  ArrowLeft, Accessibility, AlertTriangle, Award, BarChart3,
  ClipboardCheck, User, School, Clock, MessageSquare, Bell
} from 'lucide-react'
import Link from 'next/link'
import Rodape from '@/components/rodape'
import { useSeries } from '@/lib/use-series'

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
  if (n >= 7) return 'text-emerald-600'
  if (n >= 5) return 'text-amber-600'
  return 'text-red-600'
}

function notaBg(n: number | null) {
  if (n === null) return ''
  if (n >= 7) return 'bg-emerald-50'
  if (n >= 5) return 'bg-amber-50'
  return 'bg-red-50'
}

function freqColor(p: number | null) {
  if (p === null) return 'text-gray-400'
  if (p >= 75) return 'text-emerald-600'
  if (p >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function freqBarColor(p: number | null) {
  if (p === null) return 'bg-gray-300'
  if (p >= 75) return 'bg-emerald-500'
  if (p >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function BoletimPage() {
  const { formatSerie } = useSeries()
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
    try {
      const res = await fetch('/api/comunicados?limite=10')
      if (res.ok) {
        const data = await res.json()
        setComunicados(Array.isArray(data) ? data : data.comunicados || [])
      }
    } catch {} finally { setCarregandoExtra(false) }
  }

  const handleTabChange = (tab: 'boletim' | 'frequencia' | 'comunicados') => {
    setAbaAtiva(tab)
    if (tab === 'frequencia') carregarFrequencia()
    if (tab === 'comunicados') carregarComunicados()
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-slate-800 hover:text-emerald-600 transition-colors">
            <div className="p-2 rounded-xl bg-emerald-50">
              <GraduationCap className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <span className="font-bold text-lg">SEMED</span>
              <p className="text-xs text-slate-400">Consulta de Boletim Escolar</p>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao site
          </Link>
        </div>
      </header>

      {/* Print header */}
      <div className="hidden print:block text-center py-4 border-b-2 border-gray-300 mb-6">
        <h1 className="text-xl font-bold">SEMED - Secretaria Municipal de Educacao</h1>
        <p className="text-sm text-gray-500">Sao Sebastiao da Boa Vista - PA</p>
        <p className="text-lg font-semibold mt-2">Boletim Escolar {anoLetivo}</p>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search */}
        {!dados && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Consulta de Boletim</h1>
              <p className="text-slate-500 mt-2">Consulte as notas e frequencia do aluno</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">
              {/* Modo toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button onClick={() => setModo('codigo')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${modo === 'codigo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Buscar por Codigo
                </button>
                <button onClick={() => setModo('cpf')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${modo === 'cpf' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Buscar por CPF
                </button>
              </div>

              {modo === 'codigo' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Codigo do Aluno</label>
                  <input type="text" value={codigo} onChange={e => setCodigo(e.target.value)}
                    placeholder="Ex: NSL-2026-0001" className={inputClass}
                    onKeyDown={e => e.key === 'Enter' && buscar()} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF do Aluno</label>
                    <input type="text" value={cpf} onChange={e => setCpf(cpfMask(e.target.value))}
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
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
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
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Nova consulta
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            {/* Card do Aluno */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">{dados.aluno.nome}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-emerald-100 text-sm">
                      <span className="flex items-center gap-1"><School className="w-3.5 h-3.5" /> {dados.aluno.escola_nome}</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {dados.aluno.turma_codigo} - {formatSerie(dados.aluno.serie)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">{dados.aluno.ano_letivo}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    dados.aluno.situacao === 'cursando' ? 'bg-white/20' :
                    dados.aluno.situacao === 'aprovado' ? 'bg-emerald-300/30' :
                    dados.aluno.situacao === 'reprovado' ? 'bg-red-400/30' : 'bg-amber-300/30'
                  }`}>{dados.aluno.situacao}</span>
                  {dados.aluno.pcd && (
                    <span className="px-3 py-1 bg-purple-400/30 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Accessibility className="w-3 h-3" /> PCD
                    </span>
                  )}
                  {dados.aluno.codigo && (
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">{dados.aluno.codigo}</span>
                  )}
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
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    abaAtiva === tab.key ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo da aba Frequência Detalhada */}
            {abaAtiva === 'frequencia' && (
              <div className="space-y-4">
                {carregandoExtra ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : freqDetalhada ? (
                  <>
                    {/* Resumo geral */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Dias Letivos', value: freqDetalhada.totais.dias_letivos, color: 'text-slate-700' },
                        { label: 'Presenças', value: freqDetalhada.totais.presencas, color: 'text-emerald-600' },
                        { label: 'Faltas', value: freqDetalhada.totais.faltas, color: 'text-red-600' },
                        { label: 'Frequência', value: freqDetalhada.totais.percentual !== null ? `${freqDetalhada.totais.percentual}%` : '-', color: freqDetalhada.totais.percentual >= 75 ? 'text-emerald-600' : 'text-red-600' },
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
                          <BarChart3 className="w-5 h-5 text-emerald-600" /> Frequência por Bimestre
                        </h3>
                        <div className="space-y-4">
                          {freqDetalhada.frequencia_bimestral.map((f: any) => (
                            <div key={f.bimestre}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-slate-700">{f.periodo_nome || `${f.bimestre}o Bimestre`}</span>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-slate-500">{f.dias_letivos} dias</span>
                                  <span className="text-emerald-600 font-medium">{f.presencas}P</span>
                                  <span className="text-red-500 font-medium">{f.faltas}F</span>
                                  <span className={`font-bold text-sm ${f.percentual >= 75 ? 'text-emerald-600' : f.percentual >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {f.percentual !== null ? `${f.percentual}%` : '-'}
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                  f.percentual >= 75 ? 'bg-emerald-500' : f.percentual >= 50 ? 'bg-amber-500' : 'bg-red-500'
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
                          <CalendarCheck className="w-5 h-5 text-emerald-600" /> Últimos Registros
                        </h3>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {freqDetalhada.frequencia_diaria.map((d: any, i: number) => (
                            <div key={i} className={`p-2 rounded-lg text-center text-xs ${
                              d.presente ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
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
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
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
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">Notas por Disciplina</h3>
              </div>
              <div className="overflow-x-auto">
                {dados.disciplinas.length > 0 && dados.periodos.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Disciplina</th>
                        {dados.periodos.map(p => (
                          <th key={p.id} className="text-center px-3 py-3 font-semibold whitespace-nowrap">{p.nome}</th>
                        ))}
                        <th className="text-center px-3 py-3 font-semibold whitespace-nowrap bg-slate-100">Media</th>
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
                ) : (
                  <div className="px-6 py-8 text-center text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{dados.disciplinas.length === 0 ? 'Nenhuma disciplina cadastrada' : 'Nenhum periodo letivo configurado'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Avaliacoes Educatec */}
            {dados.avaliacoes_sisam.length > 0 && (() => {
              const serieNum = parseInt((dados.aluno.serie || '').replace(/\D/g, '')) || 0
              const isIniciais = [1, 2, 3, 4, 5].includes(serieNum)
              return (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800">Avaliacoes Municipais (SISAM)</h3>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                    {dados.aluno.serie ? formatSerie(dados.aluno.serie) : ''} — {isIniciais ? 'Anos Iniciais' : 'Anos Finais'}
                  </span>
                </div>
                <div className="overflow-x-auto">
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
                          <td className="text-center px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              av.presenca === 'P' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>{av.presenca === 'P' ? 'Presente' : 'Faltou'}</span>
                          </td>
                          <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_lp)}`}>{av.nota_lp?.toFixed(1) ?? '-'}</td>
                          <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_mat)}`}>{av.nota_mat?.toFixed(1) ?? '-'}</td>
                          {!isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_ch)}`}>{av.nota_ch?.toFixed(1) ?? '-'}</td>}
                          {!isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_cn)}`}>{av.nota_cn?.toFixed(1) ?? '-'}</td>}
                          {isIniciais && <td className={`text-center px-3 py-3 font-bold ${notaColor(av.nota_producao)}`}>{av.nota_producao?.toFixed(1) ?? '-'}</td>}
                          <td className={`text-center px-3 py-3 bg-slate-50 font-bold ${notaColor(av.media)}`}>{av.media?.toFixed(1) ?? '-'}</td>
                          <td className="text-center px-3 py-3">
                            {av.nivel ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                av.nivel.includes('AVANC') ? 'bg-emerald-100 text-emerald-700' :
                                av.nivel.includes('ADEQU') ? 'bg-blue-100 text-blue-700' :
                                av.nivel.includes('BAS') ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>{av.nivel}</span>
                            ) : '-'}
                          </td>
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
                <CalendarCheck className="w-8 h-8 text-emerald-500 mb-3" />
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
                  <BarChart3 className="w-5 h-5 text-emerald-600" /> Frequencia por Periodo
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
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Nota &gt;= 7</span>
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
