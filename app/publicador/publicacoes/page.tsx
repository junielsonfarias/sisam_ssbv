'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, FileText, X, ExternalLink, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Publicacao {
  id: string
  tipo: string
  numero: string | null
  titulo: string
  descricao: string | null
  orgao: string
  data_publicacao: string
  ano_referencia: string | null
  url_arquivo: string | null
  ativo: boolean
  criado_em: string
}

const TIPOS_DOCUMENTO = ['Portaria', 'Resolução', 'Decreto', 'Calendário Escolar', 'Ata', 'Parecer', 'Ofício', 'Edital', 'Comunicado']
const ORGAOS = ['SEMED', 'CACSFUNDEB', 'CAE', 'CME', 'Prefeitura Municipal']

const BADGE_COLORS: Record<string, string> = {
  'Portaria': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'Resolução': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'Decreto': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  'Calendário Escolar': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'Ata': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'Parecer': 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  'Ofício': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  'Edital': 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  'Comunicado': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

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
      const params = new URLSearchParams({ page: String(pagina), limit: '20' })
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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {carregando ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : publicacoes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma publicação encontrada</p>
            <p className="text-slate-400 text-sm mt-1">Clique em &quot;Nova Publicação&quot; para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">N&ordm;</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Órgão</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Data</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {publicacoes.map((pub) => (
                  <tr key={pub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE_COLORS[pub.tipo] || 'bg-slate-100 text-slate-700'}`}>
                        {pub.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{pub.numero || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {pub.titulo}
                      {pub.url_arquivo && (
                        <a href={pub.url_arquivo} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex text-indigo-500 hover:text-indigo-700">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{pub.orgao}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(pub.data_publicacao)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirModal(pub)}
                          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(pub.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500">
              Página {pagina} de {totalPaginas} ({total} registro(s))
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formId ? 'Editar Publicação' : 'Nova Publicação'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="">Selecione o tipo</option>
                  {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número</label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  placeholder="Ex: 001/2026"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título *</label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Título da publicação"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  rows={3}
                  placeholder="Descrição ou ementa da publicação"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Órgão *</label>
                <select
                  value={formOrgao}
                  onChange={(e) => setFormOrgao(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="">Selecione o órgão</option>
                  {ORGAOS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Publicação *</label>
                <input
                  type="date"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ano de Referência</label>
                <input
                  type="text"
                  value={formAno}
                  onChange={(e) => setFormAno(e.target.value)}
                  placeholder="Ex: 2026"
                  maxLength={10}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL do Arquivo</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setModalAberto(false)}
                className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? 'Salvando...' : (formId ? 'Atualizar' : 'Criar')}
              </button>
            </div>
          </div>
        </div>
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
