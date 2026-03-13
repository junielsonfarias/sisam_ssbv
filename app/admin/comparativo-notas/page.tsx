'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  BarChart3, Search, TrendingUp, TrendingDown, Minus, AlertTriangle,
  ArrowRight, Printer, Users, BookOpen, FileText
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// ============================================
// Tipos
// ============================================

interface EscolaSimples { id: string; nome: string }
interface TurmaSimples { id: string; codigo: string; nome: string | null; serie: string }

interface ComparativoAluno {
  aluno_id: string
  aluno_nome: string
  aluno_codigo: string | null
  serie: string | null
  turma_codigo: string | null
  sisam_media: number | null
  sisam_lp: number | null
  sisam_mat: number | null
  escolar_media: number | null
  escolar_lp: number | null
  escolar_mat: number | null
  comparativos: {
    disciplina: string
    sisam_codigo: string
    sisam_nota: number | null
    escolar_media: number | null
    delta: number | null
  }[]
  tem_dados_sisam: boolean
  tem_dados_escolar: boolean
}

interface Resumo {
  total_alunos: number
  com_ambos_dados: number
  apenas_sisam: number
  apenas_escolar: number
  sem_dados: number
  media_sisam: number | null
  media_escolar: number | null
  delta_geral: number | null
  discrepancias_altas: number
  discrepancias_baixas: number
  por_disciplina: {
    disciplina: string
    codigo: string
    media_sisam: number | null
    media_escolar: number | null
    delta: number | null
  }[]
}

// ============================================
// Componente Principal
// ============================================

export default function ComparativoNotasPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])

  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  const [alunos, setAlunos] = useState<ComparativoAluno[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [pesquisado, setPesquisado] = useState(false)

  // Init
  useEffect(() => {
    fetch('/api/auth/verificar')
      .then(r => r.json())
      .then(data => {
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          if (data.usuario.escola_id) {
            setEscolaIdUsuario(data.usuario.escola_id)
            setEscolaId(data.usuario.escola_id)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Escolas
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Turmas
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}&ano_letivo=${anoLetivo}`)
        .then(r => r.json())
        .then(data => setTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
    setTurmaId('')
  }, [escolaId, anoLetivo])

  const pesquisar = async () => {
    if (!escolaId && !turmaId) {
      toast.error('Selecione uma escola ou turma')
      return
    }

    setCarregando(true)
    setPesquisado(true)
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (turmaId) params.set('turma_id', turmaId)
      else if (escolaId) params.set('escola_id', escolaId)

      const res = await fetch(`/api/admin/comparativo-notas?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAlunos(data.alunos || [])
        setResumo(data.resumo || null)
      } else {
        toast.error('Erro ao buscar dados')
      }
    } catch (e) {
      toast.error('Erro ao buscar comparativo')
    } finally {
      setCarregando(false)
    }
  }

  const imprimirComparativo = () => {
    if (!resumo || alunos.length === 0) return
    const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

    const linhas = alunos.filter(a => a.tem_dados_sisam || a.tem_dados_escolar).map(a => {
      const delta = a.sisam_media !== null && a.escolar_media !== null
        ? (a.escolar_media - a.sisam_media).toFixed(1)
        : '-'
      const corDelta = parseFloat(delta) > 0 ? 'color:#16a34a' : parseFloat(delta) < 0 ? 'color:#dc2626' : ''
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${esc(a.aluno_nome)}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:11px">${a.sisam_lp?.toFixed(1) ?? '-'}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:11px">${a.sisam_mat?.toFixed(1) ?? '-'}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:11px;font-weight:bold">${a.sisam_media?.toFixed(1) ?? '-'}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:11px">${a.escolar_lp?.toFixed(1) ?? '-'}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:11px">${a.escolar_mat?.toFixed(1) ?? '-'}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:11px;font-weight:bold">${a.escolar_media?.toFixed(1) ?? '-'}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;text-align:center;font-size:11px;${corDelta}">${delta}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><title>Comparativo SISAM x Notas Escolares</title>
      <style>body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}@media print{body{margin:10px}}</style></head><body>
      <h2 style="text-align:center">Comparativo SISAM x Notas Escolares - ${esc(anoLetivo)}</h2>
      <table><thead><tr>
        <th style="padding:6px 8px;border:1px solid #ddd;background:#e8f0fe;font-size:11px" rowspan="2">Aluno</th>
        <th style="padding:6px 8px;border:1px solid #ddd;background:#dbeafe;font-size:11px" colspan="3">SISAM</th>
        <th style="padding:6px 8px;border:1px solid #ddd;background:#d1fae5;font-size:11px" colspan="3">Escola</th>
        <th style="padding:6px 8px;border:1px solid #ddd;background:#fef3c7;font-size:11px" rowspan="2">Delta</th>
      </tr><tr>
        <th style="padding:4px 8px;border:1px solid #ddd;background:#dbeafe;font-size:10px">LP</th>
        <th style="padding:4px 8px;border:1px solid #ddd;background:#dbeafe;font-size:10px">MAT</th>
        <th style="padding:4px 8px;border:1px solid #ddd;background:#dbeafe;font-size:10px">Média</th>
        <th style="padding:4px 8px;border:1px solid #ddd;background:#d1fae5;font-size:10px">LP</th>
        <th style="padding:4px 8px;border:1px solid #ddd;background:#d1fae5;font-size:10px">MAT</th>
        <th style="padding:4px 8px;border:1px solid #ddd;background:#d1fae5;font-size:10px">Média</th>
      </tr></thead><tbody>${linhas}</tbody></table>
      <p style="font-size:10px;color:#888;margin-top:10px">Delta = Nota Escolar - Nota SISAM. Positivo = escola acima do SISAM.</p>
      <script>window.print()</script></body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Comparativo SISAM x Notas Escolares</h1>
              <p className="text-sm opacity-90">Compare o desempenho dos alunos nas avaliações municipais com as notas da escola</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
              <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
                <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                  <option value="">Selecione...</option>
                  {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma (opcional)</label>
              <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                <option value="">Todas as turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo} - {t.nome || t.serie}</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button onClick={pesquisar} disabled={carregando || (!escolaId && !turmaId)}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors">
                <Search className="w-4 h-4" />
                {carregando ? 'Pesquisando...' : 'Comparar'}
              </button>
            </div>
          </div>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando comparativo..." centered />
        ) : pesquisado && resumo ? (
          <>
            {/* Cards Resumo */}
            <CardsResumo resumo={resumo} />

            {/* Comparativo por Disciplina */}
            {resumo.por_disciplina.length > 0 && (
              <ComparativoDisciplinas disciplinas={resumo.por_disciplina} />
            )}

            {/* Alertas de Discrepância */}
            {(resumo.discrepancias_altas > 0 || resumo.discrepancias_baixas > 0) && (
              <AlertasDiscrepancia resumo={resumo} />
            )}

            {/* Tabela de Alunos */}
            <TabelaComparativa alunos={alunos} onImprimir={imprimirComparativo} />
          </>
        ) : pesquisado ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center text-gray-500 dark:text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">Nenhum dado encontrado</p>
            <p className="text-sm mt-1">Verifique os filtros e tente novamente</p>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Cards Resumo
// ============================================

function CardsResumo({ resumo }: { resumo: Resumo }) {
  const deltaIcon = resumo.delta_geral !== null
    ? resumo.delta_geral > 0 ? <TrendingUp className="w-5 h-5" /> : resumo.delta_geral < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />
    : null

  const deltaCor = resumo.delta_geral !== null
    ? resumo.delta_geral > 0 ? 'text-emerald-600 dark:text-emerald-400' : resumo.delta_geral < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
    : 'text-gray-400'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <CardResumo
        titulo="Alunos Analisados"
        valor={resumo.com_ambos_dados.toString()}
        subtitulo={`${resumo.total_alunos} total`}
        icon={<Users className="w-6 h-6" />}
        cor="bg-blue-500"
      />
      <CardResumo
        titulo="Média SISAM"
        valor={resumo.media_sisam?.toFixed(1) ?? '-'}
        subtitulo="Avaliação municipal"
        icon={<FileText className="w-6 h-6" />}
        cor="bg-indigo-500"
      />
      <CardResumo
        titulo="Média Escolar"
        valor={resumo.media_escolar?.toFixed(1) ?? '-'}
        subtitulo="Notas da escola"
        icon={<BookOpen className="w-6 h-6" />}
        cor="bg-emerald-500"
      />
      <CardResumo
        titulo="Diferença"
        valor={resumo.delta_geral !== null ? `${resumo.delta_geral > 0 ? '+' : ''}${resumo.delta_geral.toFixed(1)}` : '-'}
        subtitulo={resumo.delta_geral !== null ? (resumo.delta_geral > 0 ? 'Escola acima' : resumo.delta_geral < 0 ? 'SISAM acima' : 'Equivalente') : ''}
        icon={deltaIcon || <Minus className="w-6 h-6" />}
        cor={resumo.delta_geral !== null ? (resumo.delta_geral >= 0 ? 'bg-emerald-500' : 'bg-red-500') : 'bg-gray-400'}
      />
    </div>
  )
}

function CardResumo({ titulo, valor, subtitulo, icon, cor }: {
  titulo: string; valor: string; subtitulo: string; icon: React.ReactNode; cor: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{titulo}</span>
        <div className={`${cor} text-white rounded-lg p-1.5`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{valor}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitulo}</p>
    </div>
  )
}

// ============================================
// Comparativo por Disciplina
// ============================================

function ComparativoDisciplinas({ disciplinas }: { disciplinas: Resumo['por_disciplina'] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Comparativo por Disciplina</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disciplinas.filter(d => d.media_sisam !== null).map(d => (
          <div key={d.codigo} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 dark:text-white mb-3">{d.disciplina}</h4>
            <div className="space-y-2">
              {/* Barra SISAM */}
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 text-gray-500 dark:text-gray-400">SISAM</span>
                <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((d.media_sisam || 0) / 10) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 w-10 text-right">{d.media_sisam?.toFixed(1)}</span>
              </div>
              {/* Barra Escolar */}
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 text-gray-500 dark:text-gray-400">Escola</span>
                <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((d.media_escolar || 0) / 10) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 w-10 text-right">{d.media_escolar?.toFixed(1)}</span>
              </div>
              {/* Delta */}
              {d.delta !== null && (
                <div className="flex items-center justify-end gap-1 mt-1">
                  {d.delta > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : d.delta < 0 ? <TrendingDown className="w-3 h-3 text-red-500" /> : null}
                  <span className={`text-xs font-medium ${d.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : d.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                    {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)} pts
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Alertas de Discrepância
// ============================================

function AlertasDiscrepancia({ resumo }: { resumo: Resumo }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {resumo.discrepancias_altas > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Atenção: Discrepância Alta</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                <strong>{resumo.discrepancias_altas}</strong> aluno(s) com média escolar {'>='} 6.0 mas SISAM {'<'} 5.0.
                Pode indicar diferença de critérios de avaliação.
              </p>
            </div>
          </div>
        </div>
      )}
      {resumo.discrepancias_baixas > 0 && (
        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-sky-800 dark:text-sky-300">Destaque Positivo</h4>
              <p className="text-sm text-sky-700 dark:text-sky-400 mt-1">
                <strong>{resumo.discrepancias_baixas}</strong> aluno(s) com média escolar {'<'} 6.0 mas SISAM {'>='} 6.0.
                Demonstram potencial que pode não estar refletido nas notas escolares.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Tabela Comparativa
// ============================================

function TabelaComparativa({ alunos, onImprimir }: { alunos: ComparativoAluno[]; onImprimir: () => void }) {
  const alunosFiltrados = alunos.filter(a => a.tem_dados_sisam || a.tem_dados_escolar)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="font-semibold text-gray-800 dark:text-white">Detalhamento por Aluno</h3>
        <button onClick={onImprimir}
          className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors">
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th rowSpan={2} className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-slate-700">Aluno</th>
              <th colSpan={3} className="text-center py-1 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase border-b border-gray-200 dark:border-slate-600 bg-indigo-50/50 dark:bg-indigo-900/10">SISAM</th>
              <th colSpan={3} className="text-center py-1 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase border-b border-gray-200 dark:border-slate-600 bg-emerald-50/50 dark:bg-emerald-900/10">Escola</th>
              <th rowSpan={2} className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase bg-amber-50/50 dark:bg-amber-900/10">Delta</th>
            </tr>
            <tr>
              <th className="text-center py-1 px-2 text-[10px] text-gray-500 dark:text-gray-400 bg-indigo-50/50 dark:bg-indigo-900/10">LP</th>
              <th className="text-center py-1 px-2 text-[10px] text-gray-500 dark:text-gray-400 bg-indigo-50/50 dark:bg-indigo-900/10">MAT</th>
              <th className="text-center py-1 px-2 text-[10px] text-gray-500 dark:text-gray-400 bg-indigo-50/50 dark:bg-indigo-900/10">Média</th>
              <th className="text-center py-1 px-2 text-[10px] text-gray-500 dark:text-gray-400 bg-emerald-50/50 dark:bg-emerald-900/10">LP</th>
              <th className="text-center py-1 px-2 text-[10px] text-gray-500 dark:text-gray-400 bg-emerald-50/50 dark:bg-emerald-900/10">MAT</th>
              <th className="text-center py-1 px-2 text-[10px] text-gray-500 dark:text-gray-400 bg-emerald-50/50 dark:bg-emerald-900/10">Média</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {alunosFiltrados.map((a, idx) => {
              const delta = a.sisam_media !== null && a.escolar_media !== null
                ? Math.round((a.escolar_media - a.sisam_media) * 100) / 100
                : null

              return (
                <tr key={a.aluno_id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-slate-800/30'}`}>
                  <td className="py-2 px-3 text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-inherit">
                    <div>{a.aluno_nome}</div>
                    {a.turma_codigo && <span className="text-[10px] text-gray-400">{a.turma_codigo}</span>}
                  </td>
                  <CelaNota valor={a.sisam_lp} cor="indigo" />
                  <CelaNota valor={a.sisam_mat} cor="indigo" />
                  <CelaNota valor={a.sisam_media} cor="indigo" bold />
                  <CelaNota valor={a.escolar_lp} cor="emerald" />
                  <CelaNota valor={a.escolar_mat} cor="emerald" />
                  <CelaNota valor={a.escolar_media} cor="emerald" bold />
                  <td className="py-2 px-3 text-center">
                    {delta !== null ? (
                      <span className={`text-sm font-semibold ${
                        delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                      }`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                </tr>
              )
            })}
            {alunosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhum aluno com dados para comparar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
        <span className="text-indigo-500">SISAM = Avaliação Municipal</span>
        <span className="text-emerald-500">Escola = Média das notas escolares</span>
        <span>Delta = Escola - SISAM</span>
        <span className="text-emerald-500">+ positivo = escola acima</span>
        <span className="text-red-500">- negativo = SISAM acima</span>
      </div>
    </div>
  )
}

const corClasses: Record<string, string> = {
  indigo: 'text-indigo-600 dark:text-indigo-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
}

function CelaNota({ valor, cor, bold }: { valor: number | null; cor: string; bold?: boolean }) {
  if (valor === null) return <td className="py-2 px-3 text-center text-gray-300 text-sm">-</td>
  const abaixo = valor < 5
  return (
    <td className="py-2 px-3 text-center">
      <span className={`text-sm ${bold ? 'font-bold' : ''} ${
        abaixo ? 'text-red-600 dark:text-red-400' : corClasses[cor] || 'text-gray-600 dark:text-gray-400'
      }`}>
        {valor.toFixed(1)}
      </span>
    </td>
  )
}
