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
    if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') return 'admin'
    return tipoUsuario
  }

  const basePath = getBasePath()

  const menuItems = [
    { icon: LayoutGrid, label: 'Dashboard', href: `/${basePath}/dashboard` },
    { icon: BarChart3, label: 'Análise de Dados', href: `/${basePath}/analise` },
  ]

  if (tipoUsuario === 'admin' || tipoUsuario === 'administrador') {
    menuItems.push(
      { icon: TrendingUp, label: 'Resultados', href: '/admin/resultados' },
      { icon: BarChart3, label: 'Comparativos', href: '/admin/comparativos' }
    )
  }

  if (tipoUsuario === 'tecnico') {
    menuItems.push(
      { icon: TrendingUp, label: 'Resultados', href: '/admin/resultados' },
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
      { icon: Database, label: 'Importar Cadastros', href: '/admin/importar-cadastros' },
      { icon: FileCheck, label: 'Importar Resultados', href: '/admin/importar-resultados' }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-bold text-gray-800">SISAM</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{usuario?.nome}</span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                aria-label="Sair"
              >
                <LogOut className="w-5 h-5" />
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
            w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
            ${menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="mt-8 px-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      onClick={() => setMenuAberto(false)}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Overlay para mobile */}
        {menuAberto && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMenuAberto(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Rodapé */}
      <Rodape />
    </div>
  )
}

