'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Plus,
  X,
  Loader2,
  Save,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  FileText,
  AlertCircle,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola {
  id: string
  nome: string
}

interface TipoVerba {
  id: string
  nome: string
  natureza: string
}

interface Orcamento {
  id: string
  ano_letivo: string
  tipo_verba_id: string
  verba_nome: string
  natureza: string
  valor_recebido: string
  data_credito: string
  conta_bancaria: string | null
  observacoes: string | null
}

interface SaldoLinha {
  orcamento_id: string
  ano_letivo: string
  escola_id: string
  tipo_verba_id: string
  verba_nome: string
  natureza: string
  valor_recebido: string
  valor_executado: string
  saldo_atual: string
}

interface Resumo {
  total_recebido: number
  total_executado: number
  saldo_total: number
  execucao_percentual: number
}

interface Despesa {
  id: string
  data_despesa: string
  descricao: string
  fornecedor: string | null
  valor: string
  categoria: string | null
  numero_nota: string | null
  forma_pagamento: string | null
  status: string
}

const FORMAS_PAGAMENTO = [
  { v: 'transferencia', label: 'Transferência' },
  { v: 'cheque', label: 'Cheque' },
  { v: 'cartao_debito', label: 'Cartão de débito' },
  { v: 'cartao_credito', label: 'Cartão de crédito' },
  { v: 'pix', label: 'PIX' },
  { v: 'boleto', label: 'Boleto' },
]

const STATUS_BADGE: Record<string, string> = {
  registrada: 'bg-amber-100 text-amber-700',
  paga: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
}

const NATUREZA_BADGE: Record<string, string> = {
  custeio: 'bg-blue-100 text-blue-700',
  capital: 'bg-purple-100 text-purple-700',
}

const fmtBRL = (n: number | string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(typeof n === 'string' ? parseFloat(n) : n)

const orcamentoVazio = {
  ano_letivo: String(new Date().getFullYear()),
  tipo_verba_id: '',
  valor_recebido: '',
  data_credito: new Date().toISOString().slice(0, 10),
  conta_bancaria: '',
  observacoes: '',
}

const despesaVazia = {
  orcamento_id: '',
  data_despesa: new Date().toISOString().slice(0, 10),
  descricao: '',
  fornecedor: '',
  fornecedor_cnpj: '',
  valor: '',
  categoria: '',
  numero_nota: '',
  data_nota: '',
  nota_url: '',
  forma_pagamento: '',
  status: 'registrada',
  observacoes: '',
}

function PddeAdmin() {
  const toast = useToast()
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [tiposVerba, setTiposVerba] = useState<TipoVerba[]>([])
  const [escolaSelecionada, setEscolaSelecionada] = useState('')
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [saldos, setSaldos] = useState<SaldoLinha[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(false)

  const [orcamentoExpandido, setOrcamentoExpandido] = useState<string | null>(null)
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [carregandoDespesas, setCarregandoDespesas] = useState(false)

  const [modalOrcamento, setModalOrcamento] = useState(false)
  const [modalDespesa, setModalDespesa] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novoOrcamento, setNovoOrcamento] = useState(orcamentoVazio)
  const [novaDespesa, setNovaDespesa] = useState(despesaVazia)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/admin/escolas', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setEscolas(Array.isArray(d) ? d : [])),
      fetch('/api/admin/pdde?recurso=tipos_verba', { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          setTiposVerba(d.tipos || [])
          if (d.tipos?.[0]) setNovoOrcamento((o) => ({ ...o, tipo_verba_id: d.tipos[0].id }))
        }),
    ]).catch((e) => {
      if ((e as Error).name !== 'AbortError') console.error('[PDDE] init', e)
    })
    return () => controller.abort()
  }, [])

  const carregar = useCallback(async () => {
    if (!escolaSelecionada) {
      setSaldos([])
      setResumo(null)
      setOrcamentos([])
      return
    }
    setCarregando(true)
    try {
      const [saldosRes, orcRes] = await Promise.all([
        fetch(`/api/admin/pdde?recurso=saldos&escola=${escolaSelecionada}&ano=${ano}`),
        fetch(`/api/admin/pdde?recurso=orcamentos&escola=${escolaSelecionada}&ano=${ano}`),
      ])
      const saldosData = await saldosRes.json()
      const orcData = await orcRes.json()
      setSaldos(saldosData.orcamentos || [])
      setResumo(saldosData.resumo || null)
      setOrcamentos(orcData.orcamentos || [])
    } catch {
      toast.error('Erro ao carregar dados PDDE')
    } finally {
      setCarregando(false)
    }
  }, [escolaSelecionada, ano, toast])

  useEffect(() => { carregar() }, [carregar])

  async function expandirOrcamento(o: Orcamento) {
    if (orcamentoExpandido === o.id) {
      setOrcamentoExpandido(null)
      setDespesas([])
      return
    }
    setOrcamentoExpandido(o.id)
    setCarregandoDespesas(true)
    try {
      const res = await fetch(`/api/admin/pdde?recurso=despesas&orcamento=${o.id}`)
      const data = await res.json()
      setDespesas(data.despesas || [])
    } catch {
      toast.error('Erro ao carregar despesas')
    } finally {
      setCarregandoDespesas(false)
    }
  }

  async function cancelarDespesa(despesaId: string, descricao: string, orcamentoId: string) {
    const motivo = window.prompt(`Confirmar cancelamento da despesa "${descricao}"?\n\nInforme o motivo (mín. 5 caracteres):`)
    if (!motivo || motivo.trim().length < 5) {
      if (motivo !== null) toast.error('Motivo deve ter no mínimo 5 caracteres')
      return
    }
    try {
      const res = await fetch(`/api/admin/pdde?despesa=${despesaId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Despesa cancelada — saldo recalculado')
      // Recarrega despesas do orçamento expandido + saldos gerais
      const r = await fetch(`/api/admin/pdde?recurso=despesas&orcamento=${orcamentoId}`)
      const data = await r.json()
      setDespesas(data.despesas || [])
      carregar()
    } catch (e) { toast.error((e as Error).message) }
  }

  async function salvarOrcamento() {
    if (!escolaSelecionada) {
      toast.error('Selecione uma escola')
      return
    }
    if (!novoOrcamento.tipo_verba_id || !novoOrcamento.valor_recebido) {
      toast.error('Tipo de verba e valor são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        escola_id: escolaSelecionada,
        ano_letivo: novoOrcamento.ano_letivo,
        tipo_verba_id: novoOrcamento.tipo_verba_id,
        valor_recebido: parseFloat(novoOrcamento.valor_recebido),
        data_credito: novoOrcamento.data_credito,
      }
      if (novoOrcamento.conta_bancaria) body.conta_bancaria = novoOrcamento.conta_bancaria
      if (novoOrcamento.observacoes) body.observacoes = novoOrcamento.observacoes

      const res = await fetch('/api/admin/pdde?acao=orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Orçamento registrado')
      setModalOrcamento(false)
      setNovoOrcamento({ ...orcamentoVazio, tipo_verba_id: tiposVerba[0]?.id || '' })
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarDespesa() {
    if (!novaDespesa.orcamento_id || !novaDespesa.descricao.trim() || !novaDespesa.valor) {
      toast.error('Orçamento, descrição e valor são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        orcamento_id: novaDespesa.orcamento_id,
        data_despesa: novaDespesa.data_despesa,
        descricao: novaDespesa.descricao.trim(),
        valor: parseFloat(novaDespesa.valor),
        status: novaDespesa.status,
      }
      if (novaDespesa.fornecedor) body.fornecedor = novaDespesa.fornecedor
      if (novaDespesa.fornecedor_cnpj) body.fornecedor_cnpj = novaDespesa.fornecedor_cnpj.replace(/\D/g, '')
      if (novaDespesa.categoria) body.categoria = novaDespesa.categoria
      if (novaDespesa.numero_nota) body.numero_nota = novaDespesa.numero_nota
      if (novaDespesa.data_nota) body.data_nota = novaDespesa.data_nota
      if (novaDespesa.nota_url) body.nota_url = novaDespesa.nota_url
      if (novaDespesa.forma_pagamento) body.forma_pagamento = novaDespesa.forma_pagamento
      if (novaDespesa.observacoes) body.observacoes = novaDespesa.observacoes

      const res = await fetch('/api/admin/pdde?acao=despesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Despesa registrada')
      setModalDespesa(false)
      setNovaDespesa(despesaVazia)
      carregar()
      // recarrega despesas se orçamento estava expandido
      if (orcamentoExpandido === novaDespesa.orcamento_id) {
        const r = await fetch(`/api/admin/pdde?recurso=despesas&orcamento=${novaDespesa.orcamento_id}`)
        const data = await r.json()
        setDespesas(data.despesas || [])
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">PDDE — Financeiro</h1>
              <p className="text-emerald-100 text-sm">Programa Dinheiro Direto na Escola</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setNovoOrcamento({ ...orcamentoVazio, tipo_verba_id: tiposVerba[0]?.id || '' }); setModalOrcamento(true) }}
              disabled={!escolaSelecionada}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Recebimento
            </button>
            <button
              onClick={() => { setNovaDespesa(despesaVazia); setModalDespesa(true) }}
              disabled={!escolaSelecionada || orcamentos.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-emerald-700 text-sm font-bold hover:bg-emerald-50 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Despesa
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
            <select value={escolaSelecionada} onChange={(e) => setEscolaSelecionada(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Selecione</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ano</label>
            <select value={ano} onChange={(e) => setAno(e.target.value)} className={inputCls}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!escolaSelecionada ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Selecione uma escola para ver orçamentos e saldos</p>
        </div>
      ) : carregando ? (
        <LoadingSpinner centered />
      ) : (
        <>
          {resumo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{fmtBRL(resumo.total_recebido)}</p>
                <p className="text-xs text-blue-600">Recebido</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
                <TrendingDown className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{fmtBRL(resumo.total_executado)}</p>
                <p className="text-xs text-amber-600">Executado</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                <Wallet className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{fmtBRL(resumo.saldo_total)}</p>
                <p className="text-xs text-green-600">Saldo</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
                <Receipt className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{resumo.execucao_percentual}%</p>
                <p className="text-xs text-purple-600">Execução</p>
              </div>
            </div>
          )}

          {orcamentos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum recebimento registrado neste ano</p>
              <button onClick={() => setModalOrcamento(true)} className="mt-4 text-emerald-600 text-sm font-semibold hover:text-emerald-700">
                Registrar primeiro recebimento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orcamentos.map((o) => {
                const saldoLinha = saldos.find((s) => s.orcamento_id === o.id)
                const saldoDisp = saldoLinha ? parseFloat(saldoLinha.saldo_atual) : parseFloat(o.valor_recebido)
                const executado = saldoLinha ? parseFloat(saldoLinha.valor_executado) : 0
                const pct = parseFloat(o.valor_recebido) > 0 ? Math.round((executado / parseFloat(o.valor_recebido)) * 100) : 0
                return (
                  <div key={o.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <button onClick={() => expandirOrcamento(o)} className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="font-bold text-gray-800 dark:text-gray-200">{o.verba_nome}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${NATUREZA_BADGE[o.natureza] || 'bg-gray-100 text-gray-700'}`}>{o.natureza}</span>
                        <span className="text-xs text-gray-500">Crédito: {new Date(o.data_credito).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Recebido</p>
                          <p className="font-bold text-blue-700 dark:text-blue-300">{fmtBRL(o.valor_recebido)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Executado</p>
                          <p className="font-bold text-amber-700 dark:text-amber-300">{fmtBRL(executado)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Saldo</p>
                          <p className="font-bold text-green-700 dark:text-green-300">{fmtBRL(saldoDisp)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Execução</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    {orcamentoExpandido === o.id && (
                      <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Despesas ({despesas.length})</h4>
                          <button
                            onClick={() => { setNovaDespesa({ ...despesaVazia, orcamento_id: o.id }); setModalDespesa(true) }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                          >
                            <Plus className="w-3 h-3" /> Nova despesa
                          </button>
                        </div>
                        {carregandoDespesas ? (
                          <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" /></div>
                        ) : despesas.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">Nenhuma despesa</p>
                        ) : (
                          <div className="space-y-2">
                            {despesas.map((d) => (
                              <div key={d.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 text-sm">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{d.descricao}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(d.data_despesa).toLocaleDateString('pt-BR')}
                                      {d.fornecedor && ` • ${d.fornecedor}`}
                                      {d.numero_nota && ` • NF ${d.numero_nota}`}
                                    </p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <p className={`font-bold ${d.status === 'cancelada' ? 'text-gray-400 line-through' : 'text-amber-700 dark:text-amber-300'}`}>{fmtBRL(d.valor)}</p>
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[d.status]}`}>{d.status}</span>
                                    {d.status !== 'cancelada' && (
                                      <button
                                        onClick={() => cancelarDespesa(d.id, d.descricao, o.id)}
                                        className="text-xs text-red-600 hover:text-red-700 font-semibold"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {modalOrcamento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo recebimento de verba</h2>
              <button onClick={() => setModalOrcamento(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de verba *</label>
                <select value={novoOrcamento.tipo_verba_id} onChange={(e) => setNovoOrcamento({ ...novoOrcamento, tipo_verba_id: e.target.value })} className={`${inputCls} w-full`}>
                  {tiposVerba.map((t) => <option key={t.id} value={t.id}>{t.nome} ({t.natureza})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                  <select value={novoOrcamento.ano_letivo} onChange={(e) => setNovoOrcamento({ ...novoOrcamento, ano_letivo: e.target.value })} className={`${inputCls} w-full`}>
                    {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data do crédito *</label>
                  <input type="date" value={novoOrcamento.data_credito} onChange={(e) => setNovoOrcamento({ ...novoOrcamento, data_credito: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor recebido (R$) *</label>
                  <input type="number" step={0.01} min={0.01} value={novoOrcamento.valor_recebido} onChange={(e) => setNovoOrcamento({ ...novoOrcamento, valor_recebido: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Conta bancária</label>
                  <input type="text" value={novoOrcamento.conta_bancaria} onChange={(e) => setNovoOrcamento({ ...novoOrcamento, conta_bancaria: e.target.value })} placeholder="Ex: BB 1234-5 / 67890-1" className={`${inputCls} w-full`} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                  <textarea value={novoOrcamento.observacoes} onChange={(e) => setNovoOrcamento({ ...novoOrcamento, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalOrcamento(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarOrcamento} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDespesa && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova despesa</h2>
              <button onClick={() => setModalDespesa(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Orçamento (verba) *</label>
                <select value={novaDespesa.orcamento_id} onChange={(e) => setNovaDespesa({ ...novaDespesa, orcamento_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {orcamentos.map((o) => {
                    const s = saldos.find((x) => x.orcamento_id === o.id)
                    const disp = s ? parseFloat(s.saldo_atual) : parseFloat(o.valor_recebido)
                    return <option key={o.id} value={o.id}>{o.verba_nome} — disponível {fmtBRL(disp)}</option>
                  })}
                </select>
                {novaDespesa.orcamento_id && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Saldo é validado no servidor — despesa será rejeitada se exceder
                  </p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data da despesa *</label>
                  <input type="date" value={novaDespesa.data_despesa} onChange={(e) => setNovaDespesa({ ...novaDespesa, data_despesa: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$) *</label>
                  <input type="number" step={0.01} min={0.01} value={novaDespesa.valor} onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição *</label>
                  <input type="text" value={novaDespesa.descricao} onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })} placeholder="O que foi comprado/contratado" className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Fornecedor</label>
                  <input type="text" value={novaDespesa.fornecedor} onChange={(e) => setNovaDespesa({ ...novaDespesa, fornecedor: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">CNPJ do fornecedor</label>
                  <input type="text" value={novaDespesa.fornecedor_cnpj} onChange={(e) => setNovaDespesa({ ...novaDespesa, fornecedor_cnpj: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Número NF</label>
                  <input type="text" value={novaDespesa.numero_nota} onChange={(e) => setNovaDespesa({ ...novaDespesa, numero_nota: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data NF</label>
                  <input type="date" value={novaDespesa.data_nota} onChange={(e) => setNovaDespesa({ ...novaDespesa, data_nota: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">URL da nota fiscal</label>
                  <input type="url" value={novaDespesa.nota_url} onChange={(e) => setNovaDespesa({ ...novaDespesa, nota_url: e.target.value })} placeholder="https://..." className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Forma de pagamento</label>
                  <select value={novaDespesa.forma_pagamento} onChange={(e) => setNovaDespesa({ ...novaDespesa, forma_pagamento: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    {FORMAS_PAGAMENTO.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                  <select value={novaDespesa.status} onChange={(e) => setNovaDespesa({ ...novaDespesa, status: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="registrada">Registrada</option>
                    <option value="paga">Paga</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
                  <input type="text" value={novaDespesa.categoria} onChange={(e) => setNovaDespesa({ ...novaDespesa, categoria: e.target.value })} placeholder="material, servico..." className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                  <textarea value={novaDespesa.observacoes} onChange={(e) => setNovaDespesa({ ...novaDespesa, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalDespesa(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarDespesa} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Registrar despesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PddeAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <PddeAdmin />
    </ProtectedRoute>
  )
}
