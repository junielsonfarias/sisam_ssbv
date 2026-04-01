'use client'

import { useState } from 'react'
import {
  ArrowLeft, Accessibility, Printer, User, School, BookOpen,
  CalendarCheck, Bell, FileDown
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Rodape from '@/components/rodape'
import FormBuscaBoletim from './components/FormBuscaBoletim'
import TabelaNotas from './components/TabelaNotas'
import FrequenciaBoletim from './components/FrequenciaBoletim'
import FrequenciaDetalhada from './components/FrequenciaDetalhada'
import ComunicadosBoletim from './components/ComunicadosBoletim'

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

type AbaAtiva = 'boletim' | 'frequencia' | 'comunicados'

export default function BoletimPage() {
  const [modo, setModo] = useState<'codigo' | 'cpf'>('codigo')
  const [codigo, setCodigo] = useState('')
  const [cpf, setCpf] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState<BoletimData | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('boletim')
  const [freqDetalhada, setFreqDetalhada] = useState<any>(null)
  const [comunicadosTurma, setComunicadosTurma] = useState<any[]>([])
  const [publicacoesGerais, setPublicacoesGerais] = useState<any[]>([])
  const [carregandoExtra, setCarregandoExtra] = useState(false)

  /** Monta os query params para busca do aluno */
  const montarParams = () => {
    const params = new URLSearchParams({ ano_letivo: anoLetivo })
    if (modo === 'codigo') params.set('codigo', codigo.trim())
    else { params.set('cpf', cpf.trim()); params.set('data_nascimento', dataNasc) }
    return params
  }

  const buscar = async () => {
    setErro('')
    setDados(null)
    setFreqDetalhada(null)
    setComunicadosTurma([])
    setPublicacoesGerais([])
    setAbaAtiva('boletim')
    setCarregando(true)
    const params = new URLSearchParams({ ano_letivo: anoLetivo })
    if (modo === 'codigo') {
      if (!codigo.trim()) { setErro('Informe o código do aluno.'); setCarregando(false); return }
      params.set('codigo', codigo.trim())
    } else {
      if (!cpf.trim() || !dataNasc) { setErro('Informe o CPF e a data de nascimento.'); setCarregando(false); return }
      params.set('cpf', cpf.trim())
      params.set('data_nascimento', dataNasc)
    }
    try {
      const res = await fetch(`/api/boletim?${params}`)
      const data = await res.json()
      if (!res.ok) setErro(data.mensagem || 'Aluno não encontrado.')
      else setDados(data)
    } catch { setErro('Erro ao consultar. Tente novamente.') }
    finally { setCarregando(false) }
  }

  /** Carrega dados detalhados de frequência (lazy) */
  const carregarFrequencia = async () => {
    if (freqDetalhada) return
    setCarregandoExtra(true)
    try {
      const res = await fetch(`/api/boletim/frequencia?${montarParams()}`)
      if (res.ok) setFreqDetalhada(await res.json())
    } catch { /* silencioso */ } finally { setCarregandoExtra(false) }
  }

  /** Carrega comunicados da turma/escola (lazy) */
  const carregarComunicados = async () => {
    if (comunicadosTurma.length > 0 || publicacoesGerais.length > 0) return
    setCarregandoExtra(true)
    try {
      const res = await fetch(`/api/boletim/comunicados?${montarParams()}`)
      if (res.ok) {
        const data = await res.json()
        setComunicadosTurma(data.comunicados_turma || [])
        setPublicacoesGerais(data.publicacoes_gerais || [])
      }
    } catch { /* silencioso */ } finally { setCarregandoExtra(false) }
  }

  /** URL para download do PDF */
  const urlPdf = () => {
    const params = montarParams()
    return `/api/boletim/pdf?${params}`
  }

  const handleTabChange = (tab: AbaAtiva) => {
    setAbaAtiva(tab)
    if (tab === 'frequencia') carregarFrequencia()
    if (tab === 'comunicados') carregarComunicados()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-semed.png" alt="SEMED" width={56} height={56} className="h-12 sm:h-14 w-auto object-contain" />
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-600 flex-shrink-0" />
            <Image src="/logo-prefeitura.png" alt="Prefeitura" width={56} height={56} className="h-12 sm:h-14 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-300">Boletim Escolar</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">SEMED — São Sebastião da Boa Vista</p>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
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
            {/* Voltar + Ações */}
            <div className="flex items-center justify-between print:hidden">
              <button onClick={() => setDados(null)} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Nova consulta
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={urlPdf()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                  <FileDown className="w-4 h-4" /> Baixar PDF
                </a>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </div>
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
            <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-slate-700 print:hidden">
              {([
                { key: 'boletim' as const, label: 'Notas', icon: BookOpen },
                { key: 'frequencia' as const, label: 'Frequência', icon: CalendarCheck },
                { key: 'comunicados' as const, label: 'Comunicados', icon: Bell },
              ]).map(tab => (
                <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    abaAtiva === tab.key
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo da aba ativa */}
            {abaAtiva === 'frequencia' && (
              <FrequenciaDetalhada dados={freqDetalhada} carregando={carregandoExtra} />
            )}

            {abaAtiva === 'comunicados' && (
              <ComunicadosBoletim
                comunicadosTurma={comunicadosTurma}
                publicacoesGerais={publicacoesGerais}
                carregando={carregandoExtra}
              />
            )}

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
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 print:shadow-none">
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Nota &gt;= 7</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Nota 5 - 6.9</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Nota &lt; 5</span>
                  <span className="flex items-center gap-1.5">Rec = Nota de Recuperação</span>
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
