'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  BarChart3, School, Users, GraduationCap, BookOpen, TrendingUp,
  CheckCircle, XCircle, Search, Filter, X, Eye, ChevronLeft, ChevronRight,
  Award, Target, CheckCircle2, RefreshCw
} from 'lucide-react'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { obterDisciplinasPorSerieSync, obterTodasDisciplinas } from '@/lib/disciplinas-por-serie'
import {
  isCacheValid,
  getCachedEstatisticas,
  getCachedEscolas,
  getCachedTurmas,
  getCachedSeries
} from '@/lib/dashboard-cache'

// Tipos
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

interface Escola {
  id: string
  nome: string
  polo_id?: string
  polo_nome?: string
  total_alunos?: number
  total_turmas?: number
  media_geral?: number
}

interface Turma {
  id: string
  codigo: string
  nome?: string
  escola_id?: string
  escola_nome?: string
  serie?: string
  total_alunos?: number
  media_geral?: number
  media_lp?: number
  media_mat?: number
  media_prod?: number
  media_ch?: number
  media_cn?: number
  presentes?: number
  faltantes?: number
}

interface Estatisticas {
  totalEscolas: number
  totalPolos: number
  totalResultados: number
  totalAlunos: number           // Total cadastrado (tabela alunos)
  totalAlunosAvaliados: number  // Total com resultados (P ou F)
  totalTurmas: number
  totalAlunosPresentes: number
  totalAlunosFaltantes: number
  mediaGeral: number
  mediaAnosIniciais: number
  mediaAnosFinais: number
  totalAnosIniciais: number
  totalAnosFinais: number
  nomeEscola?: string
  nomePolo?: string
}

interface PainelDadosProps {
  tipoUsuario: 'admin' | 'escola' | 'tecnico' | 'polo'
  estatisticasEndpoint: string
  resultadosEndpoint: string
  escolasEndpoint?: string
  turmasEndpoint?: string
}

type AbaAtiva = 'geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'

// Funcs auxiliares
const isAnosIniciais = (serie: string | undefined | null): boolean => {
  if (!serie) return false
  const numero = serie.match(/(\d+)/)?.[1]
  return numero === '2' || numero === '3' || numero === '5'
}

// Determina a etapa de ensino baseado na série
const getEtapaFromSerie = (serie: string | undefined | null): string | undefined => {
  if (!serie) return undefined
  const numero = serie.match(/(\d+)/)?.[1]
  if (!numero) return undefined
  if (['2', '3', '5'].includes(numero)) return 'anos_iniciais'
  if (['6', '7', '8', '9'].includes(numero)) return 'anos_finais'
  return undefined
}

// Filtra séries baseado na etapa de ensino
const getSeriesByEtapa = (etapa: string | undefined, todasSeries: string[]): string[] => {
  if (!etapa) return todasSeries
  return todasSeries.filter(serie => {
    const numero = serie.match(/(\d+)/)?.[1]
    if (!numero) return false
    if (etapa === 'anos_iniciais') return ['2', '3', '5'].includes(numero)
    if (etapa === 'anos_finais') return ['6', '7', '8', '9'].includes(numero)
    return true
  })
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

const getPresencaColor = (presenca: string) => {
  if (presenca === 'P' || presenca === 'p') return 'bg-green-100 text-green-800'
  if (presenca === 'F' || presenca === 'f') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
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

const formatarNota = (nota: number | string | null | undefined, presenca?: string, mediaAluno?: number | string | null, codigoDisciplina?: string, serie?: string | null): string => {
  // Se a disciplina nao e aplicavel para a serie, retornar N/A
  if (codigoDisciplina && serie && !isDisciplinaAplicavel(codigoDisciplina, serie)) {
    return 'N/A'
  }
  if (presenca === 'F' || presenca === 'f') return '-'
  if (nota === null || nota === undefined || nota === '') return '-'
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(num)) return '-'
  if (num === 0) return '-'
  return num.toFixed(2)
}

const getNivelColor = (nivel: string | undefined | null): string => {
  if (!nivel) return 'bg-gray-100 text-gray-700'
  const nivelLower = nivel.toLowerCase()
  if (nivelLower.includes('avançado') || nivelLower.includes('avancado')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300'
  if (nivelLower.includes('adequado')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300'
  if (nivelLower.includes('básico') || nivelLower.includes('basico')) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300'
  if (nivelLower.includes('insuficiente')) return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300'
  return 'bg-gray-100 text-gray-700'
}

export default function PainelDados({
  tipoUsuario,
  estatisticasEndpoint,
  resultadosEndpoint,
  escolasEndpoint,
  turmasEndpoint
}: PainelDadosProps) {
  // Estados
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('geral')
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalEscolas: 0,
    totalPolos: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalAlunosAvaliados: 0,
    totalTurmas: 0,
    totalAlunosPresentes: 0,
    totalAlunosFaltantes: 0,
    mediaGeral: 0,
    mediaAnosIniciais: 0,
    mediaAnosFinais: 0,
    totalAnosIniciais: 0,
    totalAnosFinais: 0,
  })
  const [carregando, setCarregando] = useState(true)

  // Estados para aba Escolas
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [buscaEscola, setBuscaEscola] = useState('')

  // Estados para aba Turmas
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [buscaTurma, setBuscaTurma] = useState('')

  // Estados para aba Alunos (similar a resultados consolidados)
  const [resultados, setResultados] = useState<ResultadoConsolidado[]>([])
  const [buscaAluno, setBuscaAluno] = useState('')
  const [filtrosAlunos, setFiltrosAlunos] = useState<{
    escola_id?: string
    turma_id?: string
    serie?: string
    presenca?: string
    etapa_ensino?: string
  }>({})
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0,
    temProxima: false,
    temAnterior: false
  })

  // Modal
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


  // Listas para filtros
  const [listaEscolas, setListaEscolas] = useState<any[]>([])
  const [listaTurmas, setListaTurmas] = useState<any[]>([])
  const [listaSeries, setListaSeries] = useState<string[]>(['2º Ano', '3º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'])

  // Controle de carregamento
  const [filtrosCarregados, setFiltrosCarregados] = useState(false)
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [carregandoEscolas, setCarregandoEscolas] = useState(false)
  const [carregandoTurmas, setCarregandoTurmas] = useState(false)
  const [pesquisouEscolas, setPesquisouEscolas] = useState(false)
  const [pesquisouTurmas, setPesquisouTurmas] = useState(false)
  const [pesquisouAlunos, setPesquisouAlunos] = useState(false)

  // Carregar estatísticas da aba Geral AUTOMATICAMENTE (do cache ou API)
  useEffect(() => {
    const carregarEstatisticas = async () => {
      // Tentar usar cache local primeiro (sincronizado no login)
      if (isCacheValid()) {
        const cachedStats = getCachedEstatisticas()
        if (cachedStats) {
          console.log('[PainelDados] Usando estatísticas do cache local')
          setEstatisticas({
            totalEscolas: Number(cachedStats.totalEscolas) || 0,
            totalPolos: Number(cachedStats.totalPolos) || 0,
            totalResultados: Number(cachedStats.totalResultados) || 0,
            totalAlunos: Number(cachedStats.totalAlunos) || 0,
            totalAlunosAvaliados: Number(cachedStats.totalAlunosAvaliados) || 0,
            totalTurmas: Number(cachedStats.totalTurmas) || 0,
            totalAlunosPresentes: Number(cachedStats.totalAlunosPresentes) || 0,
            totalAlunosFaltantes: Number(cachedStats.totalAlunosFaltantes) || 0,
            mediaGeral: Number(cachedStats.mediaGeral) || 0,
            mediaAnosIniciais: Number(cachedStats.mediaAnosIniciais) || 0,
            mediaAnosFinais: Number(cachedStats.mediaAnosFinais) || 0,
            totalAnosIniciais: Number(cachedStats.totalAnosIniciais) || 0,
            totalAnosFinais: Number(cachedStats.totalAnosFinais) || 0,
            nomeEscola: cachedStats.nomeEscola || '',
            nomePolo: cachedStats.nomePolo || '',
          })
          setCarregando(false)
          return
        }
      }

      // Fallback: buscar da API se cache não disponível
      try {
        console.log('[PainelDados] Cache não disponível, buscando da API')
        const response = await fetch(estatisticasEndpoint)

        if (!response.ok) {
          console.error('Erro ao buscar estatísticas:', response.status)
          setCarregando(false)
          return
        }

        const data = await response.json()
        if (data) {
          setEstatisticas({
            totalEscolas: Number(data.totalEscolas) || 0,
            totalPolos: Number(data.totalPolos) || 0,
            totalResultados: Number(data.totalResultados) || 0,
            totalAlunos: Number(data.totalAlunos) || 0,
            totalAlunosAvaliados: Number(data.totalAlunosAvaliados) || 0,
            totalTurmas: Number(data.totalTurmas) || 0,
            totalAlunosPresentes: Number(data.totalAlunosPresentes) || 0,
            totalAlunosFaltantes: Number(data.totalAlunosFaltantes) || 0,
            mediaGeral: Number(data.mediaGeral) || 0,
            mediaAnosIniciais: Number(data.mediaAnosIniciais) || 0,
            mediaAnosFinais: Number(data.mediaAnosFinais) || 0,
            totalAnosIniciais: Number(data.totalAnosIniciais) || 0,
            totalAnosFinais: Number(data.totalAnosFinais) || 0,
            nomeEscola: data.nomeEscola || '',
            nomePolo: data.nomePolo || '',
          })
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      } finally {
        setCarregando(false)
      }
    }

    carregarEstatisticas()
  }, [estatisticasEndpoint])

  // NÃO carregar NADA automaticamente - apenas quando clicar em Pesquisar
  // Carregar filtros do cache de forma SÍNCRONA apenas uma vez na montagem (sem API)
  useEffect(() => {
    if (!filtrosCarregados && isCacheValid()) {
      const cachedEscolas = getCachedEscolas()
      const cachedTurmas = getCachedTurmas()
      const cachedSeries = getCachedSeries()

      if (cachedEscolas && cachedEscolas.length > 0) {
        setListaEscolas(cachedEscolas)
      }
      if (cachedTurmas && cachedTurmas.length > 0) {
        setListaTurmas(cachedTurmas)
      }
      if (cachedSeries && cachedSeries.length > 0) {
        setListaSeries(cachedSeries)
      }
      setFiltrosCarregados(true)
    }
  }, [filtrosCarregados])

  // NÃO carregar alunos automaticamente - apenas quando clicar em Pesquisar

  const carregarEscolas = async () => {
    if (!escolasEndpoint) return
    try {
      setCarregandoEscolas(true)

      // Tentar usar cache local primeiro
      if (isCacheValid()) {
        const cachedEscolas = getCachedEscolas()
        if (cachedEscolas && cachedEscolas.length > 0) {
          console.log('[PainelDados] Usando escolas do cache local')
          setEscolas(cachedEscolas)
          setPesquisouEscolas(true)
          setCarregandoEscolas(false)
          return
        }
      }

      // Fallback: buscar da API
      console.log('[PainelDados] Cache não disponível, buscando escolas da API')
      const response = await fetch(escolasEndpoint)
      if (response.ok) {
        const data = await response.json()
        setEscolas(Array.isArray(data) ? data : data.escolas || [])
      }
      setPesquisouEscolas(true)
    } catch (error) {
      console.error('Erro ao carregar escolas:', error)
    } finally {
      setCarregandoEscolas(false)
    }
  }

  const carregarTurmas = async () => {
    if (!turmasEndpoint) return
    try {
      setCarregandoTurmas(true)

      // Tentar usar cache local primeiro
      if (isCacheValid()) {
        const cachedTurmas = getCachedTurmas()
        if (cachedTurmas && cachedTurmas.length > 0) {
          console.log('[PainelDados] Usando turmas do cache local')
          setTurmas(cachedTurmas)
          setPesquisouTurmas(true)
          setCarregandoTurmas(false)
          return
        }
      }

      // Fallback: buscar da API
      console.log('[PainelDados] Cache não disponível, buscando turmas da API')
      const response = await fetch(turmasEndpoint)
      if (response.ok) {
        const data = await response.json()
        setTurmas(Array.isArray(data) ? data : data.turmas || [])
      }
      setPesquisouTurmas(true)
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    } finally {
      setCarregandoTurmas(false)
    }
  }

  // Função que recebe filtros como parâmetro para garantir valores atualizados
  const carregarAlunosComFiltros = useCallback(async (
    filtros: typeof filtrosAlunos,
    busca: string,
    pagina: number
  ) => {
    if (carregandoAlunos) return // Evita chamadas duplicadas

    try {
      setCarregandoAlunos(true)
      setCarregando(true)
      const params = new URLSearchParams()
      params.set('pagina', pagina.toString())
      params.set('limite', '50')

      if (filtros.escola_id) params.set('escola_id', filtros.escola_id)
      if (filtros.turma_id) params.set('turma_id', filtros.turma_id)
      if (filtros.serie) params.set('serie', filtros.serie)
      if (filtros.presenca) params.set('presenca', filtros.presenca)
      if (filtros.etapa_ensino) params.set('tipo_ensino', filtros.etapa_ensino)
      if (busca) params.set('busca', busca)

      const response = await fetch(`${resultadosEndpoint}?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setResultados(data.resultados || [])
        setPaginacao({
          pagina: data.paginacao?.pagina || 1,
          limite: data.paginacao?.limite || 50,
          total: data.paginacao?.total || 0,
          totalPaginas: data.paginacao?.totalPaginas || 0,
          temProxima: data.paginacao?.temProxima || false,
          temAnterior: data.paginacao?.temAnterior || false
        })
        setPaginaAtual(pagina)
        setPesquisouAlunos(true)
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error)
    } finally {
      setCarregandoAlunos(false)
      setCarregando(false)
    }
  }, [resultadosEndpoint, carregandoAlunos])

  // Wrapper para compatibilidade com chamadas existentes
  const carregarAlunos = useCallback((pagina = 1) => {
    carregarAlunosComFiltros(filtrosAlunos, buscaAluno, pagina)
  }, [carregarAlunosComFiltros, filtrosAlunos, buscaAluno])

  const carregarFiltros = async () => {
    try {
      // Tentar usar cache local primeiro (sincronizado no login)
      if (isCacheValid()) {
        const cachedEscolas = getCachedEscolas()
        const cachedTurmas = getCachedTurmas()
        const cachedSeries = getCachedSeries()

        console.log('[PainelDados] Usando filtros do cache local')

        if (cachedEscolas && cachedEscolas.length > 0) {
          setListaEscolas(cachedEscolas)
        }
        if (cachedTurmas && cachedTurmas.length > 0) {
          setListaTurmas(cachedTurmas)
        }
        if (cachedSeries && cachedSeries.length > 0) {
          setListaSeries(cachedSeries)
        }

        setFiltrosCarregados(true)
        return
      }

      // Fallback: Carregar escolas e turmas em PARALELO da API
      console.log('[PainelDados] Cache não disponível, buscando filtros da API')
      const promises: Promise<void>[] = []

      if (escolasEndpoint) {
        promises.push(
          fetch(escolasEndpoint)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) setListaEscolas(Array.isArray(data) ? data : data.escolas || [])
            })
        )
      }

      if (turmasEndpoint) {
        promises.push(
          fetch(turmasEndpoint)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) setListaTurmas(Array.isArray(data) ? data : data.turmas || [])
            })
        )
      }

      await Promise.all(promises)
      setFiltrosCarregados(true)
    } catch (error) {
      console.error('Erro ao carregar filtros:', error)
      setFiltrosCarregados(true) // Mesmo com erro, marca como carregado para não travar
    }
  }

  // Disciplinas para exibir - SEMPRE mostrar todas as disciplinas
  // O N/A será tratado na renderização baseado na série de cada aluno
  const disciplinasExibir = useMemo(() => {
    return obterTodasDisciplinas()
  }, [])

  // Função para obter total de questões: prioriza valores do banco, depois fallback para hardcoded
  const getTotalQuestoesPorSerie = useCallback((resultado: ResultadoConsolidado, codigoDisciplina: string): number | undefined => {
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
    const disciplinasSerie = obterDisciplinasPorSerieSync(resultado.serie)
    const disciplina = disciplinasSerie.find(d => d.codigo === codigoDisciplina)
    return disciplina?.total_questoes
  }, [])

  // Filtrar escolas por busca
  const escolasFiltradas = useMemo(() => {
    if (!buscaEscola) return escolas
    return escolas.filter(e =>
      e.nome.toLowerCase().includes(buscaEscola.toLowerCase())
    )
  }, [escolas, buscaEscola])

  // Filtrar turmas por busca
  const turmasFiltradas = useMemo(() => {
    if (!buscaTurma) return turmas
    return turmas.filter(t =>
      t.codigo?.toLowerCase().includes(buscaTurma.toLowerCase()) ||
      t.nome?.toLowerCase().includes(buscaTurma.toLowerCase()) ||
      t.escola_nome?.toLowerCase().includes(buscaTurma.toLowerCase())
    )
  }, [turmas, buscaTurma])

  // Titulo baseado no tipo de usuario
  const getTitulo = () => {
    switch (tipoUsuario) {
      case 'admin': return 'Painel Administrativo'
      case 'escola': return `Painel da Escola${estatisticas.nomeEscola ? ` - ${estatisticas.nomeEscola}` : ''}`
      case 'tecnico': return 'Painel Técnico'
      case 'polo': return `Painel do Polo${estatisticas.nomePolo ? ` - ${estatisticas.nomePolo}` : ''}`
      default: return 'Painel de Dados'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{getTitulo()}</h1>
        {estatisticas.nomePolo && tipoUsuario === 'escola' && (
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">Polo: {estatisticas.nomePolo}</p>
        )}
      </div>

      {/* Conteudo das Abas */}
      <div className="space-y-4">
      {abaAtiva === 'geral' && (
        <AbaGeral estatisticas={estatisticas} tipoUsuario={tipoUsuario} carregando={carregando} />
      )}

      {abaAtiva === 'escolas' && (
        <AbaEscolas
          escolas={escolasFiltradas}
          busca={buscaEscola}
          setBusca={setBuscaEscola}
          carregando={carregandoEscolas}
          pesquisou={pesquisouEscolas}
          onPesquisar={carregarEscolas}
        />
      )}

      {abaAtiva === 'turmas' && (
        <AbaTurmas
          turmas={turmasFiltradas}
          busca={buscaTurma}
          setBusca={setBuscaTurma}
          carregando={carregandoTurmas}
          pesquisou={pesquisouTurmas}
          onPesquisar={carregarTurmas}
        />
      )}

      {abaAtiva === 'alunos' && (
        <AbaAlunos
          resultados={resultados}
          busca={buscaAluno}
          setBusca={setBuscaAluno}
          filtros={filtrosAlunos}
          setFiltros={setFiltrosAlunos}
          listaEscolas={listaEscolas}
          listaTurmas={listaTurmas}
          listaSeries={listaSeries}
          paginacao={paginacao}
          paginaAtual={paginaAtual}
          carregarAlunos={carregarAlunos}
          carregarAlunosComFiltros={carregarAlunosComFiltros}
          carregando={carregando || carregandoAlunos}
          disciplinasExibir={disciplinasExibir}
          getTotalQuestoesPorSerie={getTotalQuestoesPorSerie}
          setAlunoSelecionado={setAlunoSelecionado}
          setModalAberto={setModalAberto}
          tipoUsuario={tipoUsuario}
          getEtapaFromSerie={getEtapaFromSerie}
          getSeriesByEtapa={getSeriesByEtapa}
        />
      )}

      {abaAtiva === 'analises' && (
        <AbaAnalises estatisticas={estatisticas} carregando={carregando} />
      )}
      </div>

      {/* Modal de Questoes */}
      {alunoSelecionado && (
        <ModalQuestoesAluno
          alunoId={alunoSelecionado.id}
          anoLetivo={alunoSelecionado.anoLetivo}
          mediaAluno={alunoSelecionado.mediaAluno}
          notasDisciplinas={alunoSelecionado.notasDisciplinas}
          isOpen={modalAberto}
          onClose={() => {
            setModalAberto(false)
            setAlunoSelecionado(null)
          }}
        />
      )}
    </div>
  )
}

// Componente Aba Geral
function AbaGeral({ estatisticas, tipoUsuario, carregando }: { estatisticas: Estatisticas; tipoUsuario: string; carregando: boolean }) {
  // Base para calculo de percentuais: alunos avaliados (com P ou F), nao total cadastrado
  const basePercentual = estatisticas.totalAlunosAvaliados > 0 ? estatisticas.totalAlunosAvaliados : estatisticas.totalAlunos

  return (
    <div className={`space-y-6 ${carregando ? 'opacity-50' : ''}`}>
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {tipoUsuario !== 'escola' && (
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total de Escolas</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">{estatisticas.totalEscolas}</p>
              </div>
              <School className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total de Alunos</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                {estatisticas.totalAlunos.toLocaleString('pt-BR')}
              </p>
              {estatisticas.totalAlunosAvaliados > 0 && estatisticas.totalAlunosAvaliados !== estatisticas.totalAlunos && (
                <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                  {estatisticas.totalAlunosAvaliados.toLocaleString('pt-BR')} avaliados
                </p>
              )}
            </div>
            <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total de Turmas</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">{estatisticas.totalTurmas}</p>
            </div>
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Resultados de Provas</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                {estatisticas.totalResultados.toLocaleString('pt-BR')}
              </p>
            </div>
            <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Cards de Presenca e Media */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/40 p-4 sm:p-6 rounded-lg shadow-md border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">Alunos Presentes</p>
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-400">{estatisticas.totalAlunosPresentes.toLocaleString('pt-BR')}</p>
          {basePercentual > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {((estatisticas.totalAlunosPresentes / basePercentual) * 100).toFixed(1)}% dos avaliados
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/40 p-4 sm:p-6 rounded-lg shadow-md border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">Alunos Faltantes</p>
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-400">{estatisticas.totalAlunosFaltantes.toLocaleString('pt-BR')}</p>
          {basePercentual > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {((estatisticas.totalAlunosFaltantes / basePercentual) * 100).toFixed(1)}% dos avaliados
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/40 p-4 sm:p-6 rounded-lg shadow-md border border-blue-200 dark:border-blue-800 col-span-1 sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">Media Geral</p>
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">
            {estatisticas.mediaGeral > 0 ? estatisticas.mediaGeral.toFixed(2) : '-'}
          </p>
          {estatisticas.mediaGeral > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {estatisticas.mediaGeral >= 7 ? 'Excelente' : estatisticas.mediaGeral >= 5 ? 'Bom' : 'Abaixo da media'}
            </p>
          )}
        </div>
      </div>

      {/* Cards Anos Iniciais e Finais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/40 p-4 sm:p-6 rounded-lg shadow-md border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Anos Iniciais</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">1 ao 5 Ano</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                {estatisticas.mediaAnosIniciais > 0 ? estatisticas.mediaAnosIniciais.toFixed(2) : '-'}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Media de desempenho</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {estatisticas.totalAnosIniciais.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">alunos avaliados</p>
            </div>
          </div>
          {estatisticas.mediaAnosIniciais > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
              <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(estatisticas.mediaAnosIniciais * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/40 p-4 sm:p-6 rounded-lg shadow-md border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-violet-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Anos Finais</p>
              <p className="text-xs text-violet-600 dark:text-violet-400">6 ao 9 Ano</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-violet-700 dark:text-violet-400">
                {estatisticas.mediaAnosFinais > 0 ? estatisticas.mediaAnosFinais.toFixed(2) : '-'}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">Media de desempenho</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                {estatisticas.totalAnosFinais.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">alunos avaliados</p>
            </div>
          </div>
          {estatisticas.mediaAnosFinais > 0 && (
            <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-700">
              <div className="w-full bg-violet-200 dark:bg-violet-800 rounded-full h-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(estatisticas.mediaAnosFinais * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente Aba Escolas
function AbaEscolas({ escolas, busca, setBusca, carregando, pesquisou, onPesquisar }: {
  escolas: Escola[];
  busca: string;
  setBusca: (v: string) => void;
  carregando: boolean;
  pesquisou: boolean;
  onPesquisar: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Busca e Botão Pesquisar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar escola por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onPesquisar()}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white dark:bg-slate-700"
            />
          </div>
          <button
            onClick={onPesquisar}
            disabled={carregando}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg min-w-[140px]"
          >
            {carregando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Pesquisar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista de Escolas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {carregando ? (
          <div className="text-center py-16">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <School className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Carregando escolas...</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Aguarde um momento</p>
          </div>
        ) : !pesquisou ? (
          <div className="text-center py-16">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Search className="w-10 h-10 text-indigo-400" />
            </div>
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg">Pesquise as escolas</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md mx-auto">
              Clique no botão <strong className="text-indigo-600">Pesquisar</strong> para carregar a lista de escolas.
              Use o campo de busca para filtrar por nome.
            </p>
          </div>
        ) : escolas.length === 0 ? (
          <div className="text-center py-12">
            <School className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma escola encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">#</th>
                  <th className="text-left py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Escola</th>
                  <th className="text-left py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Polo</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Alunos</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Turmas</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Media</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {escolas.map((escola, index) => (
                  <tr key={escola.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{escola.nome}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{escola.polo_nome || '-'}</td>
                    <td className="py-3 px-4 text-center text-sm font-medium text-gray-900 dark:text-white">{escola.total_alunos || 0}</td>
                    <td className="py-3 px-4 text-center text-sm font-medium text-gray-900 dark:text-white">{escola.total_turmas || 0}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold text-sm ${getNotaColor(escola.media_geral)}`}>
                        {escola.media_geral ? escola.media_geral.toFixed(2) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente Aba Turmas
function AbaTurmas({ turmas, busca, setBusca, carregando, pesquisou, onPesquisar }: {
  turmas: Turma[];
  busca: string;
  setBusca: (v: string) => void;
  carregando: boolean;
  pesquisou: boolean;
  onPesquisar: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Busca e Botão Pesquisar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar turma por código ou escola..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onPesquisar()}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white dark:bg-slate-700"
            />
          </div>
          <button
            onClick={onPesquisar}
            disabled={carregando}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg min-w-[140px]"
          >
            {carregando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Pesquisar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista de Turmas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {carregando ? (
          <div className="text-center py-16">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Carregando turmas...</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Aguarde um momento</p>
          </div>
        ) : !pesquisou ? (
          <div className="text-center py-16">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Search className="w-10 h-10 text-indigo-400" />
            </div>
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg">Pesquise as turmas</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md mx-auto">
              Clique no botão <strong className="text-indigo-600">Pesquisar</strong> para carregar a lista de turmas.
              Use o campo de busca para filtrar por código ou escola.
            </p>
          </div>
        ) : turmas.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma turma encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">#</th>
                  <th className="text-left py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Turma</th>
                  <th className="text-left py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Escola</th>
                  <th className="text-left py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Serie</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Alunos</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Media</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">LP</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">MAT</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">PROD</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Presentes</th>
                  <th className="text-center py-3 px-4 font-bold text-indigo-900 dark:text-white text-xs uppercase">Faltantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {turmas.map((turma, index) => {
                  // Detectar se é anos iniciais (2, 3, 5) para mostrar PROD
                  const numSerie = turma.serie?.replace(/[^0-9]/g, '') || ''
                  const isAnosIniciais = ['2', '3', '5'].includes(numSerie)
                  return (
                    <tr key={turma.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{turma.codigo || turma.nome || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{turma.escola_nome || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{turma.serie || '-'}</td>
                      <td className="py-3 px-4 text-center text-sm font-medium text-gray-900 dark:text-white">{turma.total_alunos || 0}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold text-sm ${getNotaColor(turma.media_geral)}`}>
                          {turma.media_geral != null ? turma.media_geral.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm ${getNotaColor(turma.media_lp)}`}>
                          {turma.media_lp != null ? turma.media_lp.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm ${getNotaColor(turma.media_mat)}`}>
                          {turma.media_mat != null ? turma.media_mat.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAnosIniciais ? (
                          <span className={`text-sm ${getNotaColor(turma.media_prod)}`}>
                            {turma.media_prod != null ? turma.media_prod.toFixed(2) : '-'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">{turma.presentes || 0}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">{turma.faltantes || 0}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente Aba Alunos (igual a resultados consolidados)
function AbaAlunos({
  resultados,
  busca,
  setBusca,
  filtros,
  setFiltros,
  listaEscolas,
  listaTurmas,
  listaSeries,
  paginacao,
  paginaAtual,
  carregarAlunos,
  carregarAlunosComFiltros,
  carregando,
  disciplinasExibir,
  getTotalQuestoesPorSerie,
  setAlunoSelecionado,
  setModalAberto,
  tipoUsuario,
  getEtapaFromSerie,
  getSeriesByEtapa
}: {
  resultados: ResultadoConsolidado[]
  busca: string
  setBusca: (v: string) => void
  filtros: any
  setFiltros: (v: any) => void
  listaEscolas: any[]
  listaTurmas: any[]
  listaSeries: string[]
  paginacao: any
  paginaAtual: number
  carregarAlunos: (p: number) => void
  carregarAlunosComFiltros: (filtros: any, busca: string, pagina: number) => void
  carregando: boolean
  disciplinasExibir: any[]
  getTotalQuestoesPorSerie: (resultado: ResultadoConsolidado, codigo: string) => number | undefined
  setAlunoSelecionado: (v: any) => void
  setModalAberto: (v: boolean) => void
  tipoUsuario: string
  getEtapaFromSerie: (serie: string | undefined | null) => string | undefined
  getSeriesByEtapa: (etapa: string | undefined, todasSeries: string[]) => string[]
}) {
  const temFiltrosAtivos = Object.values(filtros).some(v => v) || busca

  const limparFiltros = () => {
    setFiltros({})
    setBusca('')
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de série com detecção automática de etapa
  const handleSerieChange = (novaSerie: string) => {
    const novaEtapa = novaSerie ? getEtapaFromSerie(novaSerie) : undefined
    setFiltros({
      ...filtros,
      serie: novaSerie || undefined,
      etapa_ensino: novaEtapa || (novaSerie ? filtros.etapa_ensino : undefined)
    })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de etapa que limpa série se incompatível
  const handleEtapaChange = (novaEtapa: string) => {
    const serieAtual = filtros.serie
    let novaSerie = serieAtual

    // Se a série atual não é compatível com a nova etapa, limpar série
    if (serieAtual && novaEtapa) {
      const etapaDaSerie = getEtapaFromSerie(serieAtual)
      if (etapaDaSerie !== novaEtapa) {
        novaSerie = undefined
      }
    }

    setFiltros({
      ...filtros,
      etapa_ensino: novaEtapa || undefined,
      serie: novaSerie
    })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de escola
  const handleEscolaChange = (novaEscola: string) => {
    setFiltros({
      ...filtros,
      escola_id: novaEscola || undefined,
      turma_id: undefined // Limpa turma ao mudar escola
    })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de turma
  const handleTurmaChange = (novaTurma: string) => {
    setFiltros({ ...filtros, turma_id: novaTurma || undefined })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de presença
  const handlePresencaChange = (novaPresenca: string) => {
    setFiltros({ ...filtros, presenca: novaPresenca || undefined })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para busca
  const handleBuscaChange = (novaBusca: string) => {
    setBusca(novaBusca)
  }

  // Handler para pesquisar - ÚNICA forma de carregar dados
  const handlePesquisar = () => {
    carregarAlunosComFiltros(filtros, busca, 1)
  }

  // Filtra turmas baseado na escola selecionada - memoizado para performance
  const turmasFiltradas = useMemo(() =>
    filtros.escola_id
      ? listaTurmas.filter((t: any) => t.escola_id === filtros.escola_id)
      : listaTurmas
  , [filtros.escola_id, listaTurmas])

  // Filtra séries baseado na etapa selecionada - memoizado para performance
  const seriesFiltradas = useMemo(() =>
    getSeriesByEtapa(filtros.etapa_ensino, listaSeries)
  , [filtros.etapa_ensino, listaSeries])

  return (
    <div className="flex flex-col flex-1 space-y-2 min-h-0">
      {/* Filtro Rápido - Sticky */}
      <div className="sticky top-0 z-30 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 px-2 sm:px-4 md:px-6 lg:px-8 py-1 bg-gray-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 px-3 py-2 space-y-2">
          {/* Filtro de Etapa de Ensino */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">Etapa:</span>
            {[
              { value: '', label: 'Todas' },
              { value: 'anos_iniciais', label: 'Anos Iniciais (2º, 3º, 5º)' },
              { value: 'anos_finais', label: 'Anos Finais (6º-9º)' }
            ].map((etapa) => (
              <button
                key={etapa.value}
                onClick={() => handleEtapaChange(etapa.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  (etapa.value === '' && !filtros.etapa_ensino) || filtros.etapa_ensino === etapa.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {etapa.label}
              </button>
            ))}
          </div>
          {/* Filtro de Série */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">Série:</span>
            <button
              onClick={() => handleSerieChange('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                !filtros.serie
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Todas
            </button>
            {seriesFiltradas.map((serie) => (
              <button
                key={serie}
                onClick={() => handleSerieChange(serie)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  filtros.serie === serie
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {serie}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros Avançados - Não sticky */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros Avançados</h2>
          </div>
          {temFiltrosAtivos && (
            <button onClick={limparFiltros} className="flex items-center text-sm text-indigo-600 hover:text-indigo-700">
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {tipoUsuario !== 'escola' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Escola</label>
              <select
                value={filtros.escola_id || ''}
                onChange={(e) => handleEscolaChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
              >
                <option value="">Todas</option>
                {listaEscolas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Etapa de Ensino</label>
            <select
              value={filtros.etapa_ensino || ''}
              onChange={(e) => handleEtapaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              <option value="anos_iniciais">Anos Iniciais (2º, 3º, 5º)</option>
              <option value="anos_finais">Anos Finais (6º-9º)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Serie</label>
            <select
              value={filtros.serie || ''}
              onChange={(e) => handleSerieChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              {seriesFiltradas.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Turma</label>
            <select
              value={filtros.turma_id || ''}
              onChange={(e) => handleTurmaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              {turmasFiltradas.map((t: any) => (
                <option key={t.id} value={t.id}>{t.codigo || t.nome}</option>
              ))}
            </select>
            {filtros.escola_id && turmasFiltradas.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nenhuma turma encontrada para esta escola</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Presenca</label>
            <select
              value={filtros.presenca || ''}
              onChange={(e) => handlePresencaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              <option value="P">Presente</option>
              <option value="F">Faltante</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Nome do aluno..."
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePesquisar()}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handlePesquisar}
            disabled={carregando}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg min-w-[160px]"
          >
            {carregando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Pesquisando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Pesquisar Alunos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabela de Alunos */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-450px)] min-h-[300px]">
          {carregando ? (
            <div className="text-center py-16">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Carregando alunos...</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Aguarde um momento</p>
            </div>
          ) : resultados.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Search className="w-10 h-10 text-indigo-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg">Pesquise os alunos</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md mx-auto">
                Utilize os filtros acima para refinar sua busca e clique em <strong className="text-indigo-600">Pesquisar Alunos</strong> para carregar os resultados.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">#</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase min-w-[150px]">Aluno</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Escola</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Turma</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Serie</th>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Presenca</th>
                  {disciplinasExibir.map((d) => (
                    <th key={d.codigo} className="text-center py-2 px-1 font-bold text-indigo-900 dark:text-white text-xs uppercase w-14">{d.codigo}</th>
                  ))}
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Media</th>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {resultados.map((resultado, index) => (
                  <tr key={resultado.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="text-center py-2 px-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                        {(paginaAtual - 1) * 50 + index + 1}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => {
                          setAlunoSelecionado({
                            id: resultado.aluno_id || resultado.id,
                            mediaAluno: resultado.media_aluno,
                            notasDisciplinas: {
                              nota_lp: resultado.nota_lp,
                              nota_ch: resultado.nota_ch,
                              nota_mat: resultado.nota_mat,
                              nota_cn: resultado.nota_cn,
                            },
                          })
                          setModalAberto(true)
                        }}
                        className="text-left hover:opacity-80"
                      >
                        <span className="font-medium text-indigo-600 hover:text-indigo-800 underline text-sm">{resultado.aluno_nome}</span>
                      </button>
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{resultado.escola_nome}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">{resultado.turma_codigo || '-'}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">{resultado.serie || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(resultado.presenca || 'P')}`}>
                        {resultado.presenca === 'P' || resultado.presenca === 'p' ? 'P' : 'F'}
                      </span>
                    </td>
                    {disciplinasExibir.map((disciplina) => {
                      const nota = getNotaNumero(resultado[disciplina.campo_nota as keyof ResultadoConsolidado] as any)
                      const acertos = disciplina.campo_acertos ? resultado[disciplina.campo_acertos as keyof ResultadoConsolidado] as number | string : null
                      const totalQuestoes = getTotalQuestoesPorSerie(resultado, disciplina.codigo)
                      const aplicavel = isDisciplinaAplicavel(disciplina.codigo, resultado.serie)

                      return (
                        <td key={disciplina.codigo} className="text-center py-2 px-1">
                          <div className="flex flex-col items-center">
                            {!aplicavel ? (
                              <span className="text-gray-400 font-bold text-sm">N/A</span>
                            ) : disciplina.tipo === 'nivel' ? (
                              <span className={`text-xs font-medium px-1 py-0.5 rounded ${getNivelColor(resultado.nivel_aprendizagem)}`}>
                                {resultado.nivel_aprendizagem?.substring(0, 3) || '-'}
                              </span>
                            ) : (
                              <>
                                <span className={`font-bold text-sm ${getNotaColor(nota)}`}>
                                  {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                                </span>
                                {totalQuestoes && acertos !== null && (
                                  <span className="text-[10px] text-gray-500">{acertos}/{totalQuestoes}</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="text-center py-2 px-2">
                      <span className={`font-bold text-sm ${getNotaColor(resultado.media_aluno)}`}>
                        {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <button
                        onClick={() => {
                          setAlunoSelecionado({
                            id: resultado.aluno_id || resultado.id,
                            mediaAluno: resultado.media_aluno,
                            notasDisciplinas: {
                              nota_lp: resultado.nota_lp,
                              nota_ch: resultado.nota_ch,
                              nota_mat: resultado.nota_mat,
                              nota_cn: resultado.nota_cn,
                            },
                          })
                          setModalAberto(true)
                        }}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        title="Ver questoes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginacao */}
        {paginacao.totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {((paginaAtual - 1) * 50) + 1} - {Math.min(paginaAtual * 50, paginacao.total)} de {paginacao.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => carregarAlunos(paginaAtual - 1)}
                disabled={!paginacao.temAnterior}
                className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Pagina {paginaAtual} de {paginacao.totalPaginas}
              </span>
              <button
                onClick={() => carregarAlunos(paginaAtual + 1)}
                disabled={!paginacao.temProxima}
                className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente Aba Analises
function AbaAnalises({ estatisticas, carregando }: { estatisticas: Estatisticas; carregando: boolean }) {
  // Base para calculo de percentuais: alunos avaliados (com P ou F)
  const basePercentual = estatisticas.totalAlunosAvaliados > 0 ? estatisticas.totalAlunosAvaliados : estatisticas.totalAlunos

  return (
    <div className={`space-y-6 ${carregando ? 'opacity-50' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Resumo de Analises
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Taxa de Presenca */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taxa de Presenca (avaliados)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {basePercentual > 0
                ? ((estatisticas.totalAlunosPresentes / basePercentual) * 100).toFixed(1)
                : 0}%
            </p>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${basePercentual > 0 ? (estatisticas.totalAlunosPresentes / basePercentual) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Media Geral */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Media Geral</p>
            <p className={`text-2xl font-bold ${getNotaColor(estatisticas.mediaGeral)}`}>
              {estatisticas.mediaGeral > 0 ? estatisticas.mediaGeral.toFixed(2) : '-'}
            </p>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${estatisticas.mediaGeral >= 7 ? 'bg-green-500' : estatisticas.mediaGeral >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(estatisticas.mediaGeral * 10, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Comparativo Anos */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Comparativo</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Anos Iniciais</p>
                <p className="text-lg font-bold text-emerald-600">{estatisticas.mediaAnosIniciais.toFixed(2)}</p>
              </div>
              <div className="text-gray-400">vs</div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Anos Finais</p>
                <p className="text-lg font-bold text-violet-600">{estatisticas.mediaAnosFinais.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            Para analises mais detalhadas, acesse o modulo de <strong>Graficos</strong> no menu lateral.
          </p>
        </div>
      </div>
    </div>
  )
}
