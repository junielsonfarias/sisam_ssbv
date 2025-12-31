'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'

export default function EscolaDashboard() {
  const [estatisticas, setEstatisticas] = useState({
    totalResultados: 0,
    taxaAcertos: 0,
  })

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        const response = await fetch('/api/escola/estatisticas')
        const data = await response.json()
        if (data) {
          setEstatisticas(data)
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      }
    }
    carregarEstatisticas()
  }, [])

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <LayoutDashboard tipoUsuario="escola">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Escola</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Taxa de Acertos</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {estatisticas.taxaAcertos.toFixed(2)}%
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total de Resultados</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {estatisticas.totalResultados.toLocaleString('pt-BR')}
                  </p>
                </div>
                <BarChart3 className="w-12 h-12 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

