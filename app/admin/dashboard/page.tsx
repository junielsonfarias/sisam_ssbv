'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Users, School, MapPin, FileText, BarChart3 } from 'lucide-react'

export default function AdminDashboard() {
  const [estatisticas, setEstatisticas] = useState({
    totalUsuarios: 0,
    totalEscolas: 0,
    totalPolos: 0,
    totalQuestoes: 0,
    totalResultados: 0,
  })

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        const response = await fetch('/api/admin/estatisticas')
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
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario="admin">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Administrativo</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total de Usuários</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalUsuarios}</p>
                </div>
                <Users className="w-12 h-12 text-indigo-600" />
              </div>
            </div>

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
                <MapPin className="w-12 h-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total de Questões</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalQuestoes}</p>
                </div>
                <FileText className="w-12 h-12 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Resultados de Provas</h2>
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{estatisticas.totalResultados.toLocaleString('pt-BR')}</p>
            <p className="text-gray-600 text-sm mt-2">Total de registros de resultados</p>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

