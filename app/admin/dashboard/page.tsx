'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { School, MapPin, BarChart3, GraduationCap, TrendingUp, CheckCircle, XCircle, BookOpen } from 'lucide-react'

export default function AdminDashboard() {
  const [estatisticas, setEstatisticas] = useState({
    totalEscolas: 0,
    totalPolos: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalTurmas: 0,
    totalAlunosPresentes: 0,
    totalAlunosFaltantes: 0,
    mediaGeral: 0,
  })

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        const response = await fetch(`/api/admin/estatisticas?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        })

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
            totalAlunos: Number(data.totalAlunos) || 0,
            totalTurmas: Number(data.totalTurmas) || 0,
            totalAlunosPresentes: Number(data.totalAlunosPresentes) || 0,
            totalAlunosFaltantes: Number(data.totalAlunosFaltantes) || 0,
            mediaGeral: Number(data.mediaGeral) || 0,
          })
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
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8">Dashboard Administrativo</h1>

          {/* Primeira linha: Escolas, Polos, Alunos, Turmas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Escolas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{estatisticas.totalEscolas}</p>
                </div>
                <School className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Polos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{estatisticas.totalPolos}</p>
                </div>
                <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-cyan-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Alunos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">
                    {estatisticas.totalAlunos.toLocaleString('pt-BR')}
                  </p>
                </div>
                <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-600 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Turmas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{estatisticas.totalTurmas}</p>
                </div>
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>

          {/* Segunda linha: Resultados, Presentes, Faltantes, Média */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs sm:text-sm">Resultados de Provas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">
                    {estatisticas.totalResultados.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{estatisticas.totalAlunos > 0 ? `${estatisticas.totalAlunos.toLocaleString('pt-BR')} alunos` : 'Sem alunos'}</p>
                </div>
                <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg shadow-md border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-700 text-xs sm:text-sm font-medium">Alunos Presentes</p>
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-green-700">{estatisticas.totalAlunosPresentes.toLocaleString('pt-BR')}</p>
              {estatisticas.totalAlunos > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {((estatisticas.totalAlunosPresentes / estatisticas.totalAlunos) * 100).toFixed(1)}% do total
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-lg shadow-md border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-700 text-xs sm:text-sm font-medium">Alunos Faltantes</p>
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-red-700">{estatisticas.totalAlunosFaltantes.toLocaleString('pt-BR')}</p>
              {estatisticas.totalAlunos > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {((estatisticas.totalAlunosFaltantes / estatisticas.totalAlunos) * 100).toFixed(1)}% do total
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg shadow-md border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-700 text-xs sm:text-sm font-medium">Média Geral</p>
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">
                {estatisticas.mediaGeral > 0 ? estatisticas.mediaGeral.toFixed(1) : '-'}
              </p>
              {estatisticas.mediaGeral > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {estatisticas.mediaGeral >= 7 ? 'Excelente' : estatisticas.mediaGeral >= 5 ? 'Bom' : 'Abaixo da média'}
                </p>
              )}
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
