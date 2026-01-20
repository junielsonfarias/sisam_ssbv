'use client'

import ProtectedRoute from '@/components/protected-route'
import PainelAnalise from '@/components/painel-analise'

export default function TecnicoAnalisePage() {
  return (
    <ProtectedRoute tiposPermitidos={['tecnico']}>
      <PainelAnalise
        tipoUsuario="tecnico"
        titulo="Resultados Consolidados"
        subtitulo="Tecnico - Todos os Polos e Escolas"
        resultadosEndpoint="/api/admin/resultados-consolidados"
        escolasEndpoint="/api/admin/escolas"
        turmasEndpoint="/api/admin/turmas"
        polosEndpoint="/api/admin/polos"
        mostrarFiltroPolo={true}
        mostrarFiltroEscola={true}
      />
    </ProtectedRoute>
  )
}
