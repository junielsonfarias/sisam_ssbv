'use client'

import ProtectedRoute from '@/components/protected-route'
import PainelDados from '@/components/painel-dados'

export default function TecnicoDashboard() {
  return (
    <ProtectedRoute tiposPermitidos={['tecnico']}>
        <PainelDados
          tipoUsuario="tecnico"
          estatisticasEndpoint="/api/tecnico/estatisticas"
          resultadosEndpoint="/api/admin/resultados-consolidados"
          escolasEndpoint="/api/admin/escolas"
          turmasEndpoint="/api/admin/turmas"
        />
    </ProtectedRoute>
  )
}
