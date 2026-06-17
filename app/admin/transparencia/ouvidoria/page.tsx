'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Inbox, Clock, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Manifestacao {
  id: string
  protocolo: string
  tipo: string
  nome: string | null
  email: string | null
  telefone: string | null
  escola_id: string | null
  escola_nome: string | null
  assunto: string
  mensagem: string
  status: string
  resposta: string | null
  respondido_por_nome: string | null
  respondido_em: string | null
  criado_em: string
}

interface KPIs {
  total_aberto: string
  total_em_analise: string
  total_respondido: string
  total_encerrado: string
  total: string
}

const TIPOS_LABEL: Record<string, string> = {
  denuncia: 'Denúncia',
  sugestao: 'Sugestão',
  elogio: 'Elogio',
  reclamacao: 'Reclamação',
  informacao: 'Informação',
}

const TIPO_BADGE: Record<string, string> = {
  denuncia: 'bg-red-100 text-red-700',
  sugestao: 'bg-blue-100 text-blue-700',
  elogio: 'bg-green-100 text-green-700',
  reclamacao: 'bg-amber-100 text-amber-700',
  informacao: 'bg-purple-100 text-purple-700',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  aberto: { label: 'Aberto', cls: 'bg-amber-100 text-amber-700' },
  em_analise: { label: 'Em Análise', cls: 'bg-blue-100 text-blue-700' },
  respondido: { label: 'Respondido', cls: 'bg-green-100 text-green-700' },
  encerrado: { label: 'Encerrado', cls: 'bg-slate-100 text-slate-700' },
}

function OuvidoriaAdmin() {
  const [manifestacoes, setManifestacoes] = useState<Manifestacao[]>([])
  const [kpis, setKpis] = useState<KPIs>({ total_aberto: '0', total_em_analise: '0', total_respondido: '0', total_encerrado: '0', total: '0' })
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [pagina, setPagina] = useState(1)

  // Resposta
  const [novoStatus, setNovoStatus] = useState('')
  const [novaResposta, setNovaResposta] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const fetchDados = useCallback(async () => {
    try {
      setCarregando(true)
      const params = new URLSearchParams({ page: String(pagina), limit: '20' })
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroStatus) params.set('status', filtroStatus)
      const res = await fetch(`/api/admin/ouvidoria?${params}`)
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setManifestacoes(data.manifestacoes || [])
      setKpis(data.kpis || kpis)
    } catch {
      setManifestacoes([])
    } finally {
      setCarregando(false)
    }
  }, [pagina, filtroTipo, filtroStatus])

  useEffect(() => {
    fetchDados()
  }, [fetchDados])

  async function handleResponder(id: string) {
    if (!novoStatus && !novaResposta.trim()) return
    setSalvando(true)
    setMensagem('')
    try {
      const body: any = { id }
      if (novoStatus) body.status = novoStatus
      if (novaResposta.trim()) body.resposta = novaResposta.trim()
      const res = await fetch('/api/admin/ouvidoria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro')
      setMensagem('Atualizado com sucesso')
      setNovoStatus('')
      setNovaResposta('')
      fetchDados()
    } catch {
      setMensagem('Erro ao atualizar')
    } finally {
      setSalvando(false)
    }
  }

  function toggleExpandir(id: string, m: Manifestacao) {
    if (expandido === id) {
      setExpandido(null)
    } else {
      setExpandido(id)
      setNovoStatus(m.status)
      setNovaResposta(m.resposta || '')
      setMensagem('')
    }
  }

  const selectCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-rose-500 outline-none'
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-rose-500 outline-none'

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-red-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Ouvidoria</h1>
            <p className="text-rose-100 text-sm">Gerenciamento de manifestações</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
          <Inbox className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{kpis.total_aberto}</p>
          <p className="text-xs text-amber-600">Aberto</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{kpis.total_em_analise}</p>
          <p className="text-xs text-blue-600">Em Análise</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{kpis.total_respondido}</p>
          <p className="text-xs text-green-600">Respondido</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
          <XCircle className="w-5 h-5 text-slate-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{kpis.total_encerrado}</p>
          <p className="text-xs text-slate-600">Encerrado</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1) }} className={selectCls}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1) }} className={selectCls}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : manifestacoes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhuma manifestação encontrada</div>
      ) : (
        <div className="space-y-3">
          {manifestacoes.map((m) => (
            <div key={m.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleExpandir(m.id, m)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold text-gray-500">{m.protocolo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIPO_BADGE[m.tipo] || 'bg-slate-100 text-slate-700'}`}>
                      {TIPOS_LABEL[m.tipo] || m.tipo}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[m.status]?.cls || 'bg-slate-100 text-slate-700'}`}>
                      {STATUS_BADGE[m.status]?.label || m.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{m.assunto}</p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1">
                    {m.nome && <span>{m.nome}</span>}
                    {m.escola_nome && <span>{m.escola_nome}</span>}
                    <span>{new Date(m.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                {expandido === m.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {expandido === m.id && (
                <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Mensagem:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{m.mensagem}</p>
                  </div>
                  {m.email && <p className="text-xs text-gray-400 mb-1">E-mail: {m.email}</p>}
                  {m.telefone && <p className="text-xs text-gray-400 mb-3">Telefone: {m.telefone}</p>}

                  {mensagem && (
                    <div className={`text-sm rounded-lg p-3 mb-3 ${mensagem.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {mensagem}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className={selectCls}>
                      {Object.entries(STATUS_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <textarea
                    value={novaResposta}
                    onChange={(e) => setNovaResposta(e.target.value)}
                    rows={3}
                    className={inputCls + ' mb-3'}
                    placeholder="Escreva a resposta..."
                  />
                  <button
                    onClick={() => handleResponder(m.id)}
                    disabled={salvando}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OuvidoriaAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <OuvidoriaAdmin />
    </ProtectedRoute>
  )
}
