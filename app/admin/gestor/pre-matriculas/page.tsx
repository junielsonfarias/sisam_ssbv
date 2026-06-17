'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Clock, Search, CheckCircle, XCircle, Filter, Loader2,
  ChevronLeft, ChevronRight, Eye, X, AlertTriangle
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface PreMatricula {
  id: string; protocolo: string; aluno_nome: string; aluno_data_nascimento: string
  aluno_cpf: string | null; aluno_genero: string | null; aluno_pcd: boolean
  responsavel_nome: string; responsavel_cpf: string | null; responsavel_telefone: string
  responsavel_email: string | null; parentesco: string | null
  endereco: string | null; bairro: string | null
  escola_pretendida_id: string | null; escola_nome: string | null
  serie_pretendida: string; ano_letivo: string; status: string
  motivo_rejeicao: string | null; observacoes: string | null
  analisado_por_nome: string | null; analisado_em: string | null; criado_em: string
}

interface KPIs { pendentes: string; em_analise: string; aprovadas: string; rejeitadas: string; total: string }

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pendente: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700' },
  em_analise: { label: 'Em Análise', bg: 'bg-blue-100', text: 'text-blue-700' },
  aprovada: { label: 'Aprovada', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejeitada: { label: 'Rejeitada', bg: 'bg-red-100', text: 'text-red-700' },
  matriculada: { label: 'Matriculada', bg: 'bg-purple-100', text: 'text-purple-700' },
}

const SERIES_LABELS: Record<string, string> = {
  '1_ano_ef': '1o Ano', '2_ano_ef': '2o Ano', '3_ano_ef': '3o Ano',
  '4_ano_ef': '4o Ano', '5_ano_ef': '5o Ano', '6_ano_ef': '6o Ano',
  '7_ano_ef': '7o Ano', '8_ano_ef': '8o Ano', '9_ano_ef': '9o Ano',
  'pre_escola_i': 'Pré I', 'pre_escola_ii': 'Pré II',
}

function PreMatriculasContent() {
  const [dados, setDados] = useState<PreMatricula[]>([])
  const [kpis, setKpis] = useState<KPIs>({ pendentes: '0', em_analise: '0', aprovadas: '0', rejeitadas: '0', total: '0' })
  const [carregando, setCarregando] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [ano, setAno] = useState(String(new Date().getFullYear()))

  // Modal
  const [selecionado, setSelecionado] = useState<PreMatricula | null>(null)
  const [modalAcao, setModalAcao] = useState<'detalhes' | 'rejeitar' | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ page: String(page), ano })
      if (filtroStatus) params.set('status', filtroStatus)
      const res = await fetch(`/api/admin/pre-matriculas?${params}`)
      const data = await res.json()
      setDados(data.dados || [])
      setKpis(data.kpis || kpis)
      setTotalPages(data.paginacao?.totalPages || 1)
    } catch {
    } finally {
      setCarregando(false)
    }
  }, [page, filtroStatus, ano])

  useEffect(() => { carregar() }, [carregar])

  const atualizarStatus = async (id: string, status: string, motivo?: string) => {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/pre-matriculas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, motivo_rejeicao: motivo || null }),
      })
      if (res.ok) {
        setModalAcao(null)
        setSelecionado(null)
        setMotivoRejeicao('')
        carregar()
      }
    } catch {
    } finally {
      setSalvando(false)
    }
  }

  const kpiCards = [
    { label: 'Pendentes', value: kpis.pendentes, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Em Análise', value: kpis.em_analise, icon: Search, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Aprovadas', value: kpis.aprovadas, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Rejeitadas', value: kpis.rejeitadas, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <UserPlus className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Pré-Matrículas</h1>
            <p className="text-blue-100 text-sm">Gerenciamento de pré-matrículas online</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-4 cursor-pointer hover:shadow-md transition-all`}
            onClick={() => { setFiltroStatus(k.label === 'Pendentes' ? 'pendente' : k.label === 'Em Análise' ? 'em_analise' : k.label === 'Aprovadas' ? 'aprovada' : 'rejeitada'); setPage(1) }}>
            <div className="flex items-center justify-between">
              <k.icon className={`w-5 h-5 ${k.color}`} />
              <span className={`text-2xl font-bold ${k.color}`}>{k.value}</span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_analise">Em Análise</option>
          <option value="aprovada">Aprovada</option>
          <option value="rejeitada">Rejeitada</option>
        </select>
        <select value={ano} onChange={e => { setAno(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {filtroStatus && (
          <button onClick={() => { setFiltroStatus(''); setPage(1) }}
            className="text-sm text-slate-500 hover:text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : dados.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma pré-matrícula encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b">
                  <th className="text-left px-4 py-3 font-semibold">Protocolo</th>
                  <th className="text-left px-4 py-3 font-semibold">Aluno</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Responsável</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Telefone</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Escola</th>
                  <th className="text-left px-4 py-3 font-semibold">Série</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Data</th>
                  <th className="text-center px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dados.map(pm => {
                  const cfg = STATUS_CFG[pm.status] || STATUS_CFG.pendente
                  return (
                    <tr key={pm.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => { setSelecionado(pm); setModalAcao('detalhes') }}>
                      <td className="px-4 py-3 font-mono text-xs">{pm.protocolo}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{pm.aluno_nome}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600">{pm.responsavel_nome}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{pm.responsavel_telefone}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-600 truncate max-w-[150px]">{pm.escola_nome || '-'}</td>
                      <td className="px-4 py-3">{SERIES_LABELS[pm.serie_pretendida] || pm.serie_pretendida}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400 text-xs">
                        {new Date(pm.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setSelecionado(pm); setModalAcao('detalhes') }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Detalhes">
                            <Eye className="w-4 h-4" />
                          </button>
                          {pm.status === 'pendente' && (
                            <>
                              <button onClick={() => atualizarStatus(pm.id, 'em_analise')}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-xs font-medium" title="Em Análise">
                                <Search className="w-4 h-4" />
                              </button>
                              <button onClick={() => atualizarStatus(pm.id, 'aprovada')}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Aprovar">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setSelecionado(pm); setModalAcao('rejeitar') }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Rejeitar">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {pm.status === 'em_analise' && (
                            <>
                              <button onClick={() => atualizarStatus(pm.id, 'aprovada')}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Aprovar">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setSelecionado(pm); setModalAcao('rejeitar') }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Rejeitar">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 disabled:opacity-50">
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Detalhes */}
      {selecionado && modalAcao === 'detalhes' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => { setSelecionado(null); setModalAcao(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{selecionado.protocolo}</h3>
              <button onClick={() => { setSelecionado(null); setModalAcao(null) }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-400">Aluno:</span><p className="font-medium">{selecionado.aluno_nome}</p></div>
                <div><span className="text-slate-400">Nascimento:</span><p className="font-medium">{new Date(selecionado.aluno_data_nascimento).toLocaleDateString('pt-BR')}</p></div>
                {selecionado.aluno_cpf && <div><span className="text-slate-400">CPF Aluno:</span><p className="font-medium">{selecionado.aluno_cpf}</p></div>}
                {selecionado.aluno_genero && <div><span className="text-slate-400">Gênero:</span><p className="font-medium capitalize">{selecionado.aluno_genero}</p></div>}
                <div><span className="text-slate-400">PCD:</span><p className="font-medium">{selecionado.aluno_pcd ? 'Sim' : 'Não'}</p></div>
              </div>
              <hr />
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-400">Responsável:</span><p className="font-medium">{selecionado.responsavel_nome}</p></div>
                <div><span className="text-slate-400">Telefone:</span><p className="font-medium">{selecionado.responsavel_telefone}</p></div>
                {selecionado.responsavel_email && <div><span className="text-slate-400">Email:</span><p className="font-medium">{selecionado.responsavel_email}</p></div>}
                {selecionado.parentesco && <div><span className="text-slate-400">Parentesco:</span><p className="font-medium capitalize">{selecionado.parentesco}</p></div>}
              </div>
              <hr />
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-400">Série:</span><p className="font-medium">{SERIES_LABELS[selecionado.serie_pretendida] || selecionado.serie_pretendida}</p></div>
                <div><span className="text-slate-400">Escola:</span><p className="font-medium">{selecionado.escola_nome || 'Sem preferência'}</p></div>
                {selecionado.endereco && <div><span className="text-slate-400">Endereço:</span><p className="font-medium">{selecionado.endereco}</p></div>}
                {selecionado.bairro && <div><span className="text-slate-400">Bairro:</span><p className="font-medium">{selecionado.bairro}</p></div>}
              </div>
              {selecionado.motivo_rejeicao && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-red-600 font-medium">Motivo da rejeição:</span>
                  <p className="text-red-700 mt-1">{selecionado.motivo_rejeicao}</p>
                </div>
              )}
            </div>
            {(selecionado.status === 'pendente' || selecionado.status === 'em_analise') && (
              <div className="flex gap-2 mt-6">
                <button onClick={() => atualizarStatus(selecionado.id, 'em_analise')}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 text-sm" disabled={salvando}>
                  Em Análise
                </button>
                <button onClick={() => atualizarStatus(selecionado.id, 'aprovada')}
                  className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 text-sm" disabled={salvando}>
                  Aprovar
                </button>
                <button onClick={() => setModalAcao('rejeitar')}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 text-sm">
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Rejeitar */}
      {selecionado && modalAcao === 'rejeitar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => { setModalAcao(null); setSelecionado(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-slate-800">Rejeitar Pré-Matrícula</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">Pré-matrícula de <strong>{selecionado.aluno_nome}</strong></p>
            <textarea value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)}
              placeholder="Informe o motivo da rejeição..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setModalAcao(null); setMotivoRejeicao('') }}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => atualizarStatus(selecionado.id, 'rejeitada', motivoRejeicao)}
                disabled={!motivoRejeicao.trim() || salvando}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 text-sm disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PreMatriculasPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <PreMatriculasContent />
    </ProtectedRoute>
  )
}
