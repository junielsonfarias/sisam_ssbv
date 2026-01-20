'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  WifiOff,
  Activity,
  FileBarChart,
  AlertTriangle
} from 'lucide-react'
import Rodape from './rodape'
import { OfflineSyncManager } from './offline-sync-manager'
import * as offlineStorage from '@/lib/offline-storage'
import { ThemeToggleSimple } from './theme-toggle'
import AlertaDivergencias from './alerta-divergencias'

interface LayoutDashboardProps {
  children: React.ReactNode
  tipoUsuario: string
}

interface Personalizacao {
  logo_url?: string
  nome_sistema?: string
  cor_primaria?: string
}

export default function LayoutDashboard({ children, tipoUsuario }: LayoutDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario] = useState<any>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [menuDesktopOculto, setMenuDesktopOculto] = useState(true) // Menu oculto por padrão em desktop
  const [modoOffline, setModoOffline] = useState(false)
  const [personalizacao, setPersonalizacao] = useState<Personalizacao>({})
  const [dataAtual, setDataAtual] = useState('')

  // Função para verificar se o item do menu está ativo
  const isMenuItemActive = (href: string): boolean => {
    if (!pathname) return false
    // Verifica correspondência exata ou se é uma subrota
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Função para obter configurações do badge por tipo de usuário
  const getBadgeConfig = (tipo: string) => {
    const configs: Record<string, { label: string; bgColor: string; textColor: string }> = {
      admin: { label: 'Administrador', bgColor: 'bg-purple-100 dark:bg-purple-900/50', textColor: 'text-purple-700 dark:text-purple-300' },
      administrador: { label: 'Administrador', bgColor: 'bg-purple-100 dark:bg-purple-900/50', textColor: 'text-purple-700 dark:text-purple-300' },
      tecnico: { label: 'Técnico', bgColor: 'bg-blue-100 dark:bg-blue-900/50', textColor: 'text-blue-700 dark:text-blue-300' },
      polo: { label: 'Polo', bgColor: 'bg-green-100 dark:bg-green-900/50', textColor: 'text-green-700 dark:text-green-300' },
      escola: { label: 'Escola', bgColor: 'bg-orange-100 dark:bg-orange-900/50', textColor: 'text-orange-700 dark:text-orange-300' }
    }
    return configs[tipo] || { label: tipo, bgColor: 'bg-gray-100 dark:bg-gray-900/50', textColor: 'text-gray-700 dark:text-gray-300' }
  }

  // Carregar personalização do sistema
  useEffect(() => {
    const carregarPersonalizacao = async () => {
      try {
        const response = await fetch('/api/personalizacao')
        if (response.ok) {
          const data = await response.json()
          setPersonalizacao(data)
        }
      } catch (error) {
        console.error('Erro ao carregar personalização:', error)
      }
    }
    carregarPersonalizacao()

    // Atualizar data atual
    const atualizarData = () => {
      const agora = new Date()
      const opcoes: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }
      setDataAtual(agora.toLocaleDateString('pt-BR', opcoes))
    }
    atualizarData()
    const intervalo = setInterval(atualizarData, 60000) // Atualiza a cada minuto
    return () => clearInterval(intervalo)
  }, [])

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
        { icon: FileBarChart, label: 'Relatorios', href: '/admin/relatorios' },
        { icon: Upload, label: 'Importar Dados', href: '/admin/importar-completo' },
        { icon: UserPlus, label: 'Importar Cadastros', href: '/admin/importar-cadastros' },
        { icon: FilePlus, label: 'Importar Resultados', href: '/admin/importar-resultados' },
        { icon: History, label: 'Importacoes', href: '/admin/importacoes' },
        { icon: AlertTriangle, label: 'Divergencias', href: '/admin/divergencias' },
        { icon: FileText, label: 'Resultados Consolidados', href: '/admin/resultados' },
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
        { icon: Settings, label: 'Modulos Tecnico', href: '/admin/modulos-tecnico' },
        { icon: Activity, label: 'Logs de Acesso', href: '/admin/logs-acesso' }
      )
    }

    // Menu especifico para TECNICO
    // Dashboard, Painel de Dados, Resultados Consolidados, Comparativos Escolas, Comparativos Polo,
    // Análise Gráfica, Relatórios, Escolas (visualização), Polos (visualização), Alunos
    if (tipoUsuarioReal === 'tecnico') {
      items.push(
        { icon: FileText, label: 'Resultados Consolidados', href: '/admin/resultados' },
        { icon: BarChart3, label: 'Comparativos Escolas', href: '/admin/comparativos' },
        { icon: MapPin, label: 'Comparativos Polo', href: '/admin/comparativos-polos' },
        { icon: FileBarChart, label: 'Relatorios', href: '/admin/relatorios' },
        { icon: School, label: 'Escolas', href: '/admin/escolas' },
        { icon: MapPin, label: 'Polos', href: '/admin/polos' },
        { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' }
      )
    }

    // Menu especifico para POLO
    // Dashboard, Painel de Dados, Resultados Consolidados, Comparativo de Escolas (só escolas do polo),
    // Análise Gráfica, Escolas (visualização das escolas do polo), Alunos (apenas do polo)
    if (tipoUsuarioReal === 'polo') {
      items.push(
        { icon: FileText, label: 'Resultados Consolidados', href: '/polo/analise' },
        { icon: BarChart3, label: 'Comparativo Escolas', href: '/admin/comparativos' },
        { icon: School, label: 'Escolas', href: '/polo/escolas' },
        { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' }
      )
    }

    // Menu especifico para ESCOLA
    // Dashboard, Painel de Dados, Resultados Consolidados, Alunos (apenas da escola)
    if (tipoUsuarioReal === 'escola') {
      items.push(
        { icon: FileText, label: 'Resultados Consolidados', href: '/escola/resultados' },
        { icon: GraduationCap, label: 'Alunos', href: '/escola/alunos' }
      )
    }

    return items
  }

  const menuItems = getMenuItems()

  // Obter contexto do usuário (polo ou escola)
  const getContextoUsuario = () => {
    if (tipoUsuarioReal === 'polo' && usuario?.polo_nome) {
      return usuario.polo_nome
    }
    if (tipoUsuarioReal === 'escola' && usuario?.escola_nome) {
      return usuario.escola_nome
    }
    return null
  }

  const badgeConfig = getBadgeConfig(tipoUsuarioReal)
  const contextoUsuario = getContextoUsuario()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      {/* Header - Fixo no topo com gradiente sutil */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-white via-white to-gray-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-md dark:shadow-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 transition-colors duration-300">
        <div className="px-2 sm:px-4 md:px-6 lg:px-8">
          {/* Linha superior: Logo, Nome do Sistema, Data */}
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-[72px]">
            {/* Seção esquerda: Menu mobile/desktop + Logo + Nome */}
            <div className="flex items-center min-w-0 gap-2 sm:gap-3">
              {/* Botão menu mobile */}
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="lg:hidden p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0 transition-all duration-200"
                aria-label="Menu"
              >
                {menuAberto ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>

              {/* Botão toggle menu desktop (gaveta) */}
              <button
                onClick={() => setMenuDesktopOculto(!menuDesktopOculto)}
                className="hidden lg:flex p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0 transition-all duration-200"
                aria-label={menuDesktopOculto ? "Abrir menu" : "Fechar menu"}
                title={menuDesktopOculto ? "Abrir menu lateral" : "Fechar menu lateral"}
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Logo do Sistema */}
              {personalizacao.logo_url && (
                <div className="flex-shrink-0 hidden sm:block">
                  <img
                    src={personalizacao.logo_url}
                    alt="Logo do Sistema"
                    className="h-8 sm:h-9 lg:h-10 w-auto object-contain rounded"
                  />
                </div>
              )}

              {/* Nome do Sistema */}
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white truncate">
                  {personalizacao.nome_sistema || 'SISAM'}
                </h1>
                <span className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 truncate">
                  Sistema de Avaliação Municipal
                </span>
              </div>

              {/* Separador visual */}
              <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-slate-600 mx-2" />

              {/* Badge do tipo de usuário */}
              <div className="hidden md:flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                  {badgeConfig.label}
                </span>
                {/* Contexto do usuário (polo/escola) */}
                {contextoUsuario && (
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px] lg:max-w-[200px]" title={contextoUsuario}>
                    {contextoUsuario}
                  </span>
                )}
              </div>
            </div>

            {/* Seção central: Data (apenas desktop) */}
            <div className="hidden xl:flex items-center justify-center">
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {dataAtual}
              </span>
            </div>

            {/* Seção direita: Status + Usuário + Ações */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              {/* Indicadores de status */}
              <div className="flex items-center gap-1">
                {/* Indicador de modo offline */}
                {modoOffline && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium animate-pulse">
                    <WifiOff className="w-3 h-3" />
                    <span className="hidden sm:inline">Offline</span>
                  </span>
                )}

                {/* Status de sincronização offline */}
                <OfflineSyncManager
                  userId={usuario?.id?.toString() || usuario?.usuario_id?.toString() || null}
                  autoSync={true}
                  showStatus={true}
                />
              </div>

              {/* Separador visual */}
              <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-600 mx-1" />

              {/* Badge do tipo (mobile) */}
              <span className={`md:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                {badgeConfig.label.substring(0, 3)}
              </span>

              {/* Link do perfil do usuário */}
              <Link
                href="/perfil"
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all duration-200 group"
                title="Meu Perfil"
              >
                {usuario?.foto_url ? (
                  <img
                    src={usuario.foto_url}
                    alt="Foto do perfil"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-500 transition-all"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center ring-2 ring-gray-200 dark:ring-slate-600 group-hover:ring-indigo-300 dark:group-hover:ring-indigo-500 transition-all">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div className="hidden sm:flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate max-w-[80px] md:max-w-[120px] lg:max-w-[150px]">
                    {usuario?.nome?.split(' ')[0] || 'Usuário'}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    Ver perfil
                  </span>
                </div>
              </Link>

              {/* Separador visual */}
              <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-slate-600 mx-1" />

              {/* Toggle de Tema */}
              <ThemeToggleSimple className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200" />

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 flex-shrink-0"
                aria-label="Sair"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerta de Divergências Críticas */}
      <AlertaDivergencias tipoUsuario={tipoUsuarioReal} />

      {/* Espaçador para compensar o header fixo */}
      <div className="h-14 sm:h-16 lg:h-[72px] flex-shrink-0" />

      <div className="flex flex-1">
        {/* Sidebar - Fixo na lateral */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40
            w-52 sm:w-56 md:w-64 bg-white dark:bg-slate-800 shadow-lg dark:shadow-slate-900/50 border-r border-gray-200 dark:border-slate-700 transform transition-all duration-300 ease-in-out
            ${menuAberto ? 'translate-x-0' : '-translate-x-full'} ${menuDesktopOculto ? 'lg:-translate-x-full' : 'lg:translate-x-0'}
            flex-shrink-0 overflow-y-auto
            pt-14 sm:pt-16 lg:pt-[72px]
          `}
        >
          <nav className="mt-4 sm:mt-6 px-2 sm:px-3 pb-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = isMenuItemActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg transition-all duration-200
                        ${isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }
                      `}
                      onClick={() => {
                        setMenuAberto(false)
                        setMenuDesktopOculto(true)
                      }}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Overlay para mobile e tablet - z-30 para ficar abaixo do sidebar (z-40) */}
        {menuAberto && (
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 lg:hidden"
            onClick={() => setMenuAberto(false)}
          />
        )}

        {/* Overlay para desktop quando menu está visível */}
        {!menuDesktopOculto && (
          <div
            className="hidden lg:block fixed inset-0 bg-black/30 dark:bg-black/50 z-30"
            onClick={() => setMenuDesktopOculto(true)}
          />
        )}

        {/* Main Content - Com margem para compensar sidebar fixo em telas grandes */}
        <main className={`flex-1 p-2 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-slate-900 transition-all duration-300 ${menuDesktopOculto ? '' : 'lg:ml-64'}`}>
          {children}
        </main>
      </div>

      {/* Rodape - Com margem para compensar sidebar fixo em telas grandes */}
      <div className={`transition-all duration-300 ${menuDesktopOculto ? '' : 'lg:ml-64'}`}>
        <Rodape />
      </div>
    </div>
  )
}
