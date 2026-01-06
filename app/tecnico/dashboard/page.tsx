'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState } from 'react'
import { BarChart3, Upload, School, GraduationCap, TrendingUp } from 'lucide-react'

export default function TecnicoDashboard() {
  const [estatisticas, setEstatisticas] = useState({
    totalEscolas: 0,
    totalPolos: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalAlunosPresentes: 0,
    mediaGeral: 0,
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
            totalAlunos: Number(data.totalAlunos) || 0,
            totalAlunosPresentes: Number(data.totalAlunosPresentes) || 0,
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
    <ProtectedRoute tiposPermitidos={['tecnico']}>
      <LayoutDashboard tipoUsuario="tecnico">
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6 md:mb-8">Dashboard Técnico</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-slate-900/50 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total de Escolas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1 sm:mt-2">{estatisticas.totalEscolas}</p>
                </div>
                <School className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-slate-900/50 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total de Polos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1 sm:mt-2">{estatisticas.totalPolos}</p>
                </div>
                <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-slate-900/50 border-l-4 border-cyan-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total de Alunos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1 sm:mt-2">
                    {estatisticas.totalAlunos.toLocaleString('pt-BR')}
                  </p>
                </div>
                <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-600 dark:text-cyan-400 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-slate-900/50 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Resultados de Provas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1 sm:mt-2">
                    {estatisticas.totalResultados.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{estatisticas.totalAlunos > 0 ? `${estatisticas.totalAlunos.toLocaleString('pt-BR')} alunos` : 'Sem alunos'}</p>
                </div>
                <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-slate-900/50 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Alunos Presentes</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1 sm:mt-2">
                    {estatisticas.totalAlunosPresentes.toLocaleString('pt-BR')}
                  </p>
                  {estatisticas.totalAlunos > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {((estatisticas.totalAlunosPresentes / estatisticas.totalAlunos) * 100).toFixed(1)}% do total
                    </p>
                  )}
                </div>
                <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md dark:shadow-slate-900/50 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Média Geral</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1 sm:mt-2">
                    {estatisticas.mediaGeral > 0 ? estatisticas.mediaGeral.toFixed(1) : '-'}
                  </p>
                  {estatisticas.mediaGeral > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {estatisticas.mediaGeral >= 7 ? 'Excelente' : estatisticas.mediaGeral >= 5 ? 'Bom' : 'Abaixo da média'}
                    </p>
                  )}
                </div>
                <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

