'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { Plus, Search, UserCheck, UserX } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

import { ModalUsuarioForm } from './components/modal-usuario-form'
import { ModalUsuarioExcluir } from './components/modal-usuario-excluir'
import { TabelaUsuarios } from './components/tabela-usuarios'
import {
  Escola, FORM_DATA_INICIAL, FiltroStatus, FormDataUsuario, Polo, Usuario,
} from './components/types'

export default function UsuariosPage() {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [polos, setPolos] = useState<Polo[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState<FormDataUsuario>(FORM_DATA_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    carregarUsuarios(controller.signal)
    carregarPolosEEscolas(controller.signal)
    return () => controller.abort()
  }, [])

  const carregarPolosEEscolas = async (signal?: AbortSignal) => {
    try {
      const [polosRes, escolasRes] = await Promise.all([
        fetch('/api/admin/polos', { signal }),
        fetch('/api/admin/escolas', { signal }),
      ])
      const polosData = await polosRes.json()
      const escolasData = await escolasRes.json()
      setPolos(Array.isArray(polosData) ? polosData : [])
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('[Usuarios] Erro ao carregar polos/escolas:', (error as Error).message)
    }
  }

  const carregarUsuarios = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/admin/usuarios', { signal })
      const data = await response.json()
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('[Usuarios] Erro ao carregar usuários:', (error as Error).message)
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

  const resetForm = () => {
    setUsuarioEditando(null)
    setFormData(FORM_DATA_INICIAL)
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
        acesso_sisam: usuario.acesso_sisam !== false,
        acesso_gestor: usuario.acesso_gestor === true,
        acesso_semed: usuario.acesso_semed === true,
        acesso_transparencia: usuario.acesso_transparencia === true,
        acesso_admin: usuario.acesso_admin === true,
      })
    } else {
      resetForm()
    }
    setMostrarModal(true)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const isEditing = !!usuarioEditando
      const payload = {
        ...formData,
        id: usuarioEditando?.id,
        polo_id: formData.polo_id || null,
        escola_id: formData.escola_id || null,
        senha: formData.senha?.trim() || null,
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
    } catch {
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
        setUsuarioParaExcluir(null)
        toast.success(data.mensagem || 'Usuário removido com sucesso!')
      } else {
        toast.error(data.mensagem || 'Erro ao excluir usuário')
      }
    } catch {
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
          // Preserva as permissões de módulo atuais — sem propagar, o PUT
          // recalcula acessosValues com defaults e zera/sobrescreve os acessos.
          acesso_sisam: usuario.acesso_sisam !== false,
          acesso_gestor: usuario.acesso_gestor === true,
          acesso_semed: usuario.acesso_semed === true,
          acesso_transparencia: usuario.acesso_transparencia === true,
          acesso_admin: usuario.acesso_admin === true,
        }),
      })

      if (response.ok) {
        await carregarUsuarios()
        toast.success(usuario.ativo ? 'Usuário desativado' : 'Usuário ativado')
      } else {
        const data = await response.json()
        toast.error(data.mensagem || 'Erro ao alterar status')
      }
    } catch {
      toast.error('Erro ao alterar status do usuário')
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador']} requerModulo="admin">
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
            <TabelaUsuarios
              usuarios={usuariosFiltrados}
              polos={polos}
              escolas={escolas}
              onEditar={handleAbrirModal}
              onExcluir={setUsuarioParaExcluir}
              onToggleAtivo={handleToggleAtivo}
            />
          )}
        </div>

        {usuariosFiltrados.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuários
          </div>
        )}

        <ModalUsuarioForm
          aberto={mostrarModal}
          usuarioEditando={usuarioEditando}
          form={formData}
          polos={polos}
          escolas={escolas}
          salvando={salvando}
          onChange={setFormData}
          onFechar={() => setMostrarModal(false)}
          onSalvar={handleSalvar}
        />

        <ModalUsuarioExcluir
          usuario={usuarioParaExcluir}
          excluindo={excluindo}
          onFechar={() => setUsuarioParaExcluir(null)}
          onExcluir={handleExcluir}
        />
      </div>
    </ProtectedRoute>
  )
}
