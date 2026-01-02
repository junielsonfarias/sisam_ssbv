'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TipoUsuario } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  tiposPermitidos: TipoUsuario[]
}

export default function ProtectedRoute({ children, tiposPermitidos }: ProtectedRouteProps) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    const verificarAuth = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()

        if (!response.ok || !data.usuario) {
          router.push('/login')
          return
        }

        // Normalizar tipo de usuário para comparação
        const tipoUsuarioOriginal = data.usuario.tipo_usuario
        // Verificar se o tipo está nos permitidos, considerando que 'administrador' e 'admin' são equivalentes
        const tiposPermitidosExpandidos = [...tiposPermitidos]
        if (tiposPermitidos.includes('administrador')) {
          tiposPermitidosExpandidos.push('admin' as TipoUsuario)
        }
        if (tiposPermitidos.includes('admin')) {
          tiposPermitidosExpandidos.push('administrador' as TipoUsuario)
        }
        
        if (!tiposPermitidosExpandidos.includes(tipoUsuarioOriginal)) {
          router.push('/login')
          return
        }

        setAutorizado(true)
      } catch (error) {
        router.push('/login')
      } finally {
        setCarregando(false)
      }
    }

    verificarAuth()
  }, [router, tiposPermitidos])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!autorizado) {
    return null
  }

  return <>{children}</>
}

