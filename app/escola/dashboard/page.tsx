'use client'

import ProtectedRoute from '@/components/protected-route'
import PainelDados from '@/components/painel-dados'

export default function EscolaDashboard() {
  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
        <PainelDados
          tipoUsuario="escola"
          estatisticasEndpoint="/api/escola/estatisticas"
          resultadosEndpoint="/api/admin/resultados-consolidados"
          turmasEndpoint="/api/admin/turmas"
        />
    </ProtectedRoute>
  )
}
