'use client'

import { Suspense } from 'react'
import LayoutDashboard from '@/components/layout-dashboard'
import LoadingContent from '@/components/loading-content'
import BottomNavigation from '@/components/bottom-navigation'
import { LayoutDashboard as DashboardIcon, Users, BookOpen, GraduationCap, User } from 'lucide-react'

const MENU_MOBILE = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: DashboardIcon },
  { label: 'Alunos', href: '/admin/alunos', icon: Users },
  { label: 'Turmas', href: '/admin/turmas', icon: BookOpen },
  { label: 'SISAM', href: '/admin/dados', icon: GraduationCap },
  { label: 'Perfil', href: '/perfil', icon: User },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LayoutDashboard tipoUsuario="admin">
      <Suspense fallback={<LoadingContent />}>
        {children}
      </Suspense>
      <BottomNavigation items={MENU_MOBILE} />
    </LayoutDashboard>
  )
}
