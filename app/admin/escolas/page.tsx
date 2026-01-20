'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Search, School, X } from 'lucide-react'
import { useToast } from '@/components/toast'
import { useUserType } from '@/lib/hooks/useUserType'

interface Escola {
  id: string
  nome: string
  codigo: string | null
  polo_id: string
  polo_nome?: string
  ativo: boolean
}

export default function EscolasPage() {
  const toast = useToast()
  const { tipoUsuario } = useUserType()
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [polos, setPolos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [escolaEditando, setEscolaEditando] = useState<Escola | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    polo_id: '',
    endereco: '',
    telefone: '',
    email: '',
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const [escolasRes, polosRes] = await Promise.all([
        fetch('/api/admin/escolas'),
        fetch('/api/admin/polos'),
      ])
      const escolasData = await escolasRes.json()
      const polosData = await polosRes.json()
      setEscolas(escolasData)
      setPolos(polosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

  const escolasFiltradas = escolas.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (e.codigo && e.codigo.toLowerCase().includes(busca.toLowerCase())) ||
      (e.polo_nome && e.polo_nome.toLowerCase().includes(busca.toLowerCase()))
  )

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const response = await fetch('/api/admin/escolas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        await carregarDados()
        setMostrarModal(false)
        setFormData({
          nome: '',
          codigo: '',
          polo_id: '',
          endereco: '',
          telefone: '',
          email: '',
        })
        toast.success(escolaEditando ? 'Escola atualizada com sucesso!' : 'Escola cadastrada com sucesso!')
      } else {
        toast.error(data.mensagem || 'Erro ao salvar escola')
      }
    } catch (error) {
      console.error('Erro ao salvar escola:', error)
      toast.error('Erro ao salvar escola')
    } finally {
      setSalvando(false)
    }
  }

  const handleAbrirModal = (escola?: Escola) => {
    if (escola) {
      setEscolaEditando(escola)
      setFormData({
        nome: escola.nome,
        codigo: escola.codigo || '',
        polo_id: escola.polo_id,
        endereco: '',
        telefone: '',
        email: '',
      })
    } else {
      setEscolaEditando(null)
      setFormData({
        nome: '',
        codigo: '',
        polo_id: '',
        endereco: '',
        telefone: '',
        email: '',
      })
    }
    setMostrarModal(true)
  }

  const handleExcluir = async (id: string, nome: string) => {
    // Verificar se a escola tem alunos vinculados
    try {
      const verificarVinculos = await fetch(`/api/admin/escolas/verificar-vinculos?id=${id}`)

      if (!verificarVinculos.ok) {
        toast.error('Erro ao verificar vínculos da escola')
        return
      }

      const vinculos = await verificarVinculos.json()

      if (vinculos.totalAlunos > 0 || vinculos.totalTurmas > 0 || vinculos.totalResultados > 0 || vinculos.totalConsolidados > 0 || vinculos.totalUsuarios > 0) {
        let mensagem = `Escola "${nome}" possui vínculos: `
        const partes = []
        if (vinculos.totalAlunos > 0) partes.push(`${vinculos.totalAlunos} aluno(s)`)
        if (vinculos.totalTurmas > 0) partes.push(`${vinculos.totalTurmas} turma(s)`)
        if (vinculos.totalResultados > 0) partes.push(`${vinculos.totalResultados} resultado(s)`)
        if (vinculos.totalConsolidados > 0) partes.push(`${vinculos.totalConsolidados} consolidado(s)`)
        if (vinculos.totalUsuarios > 0) partes.push(`${vinculos.totalUsuarios} usuário(s)`)
        mensagem += partes.join(', ')
        toast.warning(mensagem)
        return
      }
    } catch (error) {
      console.error('Erro ao verificar vínculos:', error)
      toast.error('Erro ao verificar vínculos da escola')
      return
    }

    if (!confirm(`Tem certeza que deseja excluir a escola "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/escolas?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        await carregarDados()
        toast.success('Escola excluída com sucesso!')
      } else {
        if (data.vinculos) {
          let mensagem = `Escola possui vínculos: `
          const partes = []
          if (data.vinculos.totalAlunos > 0) partes.push(`${data.vinculos.totalAlunos} aluno(s)`)
          if (data.vinculos.totalTurmas > 0) partes.push(`${data.vinculos.totalTurmas} turma(s)`)
          if (data.vinculos.totalResultados > 0) partes.push(`${data.vinculos.totalResultados} resultado(s)`)
          if (data.vinculos.totalConsolidados > 0) partes.push(`${data.vinculos.totalConsolidados} consolidado(s)`)
          if (data.vinculos.totalUsuarios > 0) partes.push(`${data.vinculos.totalUsuarios} usuário(s)`)
          mensagem += partes.join(', ')
          toast.warning(mensagem)
        } else {
          toast.error(data.mensagem || 'Erro ao excluir escola')
        }
      }
    } catch (error) {
      console.error('Erro ao excluir escola:', error)
      toast.error('Erro ao excluir escola')
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Escolas</h1>
              <p className="text-gray-600 mt-1">Gerencie as escolas do sistema</p>
            </div>
            <button
              onClick={() => handleAbrirModal()}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Nova Escola</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 dark:bg-slate-700">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar escolas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 bg-white"
                />
              </div>
            </div>

            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando escolas...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[350px]">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-2 md:py-3 px-2 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap">
                        Nome
                      </th>
                      <th className="text-left py-2 md:py-3 px-2 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
                        Código
                      </th>
                      <th className="text-left py-2 md:py-3 px-2 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                        Polo
                      </th>
                      <th className="text-left py-2 md:py-3 px-2 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                        Status
                      </th>
                      <th className="text-right py-2 md:py-3 px-2 md:px-4 lg:px-6 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase tracking-wider whitespace-nowrap">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {escolasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                          <School className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                          <p className="text-lg font-medium">Nenhuma escola encontrada</p>
                          <p className="text-sm">Tente ajustar os filtros de busca</p>
                        </td>
                      </tr>
                    ) : (
                      escolasFiltradas.map((escola) => (
                        <tr key={escola.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                                <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-gray-900 dark:text-white text-xs md:text-sm lg:text-base block truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">{escola.nome}</span>
                                <span className="text-gray-500 dark:text-gray-400 text-[10px] md:hidden block">{escola.polo_nome || '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap hidden sm:table-cell">
                            <span className="text-gray-600 dark:text-gray-300 font-mono text-xs md:text-sm bg-gray-100 dark:bg-slate-600 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                              {escola.codigo || '-'}
                            </span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap hidden md:table-cell">
                            <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{escola.polo_nome || '-'}</span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 whitespace-nowrap hidden lg:table-cell">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                                escola.ativo
                                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {escola.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 lg:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleAbrirModal(escola)}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleExcluir(escola.id, escola.nome)}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Excluir"
                                title="Excluir"
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

          {escolasFiltradas.length > 0 && (
            <div className="text-sm text-gray-600 text-center">
              Mostrando {escolasFiltradas.length} de {escolas.length} escolas
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
                        {escolaEditando ? 'Editar Escola' : 'Nova Escola'}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                        <input
                          type="text"
                          value={formData.endereco}
                          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                        <input
                          type="text"
                          value={formData.telefone}
                          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <button
                          onClick={() => setMostrarModal(false)}
                          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSalvar}
                          disabled={salvando || !formData.nome || !formData.polo_id}
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
    </ProtectedRoute>
  )
}
