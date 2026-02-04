'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Search, Users, X, UserCheck, UserX, ToggleLeft, ToggleRight } from 'lucide-react'
import { TipoUsuario } from '@/lib/types'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  polo_id: string | null
  escola_id: string | null
  ativo: boolean
}

interface Polo {
  id: string
  nome: string
}

interface Escola {
  id: string
  nome: string
  polo_id: string
}

export default function UsuariosPage() {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [polos, setPolos] = useState<Polo[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false)
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo_usuario: 'escola' as TipoUsuario,
    polo_id: '',
    escola_id: '',
    ativo: true,
  })
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    carregarUsuarios()
    carregarPolosEEscolas()
  }, [])

  const carregarPolosEEscolas = async () => {
    try {
      const [polosRes, escolasRes] = await Promise.all([
        fetch('/api/admin/polos'),
        fetch('/api/admin/escolas'),
      ])
      const polosData = await polosRes.json()
      const escolasData = await escolasRes.json()
      setPolos(Array.isArray(polosData) ? polosData : [])
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
    } catch (error) {
      console.error('Erro ao carregar polos e escolas:', error)
    }
  }

  const carregarUsuarios = async () => {
    try {
      const response = await fetch('/api/admin/usuarios')
      const data = await response.json()
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setCarregando(false)
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchBusca =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())

    const matchStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'ativos' && u.ativo) ||
      (filtroStatus === 'inativos' && !u.ativo)

    return matchBusca && matchStatus
  })

  const getTipoColor = (tipo: TipoUsuario | string) => {
    const tipoNormalizado = tipo === 'admin' ? 'administrador' : tipo
    const colors: Record<TipoUsuario, string> = {
      administrador: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
      tecnico: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
      polo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200',
      escola: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    }
    return colors[tipoNormalizado as TipoUsuario] || 'bg-gray-100 text-gray-800'
  }

  const getTipoLabel = (tipo: TipoUsuario | string) => {
    const tipoNormalizado = tipo === 'admin' ? 'administrador' : tipo
    const labels: Record<TipoUsuario, string> = {
      administrador: 'Administrador',
      tecnico: 'Técnico',
      polo: 'Polo',
      escola: 'Escola',
    }
    return labels[tipoNormalizado as TipoUsuario] || tipo
  }

  const getPoloNome = (poloId: string | null) => {
    if (!poloId) return '-'
    const polo = polos.find(p => p.id === poloId)
    return polo?.nome || '-'
  }

  const getEscolaNome = (escolaId: string | null) => {
    if (!escolaId) return '-'
    const escola = escolas.find(e => e.id === escolaId)
    return escola?.nome || '-'
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const isEditing = !!usuarioEditando

      const payload = {
        ...formData,
        id: usuarioEditando?.id,
        // Converter strings vazias para null (backend espera UUID válido ou null)
        polo_id: formData.polo_id || null,
        escola_id: formData.escola_id || null,
      }

      const response = await fetch('/api/admin/usuarios', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        await carregarUsuarios()
        setMostrarModal(false)
        resetForm()
        toast.success(isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!')
      } else {
        toast.error(data.mensagem || 'Erro ao salvar usuário')
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      toast.error('Erro ao salvar usuário')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (hardDelete: boolean = false) => {
    if (!usuarioParaExcluir) return

    setExcluindo(true)
    try {
      const response = await fetch(
        `/api/admin/usuarios?id=${usuarioParaExcluir.id}${hardDelete ? '&hard=true' : ''}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (response.ok) {
        await carregarUsuarios()
        setMostrarModalExcluir(false)
        setUsuarioParaExcluir(null)
        toast.success(data.mensagem || 'Usuário removido com sucesso!')
      } else {
        toast.error(data.mensagem || 'Erro ao excluir usuário')
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      toast.error('Erro ao excluir usuário')
    } finally {
      setExcluindo(false)
    }
  }

  const handleToggleAtivo = async (usuario: Usuario) => {
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario,
          polo_id: usuario.polo_id || null,
          escola_id: usuario.escola_id || null,
          ativo: !usuario.ativo,
        }),
      })

      if (response.ok) {
        await carregarUsuarios()
        toast.success(usuario.ativo ? 'Usuário desativado' : 'Usuário ativado')
      } else {
        const data = await response.json()
        toast.error(data.mensagem || 'Erro ao alterar status')
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do usuário')
    }
  }

  const resetForm = () => {
    setUsuarioEditando(null)
    setFormData({
      nome: '',
      email: '',
      senha: '',
      tipo_usuario: 'escola',
      polo_id: '',
      escola_id: '',
      ativo: true,
    })
  }

  const handleAbrirModal = (usuario?: Usuario) => {
    if (usuario) {
      setUsuarioEditando(usuario)
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        senha: '',
        tipo_usuario: usuario.tipo_usuario,
        polo_id: usuario.polo_id || '',
        escola_id: usuario.escola_id || '',
        ativo: usuario.ativo,
      })
    } else {
      resetForm()
    }
    setMostrarModal(true)
  }

  const handleAbrirModalExcluir = (usuario: Usuario) => {
    setUsuarioParaExcluir(usuario)
    setMostrarModalExcluir(true)
  }

  const escolasFiltradas = formData.tipo_usuario === 'escola' && formData.polo_id
    ? escolas.filter(e => e.polo_id === formData.polo_id)
    : escolas

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Usuários</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Gerencie os usuários do sistema</p>
            </div>
            <button
              onClick={() => handleAbrirModal()}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Buscar usuários..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-9 sm:pl-12 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltroStatus('todos')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filtroStatus === 'todos'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroStatus('ativos')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                      filtroStatus === 'ativos'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Ativos
                  </button>
                  <button
                    onClick={() => setFiltroStatus('inativos')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                      filtroStatus === 'inativos'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    Inativos
                  </button>
                </div>
              </div>
            </div>

            {carregando ? (
              <LoadingSpinner text="Carregando usuários..." centered />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] sm:min-w-[500px] md:min-w-[600px]">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider hidden lg:table-cell">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider hidden md:table-cell">
                        Vínculo
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {usuariosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                          <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                          <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                          <p className="text-sm">Tente ajustar os filtros de busca</p>
                        </td>
                      </tr>
                    ) : (
                      usuariosFiltrados.map((usuario) => (
                        <tr key={usuario.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${!usuario.ativo ? 'opacity-60' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${usuario.ativo ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <Users className={`w-5 h-5 ${usuario.ativo ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-gray-900 dark:text-white text-sm block truncate">{usuario.nome}</span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs lg:hidden block truncate">{usuario.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <span className="text-gray-600 dark:text-gray-300 text-sm">{usuario.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTipoColor(usuario.tipo_usuario)}`}>
                              {getTipoLabel(usuario.tipo_usuario)}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span className="text-gray-600 dark:text-gray-300 text-sm">
                              {usuario.tipo_usuario === 'polo' && usuario.polo_id && getPoloNome(usuario.polo_id)}
                              {usuario.tipo_usuario === 'escola' && usuario.escola_id && getEscolaNome(usuario.escola_id)}
                              {(usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleAtivo(usuario)}
                              className="group"
                              title={usuario.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                            >
                              {usuario.ativo ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 group-hover:bg-green-200 dark:group-hover:bg-green-900 transition-colors">
                                  <ToggleRight className="w-4 h-4" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 group-hover:bg-red-200 dark:group-hover:bg-red-900 transition-colors">
                                  <ToggleLeft className="w-4 h-4" />
                                  Inativo
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleAbrirModal(usuario)}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title="Editar usuário"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleAbrirModalExcluir(usuario)}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {usuariosFiltrados.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Mostrando {usuariosFiltrados.length} de {usuarios.length} usuários
            </div>
          )}

          {/* Modal de Cadastro/Edição */}
          {mostrarModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500/75 dark:bg-gray-900/75" onClick={() => setMostrarModal(false)}></div>
                <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
                      </h3>
                      <button
                        onClick={() => setMostrarModal(false)}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                          placeholder="Nome completo"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                          placeholder="email@exemplo.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {usuarioEditando ? 'Nova Senha (opcional)' : 'Senha *'}
                        </label>
                        <input
                          type="password"
                          value={formData.senha}
                          onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                          placeholder={usuarioEditando ? 'Deixe vazio para manter' : 'Mínimo 12 caracteres (letra + número)'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Usuário *</label>
                        <select
                          value={formData.tipo_usuario}
                          onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value as TipoUsuario, polo_id: '', escola_id: '' })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                        >
                          <option value="escola">Escola</option>
                          <option value="polo">Polo</option>
                          <option value="tecnico">Técnico</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </div>

                      {formData.tipo_usuario === 'polo' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polo *</label>
                          <select
                            value={formData.polo_id}
                            onChange={(e) => setFormData({ ...formData, polo_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                          >
                            <option value="">Selecione um polo</option>
                            {polos.map((polo) => (
                              <option key={polo.id} value={polo.id}>
                                {polo.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {formData.tipo_usuario === 'escola' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Polo (opcional)</label>
                            <select
                              value={formData.polo_id}
                              onChange={(e) => setFormData({ ...formData, polo_id: e.target.value, escola_id: '' })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                            >
                              <option value="">Todos os polos</option>
                              {polos.map((polo) => (
                                <option key={polo.id} value={polo.id}>
                                  {polo.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola *</label>
                            <select
                              value={formData.escola_id}
                              onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                            >
                              <option value="">Selecione uma escola</option>
                              {escolasFiltradas.map((escola) => (
                                <option key={escola.id} value={escola.id}>
                                  {escola.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {usuarioEditando && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status do usuário</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formData.ativo ? 'Usuário pode acessar o sistema' : 'Usuário bloqueado'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                              formData.ativo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                formData.ativo ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <button
                          onClick={() => setMostrarModal(false)}
                          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSalvar}
                          disabled={salvando || !formData.nome || !formData.email || (!usuarioEditando && !formData.senha)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Exclusão */}
          {mostrarModalExcluir && usuarioParaExcluir && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500/75 dark:bg-gray-900/75" onClick={() => setMostrarModalExcluir(false)}></div>
                <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                  <div className="px-6 py-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                        <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          Excluir Usuário
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {usuarioParaExcluir.nome}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Escolha uma opção para este usuário:
                    </p>

                    <div className="space-y-3">
                      <button
                        onClick={() => handleExcluir(false)}
                        disabled={excluindo}
                        className="w-full px-4 py-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <UserX className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          <div>
                            <span className="font-medium text-yellow-800 dark:text-yellow-200">Desativar</span>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">O usuário não poderá mais fazer login, mas os dados serão mantidos</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleExcluir(true)}
                        disabled={excluindo}
                        className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-left hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <div>
                            <span className="font-medium text-red-800 dark:text-red-200">Excluir permanentemente</span>
                            <p className="text-xs text-red-600 dark:text-red-400">Remove o usuário completamente. Esta ação não pode ser desfeita!</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex justify-end mt-6">
                      <button
                        onClick={() => setMostrarModalExcluir(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </ProtectedRoute>
  )
}
