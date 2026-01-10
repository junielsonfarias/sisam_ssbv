'use client'

import ProtectedRoute from '@/components/protected-route'
import PainelDados from '@/components/painel-dados'

export default function AdminDashboard() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <PainelDados
        tipoUsuario="admin"
        estatisticasEndpoint="/api/admin/estatisticas"
        resultadosEndpoint="/api/admin/resultados-consolidados"
        escolasEndpoint="/api/admin/escolas"
        turmasEndpoint="/api/admin/turmas"
      />
    </ProtectedRoute>
  )
}
