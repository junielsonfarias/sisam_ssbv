'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Filter, BarChart3, TrendingUp } from 'lucide-react'
import { FiltrosAnalise } from '@/lib/types'

export default function EscolaAnalisePage() {
  const [filtros, setFiltros] = useState<FiltrosAnalise>({})
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)

  const handleFiltroChange = (campo: keyof FiltrosAnalise, valor: string) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor || undefined,
    }))
  }

  const handleBuscar = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/analise/dados?${params.toString()}`)
      const data = await response.json()
      setDados(data)
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <LayoutDashboard tipoUsuario="escola">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Análise de Dados</h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 mr-2 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">Filtros</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <input
                  type="text"
                  value={filtros.disciplina || ''}
                  onChange={(e) => handleFiltroChange('disciplina', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Matemática"
                />
              </div>
            </div>

            <button
              onClick={handleBuscar}
              disabled={carregando}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Buscando...' : 'Aplicar Filtros'}
            </button>
          </div>

          {dados && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Taxa de Acertos</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {dados.taxaAcertos?.toFixed(2) || 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total de Questões</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {dados.totalQuestoes || 0}
                    </p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-indigo-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total de Alunos</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                      {dados.totalAlunos || 0}
                    </p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-blue-600" />
                </div>
              </div>
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

