'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import LayoutDashboard from '@/components/layout-dashboard'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  Users,
  Calendar,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'

// Importar Recharts dinamicamente para evitar erro de SSR
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

// Componentes filhos importados diretamente
import { Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface LogAcesso {
  id: string
  usuario_id: string
  usuario_nome: string
  email: string
  tipo_usuario: string
  ip_address: string
  user_agent: string
  criado_em: string
}

interface EstatisticasPorDia {
  data: string
  total_logins: number
  usuarios_unicos: number
}

interface EstatisticasPorTipo {
  tipo_usuario: string
  total: number
}

interface Totalizadores {
  loginsHoje: number
  logins7Dias: number
  logins30Dias: number
  usuariosUnicos30Dias: number
  totalGeral: number
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export default function LogsAcessoPage() {
  const [logs, setLogs] = useState<LogAcesso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0
  })
  const [estatisticasPorDia, setEstatisticasPorDia] = useState<EstatisticasPorDia[]>([])
  const [estatisticasPorTipo, setEstatisticasPorTipo] = useState<EstatisticasPorTipo[]>([])
  const [totalizadores, setTotalizadores] = useState<Totalizadores>({
    loginsHoje: 0,
    logins7Dias: 0,
    logins30Dias: 0,
    usuariosUnicos30Dias: 0,
    totalGeral: 0
  })

  // Filtros
  const [filtroEmail, setFiltroEmail] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  const carregarLogs = useCallback(async (pagina = 1) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      params.set('pagina', pagina.toString())
      params.set('limite', '50')

      if (filtroEmail) params.set('email', filtroEmail)
      if (filtroTipo) params.set('tipoUsuario', filtroTipo)
      if (filtroDataInicio) params.set('dataInicio', filtroDataInicio)
      if (filtroDataFim) params.set('dataFim', filtroDataFim)

      const response = await fetch(`/api/admin/logs-acesso?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setLogs(data.logs || [])
        setPaginacao(data.paginacao || { pagina: 1, limite: 50, total: 0, totalPaginas: 0 })
        setEstatisticasPorDia(data.estatisticas?.porDia || [])
        setEstatisticasPorTipo(data.estatisticas?.porTipo || [])
        setTotalizadores(data.estatisticas?.totalizadores || {
          loginsHoje: 0,
          logins7Dias: 0,
          logins30Dias: 0,
          usuariosUnicos30Dias: 0,
          totalGeral: 0
        })
      } else {
        console.error('Erro ao carregar logs:', data.mensagem)
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    } finally {
      setCarregando(false)
    }
  }, [filtroEmail, filtroTipo, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    carregarLogs()
  }, [carregarLogs])

  const handlePesquisar = () => {
    carregarLogs(1)
  }

  const handleLimparFiltros = () => {
    setFiltroEmail('')
    setFiltroTipo('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
  }

  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatarDataCurta = (dataISO: string) => {
    const data = new Date(dataISO)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const formatarTipoUsuario = (tipo: string) => {
    const tipos: Record<string, string> = {
      administrador: 'Administrador',
      tecnico: 'Tecnico',
      polo: 'Polo',
      escola: 'Escola'
    }
    return tipos[tipo] || tipo
  }

  const corTipoUsuario = (tipo: string) => {
    const cores: Record<string, string> = {
      administrador: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      tecnico: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      polo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      escola: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    }
    return cores[tipo] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  // Preparar dados do grafico (inverter para mostrar do mais antigo ao mais recente)
  const dadosGrafico = [...estatisticasPorDia]
    .reverse()
    .map(item => ({
      data: formatarDataCurta(item.data),
      logins: Number(item.total_logins),
      usuarios: Number(item.usuarios_unicos)
    }))

  // Cores para grafico de tipos
  const coresTipos: Record<string, string> = {
    administrador: '#8B5CF6',
    tecnico: '#3B82F6',
    polo: '#10B981',
    escola: '#F59E0B'
  }

  const dadosGraficoTipos = estatisticasPorTipo.map(item => ({
    tipo: formatarTipoUsuario(item.tipo_usuario),
    total: Number(item.total),
    fill: coresTipos[item.tipo_usuario] || '#6B7280'
  }))

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
      <LayoutDashboard tipoUsuario="admin">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Logs de Acesso
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Acompanhe os logins dos usuarios no sistema
              </p>
            </div>
            <button
              onClick={() => carregarLogs(paginacao.pagina)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Cards de Estatisticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Logins Hoje</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalizadores.loginsHoje}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ultimos 7 Dias</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalizadores.logins7Dias}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ultimos 30 Dias</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalizadores.logins30Dias}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios Unicos (30d)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalizadores.usuariosUnicos30Dias}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Grafico de Linha - Logins por Dia */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Logins por Dia (Ultimos 30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {dadosGrafico.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis
                          dataKey="data"
                          tick={{ fontSize: 12 }}
                          className="text-gray-600 dark:text-gray-400"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          className="text-gray-600 dark:text-gray-400"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--tooltip-bg, #fff)',
                            border: '1px solid var(--tooltip-border, #e5e7eb)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="logins"
                          stroke="#4F46E5"
                          strokeWidth={2}
                          dot={{ fill: '#4F46E5', strokeWidth: 2 }}
                          name="Total de Logins"
                        />
                        <Line
                          type="monotone"
                          dataKey="usuarios"
                          stroke="#10B981"
                          strokeWidth={2}
                          dot={{ fill: '#10B981', strokeWidth: 2 }}
                          name="Usuarios Unicos"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Sem dados para exibir
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Grafico de Barras - Por Tipo de Usuario */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logins por Tipo (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {dadosGraficoTipos.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGraficoTipos} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="tipo" type="category" tick={{ fontSize: 12 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Sem dados para exibir
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    value={filtroEmail}
                    onChange={(e) => setFiltroEmail(e.target.value)}
                    placeholder="Buscar por email..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Usuario
                  </label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="administrador">Administrador</option>
                    <option value="tecnico">Tecnico</option>
                    <option value="polo">Polo</option>
                    <option value="escola">Escola</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Inicio
                  </label>
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handlePesquisar}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Pesquisar
                  </button>
                  <button
                    onClick={handleLimparFiltros}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Historico de Logins</span>
                <span className="text-sm font-normal text-gray-500">
                  {paginacao.total} registro(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nenhum log de acesso encontrado
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Data/Hora
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Usuario
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            IP
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        {logs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              {formatarData(log.criado_em)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {log.usuario_nome || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {log.email}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${corTipoUsuario(log.tipo_usuario)}`}>
                                {formatarTipoUsuario(log.tipo_usuario)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {log.ip_address || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginacao */}
                  {paginacao.totalPaginas > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Pagina {paginacao.pagina} de {paginacao.totalPaginas}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => carregarLogs(paginacao.pagina - 1)}
                          disabled={paginacao.pagina <= 1}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => carregarLogs(paginacao.pagina + 1)}
                          disabled={paginacao.pagina >= paginacao.totalPaginas}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}
