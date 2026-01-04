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
  Settings
} from 'lucide-react'
import Rodape from './rodape'

interface LayoutDashboardProps {
  children: React.ReactNode
  tipoUsuario: string
}

export default function LayoutDashboard({ children, tipoUsuario }: LayoutDashboardProps) {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          setUsuario(data.usuario)
        }
      } catch (error) {
        router.push('/login')
      }
    }
    carregarUsuario()
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
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
        { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' },
        { icon: School, label: 'Escolas', href: '/admin/escolas' },
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
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[80px] sm:max-w-[120px] md:max-w-[200px]">{usuario?.nome}</span>
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
