'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import PainelDados from '@/components/painel-dados'

export default function TecnicoDashboard() {
  return (
    <ProtectedRoute tiposPermitidos={['tecnico']}>
      <LayoutDashboard tipoUsuario="tecnico">
        <PainelDados
          tipoUsuario="tecnico"
          estatisticasEndpoint="/api/tecnico/estatisticas"
          resultadosEndpoint="/api/admin/resultados-consolidados"
          escolasEndpoint="/api/admin/escolas"
          turmasEndpoint="/api/admin/turmas"
        />
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
