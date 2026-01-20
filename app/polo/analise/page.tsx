'use client'

import ProtectedRoute from '@/components/protected-route'
import PainelAnalise from '@/components/painel-analise'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function PoloAnalisePage() {
  const [poloId, setPoloId] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario && data.usuario.polo_id) {
          setPoloId(data.usuario.polo_id)

          // Carregar nome do polo
          const poloRes = await fetch(`/api/admin/polos?id=${data.usuario.polo_id}`)
          const poloData = await poloRes.json()
          if (Array.isArray(poloData) && poloData.length > 0) {
            setPoloNome(poloData[0].nome)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error)
      } finally {
        setCarregando(false)
      }
    }
    carregarDadosIniciais()
  }, [])

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['polo']}>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600 dark:text-gray-400">Carregando dados do polo...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!poloId) {
    return (
      <ProtectedRoute tiposPermitidos={['polo']}>
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
            Erro: Polo nao encontrado para o usuario.
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['polo']}>
      <PainelAnalise
        tipoUsuario="polo"
        titulo="Resultados Consolidados"
        subtitulo={`Polo ${poloNome} - Todas as Escolas`}
        resultadosEndpoint="/api/admin/resultados-consolidados"
        escolasEndpoint="/api/polo/escolas"
        turmasEndpoint="/api/admin/turmas"
        mostrarFiltroPolo={false}
        mostrarFiltroEscola={true}
        poloIdFixo={poloId}
      />
    </ProtectedRoute>
  )
}
