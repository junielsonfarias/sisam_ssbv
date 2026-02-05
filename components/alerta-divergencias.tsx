'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'

interface AlertaDivergenciasProps {
  tipoUsuario: string
}

export default function AlertaDivergencias({ tipoUsuario }: AlertaDivergenciasProps) {
  const [totalCriticos, setTotalCriticos] = useState<number>(0)
  const [mostrar, setMostrar] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Só exibir para administradores
    if (tipoUsuario !== 'admin' && tipoUsuario !== 'administrador') {
      setCarregando(false)
      return
    }

    // Verificar se já foi fechado nesta sessão
    const fechadoNestaSessao = sessionStorage.getItem('alerta_divergencias_fechado')
    if (fechadoNestaSessao) {
      setCarregando(false)
      return
    }

    // Buscar divergências críticas
    const verificarDivergencias = async () => {
      try {
        const response = await fetch('/api/admin/divergencias?apenas_criticos=true')
        if (response.ok) {
          const data = await response.json()
          if (data.criticos > 0) {
            setTotalCriticos(data.criticos)
            setMostrar(true)
          }
        }
        // Se retornar 401/403, simplesmente não mostra o alerta (usuário pode não ter permissão)
      } catch (error) {
        // Erro de rede - não bloqueia a aplicação, apenas não mostra o alerta
        console.warn('[AlertaDivergencias] Erro ao verificar divergências:', error)
      } finally {
        setCarregando(false)
      }
    }

    verificarDivergencias()
  }, [tipoUsuario])

  const fecharAlerta = () => {
    setMostrar(false)
    sessionStorage.setItem('alerta_divergencias_fechado', 'true')
  }

  if (carregando || !mostrar || totalCriticos === 0) {
    return null
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 lg:left-64">
      <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 mt-2">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Atenção: {totalCriticos} divergência{totalCriticos > 1 ? 's' : ''} crítica{totalCriticos > 1 ? 's' : ''} encontrada{totalCriticos > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Existem problemas de integridade de dados que precisam de atenção imediata.
              </p>
              <div className="mt-3">
                <Link
                  href="/admin/divergencias"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                  onClick={fecharAlerta}
                >
                  Ver Divergências
                </Link>
              </div>
            </div>
            <button
              onClick={fecharAlerta}
              className="flex-shrink-0 p-1 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              title="Fechar alerta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
