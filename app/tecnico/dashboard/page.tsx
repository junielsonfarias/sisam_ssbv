'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { BarChart3, Upload, School } from 'lucide-react'

export default function TecnicoDashboard() {
  const [estatisticas, setEstatisticas] = useState({
    totalEscolas: 0,
    totalPolos: 0,
    totalResultados: 0,
  })

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        const response = await fetch('/api/tecnico/estatisticas')
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
    <ProtectedRoute tiposPermitidos={['tecnico']}>
      <LayoutDashboard tipoUsuario="tecnico">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Técnico</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total de Escolas</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalEscolas}</p>
                </div>
                <School className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total de Polos</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalPolos}</p>
                </div>
                <BarChart3 className="w-12 h-12 text-blue-600" />
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
                <Upload className="w-12 h-12 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

