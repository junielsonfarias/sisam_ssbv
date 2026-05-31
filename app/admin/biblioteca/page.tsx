'use client'

import { useState, useEffect, useCallback } from 'react'
import { Library, Plus, Search, BookOpen, Calendar, ArrowLeftRight } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'

import { ModalItemAcervo } from './components/modal-item-acervo'
import { ModalEmprestimo } from './components/modal-emprestimo'
import { ListaAcervo } from './components/lista-acervo'
import { ListaEmprestimos } from './components/lista-emprestimos'
import {
  Aba, EMPRESTIMO_VAZIO, Emprestimo, Escola, FormEmprestimo, FormNovoItem,
  INPUT_CLS, ITEM_VAZIO, ItemAcervo, Pessoa, TipoTomador,
} from './components/types'

function BibliotecaAdmin() {
  const toast = useToast()
  const [aba, setAba] = useState<Aba>('acervo')
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
  const [novoItem, setNovoItem] = useState<FormNovoItem>(ITEM_VAZIO)
  const [novoEmprestimo, setNovoEmprestimo] = useState<FormEmprestimo>(EMPRESTIMO_VAZIO)
  const [salvando, setSalvando] = useState(false)

  const [modalDevolver, setModalDevolver] = useState<string | null>(null)
  const [devolvendo, setDevolvendo] = useState(false)

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
      setNovoItem(ITEM_VAZIO)
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
    setNovoEmprestimo({ ...EMPRESTIMO_VAZIO, acervo_id: itemId || '' })
    setModoReserva(false)
    setModalEmprestimo(true)
    garantirAcervoCarregado()
  }

  function abrirModalReserva(itemId: string) {
    setNovoEmprestimo({ ...EMPRESTIMO_VAZIO, acervo_id: itemId })
    setModoReserva(true)
    setModalEmprestimo(true)
    garantirAcervoCarregado()
  }

  async function confirmarModalEmprestimo(pessoa: Pessoa, tipoTomador: TipoTomador) {
    if (modoReserva) {
      await reservarItem(novoEmprestimo.acervo_id, pessoa, tipoTomador)
      setModalEmprestimo(false)
    } else {
      await salvarEmprestimo(pessoa, tipoTomador)
    }
  }

  async function salvarEmprestimo(pessoa: Pessoa, tipoTomador: TipoTomador) {
    if (!novoEmprestimo.acervo_id) {
      toast.error('Selecione o item')
      return
    }
    setSalvando(true)
    try {
      const body: Record<string, unknown> = {
        acervo_id: novoEmprestimo.acervo_id,
        dias_emprestimo: parseInt(novoEmprestimo.dias_emprestimo, 10),
      }
      if (tipoTomador === 'aluno') body.aluno_id = pessoa.id
      else body.servidor_id = pessoa.id

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
      setNovoEmprestimo(EMPRESTIMO_VAZIO)
      carregar()
    } catch (e) { toast.error((e as Error).message) } finally { setSalvando(false) }
  }

  async function reservarItem(acervoId: string, pessoa: Pessoa, tipoTomador: TipoTomador) {
    try {
      const body: Record<string, unknown> = { acervo_id: acervoId }
      if (tipoTomador === 'aluno') body.aluno_id = pessoa.id
      else body.servidor_id = pessoa.id
      const res = await fetch('/api/admin/biblioteca?acao=reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success(`Reserva criada para ${pessoa.nome}`)
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

  async function confirmarDevolucao() {
    if (!modalDevolver) return
    setDevolvendo(true)
    try {
      const res = await fetch('/api/admin/biblioteca?acao=devolucao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emprestimo_id: modalDevolver, status: 'devolvido' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Devolução registrada')
      setModalDevolver(null)
      carregar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDevolvendo(false)
    }
  }

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
            <button onClick={() => { setNovoItem(ITEM_VAZIO); setModalItem(true) }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-rose-700 text-sm font-bold hover:bg-rose-50">
              <Plus className="w-4 h-4" /> Novo item
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-700">
        {[
          { k: 'acervo' as const, label: 'Acervo', icon: BookOpen },
          { k: 'emprestimos' as const, label: 'Empréstimos ativos', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setAba(tab.k)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              aba === tab.k ? 'border-rose-600 text-rose-700 dark:text-rose-300' : 'border-transparent text-gray-500'
            }`}
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
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar título, autor, ISBN..."
                className={`${INPUT_CLS} w-full pl-9`}
              />
            </div>
          )}
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={INPUT_CLS}>
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

      {carregando ? (
        <LoadingSpinner centered />
      ) : aba === 'acervo' ? (
        <ListaAcervo acervo={acervo} onEmprestar={abrirModalEmprestimo} onReservar={abrirModalReserva} />
      ) : (
        <ListaEmprestimos emprestimos={emprestimos} onRenovar={renovar} onDevolver={setModalDevolver} />
      )}

      <ModalItemAcervo
        aberto={modalItem}
        form={novoItem}
        escolas={escolas}
        salvando={salvando}
        onChange={setNovoItem}
        onFechar={() => setModalItem(false)}
        onSalvar={salvarItem}
      />

      <ModalEmprestimo
        aberto={modalEmprestimo}
        modoReserva={modoReserva}
        acervo={acervo}
        form={novoEmprestimo}
        salvando={salvando}
        onChange={setNovoEmprestimo}
        onFechar={() => setModalEmprestimo(false)}
        onConfirmar={confirmarModalEmprestimo}
      />

      <ConfirmModal
        aberto={!!modalDevolver}
        titulo="Confirmar devolução?"
        mensagem="O empréstimo será marcado como devolvido e o item voltará ao acervo disponível."
        variant="info"
        textoConfirmar="Devolver"
        processando={devolvendo}
        onConfirmar={confirmarDevolucao}
        onFechar={() => setModalDevolver(null)}
      />
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
