'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import PainelDados from '@/components/painel-dados'

export default function AdminDashboard() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario="admin">
        <PainelDados
          tipoUsuario="admin"
          estatisticasEndpoint="/api/admin/estatisticas"
          resultadosEndpoint="/api/admin/resultados-consolidados"
          escolasEndpoint="/api/admin/escolas"
          turmasEndpoint="/api/admin/turmas"
        />
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
