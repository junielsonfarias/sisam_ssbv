'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Search, Filter, X, Users, Target, CheckCircle2,
  Eye, RefreshCw, AlertCircle
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

/**
 * Calcula o nível baseado na nota (fallback quando nivel_prod não está no banco)
 * Faixas: N1: <3, N2: 3-4.99, N3: 5-7.49, N4: >=7.5
 */
function calcularNivelPorNota(nota: number | string | null | undefined): string | null {
  if (nota === null || nota === undefined) return null
  const notaNum = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(notaNum) || notaNum <= 0) return null
  if (notaNum < 3) return 'N1'
  if (notaNum < 5) return 'N2'
  if (notaNum < 7.5) return 'N3'
  return 'N4'
}

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
  mediaProd: number
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
    mediaCN: 0,
    mediaProd: 0
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

      // Carregar séries da configuração (disponível para todos os usuários)
      promises.push(fetch('/api/admin/configuracao-series').then(r => r.json()).catch(() => ({ series: [] })))

      const [escolasData, polosData, seriesData] = await Promise.all(promises)
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
      setPolos(Array.isArray(polosData) ? polosData : [])

      // Carregar séries da configuração
      if (seriesData?.series && Array.isArray(seriesData.series)) {
        const seriesFormatadas = seriesData.series
          .map((s: { serie: string; nome_serie?: string }) => s.nome_serie || `${s.serie}º Ano`)
          .sort((a: string, b: string) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0')
            const numB = parseInt(b.match(/\d+/)?.[0] || '0')
            return numA - numB
          })
        setSeries(seriesFormatadas)
      }
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

  const carregarResultados = async (pagina: number = paginaAtual, forcarAtualizacao: boolean = false, buscaParam?: string) => {
    try {
      setCarregando(true)

      const params = new URLSearchParams()

      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      params.append('pagina', pagina.toString())
      params.append('limite', '50')

      // Adicionar busca como parâmetro do servidor
      const buscaAtual = buscaParam !== undefined ? buscaParam : busca
      if (buscaAtual && buscaAtual.trim()) {
        params.append('busca', buscaAtual.trim())
      }

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
            mediaProd: parseFloat(data.estatisticas.mediaProducao || data.estatisticas.mediaProd) || 0
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
      } else {
        setResultados([])
      }
    } catch (error) {
      console.error('Erro ao carregar resultados:', error)
      setResultados([])
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

  // A busca agora é feita no servidor, então apenas retorna os resultados
  const resultadosFiltrados = resultados

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

        {/* Busca - pesquisa no servidor em todas as páginas */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPaginaAtual(1)
                  carregarResultados(1, true, busca)
                }
              }}
              placeholder="Buscar por nome do aluno ou escola..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => {
              setPaginaAtual(1)
              carregarResultados(1, true, busca)
            }}
            disabled={carregando}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
          {busca && (
            <button
              onClick={() => {
                setBusca('')
                setPaginaAtual(1)
                carregarResultados(1, true, '')
              }}
              className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
      {(estatisticasAPI.totalAlunos > 0 || paginacao.total > 0 || carregando) && (() => {
        // Determinar quais disciplinas mostrar baseado na série selecionada
        const numSerie = filtros.serie?.replace(/[^0-9]/g, '') || ''
        const serieIsAnosIniciais = ['2', '3', '5'].includes(numSerie)
        const serieIsAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
        const temFiltroSerie = !!filtros.serie && filtros.serie.trim() !== ''

        // Lógica de exibição:
        // - Sem filtro de série: mostrar TODAS as 5 disciplinas
        // - Anos iniciais (2, 3, 5): mostrar apenas LP, MAT, PROD
        // - Anos finais (6, 7, 8, 9): mostrar apenas LP, MAT, CH, CN
        const mostrarProd = !temFiltroSerie || serieIsAnosIniciais
        const mostrarChCn = !temFiltroSerie || serieIsAnosFinais

        // Componente de Card de Disciplina com visual moderno
        const CardDisciplina = ({
          sigla,
          titulo,
          media,
          bgColor,
          borderColor,
          textColor,
          barColor
        }: {
          sigla: string
          titulo: string
          media: number
          bgColor: string
          borderColor: string
          textColor: string
          barColor: string
        }) => {
          const porcentagem = Math.min(Math.max((media / 10) * 100, 0), 100)
          const temMedia = media > 0

          return (
            <div className={`${bgColor} rounded-xl p-3 sm:p-4 border-2 ${borderColor} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs sm:text-sm font-bold ${textColor} uppercase tracking-wide bg-white/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-md`}>
                  {sigla}
                </span>
                <span className={`text-xl sm:text-2xl font-bold ${textColor}`}>
                  {temMedia ? media.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </span>
              </div>
              <div className="w-full bg-white/60 dark:bg-slate-800/60 rounded-full h-2 mb-2 shadow-inner overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${porcentagem}%`,
                    backgroundColor: barColor
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{titulo}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {temMedia ? `${porcentagem.toFixed(0)}%` : '—'}
                </p>
              </div>
            </div>
          )
        }

        return (
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6 ${carregando ? 'opacity-50' : ''}`}>
            {/* LP - sempre visível */}
            <CardDisciplina
              sigla="LP"
              titulo="Língua Portuguesa"
              media={estatisticasAPI.mediaLP}
              bgColor="bg-blue-50 dark:bg-blue-900/30"
              borderColor="border-blue-200 dark:border-blue-700"
              textColor="text-blue-700 dark:text-blue-300"
              barColor="#3B82F6"
            />

            {/* MAT - sempre visível */}
            <CardDisciplina
              sigla="MAT"
              titulo="Matemática"
              media={estatisticasAPI.mediaMAT}
              bgColor="bg-purple-50 dark:bg-purple-900/30"
              borderColor="border-purple-200 dark:border-purple-700"
              textColor="text-purple-700 dark:text-purple-300"
              barColor="#A855F7"
            />

            {/* PROD - mostrar para anos iniciais ou sem filtro */}
            {mostrarProd && (
              <CardDisciplina
                sigla="PROD"
                titulo="Produção Textual"
                media={estatisticasAPI.mediaProd}
                bgColor="bg-rose-50 dark:bg-rose-900/30"
                borderColor="border-rose-200 dark:border-rose-700"
                textColor="text-rose-700 dark:text-rose-300"
                barColor="#F43F5E"
              />
            )}

            {/* CH/CN - mostrar para anos finais ou sem filtro */}
            {mostrarChCn && (
              <>
                <CardDisciplina
                  sigla="CH"
                  titulo="Ciências Humanas"
                  media={estatisticasAPI.mediaCH}
                  bgColor="bg-amber-50 dark:bg-amber-900/30"
                  borderColor="border-amber-200 dark:border-amber-700"
                  textColor="text-amber-700 dark:text-amber-300"
                  barColor="#F59E0B"
                />

                <CardDisciplina
                  sigla="CN"
                  titulo="Ciências da Natureza"
                  media={estatisticasAPI.mediaCN}
                  bgColor="bg-emerald-50 dark:bg-emerald-900/30"
                  borderColor="border-emerald-200 dark:border-emerald-700"
                  textColor="text-emerald-700 dark:text-emerald-300"
                  barColor="#10B981"
                />
              </>
            )}
          </div>
        )
      })()}

      {/* Tabela de Resultados */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Resultados ({resultadosFiltrados.length} de {paginacao.total})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
              <tr>
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-12">
                  #
                </th>
                <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 min-w-[180px]">
                  Aluno
                </th>
                <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                  Escola
                </th>
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                  Turma
                </th>
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                  Série
                </th>
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700">
                  Presença
                </th>
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                  LP
                </th>
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                  MAT
                </th>
                {/* PROD - mostrar para anos iniciais ou sem filtro de série */}
                {(() => {
                  const numSerie = filtros.serie?.replace(/[^0-9]/g, '') || ''
                  const serieIsAnosIniciais = ['2', '3', '5'].includes(numSerie)
                  const temFiltroSerie = !!filtros.serie && filtros.serie.trim() !== ''
                  return (!temFiltroSerie || serieIsAnosIniciais) && (
                    <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                      PROD
                    </th>
                  )
                })()}
                {/* CH/CN - mostrar para anos finais ou sem filtro de série */}
                {(() => {
                  const numSerie = filtros.serie?.replace(/[^0-9]/g, '') || ''
                  const serieIsAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
                  const temFiltroSerie = !!filtros.serie && filtros.serie.trim() !== ''
                  return (!temFiltroSerie || serieIsAnosFinais) && (
                    <>
                      <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                        CH
                      </th>
                      <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                        CN
                      </th>
                    </>
                  )
                })()}
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-16">
                  Média
                </th>
                <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase tracking-wider border-b border-indigo-200 dark:border-indigo-700 w-24">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {carregando ? (
                <TableEmptyState
                  colSpan={13}
                  tipo="carregando"
                  titulo="Carregando..."
                />
              ) : resultadosFiltrados.length === 0 ? (
                <TableEmptyState
                  colSpan={13}
                  tipo="nao-pesquisado"
                  titulo="Nenhum resultado encontrado"
                  mensagem="Clique em Pesquisar para carregar os dados"
                />
              ) : (
                resultadosFiltrados.map((resultado, index) => {
                  const anosIniciais = isAnosIniciais(resultado.serie)
                  // Calcular número de ordem considerando paginação
                  const numeroOrdem = (paginaAtual - 1) * paginacao.limite + index + 1
                  return (
                    <tr key={resultado.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border-b border-gray-100 dark:border-slate-700">
                      <td className="text-center py-2 px-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                          {numeroOrdem}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleVisualizarQuestoes(resultado)}
                          className="flex items-center w-full text-left hover:opacity-80 transition-opacity"
                          title="Clique para ver questões do aluno"
                        >
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-2">
                            <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-xs">
                              {resultado.aluno_nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline text-sm truncate">
                            {resultado.aluno_nome}
                          </span>
                        </button>
                      </td>
                      <td className="py-2 px-2 text-sm text-gray-700 dark:text-gray-200">
                        {resultado.escola_nome}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-mono text-xs font-medium">
                          {resultado.turma_codigo || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium">
                          {resultado.serie || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getPresencaColor(resultado.presenca)}`}>
                          {resultado.presenca === 'P' || resultado.presenca === 'p'
                            ? '✓ Presente'
                            : resultado.presenca === '-'
                            ? '— Sem dados'
                            : '✗ Falta'}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <CelulaNotaComNivel
                          nota={resultado.nota_lp}
                          acertos={resultado.total_acertos_lp}
                          totalQuestoes={getTotalQuestoesPorSerie(resultado, 'LP')}
                          nivel={anosIniciais ? resultado.nivel_lp : undefined}
                          presenca={resultado.presenca}
                          tamanho="md"
                        />
                      </td>
                      <td className="py-2 px-1 text-center">
                        <CelulaNotaComNivel
                          nota={resultado.nota_mat}
                          acertos={resultado.total_acertos_mat}
                          totalQuestoes={getTotalQuestoesPorSerie(resultado, 'MAT')}
                          nivel={anosIniciais ? resultado.nivel_mat : undefined}
                          presenca={resultado.presenca}
                          tamanho="md"
                        />
                      </td>
                      {/* PROD - mostrar para anos iniciais ou sem filtro de série */}
                      {(() => {
                        const numSerie = filtros.serie?.replace(/[^0-9]/g, '') || ''
                        const serieIsAnosIniciais = ['2', '3', '5'].includes(numSerie)
                        const temFiltroSerie = !!filtros.serie && filtros.serie.trim() !== ''
                        return (!temFiltroSerie || serieIsAnosIniciais) && (
                          <td className="py-2 px-1 text-center">
                            <CelulaNotaComNivel
                              nota={resultado.nota_producao}
                              nivel={resultado.nivel_prod || calcularNivelPorNota(resultado.nota_producao)}
                              presenca={resultado.presenca}
                              naoAplicavel={!anosIniciais}
                              tamanho="md"
                            />
                          </td>
                        )
                      })()}
                      {/* CH/CN - mostrar para anos finais ou sem filtro de série */}
                      {(() => {
                        const numSerie = filtros.serie?.replace(/[^0-9]/g, '') || ''
                        const serieIsAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
                        const temFiltroSerie = !!filtros.serie && filtros.serie.trim() !== ''
                        return (!temFiltroSerie || serieIsAnosFinais) && (
                          <>
                            <td className="py-2 px-1 text-center">
                              <CelulaNotaComNivel
                                nota={resultado.nota_ch}
                                acertos={resultado.total_acertos_ch}
                                totalQuestoes={getTotalQuestoesPorSerie(resultado, 'CH')}
                                presenca={resultado.presenca}
                                naoAplicavel={anosIniciais}
                                tamanho="md"
                              />
                            </td>
                            <td className="py-2 px-1 text-center">
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
                        )
                      })()}
                      <td className="py-2 px-2 text-center">
                        <CelulaNotaComNivel
                          nota={resultado.media_aluno}
                          nivel={anosIniciais ? resultado.nivel_aluno : undefined}
                          presenca={resultado.presenca}
                          tamanho="md"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleVisualizarQuestoes(resultado)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium shadow-sm"
                          title="Ver questões do aluno"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Ver Questões</span>
                          <span className="sm:hidden">Ver</span>
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

        {/* Rodapé com legenda */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>Mostrando {resultadosFiltrados.length} de {paginacao.total} resultados</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600 dark:text-gray-300">Bom (≥7.0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-gray-600 dark:text-gray-300">Médio (5.0-6.9)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-600 dark:text-gray-300">Abaixo (&lt;5.0)</span>
            </div>
          </div>
        </div>
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
