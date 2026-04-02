'use client'

import ProtectedRoute from '@/components/protected-route'

export default function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute tiposPermitidos={['responsavel']}>
      {children}
    </ProtectedRoute>
  )
}
