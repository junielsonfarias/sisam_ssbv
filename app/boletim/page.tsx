'use client'

import { useState } from 'react'
import {
  ArrowLeft, Accessibility, Printer, User, School, BookOpen,
  CalendarCheck, BarChart3, Bell, MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Rodape from '@/components/rodape'
import FormBuscaBoletim from './components/FormBuscaBoletim'
import TabelaNotas from './components/TabelaNotas'
import FrequenciaBoletim from './components/FrequenciaBoletim'

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

export default function BoletimPage() {
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
      if (!res.ok) setErro(data.mensagem || 'Aluno nao encontrado.')
      else setDados(data)
    } catch { setErro('Erro ao consultar. Tente novamente.') }
    finally { setCarregando(false) }
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
    setCarregandoExtra(false)
  }

  const handleTabChange = (tab: 'boletim' | 'frequencia' | 'comunicados') => {
    setAbaAtiva(tab)
    if (tab === 'frequencia') carregarFrequencia()
    if (tab === 'comunicados') carregarComunicados()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-semed.png" alt="SEMED" width={56} height={56} className="h-12 sm:h-14 w-auto object-contain" />
            <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
            <Image src="/logo-prefeitura.png" alt="Prefeitura" width={56} height={56} className="h-12 sm:h-14 w-auto object-contain" />
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

      {/* Print header */}
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
              <div><strong>Aluno:</strong> {dados.aluno.nome}</div>
              <div><strong>Código:</strong> {dados.aluno.codigo}</div>
            </div>
            <div className="flex justify-between mt-1">
              <div><strong>Escola:</strong> {dados.aluno.escola_nome}</div>
              <div><strong>Turma:</strong> {dados.aluno.turma_codigo} — {formatSerie(dados.aluno.serie)}</div>
            </div>
            <div className="flex justify-between mt-1">
              <div><strong>Situação:</strong> {dados.aluno.situacao}</div>
              <div><strong>Ano Letivo:</strong> {dados.aluno.ano_letivo}</div>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-8 flex-1">
        {/* Formulário de busca */}
        {!dados && (
          <FormBuscaBoletim
            modo={modo} onModoChange={setModo}
            codigo={codigo} onCodigoChange={setCodigo}
            cpf={cpf} onCpfChange={setCpf}
            dataNasc={dataNasc} onDataNascChange={setDataNasc}
            anoLetivo={anoLetivo} onAnoLetivoChange={setAnoLetivo}
            erro={erro} carregando={carregando} onBuscar={buscar}
          />
        )}

        {/* Resultado */}
        {dados && (
          <div className="space-y-6">
            {/* Voltar + Imprimir */}
            <div className="flex items-center justify-between print:hidden">
              <button onClick={() => setDados(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Nova consulta
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
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

            {/* Tabs */}
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

            {/* Aba Frequência Detalhada */}
            {abaAtiva === 'frequencia' && (
              <div className="space-y-4">
                {carregandoExtra ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : freqDetalhada ? (
                  <>
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

            {/* Aba Comunicados */}
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
                      {c.professor_nome && <p className="text-xs text-slate-400 mt-2">Prof. {c.professor_nome}</p>}
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

            {/* Aba Boletim */}
            {abaAtiva === 'boletim' && (<>
              <TabelaNotas
                disciplinas={dados.disciplinas}
                periodos={dados.periodos}
                notas={dados.notas}
                avaliacoes_sisam={dados.avaliacoes_sisam}
                serie={dados.aluno.serie}
                formatSerie={formatSerie}
              />

              <FrequenciaBoletim
                frequencia={dados.frequencia}
                frequencia_geral={dados.frequencia_geral}
                total_faltas={dados.total_faltas}
                frequencia_diaria={dados.frequencia_diaria}
              />

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
