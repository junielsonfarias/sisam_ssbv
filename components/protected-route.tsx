'use client'

import React from 'react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TipoUsuario } from '@/lib/types'
import * as offlineStorage from '@/lib/offline-storage'
import { validarModulo, type Modulo } from '@/lib/auth/validar-modulo'

interface ProtectedRouteProps {
  children: React.ReactNode
  tiposPermitidos: TipoUsuario[]
  /**
   * Exige que o usuario tenha permissao para o modulo informado
   * (`acesso_semed === true`, etc). Quando bloqueado, redireciona
   * para `/modulos` em vez de `/login` — o usuario esta autenticado,
   * so nao tem o modulo. Administradores sempre passam (fallback de
   * seguranca para nao travar sistema em rollout).
   *
   * Adicionado na auditoria 30/05/2026: antes, acesso_* era populado
   * no JWT mas nao validado em rota nenhuma — bypass por URL direta.
   */
  requerModulo?: Modulo
}

// Cache global de autorização keyed por userId+tiposPermitidos
let authCache: { autorizado: boolean; timestamp: number; tiposPermitidos: string; userId: string } | null = null
const AUTH_CACHE_TTL = 300000 // 5 minutos de cache para melhor navegação offline

export default function ProtectedRoute({ children, tiposPermitidos, requerModulo }: ProtectedRouteProps) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [autorizado, setAutorizado] = useState(false)
  const verificandoRef = useRef(false)

  // Estabilizar tiposPermitidos para evitar re-renders infinitos
  // (arrays literais como prop criam nova referência a cada render do pai)
  const tiposKey = tiposPermitidos.slice().sort().join(',') + '|' + (requerModulo ?? '')

  useEffect(() => {
    const tiposArr = tiposKey.split(',')

    const verificarAuth = async () => {
      // Evitar verificações simultâneas
      if (verificandoRef.current) return
      verificandoRef.current = true

      // Função para verificar se tipo de usuário é permitido
      // Trata 'admin' como sinônimo de 'administrador' para compatibilidade
      const verificarTipoPermitido = (tipoUsuario: string): boolean => {
        const tiposExpandidos = [...tiposArr]
        if (tiposArr.includes('administrador')) {
          tiposExpandidos.push('admin')
        }
        if (tiposArr.includes('admin')) {
          tiposExpandidos.push('administrador')
        }
        return tiposExpandidos.includes(tipoUsuario)
      }

      // Wrapper que checa tipo + modulo (quando requerModulo informado).
      // Bloqueio por modulo redireciona para /modulos (usuario autenticado,
      // so nao tem acesso ao modulo) em vez de /login.
      const verificarAcesso = (u: { tipo_usuario: string; acesso_sisam?: boolean; acesso_gestor?: boolean; acesso_semed?: boolean; acesso_transparencia?: boolean; acesso_admin?: boolean }): { ok: boolean; rotaFallback: string } => {
        if (!verificarTipoPermitido(u.tipo_usuario)) return { ok: false, rotaFallback: '/login' }
        if (requerModulo && !validarModulo(u as any, requerModulo)) {
          return { ok: false, rotaFallback: '/modulos' }
        }
        return { ok: true, rotaFallback: '/' }
      }

      // PRIMEIRO: Verificar se existe usuário offline salvo no localStorage
      const offlineUser = offlineStorage.getUser()
      const currentUserId = offlineUser?.id || ''

      // Verificar cache de autorização (keyed por userId + tiposPermitidos)
      if (authCache &&
          authCache.tiposPermitidos === tiposKey &&
          authCache.userId === currentUserId &&
          Date.now() - authCache.timestamp < AUTH_CACHE_TTL) {
        if (!autorizado || carregando) {
          setAutorizado(authCache.autorizado)
          setCarregando(false)
        }
        verificandoRef.current = false
        return
      }
      const online = offlineStorage.isOnline()

      console.log('[ProtectedRoute] Verificando auth:', { online, hasOfflineUser: !!offlineUser })

      // Se tiver usuário offline válido, autorizar imediatamente
      // (mesmo se online, para permitir navegação rápida)
      if (offlineUser) {
        const acesso = verificarAcesso(offlineUser)
        if (acesso.ok) {
          console.log('[ProtectedRoute] Usuário offline válido encontrado, autorizando')
          setAutorizado(true)
          authCache = { autorizado: true, timestamp: Date.now(), tiposPermitidos: tiposKey, userId: currentUserId }

          // Se offline, terminar aqui
          if (!online) {
            setCarregando(false)
            verificandoRef.current = false
            return
          }
        } else if (acesso.rotaFallback === '/modulos') {
          // Tem tipo permitido mas falta o modulo — manda pra pagina de modulos
          console.log('[ProtectedRoute] Usuario sem acesso ao modulo:', requerModulo)
          router.push('/modulos')
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

      // Se estiver online, verificar com a API (mas já autorizamos acima se tiver offline user válido)
      if (online) {
        try {
          const response = await fetch('/api/auth/verificar', {
            // Timeout curto para não bloquear
            signal: AbortSignal.timeout(5000)
          })
          const data = await response.json().catch(() => ({}))

          if (response.ok && data.usuario) {
            const tipoUsuarioOriginal = data.usuario.tipo_usuario
            const acesso = verificarAcesso(data.usuario)

            if (acesso.ok) {
              // Atualizar usuário no localStorage
              offlineStorage.saveUser({
                id: data.usuario.id?.toString() || data.usuario.usuario_id?.toString(),
                nome: data.usuario.nome,
                email: data.usuario.email,
                tipo_usuario: data.usuario.tipo_usuario,
                polo_id: data.usuario.polo_id,
                escola_id: data.usuario.escola_id,
                polo_nome: data.usuario.polo_nome,
                escola_nome: data.usuario.escola_nome,
                gestor_escolar_habilitado: data.usuario.gestor_escolar_habilitado,
                acesso_sisam: data.usuario.acesso_sisam,
                acesso_gestor: data.usuario.acesso_gestor,
                acesso_semed: data.usuario.acesso_semed,
                acesso_transparencia: data.usuario.acesso_transparencia,
                acesso_admin: data.usuario.acesso_admin,
              })
              setAutorizado(true)
              authCache = { autorizado: true, timestamp: Date.now(), tiposPermitidos: tiposKey, userId: currentUserId }
            } else if (acesso.rotaFallback === '/modulos') {
              console.log('[ProtectedRoute] Usuario sem acesso ao modulo:', requerModulo)
              router.push('/modulos')
            } else {
              // Tipo não permitido - redirecionar para login
              console.log('[ProtectedRoute] Tipo de usuário não permitido:', tipoUsuarioOriginal)
              router.push('/login')
            }
          } else if (response.status === 401 || response.status === 403) {
            // V8 ideal: antes de desistir, tentar UMA VEZ /api/auth/refresh.
            // Se o usuario tem refresh-token valido, recuperamos a sessao
            // sem ir para /login.
            const refreshOk = await fetch('/api/auth/refresh', { method: 'POST' })
              .then(r => r.ok)
              .catch(() => false)
            if (refreshOk) {
              console.log('[ProtectedRoute] Sessao renovada via refresh-token')
              // Reverificar — agora com cookie novo
              const segundo = await fetch('/api/auth/verificar').catch(() => null)
              const dadosSegundo = await segundo?.json().catch(() => ({})) ?? {}
              if (segundo?.ok && dadosSegundo.usuario) {
                const acessoSegundo = verificarAcesso(dadosSegundo.usuario)
                if (acessoSegundo.ok) {
                  offlineStorage.saveUser({
                    id: dadosSegundo.usuario.id?.toString() || dadosSegundo.usuario.usuario_id?.toString(),
                    nome: dadosSegundo.usuario.nome,
                    email: dadosSegundo.usuario.email,
                    tipo_usuario: dadosSegundo.usuario.tipo_usuario,
                    polo_id: dadosSegundo.usuario.polo_id,
                    escola_id: dadosSegundo.usuario.escola_id,
                    polo_nome: dadosSegundo.usuario.polo_nome,
                    escola_nome: dadosSegundo.usuario.escola_nome,
                    gestor_escolar_habilitado: dadosSegundo.usuario.gestor_escolar_habilitado,
                    acesso_sisam: dadosSegundo.usuario.acesso_sisam,
                    acesso_gestor: dadosSegundo.usuario.acesso_gestor,
                    acesso_semed: dadosSegundo.usuario.acesso_semed,
                    acesso_transparencia: dadosSegundo.usuario.acesso_transparencia,
                    acesso_admin: dadosSegundo.usuario.acesso_admin,
                  })
                  setAutorizado(true)
                  authCache = { autorizado: true, timestamp: Date.now(), tiposPermitidos: tiposKey, userId: currentUserId }
                  setCarregando(false)
                  verificandoRef.current = false
                  return
                }
              }
            }
            console.log('[ProtectedRoute] Auth expirada no servidor (status', response.status, '). Limpando sessao offline.')
            offlineStorage.clearUser()
            authCache = null
            setAutorizado(false)
            router.push('/login')
          } else {
            // 5xx ou erro transitorio — manter autorizacao offline se ja autorizou
            if (!autorizado) {
              console.log('[ProtectedRoute] API retornou erro', response.status, 'e nao ha autorizacao offline valida')
              router.push('/login')
            }
          }
        } catch (error) {
          console.log('[ProtectedRoute] Erro de rede, verificando usuário offline:', error)
          // Erro de rede - manter autorização se offline user é válido, senão redirecionar
          if (!autorizado) {
            router.push('/login')
          }
        }
      }

      setCarregando(false)
      verificandoRef.current = false
    }

    verificarAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tiposKey])

  // V8 ideal: refresh proativo do access-token a cada 13min (access vive 15min,
  // refresh-token 7d com rotacao em rotina). Mantem sessao "infinita" enquanto
  // a aba estiver aberta e o usuario nao deslogar.
  useEffect(() => {
    if (!autorizado) return
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      fetch('/api/auth/refresh', { method: 'POST' }).catch(() => {
        // silencioso: se falhar, a proxima request 401 vai disparar fluxo de login
      })
    }, 13 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autorizado])

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

