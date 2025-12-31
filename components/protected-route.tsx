'use client'

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

        if (!tiposPermitidos.includes(data.usuario.tipo_usuario)) {
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

