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
  Upload, 
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
  const pathname = usePathname()
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
    if (!tipoUsuario) return 'admin' // Fallback
    if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') return 'admin'
    return tipoUsuario
  }

  const basePath = getBasePath() || 'admin' // Garantir que nunca seja undefined

  const menuItems = [
    { icon: LayoutGrid, label: 'Dashboard', href: `/${basePath}/dashboard` },
    { icon: BarChart3, label: 'Análise de Dados', href: `/${basePath}/analise` },
    { icon: TrendingUp, label: 'Análise Gráfica', href: `/${basePath}/graficos` },
  ]

  if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') {
    menuItems.push(
      { icon: FileText, label: 'Resultados', href: '/admin/resultados' },
      { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' }
    )
  }

  if (tipoUsuario === 'tecnico') {
    menuItems.push(
      { icon: FileText, label: 'Resultados', href: '/admin/resultados' },
      { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' },
      { icon: School, label: 'Escolas', href: '/admin/escolas' },
      { icon: MapPin, label: 'Polos', href: '/admin/polos' },
      { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' }
    )
  }

  if (tipoUsuario === 'polo') {
    menuItems.push(
      { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' }
    )
  }

  if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') {
    menuItems.push(
      { icon: Users, label: 'Usuários', href: '/admin/usuarios' },
      { icon: School, label: 'Escolas', href: '/admin/escolas' },
      { icon: MapPin, label: 'Polos', href: '/admin/polos' },
      { icon: GraduationCap, label: 'Alunos', href: '/admin/alunos' },
      { icon: FileText, label: 'Questões', href: '/admin/questoes' },
      { icon: FileScan, label: 'Cartão-Resposta', href: '/admin/cartao-resposta' },
      { icon: Settings, label: 'Personalização', href: '/admin/personalizacao' },
      { icon: Database, label: 'Importação Completa', href: '/admin/importar-completo' },
      { icon: FileCheck, label: 'Histórico de Importações', href: '/admin/importacoes' }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="lg:hidden p-1.5 sm:p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="Menu"
              >
                {menuAberto ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
              <h1 className="ml-2 lg:ml-0 text-lg sm:text-xl md:text-2xl font-bold text-gray-800">SISAM</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{usuario?.nome}</span>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-56 sm:w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
            ${menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="mt-4 sm:mt-8 px-2 sm:px-4">
            <ul className="space-y-1 sm:space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
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
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Rodapé */}
      <Rodape />
    </div>
  )
}

