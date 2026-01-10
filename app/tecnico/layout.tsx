'use client'

import { Suspense } from 'react'
import LayoutDashboard from '@/components/layout-dashboard'
import LoadingContent from '@/components/loading-content'

export default function TecnicoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LayoutDashboard tipoUsuario="tecnico">
      <Suspense fallback={<LoadingContent />}>
        {children}
      </Suspense>
    </LayoutDashboard>
  )
}
