'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Filter, BarChart3, TrendingUp, WifiOff } from 'lucide-react'
import { FiltrosAnalise } from '@/lib/types'
import * as offlineStorage from '@/lib/offline-storage'

export default function AnalisePage() {
  const [filtros, setFiltros] = useState<FiltrosAnalise>({})
  const [escolas, setEscolas] = useState<any[]>([])
  const [polos, setPolos] = useState<any[]>([])
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [modoOffline, setModoOffline] = useState(false)

  useEffect(() => {
    // Verificar se está offline
    const online = offlineStorage.isOnline()
    setModoOffline(!online)

    if (online) {
      carregarDadosIniciais()
    }
  }, [])

  const carregarDadosIniciais = async () => {
    try {
      const [escolasRes, polosRes] = await Promise.all([
        fetch('/api/admin/escolas'),
        fetch('/api/admin/polos'),
      ])
      const escolasData = await escolasRes.json()
      const polosData = await polosRes.json()
      setEscolas(escolasData)
      setPolos(polosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

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
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <LayoutDashboard tipoUsuario="admin">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-6 sm:mb-8">Análise de Dados</h1>

          {/* Aviso de modo offline */}
          {modoOffline && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-shrink-0">
                  <WifiOff className="w-12 h-12 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Análise de Dados Indisponível Offline
                  </h2>
                  <p className="text-amber-700 dark:text-amber-300">
                    Esta funcionalidade requer análise detalhada de questões e respostas que não estão disponíveis no modo offline.
                    Por favor, conecte-se à internet para acessar a análise completa.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filtros - apenas quando online */}
          {!modoOffline && (
          <>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center mb-3 sm:mb-4">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-white">Filtros</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Polo
                </label>
                <select
                  value={filtros.polo_id || ''}
                  onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                >
                  <option value="">Todos os polos</option>
                  {polos.map((polo) => (
                    <option key={polo.id} value={polo.id}>
                      {polo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Escola
                </label>
                <select
                  value={filtros.escola_id || ''}
                  onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
                  className="select-custom w-full text-sm sm:text-base"
                >
                  <option value="">Todas as escolas</option>
                  {escolas
                    .filter((e) => !filtros.polo_id || e.polo_id === filtros.polo_id)
                    .map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {escola.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Ex: 2024"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Disciplina
                </label>
                <input
                  type="text"
                  value={filtros.disciplina || ''}
                  onChange={(e) => handleFiltroChange('disciplina', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Ex: Matemática"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Taxa de Acertos Mínima (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filtros.taxa_acertos_min || ''}
                  onChange={(e) => handleFiltroChange('taxa_acertos_min', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Taxa de Acertos Máxima (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filtros.taxa_acertos_max || ''}
                  onChange={(e) => handleFiltroChange('taxa_acertos_max', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleBuscar}
              disabled={carregando}
              className="mt-3 sm:mt-4 w-full sm:w-auto bg-indigo-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
            >
              {carregando ? 'Buscando...' : 'Aplicar Filtros'}
            </button>
          </div>

          {/* Resultados */}
          {dados && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Taxa de Acertos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">
                      {dados.taxaAcertos?.toFixed(2) || 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-green-600 flex-shrink-0" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Total de Questões</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">
                      {dados.totalQuestoes || 0}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600 flex-shrink-0" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Total de Alunos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">
                      {dados.totalAlunos || 0}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 flex-shrink-0" />
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

