'use client'

import ProtectedRoute from '@/components/protected-route'
import ModalAlunosTurma from '@/components/modal-alunos-turma'
import { useEffect, useState, useMemo } from 'react'
import { Filter, X, School, TrendingUp, BarChart3, Users, Target, BookOpen, Eye, Trophy, WifiOff, Printer } from 'lucide-react'
import * as offlineStorage from '@/lib/offline-storage'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'

interface DadosComparativo {
  escola_id: string
  escola_nome: string
  polo_id: string
  polo_nome: string
  serie: string
  turma_id: string | null
  turma_codigo: string | null
  total_alunos: number
  alunos_presentes: number
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

export default function ComparativosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [usuario, setUsuario] = useState<any>(null)
  const [escolas, setEscolas] = useState<any[]>([])
  const [polos, setPolos] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<string[]>([])
  const [poloNome, setPoloNome] = useState<string>('')
  const [filtros, setFiltros] = useState({
    polo_id: '',
    ano_letivo: '', // Deixar vazio por padrão para buscar todos os anos
    serie: '',
    turma_id: '',
  })
  const [dados, setDados] = useState<Record<string, DadosComparativo[]>>({})
  const [dadosAgregados, setDadosAgregados] = useState<Record<string, DadosComparativo[]>>({})
  const [melhoresAlunos, setMelhoresAlunos] = useState<Record<string, any>>({})
  const [carregando, setCarregando] = useState(false)
  const [modalAlunosAberto, setModalAlunosAberto] = useState(false)
  const [turmaSelecionada, setTurmaSelecionada] = useState<{
    turma_id: string
    turma_codigo: string
    escola_nome: string
    serie: string
  } | null>(null)
  const [modoOffline, setModoOffline] = useState(false)

  useEffect(() => {
    // Verificar se está offline
    const online = offlineStorage.isOnline()
    setModoOffline(!online)

    // Não carregar dados se estiver offline
    if (!online) return

    const carregarTipoUsuario = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario) {
          const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
          setTipoUsuario(tipo)
          setUsuario(data.usuario)

          // Se for usuário polo, fixar o polo_id no filtro
          if (data.usuario.tipo_usuario === 'polo' && data.usuario.polo_id) {
            setFiltros(prev => ({ ...prev, polo_id: data.usuario.polo_id }))
          }
        }
      } catch (error) {
        console.error('Erro ao carregar tipo de usuário:', error)
      }
    }
    carregarTipoUsuario()
  }, [])

  // Carregar dados iniciais após definir o usuário
  useEffect(() => {
    if (usuario || tipoUsuario === 'admin') {
      carregarDadosIniciais()
    }
  }, [usuario])

  useEffect(() => {
    carregarTurmas()
  }, [filtros.serie, escolasSelecionadas, filtros.ano_letivo, filtros.polo_id])

  useEffect(() => {
    carregarComparativos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolasSelecionadas, filtros])

  const carregarDadosIniciais = async () => {
    try {
      // Para usuário polo, carregar apenas escolas do seu polo
      if (usuario?.tipo_usuario === 'polo' && usuario?.polo_id) {
        const [escolasRes, poloRes] = await Promise.all([
          fetch('/api/polo/escolas'),
          fetch(`/api/admin/polos?id=${usuario.polo_id}`),
        ])

        const escolasData = await escolasRes.json()
        const poloData = await poloRes.json()

        if (Array.isArray(escolasData)) {
          setEscolas(escolasData)
        }
        if (Array.isArray(poloData) && poloData.length > 0) {
          setPolos(poloData)
          setPoloNome(poloData[0].nome)
        }
      } else {
        // Admin/Tecnico: carregar todas as escolas e polos
        const [escolasRes, polosRes] = await Promise.all([
          fetch('/api/admin/escolas'),
          fetch('/api/admin/polos'),
        ])

        const escolasData = await escolasRes.json()
        const polosData = await polosRes.json()

        if (Array.isArray(escolasData)) {
          setEscolas(escolasData)
        }
        if (Array.isArray(polosData)) {
          setPolos(polosData)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const carregarTurmas = async () => {
    // Só carrega turmas se houver série selecionada
    if (!filtros.serie) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('serie', filtros.serie)
      
      // Se há polo selecionado, filtrar escolas pelo polo antes de buscar turmas
      if (filtros.polo_id && escolasSelecionadas.length === 0) {
        // Se não há escolas selecionadas mas há polo, usar todas as escolas do polo
        const escolasDoPolo = escolas.filter((e) => e.polo_id === filtros.polo_id).map((e) => e.id)
        if (escolasDoPolo.length > 0) {
          params.append('escolas_ids', escolasDoPolo.join(','))
        }
      } else if (escolasSelecionadas.length > 0) {
        // Filtrar apenas as escolas selecionadas que pertencem ao polo (se polo estiver selecionado)
        const escolasFiltradas = filtros.polo_id
          ? escolasSelecionadas.filter((id) => {
              const escola = escolas.find((e) => e.id === id)
              return escola && escola.polo_id === filtros.polo_id
            })
          : escolasSelecionadas
        
        if (escolasFiltradas.length > 0) {
          params.append('escolas_ids', escolasFiltradas.join(','))
        }
      }
      
      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      const response = await fetch(`/api/admin/turmas?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
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
    if (escolasSelecionadas.length === 0 && !filtros.polo_id) {
      setDados({})
      return
    }

    setCarregando(true)
    try {
      const params = new URLSearchParams()
      
      if (escolasSelecionadas.length > 0) {
        params.append('escolas_ids', escolasSelecionadas.join(','))
      }
      
      if (filtros.polo_id) {
        params.append('polo_id', filtros.polo_id)
      }
      
      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }
      
      if (filtros.serie) {
        params.append('serie', filtros.serie)
      }
      
      if (filtros.turma_id) {
        params.append('turma_id', filtros.turma_id)
      }

      const response = await fetch(`/api/admin/comparativos?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setDados(data.dadosPorSerie || {}) // Por turma
        setDadosAgregados(data.dadosPorSerieAgregado || {}) // Agregado por série
        setMelhoresAlunos(data.melhoresAlunos || {}) // Melhores alunos
        
        // Extrair séries únicas
        const seriesUnicas = [...new Set(data.dados?.map((d: DadosComparativo) => d.serie).filter(Boolean))] as string[]
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

  const toggleEscola = (escolaId: string) => {
    setEscolasSelecionadas((prev) =>
      prev.includes(escolaId)
        ? prev.filter((id) => id !== escolaId)
        : [...prev, escolaId]
    )
  }

  const limparFiltros = () => {
    setEscolasSelecionadas([])
    // Manter o polo_id se for usuário polo
    setFiltros(prev => ({
      polo_id: usuario?.tipo_usuario === 'polo' ? prev.polo_id : '',
      ano_letivo: '',
      serie: '',
      turma_id: '',
    }))
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

  // Obtém o total de questões por disciplina baseado na série
  const getTotalQuestoes = (serie: string, disciplina: 'LP' | 'MAT' | 'CH' | 'CN'): number => {
    const disciplinas = obterDisciplinasPorSerieSync(serie)
    const disc = disciplinas.find(d => d.codigo === disciplina)
    return disc?.total_questoes || (disciplina === 'CH' || disciplina === 'CN' ? 10 : 20)
  }

  // Formata acertos como número inteiro
  const formatarAcertos = (valor: number | string | null): string => {
    if (valor === null || valor === undefined) return '-'
    const num = typeof valor === 'string' ? parseFloat(valor) : valor
    if (isNaN(num)) return '-'
    return Math.round(num).toString()
  }

  // Formata valor ou retorna N/A se disciplina não aplicável
  const formatarValorOuNA = (valor: number | string | null, serie: string, disciplina: 'CH' | 'CN'): string => {
    // CH e CN não se aplicam a anos iniciais
    if (isAnosIniciais(serie)) {
      return 'N/A'
    }
    return formatarNumero(valor)
  }

  // Função para imprimir a página
  const handlePrint = () => {
    window.print()
  }

  const escolasFiltradas = useMemo(() => {
    // Para usuário polo, já recebemos apenas as escolas do polo
    if (usuario?.tipo_usuario === 'polo') return escolas
    // Para admin/tecnico, filtrar pelo polo selecionado
    if (!filtros.polo_id) return escolas
    return escolas.filter((e) => e.polo_id === filtros.polo_id)
  }, [escolas, filtros.polo_id, usuario])

  const totalEscolasComparadas = useMemo(() => {
    return new Set(
      Object.values(dados).flat().map((d) => d.escola_id)
    ).size
  }, [dados])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Comparativo de Escolas</h1>
              <p className="text-gray-600 mt-1">Compare o desempenho entre escolas, séries e turmas</p>
            </div>
          </div>

          {/* Aviso de modo offline */}
          {modoOffline && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-shrink-0">
                  <WifiOff className="w-12 h-12 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Comparativo Indisponível Offline
                  </h2>
                  <p className="text-amber-700 dark:text-amber-300">
                    Esta funcionalidade requer comparação de dados entre múltiplas escolas que não estão disponíveis no modo offline.
                    Por favor, conecte-se à internet para acessar o comparativo completo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo principal - apenas quando online */}
          {!modoOffline && (
          <>
          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-6" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Filtros de Comparação</h2>
              </div>
              {(escolasSelecionadas.length > 0 || filtros.polo_id || filtros.serie) && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Polo
                </label>
                {usuario?.tipo_usuario === 'polo' ? (
                  <input
                    type="text"
                    value={poloNome || 'Carregando...'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                  />
                ) : (
                  <select
                    value={filtros.polo_id}
                    onChange={(e) => {
                      setFiltros((prev) => ({ ...prev, polo_id: e.target.value }))
                      setEscolasSelecionadas([])
                    }}
                    className="select-custom w-full"
                  >
                    <option value="">Todos os polos</option>
                    {polos.map((polo) => (
                      <option key={polo.id} value={polo.id}>
                        {polo.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma {filtros.serie ? '(opcional)' : '(selecione uma série primeiro)'}
                </label>
                <select
                  value={filtros.turma_id}
                  onChange={(e) => setFiltros((prev) => ({ ...prev, turma_id: e.target.value }))}
                  disabled={!filtros.serie}
                  className="select-custom w-full"
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo} - {turma.escola_nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seleção de Escolas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Escolas para Comparar ({escolasSelecionadas.length} selecionadas)
              </label>
              <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white shadow-inner">
                {escolasFiltradas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <School className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma escola disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {escolasFiltradas.map((escola) => {
                      const isSelected = escolasSelecionadas.includes(escola.id)
                      return (
                        <label
                          key={escola.id}
                          className={`
                            flex items-center space-x-3 cursor-pointer 
                            p-3 rounded-lg border-2 transition-all duration-200
                            ${isSelected
                              ? 'bg-indigo-50 border-indigo-500 shadow-md'
                              : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30/50 hover:shadow-sm'
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEscola(escola.id)}
                            className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
                          />
                          <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                            {escola.nome}
                          </span>
                          {isSelected && (
                            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
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
          ) : Object.keys(dados).length > 0 ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <School className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">Escolas comparadas</p>
                      <p className="text-2xl font-bold text-indigo-900">{totalEscolasComparadas}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">Séries analisadas</p>
                      <p className="text-2xl font-bold text-indigo-900">{Object.keys(dados).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparativos por Série */}
              {Object.entries(dados).map(([serie, dadosSerie]) => {
                const dadosAgregadosSerie = dadosAgregados[serie] || []
                
                return (
                  <div key={serie} className="space-y-4">
                    {/* Seção: Dados Agregados por Escola/Série */}
                    {dadosAgregadosSerie.length > 0 && !filtros.turma_id && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden print:border print:shadow-none">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200 flex justify-between items-center print:bg-blue-50">
                          <div>
                            <h3 className="text-xl font-bold text-blue-900 flex items-center">
                              <School className="w-5 h-5 mr-2 print:hidden" />
                              {serie} - Resumo Geral por Escola
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                              Dados consolidados de todas as turmas desta série
                            </p>
                          </div>
                          <button
                            onClick={handlePrint}
                            className="print:hidden flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                            <span className="hidden md:inline">Imprimir</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[320px] sm:min-w-[500px] md:min-w-[600px]">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Escola</th>
                                <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden md:table-cell print:table-cell">Polo</th>
                                <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Turmas</th>
                                <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden sm:table-cell print:table-cell">Alunos</th>
                                <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Presentes</th>
                                <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Faltantes</th>
                                <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">LP</th>
                                <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">MAT</th>
                                {isAnosIniciais(serie) ? (
                                  <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">PROD</th>
                                ) : (
                                  <>
                                    <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">CH</th>
                                    <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">CN</th>
                                  </>
                                )}
                                <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Média</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                              {dadosAgregadosSerie.map((item, index) => {
                                const faltantes = item.total_alunos - item.alunos_presentes
                                const percentualFaltantes = item.total_alunos > 0 ? ((faltantes / item.total_alunos) * 100).toFixed(1) : '0.0'
                                const percentualPresentes = item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : '0.0'
                                return (
                                <tr key={`agregado-${item.escola_id}-${item.serie}-${index}`} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-blue-50/30 dark:bg-blue-900/10">
                                  <td className="py-2 px-2 md:py-3 md:px-4">
                                    <div className="flex items-start">
                                      <School className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                      <div className="min-w-0">
                                        <span className="font-bold text-gray-900 dark:text-white text-xs md:text-sm break-words">{item.escola_nome}</span>
                                        <div className="md:hidden text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                          <span className="font-medium">Polo:</span> {item.polo_nome}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden md:table-cell">
                                    <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{item.polo_nome}</span>
                                  </td>
                                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold text-xs">
                                      {item.total_turmas || 0}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden sm:table-cell">
                                    <span className="text-gray-700 dark:text-gray-200 font-bold text-xs md:text-sm">{item.total_alunos}</span>
                                  </td>
                                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                                    <span className="text-green-700 dark:text-green-400 font-medium text-xs md:text-sm">
                                      {item.alunos_presentes} ({percentualPresentes}%)
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                                    <span className={`font-medium text-xs md:text-sm ${faltantes > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                      {faltantes} ({percentualFaltantes}%)
                                    </span>
                                  </td>
                                  <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                    <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_lp)}`}>
                                      {formatarNumero(item.media_lp)}
                                    </span>
                                  </td>
                                  <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                    <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_mat)}`}>
                                      {formatarNumero(item.media_mat)}
                                    </span>
                                  </td>
                                  {isAnosIniciais(item.serie) ? (
                                    <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                      <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_producao)}`}>
                                        {formatarNumero(item.media_producao)}
                                      </span>
                                    </td>
                                  ) : (
                                    <>
                                      <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                        <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_ch)}`}>
                                          {formatarNumero(item.media_ch)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                        <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_cn)}`}>
                                          {formatarNumero(item.media_cn)}
                                        </span>
                                      </td>
                                    </>
                                  )}
                                  <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                                    <div className={`inline-flex items-center justify-center px-1.5 md:px-3 py-0.5 md:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50 dark:bg-green-900/30' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                      <span className={`text-xs sm:text-sm md:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                                        {formatarNumero(item.media_geral)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )})}
                            </tbody>
                          </table>
                        </div>

                        {/* Seção de Melhores Alunos */}
                        {dadosAgregadosSerie.map((item) => {
                          const keyMelhores = `${item.escola_id}_${serie}`
                          const melhores = melhoresAlunos[keyMelhores]
                          
                          return (
                            <div key={`melhores-${item.escola_id}`} className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-t border-yellow-200">
                              <h4 className="font-bold text-yellow-900 mb-3 flex items-center">
                                <Target className="w-4 h-4 mr-2" />
                                Melhores Desempenhos - {item.escola_nome}
                              </h4>
                              
                              {melhores ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Melhor Aluno Geral */}
                                  {melhores.melhorGeral && (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm dark:shadow-slate-900/50">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🏆 Melhor Média Geral</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">{melhores.melhorGeral.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorGeral.turma_codigo || 'N/A'} | Média: {formatarNumero(melhores.melhorGeral.media_geral)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente LP */}
                                  {melhores.melhorLP && (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm dark:shadow-slate-900/50">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">📚 Melhor LP</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">{melhores.melhorLP.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorLP.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorLP.nota_lp)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente CH - apenas anos finais */}
                                  {melhores.melhorCH && !isAnosIniciais(serie) && (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm dark:shadow-slate-900/50">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🌍 Melhor CH</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">{melhores.melhorCH.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorCH.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorCH.nota_ch)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente MAT */}
                                  {melhores.melhorMAT && (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm dark:shadow-slate-900/50">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🔢 Melhor MAT</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">{melhores.melhorMAT.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorMAT.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorMAT.nota_mat)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente PROD - apenas anos iniciais */}
                                  {melhores.melhorPROD && isAnosIniciais(serie) && parseFloat(melhores.melhorPROD.nota_producao) > 0 && (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm dark:shadow-slate-900/50">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">✏️ Melhor PROD</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">{melhores.melhorPROD.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorPROD.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorPROD.nota_producao)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhor por Componente CN - apenas anos finais */}
                                  {melhores.melhorCN && !isAnosIniciais(serie) && (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm dark:shadow-slate-900/50">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">🔬 Melhor CN</p>
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">{melhores.melhorCN.aluno_nome}</p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        Turma: {melhores.melhorCN.turma_codigo || 'N/A'} | Nota: {formatarNumero(melhores.melhorCN.nota_cn)}
                                      </p>
                                    </div>
                                  )}

                                  {/* Melhores por Turma */}
                                  {melhores.melhoresPorTurma && melhores.melhoresPorTurma.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-yellow-200 shadow-sm md:col-span-2 lg:col-span-3">
                                      <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">⭐ Melhor Aluno por Turma</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {melhores.melhoresPorTurma.map((melhorTurma: any, idx: number) => (
                                          <div key={idx} className="bg-gray-50 rounded p-2">
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                              <span className="font-bold">{melhorTurma.turma_codigo || 'Sem turma'}:</span> {melhorTurma.aluno_nome}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Média: {formatarNumero(melhorTurma.media_geral)}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado de melhor desempenho disponível</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Seção: Dados Detalhados por Turma */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border print:shadow-none">
                      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200 flex justify-between items-center print:bg-indigo-50">
                        <h3 className="text-xl font-bold text-indigo-900 flex items-center">
                          <BookOpen className="w-5 h-5 mr-2 print:hidden" />
                          {serie} - Detalhado por Turma
                        </h3>
                        <button
                          onClick={handlePrint}
                          className="print:hidden flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                          <span className="hidden md:inline">Imprimir</span>
                        </button>
                      </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[300px] sm:min-w-[400px] md:min-w-[500px]">
                      <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                          <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Escola</th>
                          <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden md:table-cell print:table-cell">Polo</th>
                          {!filtros.turma_id && (
                            <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden sm:table-cell print:table-cell">Turma</th>
                          )}
                          <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Alunos</th>
                          <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Presentes</th>
                          <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap hidden lg:table-cell print:table-cell">Faltantes</th>
                          <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">LP</th>
                          <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">MAT</th>
                          {isAnosIniciais(serie) ? (
                            <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">PROD</th>
                          ) : (
                            <>
                              <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">CH</th>
                              <th className="text-center py-2 px-1 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">CN</th>
                            </>
                          )}
                          <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Média</th>
                          <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap">Nível</th>
                          {!filtros.turma_id && (
                            <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm uppercase whitespace-nowrap print:hidden">Ações</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {dadosSerie.map((item, index) => {
                          const faltantes = item.total_alunos - item.alunos_presentes
                          const percentualFaltantes = item.total_alunos > 0 ? ((faltantes / item.total_alunos) * 100).toFixed(1) : '0.0'
                          const percentualPresentes = item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : '0.0'
                          return (
                          <tr key={`${item.escola_id}-${item.serie}-${item.turma_id || 'sem-turma'}-${index}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="py-2 px-2 md:py-3 md:px-4">
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm break-words block">{item.escola_nome}</span>
                                <div className="md:hidden text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                                  <div><span className="font-medium">Polo:</span> {item.polo_nome}</div>
                                  {!filtros.turma_id && item.turma_codigo && (
                                    <div><span className="font-medium">Turma:</span> {item.turma_codigo}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden md:table-cell">
                              <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{item.polo_nome}</span>
                            </td>
                            {!filtros.turma_id && (
                              <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden sm:table-cell">
                                <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 font-mono text-xs font-medium">
                                  {item.turma_codigo || '-'}
                                </span>
                              </td>
                            )}
                            <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                              <span className="text-gray-700 dark:text-gray-200 font-medium text-xs md:text-sm">{item.total_alunos}</span>
                            </td>
                            <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                              <span className="text-green-700 dark:text-green-400 font-medium text-xs md:text-sm">
                                {item.alunos_presentes} ({percentualPresentes}%)
                              </span>
                            </td>
                            <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                              <span className={`font-medium text-xs md:text-sm ${faltantes > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {faltantes} ({percentualFaltantes}%)
                              </span>
                            </td>
                            <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                              <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_lp)}`}>
                                {formatarNumero(item.media_lp)}
                              </span>
                            </td>
                            <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                              <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_mat)}`}>
                                {formatarNumero(item.media_mat)}
                              </span>
                            </td>
                            {isAnosIniciais(item.serie) ? (
                              <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_producao)}`}>
                                  {formatarNumero(item.media_producao)}
                                </span>
                              </td>
                            ) : (
                              <>
                                <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                  <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_ch)}`}>
                                    {formatarNumero(item.media_ch)}
                                  </span>
                                </td>
                                <td className="py-2 px-1 md:py-3 md:px-4 text-center whitespace-nowrap">
                                  <span className={`text-xs md:text-sm font-bold ${getNotaColor(item.media_cn)}`}>
                                    {formatarNumero(item.media_cn)}
                                  </span>
                                </td>
                              </>
                            )}
                            <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                              <div className={`inline-flex items-center justify-center px-1.5 md:px-3 py-0.5 md:py-2 rounded-lg ${getNotaColor(item.media_geral).includes('green') ? 'bg-green-50 dark:bg-green-900/30' : getNotaColor(item.media_geral).includes('yellow') ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                <span className={`text-xs sm:text-sm md:text-base lg:text-lg font-extrabold ${getNotaColor(item.media_geral)}`}>
                                  {formatarNumero(item.media_geral)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                              {(() => {
                                const nivel = calcularNivelPorMedia(item.media_geral)
                                return (
                                  <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${nivel.bgColor} ${nivel.cor}`}>
                                    {nivel.codigo}
                                  </span>
                                )
                              })()}
                            </td>
                            {!filtros.turma_id && (
                              <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                                {item.turma_id && (
                                  <button
                                    onClick={() => {
                                      setTurmaSelecionada({
                                        turma_id: item.turma_id!,
                                        turma_codigo: item.turma_codigo || 'Sem código',
                                        escola_nome: item.escola_nome,
                                        serie: item.serie
                                      })
                                      setModalAlunosAberto(true)
                                    }}
                                    className="inline-flex items-center px-1.5 md:px-3 py-1 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm font-medium"
                                    title="Ver todos os alunos desta turma"
                                  >
                                    <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                                    <span className="hidden md:inline ml-1">Ver</span>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                {escolasSelecionadas.length === 0 && !filtros.polo_id
                  ? 'Selecione escolas para comparar'
                  : 'Nenhum dado encontrado'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {escolasSelecionadas.length === 0 && !filtros.polo_id
                  ? 'Escolha uma ou mais escolas e configure os filtros'
                  : 'Verifique se há dados para as escolas selecionadas no ano letivo informado'}
              </p>
            </div>
          )}

          {/* Modal de Alunos da Turma */}
          {turmaSelecionada && (
            <ModalAlunosTurma
              turmaId={turmaSelecionada.turma_id}
              turmaCodigo={turmaSelecionada.turma_codigo}
              escolaNome={turmaSelecionada.escola_nome}
              serie={turmaSelecionada.serie}
              anoLetivo={filtros.ano_letivo}
              isOpen={modalAlunosAberto}
              onClose={() => {
                setModalAlunosAberto(false)
                setTurmaSelecionada(null)
              }}
            />
          )}
          </>
          )}
        </div>
    </ProtectedRoute>
  )
}

