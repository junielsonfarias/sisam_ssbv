'use client'

import { Suspense, useEffect } from 'react'
import LayoutDashboard from '@/components/layout-dashboard'
import LoadingContent from '@/components/loading-content'

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <LayoutDashboard tipoUsuario="professor">
      <Suspense fallback={<LoadingContent />}>
        {children}
      </Suspense>
    </LayoutDashboard>
  )
}
