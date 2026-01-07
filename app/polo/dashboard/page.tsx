'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import PainelDados from '@/components/painel-dados'

export default function PoloDashboard() {
  return (
    <ProtectedRoute tiposPermitidos={['polo']}>
      <LayoutDashboard tipoUsuario="polo">
        <PainelDados
          tipoUsuario="polo"
          estatisticasEndpoint="/api/polo/estatisticas"
          resultadosEndpoint="/api/admin/resultados-consolidados"
          escolasEndpoint="/api/polo/escolas"
          turmasEndpoint="/api/admin/turmas"
        />
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
