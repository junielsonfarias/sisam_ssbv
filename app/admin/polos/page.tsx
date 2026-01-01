'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Search, MapPin, X } from 'lucide-react'

interface Polo {
  id: string
  nome: string
  codigo: string | null
  descricao: string | null
  ativo: boolean
}

export default function PolosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [polos, setPolos] = useState<Polo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [poloEditando, setPoloEditando] = useState<Polo | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const carregarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
        }
      } catch (error) {
        console.error('Erro ao carregar tipo de usuário:', error)
      }
    }
    carregarTipoUsuario()
    carregarPolos()
  }, [])

  const carregarPolos = async () => {
    try {
      const response = await fetch('/api/admin/polos')
      const data = await response.json()
      setPolos(data)
    } catch (error) {
      console.error('Erro ao carregar polos:', error)
    } finally {
      setCarregando(false)
    }
  }

  const polosFiltrados = polos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(busca.toLowerCase()))
  )

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const response = await fetch('/api/admin/polos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        await carregarPolos()
        setMostrarModal(false)
        setFormData({
          nome: '',
          codigo: '',
          descricao: '',
        })
      } else {
        alert(data.mensagem || 'Erro ao salvar polo')
      }
    } catch (error) {
      console.error('Erro ao salvar polo:', error)
      alert('Erro ao salvar polo')
    } finally {
      setSalvando(false)
    }
  }

  const handleAbrirModal = (polo?: Polo) => {
    if (polo) {
      setPoloEditando(polo)
      setFormData({
        nome: polo.nome,
        codigo: polo.codigo || '',
        descricao: polo.descricao || '',
      })
    } else {
      setPoloEditando(null)
      setFormData({
        nome: '',
        codigo: '',
        descricao: '',
      })
    }
    setMostrarModal(true)
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Polos</h1>
              <p className="text-gray-600 mt-1">Gerencie os polos educacionais do sistema</p>
            </div>
            <button
              onClick={() => handleAbrirModal()}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Polo</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar polos..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 bg-white"
                />
              </div>
            </div>

            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando polos...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 md:py-4 px-3 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                        Nome
                      </th>
                      <th className="text-left py-3 md:py-4 px-3 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                        Código
                      </th>
                      <th className="text-left py-3 md:py-4 px-3 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider min-w-[200px]">
                        Descrição
                      </th>
                      <th className="text-left py-3 md:py-4 px-3 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                        Status
                      </th>
                      <th className="text-right py-3 md:py-4 px-3 md:px-4 lg:px-6 font-semibold text-gray-700 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {polosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500">
                          <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-lg font-medium">Nenhum polo encontrado</p>
                          <p className="text-sm">Tente ajustar os filtros de busca</p>
                        </td>
                      </tr>
                    ) : (
                      polosFiltrados.map((polo) => (
                        <tr key={polo.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 md:py-4 px-3 md:px-4 lg:px-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 md:mr-3">
                                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                              </div>
                              <span className="font-medium text-gray-900 text-xs md:text-sm lg:text-base">{polo.nome}</span>
                            </div>
                          </td>
                          <td className="py-3 md:py-4 px-3 md:px-4 lg:px-6 whitespace-nowrap">
                            <span className="text-gray-600 font-mono text-xs md:text-sm bg-gray-100 px-2 py-1 rounded">
                              {polo.codigo || '-'}
                            </span>
                          </td>
                          <td className="py-3 md:py-4 px-3 md:px-4 lg:px-6">
                            <span className="text-gray-600 text-xs md:text-sm">{polo.descricao || '-'}</span>
                          </td>
                          <td className="py-3 md:py-4 px-3 md:px-4 lg:px-6 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium ${
                                polo.ativo
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {polo.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="py-3 md:py-4 px-3 md:px-4 lg:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAbrirModal(polo)}
                                className="p-1.5 md:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                              <button
                                className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Excluir"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
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

          {polosFiltrados.length > 0 && (
            <div className="text-sm text-gray-600 text-center">
              Mostrando {polosFiltrados.length} de {polos.length} polos
            </div>
          )}

          {/* Modal de Cadastro/Edição */}
          {mostrarModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setMostrarModal(false)}></div>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {poloEditando ? 'Editar Polo' : 'Novo Polo'}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea
                          value={formData.descricao}
                          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          onClick={() => setMostrarModal(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSalvar}
                          disabled={salvando || !formData.nome}
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
