'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Search, Users, X } from 'lucide-react'
import { TipoUsuario } from '@/lib/types'

interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  ativo: boolean
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo_usuario: 'escola' as TipoUsuario,
    polo_id: '',
    escola_id: '',
  })
  const [salvando, setSalvando] = useState(false)

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
      setPolos(polosData)
      setEscolas(escolasData)
    } catch (error) {
      console.error('Erro ao carregar polos e escolas:', error)
    }
  }

  const carregarUsuarios = async () => {
    try {
      const response = await fetch('/api/admin/usuarios')
      const data = await response.json()
      setUsuarios(data)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setCarregando(false)
    }
  }

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
  )

  const getTipoColor = (tipo: TipoUsuario) => {
    const colors: Record<TipoUsuario, string> = {
      administrador: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
      admin: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200', // admin é equivalente a administrador
      tecnico: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
      polo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200',
      escola: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800'
  }

  const getTipoLabel = (tipo: TipoUsuario) => {
    const labels: Record<TipoUsuario, string> = {
      administrador: 'Administrador',
      admin: 'Administrador', // admin é equivalente a administrador
      tecnico: 'Técnico',
      polo: 'Polo',
      escola: 'Escola',
    }
    return labels[tipo] || tipo
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        await carregarUsuarios()
        setMostrarModal(false)
        setFormData({
          nome: '',
          email: '',
          senha: '',
          tipo_usuario: 'escola',
          polo_id: '',
          escola_id: '',
        })
      } else {
        alert(data.mensagem || 'Erro ao salvar usuário')
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      alert('Erro ao salvar usuário')
    } finally {
      setSalvando(false)
    }
  }

  const handleAbrirModal = (usuario?: Usuario) => {
    if (usuario) {
      setUsuarioEditando(usuario)
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        senha: '',
        tipo_usuario: usuario.tipo_usuario,
        polo_id: '',
        escola_id: '',
      })
    } else {
      setUsuarioEditando(null)
      setFormData({
        nome: '',
        email: '',
        senha: '',
        tipo_usuario: 'escola',
        polo_id: '',
        escola_id: '',
      })
    }
    setMostrarModal(true)
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Usuários</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Gerencie os usuários do sistema</p>
            </div>
            <button
              onClick={() => handleAbrirModal()}
              className="w-full sm:w-auto bg-indigo-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50 dark:bg-slate-700">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 sm:pl-12 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 bg-white"
                />
              </div>
            </div>

            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4 text-sm sm:text-base">Carregando usuários...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap">
                        Nome
                      </th>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
                        Email
                      </th>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap">
                        Tipo
                      </th>
                      <th className="text-left py-2 px-2 md:py-3 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                        Status
                      </th>
                      <th className="text-right py-2 px-2 md:py-3 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {usuariosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                          <p className="text-sm">Tente ajustar os filtros de busca</p>
                        </td>
                      </tr>
                    ) : (
                      usuariosFiltrados.map((usuario) => (
                        <tr key={usuario.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm md:text-base block truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{usuario.nome}</span>
                                <span className="text-gray-500 dark:text-gray-400 text-[10px] sm:hidden block truncate">{usuario.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap hidden sm:table-cell">
                            <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm md:text-base truncate block max-w-[150px] md:max-w-none">{usuario.email}</span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${getTipoColor(usuario.tipo_usuario)}`}>
                              {getTipoLabel(usuario.tipo_usuario)}
                            </span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap hidden md:table-cell">
                            <span
                              className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                                usuario.ativo
                                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {usuario.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAbrirModal(usuario)}
                                className="p-1.5 sm:p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button
                                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Excluir"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
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
            <div className="text-sm text-gray-600 text-center">
              Mostrando {usuariosFiltrados.length} de {usuarios.length} usuários
            </div>
          )}

          {/* Modal de Cadastro/Edição */}
          {mostrarModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setMostrarModal(false)}></div>
                <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
                      </h3>
                      <button
                        onClick={() => setMostrarModal(false)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {usuarioEditando ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                        </label>
                        <input
                          type="password"
                          value={formData.senha}
                          onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário *</label>
                        <select
                          value={formData.tipo_usuario}
                          onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value as TipoUsuario, polo_id: '', escola_id: '' })}
                          className="select-custom w-full"
                        >
                          <option value="escola">Escola</option>
                          <option value="polo">Polo</option>
                          <option value="tecnico">Técnico</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </div>

                      {formData.tipo_usuario === 'polo' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Polo *</label>
                          <select
                            value={formData.polo_id}
                            onChange={(e) => setFormData({ ...formData, polo_id: e.target.value })}
                            className="select-custom w-full"
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Escola *</label>
                          <select
                            value={formData.escola_id}
                            onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
                            className="select-custom w-full"
                          >
                            <option value="">Selecione uma escola</option>
                            {escolas.map((escola) => (
                              <option key={escola.id} value={escola.id}>
                                {escola.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          onClick={() => setMostrarModal(false)}
                          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSalvar}
                          disabled={salvando || !formData.nome || !formData.email || (!usuarioEditando && !formData.senha)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
