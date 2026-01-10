'use client'

import { Suspense, useState, useEffect } from 'react'
import LayoutDashboard from '@/components/layout-dashboard'
import LoadingContent from '@/components/loading-content'

export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')

  useEffect(() => {
    // Detectar tipo de usuário do localStorage ou da sessão
    const detectarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario
          if (tipo === 'administrador') {
            setTipoUsuario('admin')
          } else {
            setTipoUsuario(tipo)
          }
        }
      } catch (error) {
        console.error('Erro ao detectar tipo de usuário:', error)
      }
    }
    detectarTipoUsuario()
  }, [])

  return (
    <LayoutDashboard tipoUsuario={tipoUsuario}>
      <Suspense fallback={<LoadingContent />}>
        {children}
      </Suspense>
    </LayoutDashboard>
  )
}
