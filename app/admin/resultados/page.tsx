'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo } from 'react'
import { Search, TrendingUp, BookOpen, Award, Filter, X, Users, BarChart3, Target, CheckCircle2, Eye } from 'lucide-react'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'

interface ResultadoConsolidado {
  id: string
  aluno_id?: string
  aluno_nome: string
  escola_nome: string
  turma_codigo: string
  serie: string
  presenca: string
  total_acertos_lp: number | string
  total_acertos_ch: number | string
  total_acertos_mat: number | string
  total_acertos_cn: number | string
  nota_lp: number | string | null
  nota_ch: number | string | null
  nota_mat: number | string | null
  nota_cn: number | string | null
  media_aluno: number | string | null
  // Novos campos para produção textual e nível de aprendizagem
  nota_producao?: number | string | null
  nivel_aprendizagem?: string | null
  nivel_aprendizagem_id?: string | null
  tipo_avaliacao?: string | null
  item_producao_1?: number | string | null
  item_producao_2?: number | string | null
  item_producao_3?: number | string | null
  item_producao_4?: number | string | null
  item_producao_5?: number | string | null
  item_producao_6?: number | string | null
  item_producao_7?: number | string | null
  item_producao_8?: number | string | null
}

// Função para verificar se a série é dos anos iniciais (2º, 3º ou 5º ano)
const isAnosIniciais = (serie: string | undefined | null): boolean => {
  if (!serie) return false
  const numero = serie.match(/(\d+)/)?.[1]
  return numero === '2' || numero === '3' || numero === '5'
}

// Função para obter a cor do nível de aprendizagem
const getNivelColor = (nivel: string | undefined | null): string => {
  if (!nivel) return 'bg-gray-100 text-gray-700'
  const nivelLower = nivel.toLowerCase()
  if (nivelLower.includes('avançado') || nivelLower.includes('avancado')) return 'bg-green-100 text-green-800 border-green-300'
  if (nivelLower.includes('adequado')) return 'bg-blue-100 text-blue-800 border-blue-300'
  if (nivelLower.includes('básico') || nivelLower.includes('basico')) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  if (nivelLower.includes('insuficiente')) return 'bg-red-100 text-red-800 border-red-300'
  return 'bg-gray-100 text-gray-700'
}

interface Paginacao {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  temProxima: boolean
  temAnterior: boolean
}

interface Filtros {
  polo_id?: string
  escola_id?: string
  turma_id?: string
  ano_letivo?: string
  serie?: string
  presenca?: string
}

export default function ResultadosPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('admin')
  const [resultados, setResultados] = useState<ResultadoConsolidado[]>([])
  const [estatisticasGerais, setEstatisticasGerais] = useState<{
    totalAlunos: number
    totalPresentes: number
    totalFaltas: number
    mediaGeral: number
    mediaLP: number
    mediaCH: number
    mediaMAT: number
    mediaCN: number
  }>({
    totalAlunos: 0,
    totalPresentes: 0,
    totalFaltas: 0,
    mediaGeral: 0,
    mediaLP: 0,
    mediaCH: 0,
    mediaMAT: 0,
    mediaCN: 0
  })
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<Filtros>({})
  const [polos, setPolos] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [anosLetivos, setAnosLetivos] = useState<string[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<{ id: string; anoLetivo?: string } | null>(null)
  
  // Estados de paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [paginacao, setPaginacao] = useState<{
    pagina: number
    limite: number
    total: number
    totalPaginas: number
    temProxima: boolean
    temAnterior: boolean
  }>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0,
    temProxima: false,
    temAnterior: false
  })
  
  // Funções de navegação de página
  const irParaPagina = (pagina: number) => {
    setPaginaAtual(pagina)
    carregarResultados(pagina)
  }
  
  const paginaAnterior = () => {
    if (paginacao.temAnterior) {
      irParaPagina(paginaAtual - 1)
    }
  }
  
  const proximaPagina = () => {
    if (paginacao.temProxima) {
      irParaPagina(paginaAtual + 1)
    }
  }

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
    setPaginaAtual(1) // Resetar para primeira página ao mudar filtros
    carregarResultados(1)
  }, [filtros])

  useEffect(() => {
    // Carregar escolas quando o polo for selecionado
    if (filtros.polo_id) {
      const escolasDoPolo = escolas.filter((e) => e.polo_id === filtros.polo_id)
      // Se já temos as escolas carregadas, não precisamos fazer nova requisição
      // Se não tiver escolas do polo, limpar escola selecionada
      if (escolasDoPolo.length === 0 && filtros.escola_id) {
        setFiltros((prev) => ({ ...prev, escola_id: undefined, turma_id: undefined }))
      }
    }
  }, [filtros.polo_id, escolas])

  useEffect(() => {
    carregarTurmas()
  }, [filtros.escola_id, filtros.serie, filtros.ano_letivo])

  const carregarDadosIniciais = async () => {
    try {
      const [polosRes, escolasRes, seriesRes, anosRes] = await Promise.all([
        fetch('/api/admin/polos'),
        fetch('/api/admin/escolas'),
        fetch('/api/admin/configuracao-series'),
        fetch('/api/admin/resultados-consolidados?limite=1'), // Para obter anos letivos disponíveis
      ])

      const polosData = await polosRes.json()
      const escolasData = await escolasRes.json()
      const seriesData = await seriesRes.json()

      setPolos(polosData)
      setEscolas(escolasData)

      // Carregar séries configuradas
      if (seriesData.series && Array.isArray(seriesData.series)) {
        const seriesFormatadas = seriesData.series.map((s: any) => s.nome_serie || `${s.serie}º ano`)
        setSeries(seriesFormatadas)
      }

      // Carregar anos letivos distintos do banco
      await carregarAnosLetivos()
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const carregarAnosLetivos = async () => {
    try {
      // Buscar anos letivos distintos dos resultados consolidados
      const response = await fetch('/api/admin/dashboard-dados?limite=1&atualizar_cache=true')
      const data = await response.json()

      if (data.filtros?.anosLetivos && Array.isArray(data.filtros.anosLetivos)) {
        // Filtrar valores válidos e ordenar decrescente
        const anosValidos = data.filtros.anosLetivos
          .filter((ano: string) => ano && ano.trim() !== '' && !isNaN(parseInt(ano)))
          .sort((a: string, b: string) => parseInt(b) - parseInt(a))
        setAnosLetivos(anosValidos)
      } else {
        // Fallback: anos recentes
        const anoAtual = new Date().getFullYear()
        setAnosLetivos([anoAtual.toString(), (anoAtual - 1).toString()])
      }
    } catch (error) {
      console.error('Erro ao carregar anos letivos:', error)
      // Fallback: anos recentes
      const anoAtual = new Date().getFullYear()
      setAnosLetivos([anoAtual.toString(), (anoAtual - 1).toString()])
    }
  }

  const carregarTurmas = async () => {
    // Só carrega turmas se houver escola e série selecionadas
    if (!filtros.escola_id || !filtros.serie) {
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

  const carregarResultados = async (pagina: number = paginaAtual) => {
    try {
      setCarregando(true)

      // Resetar estatísticas durante o carregamento para mostrar que está atualizando
      if (pagina === 1) {
        setEstatisticasGerais({
          totalAlunos: 0,
          totalPresentes: 0,
          totalFaltas: 0,
          mediaGeral: 0,
          mediaLP: 0,
          mediaCH: 0,
          mediaMAT: 0,
          mediaCN: 0
        })
      }

      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([key, value]) => {
        // Não enviar valores vazios, null, undefined ou "Todas"
        if (value && value.toString().trim() !== '' && value.toString().toLowerCase() !== 'todas') {
          params.append(key, value.toString())
        }
      })

      // Parâmetros de paginação
      params.append('pagina', pagina.toString())
      params.append('limite', '50')

      // Forçar atualização do cache para garantir dados atualizados
      params.append('atualizar_cache', 'true')

      console.log('Carregando resultados com filtros:', Object.fromEntries(params.entries()))

      const response = await fetch(`/api/admin/resultados-consolidados?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar resultados')
      }
      
      const data = await response.json()
      
      // Nova estrutura: { resultados: [], paginacao: {} } ou array direto (compatibilidade)
      let resultadosData: ResultadoConsolidado[] = []
      let paginacaoData: Paginacao = {
        pagina: 1,
        limite: 50,
        total: 0,
        totalPaginas: 0,
        temProxima: false,
        temAnterior: false
      }
      
      if (Array.isArray(data)) {
        // Compatibilidade: resposta antiga (array direto)
        resultadosData = data
        paginacaoData = {
          pagina: 1,
          limite: 50,
          total: data.length,
          totalPaginas: Math.ceil(data.length / 50),
          temProxima: false,
          temAnterior: false
        }
        // Calcular estatísticas básicas do array (fallback)
        const presentes = data.filter((r: any) => r.presenca === 'P' || r.presenca === 'p').length
        const faltas = data.filter((r: any) => r.presenca === 'F' || r.presenca === 'f').length
        setEstatisticasGerais({
          totalAlunos: data.length,
          totalPresentes: presentes,
          totalFaltas: faltas,
          mediaGeral: 0,
          mediaLP: 0,
          mediaCH: 0,
          mediaMAT: 0,
          mediaCN: 0
        })
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.resultados)) {
          resultadosData = data.resultados
        } else if (Array.isArray(data)) {
          resultadosData = data
        }
        
        if (data.paginacao && typeof data.paginacao === 'object') {
          paginacaoData = {
            pagina: data.paginacao.pagina || 1,
            limite: data.paginacao.limite || 50,
            total: data.paginacao.total || 0,
            totalPaginas: data.paginacao.totalPaginas || data.paginacao.total_paginas || 0,
            temProxima: data.paginacao.temProxima || false,
            temAnterior: data.paginacao.temAnterior || false
          }
        }
        
        // Extrair estatísticas da API (calculadas sobre TODOS os alunos)
        if (data.estatisticas && typeof data.estatisticas === 'object') {
          const novasEstatisticas = {
            totalAlunos: data.estatisticas.totalAlunos || 0,
            totalPresentes: data.estatisticas.totalPresentes || 0,
            totalFaltas: data.estatisticas.totalFaltas || 0,
            mediaGeral: parseFloat(data.estatisticas.mediaGeral) || 0,
            mediaLP: parseFloat(data.estatisticas.mediaLP) || 0,
            mediaCH: parseFloat(data.estatisticas.mediaCH) || 0,
            mediaMAT: parseFloat(data.estatisticas.mediaMAT) || 0,
            mediaCN: parseFloat(data.estatisticas.mediaCN) || 0
          }
          console.log('Estatísticas recebidas da API:', novasEstatisticas)
          setEstatisticasGerais(novasEstatisticas)
        } else {
          console.log('Sem estatísticas na resposta, calculando localmente')
          // Calcular estatísticas localmente se API não retornou
          const presentes = resultadosData.filter((r: any) => r.presenca === 'P' || r.presenca === 'p').length
          const faltas = resultadosData.filter((r: any) => r.presenca === 'F' || r.presenca === 'f').length
          setEstatisticasGerais({
            totalAlunos: paginacaoData.total || resultadosData.length,
            totalPresentes: presentes,
            totalFaltas: faltas,
            mediaGeral: 0,
            mediaLP: 0,
            mediaCH: 0,
            mediaMAT: 0,
            mediaCN: 0
          })
        }
      }

      console.log('Resultados carregados:', resultadosData.length, 'registros')
      setResultados(resultadosData)
      setPaginacao(paginacaoData)
      setPaginaAtual(paginacaoData.pagina)
    } catch (error) {
      console.error('Erro ao carregar resultados:', error)
      setResultados([])
      setPaginacao({
        pagina: 1,
        limite: 50,
        total: 0,
        totalPaginas: 0,
        temProxima: false,
        temAnterior: false
      })
    } finally {
      setCarregando(false)
    }
  }

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev }
      if (valor) {
        novo[campo] = valor
      } else {
        delete novo[campo]
      }

      // Se mudou o polo, limpar escola e turma selecionadas
      if (campo === 'polo_id') {
        delete novo.escola_id
        delete novo.turma_id
      }

      // Se mudou a escola, limpar turma selecionada
      if (campo === 'escola_id') {
        delete novo.turma_id
      }

      // Se mudou a série, limpar turma selecionada
      if (campo === 'serie') {
        delete novo.turma_id
      }

      return novo
    })
  }

  const limparFiltros = () => {
    setFiltros({})
    setBusca('')
  }

  const temFiltrosAtivos = Object.keys(filtros).length > 0 || busca.trim() !== ''

  const resultadosFiltrados = useMemo(() => {
    if (!busca.trim()) return resultados
    
    const buscaLower = busca.toLowerCase()
    return resultados.filter(
      (r) =>
        r.aluno_nome.toLowerCase().includes(buscaLower) ||
        r.escola_nome.toLowerCase().includes(buscaLower) ||
        (r.turma_codigo && r.turma_codigo.toLowerCase().includes(buscaLower))
    )
  }, [resultados, busca])

  const getPresencaColor = (presenca: string) => {
    if (presenca === 'P' || presenca === 'p') {
      return 'bg-green-100 text-green-800'
    }
    if (presenca === '-') {
      return 'bg-gray-100 text-gray-600'
    }
    return 'bg-red-100 text-red-800'
  }

  const formatarNota = (nota: number | string | null | undefined, presenca?: string, mediaAluno?: number | string | null): string => {
    // Se não houver dados de frequência, sempre retornar "-"
    if (presenca === '-') {
      return '-'
    }
    
    // Se aluno faltou, sempre retornar "-"
    if (presenca === 'F' || presenca === 'f') {
      return '-'
    }
    
    // Se média do aluno for 0 ou null, considerar faltante
    const mediaNum = typeof mediaAluno === 'string' ? parseFloat(mediaAluno) : mediaAluno
    if (mediaNum === 0 || mediaNum === null || mediaNum === undefined) {
      return '-'
    }
    
    if (nota === null || nota === undefined || nota === '') return '-'
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (isNaN(num)) return '-'
    if (num === 0) return '-' // Se nota for 0, também retornar "-"
    return num.toFixed(1)
  }

  const getNotaNumero = (nota: number | string | null | undefined): number | null => {
    if (nota === null || nota === undefined || nota === '') return null
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    return isNaN(num) ? null : num
  }

  const getNotaColor = (nota: number | string | null | undefined) => {
    const num = getNotaNumero(nota)
    if (num === null) return 'text-gray-500'
    if (num >= 7) return 'text-green-600 font-semibold'
    if (num >= 5) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  const getNotaBgColor = (nota: number | string | null | undefined) => {
    const num = getNotaNumero(nota)
    if (num === null) return 'bg-gray-50'
    if (num >= 7) return 'bg-green-50 border-green-200'
    if (num >= 5) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  // Detectar se está filtrando anos iniciais (2º, 3º ou 5º ano)
  const filtrandoAnosIniciais = useMemo(() => {
    if (filtros.serie) {
      return isAnosIniciais(filtros.serie)
    }
    // Se não tem filtro de série, verificar se todos os resultados são de anos iniciais
    if (resultadosFiltrados.length > 0) {
      return resultadosFiltrados.every(r => isAnosIniciais(r.serie))
    }
    return false
  }, [filtros.serie, resultadosFiltrados])

  // Obter disciplinas que devem ser exibidas baseadas na série selecionada
  const disciplinasExibir = useMemo(() => {
    return obterDisciplinasPorSerieSync(filtros.serie || resultadosFiltrados[0]?.serie)
  }, [filtros.serie, resultadosFiltrados])

  // Calcular estatísticas - EXCLUIR alunos faltantes
  // Usar estatísticas da API (gerais, sem paginação) e calcular apenas dados locais (produção textual, nível)
  const estatisticas = useMemo(() => {
    // Usar estatísticas gerais da API (calculadas sobre TODOS os alunos, não apenas a página atual)
    const baseStats = {
      total: estatisticasGerais.totalAlunos,
      mediaGeral: estatisticasGerais.mediaGeral,
      presentes: estatisticasGerais.totalPresentes,
      faltas: estatisticasGerais.totalFaltas,
      mediaLP: estatisticasGerais.mediaLP,
      mediaCH: estatisticasGerais.mediaCH,
      mediaMAT: estatisticasGerais.mediaMAT,
      mediaCN: estatisticasGerais.mediaCN,
    }
    
    // Calcular apenas dados que não vêm da API (produção textual e nível de aprendizagem)
    // Esses são calculados apenas dos resultados da página atual (limitação)
    const alunosPresentes = resultadosFiltrados.filter((r) => {
      const presenca = r.presenca?.toString().toUpperCase()
      const mediaNum = getNotaNumero(r.media_aluno)
      return presenca === 'P' && mediaNum !== null && mediaNum !== 0
    })

    const mediasProducao = alunosPresentes
      .map((r) => getNotaNumero(r.nota_producao))
      .filter((m): m is number => m !== null && m !== 0)

    const qtdInsuficiente = alunosPresentes.filter(r => r.nivel_aprendizagem?.toLowerCase().includes('insuficiente')).length
    const qtdBasico = alunosPresentes.filter(r => r.nivel_aprendizagem?.toLowerCase().includes('básico') || r.nivel_aprendizagem?.toLowerCase().includes('basico')).length
    const qtdAdequado = alunosPresentes.filter(r => r.nivel_aprendizagem?.toLowerCase().includes('adequado')).length
    const qtdAvancado = alunosPresentes.filter(r => r.nivel_aprendizagem?.toLowerCase().includes('avançado') || r.nivel_aprendizagem?.toLowerCase().includes('avancado')).length

    return {
      ...baseStats,
      mediaProducao: mediasProducao.length > 0 ? mediasProducao.reduce((a, b) => a + b, 0) / mediasProducao.length : 0,
      qtdInsuficiente,
      qtdBasico,
      qtdAdequado,
      qtdAvancado,
    }
  }, [estatisticasGerais, resultadosFiltrados])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Resultados Consolidados</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Visualize notas e médias dos alunos</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6" style={{ overflow: 'visible' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
              <div className="flex items-center">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Filtros</h2>
              </div>
              {temFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 w-fit"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-4">
              {/* 1. Ano Letivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano Letivo
                </label>
                <select
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos</option>
                  {anosLetivos.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Polo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Polo
                </label>
                <select
                  value={filtros.polo_id || ''}
                  onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos</option>
                  {polos.map((polo) => (
                    <option key={polo.id} value={polo.id}>
                      {polo.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Escola */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escola
                </label>
                <select
                  value={filtros.escola_id || ''}
                  onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
                  disabled={!filtros.polo_id}
                  className="select-custom w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Todas</option>
                  {escolas
                    .filter((e) => !filtros.polo_id || e.polo_id === filtros.polo_id)
                    .map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {escola.nome}
                      </option>
                    ))}
                </select>
              </div>

              {/* 4. Série */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Série
                </label>
                <select
                  value={filtros.serie || ''}
                  onChange={(e) => handleFiltroChange('serie', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todas</option>
                  {series.map((serie) => (
                    <option key={serie} value={serie}>
                      {serie}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Turma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma
                </label>
                <select
                  value={filtros.turma_id || ''}
                  onChange={(e) => handleFiltroChange('turma_id', e.target.value)}
                  disabled={!filtros.escola_id || !filtros.serie || turmas.length === 0}
                  className="select-custom w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Todas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo || turma.nome || `Turma ${turma.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Presença */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presença
                </label>
                <select
                  value={filtros.presenca || ''}
                  onChange={(e) => handleFiltroChange('presenca', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todas</option>
                  <option value="P">Presente</option>
                  <option value="F">Faltante</option>
                </select>
              </div>

              {/* 7. Busca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Busca
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Aluno, escola ou turma..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* 8. Botão Pesquisar */}
              <div className="flex items-end">
                <button
                  onClick={() => carregarResultados(1)}
                  disabled={carregando}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {carregando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Pesquisando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Pesquisar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          {(estatisticas.total > 0 || carregando) && (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${carregando ? 'opacity-50' : ''}`}>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.total}</span>
                </div>
                <p className="text-sm opacity-90">Total de Alunos</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.mediaGeral.toFixed(1)}</span>
                </div>
                <p className="text-sm opacity-90">Média Geral</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.presentes}</span>
                </div>
                <p className="text-sm opacity-90">Presentes</p>
                <p className="text-xs opacity-75 mt-1">
                  {estatisticas.total > 0 ? ((estatisticas.presentes / (estatisticas.presentes + estatisticas.faltas)) * 100).toFixed(1) : 0}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <X className="w-8 h-8 opacity-90" />
                  <span className="text-3xl font-bold">{estatisticas.faltas}</span>
                </div>
                <p className="text-sm opacity-90">Faltas</p>
                <p className="text-xs opacity-75 mt-1">
                  {estatisticas.presentes + estatisticas.faltas > 0 ? ((estatisticas.faltas / (estatisticas.presentes + estatisticas.faltas)) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}

          {/* Médias por Área */}
          {(estatisticas.total > 0 || carregando) && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 ${carregando ? 'opacity-50' : ''}`}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Língua Portuguesa</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaLP)}`}>
                      {estatisticas.mediaLP.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaLP >= 7 ? 'bg-green-500' : estatisticas.mediaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaLP / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Ciências Humanas</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaCH)}`}>
                      {estatisticas.mediaCH.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaCH >= 7 ? 'bg-green-500' : estatisticas.mediaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaCH / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Matemática</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaMAT)}`}>
                      {estatisticas.mediaMAT.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaMAT >= 7 ? 'bg-green-500' : estatisticas.mediaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaMAT / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Ciências da Natureza</p>
                    <p className={`text-xl sm:text-2xl font-bold ${getNotaColor(estatisticas.mediaCN)}`}>
                      {estatisticas.mediaCN.toFixed(1)}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 flex-shrink-0 ml-2" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full ${
                      estatisticas.mediaCN >= 7 ? 'bg-green-500' : estatisticas.mediaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticas.mediaCN / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando resultados...</p>
              </div>
            ) : (
              <>
                {/* Visualização Mobile - Cards */}
                <div className="block sm:hidden space-y-4 p-4">
                  {resultadosFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-500">Nenhum resultado encontrado</p>
                      <p className="text-sm mt-1 text-gray-400">Importe os dados primeiro</p>
                    </div>
                  ) : (
                    resultadosFiltrados.map((resultado, index) => {
                    const mediaNum = getNotaNumero(resultado.media_aluno)
                    const notaLP = getNotaNumero(resultado.nota_lp)
                    const notaCH = getNotaNumero(resultado.nota_ch)
                    const notaMAT = getNotaNumero(resultado.nota_mat)
                    const notaCN = getNotaNumero(resultado.nota_cn)

                    return (
                      <div key={resultado.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        {/* Cabeçalho do Card */}
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                          <div className="flex items-center gap-2 mr-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-sm flex-shrink-0">
                              {index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setAlunoSelecionado({
                                id: resultado.aluno_id || resultado.id,
                                anoLetivo: filtros.ano_letivo,
                              })
                              setModalAberto(true)
                            }}
                            className="flex items-center flex-1 text-left hover:opacity-80 transition-opacity"
                            title="Clique para ver questões do aluno"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {resultado.aluno_nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-indigo-600 hover:text-indigo-800 underline text-sm mb-1">
                                {resultado.aluno_nome}
                              </div>
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div>{resultado.escola_nome}</div>
                                {resultado.turma_codigo && <div>Turma: {resultado.turma_codigo}</div>}
                                <div className="flex items-center gap-2">
                                  <span>Série: {resultado.serie || '-'}</span>
                                  <span className="text-gray-300">|</span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(
                                      resultado.presenca || 'P'
                                    )}`}
                                  >
                                    {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : resultado.presenca === '-' ? '— Sem dados' : '✗ Falta'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Notas em Grid - Dinâmico baseado na série */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {disciplinasExibir.map((disciplina) => {
                            const nota = getNotaNumero(resultado[disciplina.campo_nota as keyof ResultadoConsolidado] as any)
                            const acertos = disciplina.campo_acertos ? resultado[disciplina.campo_acertos as keyof ResultadoConsolidado] as number | string : null
                            const nivelAprendizagem = disciplina.tipo === 'nivel' ? resultado.nivel_aprendizagem : null
                            
                            return (
                              <div key={disciplina.codigo} className={`p-3 rounded-lg ${getNotaBgColor(nota)} border border-gray-200`}>
                                <div className="text-xs font-semibold text-gray-600 mb-1">{disciplina.nome}</div>
                                {disciplina.tipo === 'nivel' ? (
                                  <div className={`text-sm font-bold ${nivelAprendizagem ? getNivelColor(nivelAprendizagem).replace('bg-', 'text-').split(' ')[0] : 'text-gray-500'}`}>
                                    {nivelAprendizagem || '-'}
                                  </div>
                                ) : (
                                  <>
                                    {disciplina.total_questoes && acertos !== null && (
                                      <div className="text-xs text-gray-600 mb-1">{acertos}/{disciplina.total_questoes}</div>
                                    )}
                                    <div className={`text-lg font-bold ${getNotaColor(nota)} mb-1`}>
                                      {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                                    </div>
                                    {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div
                                          className={`h-1.5 rounded-full ${
                                            nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Média e Ações */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                            mediaNum !== null && mediaNum >= 7 ? 'border-green-500' : 
                            mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' : 
                            'border-red-500'
                          }`}>
                            <div className="text-xs font-semibold text-gray-600 mb-1">Média Geral</div>
                            <div className={`text-2xl font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                              {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAlunoSelecionado({
                                id: resultado.aluno_id || resultado.id,
                                anoLetivo: filtros.ano_letivo,
                              })
                              setModalAberto(true)
                            }}
                            className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                            title="Ver questões do aluno"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Questões
                          </button>
                        </div>
                      </div>
                    )
                  }))}
                </div>

                {/* Visualização Tablet/Desktop - Tabela */}
                <div className="hidden sm:block w-full">
                  <div className="w-full overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full divide-y divide-gray-200 min-w-0 md:min-w-[600px] lg:min-w-[700px]">
                      <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                        <tr>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-8 md:w-10 lg:w-12">
                            #
                          </th>
                          <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
                            Aluno
                          </th>
                          <th className="hidden lg:table-cell text-left py-1 px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[150px]">
                            Escola
                          </th>
                          <th className="hidden md:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20">
                            Turma
                          </th>
                          <th className="hidden xl:table-cell text-left py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20">
                            Série
                          </th>
                          <th className="hidden lg:table-cell text-center py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-20">
                            Presença
                          </th>
                          {disciplinasExibir.map((disciplina) => (
                            <th key={disciplina.codigo} className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                              {disciplina.codigo}
                            </th>
                          ))}
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18">
                            Média
                          </th>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20 lg:w-24">
                            Ações
                          </th>
                        </tr>
                      </thead>
                  <tbody className="divide-y divide-gray-200">
                    {resultadosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6 + disciplinasExibir.length + 1} className="py-8 sm:py-12 text-center text-gray-500 px-4">
                          <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-base sm:text-lg font-medium">Nenhum resultado encontrado</p>
                          <p className="text-xs sm:text-sm mt-1">Importe os dados primeiro</p>
                        </td>
                      </tr>
                    ) : (
                      resultadosFiltrados.map((resultado, index) => {
                        const mediaNum = getNotaNumero(resultado.media_aluno)
                        const notaLP = getNotaNumero(resultado.nota_lp)
                        const notaCH = getNotaNumero(resultado.nota_ch)
                        const notaMAT = getNotaNumero(resultado.nota_mat)
                        const notaCN = getNotaNumero(resultado.nota_cn)

                        return (
                          <tr key={resultado.id} className="hover:bg-indigo-50 transition-colors border-b border-gray-100">
                            <td className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                              <div className="flex flex-col">
                                <button
                                  onClick={() => {
                                    setAlunoSelecionado({
                                      id: resultado.aluno_id || resultado.id,
                                      anoLetivo: filtros.ano_letivo,
                                    })
                                    setModalAberto(true)
                                  }}
                                  className="flex items-center w-full text-left hover:opacity-80 transition-opacity mb-1"
                                  title="Clique para ver questões do aluno"
                                >
                                  <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-9 rounded-full bg-indigo-100 flex items-center justify-center mr-1 sm:mr-1.5 md:mr-2">
                                    <span className="text-indigo-600 font-semibold text-[9px] sm:text-[10px] md:text-xs">
                                      {resultado.aluno_nome.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-indigo-600 hover:text-indigo-800 underline text-[10px] sm:text-[11px] md:text-xs lg:text-sm truncate">{resultado.aluno_nome}</span>
                                </button>
                                <div className="lg:hidden text-[9px] sm:text-[10px] md:text-xs text-gray-500 space-y-0.5 ml-6 sm:ml-7 md:ml-8 lg:ml-10">
                                  {resultado.escola_nome && <div className="whitespace-normal break-words">Escola: {resultado.escola_nome}</div>}
                                  {resultado.turma_codigo && <div>Turma: {resultado.turma_codigo}</div>}
                                  {resultado.serie && <div>Série: {resultado.serie}</div>}
                                  <div className="flex items-center gap-2">
                                    <span>Presença: </span>
                                    <span
                                      className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getPresencaColor(
                                        resultado.presenca || 'P'
                                      )}`}
                                    >
                                      {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : resultado.presenca === '-' ? '— Sem dados' : '✗ Falta'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                              <span className="text-gray-700 font-medium text-[10px] md:text-xs lg:text-sm block whitespace-normal break-words">{resultado.escola_nome}</span>
                            </td>
                            <td className="hidden md:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                              <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[9px] md:text-[10px] lg:text-xs font-medium">
                                {resultado.turma_codigo || '-'}
                              </span>
                            </td>
                            <td className="hidden xl:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                              <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] md:text-[10px] lg:text-xs font-medium">
                                {resultado.serie || '-'}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <span
                                className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm ${getPresencaColor(
                                  resultado.presenca || 'P'
                                )}`}
                              >
                                {resultado.presenca === 'P' || resultado.presenca === 'p' 
                                  ? '✓ Presente' 
                                  : resultado.presenca === '-' 
                                  ? '— Sem dados' 
                                  : '✗ Falta'}
                              </span>
                            </td>
                            {disciplinasExibir.map((disciplina) => {
                              const nota = getNotaNumero(resultado[disciplina.campo_nota as keyof ResultadoConsolidado] as any)
                              const acertos = disciplina.campo_acertos ? resultado[disciplina.campo_acertos as keyof ResultadoConsolidado] as number | string : null
                              const nivelAprendizagem = disciplina.tipo === 'nivel' ? resultado.nivel_aprendizagem : null
                              
                              return (
                                <td key={disciplina.codigo} className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                  {disciplina.tipo === 'nivel' ? (
                                    <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-semibold ${getNivelColor(nivelAprendizagem || '')}`}>
                                      {nivelAprendizagem || '-'}
                                    </span>
                                  ) : (
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(nota)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      {disciplina.total_questoes && acertos !== null && (
                                        <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                          {acertos}/{disciplina.total_questoes}
                                        </div>
                                      )}
                                      <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(nota)}`}>
                                        {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                                      </div>
                                      {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                        <div className="w-full bg-gray-200 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
                                          <div
                                            className={`h-0.5 md:h-1 rounded-full ${
                                              nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                            <td className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <div className={`inline-flex flex-col items-center justify-center px-0.5 sm:px-1 md:px-1.5 lg:px-2 py-0.5 sm:py-1 md:py-1.5 lg:py-2 rounded-xl ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                                mediaNum !== null && mediaNum >= 7 ? 'border-green-500' : 
                                mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' : 
                                'border-red-500'
                              } w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                <div className={`text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                                  {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                                </div>
                                {mediaNum !== null && mediaNum !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                  <div className="mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600">
                                    Média
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-3 lg:px-2 text-center">
                              <button
                                onClick={() => {
                                  setAlunoSelecionado({
                                    id: resultado.aluno_id || resultado.id,
                                    anoLetivo: filtros.ano_letivo,
                                  })
                                  setModalAberto(true)
                                }}
                                className="w-full inline-flex items-center justify-center px-1 sm:px-1.5 md:px-2 lg:px-3 py-1 sm:py-1 md:py-1.5 lg:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-[9px] sm:text-[10px] md:text-xs font-medium shadow-sm"
                                title="Ver questões do aluno"
                              >
                                <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 mr-0.5 sm:mr-1 flex-shrink-0" />
                                <span className="hidden md:inline">Ver Questões</span>
                                <span className="md:hidden">Ver</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                    </table>
                  </div>

                  {/* Controles de Paginação */}
                  {!carregando && paginacao.totalPaginas > 1 && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex-1 flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Página {paginacao.pagina}</span> de {paginacao.totalPaginas}
                          {' • '}
                          <span className="font-medium">{paginacao.total}</span> alunos no total
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={paginaAnterior}
                            disabled={!paginacao.temAnterior}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              paginacao.temAnterior
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Anterior
                          </button>
                          <div className="flex items-center gap-1">
                            {/* Mostrar até 5 números de página */}
                            {Array.from({ length: Math.min(5, paginacao.totalPaginas) }, (_, i) => {
                              let paginaNum
                              if (paginacao.totalPaginas <= 5) {
                                paginaNum = i + 1
                              } else if (paginacao.pagina <= 3) {
                                paginaNum = i + 1
                              } else if (paginacao.pagina >= paginacao.totalPaginas - 2) {
                                paginaNum = paginacao.totalPaginas - 4 + i
                              } else {
                                paginaNum = paginacao.pagina - 2 + i
                              }

                              if (paginaNum > paginacao.totalPaginas) return null

                              return (
                                <button
                                  key={paginaNum}
                                  onClick={() => irParaPagina(paginaNum)}
                                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                    paginacao.pagina === paginaNum
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {paginaNum}
                                </button>
                              )
                            })}
                          </div>
                          <button
                            onClick={proximaPagina}
                            disabled={!paginacao.temProxima}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              paginacao.temProxima
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                </>
              )}
            </div>
            </div>

          {(resultadosFiltrados.length > 0 || estatisticas.total > 0) && (
            <div className={`bg-indigo-50 border border-indigo-200 rounded-xl p-4 ${carregando ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-indigo-700 font-medium">
                    <Users className="w-4 h-4 inline mr-1" />
                    Mostrando <strong>{resultadosFiltrados.length}</strong> de <strong>{paginacao.total || estatisticas.total}</strong> resultados
                  </span>
                  {temFiltrosAtivos && (
                    <span className="text-indigo-600">
                      (Filtros aplicados)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-indigo-600">
                  <span className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    Bom desempenho (≥7.0)
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                    Desempenho médio (5.0-6.9)
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                    Desempenho abaixo (&lt;5.0)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Questões */}
          {alunoSelecionado && (
            <ModalQuestoesAluno
              alunoId={alunoSelecionado.id}
              anoLetivo={alunoSelecionado.anoLetivo}
              isOpen={modalAberto}
              onClose={() => {
                setModalAberto(false)
                setAlunoSelecionado(null)
              }}
            />
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

