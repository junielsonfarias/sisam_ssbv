'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowDownToLine, BookMarked, Package, Plus, Users,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'

import { AbaTitulos } from './components/aba-titulos'
import { AbaEstoque } from './components/aba-estoque'
import { AbaDistribuicoes } from './components/aba-distribuicoes'
import { ModalTitulo } from './components/modal-titulo'
import { ModalEstoque } from './components/modal-estoque'
import { ModalEntrega } from './components/modal-entrega'
import { ModalDevolucao } from './components/modal-devolucao'
import {
  AbaPnld, AlunoBusca, Distribuicao, ENTREGA_VAZIA, ESTOQUE_VAZIO, Escola,
  EstoqueLinha, FormEntrega, FormEstoque, FormTitulo, StatusDevolucao,
  TITULO_VAZIO, Titulo,
} from './components/types'

function PnldAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<AbaPnld>('titulos')
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
  const [novoTitulo, setNovoTitulo] = useState<FormTitulo>(TITULO_VAZIO)
  const [novoEstoque, setNovoEstoque] = useState<FormEstoque>(ESTOQUE_VAZIO)
  const [novaEntrega, setNovaEntrega] = useState<FormEntrega>(ENTREGA_VAZIA)
  const [alunoEntrega, setAlunoEntrega] = useState<AlunoBusca | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Aba Distribuicoes
  const [alunoDistribuicoes, setAlunoDistribuicoes] = useState<AlunoBusca | null>(null)
  const [distribuicoes, setDistribuicoes] = useState<Distribuicao[]>([])
  const [carregandoDist, setCarregandoDist] = useState(false)

  // Modal devolucao
  const [modalDevolucao, setModalDevolucao] = useState<Distribuicao | null>(null)
  const [statusDevolucao, setStatusDevolucao] = useState<StatusDevolucao>('devolvido')
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
  }, [aba, escolaSel, anoLetivo, carregarTitulos, toast])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[PNLD] escolas', e) })
    return () => controller.abort()
  }, [])

  const garantirTitulosCarregados = useCallback(async () => {
    if (titulos.length === 0) await carregarTitulos()
  }, [titulos.length, carregarTitulos])

  useEffect(() => {
    const t = setTimeout(() => carregar(), 300)
    return () => clearTimeout(t)
  }, [carregar])

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

  function handleSelecionarAlunoDist(a: AlunoBusca | null) {
    setAlunoDistribuicoes(a)
    if (a) carregarDistribuicoes(a.id)
    else setDistribuicoes([])
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
      setNovoTitulo(TITULO_VAZIO)
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
      setNovoEstoque(ESTOQUE_VAZIO)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  function abrirModalEntrega() {
    setNovaEntrega(ENTREGA_VAZIA)
    setAlunoEntrega(null)
    setModalEntrega(true)
    garantirTitulosCarregados()
  }

  async function salvarEntrega() {
    if (!alunoEntrega || !novaEntrega.titulo_id) {
      toast.error('Selecione aluno e título')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        aluno_id: alunoEntrega.id,
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
      toast.success(`Entrega de "${alunoEntrega.nome}" registrada`)
      setModalEntrega(false)
      setNovaEntrega(ENTREGA_VAZIA)
      setAlunoEntrega(null)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

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
            <button onClick={() => { setNovoEstoque(ESTOQUE_VAZIO); setModalEstoque(true); garantirTitulosCarregados() }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">
              <Package className="w-4 h-4" /> Estoque
            </button>
            <button onClick={() => { setNovoTitulo(TITULO_VAZIO); setModalTitulo(true) }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-teal-700 text-sm font-bold hover:bg-teal-50">
              <Plus className="w-4 h-4" /> Novo título
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {[
          { k: 'titulos' as const, label: 'Catálogo', icon: BookMarked },
          { k: 'estoque' as const, label: 'Estoque por escola', icon: Package },
          { k: 'distribuicoes' as const, label: 'Distribuições por aluno', icon: Users },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setAba(tab.k)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              aba === tab.k ? 'border-teal-600 text-teal-700 dark:text-teal-300' : 'border-transparent text-gray-500'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {aba === 'titulos' && (
        <AbaTitulos titulos={titulos} busca={busca} carregando={carregando} onChangeBusca={setBusca} />
      )}

      {aba === 'estoque' && (
        <AbaEstoque
          escolas={escolas}
          escolaSel={escolaSel}
          anoLetivo={anoLetivo}
          estoque={estoque}
          carregando={carregando}
          onChangeEscola={setEscolaSel}
          onChangeAno={setAnoLetivo}
          onAdicionarPrimeiro={() => {
            setNovoEstoque({ ...ESTOQUE_VAZIO, escola_id: escolaSel, ano_letivo: anoLetivo })
            setModalEstoque(true)
            garantirTitulosCarregados()
          }}
        />
      )}

      {aba === 'distribuicoes' && (
        <AbaDistribuicoes
          alunoSelecionado={alunoDistribuicoes}
          distribuicoes={distribuicoes}
          carregando={carregandoDist}
          onSelecionarAluno={handleSelecionarAlunoDist}
          onDevolver={(d) => { setModalDevolucao(d); setStatusDevolucao('devolvido'); setObsDevolucao('') }}
        />
      )}

      <ModalTitulo
        aberto={modalTitulo}
        form={novoTitulo}
        salvando={salvando}
        onChange={setNovoTitulo}
        onFechar={() => setModalTitulo(false)}
        onSalvar={salvarTitulo}
      />

      <ModalEstoque
        aberto={modalEstoque}
        escolas={escolas}
        titulos={titulos}
        form={novoEstoque}
        salvando={salvando}
        onChange={setNovoEstoque}
        onFechar={() => setModalEstoque(false)}
        onSalvar={salvarEstoque}
      />

      <ModalEntrega
        aberto={modalEntrega}
        titulos={titulos}
        form={novaEntrega}
        alunoSelecionado={alunoEntrega}
        salvando={salvando}
        onChange={setNovaEntrega}
        onChangeAluno={setAlunoEntrega}
        onFechar={() => setModalEntrega(false)}
        onSalvar={salvarEntrega}
      />

      <ModalDevolucao
        distribuicao={modalDevolucao}
        status={statusDevolucao}
        observacoes={obsDevolucao}
        salvando={salvando}
        onChangeStatus={setStatusDevolucao}
        onChangeObs={setObsDevolucao}
        onFechar={() => setModalDevolucao(null)}
        onConfirmar={confirmarDevolucao}
      />
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
