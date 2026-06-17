'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Boxes,
  Plus,
  Search,
  X,
  Loader2,
  Save,
  ArrowRightLeft,
  ClipboardCheck,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola { id: string; nome: string }

interface Bem {
  id: string
  tombo: string
  descricao: string
  categoria: string
  marca: string | null
  modelo: string | null
  escola_id: string | null
  escola_nome: string | null
  sala_localizacao: string | null
  estado_conservacao: string | null
  status: string
  valor_aquisicao: string | null
}

const CATEGORIAS = [
  { v: 'mobiliario', label: 'Mobiliário' },
  { v: 'eletronico', label: 'Eletrônico' },
  { v: 'didatico', label: 'Didático' },
  { v: 'esportivo', label: 'Esportivo' },
  { v: 'veiculo', label: 'Veículo' },
  { v: 'imovel', label: 'Imóvel' },
  { v: 'equipamento_cozinha', label: 'Cozinha' },
  { v: 'eletrodomestico', label: 'Eletrodoméstico' },
  { v: 'instrumento_musical', label: 'Instrumento musical' },
  { v: 'biblioteca', label: 'Biblioteca' },
  { v: 'outro', label: 'Outro' },
]

const ESTADOS = ['novo', 'bom', 'regular', 'ruim', 'inservivel']
const STATUS_BADGE: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  em_manutencao: 'bg-amber-100 text-amber-700',
  baixado: 'bg-red-100 text-red-700',
  transferido: 'bg-blue-100 text-blue-700',
}

const TIPOS_MOV = [
  { v: 'transferencia', label: 'Transferência entre escolas' },
  { v: 'manutencao_envio', label: 'Envio para manutenção' },
  { v: 'manutencao_retorno', label: 'Retorno de manutenção' },
  { v: 'baixa', label: 'Baixa do patrimônio' },
  { v: 'reativacao', label: 'Reativação' },
  { v: 'mudanca_estado_conservacao', label: 'Mudança de estado' },
]

const bemVazio = {
  tombo: '', descricao: '', categoria: 'mobiliario',
  marca: '', modelo: '', numero_serie: '', valor_aquisicao: '',
  data_aquisicao: '', origem: 'compra', documento_origem: '',
  escola_id: '', sala_localizacao: '', estado_conservacao: 'bom',
  observacoes: '', foto_url: '',
}

const movVazia = {
  bem_id: '', tipo: 'transferencia',
  escola_origem_id: '', escola_destino_id: '',
  sala_origem: '', sala_destino: '',
  estado_anterior: '', estado_novo: '',
  motivo: '', documento_url: '',
  realizado_em: new Date().toISOString().slice(0, 10),
}

function PatrimonioAdmin() {
  const toast = useToast()
  const [bens, setBens] = useState<Bem[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')

  const [modalBem, setModalBem] = useState(false)
  const [modalMov, setModalMov] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novoBem, setNovoBem] = useState(bemVazio)
  const [novaMov, setNovaMov] = useState(movVazia)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const p = new URLSearchParams({ recurso: 'bens', limite: '200' })
      if (filtroEscola) p.set('escola', filtroEscola)
      if (filtroCategoria) p.set('categoria', filtroCategoria)
      if (filtroStatus) p.set('status', filtroStatus)
      if (busca.trim().length > 2) p.set('busca', busca.trim())
      const res = await fetch(`/api/admin/patrimonio?${p}`)
      const data = await res.json()
      setBens(data.bens || [])
    } catch {
      toast.error('Erro ao carregar bens')
    } finally {
      setCarregando(false)
    }
  }, [filtroEscola, filtroCategoria, filtroStatus, busca, toast])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[Patrimonio] escolas', e) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => carregar(), 300)
    return () => clearTimeout(t)
  }, [carregar])

  async function salvarBem() {
    if (!novoBem.tombo.trim() || !novoBem.descricao.trim()) {
      toast.error('Tombo e descrição são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        tombo: novoBem.tombo.trim(),
        descricao: novoBem.descricao.trim(),
        categoria: novoBem.categoria,
      }
      if (novoBem.marca) body.marca = novoBem.marca
      if (novoBem.modelo) body.modelo = novoBem.modelo
      if (novoBem.numero_serie) body.numero_serie = novoBem.numero_serie
      if (novoBem.valor_aquisicao) body.valor_aquisicao = parseFloat(novoBem.valor_aquisicao)
      if (novoBem.data_aquisicao) body.data_aquisicao = novoBem.data_aquisicao
      if (novoBem.origem) body.origem = novoBem.origem
      if (novoBem.documento_origem) body.documento_origem = novoBem.documento_origem
      if (novoBem.escola_id) body.escola_id = novoBem.escola_id
      if (novoBem.sala_localizacao) body.sala_localizacao = novoBem.sala_localizacao
      if (novoBem.estado_conservacao) body.estado_conservacao = novoBem.estado_conservacao
      if (novoBem.observacoes) body.observacoes = novoBem.observacoes
      if (novoBem.foto_url) body.foto_url = novoBem.foto_url

      const res = await fetch('/api/admin/patrimonio?acao=bem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Bem cadastrado')
      setModalBem(false)
      setNovoBem(bemVazio)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarMov() {
    if (!novaMov.bem_id || !novaMov.motivo.trim()) {
      toast.error('Bem e motivo são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        bem_id: novaMov.bem_id,
        tipo: novaMov.tipo,
        motivo: novaMov.motivo.trim(),
        realizado_em: novaMov.realizado_em,
      }
      if (novaMov.escola_origem_id) body.escola_origem_id = novaMov.escola_origem_id
      if (novaMov.escola_destino_id) body.escola_destino_id = novaMov.escola_destino_id
      if (novaMov.sala_origem) body.sala_origem = novaMov.sala_origem
      if (novaMov.sala_destino) body.sala_destino = novaMov.sala_destino
      if (novaMov.estado_anterior) body.estado_anterior = novaMov.estado_anterior
      if (novaMov.estado_novo) body.estado_novo = novaMov.estado_novo
      if (novaMov.documento_url) body.documento_url = novaMov.documento_url

      const res = await fetch('/api/admin/patrimonio?acao=movimentacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Movimentação registrada')
      setModalMov(false)
      setNovaMov(movVazia)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Boxes className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Patrimônio</h1>
              <p className="text-orange-100 text-sm">Bens municipais nas escolas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setNovaMov(movVazia); setModalMov(true) }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <ArrowRightLeft className="w-4 h-4" /> Movimentar
            </button>
            <button onClick={() => { setNovoBem(bemVazio); setModalBem(true) }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-orange-700 text-sm font-bold hover:bg-orange-50">
              <Plus className="w-4 h-4" /> Novo bem
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tombo ou descrição..." className={`${inputCls} w-full pl-9`} />
          </div>
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas as escolas</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={inputCls}>
            <option value="">Todas categorias</option>
            {CATEGORIAS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
            <option value="">Todos status</option>
            <option value="ativo">Ativo</option>
            <option value="em_manutencao">Em manutenção</option>
            <option value="baixado">Baixado</option>
            <option value="transferido">Transferido</option>
          </select>
        </div>
      </div>

      {carregando ? <LoadingSpinner centered /> : bens.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum bem cadastrado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Tombo</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Descrição</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Categoria</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Escola</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Local</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {bens.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-2 px-4 font-mono font-bold text-orange-700">{b.tombo}</td>
                    <td className="py-2 px-4 text-gray-800 dark:text-gray-200">{b.descricao}</td>
                    <td className="py-2 px-4 text-xs text-gray-500">{CATEGORIAS.find((c) => c.v === b.categoria)?.label || b.categoria}</td>
                    <td className="py-2 px-4 text-xs text-gray-500">{b.escola_nome || 'SEMED'}</td>
                    <td className="py-2 px-4 text-xs text-gray-500">{b.sala_localizacao || '—'}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[b.status] || 'bg-slate-100 text-slate-700'}`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {bens.map((b) => (
              <div key={b.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-mono font-bold text-orange-700">{b.tombo}</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{b.descricao}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[b.status] || 'bg-slate-100'}`}>{b.status}</span>
                </div>
                <p className="text-xs text-gray-500">{b.escola_nome || 'SEMED'} • {b.sala_localizacao || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalBem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo bem</h2>
              <button onClick={() => setModalBem(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tombo *</label>
                  <input type="text" value={novoBem.tombo} onChange={(e) => setNovoBem({ ...novoBem, tombo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria *</label>
                  <select value={novoBem.categoria} onChange={(e) => setNovoBem({ ...novoBem, categoria: e.target.value })} className={`${inputCls} w-full`}>
                    {CATEGORIAS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Descrição *</label>
                  <input type="text" value={novoBem.descricao} onChange={(e) => setNovoBem({ ...novoBem, descricao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Marca</label>
                  <input type="text" value={novoBem.marca} onChange={(e) => setNovoBem({ ...novoBem, marca: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Modelo</label>
                  <input type="text" value={novoBem.modelo} onChange={(e) => setNovoBem({ ...novoBem, modelo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Número de série</label>
                  <input type="text" value={novoBem.numero_serie} onChange={(e) => setNovoBem({ ...novoBem, numero_serie: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Valor de aquisição (R$)</label>
                  <input type="number" step={0.01} value={novoBem.valor_aquisicao} onChange={(e) => setNovoBem({ ...novoBem, valor_aquisicao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Data aquisição</label>
                  <input type="date" value={novoBem.data_aquisicao} onChange={(e) => setNovoBem({ ...novoBem, data_aquisicao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Origem</label>
                  <select value={novoBem.origem} onChange={(e) => setNovoBem({ ...novoBem, origem: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="compra">Compra</option>
                    <option value="doacao">Doação</option>
                    <option value="transferencia">Transferência</option>
                    <option value="cessao">Cessão</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Documento de origem (NF/contrato)</label>
                  <input type="text" value={novoBem.documento_origem} onChange={(e) => setNovoBem({ ...novoBem, documento_origem: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Escola (deixe vazio para SEMED)</label>
                  <select value={novoBem.escola_id} onChange={(e) => setNovoBem({ ...novoBem, escola_id: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">SEMED (sede)</option>
                    {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Sala / localização</label>
                  <input type="text" value={novoBem.sala_localizacao} onChange={(e) => setNovoBem({ ...novoBem, sala_localizacao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Estado conservação</label>
                  <select value={novoBem.estado_conservacao} onChange={(e) => setNovoBem({ ...novoBem, estado_conservacao: e.target.value })} className={`${inputCls} w-full`}>
                    {ESTADOS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">URL da foto</label>
                  <input type="url" value={novoBem.foto_url} onChange={(e) => setNovoBem({ ...novoBem, foto_url: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                  <textarea value={novoBem.observacoes} onChange={(e) => setNovoBem({ ...novoBem, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalBem(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarBem} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMov && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Nova movimentação</h2>
              <button onClick={() => setModalMov(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Bem (selecione pelo tombo) *</label>
                <select value={novaMov.bem_id} onChange={(e) => setNovaMov({ ...novaMov, bem_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {bens.map((b) => <option key={b.id} value={b.id}>{b.tombo} — {b.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
                <select
                  value={novaMov.tipo}
                  onChange={(e) => {
                    // Limpa campos do tipo anterior para evitar enviar dados inconsistentes
                    setNovaMov({
                      ...novaMov,
                      tipo: e.target.value,
                      escola_origem_id: '',
                      escola_destino_id: '',
                      sala_origem: '',
                      sala_destino: '',
                      estado_anterior: '',
                      estado_novo: '',
                    })
                  }}
                  className={`${inputCls} w-full`}
                >
                  {TIPOS_MOV.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </div>
              {novaMov.tipo === 'transferencia' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Escola origem</label>
                    <select value={novaMov.escola_origem_id} onChange={(e) => setNovaMov({ ...novaMov, escola_origem_id: e.target.value })} className={`${inputCls} w-full`}>
                      <option value="">—</option>
                      {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Escola destino</label>
                    <select value={novaMov.escola_destino_id} onChange={(e) => setNovaMov({ ...novaMov, escola_destino_id: e.target.value })} className={`${inputCls} w-full`}>
                      <option value="">—</option>
                      {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {novaMov.tipo === 'mudanca_estado_conservacao' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Estado anterior</label>
                    <select value={novaMov.estado_anterior} onChange={(e) => setNovaMov({ ...novaMov, estado_anterior: e.target.value })} className={`${inputCls} w-full`}>
                      <option value="">—</option>
                      {ESTADOS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Estado novo</label>
                    <select value={novaMov.estado_novo} onChange={(e) => setNovaMov({ ...novaMov, estado_novo: e.target.value })} className={`${inputCls} w-full`}>
                      <option value="">—</option>
                      {ESTADOS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Motivo / descrição * (mín. 5 caracteres)</label>
                <textarea value={novaMov.motivo} onChange={(e) => setNovaMov({ ...novaMov, motivo: e.target.value })} rows={3} className={`${inputCls} w-full`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Realizado em</label>
                  <input type="date" value={novaMov.realizado_em} onChange={(e) => setNovaMov({ ...novaMov, realizado_em: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">URL do documento</label>
                  <input type="url" value={novaMov.documento_url} onChange={(e) => setNovaMov({ ...novaMov, documento_url: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalMov(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarMov} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />} Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatrimonioAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <PatrimonioAdmin />
    </ProtectedRoute>
  )
}
