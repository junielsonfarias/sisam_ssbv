'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Library,
  Plus,
  Search,
  X,
  Loader2,
  Save,
  BookOpen,
  Calendar,
  ArrowLeftRight,
  Bookmark,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola { id: string; nome: string }

interface ItemAcervo {
  id: string
  isbn: string | null
  titulo: string
  autor: string | null
  editora: string | null
  ano_publicacao: number | null
  categoria: string | null
  escola_id: string | null
  qtd_total: number
  qtd_disponivel: number
  estante: string | null
  prateleira: string | null
}

interface Emprestimo {
  id: string
  acervo_id: string
  titulo: string
  aluno_nome: string | null
  servidor_nome: string | null
  data_emprestimo: string
  data_prevista_devolucao: string
  renovacoes: number
  status: string
  dias_atraso?: number | null
}

interface AlunoBusca {
  id: string
  nome: string
  codigo?: string | null
  serie?: string | null
  escola_nome?: string | null
}

interface ServidorBusca {
  id: string
  nome: string
  matricula_funcional?: string | null
  cargo?: string | null
}

const CATEGORIAS_BIBLIOTECA = [
  { v: 'literatura_infantil', label: 'Literatura infantil' },
  { v: 'literatura_juvenil', label: 'Literatura juvenil' },
  { v: 'literatura_adulta', label: 'Literatura adulta' },
  { v: 'didatico', label: 'Didático' },
  { v: 'paradidatico', label: 'Paradidático' },
  { v: 'tecnico', label: 'Técnico' },
  { v: 'referencia', label: 'Referência' },
  { v: 'dicionario', label: 'Dicionário' },
  { v: 'enciclopedia', label: 'Enciclopédia' },
  { v: 'periodico', label: 'Periódico' },
  { v: 'outro', label: 'Outro' },
]

const itemVazio = {
  isbn: '', titulo: '', autor: '', editora: '', edicao: '',
  ano_publicacao: '', classificacao: '', categoria: '', genero: '',
  escola_id: '', qtd_total: '1', estante: '', prateleira: '', observacoes: '',
}

function BibliotecaAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<'acervo' | 'emprestimos'>('acervo')
  const [acervo, setAcervo] = useState<ItemAcervo[]>([])
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(false)

  const [filtroEscola, setFiltroEscola] = useState('')
  const [busca, setBusca] = useState('')
  const [apenasDisponiveis, setApenasDisponiveis] = useState(false)
  const [apenasAtrasados, setApenasAtrasados] = useState(false)

  const [modalItem, setModalItem] = useState(false)
  const [modalEmprestimo, setModalEmprestimo] = useState(false)
  const [modoReserva, setModoReserva] = useState(false)
  const [novoItem, setNovoItem] = useState(itemVazio)
  const [novoEmprestimo, setNovoEmprestimo] = useState({
    acervo_id: '', aluno_id: '', servidor_id: '', dias_emprestimo: '7',
  })
  const [salvando, setSalvando] = useState(false)

  // Busca de aluno/servidor para empréstimo
  const [tipoTomador, setTipoTomador] = useState<'aluno' | 'servidor'>('aluno')
  const [buscaPessoa, setBuscaPessoa] = useState('')
  const [pessoasResultado, setPessoasResultado] = useState<(AlunoBusca | ServidorBusca)[]>([])
  const [buscandoPessoa, setBuscandoPessoa] = useState(false)
  const [pessoaSelecionada, setPessoaSelecionada] = useState<AlunoBusca | ServidorBusca | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      if (aba === 'acervo') {
        const p = new URLSearchParams({ recurso: 'acervo', limite: '200' })
        if (filtroEscola) p.set('escola', filtroEscola)
        if (busca.trim().length > 2) p.set('busca', busca.trim())
        if (apenasDisponiveis) p.set('disponivel', 'true')
        const res = await fetch(`/api/admin/biblioteca?${p}`)
        const data = await res.json()
        setAcervo(data.acervo || [])
      } else {
        const p = new URLSearchParams({ recurso: 'emprestimos' })
        if (filtroEscola) p.set('escola', filtroEscola)
        if (apenasAtrasados) p.set('atrasados', 'true')
        const res = await fetch(`/api/admin/biblioteca?${p}`)
        const data = await res.json()
        setEmprestimos(data.emprestimos || [])
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [aba, filtroEscola, busca, apenasDisponiveis, apenasAtrasados, toast])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[Biblioteca] escolas', e) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => carregar(), 300)
    return () => clearTimeout(t)
  }, [carregar])

  // Debounce na busca de aluno/servidor — só dispara se ≥2 chars
  useEffect(() => {
    if (pessoaSelecionada) return
    if (buscaPessoa.trim().length < 2) {
      setPessoasResultado([])
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoPessoa(true)
      try {
        if (tipoTomador === 'aluno') {
          const res = await fetch(
            `/api/admin/alunos?busca=${encodeURIComponent(buscaPessoa.trim())}&limite=15`,
            { signal: controller.signal }
          )
          const data = await res.json()
          const lista: AlunoBusca[] = Array.isArray(data) ? data : data.alunos || []
          setPessoasResultado(lista)
        } else {
          const res = await fetch(
            `/api/admin/rh?recurso=servidores&busca=${encodeURIComponent(buscaPessoa.trim())}&limite=15`,
            { signal: controller.signal }
          )
          const data = await res.json()
          setPessoasResultado(data.servidores || [])
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setPessoasResultado([])
      } finally {
        setBuscandoPessoa(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [buscaPessoa, tipoTomador, pessoaSelecionada])

  async function salvarItem() {
    if (!novoItem.titulo.trim()) {
      toast.error('Título é obrigatório')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        titulo: novoItem.titulo.trim(),
        qtd_total: parseInt(novoItem.qtd_total, 10),
        qtd_disponivel: parseInt(novoItem.qtd_total, 10),
      }
      if (novoItem.isbn) body.isbn = novoItem.isbn
      if (novoItem.autor) body.autor = novoItem.autor
      if (novoItem.editora) body.editora = novoItem.editora
      if (novoItem.edicao) body.edicao = novoItem.edicao
      if (novoItem.ano_publicacao) body.ano_publicacao = parseInt(novoItem.ano_publicacao, 10)
      if (novoItem.classificacao) body.classificacao = novoItem.classificacao
      if (novoItem.categoria) body.categoria = novoItem.categoria
      if (novoItem.genero) body.genero = novoItem.genero
      if (novoItem.escola_id) body.escola_id = novoItem.escola_id
      if (novoItem.estante) body.estante = novoItem.estante
      if (novoItem.prateleira) body.prateleira = novoItem.prateleira
      if (novoItem.observacoes) body.observacoes = novoItem.observacoes

      const res = await fetch('/api/admin/biblioteca?acao=acervo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Item cadastrado')
      setModalItem(false)
      setNovoItem(itemVazio)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  // Garante que o select de itens nos modais não fique vazio
  // (aba 'emprestimos' não carrega acervo automaticamente)
  async function garantirAcervoCarregado() {
    if (acervo.length > 0) return
    try {
      const p = new URLSearchParams({ recurso: 'acervo', limite: '200' })
      if (filtroEscola) p.set('escola', filtroEscola)
      const res = await fetch(`/api/admin/biblioteca?${p}`)
      const data = await res.json()
      setAcervo(data.acervo || [])
    } catch { /* silencioso — modal vai mostrar vazio se falhar */ }
  }

  function abrirModalEmprestimo(itemId?: string) {
    setNovoEmprestimo({ acervo_id: itemId || '', aluno_id: '', servidor_id: '', dias_emprestimo: '7' })
    setPessoaSelecionada(null)
    setBuscaPessoa('')
    setPessoasResultado([])
    setTipoTomador('aluno')
    setModoReserva(false)
    setModalEmprestimo(true)
    garantirAcervoCarregado()
  }

  function abrirModalReserva(itemId: string) {
    setNovoEmprestimo({ acervo_id: itemId, aluno_id: '', servidor_id: '', dias_emprestimo: '7' })
    setPessoaSelecionada(null)
    setBuscaPessoa('')
    setPessoasResultado([])
    setTipoTomador('aluno')
    setModoReserva(true)
    setModalEmprestimo(true)
    garantirAcervoCarregado()
  }

  async function confirmar() {
    if (modoReserva) {
      await reservarItem(novoEmprestimo.acervo_id)
      setModalEmprestimo(false)
      setPessoaSelecionada(null)
    } else {
      await salvarEmprestimo()
    }
  }

  async function salvarEmprestimo() {
    if (!novoEmprestimo.acervo_id || !pessoaSelecionada) {
      toast.error('Selecione o item e o tomador (aluno ou servidor)')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        acervo_id: novoEmprestimo.acervo_id,
        dias_emprestimo: parseInt(novoEmprestimo.dias_emprestimo, 10),
      }
      if (tipoTomador === 'aluno') body.aluno_id = pessoaSelecionada.id
      else body.servidor_id = pessoaSelecionada.id

      const res = await fetch('/api/admin/biblioteca?acao=emprestimo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Empréstimo registrado')
      setModalEmprestimo(false)
      setNovoEmprestimo({ acervo_id: '', aluno_id: '', servidor_id: '', dias_emprestimo: '7' })
      setPessoaSelecionada(null)
      setBuscaPessoa('')
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function devolver(emprestimoId: string) {
    if (!confirm('Confirmar devolução?')) return
    try {
      const res = await fetch('/api/admin/biblioteca?acao=devolucao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emprestimo_id: emprestimoId, status: 'devolvido' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Devolução registrada')
      carregar()
    } catch (e) { toast.error((e as Error).message) }
  }

  async function reservarItem(acervoId: string) {
    if (!pessoaSelecionada) {
      toast.error('Selecione um aluno ou servidor antes de reservar')
      return
    }
    try {
      const body: Record<string, unknown> = { acervo_id: acervoId }
      if (tipoTomador === 'aluno') body.aluno_id = pessoaSelecionada.id
      else body.servidor_id = pessoaSelecionada.id
      const res = await fetch('/api/admin/biblioteca?acao=reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(`Reserva criada para ${pessoaSelecionada.nome}`)
      // Atualiza lista para refletir disponibilidade após reserva
      carregar()
    } catch (e) { toast.error((e as Error).message) }
  }

  async function renovar(emprestimoId: string) {
    try {
      const res = await fetch('/api/admin/biblioteca?acao=renovar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emprestimo_id: emprestimoId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Renovado por mais 7 dias')
      carregar()
    } catch (e) { toast.error((e as Error).message) }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-rose-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Library className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Biblioteca</h1>
              <p className="text-rose-100 text-sm">Acervo e empréstimos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => abrirModalEmprestimo()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <ArrowLeftRight className="w-4 h-4" /> Emprestar
            </button>
            <button onClick={() => { setNovoItem(itemVazio); setModalItem(true) }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-rose-700 text-sm font-bold hover:bg-rose-50">
              <Plus className="w-4 h-4" /> Novo item
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700">
        {[
          { k: 'acervo', label: 'Acervo', icon: BookOpen },
          { k: 'emprestimos', label: 'Empréstimos ativos', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setAba(tab.k as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${aba === tab.k ? 'border-rose-600 text-rose-700 dark:text-rose-300' : 'border-transparent text-gray-500'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          {aba === 'acervo' && (
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar título, autor, ISBN..." className={`${inputCls} w-full pl-9`} />
            </div>
          )}
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas escolas</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          {aba === 'acervo' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={apenasDisponiveis} onChange={(e) => setApenasDisponiveis(e.target.checked)} className="rounded text-rose-600" />
              Apenas disponíveis
            </label>
          )}
          {aba === 'emprestimos' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={apenasAtrasados} onChange={(e) => setApenasAtrasados(e.target.checked)} className="rounded text-rose-600" />
              Apenas atrasados
            </label>
          )}
        </div>
      </div>

      {carregando ? <LoadingSpinner centered /> : aba === 'acervo' ? (
        acervo.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <Library className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum item no acervo</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Título</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Autor</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">ISBN</th>
                    <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Localização</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Disp/Total</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {acervo.map((i) => (
                    <tr key={i.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{i.titulo}</td>
                      <td className="py-2 px-4 text-gray-500 text-xs">{i.autor || '—'}</td>
                      <td className="py-2 px-4 text-gray-500 text-xs font-mono">{i.isbn || '—'}</td>
                      <td className="py-2 px-4 text-gray-500 text-xs">
                        {[i.estante, i.prateleira].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${i.qtd_disponivel > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {i.qtd_disponivel}/{i.qtd_total}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        {i.qtd_disponivel > 0 ? (
                          <button onClick={() => abrirModalEmprestimo(i.id)} className="px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-200">
                            Emprestar
                          </button>
                        ) : (
                          <button onClick={() => abrirModalReserva(i.id)} className="px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-200">
                            Reservar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        emprestimos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum empréstimo ativo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {emprestimos.map((e) => {
              const atrasado = e.dias_atraso != null && e.dias_atraso > 0
              return (
                <div key={e.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${atrasado ? 'border-red-300' : 'border-gray-200 dark:border-slate-700'} p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-200">{e.titulo}</p>
                      <p className="text-xs text-gray-500">Para: {e.aluno_nome || e.servidor_nome || '—'}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                        <span>Emprestado em {new Date(e.data_emprestimo).toLocaleDateString('pt-BR')}</span>
                        <span>Prazo: {new Date(e.data_prevista_devolucao).toLocaleDateString('pt-BR')}</span>
                        {e.renovacoes > 0 && <span>{e.renovacoes} renovação(ões)</span>}
                        {atrasado && <span className="text-red-600 font-bold">⚠ {e.dias_atraso} dias atrasado</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => renovar(e.id)} className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-200">Renovar</button>
                      <button onClick={() => devolver(e.id)} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700">Devolver</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {modalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo item no acervo</h2>
              <button onClick={() => setModalItem(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                  <input type="text" value={novoItem.titulo} onChange={(e) => setNovoItem({ ...novoItem, titulo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Autor</label>
                  <input type="text" value={novoItem.autor} onChange={(e) => setNovoItem({ ...novoItem, autor: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">ISBN</label>
                  <input type="text" value={novoItem.isbn} onChange={(e) => setNovoItem({ ...novoItem, isbn: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Editora</label>
                  <input type="text" value={novoItem.editora} onChange={(e) => setNovoItem({ ...novoItem, editora: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Edição</label>
                  <input type="text" value={novoItem.edicao} onChange={(e) => setNovoItem({ ...novoItem, edicao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano publicação</label>
                  <input type="number" min={1000} max={2100} value={novoItem.ano_publicacao} onChange={(e) => setNovoItem({ ...novoItem, ano_publicacao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Quantidade *</label>
                  <input type="number" min={1} value={novoItem.qtd_total} onChange={(e) => setNovoItem({ ...novoItem, qtd_total: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
                  <select value={novoItem.categoria} onChange={(e) => setNovoItem({ ...novoItem, categoria: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">—</option>
                    {CATEGORIAS_BIBLIOTECA.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Gênero</label>
                  <input type="text" value={novoItem.genero} onChange={(e) => setNovoItem({ ...novoItem, genero: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Classificação (CDD/CDU)</label>
                  <input type="text" value={novoItem.classificacao} onChange={(e) => setNovoItem({ ...novoItem, classificacao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Escola</label>
                  <select value={novoItem.escola_id} onChange={(e) => setNovoItem({ ...novoItem, escola_id: e.target.value })} className={`${inputCls} w-full`}>
                    <option value="">SEMED (sede)</option>
                    {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Estante</label>
                  <input type="text" value={novoItem.estante} onChange={(e) => setNovoItem({ ...novoItem, estante: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Prateleira</label>
                  <input type="text" value={novoItem.prateleira} onChange={(e) => setNovoItem({ ...novoItem, prateleira: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                  <textarea value={novoItem.observacoes} onChange={(e) => setNovoItem({ ...novoItem, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalItem(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarItem} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEmprestimo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{modoReserva ? 'Nova reserva' : 'Novo empréstimo'}</h2>
              <button onClick={() => setModalEmprestimo(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Item *</label>
                <select value={novoEmprestimo.acervo_id} onChange={(e) => setNovoEmprestimo({ ...novoEmprestimo, acervo_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {(modoReserva ? acervo : acervo.filter((a) => a.qtd_disponivel > 0)).map((a) => (
                    <option key={a.id} value={a.id}>{a.titulo} ({a.qtd_disponivel} disp)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Quem está retirando *</label>
                <div className="flex gap-2 mb-3">
                  {[
                    { v: 'aluno', label: 'Aluno' },
                    { v: 'servidor', label: 'Servidor' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setTipoTomador(opt.v as 'aluno' | 'servidor')
                        setPessoaSelecionada(null)
                        setBuscaPessoa('')
                        setPessoasResultado([])
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                        tipoTomador === opt.v
                          ? 'bg-rose-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {pessoaSelecionada ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-300 truncate">{pessoaSelecionada.nome}</p>
                      <p className="text-xs text-rose-600 dark:text-rose-400">
                        {tipoTomador === 'aluno' ? (
                          <>
                            {(pessoaSelecionada as AlunoBusca).codigo && `#${(pessoaSelecionada as AlunoBusca).codigo}`}
                            {(pessoaSelecionada as AlunoBusca).serie && ` • ${(pessoaSelecionada as AlunoBusca).serie}`}
                            {(pessoaSelecionada as AlunoBusca).escola_nome && ` • ${(pessoaSelecionada as AlunoBusca).escola_nome}`}
                          </>
                        ) : (
                          <>
                            {(pessoaSelecionada as ServidorBusca).matricula_funcional && `#${(pessoaSelecionada as ServidorBusca).matricula_funcional}`}
                            {(pessoaSelecionada as ServidorBusca).cargo && ` • ${(pessoaSelecionada as ServidorBusca).cargo}`}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPessoaSelecionada(null); setBuscaPessoa('') }}
                      className="p-1 rounded text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                      title="Limpar seleção"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={buscaPessoa}
                      onChange={(e) => setBuscaPessoa(e.target.value)}
                      placeholder={tipoTomador === 'aluno' ? 'Buscar aluno por nome ou matrícula...' : 'Buscar servidor por nome, CPF ou matrícula...'}
                      className={`${inputCls} w-full pl-9`}
                      autoComplete="off"
                    />
                    {(buscandoPessoa || pessoasResultado.length > 0) && (
                      <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-56 overflow-y-auto bg-white dark:bg-slate-800">
                        {buscandoPessoa && pessoasResultado.length === 0 && (
                          <p className="text-xs text-gray-400 p-3 flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                          </p>
                        )}
                        {pessoasResultado.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPessoaSelecionada(p)
                              setBuscaPessoa('')
                              setPessoasResultado([])
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
                          >
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{p.nome}</p>
                            <p className="text-xs text-gray-400">
                              {tipoTomador === 'aluno'
                                ? `${(p as AlunoBusca).codigo || ''} ${(p as AlunoBusca).serie ? `• ${(p as AlunoBusca).serie}` : ''}`.trim() || 'aluno'
                                : `${(p as ServidorBusca).matricula_funcional || ''} ${(p as ServidorBusca).cargo ? `• ${(p as ServidorBusca).cargo}` : ''}`.trim() || 'servidor'}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!modoReserva && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Dias de empréstimo</label>
                  <input type="number" min={1} max={60} value={novoEmprestimo.dias_emprestimo} onChange={(e) => setNovoEmprestimo({ ...novoEmprestimo, dias_emprestimo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              )}
              {modoReserva && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Bookmark className="w-3 h-3" /> O tomador será notificado quando o item ficar disponível
                </p>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalEmprestimo(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={confirmar} disabled={salvando} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50 ${modoReserva ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : (modoReserva ? <Bookmark className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />)}
                {modoReserva ? 'Reservar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BibliotecaAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <BibliotecaAdmin />
    </ProtectedRoute>
  )
}
