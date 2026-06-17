'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Baby,
  Search,
  Eye,
  X,
  Users,
  Camera,
  Video,
  Mic,
  Pencil,
  MessageSquare,
  CheckCircle,
  FileText,
  Info,
  Image as ImageIcon,
  Volume2,
  ExternalLink,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAnoLetivo } from '@/lib/contexts/ano-letivo-context'

type TipoRegistro = 'foto' | 'video' | 'audio' | 'atividade' | 'observacao'
type CampoExperiencia = 'EOEU' | 'CG' | 'TS' | 'EF' | 'ET'
type Tab = 'portfolio' | 'relatorios'

interface Registro {
  id: string
  aluno_id: string
  aluno_nome: string
  aluno_matricula: string | null
  turma_codigo: string | null
  grupo_etario_nome: string | null
  escola_nome: string | null
  professor_nome: string | null
  data_registro: string
  tipo: TipoRegistro
  titulo: string | null
  descricao: string | null
  arquivo_url: string | null
  arquivo_tamanho_bytes: number | null
  campo_experiencia: CampoExperiencia | null
  habilidades_bncc: string[]
  visivel_responsavel: boolean
  criado_em: string
}

interface Relatorio {
  id: string
  aluno_id: string
  aluno_nome: string
  aluno_matricula: string | null
  turma_codigo: string | null
  grupo_etario_nome: string | null
  escola_nome: string | null
  professor_nome: string | null
  ano_letivo: string
  periodo: 'semestre_1' | 'semestre_2' | 'final'
  status: 'rascunho' | 'publicado' | 'entregue'
  eu_outro_nos: string | null
  corpo_gestos_movimentos: string | null
  tracos_sons_cores_formas: string | null
  escuta_fala_pensamento: string | null
  espacos_tempos_quantidades: string | null
  observacoes_gerais: string | null
  publicado_em: string | null
  entregue_em: string | null
  criado_em: string
  atualizado_em: string
}

interface StatsPortfolio {
  total: number
  alunos_distintos: number
  professores_distintos: number
  visiveis_pais: number
  fotos: number
  videos: number
  atividades: number
  observacoes: number
}

interface StatsRelatorios {
  total: number
  rascunhos: number
  publicados: number
  entregues: number
  alunos_distintos: number
}

interface Escola { id: string; nome: string }

const CAMPO_LABEL: Record<CampoExperiencia, string> = {
  EOEU: 'O eu, o outro e o nós',
  CG: 'Corpo, gestos e movimentos',
  TS: 'Traços, sons, cores e formas',
  EF: 'Escuta, fala, pensamento e imaginação',
  ET: 'Espaços, tempos, quantidades, relações e transformações',
}

const CAMPO_BADGE: Record<CampoExperiencia, string> = {
  EOEU: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  CG: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  TS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  EF: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const TIPO_ICONE: Record<TipoRegistro, typeof Camera> = {
  foto: Camera,
  video: Video,
  audio: Mic,
  atividade: Pencil,
  observacao: MessageSquare,
}

const TIPO_LABEL: Record<TipoRegistro, string> = {
  foto: 'Foto',
  video: 'Vídeo',
  audio: 'Áudio',
  atividade: 'Atividade',
  observacao: 'Observação',
}

const PERIODO_LABEL: Record<string, string> = {
  semestre_1: '1º Semestre',
  semestre_2: '2º Semestre',
  final: 'Anual / Final',
}

const STATUS_RELATORIO_BADGE: Record<string, string> = {
  rascunho: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  publicado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  entregue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function EdInfantilAdmin() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('portfolio')
  const [escolas, setEscolas] = useState<Escola[]>([])

  // Portfólio
  const [registros, setRegistros] = useState<Registro[]>([])
  const [statsPortfolio, setStatsPortfolio] = useState<StatsPortfolio | null>(null)
  const [carregandoP, setCarregandoP] = useState(true)
  const [filtroEscolaP, setFiltroEscolaP] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroCampo, setFiltroCampo] = useState('')
  const [buscaP, setBuscaP] = useState('')
  const [registroVis, setRegistroVis] = useState<Registro | null>(null)

  // Relatórios — ano sai do contexto global
  const { anoLetivo: filtroAno, setAnoLetivo: setFiltroAno, anosDisponiveis } = useAnoLetivo()
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [statsRel, setStatsRel] = useState<StatsRelatorios | null>(null)
  const [carregandoR, setCarregandoR] = useState(false)
  const [filtroEscolaR, setFiltroEscolaR] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [buscaR, setBuscaR] = useState('')
  const [relatorioVis, setRelatorioVis] = useState<Relatorio | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[EdInfantil] escolas', e) })
    return () => controller.abort()
  }, [])

  const carregarPortfolio = useCallback(async (signal?: AbortSignal) => {
    setCarregandoP(true)
    try {
      const p = new URLSearchParams({ limite: '200' })
      if (filtroAno) p.set('ano_letivo', filtroAno)
      if (filtroEscolaP) p.set('escola', filtroEscolaP)
      if (filtroTipo) p.set('tipo', filtroTipo)
      if (filtroCampo) p.set('campo', filtroCampo)
      if (buscaP.trim().length >= 2) p.set('busca', buscaP.trim())
      const res = await fetch(`/api/admin/ed-infantil/portfolio?${p}`, { signal })
      const data = await res.json()
      setRegistros(data.registros || [])
      setStatsPortfolio(data.estatisticas || null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar portfólio')
    } finally {
      setCarregandoP(false)
    }
  }, [filtroAno, filtroEscolaP, filtroTipo, filtroCampo, buscaP, toast])

  const carregarRelatorios = useCallback(async (signal?: AbortSignal) => {
    setCarregandoR(true)
    try {
      const p = new URLSearchParams({ limite: '200' })
      if (filtroEscolaR) p.set('escola', filtroEscolaR)
      if (filtroAno) p.set('ano', filtroAno)
      if (filtroPeriodo) p.set('periodo', filtroPeriodo)
      if (filtroStatus) p.set('status', filtroStatus)
      if (buscaR.trim().length >= 2) p.set('busca', buscaR.trim())
      const res = await fetch(`/api/admin/ed-infantil/relatorios?${p}`, { signal })
      const data = await res.json()
      setRelatorios(data.relatorios || [])
      setStatsRel(data.estatisticas || null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar relatórios')
    } finally {
      setCarregandoR(false)
    }
  }, [filtroEscolaR, filtroAno, filtroPeriodo, filtroStatus, buscaR, toast])

  useEffect(() => {
    if (tab !== 'portfolio') return
    const controller = new AbortController()
    const t = setTimeout(() => carregarPortfolio(controller.signal), 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [tab, carregarPortfolio])

  useEffect(() => {
    if (tab !== 'relatorios') return
    const controller = new AbortController()
    const t = setTimeout(() => carregarRelatorios(controller.signal), 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [tab, carregarRelatorios])

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <Baby className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Educação Infantil</h1>
            <p className="text-orange-100 text-sm">Portfólio multimídia e relatórios pedagógicos semestrais (Berçário · Maternal · Pré-escola)</p>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">Painel de acompanhamento — apenas consulta</p>
          <p>Os registros de portfólio (fotos, vídeos, atividades) e relatórios descritivos por campo de experiência BNCC são produzidos pelos professores em <code>/professor/ed-infantil</code>. Aqui você tem visão global, filtros e auditoria pedagógica.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setTab('portfolio')}
          className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition ${
            tab === 'portfolio'
              ? 'border-orange-500 text-orange-600 dark:text-orange-300'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <ImageIcon className="w-4 h-4 inline mr-1" /> Portfólio (registros)
        </button>
        <button
          onClick={() => setTab('relatorios')}
          className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition ${
            tab === 'relatorios'
              ? 'border-orange-500 text-orange-600 dark:text-orange-300'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1" /> Relatórios pedagógicos
        </button>
      </div>

      {tab === 'portfolio' && (
        <div>
          {/* KPIs portfólio */}
          {statsPortfolio && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{statsPortfolio.total}</p>
                <p className="text-xs text-orange-600">Total</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{statsPortfolio.alunos_distintos}</p>
                <p className="text-xs text-indigo-600">Alunos</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{statsPortfolio.professores_distintos}</p>
                <p className="text-xs text-emerald-600">Professores</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{statsPortfolio.visiveis_pais}</p>
                <p className="text-xs text-green-600">Vis. pais</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{statsPortfolio.fotos}</p>
                <p className="text-xs text-blue-600">Fotos</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{statsPortfolio.videos}</p>
                <p className="text-xs text-purple-600">Vídeos</p>
              </div>
              <div className="bg-pink-50 dark:bg-pink-900/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-pink-700 dark:text-pink-300">{statsPortfolio.atividades}</p>
                <p className="text-xs text-pink-600">Atividades</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700/30 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{statsPortfolio.observacoes}</p>
                <p className="text-xs text-slate-500">Observações</p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={buscaP}
                  onChange={(e) => setBuscaP(e.target.value)}
                  placeholder="Buscar aluno (mín. 2 chars)..."
                  className={`${inputCls} w-full pl-9`}
                />
              </div>
              <select value={filtroEscolaP} onChange={(e) => setFiltroEscolaP(e.target.value)} className={inputCls}>
                <option value="">Todas escolas</option>
                {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={inputCls}>
                <option value="">Todos tipos</option>
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filtroCampo} onChange={(e) => setFiltroCampo(e.target.value)} className={inputCls}>
                <option value="">Todos campos BNCC</option>
                {Object.entries(CAMPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Lista portfólio */}
          {carregandoP ? (
            <LoadingSpinner centered />
          ) : registros.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Baby className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum registro de portfólio encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {registros.map((reg) => {
                const Icone = TIPO_ICONE[reg.tipo]
                return (
                  <div key={reg.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <Icone className="w-4 h-4 text-orange-600 dark:text-orange-300" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{TIPO_LABEL[reg.tipo]}</p>
                          <p className="text-xs text-gray-500">{new Date(reg.data_registro).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setRegistroVis(reg)}
                        className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100"
                        title="Visualizar"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {reg.titulo && (
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1 line-clamp-1">{reg.titulo}</p>
                    )}

                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{reg.aluno_nome}</p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-1">
                      {reg.escola_nome && <span>{reg.escola_nome}</span>}
                      {reg.turma_codigo && <span>· Turma {reg.turma_codigo}</span>}
                      {reg.grupo_etario_nome && <span>· {reg.grupo_etario_nome}</span>}
                    </div>

                    {reg.campo_experiencia && (
                      <span className={`mt-2 self-start px-2 py-0.5 rounded text-[10px] font-bold ${CAMPO_BADGE[reg.campo_experiencia]}`}>
                        {reg.campo_experiencia}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-xs text-gray-500">👨‍🏫 {reg.professor_nome || '—'}</span>
                      {reg.visivel_responsavel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">
                          ✓ Pais
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'relatorios' && (
        <div>
          {statsRel && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 text-center">
                <FileText className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{statsRel.total}</p>
                <p className="text-xs text-orange-600">Total</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
                <Pencil className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{statsRel.rascunhos}</p>
                <p className="text-xs text-amber-600">Rascunhos</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                <CheckCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{statsRel.publicados}</p>
                <p className="text-xs text-blue-600">Publicados</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{statsRel.entregues}</p>
                <p className="text-xs text-green-600">Entregues</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 text-center">
                <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{statsRel.alunos_distintos}</p>
                <p className="text-xs text-indigo-600">Alunos</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={buscaR}
                  onChange={(e) => setBuscaR(e.target.value)}
                  placeholder="Buscar aluno (mín. 2 chars)..."
                  className={`${inputCls} w-full pl-9`}
                />
              </div>
              <select value={filtroEscolaR} onChange={(e) => setFiltroEscolaR(e.target.value)} className={inputCls}>
                <option value="">Todas escolas</option>
                {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className={inputCls} title="Ano letivo">
                {anosDisponiveis.map((a) => (
                  <option key={a.ano} value={a.ano}>
                    {a.ano}{a.ativo || a.status === 'ativo' ? ' (ativo)' : ''}
                  </option>
                ))}
              </select>
              <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className={inputCls}>
                <option value="">Todos períodos</option>
                <option value="semestre_1">1º Semestre</option>
                <option value="semestre_2">2º Semestre</option>
                <option value="final">Anual / Final</option>
              </select>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
                <option value="">Todos status</option>
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="entregue">Entregue</option>
              </select>
            </div>
          </div>

          {carregandoR ? (
            <LoadingSpinner centered />
          ) : relatorios.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum relatório encontrado com os filtros atuais</p>
            </div>
          ) : (
            <div className="space-y-2">
              {relatorios.map((rel) => (
                <div key={rel.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_RELATORIO_BADGE[rel.status]}`}>
                        {rel.status === 'rascunho' ? 'Rascunho' : rel.status === 'publicado' ? 'Publicado' : 'Entregue'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {rel.ano_letivo} · {PERIODO_LABEL[rel.periodo]}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {rel.aluno_nome}
                      {rel.aluno_matricula && <span className="text-gray-400 font-normal ml-2">#{rel.aluno_matricula}</span>}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      {rel.escola_nome && <span>{rel.escola_nome}</span>}
                      {rel.turma_codigo && <span>Turma {rel.turma_codigo}</span>}
                      {rel.grupo_etario_nome && <span>{rel.grupo_etario_nome}</span>}
                      {rel.professor_nome && <span>👨‍🏫 {rel.professor_nome}</span>}
                      <span>Atualizado em {new Date(rel.atualizado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRelatorioVis(rel)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold hover:bg-orange-200"
                  >
                    <Eye className="w-3 h-3" /> Visualizar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal portfólio */}
      {registroVis && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {registroVis.titulo || TIPO_LABEL[registroVis.tipo]}
                </h2>
                <p className="text-xs text-gray-500">
                  {registroVis.aluno_nome} · {new Date(registroVis.data_registro).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button onClick={() => setRegistroVis(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold">
                  {TIPO_LABEL[registroVis.tipo]}
                </span>
                {registroVis.campo_experiencia && (
                  <span className={`text-xs px-2 py-1 rounded font-bold ${CAMPO_BADGE[registroVis.campo_experiencia]}`}>
                    {registroVis.campo_experiencia} · {CAMPO_LABEL[registroVis.campo_experiencia]}
                  </span>
                )}
                {registroVis.visivel_responsavel ? (
                  <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">
                    ✓ Visível aos responsáveis
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    Privado (apenas professor)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Aluno</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">{registroVis.aluno_nome}</p>
                </div>
                {registroVis.escola_nome && (
                  <div>
                    <p className="text-xs text-gray-500">Escola</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{registroVis.escola_nome}</p>
                  </div>
                )}
                {registroVis.turma_codigo && (
                  <div>
                    <p className="text-xs text-gray-500">Turma</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                      {registroVis.turma_codigo}
                      {registroVis.grupo_etario_nome && ` · ${registroVis.grupo_etario_nome}`}
                    </p>
                  </div>
                )}
                {registroVis.professor_nome && (
                  <div>
                    <p className="text-xs text-gray-500">Professor</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{registroVis.professor_nome}</p>
                  </div>
                )}
              </div>

              {registroVis.descricao && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Descrição</p>
                  <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {registroVis.descricao}
                  </div>
                </div>
              )}

              {registroVis.arquivo_url && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Arquivo {formatarTamanho(registroVis.arquivo_tamanho_bytes) && `(${formatarTamanho(registroVis.arquivo_tamanho_bytes)})`}
                  </p>
                  {registroVis.tipo === 'foto' ? (
                    <a href={registroVis.arquivo_url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={registroVis.arquivo_url}
                        alt={registroVis.titulo || 'Foto'}
                        className="rounded-lg max-h-96 mx-auto border border-gray-200 dark:border-slate-700"
                      />
                    </a>
                  ) : registroVis.tipo === 'video' ? (
                    <video
                      src={registroVis.arquivo_url}
                      controls
                      className="rounded-lg max-h-96 w-full bg-black"
                    />
                  ) : registroVis.tipo === 'audio' ? (
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                      <Volume2 className="w-5 h-5 text-slate-600" />
                      <audio src={registroVis.arquivo_url} controls className="flex-1" />
                    </div>
                  ) : (
                    <a
                      href={registroVis.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold"
                    >
                      <ExternalLink className="w-4 h-4" /> Abrir arquivo
                    </a>
                  )}
                </div>
              )}

              {(registroVis.habilidades_bncc?.length || 0) > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Habilidades BNCC ({registroVis.habilidades_bncc.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {registroVis.habilidades_bncc.map((h) => (
                      <span key={h} className="px-2 py-1 rounded text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-mono border border-orange-200 dark:border-orange-800">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal relatório */}
      {relatorioVis && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  Relatório de {relatorioVis.aluno_nome}
                </h2>
                <p className="text-xs text-gray-500">
                  {relatorioVis.ano_letivo} · {PERIODO_LABEL[relatorioVis.periodo]}
                  {relatorioVis.escola_nome && ` · ${relatorioVis.escola_nome}`}
                </p>
              </div>
              <button onClick={() => setRelatorioVis(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_RELATORIO_BADGE[relatorioVis.status]}`}>
                  {relatorioVis.status === 'rascunho' ? 'Rascunho' : relatorioVis.status === 'publicado' ? 'Publicado' : 'Entregue'}
                </span>
                {relatorioVis.publicado_em && (
                  <span className="text-xs text-gray-500">Publicado em {new Date(relatorioVis.publicado_em).toLocaleDateString('pt-BR')}</span>
                )}
                {relatorioVis.entregue_em && (
                  <span className="text-xs text-gray-500">Entregue em {new Date(relatorioVis.entregue_em).toLocaleDateString('pt-BR')}</span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm pb-4 border-b border-gray-200 dark:border-slate-700">
                {relatorioVis.turma_codigo && (
                  <div>
                    <p className="text-xs text-gray-500">Turma</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{relatorioVis.turma_codigo}</p>
                  </div>
                )}
                {relatorioVis.grupo_etario_nome && (
                  <div>
                    <p className="text-xs text-gray-500">Grupo etário</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{relatorioVis.grupo_etario_nome}</p>
                  </div>
                )}
                {relatorioVis.professor_nome && (
                  <div>
                    <p className="text-xs text-gray-500">Professor</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{relatorioVis.professor_nome}</p>
                  </div>
                )}
              </div>

              {[
                { campo: 'eu_outro_nos', titulo: 'O eu, o outro e o nós (EOEU)', cor: 'pink' },
                { campo: 'corpo_gestos_movimentos', titulo: 'Corpo, gestos e movimentos (CG)', cor: 'orange' },
                { campo: 'tracos_sons_cores_formas', titulo: 'Traços, sons, cores e formas (TS)', cor: 'purple' },
                { campo: 'escuta_fala_pensamento', titulo: 'Escuta, fala, pensamento e imaginação (EF)', cor: 'blue' },
                { campo: 'espacos_tempos_quantidades', titulo: 'Espaços, tempos, quantidades, relações e transformações (ET)', cor: 'green' },
              ].map(({ campo, titulo, cor }) => {
                const texto = (relatorioVis as unknown as Record<string, string | null>)[campo]
                if (!texto) return null
                return (
                  <div key={campo}>
                    <p className={`text-xs font-bold text-${cor}-700 dark:text-${cor}-300 mb-2`}>{titulo}</p>
                    <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {texto}
                    </div>
                  </div>
                )
              })}

              {relatorioVis.observacoes_gerais && (
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Observações gerais</p>
                  <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {relatorioVis.observacoes_gerais}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EdInfantilAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <EdInfantilAdmin />
    </ProtectedRoute>
  )
}
