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
        
        if (!response.ok) {
          console.error('Erro ao buscar estatísticas:', response.status, response.statusText)
          return
        }
        
        const data = await response.json()
        if (data) {
          setEstatisticas({
            totalEscolas: Number(data.totalEscolas) || 0,
            totalPolos: Number(data.totalPolos) || 0,
            totalResultados: Number(data.totalResultados) || 0,
          })
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
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8">Dashboard Técnico</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Escolas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{estatisticas.totalEscolas}</p>
                </div>
                <School className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Polos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{estatisticas.totalPolos}</p>
                </div>
                <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Resultados</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">
                    {(estatisticas.totalResultados || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

