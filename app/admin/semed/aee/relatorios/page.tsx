'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, FileBarChart, Printer, Users } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { usePrint } from '@/lib/hooks/usePrint'

interface Escola { id: string; nome: string }

interface Linha {
  plano_id: string
  aluno_nome: string
  serie: string | null
  turma_codigo: string | null
  escola_nome: string | null
  professor_aee_nome: string | null
  status: string
  periodicidade_horas_semanais: number | null
  total_sessoes: number
  sessoes_presente: number
  sessoes_ausente: number
  horas_realizadas: number
  horas_previstas: number | null
  percentual_cobertura: number | null
  taxa_presenca: number | null
}

interface Totais {
  total_planos: number
  total_sessoes: number
  total_horas_realizadas: number
  total_horas_previstas: number
  cobertura_media: number | null
}

const COBERTURA_VAZIA: Totais = {
  total_planos: 0, total_sessoes: 0, total_horas_realizadas: 0, total_horas_previstas: 0, cobertura_media: null,
}

function corCobertura(pct: number | null): string {
  if (pct == null) return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
  if (pct >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  if (pct >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
}

function badgeCobertura(pct: number | null): string {
  if (pct == null) return 'badge badge-gray'
  if (pct >= 90) return 'badge badge-green'
  if (pct >= 60) return 'badge badge-yellow'
  return 'badge badge-red'
}

function RelatorioHorasAee() {
  const toast = useToast()
  const { abrirJanelaImpressao, gerarTabelaHTML } = usePrint()

  const [escolas, setEscolas] = useState<Escola[]>([])
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [escolaId, setEscolaId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  const [linhas, setLinhas] = useState<Linha[]>([])
  const [totais, setTotais] = useState<Totais>(COBERTURA_VAZIA)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/admin/escolas')
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch(() => { /* silencioso */ })
  }, [])

  const carregar = useCallback(async (signal?: AbortSignal) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ ano })
      if (escolaId) params.set('escola', escolaId)
      if (inicio) params.set('inicio', inicio)
      if (fim) params.set('fim', fim)
      const res = await fetch(`/api/admin/aee/relatorios/horas?${params}`, { signal })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.mensagem || 'Erro ao gerar relatório')
      }
      const data = await res.json()
      setLinhas(data.linhas || [])
      setTotais(data.totais || COBERTURA_VAZIA)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      toast.error((e as Error).message)
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, escolaId, inicio, fim])

  useEffect(() => {
    const controller = new AbortController()
    carregar(controller.signal)
    return () => controller.abort()
  }, [carregar])

  function imprimir() {
    const escola = escolas.find((e) => e.id === escolaId)
    const periodoTxt = inicio || fim ? ` · período ${inicio || '...'} a ${fim || '...'}` : ''
    const p = abrirJanelaImpressao({
      titulo: 'Relatório de Horas AEE',
      subtitulo: `Ano letivo ${ano}${escola ? ` · ${escola.nome}` : ''}${periodoTxt}`,
    })
    if (!p) { toast.error('Permita pop-ups para imprimir'); return }
    const colunas = [
      { titulo: 'Aluno', campo: 'aluno_nome' },
      { titulo: 'Escola', campo: 'escola_nome' },
      { titulo: 'Turma', campo: 'turma_codigo', align: 'center' as const },
      { titulo: 'Sessões', campo: 'sessoes_txt', align: 'center' as const },
      { titulo: 'Realizadas', campo: 'realizadas_txt', align: 'right' as const },
      { titulo: 'Previstas', campo: 'previstas_txt', align: 'right' as const },
      { titulo: 'Cobertura', campo: 'cobertura_html', align: 'center' as const },
    ]
    const dados = linhas.map((l) => ({
      aluno_nome: l.aluno_nome,
      escola_nome: l.escola_nome || '—',
      turma_codigo: l.turma_codigo || '—',
      sessoes_txt: `${l.sessoes_presente}/${l.total_sessoes}`,
      realizadas_txt: `${l.horas_realizadas.toFixed(1)}h`,
      previstas_txt: l.horas_previstas == null ? '—' : `${l.horas_previstas.toFixed(1)}h`,
      cobertura_html: `<span class="${badgeCobertura(l.percentual_cobertura)}">${l.percentual_cobertura == null ? '—' : `${l.percentual_cobertura}%`}</span>`,
    }))
    p.escrever(`<p style="font-size:12px;margin:8px 0">
      <strong>${totais.total_planos}</strong> planos ·
      <strong>${totais.total_horas_realizadas.toFixed(1)}h</strong> realizadas de
      <strong>${totais.total_horas_previstas.toFixed(1)}h</strong> previstas ·
      cobertura média <strong>${totais.cobertura_media == null ? '—' : `${totais.cobertura_media}%`}</strong>
    </p>`)
    p.escrever(gerarTabelaHTML(colunas, dados))
    p.fechar()
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Relatório de Horas AEE</h1>
              <p className="text-purple-100 text-sm">Carga horária realizada × prevista (periodicidade do PEI)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/semed/aee"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao AEE
            </Link>
            <button
              onClick={imprimir}
              disabled={carregando || linhas.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano letivo</label>
            <input
              type="number" value={ano} onChange={(e) => setAno(e.target.value)} min={2020} max={2100}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Escola</label>
            <select
              value={escolaId} onChange={(e) => setEscolaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
            >
              <option value="">Todas as escolas</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período — de</label>
            <input
              type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período — até</label>
            <input
              type="date" value={fim} onChange={(e) => setFim(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* KPIs totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totais.total_planos}</p>
          <p className="text-xs text-purple-600">Planos AEE</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
          <FileBarChart className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totais.total_sessoes}</p>
          <p className="text-xs text-blue-600">Sessões</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{totais.total_horas_realizadas.toFixed(1)}h</p>
          <p className="text-xs text-green-600">de {totais.total_horas_previstas.toFixed(1)}h previstas</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
          <FileBarChart className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{totais.cobertura_media == null ? '—' : `${totais.cobertura_media}%`}</p>
          <p className="text-xs text-amber-600">Cobertura média</p>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : linhas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-10 text-center text-gray-500 dark:text-gray-400">
          Nenhum plano AEE encontrado para os filtros selecionados.
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Escola / Turma</th>
                  <th className="px-4 py-3 text-center">Sessões (pres./total)</th>
                  <th className="px-4 py-3 text-right">Realizadas</th>
                  <th className="px-4 py-3 text-right">Previstas</th>
                  <th className="px-4 py-3 text-center">Cobertura</th>
                  <th className="px-4 py-3 text-center">Presença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {linhas.map((l) => (
                  <tr key={l.plano_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{l.aluno_nome}</p>
                      <p className="text-xs text-gray-500">{l.serie || '—'}{l.professor_aee_nome ? ` · Prof. ${l.professor_aee_nome}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {l.escola_nome || '—'}
                      <span className="text-xs text-gray-500 block">{l.turma_codigo || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                      {l.sessoes_presente}/{l.total_sessoes}
                      {l.sessoes_ausente > 0 && <span className="text-xs text-red-500 block">{l.sessoes_ausente} falta(s)</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{l.horas_realizadas.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{l.horas_previstas == null ? '—' : `${l.horas_previstas.toFixed(1)}h`}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${corCobertura(l.percentual_cobertura)}`}>
                        {l.percentual_cobertura == null ? '—' : `${l.percentual_cobertura}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{l.taxa_presenca == null ? '—' : `${l.taxa_presenca}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {linhas.map((l) => (
              <div key={l.plano_id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{l.aluno_nome}</p>
                    <p className="text-xs text-gray-500">{l.escola_nome || '—'} · {l.turma_codigo || '—'}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${corCobertura(l.percentual_cobertura)}`}>
                    {l.percentual_cobertura == null ? '—' : `${l.percentual_cobertura}%`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{l.horas_realizadas.toFixed(1)}h</p>
                    <p className="text-xs text-gray-500">Realiz.</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{l.horas_previstas == null ? '—' : `${l.horas_previstas.toFixed(1)}h`}</p>
                    <p className="text-xs text-gray-500">Prev.</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{l.sessoes_presente}/{l.total_sessoes}</p>
                    <p className="text-xs text-gray-500">Sessões</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function RelatorioHorasAeePage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <RelatorioHorasAee />
    </ProtectedRoute>
  )
}
