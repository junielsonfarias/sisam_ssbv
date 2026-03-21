'use client'

import { Suspense } from 'react'
import LayoutDashboard from '@/components/layout-dashboard'
import LoadingContent from '@/components/loading-content'

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LayoutDashboard tipoUsuario="editor">
      <Suspense fallback={<LoadingContent />}>
        {children}
      </Suspense>
    </LayoutDashboard>
  )
}
