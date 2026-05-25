'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookMarked,
  Plus,
  Search,
  X,
  Loader2,
  Save,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  Users,
  CheckCircle,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Escola { id: string; nome: string }

interface Titulo {
  id: string
  isbn: string | null
  codigo_pnld: string | null
  titulo: string
  autor: string | null
  editora: string | null
  edicao: string | null
  ano_pnld: number
  componente_id: string | null
  ano_escolar: number | null
  tipo_obra: string
}

interface EstoqueLinha {
  id: string
  titulo_id: string
  titulo: string
  codigo_pnld: string | null
  ano_escolar: number | null
  qtd_total: number
  qtd_disponivel: number
  qtd_danificada: number
  qtd_extraviada: number
}

interface AlunoBusca {
  id: string
  nome: string
  codigo?: string | null
  serie?: string | null
  escola_nome?: string | null
}

interface Distribuicao {
  id: string
  titulo: string
  autor: string | null
  componente_id: string | null
  ano_letivo: string
  numero_tombamento: string | null
  status: string
  data_entrega: string
  data_devolucao_prevista: string | null
  data_devolucao_real: string | null
  observacoes_devolucao: string | null
}

const TIPOS_OBRA = [
  { v: 'livro_aluno', label: 'Livro do aluno' },
  { v: 'manual_professor', label: 'Manual do professor' },
  { v: 'caderno_atividades', label: 'Caderno de atividades' },
  { v: 'literatura', label: 'Literatura' },
  { v: 'dicionario', label: 'Dicionário' },
  { v: 'paradidatico', label: 'Paradidático' },
  { v: 'outro', label: 'Outro' },
]

const tituloVazio = {
  isbn: '', codigo_pnld: '', titulo: '', autor: '', editora: '', edicao: '',
  ano_pnld: String(new Date().getFullYear()), componente_id: '',
  ano_escolar: '', tipo_obra: 'livro_aluno', observacoes: '',
}

const estoqueVazio = {
  escola_id: '', titulo_id: '', ano_letivo: String(new Date().getFullYear()),
  qtd_total: '', qtd_disponivel: '', qtd_danificada: '', qtd_extraviada: '',
}

const entregaVazia = {
  aluno_id: '', titulo_id: '', ano_letivo: String(new Date().getFullYear()),
  numero_tombamento: '', data_devolucao_prevista: '',
}

function PnldAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<'titulos' | 'estoque' | 'distribuicoes'>('titulos')
  const [titulos, setTitulos] = useState<Titulo[]>([])
  const [estoque, setEstoque] = useState<EstoqueLinha[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [escolaSel, setEscolaSel] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()))

  const [modalTitulo, setModalTitulo] = useState(false)
  const [modalEstoque, setModalEstoque] = useState(false)
  const [modalEntrega, setModalEntrega] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState(tituloVazio)
  const [novoEstoque, setNovoEstoque] = useState(estoqueVazio)
  const [novaEntrega, setNovaEntrega] = useState(entregaVazia)
  const [salvando, setSalvando] = useState(false)

  // Busca de aluno para entrega
  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunosResult, setAlunosResult] = useState<AlunoBusca[]>([])
  const [buscandoAluno, setBuscandoAluno] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoBusca | null>(null)

  // Aba distribuições — aluno selecionado mostrado as próprias distribuições
  const [alunoDistribuicoes, setAlunoDistribuicoes] = useState<AlunoBusca | null>(null)
  const [distribuicoes, setDistribuicoes] = useState<Distribuicao[]>([])
  const [carregandoDist, setCarregandoDist] = useState(false)
  const [buscaAlunoDist, setBuscaAlunoDist] = useState('')
  const [alunosResultDist, setAlunosResultDist] = useState<AlunoBusca[]>([])
  const [buscandoAlunoDist, setBuscandoAlunoDist] = useState(false)

  // Modal de devolução
  const [modalDevolucao, setModalDevolucao] = useState<Distribuicao | null>(null)
  const [statusDevolucao, setStatusDevolucao] = useState<'devolvido' | 'extraviado' | 'danificado'>('devolvido')
  const [obsDevolucao, setObsDevolucao] = useState('')

  // Carrega títulos uma vez no mount + sempre que busca mudar (debounce).
  // Eles são usados em selects de TODOS os modais (entrega, estoque, devolução).
  const carregarTitulos = useCallback(async (signal?: AbortSignal) => {
    try {
      const p = new URLSearchParams()
      if (busca.trim().length > 2) p.set('busca', busca.trim())
      const res = await fetch(`/api/admin/pnld?recurso=titulos&${p}`, { signal })
      const data = await res.json()
      setTitulos(data.titulos || [])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar títulos')
    }
  }, [busca, toast])

  const carregar = useCallback(async () => {
    if (aba === 'titulos') {
      setCarregando(true)
      await carregarTitulos()
      setCarregando(false)
    } else if (aba === 'estoque') {
      if (!escolaSel || !anoLetivo) {
        setEstoque([])
        return
      }
      setCarregando(true)
      try {
        const res = await fetch(`/api/admin/pnld?recurso=estoque&escola=${escolaSel}&ano_letivo=${anoLetivo}`)
        const data = await res.json()
        setEstoque(data.estoque || [])
      } catch {
        toast.error('Erro ao carregar estoque')
      } finally {
        setCarregando(false)
      }
    }
    // aba 'distribuicoes' não usa este carregar — fluxo próprio em carregarDistribuicoes
  }, [aba, escolaSel, anoLetivo, carregarTitulos, toast])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNLD] escolas', e) })
    // NÃO pré-carregamos títulos aqui — o useEffect abaixo já faz isso
    // via `carregar()` quando aba='titulos' (default). Para outras abas o
    // primeiro acesso ao modal de entrega/estoque dispara carregarTitulos via lazy load.
    return () => controller.abort()
  }, [])

  // Lazy-load: sempre que tentar abrir um modal que precisa de títulos
  // mas a lista está vazia, dispara o fetch on-demand
  const garantirTitulosCarregados = useCallback(async () => {
    if (titulos.length === 0) await carregarTitulos()
  }, [titulos.length, carregarTitulos])

  useEffect(() => {
    const t = setTimeout(() => carregar(), 300)
    return () => clearTimeout(t)
  }, [carregar])

  // Debounce busca de aluno na entrega
  useEffect(() => {
    if (alunoSelecionado) return
    if (buscaAluno.trim().length < 2) {
      setAlunosResult([])
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoAluno(true)
      try {
        const res = await fetch(
          `/api/admin/alunos?busca=${encodeURIComponent(buscaAluno.trim())}&limite=15`,
          { signal: controller.signal }
        )
        const data = await res.json()
        const lista: AlunoBusca[] = Array.isArray(data) ? data : data.alunos || []
        setAlunosResult(lista)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setAlunosResult([])
      } finally {
        setBuscandoAluno(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [buscaAluno, alunoSelecionado])

  // Debounce busca de aluno na aba distribuições
  useEffect(() => {
    if (alunoDistribuicoes) return
    if (buscaAlunoDist.trim().length < 2) {
      setAlunosResultDist([])
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoAlunoDist(true)
      try {
        const res = await fetch(
          `/api/admin/alunos?busca=${encodeURIComponent(buscaAlunoDist.trim())}&limite=15`,
          { signal: controller.signal }
        )
        const data = await res.json()
        const lista: AlunoBusca[] = Array.isArray(data) ? data : data.alunos || []
        setAlunosResultDist(lista)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setAlunosResultDist([])
      } finally {
        setBuscandoAlunoDist(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [buscaAlunoDist, alunoDistribuicoes])

  async function carregarDistribuicoes(alunoId: string) {
    setCarregandoDist(true)
    try {
      const res = await fetch(`/api/admin/pnld?recurso=distribuicoes&aluno=${alunoId}`)
      const data = await res.json()
      setDistribuicoes(data.distribuicoes || [])
    } catch {
      toast.error('Erro ao carregar distribuições')
    } finally {
      setCarregandoDist(false)
    }
  }

  async function confirmarDevolucao() {
    if (!modalDevolucao) return
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/pnld?acao=devolucao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distribuicao_id: modalDevolucao.id,
          status: statusDevolucao,
          observacoes: obsDevolucao.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      const msgPorStatus: Record<string, string> = {
        devolvido: 'Devolução registrada',
        extraviado: 'Livro marcado como extraviado',
        danificado: 'Livro marcado como danificado',
      }
      toast.success(msgPorStatus[statusDevolucao])
      setModalDevolucao(null)
      setStatusDevolucao('devolvido')
      setObsDevolucao('')
      if (alunoDistribuicoes) await carregarDistribuicoes(alunoDistribuicoes.id)
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarTitulo() {
    if (!novoTitulo.titulo.trim() || !novoTitulo.ano_pnld) {
      toast.error('Título e ano PNLD são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        titulo: novoTitulo.titulo.trim(),
        ano_pnld: parseInt(novoTitulo.ano_pnld, 10),
        tipo_obra: novoTitulo.tipo_obra,
      }
      if (novoTitulo.isbn) body.isbn = novoTitulo.isbn
      if (novoTitulo.codigo_pnld) body.codigo_pnld = novoTitulo.codigo_pnld
      if (novoTitulo.autor) body.autor = novoTitulo.autor
      if (novoTitulo.editora) body.editora = novoTitulo.editora
      if (novoTitulo.edicao) body.edicao = novoTitulo.edicao
      if (novoTitulo.componente_id) body.componente_id = novoTitulo.componente_id
      if (novoTitulo.ano_escolar) body.ano_escolar = parseInt(novoTitulo.ano_escolar, 10)
      if (novoTitulo.observacoes) body.observacoes = novoTitulo.observacoes

      const res = await fetch('/api/admin/pnld?acao=titulo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Título cadastrado')
      setModalTitulo(false)
      setNovoTitulo(tituloVazio)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function salvarEstoque() {
    if (!novoEstoque.escola_id || !novoEstoque.titulo_id || !novoEstoque.qtd_total) {
      toast.error('Escola, título e quantidade são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const total = parseInt(novoEstoque.qtd_total, 10)
      const body = {
        escola_id: novoEstoque.escola_id,
        titulo_id: novoEstoque.titulo_id,
        ano_letivo: novoEstoque.ano_letivo,
        qtd_total: total,
        qtd_disponivel: novoEstoque.qtd_disponivel ? parseInt(novoEstoque.qtd_disponivel, 10) : total,
        qtd_danificada: novoEstoque.qtd_danificada ? parseInt(novoEstoque.qtd_danificada, 10) : 0,
        qtd_extraviada: novoEstoque.qtd_extraviada ? parseInt(novoEstoque.qtd_extraviada, 10) : 0,
      }
      const res = await fetch('/api/admin/pnld?acao=estoque', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Estoque atualizado')
      setModalEstoque(false)
      setNovoEstoque(estoqueVazio)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  function abrirModalEntrega() {
    setNovaEntrega(entregaVazia)
    setAlunoSelecionado(null)
    setBuscaAluno('')
    setAlunosResult([])
    setModalEntrega(true)
    garantirTitulosCarregados()
  }

  async function salvarEntrega() {
    if (!alunoSelecionado || !novaEntrega.titulo_id) {
      toast.error('Selecione aluno e título')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        aluno_id: alunoSelecionado.id,
        titulo_id: novaEntrega.titulo_id,
        ano_letivo: novaEntrega.ano_letivo,
      }
      if (novaEntrega.numero_tombamento) body.numero_tombamento = novaEntrega.numero_tombamento
      if (novaEntrega.data_devolucao_prevista) body.data_devolucao_prevista = novaEntrega.data_devolucao_prevista

      const res = await fetch('/api/admin/pnld?acao=entrega', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(`Entrega de "${alunoSelecionado.nome}" registrada`)
      setModalEntrega(false)
      setNovaEntrega(entregaVazia)
      setAlunoSelecionado(null)
      setBuscaAluno('')
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookMarked className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">PNLD — Livros Didáticos</h1>
              <p className="text-teal-100 text-sm">Programa Nacional do Livro e do Material Didático</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={abrirModalEntrega} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <ArrowDownToLine className="w-4 h-4" /> Entrega ao aluno
            </button>
            <button onClick={() => { setNovoEstoque(estoqueVazio); setModalEstoque(true); garantirTitulosCarregados() }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <Package className="w-4 h-4" /> Estoque
            </button>
            <button onClick={() => { setNovoTitulo(tituloVazio); setModalTitulo(true) }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-teal-700 text-sm font-bold hover:bg-teal-50">
              <Plus className="w-4 h-4" /> Novo título
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {[
          { k: 'titulos', label: 'Catálogo', icon: BookMarked },
          { k: 'estoque', label: 'Estoque por escola', icon: Package },
          { k: 'distribuicoes', label: 'Distribuições por aluno', icon: Users },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setAba(tab.k as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${aba === tab.k ? 'border-teal-600 text-teal-700 dark:text-teal-300' : 'border-transparent text-gray-500'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {aba === 'titulos' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar título, autor, ISBN, código PNLD..." className={`${inputCls} w-full pl-9`} />
            </div>
          </div>
          {carregando ? <LoadingSpinner centered /> : titulos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum título no catálogo</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Título</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Tipo</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Autor</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Cód PNLD</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ano escolar</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">PNLD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titulos.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 dark:border-slate-700/50">
                        <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{t.titulo}</td>
                        <td className="py-2 px-4 text-xs text-gray-500">{TIPOS_OBRA.find((x) => x.v === t.tipo_obra)?.label || t.tipo_obra}</td>
                        <td className="py-2 px-4 text-xs text-gray-500">{t.autor || '—'}</td>
                        <td className="py-2 px-4 font-mono text-xs text-teal-600">{t.codigo_pnld || '—'}</td>
                        <td className="py-2 px-4 text-right text-xs text-gray-500">{t.ano_escolar ? `${t.ano_escolar}º` : '—'}</td>
                        <td className="py-2 px-4 text-right font-mono text-xs text-gray-500">{t.ano_pnld}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {aba === 'estoque' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
                <select value={escolaSel} onChange={(e) => setEscolaSel(e.target.value)} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                <select value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} className={inputCls}>
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {!escolaSel ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Selecione uma escola para ver o estoque</p>
            </div>
          ) : carregando ? <LoadingSpinner centered /> : estoque.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Estoque vazio para esta escola/ano</p>
              <button onClick={() => { setNovoEstoque({ ...estoqueVazio, escola_id: escolaSel, ano_letivo: anoLetivo }); setModalEstoque(true); garantirTitulosCarregados() }} className="mt-4 text-teal-600 text-sm font-semibold hover:text-teal-700">
                Adicionar primeiro item
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Título</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Total</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Disponível</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Danificada</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Extraviada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estoque.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100 dark:border-slate-700/50">
                        <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{e.titulo}</td>
                        <td className="py-2 px-4 text-right font-mono">{e.qtd_total}</td>
                        <td className="py-2 px-4 text-right font-mono text-green-700">{e.qtd_disponivel}</td>
                        <td className="py-2 px-4 text-right font-mono text-amber-700">{e.qtd_danificada}</td>
                        <td className="py-2 px-4 text-right font-mono text-red-700">{e.qtd_extraviada}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {aba === 'distribuicoes' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Buscar aluno *</label>
            {alunoDistribuicoes ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-teal-700 dark:text-teal-300 truncate">{alunoDistribuicoes.nome}</p>
                  <p className="text-xs text-teal-600 dark:text-teal-400">
                    {alunoDistribuicoes.codigo && `#${alunoDistribuicoes.codigo}`}
                    {alunoDistribuicoes.serie && ` • ${alunoDistribuicoes.serie}`}
                    {alunoDistribuicoes.escola_nome && ` • ${alunoDistribuicoes.escola_nome}`}
                  </p>
                </div>
                <button type="button" onClick={() => { setAlunoDistribuicoes(null); setDistribuicoes([]); setBuscaAlunoDist('') }} className="p-1 rounded text-teal-600 hover:bg-teal-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={buscaAlunoDist}
                  onChange={(e) => setBuscaAlunoDist(e.target.value)}
                  placeholder="Digite nome ou matrícula do aluno..."
                  className={`${inputCls} w-full pl-9`}
                  autoComplete="off"
                />
                {(buscandoAlunoDist || alunosResultDist.length > 0) && (
                  <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-slate-800">
                    {buscandoAlunoDist && alunosResultDist.length === 0 && (
                      <p className="text-xs text-gray-400 p-3 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Buscando...</p>
                    )}
                    {alunosResultDist.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setAlunoDistribuicoes(a)
                          setBuscaAlunoDist('')
                          setAlunosResultDist([])
                          carregarDistribuicoes(a.id)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
                      >
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{a.nome}</p>
                        <p className="text-xs text-gray-400">{a.codigo || ''} {a.serie && `• ${a.serie}`}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!alunoDistribuicoes ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Selecione um aluno para ver os livros entregues</p>
            </div>
          ) : carregandoDist ? <LoadingSpinner centered /> : distribuicoes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Este aluno não possui livros entregues</p>
            </div>
          ) : (
            <div className="space-y-3">
              {distribuicoes.map((d) => {
                const ativa = d.status === 'emprestado'
                const STATUS_DIST_BADGE: Record<string, string> = {
                  emprestado: 'bg-blue-100 text-blue-700',
                  devolvido: 'bg-green-100 text-green-700',
                  danificado: 'bg-amber-100 text-amber-700',
                  extraviado: 'bg-red-100 text-red-700',
                }
                return (
                  <div key={d.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_DIST_BADGE[d.status] || 'bg-slate-100'}`}>{d.status}</span>
                          {d.numero_tombamento && <span className="font-mono text-xs text-teal-600">#{d.numero_tombamento}</span>}
                          <span className="text-xs text-gray-500">{d.ano_letivo}</span>
                        </div>
                        <p className="font-bold text-gray-800 dark:text-gray-200">{d.titulo}</p>
                        {d.autor && <p className="text-xs text-gray-500">{d.autor}</p>}
                        <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                          <span>Entregue em {new Date(d.data_entrega).toLocaleDateString('pt-BR')}</span>
                          {d.data_devolucao_prevista && <span>Devolver até {new Date(d.data_devolucao_prevista).toLocaleDateString('pt-BR')}</span>}
                          {d.data_devolucao_real && <span>Devolvido em {new Date(d.data_devolucao_real).toLocaleDateString('pt-BR')}</span>}
                        </div>
                        {d.observacoes_devolucao && (
                          <p className="text-xs text-gray-500 italic mt-1">&ldquo;{d.observacoes_devolucao}&rdquo;</p>
                        )}
                      </div>
                      {ativa && (
                        <button
                          onClick={() => { setModalDevolucao(d); setStatusDevolucao('devolvido'); setObsDevolucao('') }}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                        >
                          <ArrowUpFromLine className="w-3 h-3" /> Devolver
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {modalDevolucao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Registrar devolução</h2>
              <button onClick={() => setModalDevolucao(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 text-sm">
                <p className="font-bold text-gray-800 dark:text-gray-200">{modalDevolucao.titulo}</p>
                {modalDevolucao.numero_tombamento && (
                  <p className="text-xs text-gray-500 font-mono">#{modalDevolucao.numero_tombamento}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Estado *</label>
                <select value={statusDevolucao} onChange={(e) => setStatusDevolucao(e.target.value as 'devolvido' | 'extraviado' | 'danificado')} className={`${inputCls} w-full`}>
                  <option value="devolvido">Devolvido em bom estado</option>
                  <option value="danificado">Danificado</option>
                  <option value="extraviado">Extraviado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                <textarea value={obsDevolucao} onChange={(e) => setObsDevolucao(e.target.value)} rows={3} placeholder="Descreva o estado, motivo do extravio, etc." className={`${inputCls} w-full`} />
              </div>
              <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Estoque é atualizado automaticamente conforme o estado</p>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalDevolucao(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={confirmarDevolucao} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalTitulo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Novo título PNLD</h2>
              <button onClick={() => setModalTitulo(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                  <input type="text" value={novoTitulo.titulo} onChange={(e) => setNovoTitulo({ ...novoTitulo, titulo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo *</label>
                  <select value={novoTitulo.tipo_obra} onChange={(e) => setNovoTitulo({ ...novoTitulo, tipo_obra: e.target.value })} className={`${inputCls} w-full`}>
                    {TIPOS_OBRA.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano PNLD *</label>
                  <input type="number" min={2000} max={2100} value={novoTitulo.ano_pnld} onChange={(e) => setNovoTitulo({ ...novoTitulo, ano_pnld: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Autor</label>
                  <input type="text" value={novoTitulo.autor} onChange={(e) => setNovoTitulo({ ...novoTitulo, autor: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Editora</label>
                  <input type="text" value={novoTitulo.editora} onChange={(e) => setNovoTitulo({ ...novoTitulo, editora: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">ISBN</label>
                  <input type="text" value={novoTitulo.isbn} onChange={(e) => setNovoTitulo({ ...novoTitulo, isbn: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Código PNLD</label>
                  <input type="text" value={novoTitulo.codigo_pnld} onChange={(e) => setNovoTitulo({ ...novoTitulo, codigo_pnld: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Edição</label>
                  <input type="text" value={novoTitulo.edicao} onChange={(e) => setNovoTitulo({ ...novoTitulo, edicao: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano escolar (1-9)</label>
                  <input type="number" min={1} max={9} value={novoTitulo.ano_escolar} onChange={(e) => setNovoTitulo({ ...novoTitulo, ano_escolar: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Componente (código BNCC)</label>
                  <input type="text" value={novoTitulo.componente_id} onChange={(e) => setNovoTitulo({ ...novoTitulo, componente_id: e.target.value })} placeholder="LP, MA, CN..." className={`${inputCls} w-full`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Observações</label>
                  <textarea value={novoTitulo.observacoes} onChange={(e) => setNovoTitulo({ ...novoTitulo, observacoes: e.target.value })} rows={2} className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalTitulo(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarTitulo} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEstoque && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Atualizar estoque</h2>
              <button onClick={() => setModalEstoque(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Escola *</label>
                <select value={novoEstoque.escola_id} onChange={(e) => setNovoEstoque({ ...novoEstoque, escola_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <select value={novoEstoque.titulo_id} onChange={(e) => setNovoEstoque({ ...novoEstoque, titulo_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {titulos.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                  <input type="text" value={novoEstoque.ano_letivo} onChange={(e) => setNovoEstoque({ ...novoEstoque, ano_letivo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd total *</label>
                  <input type="number" min={0} value={novoEstoque.qtd_total} onChange={(e) => setNovoEstoque({ ...novoEstoque, qtd_total: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd disponível</label>
                  <input type="number" min={0} value={novoEstoque.qtd_disponivel} onChange={(e) => setNovoEstoque({ ...novoEstoque, qtd_disponivel: e.target.value })} placeholder="igual ao total" className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd danificada</label>
                  <input type="number" min={0} value={novoEstoque.qtd_danificada} onChange={(e) => setNovoEstoque({ ...novoEstoque, qtd_danificada: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd extraviada</label>
                  <input type="number" min={0} value={novoEstoque.qtd_extraviada} onChange={(e) => setNovoEstoque({ ...novoEstoque, qtd_extraviada: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalEstoque(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarEstoque} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEntrega && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Entrega ao aluno</h2>
              <button onClick={() => setModalEntrega(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Aluno *</label>
                {alunoSelecionado ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300 truncate">{alunoSelecionado.nome}</p>
                      <p className="text-xs text-teal-600 dark:text-teal-400">
                        {alunoSelecionado.codigo && `#${alunoSelecionado.codigo}`}
                        {alunoSelecionado.serie && ` • ${alunoSelecionado.serie}`}
                        {alunoSelecionado.escola_nome && ` • ${alunoSelecionado.escola_nome}`}
                      </p>
                    </div>
                    <button type="button" onClick={() => { setAlunoSelecionado(null); setBuscaAluno('') }} className="p-1 rounded text-teal-600 hover:bg-teal-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={buscaAluno}
                      onChange={(e) => setBuscaAluno(e.target.value)}
                      placeholder="Buscar aluno por nome ou matrícula..."
                      className={`${inputCls} w-full pl-9`}
                      autoComplete="off"
                    />
                    {(buscandoAluno || alunosResult.length > 0) && (
                      <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-slate-800">
                        {buscandoAluno && alunosResult.length === 0 && (
                          <p className="text-xs text-gray-400 p-3 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Buscando...</p>
                        )}
                        {alunosResult.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => { setAlunoSelecionado(a); setBuscaAluno(''); setAlunosResult([]) }}
                            className="w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
                          >
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{a.nome}</p>
                            <p className="text-xs text-gray-400">{a.codigo || ''} {a.serie && `• ${a.serie}`}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <select value={novaEntrega.titulo_id} onChange={(e) => setNovaEntrega({ ...novaEntrega, titulo_id: e.target.value })} className={`${inputCls} w-full`}>
                  <option value="">Selecione</option>
                  {titulos.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ano letivo</label>
                  <input type="text" value={novaEntrega.ano_letivo} onChange={(e) => setNovaEntrega({ ...novaEntrega, ano_letivo: e.target.value })} className={`${inputCls} w-full`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nº tombamento</label>
                  <input type="text" value={novaEntrega.numero_tombamento} onChange={(e) => setNovaEntrega({ ...novaEntrega, numero_tombamento: e.target.value })} className={`${inputCls} w-full`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data devolução prevista</label>
                <input type="date" value={novaEntrega.data_devolucao_prevista} onChange={(e) => setNovaEntrega({ ...novaEntrega, data_devolucao_prevista: e.target.value })} className={`${inputCls} w-full`} />
              </div>
              <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Estoque é decrementado automaticamente</p>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setModalEntrega(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold">Cancelar</button>
              <button onClick={salvarEntrega} disabled={salvando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />} Entregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PnldAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <PnldAdmin />
    </ProtectedRoute>
  )
}
