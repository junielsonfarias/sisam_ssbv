'use client'

import ProtectedRoute from '@/components/protected-route'
import { AppUpdateChecker } from '@/components/app-update-checker'

export default function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute tiposPermitidos={['responsavel']}>
      {children}
      <AppUpdateChecker />
    </ProtectedRoute>
  )
}
