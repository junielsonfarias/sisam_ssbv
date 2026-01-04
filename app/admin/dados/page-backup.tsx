'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'

export default function DadosPageTest() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')

  useEffect(() => {
    const carregarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
        }
      } catch (error) {
        console.error('Erro ao carregar tipo de usuário:', error)
      }
    }
    carregarTipoUsuario()
  }, [])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div>
          <h1>Teste</h1>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}


