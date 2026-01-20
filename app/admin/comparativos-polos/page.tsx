'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import { Filter, X, MapPin, TrendingUp, BarChart3, Users, Target, BookOpen, School, Printer } from 'lucide-react'
import { useUserType } from '@/lib/hooks/useUserType'

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
  media_producao?: number | string
  media_acertos_lp: number | string
  media_acertos_ch: number | string
  media_acertos_mat: number | string
  media_acertos_cn: number | string
}

interface DadosComparativoEscola extends DadosComparativoPolo {
  escola_id: string
  escola_nome: string
}

export default function ComparativosPolosPage() {
  const { tipoUsuario } = useUserType()
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [polosSelecionados, setPolosSelecionados] = useState<string[]>([])
  const [filtros, setFiltros] = useState({
    ano_letivo: '',
    serie: '',
    escola_id: '',
    turma_id: '',
  })
  const [dados, setDados] = useState<Record<string, DadosComparativoPolo[]>>({})
  const [dadosAgregados, setDadosAgregados] = useState<Record<string, DadosComparativoPolo[]>>({})
  const [dadosPorSerieEscola, setDadosPorSerieEscola] = useState<Record<string, Record<string, DadosComparativoEscola[]>>>({})
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  useEffect(() => {
    carregarEscolas()
  }, [polosSelecionados])

  useEffect(() => {
    carregarTurmas()
  }, [filtros.serie, filtros.escola_id, polosSelecionados, filtros.ano_letivo])

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

  const carregarEscolas = async () => {
    if (polosSelecionados.length === 0) {
      setEscolas([])
      return
    }

    try {
      const escolasFiltradas: any[] = []
      for (const poloId of polosSelecionados) {
        const response = await fetch(`/api/admin/escolas?polo_id=${poloId}`)
        const data = await response.json()
        if (Array.isArray(data)) {
          escolasFiltradas.push(...data)
        }
      }
      setEscolas([...new Map(escolasFiltradas.map(e => [e.id, e])).values()])
    } catch (error) {
      console.error('Erro ao carregar escolas:', error)
      setEscolas([])
    }
  }

  const carregarTurmas = async () => {
    if (!filtros.serie || !filtros.escola_id) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('serie', filtros.serie)
      params.append('escolas_ids', filtros.escola_id)
      
      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      const response = await fetch(`/api/admin/turmas?${params.toString()}`)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        setTurmas(data)
      } else {
        setTurmas([])
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
      setTurmas([])
    }
  }

  const carregarComparativos = async () => {
    if (polosSelecionados.length !== 2) {
      setDados({})
      setDadosAgregados({})
      setDadosPorSerieEscola({})
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

      if (filtros.escola_id && filtros.escola_id !== 'todas' && filtros.escola_id !== '') {
        params.append('escola_id', filtros.escola_id)
      }
      
      if (filtros.turma_id) {
        params.append('turma_id', filtros.turma_id)
      }

      const response = await fetch(`/api/admin/comparativos-polos?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setDados(data.dadosPorSerie || {})
        setDadosAgregados(data.dadosPorSerieAgregado || {})
        setDadosPorSerieEscola(data.dadosPorSerieEscola || {})
        
        // Extrair séries únicas
        const seriesUnicas = [...new Set(Object.values(data.dadosPorSerie || {}).flat().map((d: any) => d.serie).filter(Boolean))] as string[]
        setSeries(seriesUnicas.sort())
      } else {
        console.error('Erro na API:', data.mensagem)
        setDados({})
        setDadosAgregados({})
        setDadosPorSerieEscola({})
      }
    } catch (error) {
      console.error('Erro ao carregar comparativos:', error)
      setDados({})
      setDadosAgregados({})
      setDadosPorSerieEscola({})
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
    // Limpar escola quando polos mudam
    setFiltros((prev) => ({ ...prev, escola_id: '', turma_id: '' }))
  }

  const limparFiltros = () => {
    setPolosSelecionados([])
    setFiltros({
      ano_letivo: '',
      serie: '',
      escola_id: '',
      turma_id: '',
    })
  }

  const formatarNumero = (valor: number | string | null | undefined): string => {
    if (valor === null || valor === undefined) return '-'
    const num = typeof valor === 'string' ? parseFloat(valor) : valor
    if (isNaN(num)) return '-'
    return num.toFixed(2)
  }

  const getNotaColor = (nota: number | string | null | undefined) => {
    if (nota === null || nota === undefined) return 'text-gray-500'
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (isNaN(num)) return 'text-gray-500'
    if (num >= 7) return 'text-green-600 font-semibold'
    if (num >= 5) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  // Verifica se a série é de anos iniciais (2º, 3º, 5º)
  const isAnosIniciais = (serie: string | null | undefined): boolean => {
    if (!serie) return false
    const numeroSerie = serie.toString().replace(/[^0-9]/g, '')
    return ['2', '3', '5'].includes(numeroSerie)
  }

  // Função para calcular o nível baseado na média
  const calcularNivelPorMedia = (media: number | string | null | undefined): { codigo: string, nome: string, cor: string, bgColor: string } => {
    const num = typeof media === 'string' ? parseFloat(media) : media
    if (num === null || num === undefined || isNaN(num) || num <= 0) {
      return { codigo: '-', nome: 'Não classificado', cor: 'text-gray-500', bgColor: 'bg-gray-100' }
    }
    if (num < 3) {
      return { codigo: 'N1', nome: 'Insuficiente', cor: 'text-red-700', bgColor: 'bg-red-100' }
    }
    if (num < 5) {
      return { codigo: 'N2', nome: 'Básico', cor: 'text-yellow-700', bgColor: 'bg-yellow-100' }
    }
    if (num < 7.5) {
      return { codigo: 'N3', nome: 'Adequado', cor: 'text-blue-700', bgColor: 'bg-blue-100' }
    }
    return { codigo: 'N4', nome: 'Avançado', cor: 'text-green-700', bgColor: 'bg-green-100' }
  }

  // Função para imprimir a página
  const handlePrint = () => {
    window.print()
  }

  const nomesPolos = useMemo(() => {
    return polosSelecionados.map(id => polos.find(p => p.id === id)?.nome || id)
  }, [polosSelecionados, polos])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Comparativo entre Polos</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Compare o desempenho entre 2 polos, séries, escolas e turmas</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Filtros de Comparação</h2>
              </div>
              {(polosSelecionados.length > 0 || filtros.serie || filtros.escola_id) && (
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
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
                    setFiltros((prev) => ({ ...prev, serie: e.target.value, turma_id: '', escola_id: '' }))
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escola
                </label>
                <select
                  value={filtros.escola_id}
                  onChange={(e) => {
                    setFiltros((prev) => ({ ...prev, escola_id: e.target.value, turma_id: '' }))
                  }}
                  disabled={polosSelecionados.length !== 2 || !filtros.serie}
                  className="select-custom w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Todas as escolas</option>
                  {escolas.map((escola) => (
                    <option key={escola.id} value={escola.id}>
                      {escola.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma
                </label>
                <select
                  value={filtros.turma_id}
                  onChange={(e) => {
                    setFiltros((prev) => ({ ...prev, turma_id: e.target.value }))
                  }}
                  disabled={!filtros.escola_id || !filtros.serie || turmas.length === 0}
                  className="select-custom w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo || turma.nome || `Turma ${turma.id}`}
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
              <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white shadow-inner">
                {polos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum polo disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {polos.map((polo) => {
                      const selecionado = polosSelecionados.includes(polo.id)
                      const desabilitado = !selecionado && polosSelecionados.length >= 2
                      return (
                        <label
                          key={polo.id}
                          className={`
                            flex items-center space-x-3 cursor-pointer 
                            p-3 rounded-lg border-2 transition-all duration-200
                            ${selecionado
                              ? 'bg-indigo-50 border-indigo-500 shadow-md'
                              : desabilitado
                              ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30/50 hover:shadow-sm'
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => !desabilitado && togglePolo(polo.id)}
                            disabled={desabilitado}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className={`text-sm font-medium flex-1 ${selecionado ? 'text-indigo-900' : desabilitado ? 'text-gray-400' : 'text-gray-700'}`}>
                            {polo.nome}
                          </span>
                          {selecionado && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {polosSelecionados.indexOf(polo.id) + 1}º
                              </span>
                            </div>
                          )}
                          {desabilitado && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">(máx. 2)</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resultados */}
          {carregando ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Carregando comparativos...</p>
            </div>
          ) : Object.keys(dadosAgregados).length > 0 || Object.keys(dadosPorSerieEscola).length > 0 ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">Polos comparados</p>
                      <p className="text-xl sm:text-2xl font-bold text-indigo-900">{nomesPolos.join(' vs ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">Séries analisadas</p>
                      <p className="text-xl sm:text-2xl font-bold text-indigo-900">{Object.keys(dadosAgregados).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparativos por Série */}
              {Object.entries(dadosAgregados).map(([serie, dadosSerie]) => {
                const dadosEscolasPorPolo = dadosPorSerieEscola[serie] || {}
                
                return (
                  <div key={serie} className="space-y-4">
                    {/* Seção: Dados Agregados por Polo/Série */}
                    {dadosSerie.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-indigo-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 sm:px-6 py-4 border-b border-indigo-200">
                          <h3 className="text-lg sm:text-xl font-bold text-indigo-900 flex items-center">
                            <MapPin className="w-5 h-5 mr-2" />
                            {serie} - Resumo Geral por Polo
                          </h3>
                          <p className="text-sm text-indigo-700 mt-1">
                            Dados consolidados de todas as turmas desta série
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[400px] sm:min-w-[600px] lg:min-w-[800px]">
                            <thead className="bg-indigo-50">
                              <tr>
                                <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[150px] sm:min-w-[200px]">Polo</th>
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">Escolas</th>
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">Turmas</th>
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[90px] sm:min-w-[100px]">Total Alunos</th>
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Presentes</th>
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Faltantes</th>
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">LP</th>
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">MAT</th>
                                {isAnosIniciais(serie) ? (
                                  <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">PROD</th>
                                ) : (
                                  <>
                                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">CH</th>
                                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">CN</th>
                                  </>
                                )}
                                <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Média Geral</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                              {[...dadosSerie].sort((a, b) => {
                                const mediaA = typeof a.media_geral === 'string' ? parseFloat(a.media_geral) : (a.media_geral || 0)
                                const mediaB = typeof b.media_geral === 'string' ? parseFloat(b.media_geral) : (b.media_geral || 0)
                                return mediaB - mediaA
                              }).map((item, index) => {
                                const faltantes = item.total_alunos - item.alunos_presentes
                                const percentualFaltantes = item.total_alunos > 0 ? ((faltantes / item.total_alunos) * 100).toFixed(1) : '0.0'
                                const percentualPresentes = item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : '0.0'
                                return (
                                <tr key={`agregado-${item.polo_id}-${item.serie}-${index}`} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 bg-indigo-50/30">
                                  <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                                      <span className="font-bold text-gray-900 text-xs sm:text-sm">{item.polo_nome}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 font-semibold text-xs">
                                      {item.total_escolas || 0} escola(s)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold text-xs">
                                      {item.total_turmas || 0} turma(s)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <span className="text-gray-700 font-bold text-xs sm:text-sm">{item.total_alunos}</span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <span className="text-green-700 font-medium text-xs sm:text-sm">
                                      {item.alunos_presentes} ({percentualPresentes}%)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <span className={`font-medium text-xs sm:text-sm ${faltantes > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                      {faltantes} ({percentualFaltantes}%)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_lp)}`}>
                                        {formatarNumero(item.media_lp)}
                                      </span>
                                      {(() => {
                                        const nivel = calcularNivelPorMedia(item.media_lp)
                                        return nivel.codigo !== '-' ? (
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                            {nivel.codigo}
                                          </span>
                                        ) : null
                                      })()}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_mat)}`}>
                                        {formatarNumero(item.media_mat)}
                                      </span>
                                      {(() => {
                                        const nivel = calcularNivelPorMedia(item.media_mat)
                                        return nivel.codigo !== '-' ? (
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                            {nivel.codigo}
                                          </span>
                                        ) : null
                                      })()}
                                    </div>
                                  </td>
                                  {isAnosIniciais(serie) ? (
                                    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_producao)}`}>
                                          {formatarNumero(item.media_producao)}
                                        </span>
                                        {(() => {
                                          const nivel = calcularNivelPorMedia(item.media_producao)
                                          return nivel.codigo !== '-' ? (
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                              {nivel.codigo}
                                            </span>
                                          ) : null
                                        })()}
                                      </div>
                                    </td>
                                  ) : (
                                    <>
                                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_ch)}`}>
                                            {formatarNumero(item.media_ch)}
                                          </span>
                                          {(() => {
                                            const nivel = calcularNivelPorMedia(item.media_ch)
                                            return nivel.codigo !== '-' ? (
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                {nivel.codigo}
                                              </span>
                                            ) : null
                                          })()}
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_cn)}`}>
                                            {formatarNumero(item.media_cn)}
                                          </span>
                                          {(() => {
                                            const nivel = calcularNivelPorMedia(item.media_cn)
                                            return nivel.codigo !== '-' ? (
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                {nivel.codigo}
                                              </span>
                                            ) : null
                                          })()}
                                        </div>
                                      </td>
                                    </>
                                  )}
                                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                    <div className={`inline-flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50' : 'bg-red-50'}`}>
                                      <span className={`text-sm sm:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                                        {formatarNumero(item.media_geral)}
                                      </span>
                                      {(() => {
                                        const nivel = calcularNivelPorMedia(item.media_geral)
                                        return nivel.codigo !== '-' ? (
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                            {nivel.codigo}
                                          </span>
                                        ) : null
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              )})}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Seção: Dados por Escola dentro de cada Polo */}
                    {Object.entries(dadosEscolasPorPolo).length > 0 && !filtros.escola_id && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 sm:px-6 py-4 border-b border-blue-200">
                          <h3 className="text-lg sm:text-xl font-bold text-blue-900 flex items-center">
                            <School className="w-5 h-5 mr-2" />
                            {serie} - Comparativo por Escola
                          </h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Dados consolidados por escola dentro de cada polo
                          </p>
                        </div>

                        {Object.entries(dadosEscolasPorPolo).map(([poloId, escolasData]) => {
                          const poloNome = polos.find(p => p.id === poloId)?.nome || `Polo ${poloId}`
                          return (
                            <div key={poloId} className="mb-6 last:mb-0">
                              <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-200">
                                <h4 className="text-base sm:text-lg font-semibold text-blue-900 flex items-center">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  {poloNome}
                                </h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[500px] sm:min-w-[700px] lg:min-w-[900px]">
                                  <thead className="bg-blue-50">
                                    <tr>
                                      <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[150px]">Escola</th>
                                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">Turmas</th>
                                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[90px] sm:min-w-[100px]">Total Alunos</th>
                                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Presentes</th>
                                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Faltantes</th>
                                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">LP</th>
                                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">MAT</th>
                                      {isAnosIniciais(serie) ? (
                                        <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">PROD</th>
                                      ) : (
                                        <>
                                          <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">CH</th>
                                          <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">CN</th>
                                        </>
                                      )}
                                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Média Geral</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {[...escolasData].sort((a, b) => {
                                      const mediaA = typeof a.media_geral === 'string' ? parseFloat(a.media_geral) : (a.media_geral || 0)
                                      const mediaB = typeof b.media_geral === 'string' ? parseFloat(b.media_geral) : (b.media_geral || 0)
                                      return mediaB - mediaA
                                    }).map((item, index) => {
                                      const faltantes = item.total_alunos - item.alunos_presentes
                                      const percentualFaltantes = item.total_alunos > 0 ? ((faltantes / item.total_alunos) * 100).toFixed(1) : '0.0'
                                      const percentualPresentes = item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : '0.0'
                                      return (
                                      <tr key={`escola-${item.escola_id}-${item.serie}-${index}`} className="hover:bg-blue-50 bg-blue-50/30">
                                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <School className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-600" />
                                            <span className="font-bold text-gray-900 text-xs sm:text-sm">{item.escola_nome}</span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                          <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold text-xs">
                                            {item.total_turmas || 0} turma(s)
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                          <span className="text-gray-700 font-bold text-xs sm:text-sm">{item.total_alunos}</span>
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                          <span className="text-green-700 font-medium text-xs sm:text-sm">
                                            {item.alunos_presentes} ({percentualPresentes}%)
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                          <span className={`font-medium text-xs sm:text-sm ${faltantes > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                            {faltantes} ({percentualFaltantes}%)
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                          <div className="flex flex-col items-center gap-0.5">
                                            <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_lp)}`}>
                                              {formatarNumero(item.media_lp)}
                                            </span>
                                            {(() => {
                                              const nivel = calcularNivelPorMedia(item.media_lp)
                                              return nivel.codigo !== '-' ? (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                  {nivel.codigo}
                                                </span>
                                              ) : null
                                            })()}
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                          <div className="flex flex-col items-center gap-0.5">
                                            <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_mat)}`}>
                                              {formatarNumero(item.media_mat)}
                                            </span>
                                            {(() => {
                                              const nivel = calcularNivelPorMedia(item.media_mat)
                                              return nivel.codigo !== '-' ? (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                  {nivel.codigo}
                                                </span>
                                              ) : null
                                            })()}
                                          </div>
                                        </td>
                                        {isAnosIniciais(serie) ? (
                                          <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                            <div className="flex flex-col items-center gap-0.5">
                                              <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_producao)}`}>
                                                {formatarNumero(item.media_producao)}
                                              </span>
                                              {(() => {
                                                const nivel = calcularNivelPorMedia(item.media_producao)
                                                return nivel.codigo !== '-' ? (
                                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                    {nivel.codigo}
                                                  </span>
                                                ) : null
                                              })()}
                                            </div>
                                          </td>
                                        ) : (
                                          <>
                                            <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                              <div className="flex flex-col items-center gap-0.5">
                                                <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_ch)}`}>
                                                  {formatarNumero(item.media_ch)}
                                                </span>
                                                {(() => {
                                                  const nivel = calcularNivelPorMedia(item.media_ch)
                                                  return nivel.codigo !== '-' ? (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                      {nivel.codigo}
                                                    </span>
                                                  ) : null
                                                })()}
                                              </div>
                                            </td>
                                            <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                              <div className="flex flex-col items-center gap-0.5">
                                                <span className={`text-xs sm:text-sm font-bold ${getNotaColor(item.media_cn)}`}>
                                                  {formatarNumero(item.media_cn)}
                                                </span>
                                                {(() => {
                                                  const nivel = calcularNivelPorMedia(item.media_cn)
                                                  return nivel.codigo !== '-' ? (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                      {nivel.codigo}
                                                    </span>
                                                  ) : null
                                                })()}
                                              </div>
                                            </td>
                                          </>
                                        )}
                                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                          <div className={`inline-flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50' : 'bg-red-50'}`}>
                                            <span className={`text-sm sm:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                                              {formatarNumero(item.media_geral)}
                                            </span>
                                            {(() => {
                                              const nivel = calcularNivelPorMedia(item.media_geral)
                                              return nivel.codigo !== '-' ? (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                                  {nivel.codigo}
                                                </span>
                                              ) : null
                                            })()}
                                          </div>
                                        </td>
                                      </tr>
                                    )})}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
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
    </ProtectedRoute>
  )
}
