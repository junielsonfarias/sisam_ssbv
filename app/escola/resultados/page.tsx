'use client'

import ProtectedRoute from '@/components/protected-route'
import LayoutDashboard from '@/components/layout-dashboard'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Search, BookOpen, Award, Filter, X, Users, Target, CheckCircle2, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { obterDisciplinasPorSerieSync, obterTodasDisciplinas } from '@/lib/disciplinas-por-serie'

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
  // Campos de configuração de questões por série (do banco)
  qtd_questoes_lp?: number | null
  qtd_questoes_mat?: number | null
  qtd_questoes_ch?: number | null
  qtd_questoes_cn?: number | null
}

interface Filtros {
  turma_id?: string
  ano_letivo?: string
  serie?: string
  presenca?: string
  tipo_ensino?: string
}

// Verifica se uma disciplina e aplicavel para a serie
const isDisciplinaAplicavel = (codigoDisciplina: string, serie: string | null | undefined): boolean => {
  if (!serie) return true
  const numeroSerie = serie.match(/(\d+)/)?.[1]
  // Anos iniciais (2, 3, 5): CH e CN nao sao aplicaveis
  if (numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5') {
    if (codigoDisciplina === 'CH' || codigoDisciplina === 'CN') {
      return false
    }
  }
  // Anos finais (6, 7, 8, 9): PROD e NIVEL nao sao aplicaveis
  if (numeroSerie === '6' || numeroSerie === '7' || numeroSerie === '8' || numeroSerie === '9') {
    if (codigoDisciplina === 'PROD' || codigoDisciplina === 'NIVEL') {
      return false
    }
  }
  return true
}

export default function ResultadosEscolaPage() {
  const [tipoUsuario, setTipoUsuario] = useState<string>('escola')
  const [resultados, setResultados] = useState<ResultadoConsolidado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<Filtros>({})
  const [escolaId, setEscolaId] = useState<string>('')
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
  const [turmas, setTurmas] = useState<any[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<{
    id: string;
    anoLetivo?: string;
    mediaAluno?: number | string | null;
    notasDisciplinas?: {
      nota_lp?: number | string | null;
      nota_ch?: number | string | null;
      nota_mat?: number | string | null;
      nota_cn?: number | string | null;
    };
  } | null>(null)

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

  // Estados para estatísticas da API
  const [estatisticasAPI, setEstatisticasAPI] = useState<{
    totalAlunos: number
    totalPresentes: number
    totalFaltas: number
    mediaGeral: number
    mediaLP: number
    mediaCH: number
    mediaMAT: number
    mediaCN: number
    mediaAnosIniciais: number
    totalAnosIniciais: number
    mediaAnosFinais: number
    totalAnosFinais: number
  }>({
    totalAlunos: 0,
    totalPresentes: 0,
    totalFaltas: 0,
    mediaGeral: 0,
    mediaLP: 0,
    mediaCH: 0,
    mediaMAT: 0,
    mediaCN: 0,
    mediaAnosIniciais: 0,
    totalAnosIniciais: 0,
    mediaAnosFinais: 0,
    totalAnosFinais: 0
  })

  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        const response = await fetch('/api/auth/verificar')
        const data = await response.json()
        if (data.usuario && data.usuario.escola_id) {
          setEscolaId(data.usuario.escola_id)
          
          // Carregar nome da escola e polo
          const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`)
          const escolaData = await escolaRes.json()
          if (Array.isArray(escolaData) && escolaData.length > 0) {
            setEscolaNome(escolaData[0].nome)
            setPoloNome(escolaData[0].polo_nome || '')
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error)
      }
    }
    carregarDadosIniciais()
  }, [])

  useEffect(() => {
    setPaginaAtual(1) // Resetar para primeira página ao mudar filtros
    carregarResultados(1)
  }, [filtros, escolaId])

  useEffect(() => {
    carregarTurmas()
  }, [filtros.serie, escolaId, filtros.ano_letivo])

  const carregarTurmas = async () => {
    if (!escolaId || !filtros.serie) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('escolas_ids', escolaId)
      params.append('serie', filtros.serie)
      
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

  const carregarResultados = async (pagina: number = paginaAtual, forcarAtualizacao: boolean = false) => {
    if (!escolaId) return

    try {
      setCarregando(true)

      const params = new URLSearchParams()
      params.append('escola_id', escolaId)

      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      // Parâmetros de paginação
      params.append('pagina', pagina.toString())
      params.append('limite', '50')

      // Forçar atualização do cache quando clicado no botão Pesquisar
      if (forcarAtualizacao) {
        params.append('atualizar_cache', 'true')
      }

      const response = await fetch(`/api/admin/resultados-consolidados?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar resultados')
      }

      const data = await response.json()

      // A API retorna {resultados: [...], estatisticas: {...}, paginacao: {...}}
      if (data.resultados && Array.isArray(data.resultados)) {
        setResultados(data.resultados)

        // Extrair séries únicas dos resultados (para o filtro)
        if (pagina === 1) {
          const seriesUnicas = [...new Set(data.resultados.map((r: ResultadoConsolidado) => r.serie).filter(Boolean))] as string[]
          setSeries(seriesUnicas.sort())
        }

        // Atualizar estatísticas da API (API retorna em camelCase)
        if (data.estatisticas) {
          setEstatisticasAPI({
            totalAlunos: data.estatisticas.totalAlunos || data.paginacao?.total || 0,
            totalPresentes: data.estatisticas.totalPresentes || 0,
            totalFaltas: data.estatisticas.totalFaltas || 0,
            mediaGeral: parseFloat(data.estatisticas.mediaGeral) || 0,
            mediaLP: parseFloat(data.estatisticas.mediaLP) || 0,
            mediaCH: parseFloat(data.estatisticas.mediaCH) || 0,
            mediaMAT: parseFloat(data.estatisticas.mediaMAT) || 0,
            mediaCN: parseFloat(data.estatisticas.mediaCN) || 0,
            mediaAnosIniciais: parseFloat(data.estatisticas.mediaAnosIniciais) || 0,
            totalAnosIniciais: data.estatisticas.totalAnosIniciais || 0,
            mediaAnosFinais: parseFloat(data.estatisticas.mediaAnosFinais) || 0,
            totalAnosFinais: data.estatisticas.totalAnosFinais || 0
          })
        }

        // Atualizar paginação
        if (data.paginacao) {
          setPaginacao({
            pagina: data.paginacao.pagina || pagina,
            limite: data.paginacao.limite || 50,
            total: data.paginacao.total || 0,
            totalPaginas: data.paginacao.totalPaginas || 1,
            temProxima: data.paginacao.temProxima || false,
            temAnterior: data.paginacao.temAnterior || false
          })
        }
      } else if (Array.isArray(data)) {
        // Fallback para resposta como array direto
        setResultados(data)
        const seriesUnicas = [...new Set(data.map((r: ResultadoConsolidado) => r.serie).filter(Boolean))] as string[]
        setSeries(seriesUnicas.sort())
      } else {
        setResultados([])
        setSeries([])
      }
    } catch (error) {
      console.error('Erro ao carregar resultados:', error)
      setResultados([])
      setSeries([])
    } finally {
      setCarregando(false)
    }
  }

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

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev }
      if (valor) {
        novo[campo] = valor
      } else {
        delete novo[campo]
      }
      
      // Se mudou a série, limpar turma selecionada
      if (campo === 'serie' && !valor) {
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
    let filtrados = resultados

    // Filtro de busca por nome do aluno
    if (busca.trim()) {
      const buscaLower = busca.toLowerCase()
      filtrados = filtrados.filter((r) =>
        r.aluno_nome.toLowerCase().includes(buscaLower)
      )
    }

    return filtrados
  }, [resultados, busca])

  const getPresencaColor = (presenca: string) => {
    if (presenca === 'P' || presenca === 'p') {
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
    }
    if (presenca === '-') {
      return 'bg-gray-100 text-gray-600'
    }
    return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
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
    return num.toFixed(2)
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

  // Função para obter o número de questões por disciplina: prioriza valores do banco
  const obterTotalQuestoes = useCallback((resultado: ResultadoConsolidado, codigoDisciplina: string): number => {
    // Primeiro, tentar usar os valores do banco (vindos da API)
    if (codigoDisciplina === 'LP' && resultado.qtd_questoes_lp) {
      return Number(resultado.qtd_questoes_lp)
    }
    if (codigoDisciplina === 'MAT' && resultado.qtd_questoes_mat) {
      return Number(resultado.qtd_questoes_mat)
    }
    if (codigoDisciplina === 'CH' && resultado.qtd_questoes_ch) {
      return Number(resultado.qtd_questoes_ch)
    }
    if (codigoDisciplina === 'CN' && resultado.qtd_questoes_cn) {
      return Number(resultado.qtd_questoes_cn)
    }

    // Fallback para valores hardcoded (quando não há dados do banco)
    const disciplinas = obterDisciplinasPorSerieSync(resultado.serie)
    const disciplina = disciplinas.find(d => d.codigo === codigoDisciplina)
    return disciplina?.total_questoes || 0
  }, [])

  // Função para verificar se a disciplina existe para a série
  const disciplinaExisteNaSerie = useCallback((serie: string, codigoDisciplina: string): boolean => {
    const disciplinas = obterDisciplinasPorSerieSync(serie)
    return disciplinas.some(d => d.codigo === codigoDisciplina)
  }, [])

  // Obter disciplinas que devem ser exibidas - SEMPRE mostrar todas as disciplinas
  // O N/A será tratado na renderização baseado na série de cada aluno
  const disciplinasExibir = useMemo(() => {
    return obterTodasDisciplinas()
  }, [])

  // Calcular estatísticas - EXCLUIR alunos faltantes
  const estatisticas = useMemo(() => {
    if (resultadosFiltrados.length === 0) {
      return {
        total: 0,
        mediaGeral: 0,
        presentes: 0,
        faltas: 0,
        mediaLP: 0,
        mediaCH: 0,
        mediaMAT: 0,
        mediaCN: 0,
      }
    }

    // Filtrar apenas alunos presentes (não faltantes)
    const alunosPresentes = resultadosFiltrados.filter((r) => {
      const presenca = r.presenca?.toString().toUpperCase()
      const mediaNum = getNotaNumero(r.media_aluno)
      // Considerar presente se presenca = 'P' E media não for 0 ou null
      return presenca === 'P' && mediaNum !== null && mediaNum !== 0
    })

    const medias = alunosPresentes
      .map((r) => getNotaNumero(r.media_aluno))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasLP = alunosPresentes
      .map((r) => getNotaNumero(r.nota_lp))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasCH = alunosPresentes
      .map((r) => getNotaNumero(r.nota_ch))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasMAT = alunosPresentes
      .map((r) => getNotaNumero(r.nota_mat))
      .filter((m): m is number => m !== null && m !== 0)

    const mediasCN = alunosPresentes
      .map((r) => getNotaNumero(r.nota_cn))
      .filter((m): m is number => m !== null && m !== 0)

    const presentes = alunosPresentes.length
    const faltas = resultadosFiltrados.length - presentes

    return {
      total: resultadosFiltrados.length,
      mediaGeral: medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : 0,
      presentes,
      faltas,
      mediaLP: mediasLP.length > 0 ? mediasLP.reduce((a, b) => a + b, 0) / mediasLP.length : 0,
      mediaCH: mediasCH.length > 0 ? mediasCH.reduce((a, b) => a + b, 0) / mediasCH.length : 0,
      mediaMAT: mediasMAT.length > 0 ? mediasMAT.reduce((a, b) => a + b, 0) / mediasMAT.length : 0,
      mediaCN: mediasCN.length > 0 ? mediasCN.reduce((a, b) => a + b, 0) / mediasCN.length : 0,
    }
  }, [resultadosFiltrados])

  const handleVisualizarQuestoes = (aluno: ResultadoConsolidado) => {
    setAlunoSelecionado({
      id: aluno.aluno_id || aluno.id,
      anoLetivo: filtros.ano_letivo,
      mediaAluno: aluno.media_aluno,
      notasDisciplinas: {
        nota_lp: aluno.nota_lp,
        nota_ch: aluno.nota_ch,
        nota_mat: aluno.nota_mat,
        nota_cn: aluno.nota_cn,
      },
    })
    setModalAberto(true)
  }

  const handleFecharModal = () => {
    setModalAberto(false)
    setAlunoSelecionado(null)
  }

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <LayoutDashboard tipoUsuario={tipoUsuario}>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Resultados Consolidados</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {escolaNome && `${escolaNome}`}
                {poloNome && <span className="text-gray-500 dark:text-gray-400"> - Polo: {poloNome}</span>}
              </p>
            </div>
            <button
              onClick={() => carregarResultados(1, true)}
              disabled={carregando}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm sm:text-base flex-shrink-0"
              title="Pesquisar dados (força atualização)"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              <span>Pesquisar</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-indigo-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Filtros</h2>
              </div>
              {temFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Polo
                </label>
                <input
                  type="text"
                  value={poloNome || '-'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Escola
                </label>
                <input
                  type="text"
                  value={escolaNome || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Ano Letivo
                </label>
                <input
                  type="text"
                  value={filtros.ano_letivo || ''}
                  onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Série
                </label>
                <select
                  value={filtros.serie || ''}
                  onChange={(e) => handleFiltroChange('serie', e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Turma
                </label>
                <select
                  value={filtros.turma_id || ''}
                  onChange={(e) => handleFiltroChange('turma_id', e.target.value)}
                  className="select-custom w-full"
                  disabled={!filtros.serie || turmas.length === 0}
                >
                  <option value="">Todas as turmas</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.codigo || turma.nome || `Turma ${turma.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tipo de Ensino
                </label>
                <select
                  value={filtros.tipo_ensino || ''}
                  onChange={(e) => handleFiltroChange('tipo_ensino', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos</option>
                  <option value="anos_iniciais">Anos Iniciais (1º-5º)</option>
                  <option value="anos_finais">Anos Finais (6º-9º)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Presença
                </label>
                <select
                  value={filtros.presenca || ''}
                  onChange={(e) => handleFiltroChange('presenca', e.target.value)}
                  className="select-custom w-full"
                >
                  <option value="">Todos</option>
                  <option value="P">Presentes</option>
                  <option value="F">Faltosos</option>
                </select>
              </div>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome do aluno..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Cards de Estatísticas */}
          {(estatisticasAPI.totalAlunos > 0 || paginacao.total > 0 || carregando) && (
            <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${carregando ? 'opacity-50' : ''}`}>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.totalAlunos || paginacao.total}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Total de Alunos</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.mediaGeral.toFixed(2)}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Média Geral</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.totalPresentes}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Presentes</p>
                <p className="text-[10px] sm:text-xs opacity-75 mt-1">
                  {estatisticasAPI.totalAlunos > 0 ? ((estatisticasAPI.totalPresentes / estatisticasAPI.totalAlunos) * 100).toFixed(1) : 0}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <X className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
                  <span className="text-2xl sm:text-3xl font-bold">{estatisticasAPI.totalFaltas}</span>
                </div>
                <p className="text-xs sm:text-sm opacity-90">Faltas</p>
                <p className="text-[10px] sm:text-xs opacity-75 mt-1">
                  {estatisticasAPI.totalAlunos > 0 ? ((estatisticasAPI.totalFaltas / estatisticasAPI.totalAlunos) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}

          {/* Cards Anos Iniciais e Anos Finais */}
          {(estatisticasAPI.totalAlunos > 0 || paginacao.total > 0 || carregando) && (estatisticasAPI.totalAnosIniciais > 0 || estatisticasAPI.totalAnosFinais > 0) && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${carregando ? 'opacity-50' : ''}`}>
              {/* Card Anos Iniciais */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/40 p-4 sm:p-6 rounded-xl shadow-md dark:shadow-slate-900/50 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Anos Iniciais</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">1º ao 5º Ano</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                      {estatisticasAPI.mediaAnosIniciais > 0 ? estatisticasAPI.mediaAnosIniciais.toFixed(2) : '-'}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      Média de desempenho
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      {estatisticasAPI.totalAnosIniciais.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">alunos avaliados</p>
                  </div>
                </div>
                {estatisticasAPI.mediaAnosIniciais > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
                    <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(estatisticasAPI.mediaAnosIniciais * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Anos Finais */}
              <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/40 p-4 sm:p-6 rounded-xl shadow-md dark:shadow-slate-900/50 border border-violet-200 dark:border-violet-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-500 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Anos Finais</p>
                      <p className="text-xs text-violet-600 dark:text-violet-400">6º ao 9º Ano</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl sm:text-4xl font-bold text-violet-700 dark:text-violet-400">
                      {estatisticasAPI.mediaAnosFinais > 0 ? estatisticasAPI.mediaAnosFinais.toFixed(2) : '-'}
                    </p>
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                      Média de desempenho
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                      {estatisticasAPI.totalAnosFinais.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">alunos avaliados</p>
                  </div>
                </div>
                {estatisticasAPI.mediaAnosFinais > 0 && (
                  <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-700">
                    <div className="w-full bg-violet-200 dark:bg-violet-800 rounded-full h-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(estatisticasAPI.mediaAnosFinais * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Médias por Área */}
          {(estatisticasAPI.totalAlunos > 0 || paginacao.total > 0 || carregando) && (
            <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 ${carregando ? 'opacity-50' : ''}`}>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Língua Portuguesa</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaLP)}`}>
                      {estatisticasAPI.mediaLP.toFixed(2)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 flex-shrink-0 ml-1" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full ${
                      estatisticasAPI.mediaLP >= 7 ? 'bg-green-500' : estatisticasAPI.mediaLP >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticasAPI.mediaLP / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Ciências Humanas</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaCH)}`}>
                      {estatisticasAPI.mediaCH.toFixed(2)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0 ml-1" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full ${
                      estatisticasAPI.mediaCH >= 7 ? 'bg-green-500' : estatisticasAPI.mediaCH >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticasAPI.mediaCH / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Matemática</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaMAT)}`}>
                      {estatisticasAPI.mediaMAT.toFixed(2)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0 ml-1" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full ${
                      estatisticasAPI.mediaMAT >= 7 ? 'bg-green-500' : estatisticasAPI.mediaMAT >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticasAPI.mediaMAT / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Ciências da Natureza</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaCN)}`}>
                      {estatisticasAPI.mediaCN.toFixed(2)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0 ml-1" />
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 sm:h-2">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full ${
                      estatisticasAPI.mediaCN >= 7 ? 'bg-green-500' : estatisticasAPI.mediaCN >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((estatisticasAPI.mediaCN / 10) * 100, 100)}%`, minWidth: '2px' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="flex-1 overflow-auto">
            {carregando ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Carregando resultados...</p>
              </div>
            ) : (
              <>
                {/* Visualização Mobile - Cards */}
                <div className="block sm:hidden space-y-4 p-4">
                  {resultadosFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</p>
                      <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">Não há resultados para exibir</p>
                    </div>
                  ) : (
                    resultadosFiltrados.map((resultado, index) => {
                    const mediaNum = getNotaNumero(resultado.media_aluno)
                    const notaLP = getNotaNumero(resultado.nota_lp)
                    const notaCH = getNotaNumero(resultado.nota_ch)
                    const notaMAT = getNotaNumero(resultado.nota_mat)
                    const notaCN = getNotaNumero(resultado.nota_cn)

                    return (
                      <div key={resultado.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm dark:shadow-slate-900/50">
                        {/* Cabeçalho do Card */}
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mr-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-sm flex-shrink-0">
                              {index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => handleVisualizarQuestoes(resultado)}
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
                              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
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
                        <div className="grid grid-cols-2 gap-2 mb-3" style={{ gridTemplateColumns: disciplinasExibir.length > 4 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
                          {disciplinasExibir.map((disciplina) => {
                            const nota = getNotaNumero(resultado[disciplina.campo_nota as keyof ResultadoConsolidado] as any)
                            const acertos = disciplina.campo_acertos ? resultado[disciplina.campo_acertos as keyof ResultadoConsolidado] as number | string : null
                            const aplicavel = isDisciplinaAplicavel(disciplina.codigo, resultado.serie)

                            return (
                              <div key={disciplina.codigo} className={`p-2 rounded-lg ${!aplicavel ? 'bg-gray-100 dark:bg-slate-700' : getNotaBgColor(nota)} border border-gray-200 dark:border-slate-600`}>
                                <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-0.5">{disciplina.codigo}</div>
                                {!aplicavel ? (
                                  <div className="text-base font-bold text-gray-400">N/A</div>
                                ) : disciplina.tipo === 'nivel' ? (
                                  <div className={`text-xs font-bold ${resultado.nivel_aprendizagem ? 'text-indigo-600' : 'text-gray-500'}`}>
                                    {resultado.nivel_aprendizagem || '-'}
                                  </div>
                                ) : (
                                  <>
                                    {obterTotalQuestoes(resultado, disciplina.codigo) && acertos !== null && (
                                      <div className="text-[10px] text-gray-600 dark:text-gray-400">{acertos}/{obterTotalQuestoes(resultado, disciplina.codigo)}</div>
                                    )}
                                    <div className={`text-base font-bold ${getNotaColor(nota)}`}>
                                      {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                                    </div>
                                    {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1 mt-0.5">
                                        <div
                                          className={`h-1 rounded-full ${
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
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                          <div className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg ${getNotaBgColor(resultado.media_aluno)} border-2 ${
                            mediaNum !== null && mediaNum >= 7 ? 'border-green-500' :
                            mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' :
                            'border-red-500'
                          }`}>
                            <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Média</div>
                            <div className={`text-xl font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                              {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleVisualizarQuestoes(resultado)}
                            className="flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium shadow-sm"
                            title="Ver questões do aluno"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Questões
                          </button>
                        </div>
                      </div>
                    )
                  }))}
                </div>

                {/* Visualização Tablet/Desktop - Tabela com header fixo */}
                <div className="hidden sm:block w-full h-full">
                  <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 min-w-[900px] lg:min-w-[1100px]">
                    <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 sticky top-0 z-20">
                        <tr>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-8 md:w-10 lg:w-12">
                            #
                          </th>
                          <th className="text-left py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 min-w-[120px] md:min-w-[140px] lg:min-w-[160px]">
                            Aluno
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
                            <th key={disciplina.codigo} className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                              {disciplina.codigo}
                            </th>
                          ))}
                          <th className="text-center py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-14 md:w-16 lg:w-18 bg-gradient-to-r from-indigo-50 to-indigo-100">
                            Média
                          </th>
                          <th className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2 font-bold text-indigo-900 text-[10px] sm:text-[10px] md:text-xs lg:text-sm uppercase tracking-wider border-b border-indigo-200 w-16 md:w-20 lg:w-24">
                            Ações
                          </th>
                        </tr>
                      </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {resultadosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 sm:py-12 text-center text-gray-500 dark:text-gray-400 px-4">
                          <Award className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" />
                          <p className="text-base sm:text-lg font-medium">Nenhum resultado encontrado</p>
                          <p className="text-xs sm:text-sm mt-1">Não há resultados para exibir</p>
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
                          <tr key={resultado.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100">
                            <td className="text-center py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-2.5 lg:px-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1 lg:py-2.5 lg:px-2">
                              <div className="flex flex-col">
                                <button
                                  onClick={() => handleVisualizarQuestoes(resultado)}
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
                                <div className="lg:hidden text-[9px] sm:text-[10px] md:text-xs text-gray-500 dark:text-gray-400 space-y-0.5 ml-6 sm:ml-7 md:ml-8 lg:ml-10">
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
                            <td className="hidden md:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                              <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[9px] md:text-[10px] lg:text-xs font-medium">
                                {resultado.turma_codigo || '-'}
                              </span>
                            </td>
                            <td className="hidden xl:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-2.5 lg:px-1.5 text-center">
                              <span className="inline-flex items-center px-1 md:px-1.5 lg:px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[9px] md:text-[10px] lg:text-xs font-medium">
                                {resultado.serie || '-'}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell py-1 px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                              <span
                                className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm ${getPresencaColor(
                                  resultado.presenca || 'P'
                                )}`}
                              >
                                {resultado.presenca === 'P' || resultado.presenca === 'p' ? '✓ Presente' : '✗ Falta'}
                              </span>
                            </td>
                            {disciplinasExibir.map((disciplina) => {
                              const nota = getNotaNumero(resultado[disciplina.campo_nota as keyof ResultadoConsolidado] as any)
                              const acertos = disciplina.campo_acertos ? resultado[disciplina.campo_acertos as keyof ResultadoConsolidado] as number | string : null
                              const aplicavel = isDisciplinaAplicavel(disciplina.codigo, resultado.serie)

                              return (
                                <td key={disciplina.codigo} className="py-1 px-0 sm:py-1.5 sm:px-0.5 md:py-2 md:px-1 lg:py-3 lg:px-2 text-center">
                                  {!aplicavel ? (
                                    <span className="text-gray-400 font-bold">N/A</span>
                                  ) : (
                                    <div className={`inline-flex flex-col items-center p-0.5 sm:p-1 md:p-1.5 lg:p-2 rounded-lg ${getNotaBgColor(nota)} w-full max-w-[50px] sm:max-w-[55px] md:max-w-[60px] lg:max-w-[70px]`}>
                                      {disciplina.tipo === 'objetiva' && acertos !== null && (
                                        <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 mb-0.5 font-medium">
                                          {acertos}/{obterTotalQuestoes(resultado, disciplina.codigo)}
                                        </div>
                                      )}
                                      <div className={`text-[10px] sm:text-[11px] md:text-xs lg:text-sm xl:text-base font-bold ${getNotaColor(nota)}`}>
                                        {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                                      </div>
                                      {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 md:h-1 mt-0.5 md:mt-1">
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
                                  <div className="mt-0.5 text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
                                    Média
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-1 px-0.5 sm:py-1.5 sm:px-1 md:py-2 md:px-1.5 lg:py-3 lg:px-2 text-center">
                              <button
                                onClick={() => handleVisualizarQuestoes(resultado)}
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
                {paginacao.totalPaginas > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm mt-4 gap-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Mostrando <span className="font-semibold">{((paginaAtual - 1) * paginacao.limite) + 1}</span> a{' '}
                      <span className="font-semibold">{Math.min(paginaAtual * paginacao.limite, paginacao.total)}</span> de{' '}
                      <span className="font-semibold">{paginacao.total}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={paginaAnterior}
                        disabled={!paginacao.temAnterior || carregando}
                        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          paginacao.temAnterior && !carregando
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Anterior</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {/* Primeira página */}
                        {paginaAtual > 2 && (
                          <>
                            <button
                              onClick={() => irParaPagina(1)}
                              className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              1
                            </button>
                            {paginaAtual > 3 && <span className="px-1 text-gray-400 dark:text-gray-500">...</span>}
                          </>
                        )}

                        {/* Página anterior */}
                        {paginaAtual > 1 && (
                          <button
                            onClick={() => irParaPagina(paginaAtual - 1)}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            {paginaAtual - 1}
                          </button>
                        )}

                        {/* Página atual */}
                        <button
                          className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white"
                        >
                          {paginaAtual}
                        </button>

                        {/* Próxima página */}
                        {paginaAtual < paginacao.totalPaginas && (
                          <button
                            onClick={() => irParaPagina(paginaAtual + 1)}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            {paginaAtual + 1}
                          </button>
                        )}

                        {/* Última página */}
                        {paginaAtual < paginacao.totalPaginas - 1 && (
                          <>
                            {paginaAtual < paginacao.totalPaginas - 2 && <span className="px-1 text-gray-400 dark:text-gray-500">...</span>}
                            <button
                              onClick={() => irParaPagina(paginacao.totalPaginas)}
                              className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              {paginacao.totalPaginas}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={proximaPagina}
                        disabled={!paginacao.temProxima || carregando}
                        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          paginacao.temProxima && !carregando
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          </div>

          {modalAberto && alunoSelecionado && (
            <ModalQuestoesAluno
              alunoId={alunoSelecionado.id}
              anoLetivo={alunoSelecionado.anoLetivo}
              mediaAluno={alunoSelecionado.mediaAluno}
              notasDisciplinas={alunoSelecionado.notasDisciplinas}
              isOpen={modalAberto}
              onClose={handleFecharModal}
            />
          )}
        </div>
      </LayoutDashboard>
    </ProtectedRoute>
  )
}

