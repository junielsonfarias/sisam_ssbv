'use client'

import ProtectedRoute from '@/components/protected-route'
import PainelAnalise from '@/components/painel-analise'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function EscolaResultadosPage() {
  const [escolaId, setEscolaId] = useState<string>('')
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()

    const carregarDadosIniciais = async () => {
      try {
        const response = await fetch('/api/auth/verificar', { signal: abortController.signal })
        const data = await response.json()
        if (data.usuario && data.usuario.escola_id) {
          setEscolaId(data.usuario.escola_id)

          // Carregar nome da escola e polo
          const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`, { signal: abortController.signal })
          const escolaData = await escolaRes.json()
          if (Array.isArray(escolaData) && escolaData.length > 0) {
            setEscolaNome(escolaData[0].nome)
            setPoloNome(escolaData[0].polo_nome || '')
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Erro ao carregar dados iniciais:', error)
        }
      } finally {
        setCarregando(false)
      }
    }
    carregarDadosIniciais()

    return () => {
      abortController.abort()
    }
  }, [])

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['escola']}>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600 dark:text-gray-400">Carregando dados da escola...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!escolaId) {
    return (
      <ProtectedRoute tiposPermitidos={['escola']}>
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
            Erro: Escola nao encontrada para o usuario.
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const subtitulo = poloNome
    ? `${escolaNome} - Polo ${poloNome}`
    : escolaNome

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <PainelAnalise
        tipoUsuario="escola"
        titulo="Resultados Consolidados"
        subtitulo={subtitulo}
        resultadosEndpoint="/api/admin/resultados-consolidados"
        turmasEndpoint="/api/admin/turmas"
        mostrarFiltroPolo={false}
        mostrarFiltroEscola={false}
        escolaIdFixo={escolaId}
      />
    </ProtectedRoute>
  )
}
