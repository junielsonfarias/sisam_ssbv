'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import { useEffect, useState, useMemo } from 'react'
import { Filter, X, MapPin, TrendingUp, BarChart3, Users, Target, BookOpen, School } from 'lucide-react'

interface DadosComparativoPolo {
  polo_id: string
  polo_nome: string
  serie: string
  turma_id: string | null
  turma_codigo: string | null
  total_alunos: number
  alunos_presentes: number
  total_escolas?: number
  total_turmas?: number
  media_geral: number | string
  media_lp: number | string
  media_ch: number | string
  media_mat: number | string
  media_cn: number | string
  media_acertos_lp: number | string
  media_acertos_ch: number | string
  media_acertos_mat: number | string
  media_acertos_cn: number | string
}

export default function ComparativosPolosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [polos, setPolos] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [polosSelecionados, setPolosSelecionados] = useState<string[]>([])
  const [filtros, setFiltros] = useState({
    ano_letivo: '',
    serie: '',
    turma_id: '',
  })
  const [dados, setDados] = useState<Record<string, DadosComparativoPolo[]>>({})
  const [dadosAgregados, setDadosAgregados] = useState<Record<string, DadosComparativoPolo[]>>({})
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const carregarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
        }
      } catch (error) {
        console.error('Erro ao carregar tipo de usuário:', error)
      }
    }
    carregarTipoUsuario()
    carregarDadosIniciais()
  }, [])

  useEffect(() => {
    carregarComparativos()
  }, [polosSelecionados, filtros])

  const carregarDadosIniciais = async () => {
    try {
      const polosRes = await fetch('/api/admin/polos')
      const polosData = await polosRes.json()
      setPolos(polosData)
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const carregarComparativos = async () => {
    if (polosSelecionados.length !== 2) {
      setDados({})
      return
    }

    setCarregando(true)
    try {
      const params = new URLSearchParams()
      params.append('polos_ids', polosSelecionados.join(','))
      
      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }
      
      if (filtros.serie) {
        params.append('serie', filtros.serie)
      }
      
      if (filtros.turma_id) {
        params.append('turma_id', filtros.turma_id)
      }

      const response = await fetch(`/api/admin/comparativos-polos?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setDados(data.dadosPorSerie || {})
        setDadosAgregados(data.dadosPorSerieAgregado || {})
        
        // Extrair séries únicas
        const seriesUnicas = [...new Set(Object.values(data.dadosPorSerie || {}).flat().map((d: any) => d.serie).filter(Boolean))] as string[]
        setSeries(seriesUnicas.sort())
      } else {
        console.error('Erro na API:', data.mensagem)
        setDados({})
      }
    } catch (error) {
      console.error('Erro ao carregar comparativos:', error)
      setDados({})
    } finally {
      setCarregando(false)
    }
  }

  const togglePolo = (poloId: string) => {
    setPolosSelecionados((prev) => {
      if (prev.includes(poloId)) {
        return prev.filter((id) => id !== poloId)
      }
      if (prev.length >= 2) {
        // Se já tem 2, substituir o primeiro
        return [prev[1], poloId]
      }
      return [...prev, poloId]
    })
  }

  const limparFiltros = () => {
    setPolosSelecionados([])
    setFiltros({
      ano_letivo: '',
      serie: '',
      turma_id: '',
    })
  }

  const formatarNumero = (valor: number | string | null): string => {
    if (valor === null || valor === undefined) return '-'
    const num = typeof valor === 'string' ? parseFloat(valor) : valor
    if (isNaN(num)) return '-'
    return num.toFixed(1)
  }

  const getNotaColor = (nota: number | string | null) => {
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (num === null || isNaN(num)) return 'text-gray-500'
    if (num >= 7) return 'text-green-600 font-semibold'
    if (num >= 5) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  const nomesPolos = useMemo(() => {
    return polosSelecionados.map(id => polos.find(p => p.id === id)?.nome || id)
  }, [polosSelecionados, polos])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Comparativo entre Polos</h1>
              <p className="text-gray-600 mt-1">Compare o desempenho entre 2 polos, séries e turmas</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-800">Filtros de Comparação</h2>
              </div>
              {(polosSelecionados.length > 0 || filtros.serie) && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo (opcional)
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, ano_letivo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="Ex: 2026 (deixe vazio para todos)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Série
                </label>
                <select
                  value={filtros.serie}
                  onChange={(e) => {
                    setFiltros((prev) => ({ ...prev, serie: e.target.value, turma_id: '' }))
                  }}
                  className="select-custom w-full"
                >
                  <option value="">Todas as séries</option>
                  {series.map((serie) => (
                    <option key={serie} value={serie}>
                      {serie}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seleção de Polos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar 2 Polos para Comparar ({polosSelecionados.length}/2 selecionados)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {polos.map((polo) => {
                    const selecionado = polosSelecionados.includes(polo.id)
                    const desabilitado = !selecionado && polosSelecionados.length >= 2
                    return (
                      <label
                        key={polo.id}
                        className={`flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded ${desabilitado ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => !desabilitado && togglePolo(polo.id)}
                          disabled={desabilitado}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{polo.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Resultados */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Carregando comparativos...</p>
            </div>
          ) : Object.keys(dados).length > 0 ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600">Polos comparados</p>
                      <p className="text-2xl font-bold text-indigo-900">{nomesPolos.join(' vs ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600">Séries analisadas</p>
                      <p className="text-2xl font-bold text-indigo-900">{Object.keys(dados).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparativos por Série */}
              {Object.entries(dadosAgregados).map(([serie, dadosSerie]) => {
                return (
                  <div key={serie} className="space-y-4">
                    {/* Seção: Dados Agregados por Polo/Série */}
                    {dadosSerie.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200">
                          <h3 className="text-xl font-bold text-indigo-900 flex items-center">
                            <MapPin className="w-5 h-5 mr-2" />
                            {serie} - Resumo Geral por Polo
                          </h3>
                          <p className="text-sm text-indigo-700 mt-1">
                            Dados consolidados de todas as turmas desta série
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[800px]">
                            <thead className="bg-indigo-50">
                              <tr>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[200px]">Polo</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[100px]">Escolas</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[100px]">Turmas</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[100px]">Total Alunos</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[120px]">Presentes</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[100px]">LP</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[100px]">CH</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[100px]">MAT</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[100px]">CN</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm uppercase whitespace-nowrap min-w-[120px]">Média Geral</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {dadosSerie.map((item, index) => (
                                <tr key={`agregado-${item.polo_id}-${item.serie}-${index}`} className="hover:bg-indigo-50 bg-indigo-50/30">
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                                      <span className="font-bold text-gray-900 text-sm">{item.polo_nome}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 font-semibold text-xs">
                                      {item.total_escolas || 0} escola(s)
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-semibold text-xs">
                                      {item.total_turmas || 0} turma(s)
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <span className="text-gray-700 font-bold text-sm">{item.total_alunos}</span>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <span className="text-gray-700 font-medium text-sm">
                                      {item.alunos_presentes} ({item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : 0}%)
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_lp)}/20</span>
                                      <span className={`text-sm font-bold ${getNotaColor(item.media_lp)}`}>
                                        {formatarNumero(item.media_lp)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_ch)}/10</span>
                                      <span className={`text-sm font-bold ${getNotaColor(item.media_ch)}`}>
                                        {formatarNumero(item.media_ch)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_mat)}/20</span>
                                      <span className={`text-sm font-bold ${getNotaColor(item.media_mat)}`}>
                                        {formatarNumero(item.media_mat)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500">{formatarNumero(item.media_acertos_cn)}/10</span>
                                      <span className={`text-sm font-bold ${getNotaColor(item.media_cn)}`}>
                                        {formatarNumero(item.media_cn)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className={`inline-flex items-center justify-center px-3 py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50' : 'bg-red-50'}`}>
                                      <span className={`text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                                        {formatarNumero(item.media_geral)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">
                {polosSelecionados.length !== 2
                  ? 'Selecione exatamente 2 polos para comparar'
                  : 'Nenhum dado encontrado'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {polosSelecionados.length !== 2
                  ? 'Escolha 2 polos e configure os filtros'
                  : 'Verifique se há dados para os polos selecionados no ano letivo informado'}
              </p>
            </div>
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

