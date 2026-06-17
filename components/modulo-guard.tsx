'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as offlineStorage from '@/lib/offline-storage'
import { validarModulo, type Modulo } from '@/lib/auth/validar-modulo'

/**
 * Guard de MÓDULO para layouts por namespace (`/admin/<modulo>/`).
 *
 * Esconde a página e redireciona para `/modulos` quando o usuário autenticado
 * não tem acesso ao módulo (`acesso_<modulo> !== true`; administradores sempre
 * passam — ver `validarModulo`). Fecha o gap mapeado na auditoria de 30/05:
 * antes, `acesso_*` era cosmético no front e dava bypass por URL direta.
 *
 * Escopo: validação de UX/navegação (não renderizar a tela). A proteção REAL
 * dos dados continua no backend via `withAuthModulo` nos endpoints.
 *
 * NÃO trata login/tipo de usuário — isso continua a cargo do `<ProtectedRoute>`
 * de cada página. Se não há usuário salvo, deixa passar para que o
 * ProtectedRoute redirecione ao login.
 */
export default function ModuloGuard({
  modulo,
  children,
}: {
  modulo: Modulo
  children: React.ReactNode
}) {
  const router = useRouter()
  const [negado, setNegado] = useState(false)

  useEffect(() => {
    const usuario = offlineStorage.getUser()
    if (usuario && !validarModulo(usuario as any, modulo)) {
      setNegado(true)
      router.replace('/modulos')
    }
  }, [modulo, router])

  if (negado) return null
  return <>{children}</>
}
