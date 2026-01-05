'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TipoUsuario } from '@/lib/types'
import * as offlineStorage from '@/lib/offline-storage'

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

      // PRIMEIRO: Verificar se existe usuário offline salvo no localStorage
      const offlineUser = offlineStorage.getUser()
      const online = offlineStorage.isOnline()

      console.log('[ProtectedRoute] Verificando auth:', { online, hasOfflineUser: !!offlineUser })

      // Se estiver offline, usar apenas o usuário offline
      if (!online) {
        console.log('[ProtectedRoute] Modo offline detectado')
        if (offlineUser && verificarTipoPermitido(offlineUser.tipo_usuario)) {
          console.log('[ProtectedRoute] Usuário offline válido encontrado')
          setAutorizado(true)
          setCarregando(false)
          return
        } else {
          console.log('[ProtectedRoute] Sem usuário offline válido, redirecionando para login')
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

          // Salvar/atualizar usuário no localStorage para uso offline
          offlineStorage.saveUser({
            id: data.usuario.id?.toString() || data.usuario.usuario_id?.toString(),
            nome: data.usuario.nome,
            email: data.usuario.email,
            tipo_usuario: data.usuario.tipo_usuario,
            polo_id: data.usuario.polo_id,
            escola_id: data.usuario.escola_id,
            polo_nome: data.usuario.polo_nome,
            escola_nome: data.usuario.escola_nome
          })

          setAutorizado(true)
        } else {
          // API não retornou usuário, tentar offline
          if (offlineUser && verificarTipoPermitido(offlineUser.tipo_usuario)) {
            console.log('[ProtectedRoute] Usando usuário offline como fallback')
            setAutorizado(true)
          } else {
            router.push('/login')
          }
        }
      } catch (error) {
        console.log('[ProtectedRoute] Erro de rede, tentando usuário offline:', error)
        // Erro de rede, usar usuário offline se disponível
        if (offlineUser && verificarTipoPermitido(offlineUser.tipo_usuario)) {
          console.log('[ProtectedRoute] Usando usuário offline após erro de rede')
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

