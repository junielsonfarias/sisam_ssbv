'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Plus, CheckCircle, XCircle, Trash2, X, Save, AlertTriangle, Users, UserCheck, UserX } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Registro {
  id: string
  aluno_nome: string
  responsavel_nome: string | null
  telefone: string | null
  escola_id: string
  escola_nome: string | null
  serie: string
  ano_letivo: string
  posicao: number | null
  status: string
  observacao: string | null
  data_entrada: string | null
  criado_em: string
}

interface KPIs {
  total_aguardando: string
  total_aprovados: string
  total_rejeitados: string
  total_matriculados: string
  total: string
}

interface Escola {
  id: string
  nome: string
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  aguardando: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  aprovado: { label: 'Aprovado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  rejeitado: { label: 'Rejeitado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  matriculado: { label: 'Matriculado', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
}

function FilaEspera() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [kpis, setKpis] = useState<KPIs>({ total_aguardando: '0', total_aprovados: '0', total_rejeitados: '0', total_matriculados: '0', total: '0' })
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  // Filtros
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString())

  // Form
  const [formNome, setFormNome] = useState('')
  const [formResponsavel, setFormResponsavel] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formEscola, setFormEscola] = useState('')
  const [formSerie, setFormSerie] = useState('')
  const [formAno, setFormAno] = useState(new Date().getFullYear().toString())
  const [formObs, setFormObs] = useState('')

  // Load escolas
  useEffect(() => {
    fetch('/api/admin/escolas')
      .then(r => r.json())
      .then(data => setEscolas(data.escolas || data || []))
      .catch(() => {})
  }, [])

  const carregarFila = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const params = new URLSearchParams()
      if (filtroEscola) params.set('escola_id', filtroEscola)
      if (filtroSerie) params.set('serie', filtroSerie)
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroAno) params.set('ano_letivo', filtroAno)
      const res = await fetch(`/api/admin/fila-espera?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar fila')
      const data = await res.json()
      setRegistros(data.registros || [])
      setKpis(data.kpis || { total_aguardando: '0', total_aprovados: '0', total_rejeitados: '0', total_matriculados: '0', total: '0' })
    } catch {
      setErro('Erro ao carregar fila de espera')
    } finally {
      setCarregando(false)
    }
  }, [filtroEscola, filtroSerie, filtroStatus, filtroAno])

  useEffect(() => { carregarFila() }, [carregarFila])

  const adicionar = async () => {
    if (!formNome.trim() || !formEscola || !formSerie.trim()) {
      setErro('Nome, escola e série são obrigatórios')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/fila-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_nome: formNome,
          responsavel_nome: formResponsavel || null,
          telefone: formTelefone || null,
          escola_id: formEscola,
          serie: formSerie,
          ano_letivo: formAno,
          observacao: formObs || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.mensagem || 'Erro ao adicionar')
      }
      setMensagem('Adicionado à fila com sucesso!')
      setModalAberto(false)
      setFormNome('')
      setFormResponsavel('')
      setFormTelefone('')
      setFormSerie('')
      setFormObs('')
      carregarFila()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const atualizarStatus = async (id: string, status: string) => {
    const labels: Record<string, string> = { aprovado: 'aprovar', rejeitado: 'rejeitar' }
    if (!confirm(`Deseja realmente ${labels[status] || status} este registro?`)) return
    try {
      const res = await fetch('/api/admin/fila-espera', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      setMensagem(`Status atualizado para ${status}`)
      carregarFila()
    } catch {
      setErro('Erro ao atualizar status')
    }
  }

  const excluir = async (id: string) => {
    if (!confirm('Deseja realmente remover este registro da fila?')) return
    try {
      const res = await fetch(`/api/admin/fila-espera?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao remover')
      setMensagem('Registro removido da fila')
      carregarFila()
    } catch {
      setErro('Erro ao remover registro')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Fila de Espera</h1>
            <p className="text-orange-100">Controle de vagas e lista de espera</p>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {mensagem && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300 text-sm">
          {mensagem}
        </div>
      )}
      {erro && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
          {erro}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">Aguardando</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total_aguardando}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <UserCheck className="h-5 w-5" />
            <span className="text-sm font-medium">Aprovados</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total_aprovados}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <UserX className="h-5 w-5" />
            <span className="text-sm font-medium">Rejeitados</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total_rejeitados}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.total}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
            <select
              value={filtroEscola}
              onChange={e => setFiltroEscola(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Todas</option>
              {escolas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
            <input
              type="text"
              value={filtroSerie}
              onChange={e => setFiltroSerie(e.target.value)}
              placeholder="Ex: 1o Ano"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="aguardando">Aguardando</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
              <option value="matriculado">Matriculado</option>
            </select>
          </div>
          <div className="min-w-[100px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano</label>
            <input
              type="text"
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => { setModalAberto(true); setErro(''); setMensagem('') }}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
          </div>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p>Nenhum registro na fila de espera</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Aluno</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Responsável</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Telefone</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Escola</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Série</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Data</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, idx) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.posicao || idx + 1}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{r.aluno_nome || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.responsavel_nome || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.telefone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.escola_nome || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.serie || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {r.data_entrada ? new Date(r.data_entrada).toLocaleDateString('pt-BR') : r.criado_em ? new Date(r.criado_em).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[r.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                        {statusBadge[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {r.status === 'aguardando' && (
                          <>
                            <button
                              onClick={() => atualizarStatus(r.id, 'aprovado')}
                              className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded text-green-600"
                              title="Aprovar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => atualizarStatus(r.id, 'rejeitado')}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"
                              title="Rejeitar"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => excluir(r.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Adicionar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Adicionar à Fila</h3>
              <button onClick={() => setModalAberto(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Aluno *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={e => setFormNome(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Nome completo do aluno"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável</label>
                <input
                  type="text"
                  value={formResponsavel}
                  onChange={e => setFormResponsavel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formTelefone}
                  onChange={e => setFormTelefone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola *</label>
                <select
                  value={formEscola}
                  onChange={e => setFormEscola(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Selecione</option>
                  {escolas.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série *</label>
                  <input
                    type="text"
                    value={formSerie}
                    onChange={e => setFormSerie(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    placeholder="Ex: 1o Ano"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo *</label>
                  <input
                    type="text"
                    value={formAno}
                    onChange={e => setFormAno(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={formObs}
                  onChange={e => setFormObs(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Observações (opcional)"
                />
              </div>
              {erro && <p className="text-red-600 dark:text-red-400 text-sm">{erro}</p>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={adicionar}
                disabled={salvando}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FilaEsperaPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <FilaEspera />
    </ProtectedRoute>
  )
}
