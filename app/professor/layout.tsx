'use client'

import { Suspense, useEffect, useState } from 'react'
import LayoutDashboard from '@/components/layout-dashboard'
import LoadingContent from '@/components/loading-content'
import BottomNavigation from '@/components/bottom-navigation'
import MaisDrawer, { type MaisDrawerItem } from '@/components/professor/mais-drawer'
import { AppUpdateChecker } from '@/components/app-update-checker'
import {
  LayoutDashboard as DashboardIcon, Users, CalendarCheck, BookOpen,
  MoreHorizontal, FileText, ClipboardList, MessageCircle, QrCode,
  Megaphone, User,
} from 'lucide-react'

const MAIS_ITEMS: MaisDrawerItem[] = [
  { label: 'Diário',     href: '/professor/diario',      icon: FileText },
  { label: 'Planos',     href: '/professor/planos',      icon: BookOpen },
  { label: 'Tarefas',    href: '/professor/tarefas',     icon: ClipboardList },
  { label: 'Comunicados',href: '/professor/comunicados', icon: Megaphone },
  { label: 'Mensagens',  href: '/professor/mensagens',   icon: MessageCircle },
  { label: 'QR Presença',href: '/professor/qr-presenca', icon: QrCode },
  { label: 'Perfil',     href: '/perfil',                icon: User },
]

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [maisAberto, setMaisAberto] = useState(false)

  // Trocar manifest para o do professor quando no portal professor
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    if (link) {
      link.href = '/manifest-professor.json'
    }
    // Trocar theme-color
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (meta) {
      meta.content = '#059669'
    }
    return () => {
      if (link) link.href = '/manifest.json'
      if (meta) meta.content = '#4F46E5'
    }
  }, [])

  const MENU_MOBILE_PROFESSOR = [
    { label: 'Dashboard',  href: '/professor/dashboard',         icon: DashboardIcon },
    { label: 'Turmas',     href: '/professor/turmas',            icon: BookOpen },
    { label: 'Frequencia', href: '/professor/frequencia',         icon: CalendarCheck },
    { label: 'Notas',      href: '/professor/notas',             icon: Users },
    { label: 'Mais',       href: '#mais',                        icon: MoreHorizontal,
      onClick: () => setMaisAberto(true) },
  ]

  return (
    <LayoutDashboard tipoUsuario="professor">
      <Suspense fallback={<LoadingContent />}>
        {children}
      </Suspense>
      <BottomNavigation items={MENU_MOBILE_PROFESSOR} activeColor="emerald" />
      <MaisDrawer aberto={maisAberto} onFechar={() => setMaisAberto(false)} items={MAIS_ITEMS} />
      <AppUpdateChecker />
    </LayoutDashboard>
  )
}
