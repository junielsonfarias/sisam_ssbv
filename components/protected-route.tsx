'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TipoUsuario } from '@/lib/types'
import { getOfflineUser, isOnline } from '@/lib/offline-db'

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
      // Função para verificar se tipo de usuário é permitido
      const verificarTipoPermitido = (tipoUsuario: string): boolean => {
        const tiposPermitidosExpandidos = [...tiposPermitidos]
        if (tiposPermitidos.includes('administrador')) {
          tiposPermitidosExpandidos.push('admin' as TipoUsuario)
        }
        if (tiposPermitidos.includes('admin')) {
          tiposPermitidosExpandidos.push('administrador' as TipoUsuario)
        }
        return tiposPermitidosExpandidos.includes(tipoUsuario as TipoUsuario)
      }

      // PRIMEIRO: Verificar se existe usuário offline salvo
      const offlineUser = await getOfflineUser()

      // Se estiver offline, usar apenas o usuário offline
      if (!isOnline()) {
        if (offlineUser && verificarTipoPermitido(offlineUser.tipo_usuario)) {
          setAutorizado(true)
          setCarregando(false)
          return
        } else {
          // Sem usuário offline válido
          router.push('/login')
          setCarregando(false)
          return
        }
      }

      // Se estiver online, tentar a API
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()

        if (response.ok && data.usuario) {
          // Normalizar tipo de usuário para comparação
          const tipoUsuarioOriginal = data.usuario.tipo_usuario

          if (!verificarTipoPermitido(tipoUsuarioOriginal)) {
            router.push('/login')
            return
          }

          setAutorizado(true)
        } else {
          // API não retornou usuário, tentar offline
          if (offlineUser && verificarTipoPermitido(offlineUser.tipo_usuario)) {
            setAutorizado(true)
          } else {
            router.push('/login')
          }
        }
      } catch (error) {
        // Erro de rede, usar usuário offline se disponível
        if (offlineUser && verificarTipoPermitido(offlineUser.tipo_usuario)) {
          setAutorizado(true)
        } else {
          router.push('/login')
        }
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

