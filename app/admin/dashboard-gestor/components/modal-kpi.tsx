'use client'

import { useMemo, useState } from 'react'
import {
  Users, BookOpen, CalendarCheck, ArrowLeftRight,
  TrendingUp, TrendingDown, AlertTriangle, GraduationCap,
  X, Accessibility, Phone, School
} from 'lucide-react'
import { useSeries } from '@/lib/use-series'
import type { DashboardData, ModalType, AlunoPcd } from './types'

export function ModalKPI({ tipo, data, onClose }: { tipo: ModalType; data: DashboardData; onClose: () => void }) {
  const config: Record<string, { titulo: string; icon: any; cor: string }> = {
    alunos: { titulo: 'Alunos por Situacao', icon: Users, cor: 'blue' },
    turmas: { titulo: 'Detalhes das Turmas', icon: GraduationCap, cor: 'indigo' },
    media: { titulo: 'Notas por Disciplina', icon: TrendingUp, cor: 'emerald' },
    frequencia: { titulo: 'Detalhes de Frequencia', icon: CalendarCheck, cor: 'emerald' },
    transferencias: { titulo: 'Movimentacao de Alunos', icon: ArrowLeftRight, cor: 'orange' },
    pcd: { titulo: 'Alunos PCD', icon: Accessibility, cor: 'violet' },
  }

  const { titulo, icon: Icon, cor } = config[tipo!] || config.alunos

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 bg-${cor}-100 dark:bg-${cor}-900/40 text-${cor}-600 dark:text-${cor}-400`}>
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{titulo}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1">
          {tipo === 'alunos' && <ModalAlunos data={data} />}
          {tipo === 'turmas' && <ModalTurmas data={data} />}
          {tipo === 'media' && <ModalMedia data={data} />}
          {tipo === 'frequencia' && <ModalFrequencia data={data} />}
          {tipo === 'transferencias' && <ModalTransferencias data={data} />}
          {tipo === 'pcd' && <ModalPCD data={data} />}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Conteudo dos Modais
// ============================================

function ModalAlunos({ data }: { data: DashboardData }) {
  const { formatSerie } = useSeries()
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')

  const situacoes = useMemo(() => [
    { key: 'cursando', label: 'Cursando', valor: data.alunos.cursando, cor: 'bg-blue-500', corTexto: 'text-blue-700 dark:text-blue-300', corFundo: 'bg-blue-50 dark:bg-blue-900/20', icon: Users },
    { key: 'aprovado', label: 'Aprovados', valor: data.alunos.aprovados, cor: 'bg-emerald-500', corTexto: 'text-emerald-700 dark:text-emerald-300', corFundo: 'bg-emerald-50 dark:bg-emerald-900/20', icon: TrendingUp },
    { key: 'reprovado', label: 'Reprovados', valor: data.alunos.reprovados, cor: 'bg-red-500', corTexto: 'text-red-700 dark:text-red-300', corFundo: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown },
    { key: 'transferido', label: 'Transferidos', valor: data.alunos.transferidos, cor: 'bg-orange-500', corTexto: 'text-orange-700 dark:text-orange-300', corFundo: 'bg-orange-50 dark:bg-orange-900/20', icon: ArrowLeftRight },
    { key: 'abandono', label: 'Abandono', valor: data.alunos.abandono, cor: 'bg-gray-500', corTexto: 'text-gray-700 dark:text-gray-300', corFundo: 'bg-gray-50 dark:bg-gray-700/50', icon: AlertTriangle },
  ], [data.alunos])
  const total = data.alunos.total

  // Barra de distribuição visual
  const barraSegmentos = useMemo(() => situacoes.filter(s => s.valor > 0).map(s => ({
    ...s, pct: total > 0 ? (s.valor / total) * 100 : 0
  })), [situacoes, total])

  // Distribuição por série
  const seriesOrdenadas = useMemo(() => [...(data.distribuicao_serie || [])].sort((a, b) => b.total - a.total), [data.distribuicao_serie])
  const maxSerie = seriesOrdenadas.length > 0 ? seriesOrdenadas[0].total : 1

  // Filtrar alunos
  const alunosFiltrados = useMemo(() => (data.alunos_situacao || []).filter(a => {
    const matchBusca = !busca || a.nome.toLowerCase().includes(busca.toLowerCase()) || a.turma_codigo?.toLowerCase().includes(busca.toLowerCase())
    const matchSituacao = !filtroSituacao || a.situacao === filtroSituacao
    return matchBusca && matchSituacao
  }), [data.alunos_situacao, busca, filtroSituacao])

  return (
    <div className="space-y-5">
      {/* Header com total destacado */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">alunos matriculados</p>
        </div>
        {data.alunos.pcd > 0 && (
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg px-3 py-2 text-center">
            <div className="flex items-center gap-1.5">
              <Accessibility className="w-4 h-4 text-violet-500" />
              <span className="text-lg font-bold text-violet-700 dark:text-violet-300">{data.alunos.pcd}</span>
            </div>
            <p className="text-[10px] text-violet-500">PCD</p>
          </div>
        )}
      </div>

      {/* Barra de distribuição visual */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden">
            {barraSegmentos.map(s => (
              <div key={s.key} className={`${s.cor} transition-all`} style={{ width: `${s.pct}%` }}
                title={`${s.label}: ${s.valor} (${s.pct.toFixed(1)}%)`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {barraSegmentos.map(s => (
              <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className={`w-2 h-2 rounded-full ${s.cor}`} />
                <span>{s.label}: <strong className="text-gray-700 dark:text-gray-200">{s.valor}</strong> ({s.pct.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards de situação clicáveis (filtro) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {situacoes.map(s => {
          const SIcon = s.icon
          const ativo = filtroSituacao === s.key
          return (
            <button key={s.key} onClick={() => setFiltroSituacao(ativo ? '' : s.key)}
              className={`rounded-lg p-3 text-center transition-all border-2 ${
                ativo ? `${s.corFundo} border-current ${s.corTexto} shadow-sm` : `${s.corFundo} border-transparent hover:border-gray-200 dark:hover:border-slate-600`
              }`}>
              <SIcon className={`w-4 h-4 mx-auto mb-1 ${s.corTexto}`} />
              <p className={`text-xl font-bold ${s.corTexto}`}>{s.valor}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.label}</p>
            </button>
          )
        })}
      </div>

      {/* Distribuição por série */}
      {seriesOrdenadas.length > 0 && (
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Alunos por Serie</h4>
          <div className="space-y-2">
            {seriesOrdenadas.map(s => (
              <div key={s.serie} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-16 text-right">{formatSerie(s.serie)}</span>
                <div className="flex-1 h-5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((s.total / maxSerie) * 100, 8)}%` }}>
                    {s.total > 3 && <span className="text-[10px] font-bold text-white">{s.total}</span>}
                  </div>
                </div>
                {s.total <= 3 && <span className="text-xs font-semibold text-gray-500 w-6">{s.total}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de alunos com busca */}
      {data.alunos_situacao && data.alunos_situacao.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-2">
            <div className="relative flex-1">
              <input type="text" placeholder="Buscar aluno ou turma..."
                value={busca} onChange={e => setBusca(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{alunosFiltrados.length} de {data.alunos_situacao.length}</span>
          </div>
          <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b dark:border-slate-600">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Serie</th>
                  <th className="pb-2 font-medium">Turma</th>
                  <th className="pb-2 font-medium">Situacao</th>
                  <th className="pb-2 font-medium">Escola</th>
                </tr>
              </thead>
              <tbody>
                {alunosFiltrados.map((a, i) => (
                  <tr key={a.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-1.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-1.5 font-medium text-gray-800 dark:text-gray-200">{a.nome}</td>
                    <td className="py-1.5 text-xs">{formatSerie(a.serie)}</td>
                    <td className="py-1.5 text-xs font-mono">{a.turma_codigo}</td>
                    <td className="py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        a.situacao === 'cursando' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        a.situacao === 'aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                        a.situacao === 'reprovado' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                        a.situacao === 'transferido' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>{a.situacao}</span>
                    </td>
                    <td className="py-1.5 text-xs text-gray-500 truncate max-w-[130px]">{a.escola_nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ModalTurmas({ data }: { data: DashboardData }) {
  const { formatSerie } = useSeries()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{data.turmas.total}</p>
          <p className="text-xs text-gray-500">Total de turmas</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{data.turmas.series}</p>
          <p className="text-xs text-gray-500">Series</p>
        </div>
      </div>

      {data.turmas_detalhe && data.turmas_detalhe.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b dark:border-slate-600">
                <th className="pb-2 font-medium">Turma</th>
                <th className="pb-2 font-medium">Serie</th>
                <th className="pb-2 font-medium">Alunos</th>
                <th className="pb-2 font-medium">Capacidade</th>
                <th className="pb-2 font-medium">Ocupacao</th>
                <th className="pb-2 font-medium">Escola</th>
              </tr>
            </thead>
            <tbody>
              {data.turmas_detalhe.map(t => {
                const ocupacao = t.capacidade_maxima > 0 ? Math.round((t.total_alunos / t.capacidade_maxima) * 100) : 0
                return (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{t.codigo}</td>
                    <td className="py-2">{formatSerie(t.serie)}</td>
                    <td className="py-2 font-semibold">{t.total_alunos}</td>
                    <td className="py-2 text-gray-500">{t.capacidade_maxima}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ocupacao >= 90 ? 'bg-red-500' : ocupacao >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(ocupacao, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{ocupacao}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-xs text-gray-500 truncate max-w-[120px]">{t.escola_nome}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ModalMedia({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{data.notas.media_geral.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Media Geral</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.notas.abaixo_media}</p>
          <p className="text-xs text-gray-500">Abaixo de 6</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{data.notas.em_recuperacao}</p>
          <p className="text-xs text-gray-500">Recuperacao</p>
        </div>
      </div>
      {data.notas.por_disciplina.length > 0 ? (
        <div className="space-y-2">
          {data.notas.por_disciplina.map(d => (
            <div key={d.disciplina} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{d.disciplina}</p>
                <div className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${d.media >= 6 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((d.media / 10) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-lg font-bold ${d.media >= 6 ? 'text-emerald-600' : 'text-red-600'}`}>{d.media}</p>
                <p className="text-[10px] text-gray-400">{d.abaixo} abaixo</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Nenhuma nota lancada</p>
      )}
    </div>
  )
}

function ModalFrequencia({ data }: { data: DashboardData }) {
  const faixas = [
    { label: '>= 90%', valor: data.frequencia.acima_90, cor: 'bg-emerald-500', texto: 'text-emerald-600' },
    { label: '75-89%', valor: data.frequencia.entre_75_90, cor: 'bg-yellow-500', texto: 'text-yellow-600' },
    { label: '< 75%', valor: data.frequencia.abaixo_75, cor: 'bg-red-500', texto: 'text-red-600' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{data.frequencia.media_frequencia || 0}%</p>
          <p className="text-xs text-gray-500">Media</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{data.frequencia.total_com_frequencia}</p>
          <p className="text-xs text-gray-500">Com frequencia</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.frequencia.total_faltas}</p>
          <p className="text-xs text-gray-500">Total faltas</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.frequencia.abaixo_75}</p>
          <p className="text-xs text-gray-500">Infrequentes</p>
        </div>
      </div>
      <div className="space-y-2">
        {faixas.map(f => (
          <div key={f.label} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${f.cor}`} />
            <span className="text-sm font-medium flex-1">{f.label}</span>
            <span className={`text-lg font-bold ${f.texto}`}>{f.valor}</span>
            <span className="text-xs text-gray-400">alunos</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModalTransferencias({ data }: { data: DashboardData }) {
  const saldo = data.transferencias.entradas - data.transferencias.saidas
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-5 text-center">
          <TrendingDown className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data.transferencias.saidas}</p>
          <p className="text-sm text-gray-500">Saidas</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-5 text-center">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{data.transferencias.entradas}</p>
          <p className="text-sm text-gray-500">Entradas</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold">{data.transferencias.dentro_municipio}</p>
          <p className="text-xs text-gray-500">Dentro municipio</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold">{data.transferencias.fora_municipio}</p>
          <p className="text-xs text-gray-500">Fora municipio</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${saldo >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <p className={`text-xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {saldo >= 0 ? '+' : ''}{saldo}
          </p>
          <p className="text-xs text-gray-500">Saldo</p>
        </div>
      </div>
    </div>
  )
}

function ModalPCD({ data }: { data: DashboardData }) {
  const { formatSerie } = useSeries()
  // Agrupar por escola
  const porEscola = useMemo(() => (data.alunos_pcd || []).reduce<Record<string, AlunoPcd[]>>((acc, aluno) => {
    const escola = aluno.escola_nome || 'Sem escola'
    if (!acc[escola]) acc[escola] = []
    acc[escola].push(aluno)
    return acc
  }, {}), [data.alunos_pcd])

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20 rounded-xl p-5 flex items-center gap-4">
        <div className="bg-violet-100 dark:bg-violet-800/50 rounded-xl p-3">
          <Accessibility className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{data.alunos.pcd}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.alunos.pcd === 1 ? 'Aluno com deficiencia' : 'Alunos com deficiencia'}
            {data.alunos.total > 0 && (
              <span className="ml-1 text-xs text-gray-400">
                ({((data.alunos.pcd / data.alunos.total) * 100).toFixed(1)}% do total)
              </span>
            )}
          </p>
        </div>
      </div>

      {data.alunos_pcd && data.alunos_pcd.length > 0 ? (
        <div className="space-y-5">
          {Object.entries(porEscola).map(([escola, alunos]) => (
            <div key={escola}>
              {Object.keys(porEscola).length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <School className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">{escola}</h4>
                  <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 px-2 py-0.5 rounded-full">{alunos.length}</span>
                </div>
              )}
              <div className="space-y-3">
                {alunos.map((a, i) => (
                  <div key={a.id} className="bg-white dark:bg-slate-700/40 border border-gray-100 dark:border-slate-600/50 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="bg-violet-100 dark:bg-violet-800/50 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-100 text-[15px]">{a.nome}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-lg">
                            <GraduationCap className="w-3 h-3" /> {a.turma_codigo}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-2.5 py-1 rounded-lg">
                            {formatSerie(a.serie)}
                          </span>
                          {a.tipo_deficiencia && (
                            <span className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-800/40 text-violet-700 dark:text-violet-300 text-xs font-medium px-2.5 py-1 rounded-lg">
                              <Accessibility className="w-3 h-3" /> {a.tipo_deficiencia}
                            </span>
                          )}
                          {!a.tipo_deficiencia && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700/40 text-gray-500 text-xs px-2.5 py-1 rounded-lg">
                              <AlertTriangle className="w-3 h-3" /> Tipo nao informado
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-600/30">
                          {a.data_nascimento && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Nasc: <strong>{new Date(a.data_nascimento).toLocaleDateString('pt-BR')}</strong>
                            </span>
                          )}
                          {a.responsavel && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Resp: <strong>{a.responsavel}</strong>
                            </span>
                          )}
                          {a.telefone_responsavel && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                              <Phone className="w-3 h-3" /> {a.telefone_responsavel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <Accessibility className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum aluno PCD registrado</p>
        </div>
      )}
    </div>
  )
}
