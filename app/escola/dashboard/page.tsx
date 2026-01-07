'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import PainelDados from '@/components/painel-dados'

export default function EscolaDashboard() {
  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <LayoutDashboard tipoUsuario="escola">
        <PainelDados
          tipoUsuario="escola"
          estatisticasEndpoint="/api/escola/estatisticas"
          resultadosEndpoint="/api/admin/resultados-consolidados"
          turmasEndpoint="/api/admin/turmas"
        />
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
