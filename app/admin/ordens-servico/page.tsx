'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wrench,
  Plus,
  X,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle,
  MessageSquare,
  Star,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola { id: string; nome: string }

interface Ordem {
  id: string
  numero: string
  escola_id: string
  escola_nome: string
  tipo: string
  prioridade: string
  status: string
  titulo: string
  descricao: string
  local_escola: string | null
  aberta_em: string
  prevista_para: string | null
  concluida_em: string | null
}

interface Comentario {
  id: string
  autor_nome: string | null
  texto: string
  criado_em: string
}

interface OrdemDetalhe extends Ordem {
  custo_estimado: string | null
  custo_real: string | null
  responsavel_nome: string | null
  avaliacao_estrelas: number | null
  avaliacao_comentario: string | null
  comentarios: Comentario[]
}

const TIPOS = [
  { v: 'predial', label: 'Predial' },
  { v: 'eletrica', label: 'Elétrica' },
  { v: 'hidraulica', label: 'Hidráulica' },
  { v: 'mobiliario', label: 'Mobiliário' },
  { v: 'ti', label: 'TI / Informática' },
  { v: 'rede_internet', label: 'Rede / Internet' },
  { v: 'limpeza', label: 'Limpeza' },
  { v: 'jardinagem', label: 'Jardinagem' },
  { v: 'pintura', label: 'Pintura' },
  { v: 'estrutural', label: 'Estrutural' },
  { v: 'merenda_equip', label: 'Equipamento merenda' },
  { v: 'outros', label: 'Outros' },
]

const STATUS = ['aberta', 'em_analise', 'aprovada', 'em_atendimento', 'aguardando_material', 'aguardando_terceiros', 'concluida', 'cancelada', 'reaberta']
const STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  aprovada: 'Aprovada',
  em_atendimento: 'Em atendimento',
  aguardando_material: 'Aguardando material',
  aguardando_terceiros: 'Aguardando terceiros',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  reaberta: 'Reaberta',
}

const STATUS_BADGE: Record<string, string> = {
  aberta: 'bg-amber-100 text-amber-700',
  em_analise: 'bg-blue-100 text-blue-700',
  aprovada: 'bg-cyan-100 text-cyan-700',
  em_atendimento: 'bg-indigo-100 text-indigo-700',
  aguardando_material: 'bg-orange-100 text-orange-700',
  aguardando_terceiros: 'bg-purple-100 text-purple-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-slate-100 text-slate-700',
  reaberta: 'bg-red-100 text-red-700',
}

const PRIORIDADE_BADGE: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700',
}

const ordemVazia = {
  escola_id: '', tipo: 'predial', prioridade: 'media',
  titulo: '', descricao: '', local_escola: '',
}

function OsAdmin() {
  const toast = useToast()
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [apenasAbertas, setApenasAbertas] = useState(true)

  const [expandido, setExpandido] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<OrdemDetalhe | null>(null)
  const [carregandoDet, setCarregandoDet] = useState(false)

  const [modalAbrir, setModalAbrir] = useState(false)
  const [novaOrdem, setNovaOrdem] = useState(ordemVazia)
  const [salvando, setSalvando] = useState(false)
  const [novoComentario, setNovoComentario] = useState('')
  const [novoStatus, setNovoStatus] = useState('')
  const [comentarioStatus, setComentarioStatus] = useState('')
  const [modalAvaliar, setModalAvaliar] = useState<string | null>(null)
  const [avaliacaoEstrelas, setAvaliacaoEstrelas] = useState(5)
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const p = new URLSearchParams({ recurso: 'lista', limite: '100' })
      if (filtroEscola) p.set('escola', filtroEscola)
      if (filtroStatus) p.set('status', filtroStatus)
      if (filtroTipo) p.set('tipo', filtroTipo)
      if (apenasAbertas && !filtroStatus) p.set('apenas_abertas', 'true')
      const res = await fetch(`/api/admin/ordens-servico?${p}`)
      const data = await res.json()
      setOrdens(data.ordens || [])
    } catch {
      toast.error('Erro ao carregar OS')
    } finally {
      setCarregando(false)
    }
  }, [filtroEscola, filtroStatus, filtroTipo, apenasAbertas, toast])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[OS] escolas', e) })
    return () => controller.abort()
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function abrirDetalhe(o: Ordem) {
    if (expandido === o.id) {
      setExpandido(null)
      setDetalhe(null)
      return
    }
    setExpandido(o.id)
    setNovoStatus(o.status)
    setComentarioStatus('')
    setCarregandoDet(true)
    try {
      const res = await fetch(`/api/admin/ordens-servico?recurso=detalhe&id=${o.id}`)
      const data = await res.json()
      setDetalhe(data.ordem)
    } catch {
      toast.error('Erro ao carregar detalhes')
    } finally {
      setCarregandoDet(false)
    }
  }

  async function salvarOrdem() {
    if (!novaOrdem.escola_id || !novaOrdem.titulo.trim() || novaOrdem.descricao.trim().length < 10) {
      toast.error('Escola, título e descrição (≥10 chars) são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        escola_id: novaOrdem.escola_id,
        tipo: novaOrdem.tipo,
        prioridade: novaOrdem.prioridade,
        titulo: novaOrdem.titulo.trim(),
        descricao: novaOrdem.descricao.trim(),
      }
      if (novaOrdem.local_escola) body.local_escola = novaOrdem.local_escola

      const res = await fetch('/api/admin/ordens-servico?acao=abrir', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      const data = await res.json()
      toast.success(`OS ${data.numero || ''} aberta`)
      setModalAbrir(false)
      setNovaOrdem(ordemVazia)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function atualizarStatus(ordemId: string) {
    if (!novoStatus || comentarioStatus.trim().length < 5) {
      toast.error('Comentário (≥5 chars) é obrigatório para mudança de status')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/ordens-servico?acao=atualizar_status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordem_id: ordemId, novo_status: novoStatus, comentario: comentarioStatus.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Status atualizado')
      setComentarioStatus('')
      const r = await fetch(`/api/admin/ordens-servico?recurso=detalhe&id=${ordemId}`)
      const d = await r.json()
      setDetalhe(d.ordem)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function avaliarOS(ordemId: string) {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/ordens-servico?acao=avaliar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordem_id: ordemId,
          estrelas: avaliacaoEstrelas,
          comentario: avaliacaoComentario.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Avaliação registrada')
      setModalAvaliar(null)
      setAvaliacaoEstrelas(5)
      setAvaliacaoComentario('')
      const r = await fetch(`/api/admin/ordens-servico?recurso=detalhe&id=${ordemId}`)
      const d = await r.json()
      setDetalhe(d.ordem)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function comentar(ordemId: string) {
    if (novoComentario.trim().length < 2) {
      toast.error('Comentário muito curto')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/ordens-servico?acao=comentar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordem_id: ordemId, texto: novoComentario.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Comentário adicionado')
      setNovoComentario('')
      const r = await fetch(`/api/admin/ordens-servico?recurso=detalhe&id=${ordemId}`)
      const d = await r.json()
      setDetalhe(d.ordem)
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-slate-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wrench className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
              <p className="text-slate-200 text-sm">Manutenção e atendimento de chamados escola → SEMED</p>
            </div>
          </div>
          <button onClick={() => { setNovaOrdem(ordemVazia); setModalAbrir(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-700 text-sm font-bold hover:bg-slate-100">
            <Plus className="w-4 h-4" /> Abrir OS
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas escolas</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
            <option value="">Todos status</option>
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={inputCls}>
            <option value="">Todos tipos</option>
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={apenasAbertas} disabled={!!filtroStatus} onChange={(e) => setApenasAbertas(e.target.checked)} className="rounded text-slate-600" />
            Apenas abertas
          </label>
        </div>
      </div>

      {carregando ? <LoadingSpinner centered /> : ordens.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma OS encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordens.map((o) => (
            <div key={o.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => abrirDetalhe(o)} className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{o.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PRIORIDADE_BADGE[o.prioridade]}`}>{o.prioridade}</span>
                      <span className="text-xs text-gray-500">{TIPOS.find((t) => t.v === o.tipo)?.label}</span>
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{o.titulo}</p>
                    <p className="text-xs text-gray-500">
                      {o.escola_nome}
                      {o.local_escola && ` • ${o.local_escola}`}
                      • Aberta em {new Date(o.aberta_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {expandido === o.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {expandido === o.id && (
                <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50">
                  {carregandoDet ? (
                    <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-600 mx-auto" /></div>
                  ) : detalhe ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Descrição:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{detalhe.descricao}</p>
                      </div>
                      {(detalhe.custo_estimado || detalhe.custo_real) && (
                        <div className="flex gap-4 text-xs">
                          {detalhe.custo_estimado && <span className="text-amber-700">Custo estimado: R$ {parseFloat(detalhe.custo_estimado).toFixed(2)}</span>}
                          {detalhe.custo_real && <span className="text-green-700">Custo real: R$ {parseFloat(detalhe.custo_real).toFixed(2)}</span>}
                        </div>
                      )}

                      {detalhe.status === 'concluida' && (
                        detalhe.avaliacao_estrelas != null ? (
                          <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star key={n} className={`w-4 h-4 ${n <= (detalhe.avaliacao_estrelas || 0) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}`} />
                              ))}
                            </div>
                            {detalhe.avaliacao_comentario && (
                              <span className="text-gray-700 dark:text-gray-300 text-xs italic">&ldquo;{detalhe.avaliacao_comentario}&rdquo;</span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAvaliacaoEstrelas(5); setAvaliacaoComentario(''); setModalAvaliar(o.id) }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-200"
                          >
                            <Star className="w-4 h-4" /> Avaliar serviço
                          </button>
                        )
                      )}

                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2">
                          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300">Atualizar status</h4>
                          <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className={`${inputCls} w-full`}>
                            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                          </select>
                          <textarea value={comentarioStatus} onChange={(e) => setComentarioStatus(e.target.value)} rows={2} placeholder="Comentário sobre a mudança (mín. 5 caracteres)" className={`${inputCls} w-full`} />
                          <button onClick={() => atualizarStatus(o.id)} disabled={salvando} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50">
                            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Atualizar
                          </button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2">
                          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Timeline ({detalhe.comentarios?.length || 0})</h4>
                          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                            {detalhe.comentarios?.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center">Sem comentários</p>
                            ) : detalhe.comentarios?.map((c) => (
                              <div key={c.id} className="text-xs border-b border-gray-100 dark:border-slate-700 pb-2">
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{c.autor_nome || 'Sistema'} <span className="text-gray-400 font-normal">{new Date(c.criado_em).toLocaleString('pt-BR')}</span></p>
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.texto}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} placeholder="Adicionar comentário..." className={`${inputCls} flex-1`} />
                            <button onClick={() => comentar(o.id)} disabled={salvando || novoComentario.trim().length < 2} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50">
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalAvaliar && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Avaliar serviço concluído</h2>
              <button onClick={() => setModalAvaliar(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Estrelas *</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAvaliacaoEstrelas(n)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-8 h-8 ${n <= avaliacaoEstrelas ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Comentário (opcional)</label>
                <textarea
                  value={avaliacaoComentario}
                  onChange={(e) => setAvaliacaoComentario(e.target.value)}
                  rows={3}
                  placeholder="Como avalia o atendimento? Pontos positivos e melhorias..."
                  className={`${inputCls} w-full`}
                />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalAvaliar(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={() => avaliarOS(modalAvaliar)} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />} Enviar avaliação
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAbrir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Abrir ordem de serviço</h2>
              <button onClick={() => setModalAbrir(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
                <select value={novaOrdem.escola_id} onChange={(e) => setNovaOrdem({ ...novaOrdem, escola_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
                  <select value={novaOrdem.tipo} onChange={(e) => setNovaOrdem({ ...novaOrdem, tipo: e.target.value })} className={`${inputCls} w-full`}>
                    {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Prioridade</label>
                  <select value={novaOrdem.prioridade} onChange={(e) => setNovaOrdem({ ...novaOrdem, prioridade: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <input type="text" value={novaOrdem.titulo} onChange={(e) => setNovaOrdem({ ...novaOrdem, titulo: e.target.value })} placeholder="Resumo da demanda" className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição * (mín. 10 caracteres)</label>
                <textarea value={novaOrdem.descricao} onChange={(e) => setNovaOrdem({ ...novaOrdem, descricao: e.target.value })} rows={4} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Local na escola</label>
                <input type="text" value={novaOrdem.local_escola} onChange={(e) => setNovaOrdem({ ...novaOrdem, local_escola: e.target.value })} placeholder="Ex: Sala 12, banheiro masculino..." className={`${inputCls} w-full`} />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalAbrir(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarOrdem} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />} Abrir OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OsAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <OsAdmin />
    </ProtectedRoute>
  )
}
