'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileText,
  Search,
  Filter,
  Eye,
  X,
  Users,
  Edit3,
  CheckCircle,
  GraduationCap,
  Info,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Avaliacao {
  id: string
  aluno_id: string
  aluno_nome: string
  aluno_matricula: string | null
  turma_codigo: string | null
  escola_nome: string | null
  disciplina_nome: string | null
  periodo_nome: string | null
  professor_nome: string | null
  texto_descritivo: string
  conceito: string | null
  habilidades_avaliadas: string[]
  status: 'rascunho' | 'publicada'
  criado_em: string
  atualizado_em: string
}

interface Estatisticas {
  total: number
  rascunhos: number
  publicadas: number
  alunos_distintos: number
  professores_distintos: number
}

interface Escola {
  id: string
  nome: string
}

const CONCEITO_LABEL: Record<string, string> = {
  plenamente_satisfatorio: 'Plenamente Satisfatório',
  satisfatorio: 'Satisfatório',
  em_desenvolvimento: 'Em Desenvolvimento',
  insuficiente: 'Insuficiente',
  consolidado: 'Consolidado',
  em_processo: 'Em Processo',
  nao_observado: 'Não Observado',
}

const CONCEITO_BADGE: Record<string, string> = {
  plenamente_satisfatorio: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  satisfatorio: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  em_desenvolvimento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  insuficiente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  consolidado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  em_processo: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  nao_observado: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
}

const STATUS_BADGE: Record<string, string> = {
  rascunho: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  publicada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

function AvaliacoesDescritivasAdmin() {
  const toast = useToast()
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()))
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroConceito, setFiltroConceito] = useState('')
  const [busca, setBusca] = useState('')

  // Modal de visualização
  const [avaliacaoVisualizando, setAvaliacaoVisualizando] = useState<Avaliacao | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[AvDescritivas] escolas', e) })
    return () => controller.abort()
  }, [])

  const carregar = useCallback(async (signal?: AbortSignal) => {
    setCarregando(true)
    try {
      const p = new URLSearchParams({ limite: '200' })
      if (filtroAno) p.set('ano_letivo', filtroAno)
      if (filtroEscola) p.set('escola', filtroEscola)
      if (filtroStatus) p.set('status', filtroStatus)
      if (filtroConceito) p.set('conceito', filtroConceito)
      if (busca.trim().length >= 2) p.set('busca', busca.trim())
      const res = await fetch(`/api/admin/avaliacoes-descritivas?${p}`, { signal })
      const data = await res.json()
      setAvaliacoes(data.avaliacoes || [])
      setEstatisticas(data.estatisticas || null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar avaliações')
    } finally {
      setCarregando(false)
    }
  }, [filtroAno, filtroEscola, filtroStatus, filtroConceito, busca, toast])

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => carregar(controller.signal), 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [carregar])

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-pink-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Avaliações Descritivas</h1>
            <p className="text-pink-100 text-sm">Pareceres qualitativos de anos iniciais e Educação Infantil</p>
          </div>
        </div>
      </div>

      {/* Aviso */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">Painel de acompanhamento pedagógico</p>
          <p>Esta página é apenas para <strong>consulta</strong>. A emissão e edição de avaliações descritivas são responsabilidade dos professores em <code>/professor/notas</code>. Aqui você visualiza o panorama, filtra por escola/professor/status e auditoria pedagógica.</p>
        </div>
      </div>

      {/* KPIs */}
      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-pink-50 dark:bg-pink-900/30 rounded-xl p-4 text-center">
            <FileText className="w-5 h-5 text-pink-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">{estatisticas.total}</p>
            <p className="text-xs text-pink-600">Total</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{estatisticas.publicadas}</p>
            <p className="text-xs text-green-600">Publicadas</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
            <Edit3 className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{estatisticas.rascunhos}</p>
            <p className="text-xs text-amber-600">Em rascunho</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{estatisticas.alunos_distintos}</p>
            <p className="text-xs text-indigo-600">Alunos avaliados</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 text-center">
            <GraduationCap className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{estatisticas.professores_distintos}</p>
            <p className="text-xs text-emerald-600">Professores ativos</p>
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
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome do aluno (mín. 2 chars)..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <input
            type="number"
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            min="2020"
            max="2099"
            placeholder="Ano"
            className={`${inputCls} w-24`}
            title="Ano letivo"
          />
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas escolas</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
            <option value="">Todos status</option>
            <option value="publicada">Publicadas</option>
            <option value="rascunho">Rascunhos</option>
          </select>
          <select value={filtroConceito} onChange={(e) => setFiltroConceito(e.target.value)} className={inputCls}>
            <option value="">Todos conceitos</option>
            {Object.entries(CONCEITO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <LoadingSpinner centered />
      ) : avaliacoes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma avaliação descritiva encontrada com os filtros atuais</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avaliacoes.map((av) => (
            <div key={av.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[av.status]}`}>
                      {av.status === 'publicada' ? 'Publicada' : 'Rascunho'}
                    </span>
                    {av.conceito && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CONCEITO_BADGE[av.conceito] || 'bg-slate-100 text-slate-700'}`}>
                        {CONCEITO_LABEL[av.conceito] || av.conceito}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {av.aluno_nome}
                    {av.aluno_matricula && <span className="text-gray-400 font-normal ml-2">#{av.aluno_matricula}</span>}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                    {av.escola_nome && <span>{av.escola_nome}</span>}
                    {av.turma_codigo && <span>Turma {av.turma_codigo}</span>}
                    {av.disciplina_nome && <span>📚 {av.disciplina_nome}</span>}
                    {av.periodo_nome && <span>📅 {av.periodo_nome}</span>}
                    {av.professor_nome && <span>👨‍🏫 {av.professor_nome}</span>}
                    <span>Atualizado em {new Date(av.atualizado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <button
                  onClick={() => setAvaliacaoVisualizando(av)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-bold hover:bg-pink-200"
                >
                  <Eye className="w-3 h-3" /> Visualizar
                </button>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {av.texto_descritivo}
              </p>
              {(av.habilidades_avaliadas?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {av.habilidades_avaliadas.slice(0, 5).map((h) => (
                    <span key={h} className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                      {h}
                    </span>
                  ))}
                  {av.habilidades_avaliadas.length > 5 && (
                    <span className="px-2 py-0.5 rounded text-xs text-slate-500">
                      +{av.habilidades_avaliadas.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualização completa */}
      {avaliacaoVisualizando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {avaliacaoVisualizando.aluno_nome}
                </h2>
                <p className="text-xs text-gray-500">
                  {avaliacaoVisualizando.escola_nome}
                  {avaliacaoVisualizando.turma_codigo && ` • Turma ${avaliacaoVisualizando.turma_codigo}`}
                </p>
              </div>
              <button onClick={() => setAvaliacaoVisualizando(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[avaliacaoVisualizando.status]}`}>
                  {avaliacaoVisualizando.status === 'publicada' ? 'Publicada' : 'Rascunho'}
                </span>
                {avaliacaoVisualizando.conceito && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CONCEITO_BADGE[avaliacaoVisualizando.conceito] || 'bg-slate-100 text-slate-700'}`}>
                    {CONCEITO_LABEL[avaliacaoVisualizando.conceito]}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {avaliacaoVisualizando.disciplina_nome && (
                  <div>
                    <p className="text-xs text-gray-500">Disciplina</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{avaliacaoVisualizando.disciplina_nome}</p>
                  </div>
                )}
                {avaliacaoVisualizando.periodo_nome && (
                  <div>
                    <p className="text-xs text-gray-500">Período</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{avaliacaoVisualizando.periodo_nome}</p>
                  </div>
                )}
                {avaliacaoVisualizando.professor_nome && (
                  <div>
                    <p className="text-xs text-gray-500">Professor</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{avaliacaoVisualizando.professor_nome}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Última atualização</p>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {new Date(avaliacaoVisualizando.atualizado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Texto descritivo</p>
                <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {avaliacaoVisualizando.texto_descritivo}
                </div>
              </div>

              {(avaliacaoVisualizando.habilidades_avaliadas?.length || 0) > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                    Habilidades BNCC avaliadas ({avaliacaoVisualizando.habilidades_avaliadas.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {avaliacaoVisualizando.habilidades_avaliadas.map((h) => (
                      <span key={h} className="px-2 py-1 rounded text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 font-mono border border-pink-200 dark:border-pink-800">
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
    </div>
  )
}

export default function AvaliacoesDescritivasAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <AvaliacoesDescritivasAdmin />
    </ProtectedRoute>
  )
}
