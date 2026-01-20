'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Search, BookOpen, Award, Filter, X, Users, Target, CheckCircle2,
  Eye, RefreshCw
} from 'lucide-react'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'
import {
  isAnosIniciais,
  getNotaNumero,
  getNotaColor,
  getNotaBgColor,
  getPresencaColor,
  formatarNota
} from '@/lib/dados/utils'
import { AlunoSelecionado, OpcaoSelect } from '@/lib/dados/types'
import { NivelBadge, CelulaNotaComNivel, PaginationControls, TableEmptyState } from '@/components/dados'

interface ResultadoConsolidadoAnalise {
  id: string
  aluno_id?: string
  aluno_nome: string
  escola_nome: string
  escola_id?: string
  polo_id?: string
  polo_nome?: string
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
  nota_producao?: number | string | null
  media_aluno: number | string | null
  qtd_questoes_lp?: number | null
  qtd_questoes_mat?: number | null
  qtd_questoes_ch?: number | null
  qtd_questoes_cn?: number | null
  nivel_lp?: string | null
  nivel_mat?: string | null
  nivel_prod?: string | null
  nivel_aluno?: string | null
}

interface FiltrosAnalise {
  polo_id?: string
  escola_id?: string
  turma_id?: string
  ano_letivo?: string
  serie?: string
  presenca?: string
  tipo_ensino?: string
}

interface EstatisticasAnalise {
  totalAlunos: number
  totalPresentes: number
  totalFaltas: number
  mediaGeral: number
  mediaLP: number
  mediaCH: number
  mediaMAT: number
  mediaCN: number
}

interface PainelAnaliseProps {
  tipoUsuario: 'admin' | 'escola' | 'tecnico' | 'polo'
  titulo: string
  subtitulo: string
  resultadosEndpoint: string
  escolasEndpoint?: string
  turmasEndpoint?: string
  polosEndpoint?: string
  mostrarFiltroPolo?: boolean
  mostrarFiltroEscola?: boolean
  escolaIdFixo?: string
  poloIdFixo?: string
}

export default function PainelAnalise({
  tipoUsuario,
  titulo,
  subtitulo,
  resultadosEndpoint,
  escolasEndpoint,
  turmasEndpoint,
  polosEndpoint,
  mostrarFiltroPolo = false,
  mostrarFiltroEscola = true,
  escolaIdFixo,
  poloIdFixo
}: PainelAnaliseProps) {
  const [resultados, setResultados] = useState<ResultadoConsolidadoAnalise[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<FiltrosAnalise>(() => {
    const inicial: FiltrosAnalise = {}
    if (escolaIdFixo) inicial.escola_id = escolaIdFixo
    if (poloIdFixo) inicial.polo_id = poloIdFixo
    return inicial
  })
  const [polos, setPolos] = useState<OpcaoSelect[]>([])
  const [escolas, setEscolas] = useState<OpcaoSelect[]>([])
  const [turmas, setTurmas] = useState<OpcaoSelect[]>([])
  const [series, setSeries] = useState<string[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSelecionado | null>(null)

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

  const [estatisticasAPI, setEstatisticasAPI] = useState<EstatisticasAnalise>({
    totalAlunos: 0,
    totalPresentes: 0,
    totalFaltas: 0,
    mediaGeral: 0,
    mediaLP: 0,
    mediaCH: 0,
    mediaMAT: 0,
    mediaCN: 0
  })

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    try {
      const promises = []

      if (escolasEndpoint && mostrarFiltroEscola) {
        promises.push(fetch(escolasEndpoint).then(r => r.json()))
      } else {
        promises.push(Promise.resolve([]))
      }

      if (polosEndpoint && mostrarFiltroPolo) {
        promises.push(fetch(polosEndpoint).then(r => r.json()))
      } else {
        promises.push(Promise.resolve([]))
      }

      const [escolasData, polosData] = await Promise.all(promises)
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
      setPolos(Array.isArray(polosData) ? polosData : [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  useEffect(() => {
    setPaginaAtual(1)
    carregarResultados(1, true)
  }, [filtros])

  useEffect(() => {
    carregarTurmas()
  }, [filtros.serie, filtros.escola_id, filtros.ano_letivo])

  const carregarTurmas = async () => {
    if (!filtros.serie || !turmasEndpoint) {
      setTurmas([])
      return
    }

    try {
      const params = new URLSearchParams()
      if (filtros.escola_id) {
        params.append('escolas_ids', filtros.escola_id)
      }
      params.append('serie', filtros.serie)
      if (filtros.ano_letivo) {
        params.append('ano_letivo', filtros.ano_letivo)
      }

      const response = await fetch(`${turmasEndpoint}?${params.toString()}`)
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
    try {
      setCarregando(true)

      const params = new URLSearchParams()

      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      params.append('pagina', pagina.toString())
      params.append('limite', '50')

      if (forcarAtualizacao) {
        params.append('atualizar_cache', 'true')
      }

      const response = await fetch(`${resultadosEndpoint}?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar resultados')
      }

      const data = await response.json()

      if (data.resultados && Array.isArray(data.resultados)) {
        setResultados(data.resultados)

        if (pagina === 1) {
          const seriesUnicas = [...new Set(data.resultados.map((r: ResultadoConsolidadoAnalise) => r.serie).filter(Boolean))] as string[]
          setSeries(seriesUnicas.sort())
        }

        if (data.estatisticas) {
          setEstatisticasAPI({
            totalAlunos: data.estatisticas.totalAlunos || data.paginacao?.total || 0,
            totalPresentes: data.estatisticas.totalPresentes || 0,
            totalFaltas: data.estatisticas.totalFaltas || 0,
            mediaGeral: parseFloat(data.estatisticas.mediaGeral) || 0,
            mediaLP: parseFloat(data.estatisticas.mediaLP) || 0,
            mediaCH: parseFloat(data.estatisticas.mediaCH) || 0,
            mediaMAT: parseFloat(data.estatisticas.mediaMAT) || 0,
            mediaCN: parseFloat(data.estatisticas.mediaCN) || 0
          })
        }

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
        setResultados(data)
        const seriesUnicas = [...new Set(data.map((r: ResultadoConsolidadoAnalise) => r.serie).filter(Boolean))] as string[]
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

  const handleFiltroChange = (campo: keyof FiltrosAnalise, valor: string) => {
    setFiltros((prev) => {
      const novo = { ...prev }
      if (valor) {
        novo[campo] = valor
      } else {
        delete novo[campo]
      }

      if (campo === 'serie' && !valor) {
        delete novo.turma_id
      }

      if (campo === 'escola_id') {
        delete novo.turma_id
      }

      if (campo === 'serie' && valor) {
        if (isAnosIniciais(valor)) {
          novo.tipo_ensino = 'anos_iniciais'
        } else {
          const numero = valor.match(/(\d+)/)?.[1]
          if (numero && parseInt(numero) >= 6 && parseInt(numero) <= 9) {
            novo.tipo_ensino = 'anos_finais'
          }
        }
      }

      if (campo === 'serie' && !valor) {
        delete novo.tipo_ensino
      }

      if (campo === 'polo_id') {
        delete novo.escola_id
        delete novo.turma_id
      }

      return novo
    })
  }

  const limparFiltros = () => {
    const inicial: FiltrosAnalise = {}
    if (escolaIdFixo) inicial.escola_id = escolaIdFixo
    if (poloIdFixo) inicial.polo_id = poloIdFixo
    setFiltros(inicial)
    setBusca('')
  }

  const temFiltrosAtivos = useMemo(() => {
    const filtrosAtivos = Object.entries(filtros).filter(([key, value]) => {
      if (key === 'escola_id' && escolaIdFixo) return false
      if (key === 'polo_id' && poloIdFixo) return false
      return Boolean(value)
    })
    return filtrosAtivos.length > 0 || busca.trim() !== ''
  }, [filtros, busca, escolaIdFixo, poloIdFixo])

  const resultadosFiltrados = useMemo(() => {
    let filtrados = resultados

    if (busca.trim()) {
      const buscaLower = busca.toLowerCase()
      filtrados = filtrados.filter((r) =>
        r.aluno_nome.toLowerCase().includes(buscaLower) ||
        r.escola_nome?.toLowerCase().includes(buscaLower)
      )
    }

    return filtrados
  }, [resultados, busca])

  const escolasFiltradas = useMemo(() => {
    if (!filtros.polo_id) return escolas
    return escolas.filter(e => e.polo_id === filtros.polo_id)
  }, [escolas, filtros.polo_id])

  const getTotalQuestoesPorSerie = useCallback((resultado: ResultadoConsolidadoAnalise, codigoDisciplina: string): number | undefined => {
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

    const disciplinasSerie = obterDisciplinasPorSerieSync(resultado.serie)
    const disciplina = disciplinasSerie.find(d => d.codigo === codigoDisciplina)
    return disciplina?.total_questoes
  }, [])

  const handleVisualizarQuestoes = (aluno: ResultadoConsolidadoAnalise) => {
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
      niveisDisciplinas: {
        nivel_lp: aluno.nivel_lp,
        nivel_mat: aluno.nivel_mat,
        nivel_prod: aluno.nivel_prod,
        nivel_aluno: aluno.nivel_aluno
      }
    })
    setModalAberto(true)
  }

  const handleFecharModal = () => {
    setModalAberto(false)
    setAlunoSelecionado(null)
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{titulo}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {subtitulo}
          </p>
        </div>
        <button
          onClick={() => carregarResultados(1, true)}
          disabled={carregando}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm sm:text-base flex-shrink-0"
          title="Pesquisar dados (forca atualizacao)"
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

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-4">
          {mostrarFiltroPolo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Polo
              </label>
              <select
                value={filtros.polo_id || ''}
                onChange={(e) => handleFiltroChange('polo_id', e.target.value)}
                className="select-custom w-full"
                disabled={!!poloIdFixo}
              >
                <option value="">Todos os polos</option>
                {polos.map((polo) => (
                  <option key={polo.id} value={polo.id}>
                    {polo.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mostrarFiltroEscola && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Escola
              </label>
              <select
                value={filtros.escola_id || ''}
                onChange={(e) => handleFiltroChange('escola_id', e.target.value)}
                className="select-custom w-full"
                disabled={!!escolaIdFixo}
              >
                <option value="">Todas as escolas</option>
                {escolasFiltradas.map((escola) => (
                  <option key={escola.id} value={escola.id}>
                    {escola.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Ano Letivo
            </label>
            <input
              type="text"
              value={filtros.ano_letivo || ''}
              onChange={(e) => handleFiltroChange('ano_letivo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="Ex: 2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Serie
            </label>
            <select
              value={filtros.serie || ''}
              onChange={(e) => handleFiltroChange('serie', e.target.value)}
              className="select-custom w-full"
            >
              <option value="">Todas as series</option>
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
              <option value="anos_iniciais">Anos Iniciais (1o-5o)</option>
              <option value="anos_finais">Anos Finais (6o-9o)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Presenca
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
            placeholder="Buscar por nome do aluno ou escola..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Cards de Estatisticas */}
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
            <p className="text-xs sm:text-sm opacity-90">Media Geral</p>
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

      {/* Medias por Area */}
      {(estatisticasAPI.totalAlunos > 0 || paginacao.total > 0 || carregando) && (
        <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 ${carregando ? 'opacity-50' : ''}`}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Lingua Portuguesa</p>
                <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaLP)}`}>
                  {estatisticasAPI.mediaLP.toFixed(2)}
                </p>
              </div>
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 opacity-50 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Matematica</p>
                <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaMAT)}`}>
                  {estatisticasAPI.mediaMAT.toFixed(2)}
                </p>
              </div>
              <Award className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 opacity-50 flex-shrink-0" />
            </div>
          </div>

          {(!filtros.tipo_ensino || filtros.tipo_ensino === 'anos_finais') && (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Ciencias Humanas</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaCH)}`}>
                      {estatisticasAPI.mediaCH.toFixed(2)}
                    </p>
                  </div>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 opacity-50 flex-shrink-0" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 mb-1 truncate">Ciencias da Natureza</p>
                    <p className={`text-lg sm:text-xl font-bold ${getNotaColor(estatisticasAPI.mediaCN)}`}>
                      {estatisticasAPI.mediaCN.toFixed(2)}
                    </p>
                  </div>
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 opacity-50 flex-shrink-0" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tabela de Resultados */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Resultados ({resultadosFiltrados.length} de {paginacao.total})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Aluno
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Escola
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Serie
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Turma
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Pres.
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  LP
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  MAT
                </th>
                {(!filtros.tipo_ensino || filtros.tipo_ensino === 'anos_finais') && (
                  <>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      CH
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      CN
                    </th>
                  </>
                )}
                {(!filtros.tipo_ensino || filtros.tipo_ensino === 'anos_iniciais') && (
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    PROD
                  </th>
                )}
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Media
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {carregando ? (
                <TableEmptyState
                  colSpan={12}
                  tipo="carregando"
                  titulo="Carregando..."
                />
              ) : resultadosFiltrados.length === 0 ? (
                <TableEmptyState
                  colSpan={12}
                  tipo="nao-pesquisado"
                  titulo="Nenhum resultado encontrado"
                  mensagem="Clique em Pesquisar para carregar os dados"
                />
              ) : (
                resultadosFiltrados.map((resultado) => {
                  const anosIniciais = isAnosIniciais(resultado.serie)
                  return (
                    <tr key={resultado.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white font-medium">
                        {resultado.aluno_nome}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {resultado.escola_nome}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-600 dark:text-gray-300">
                        {resultado.serie}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-600 dark:text-gray-300">
                        {resultado.turma_codigo}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${getPresencaColor(resultado.presenca)}`}>
                          {resultado.presenca}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <CelulaNotaComNivel
                          nota={resultado.nota_lp}
                          acertos={resultado.total_acertos_lp}
                          totalQuestoes={getTotalQuestoesPorSerie(resultado, 'LP')}
                          nivel={anosIniciais ? resultado.nivel_lp : undefined}
                          presenca={resultado.presenca}
                          tamanho="md"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <CelulaNotaComNivel
                          nota={resultado.nota_mat}
                          acertos={resultado.total_acertos_mat}
                          totalQuestoes={getTotalQuestoesPorSerie(resultado, 'MAT')}
                          nivel={anosIniciais ? resultado.nivel_mat : undefined}
                          presenca={resultado.presenca}
                          tamanho="md"
                        />
                      </td>
                      {(!filtros.tipo_ensino || filtros.tipo_ensino === 'anos_finais') && (
                        <>
                          <td className="px-3 py-2 text-center">
                            <CelulaNotaComNivel
                              nota={resultado.nota_ch}
                              acertos={resultado.total_acertos_ch}
                              totalQuestoes={getTotalQuestoesPorSerie(resultado, 'CH')}
                              presenca={resultado.presenca}
                              naoAplicavel={anosIniciais}
                              tamanho="md"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <CelulaNotaComNivel
                              nota={resultado.nota_cn}
                              acertos={resultado.total_acertos_cn}
                              totalQuestoes={getTotalQuestoesPorSerie(resultado, 'CN')}
                              presenca={resultado.presenca}
                              naoAplicavel={anosIniciais}
                              tamanho="md"
                            />
                          </td>
                        </>
                      )}
                      {(!filtros.tipo_ensino || filtros.tipo_ensino === 'anos_iniciais') && (
                        <td className="px-3 py-2 text-center">
                          <CelulaNotaComNivel
                            nota={resultado.nota_producao}
                            nivel={resultado.nivel_prod}
                            presenca={resultado.presenca}
                            naoAplicavel={!anosIniciais}
                            tamanho="md"
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 text-center">
                        <CelulaNotaComNivel
                          nota={resultado.media_aluno}
                          nivel={anosIniciais ? resultado.nivel_aluno : undefined}
                          presenca={resultado.presenca}
                          tamanho="md"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleVisualizarQuestoes(resultado)}
                          className="inline-flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title="Ver questoes do aluno"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        <PaginationControls
          paginaAtual={paginaAtual}
          totalPaginas={paginacao.totalPaginas}
          temProxima={paginacao.temProxima}
          temAnterior={paginacao.temAnterior}
          onProxima={proximaPagina}
          onAnterior={paginaAnterior}
        />
      </div>

      {/* Modal */}
      {alunoSelecionado && (
        <ModalQuestoesAluno
          alunoId={alunoSelecionado.id}
          anoLetivo={alunoSelecionado.anoLetivo}
          mediaAluno={alunoSelecionado.mediaAluno}
          notasDisciplinas={alunoSelecionado.notasDisciplinas}
          niveisDisciplinas={alunoSelecionado.niveisDisciplinas}
          isOpen={modalAberto}
          onClose={handleFecharModal}
        />
      )}
    </div>
  )
}
