'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: string
  polo_id?: string
  escola_id?: string
  polo_nome?: string
  escola_nome?: string
}

export interface UseUserTypeOptions {
  /** Callback executado após carregar o usuário */
  onUsuarioCarregado?: (usuario: Usuario, tipoUsuario: string) => void
  /** Se deve ignorar verificação quando offline */
  ignorarOffline?: boolean
}

export interface UseUserTypeReturn {
  tipoUsuario: string
  usuario: Usuario | null
  carregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
  isAdmin: boolean
  isPolo: boolean
  isEscola: boolean
}

/**
 * Hook para gerenciar carregamento e estado do tipo de usuário
 * Centraliza a lógica de verificação de autenticação
 */
export function useUserType(options: UseUserTypeOptions = {}): UseUserTypeReturn {
  const { onUsuarioCarregado, ignorarOffline = false } = options

  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregarUsuario = useCallback(async () => {
    // Verificar se está offline
    if (!ignorarOffline && typeof navigator !== 'undefined' && !navigator.onLine) {
      setCarregando(false)
      return
    }

    try {
      setCarregando(true)
      setErro(null)

      const response = await fetch('/api/auth/verificar')

      if (!response.ok) {
        throw new Error('Falha na verificação de autenticação')
      }

      const data = await response.json()

      if (data.usuario) {
        const tipo = data.usuario.tipo_usuario === 'administrador'
          ? 'admin'
          : data.usuario.tipo_usuario

        setTipoUsuario(tipo)
        setUsuario(data.usuario)

        // Chamar callback se fornecido
        if (onUsuarioCarregado) {
          onUsuarioCarregado(data.usuario, tipo)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar tipo de usuário:', error)
      setErro(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setCarregando(false)
    }
  }, [onUsuarioCarregado, ignorarOffline])

  useEffect(() => {
    carregarUsuario()
  }, [carregarUsuario])

  return {
    tipoUsuario,
    usuario,
    carregando,
    erro,
    recarregar: carregarUsuario,
    isAdmin: tipoUsuario === 'admin',
    isPolo: tipoUsuario === 'polo',
    isEscola: tipoUsuario === 'escola'
  }
}

export default useUserType
