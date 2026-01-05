'use client'

import React from 'react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TipoUsuario } from '@/lib/types'
import * as offlineStorage from '@/lib/offline-storage'

interface ProtectedRouteProps {
  children: React.ReactNode
  tiposPermitidos: TipoUsuario[]
}

// Cache global de autorização para evitar re-verificações desnecessárias
let authCache: { autorizado: boolean; timestamp: number; tiposPermitidos: string } | null = null
const AUTH_CACHE_TTL = 300000 // 5 minutos de cache para melhor navegação offline

export default function ProtectedRoute({ children, tiposPermitidos }: ProtectedRouteProps) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const verificandoRef = useRef(false)

  useEffect(() => {
    const verificarAuth = async () => {
      // Evitar verificações simultâneas
      if (verificandoRef.current) return
      verificandoRef.current = true

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

      // Verificar cache de autorização (evita re-verificação ao navegar entre páginas)
      const tiposKey = tiposPermitidos.sort().join(',')
      if (authCache &&
          authCache.tiposPermitidos === tiposKey &&
          Date.now() - authCache.timestamp < AUTH_CACHE_TTL) {
        console.log('[ProtectedRoute] Usando cache de autorização')
        setAutorizado(authCache.autorizado)
        setCarregando(false)
        verificandoRef.current = false
        return
      }

      // PRIMEIRO: Verificar se existe usuário offline salvo no localStorage
      const offlineUser = offlineStorage.getUser()
      const online = offlineStorage.isOnline()

      console.log('[ProtectedRoute] Verificando auth:', { online, hasOfflineUser: !!offlineUser })

      // Se tiver usuário offline válido, autorizar imediatamente
      // (mesmo se online, para permitir navegação rápida)
      if (offlineUser && verificarTipoPermitido(offlineUser.tipo_usuario)) {
        console.log('[ProtectedRoute] Usuário offline válido encontrado, autorizando')
        setAutorizado(true)
        authCache = { autorizado: true, timestamp: Date.now(), tiposPermitidos: tiposKey }

        // Se offline, terminar aqui
        if (!online) {
          setCarregando(false)
          verificandoRef.current = false
          return
        }
      }

      // Se estiver offline e não tem usuário válido
      if (!online && !offlineUser) {
        console.log('[ProtectedRoute] Offline sem usuário, redirecionando para login')
        router.push('/login')
        setCarregando(false)
        verificandoRef.current = false
        return
      }

      // Se estiver online, verificar com a API (mas já autorizamos acima se tiver offline user)
      if (online) {
        try {
          const response = await fetch('/api/auth/verificar', {
            // Timeout curto para não bloquear
            signal: AbortSignal.timeout(5000)
          })
          const data = await response.json()

          if (response.ok && data.usuario) {
            const tipoUsuarioOriginal = data.usuario.tipo_usuario

            if (verificarTipoPermitido(tipoUsuarioOriginal)) {
              // Atualizar usuário no localStorage
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
              authCache = { autorizado: true, timestamp: Date.now(), tiposPermitidos: tiposKey }
            } else if (!offlineUser) {
              // Tipo não permitido e não tem fallback offline
              router.push('/login')
            }
          } else if (!offlineUser) {
            // API não retornou usuário e não tem fallback offline
            router.push('/login')
          }
        } catch (error) {
          console.log('[ProtectedRoute] Erro de rede, usando usuário offline:', error)
          // Erro de rede - o usuário offline já foi verificado acima
          if (!offlineUser || !verificarTipoPermitido(offlineUser.tipo_usuario)) {
            router.push('/login')
          }
        }
      }

      setCarregando(false)
      verificandoRef.current = false
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

