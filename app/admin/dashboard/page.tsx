'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { Users, School, MapPin, FileText, BarChart3, GraduationCap, BookOpen, TrendingUp, CheckCircle, XCircle } from 'lucide-react'

export default function AdminDashboard() {
  const [estatisticas, setEstatisticas] = useState({
    totalUsuarios: 0,
    totalEscolas: 0,
    totalPolos: 0,
    totalQuestoes: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalTurmas: 0,
    totalAlunosPresentes: 0,
    totalAlunosFaltantes: 0,
    mediaGeral: 0,
    taxaAprovacao: 0,
  })

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        // Adicionar timestamp para evitar cache
        const response = await fetch(`/api/admin/estatisticas?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        })
        
        if (!response.ok) {
          console.error('Erro ao buscar estatísticas:', response.status, response.statusText)
          // Manter valores padrão (0) em caso de erro
          return
        }
        
        const data = await response.json()
        if (data) {
          // Garantir que todos os valores são números válidos
          setEstatisticas({
            totalUsuarios: Number(data.totalUsuarios) || 0,
            totalEscolas: Number(data.totalEscolas) || 0,
            totalPolos: Number(data.totalPolos) || 0,
            totalQuestoes: Number(data.totalQuestoes) || 0,
            totalResultados: Number(data.totalResultados) || 0,
            totalAlunos: Number(data.totalAlunos) || 0,
            totalTurmas: Number(data.totalTurmas) || 0,
            totalAlunosPresentes: Number(data.totalAlunosPresentes) || 0,
            totalAlunosFaltantes: Number(data.totalAlunosFaltantes) || 0,
            mediaGeral: Number(data.mediaGeral) || 0,
            taxaAprovacao: Number(data.taxaAprovacao) || 0,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
        // Manter valores padrão (0) em caso de erro
      }
    }
    carregarEstatisticas()
  }, [])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario="admin">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Dashboard Administrativo</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Usuários</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalUsuarios}</p>
                </div>
                <Users className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Escolas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalEscolas}</p>
                </div>
                <School className="w-8 h-8 sm:w-12 sm:h-12 text-green-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Polos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalPolos}</p>
                </div>
                <MapPin className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Questões</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalQuestoes}</p>
                </div>
                <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-purple-600 flex-shrink-0" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-cyan-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Alunos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalAlunos.toLocaleString('pt-BR')}</p>
                </div>
                <GraduationCap className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm">Total de Turmas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">{estatisticas.totalTurmas}</p>
                </div>
                <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 text-orange-600 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm">Resultados de Provas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">
                    {estatisticas.totalResultados.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{estatisticas.totalAlunos > 0 ? `${estatisticas.totalAlunos.toLocaleString('pt-BR')} alunos` : 'Sem alunos'}</p>
                </div>
                <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600 flex-shrink-0" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-lg shadow-md border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-700 text-xs sm:text-sm font-medium">Taxa de Aprovação</p>
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">
                {estatisticas.taxaAprovacao > 0 ? `${estatisticas.taxaAprovacao.toFixed(1)}%` : '-'}
              </p>
              {estatisticas.taxaAprovacao > 0 && (
                <p className="text-xs text-purple-600 mt-1">
                  {estatisticas.taxaAprovacao >= 70 ? 'Ótimo' : estatisticas.taxaAprovacao >= 50 ? 'Regular' : 'Atenção'}
                </p>
              )}
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

