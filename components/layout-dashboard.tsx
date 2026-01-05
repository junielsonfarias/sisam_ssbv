'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid,
  Users,
  School,
  MapPin,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Database,
  FileCheck,
  TrendingUp,
  FileScan,
  GraduationCap,
  Settings,
  Upload,
  History,
  FilePlus,
  UserPlus,
  User,
  WifiOff
} from 'lucide-react'
import Rodape from './rodape'
import { OfflineSyncManager } from './offline-sync-manager'
import * as offlineStorage from '@/lib/offline-storage'

interface LayoutDashboardProps {
  children: React.ReactNode
  tipoUsuario: string
}

export default function LayoutDashboard({ children, tipoUsuario }: LayoutDashboardProps) {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [modoOffline, setModoOffline] = useState(false)

  useEffect(() => {
    const carregarUsuario = async () => {
      // Verificar se está online
      const online = offlineStorage.isOnline()
      setModoOffline(!online)

      if (online) {
        // Tentar carregar do servidor
        try {
          const response = await fetch('/api/auth/verificar')
          const data = await response.json()
          if (data.usuario) {
            setUsuario(data.usuario)
            // Salvar usuário para acesso offline no localStorage
            offlineStorage.saveUser({
              id: data.usuario.id?.toString() || data.usuario.usuario_id?.toString(),
              nome: data.usuario.nome,
              email: data.usuario.email,
              tipo_usuario: data.usuario.tipo_usuario,
              polo_id: data.usuario.polo_id,
              escola_id: data.usuario.escola_id,
              polo_nome: data.usuario.polo_nome,
              escola_nome: data.usuario.escola_nome
            })
          } else {
            // Sem sessão válida, tentar usuário offline
            const offlineUser = offlineStorage.getUser()
            if (offlineUser) {
              setUsuario(offlineUser)
              setModoOffline(true)
            } else {
              router.push('/login')
            }
          }
        } catch (error) {
          // Erro de rede, tentar usuário offline
          const offlineUser = offlineStorage.getUser()
          if (offlineUser) {
            setUsuario(offlineUser)
            setModoOffline(true)
          } else {
            router.push('/login')
          }
        }
      } else {
        // Está offline, usar usuário salvo
        const offlineUser = offlineStorage.getUser()
        if (offlineUser) {
          setUsuario(offlineUser)
        } else {
          // Sem usuário offline, redirecionar para login
          router.push('/login')
        }
      }
    }

    carregarUsuario()

    // Listener para mudanças de conexão
    const handleOnline = () => setModoOffline(false)
    const handleOffline = () => setModoOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Impedir reload quando offline - aviso ao usuário
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!offlineStorage.isOnline()) {
        e.preventDefault()
        e.returnValue = 'Você está offline. Recarregar a página pode causar perda de sessão. Deseja continuar?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [router])

  const handleLogout = async () => {
    // Limpar dados offline do localStorage
    offlineStorage.clearUser()
    offlineStorage.clearAllOfflineData()
    // Fazer logout no servidor (se online)
    if (offlineStorage.isOnline()) {
      await fetch('/api/auth/logout', { method: 'POST' })
    }
    router.push('/login')
  }

  // Mapear tipoUsuario para o caminho correto
  const getBasePath = () => {
    if (!tipoUsuario) return 'admin'
    if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') return 'admin'
    return tipoUsuario
  }

  const basePath = getBasePath()
  const tipoUsuarioReal = usuario?.tipo_usuario === 'administrador' ? 'admin' : (usuario?.tipo_usuario || tipoUsuario || 'admin')

  // Menu fixo baseado no tipo de usuario - sem depender de carregamento async
  const getMenuItems = () => {
    const items = [
      { icon: LayoutGrid, label: 'Dashboard', href: `/${basePath}/dashboard` },
    ]

    // Painel de Dados - FIXO PARA TODOS OS USUARIOS
    items.push({ icon: Database, label: 'Painel de Dados', href: '/admin/dados' })

    // Analise Grafica - para todos exceto escola (escola tem menu proprio)
    if (tipoUsuarioReal !== 'escola') {
      items.push({ icon: TrendingUp, label: 'Analise Grafica', href: `/${basePath}/graficos` })
    }

    // Menu especifico para ADMINISTRADOR
    if (tipoUsuarioReal === 'admin' || tipoUsuarioReal === 'administrador') {
      items.push(
        { icon: Upload, label: 'Importar Dados', href: '/admin/importar-completo' },
        { icon: UserPlus, label: 'Importar Cadastros', href: '/admin/importar-cadastros' },
        { icon: FilePlus, label: 'Importar Resultados', href: '/admin/importar-resultados' },
        { icon: History, label: 'Importacoes', href: '/admin/importacoes' },
        { icon: FileText, label: 'Resultados', href: '/admin/resultados' },
        { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' },
        { icon: MapPin, label: 'Comparativo Polos', href: '/admin/comparativos-polos' },
        { icon: Users, label: 'Usuarios', href: '/admin/usuarios' },
        { icon: School, label: 'Escolas', href: '/admin/escolas' },
        { icon: MapPin, label: 'Polos', href: '/admin/polos' },
        { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' },
        { icon: FileCheck, label: 'Questoes', href: '/admin/questoes' },
        { icon: Settings, label: 'Configurar Series', href: '/admin/configuracao-series' },
        { icon: FileScan, label: 'Cartao-Resposta', href: '/admin/cartao-resposta' },
        { icon: Settings, label: 'Personalizacao', href: '/admin/personalizacao' },
        { icon: Settings, label: 'Modulos Tecnico', href: '/admin/modulos-tecnico' }
      )
    }

    // Menu especifico para TECNICO - fixo, sem carregar modulos
    if (tipoUsuarioReal === 'tecnico') {
      items.push(
        { icon: FileText, label: 'Resultados', href: '/admin/resultados' },
        { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' },
        { icon: School, label: 'Escolas', href: '/admin/escolas' },
        { icon: MapPin, label: 'Polos', href: '/admin/polos' },
        { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' }
      )
    }

    // Menu especifico para POLO
    if (tipoUsuarioReal === 'polo') {
      items.push(
        { icon: FileText, label: 'Resultados', href: '/polo/analise' },
        { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' },
        { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' }
      )
    }

    // Menu especifico para ESCOLA
    if (tipoUsuarioReal === 'escola') {
      items.push(
        { icon: FileText, label: 'Resultados Consolidados', href: '/escola/resultados' },
        { icon: BarChart3, label: 'Analise Grafica', href: '/escola/graficos' },
        { icon: GraduationCap, label: 'Alunos', href: '/escola/alunos' }
      )
    }

    return items
  }

  const menuItems = getMenuItems()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="lg:hidden p-1.5 sm:p-2 rounded-md text-gray-600 hover:bg-gray-100 flex-shrink-0"
                aria-label="Menu"
              >
                {menuAberto ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
              <h1 className="ml-2 lg:ml-0 text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">SISAM</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 min-w-0">
              {/* Indicador de modo offline */}
              {modoOffline && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}
              {/* Status de sincronização offline */}
              {!modoOffline && (
                <OfflineSyncManager userId={usuario?.id?.toString() || null} autoSync={true} showStatus={true} />
              )}

              <Link
                href="/perfil"
                className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Meu Perfil"
              >
                {usuario?.foto_url ? (
                  <img src={usuario.foto_url} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[100px] md:max-w-[150px]">{usuario?.nome}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-52 sm:w-56 md:w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
            ${menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            flex-shrink-0 overflow-y-auto
          `}
        >
          <nav className="mt-4 sm:mt-6 px-2 sm:px-3 pb-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      onClick={() => setMenuAberto(false)}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Overlay para mobile e tablet */}
        {menuAberto && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMenuAberto(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Rodape */}
      <Rodape />
    </div>
  )
}
