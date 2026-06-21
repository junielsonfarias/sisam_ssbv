'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, FileText, Filter } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { PublicacoesTabela, PublicacaoModal, TIPOS_DOCUMENTO, ORGAOS } from './components'
import type { Publicacao } from './components'

function GestaoPublicacoes() {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroOrgao, setFiltroOrgao] = useState('')
  const [filtroAno, setFiltroAno] = useState('')

  // Paginação
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [total, setTotal] = useState(0)

  // Form
  const [formId, setFormId] = useState<string | null>(null)
  const [formTipo, setFormTipo] = useState('')
  const [formNumero, setFormNumero] = useState('')
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formOrgao, setFormOrgao] = useState('')
  const [formData, setFormData] = useState('')
  const [formAno, setFormAno] = useState('')
  const [formUrl, setFormUrl] = useState('')

  const fetchPublicacoes = useCallback(async () => {
    try {
      setCarregando(true)
      const params = new URLSearchParams({ pagina: String(pagina), limite: '20' })
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroOrgao) params.set('orgao', filtroOrgao)
      if (filtroAno) params.set('ano', filtroAno)

      const res = await fetch(`/api/publicador/publicacoes?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar publicações')
      const data = await res.json()
      setPublicacoes(data.publicacoes || [])
      setTotalPaginas(data.totalPaginas || 1)
      setTotal(data.total || 0)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [pagina, filtroTipo, filtroOrgao, filtroAno])

  useEffect(() => {
    fetchPublicacoes()
  }, [fetchPublicacoes])

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErro(msg)
      setTimeout(() => setErro(''), 4000)
    } else {
      setMensagem(msg)
      setTimeout(() => setMensagem(''), 4000)
    }
  }

  const abrirModal = (pub?: Publicacao) => {
    if (pub) {
      setFormId(pub.id)
      setFormTipo(pub.tipo)
      setFormNumero(pub.numero || '')
      setFormTitulo(pub.titulo)
      setFormDescricao(pub.descricao || '')
      setFormOrgao(pub.orgao)
      setFormData(pub.data_publicacao?.split('T')[0] || '')
      setFormAno(pub.ano_referencia || '')
      setFormUrl(pub.url_arquivo || '')
    } else {
      setFormId(null)
      setFormTipo('')
      setFormNumero('')
      setFormTitulo('')
      setFormDescricao('')
      setFormOrgao('')
      setFormData(new Date().toISOString().split('T')[0])
      setFormAno(new Date().getFullYear().toString())
      setFormUrl('')
    }
    setModalAberto(true)
  }

  const salvar = async () => {
    if (!formTipo || !formTitulo || !formOrgao || !formData) {
      showToast('Preencha os campos obrigatórios (tipo, título, órgão, data)', true)
      return
    }

    setSalvando(true)
    try {
      const body: any = {
        tipo: formTipo,
        numero: formNumero || null,
        titulo: formTitulo,
        descricao: formDescricao || null,
        orgao: formOrgao,
        data_publicacao: formData,
        ano_referencia: formAno || null,
        url_arquivo: formUrl || null,
      }
      if (formId) body.id = formId

      const res = await fetch('/api/publicador/publicacoes', {
        method: formId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.erro || data.erros?.join(', ') || 'Erro ao salvar')
      }

      showToast(formId ? 'Publicação atualizada com sucesso!' : 'Publicação criada com sucesso!')
      setModalAberto(false)
      fetchPublicacoes()
    } catch (err: any) {
      showToast(err.message, true)
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id: string) => {
    try {
      const res = await fetch(`/api/publicador/publicacoes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      showToast('Publicação excluída com sucesso!')
      setConfirmDelete(null)
      fetchPublicacoes()
    } catch (err: any) {
      showToast(err.message, true)
    }
  }

  const anos = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i))

  return (
    <div className="space-y-6">
      {/* Toast messages */}
      {mensagem && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          {mensagem}
        </div>
      )}
      {erro && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          {erro}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestão de Publicações</h1>
              <p className="text-indigo-200 text-sm">{total} publicação(ões) cadastrada(s)</p>
            </div>
          </div>
          <button
            onClick={() => abrirModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nova Publicação
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={filtroTipo}
            onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1) }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
          >
            <option value="">Todos os tipos</option>
            {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filtroOrgao}
            onChange={(e) => { setFiltroOrgao(e.target.value); setPagina(1) }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
          >
            <option value="">Todos os órgãos</option>
            {ORGAOS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select
            value={filtroAno}
            onChange={(e) => { setFiltroAno(e.target.value); setPagina(1) }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
          >
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <PublicacoesTabela
        publicacoes={publicacoes}
        carregando={carregando}
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        onEditar={abrirModal}
        onExcluir={setConfirmDelete}
        onPagina={setPagina}
      />

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Confirmar exclusão</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluir(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação/edição */}
      {modalAberto && (
        <PublicacaoModal
          form={{ formId, formTipo, formNumero, formTitulo, formDescricao, formOrgao, formData, formAno, formUrl }}
          salvando={salvando}
          setFormTipo={setFormTipo}
          setFormNumero={setFormNumero}
          setFormTitulo={setFormTitulo}
          setFormDescricao={setFormDescricao}
          setFormOrgao={setFormOrgao}
          setFormData={setFormData}
          setFormAno={setFormAno}
          setFormUrl={setFormUrl}
          onFechar={() => setModalAberto(false)}
          onSalvar={salvar}
        />
      )}
    </div>
  )
}

export default function PublicacoesPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'publicador']}>
      <GestaoPublicacoes />
    </ProtectedRoute>
  )
}
