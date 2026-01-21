'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  BarChart3, School, Users, GraduationCap, BookOpen, TrendingUp,
  CheckCircle, XCircle, Search, Filter, X, Eye,
  Award, Target, CheckCircle2, RefreshCw
} from 'lucide-react'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { obterDisciplinasPorSerieSync, obterTodasDisciplinas, type Disciplina } from '@/lib/disciplinas-por-serie'
import {
  isCacheValid,
  getCachedEstatisticas,
  getCachedEscolas,
  getCachedTurmas,
  getCachedSeries
} from '@/lib/dashboard-cache'

// Tipos e utilitários compartilhados
import {
  ResultadoConsolidadoPainel,
  EscolaPainel,
  TurmaPainel,
  EstatisticasPainel,
  PainelDadosProps,
  AlunoSelecionado,
  FiltrosAlunos,
  PaginacaoInfo,
  OpcaoSelect
} from '@/lib/dados/types'
import {
  isAnosIniciais,
  getEtapaFromSerie,
  getSeriesByEtapa,
  getNotaNumero,
  calcularCodigoNivel,
  getNivelBadgeClass,
  getNotaColor,
  getNotaBgColor,
  getPresencaColor,
  isDisciplinaAplicavel,
  formatarNota
} from '@/lib/dados/utils'
import {
  NivelBadge,
  SeriesChips,
  PaginationControls,
  BarraBuscaPesquisar,
  TabelaCarregando,
  EstadoBuscaInicial
} from '@/components/dados'

// Aliases para compatibilidade
type ResultadoConsolidado = ResultadoConsolidadoPainel
type Escola = EscolaPainel
type Turma = TurmaPainel
type Estatisticas = EstatisticasPainel
type AbaAtiva = 'geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'

// Função wrapper para calcularNivel (mantém compatibilidade)
const calcularNivel = calcularCodigoNivel

// getNivelColor para uso em badges de nível de aprendizagem (texto descritivo)
const getNivelColorDescritivo = (nivel: string | undefined | null): string => {
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
  const [filtrosAlunos, setFiltrosAlunos] = useState<FiltrosAlunos>({})
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [paginacao, setPaginacao] = useState<PaginacaoInfo & { temProxima: boolean; temAnterior: boolean }>({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 0,
    temProxima: false,
    temAnterior: false
  })

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSelecionado | null>(null)


  // Listas para filtros
  const [listaEscolas, setListaEscolas] = useState<OpcaoSelect[]>([])
  const [listaTurmas, setListaTurmas] = useState<OpcaoSelect[]>([])
  const [listaSeries, setListaSeries] = useState<string[]>([])

  // Controle de carregamento
  const [filtrosCarregados, setFiltrosCarregados] = useState(false)
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [carregandoEscolas, setCarregandoEscolas] = useState(false)
  const [carregandoTurmas, setCarregandoTurmas] = useState(false)
  const [pesquisouEscolas, setPesquisouEscolas] = useState(false)
  const [pesquisouTurmas, setPesquisouTurmas] = useState(false)
  const [pesquisouAlunos, setPesquisouAlunos] = useState(false)

  // Carregar estatísticas da aba Geral AUTOMATICAMENTE (sempre da API para garantir dados atualizados)
  // Função para carregar estatísticas com filtro de série opcional
  const carregarEstatisticas = useCallback(async (serieParam?: string) => {
    // Sempre buscar da API para garantir dados atualizados (não usar cache para estatísticas)

    // Buscar da API (com ou sem filtro de série)
    try {
      setCarregando(true)
      const url = new URL(estatisticasEndpoint, window.location.origin)
      if (serieParam) {
        url.searchParams.set('serie', serieParam)
      }
      console.log('[PainelDados] Buscando estatísticas da API - série:', serieParam || 'todas')
      const response = await fetch(url.toString())

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

        // Atualizar lista de séries disponíveis (apenas na primeira carga, sem filtro de série)
        if (!serieParam && data.seriesDisponiveis && data.seriesDisponiveis.length > 0) {
          setListaSeries(data.seriesDisponiveis)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setCarregando(false)
    }
  }, [estatisticasEndpoint])

  // Carregar estatísticas iniciais (sem filtro de série)
  useEffect(() => {
    carregarEstatisticas()
  }, [carregarEstatisticas])

  // Recarregar estatísticas quando a série mudar
  useEffect(() => {
    console.log('[PainelDados] Série mudou para:', filtrosAlunos.serie || 'todas')
    carregarEstatisticas(filtrosAlunos.serie)
  }, [filtrosAlunos.serie, carregarEstatisticas])

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

  // Função para carregar escolas (chamada manualmente ou por useEffect)
  const carregarEscolas = useCallback(async (serieParam?: string) => {
    if (!escolasEndpoint) return
    try {
      setCarregandoEscolas(true)

      // Construir URL com parâmetros de filtro
      const url = new URL(escolasEndpoint, window.location.origin)
      url.searchParams.set('com_estatisticas', 'true')

      // Usar o parâmetro passado ou o estado atual
      const serieAtual = serieParam !== undefined ? serieParam : filtrosAlunos.serie
      if (serieAtual) {
        url.searchParams.set('serie', serieAtual)
      }

      // Buscar da API com estatísticas
      console.log('[PainelDados] Buscando escolas - série:', serieAtual || 'todas')
      const response = await fetch(url.toString())
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
  }, [escolasEndpoint, filtrosAlunos.serie])

  // Função para carregar turmas (chamada manualmente ou por useEffect)
  const carregarTurmas = useCallback(async (serieParam?: string) => {
    if (!turmasEndpoint) return
    try {
      setCarregandoTurmas(true)

      // Construir URL com parâmetros de filtro
      const url = new URL(turmasEndpoint, window.location.origin)

      // Usar o parâmetro passado ou o estado atual
      const serieAtual = serieParam !== undefined ? serieParam : filtrosAlunos.serie
      if (serieAtual) {
        url.searchParams.set('serie', serieAtual)
      }

      // Buscar da API com estatísticas
      console.log('[PainelDados] Buscando turmas - série:', serieAtual || 'todas')
      const response = await fetch(url.toString())
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
  }, [turmasEndpoint, filtrosAlunos.serie])

  // Recarregar escolas e turmas automaticamente quando série mudar (se já pesquisou)
  useEffect(() => {
    // Recarregar sempre que a série mudar e já tiver pesquisado antes
    // (não depende mais da aba ativa para evitar dados desatualizados)
    if (pesquisouEscolas) {
      console.log('[PainelDados] Série mudou, recarregando escolas:', filtrosAlunos.serie || 'todas')
      carregarEscolas(filtrosAlunos.serie)
    }
    if (pesquisouTurmas) {
      console.log('[PainelDados] Série mudou, recarregando turmas:', filtrosAlunos.serie || 'todas')
      carregarTurmas(filtrosAlunos.serie)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosAlunos.serie])

  // NÃO carregar alunos automaticamente - apenas quando clicar em Pesquisar

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

      console.log('[PainelDados] Buscando alunos:', `${resultadosEndpoint}?${params.toString()}`)
      const response = await fetch(`${resultadosEndpoint}?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        // Log para verificar se os níveis estão vindo da API
        if (data.resultados?.length > 0) {
          const primeiro = data.resultados[0]
          console.log('[PainelDados] Dados recebidos - primeiro aluno:', {
            nome: primeiro.aluno_nome,
            serie: primeiro.serie,
            nivel_lp: primeiro.nivel_lp,
            nivel_mat: primeiro.nivel_mat,
            nivel_prod: primeiro.nivel_prod,
            nivel_aluno: primeiro.nivel_aluno
          })
        }
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

      {/* Filtro Global de Série - Visível em todas as abas */}
      <div className="mb-4">
        <SeriesChips
          series={listaSeries}
          serieSelecionada={filtrosAlunos.serie || ''}
          onChange={(serie) => {
            if (!serie) {
              // "Todas" selecionado - limpar filtro de série
              // O useEffect vai recarregar automaticamente quando o estado mudar
              setFiltrosAlunos(prev => ({ ...prev, serie: undefined, etapa_ensino: undefined }))
            } else {
              const etapa = getEtapaFromSerie(serie)
              setFiltrosAlunos(prev => ({ ...prev, serie, etapa_ensino: etapa }))
            }
          }}
        />
        {filtrosAlunos.serie && (
          <p className="mt-1 ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({isAnosIniciais(filtrosAlunos.serie) ? 'Anos Iniciais' : 'Anos Finais'})
          </p>
        )}
      </div>

      {/* Conteudo das Abas */}
      <div className="space-y-4">
      {abaAtiva === 'geral' && (
        <AbaGeral estatisticas={estatisticas} tipoUsuario={tipoUsuario} carregando={carregando} serieSelecionada={filtrosAlunos.serie} />
      )}

      {abaAtiva === 'escolas' && (
        <AbaEscolas
          escolas={escolasFiltradas}
          busca={buscaEscola}
          setBusca={setBuscaEscola}
          carregando={carregandoEscolas}
          pesquisou={pesquisouEscolas}
          onPesquisar={carregarEscolas}
          serieSelecionada={filtrosAlunos.serie}
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
          serieSelecionada={filtrosAlunos.serie}
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
        <AbaAnalises estatisticas={estatisticas} carregando={carregando} serieSelecionada={filtrosAlunos.serie} />
      )}
      </div>

      {/* Modal de Questoes */}
      {alunoSelecionado && (
        <ModalQuestoesAluno
          alunoId={alunoSelecionado.id}
          anoLetivo={alunoSelecionado.anoLetivo}
          mediaAluno={alunoSelecionado.mediaAluno}
          notasDisciplinas={alunoSelecionado.notasDisciplinas}
          niveisDisciplinas={alunoSelecionado.niveisDisciplinas}
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
function AbaGeral({ estatisticas, tipoUsuario, carregando, serieSelecionada }: {
  estatisticas: Estatisticas;
  tipoUsuario: string;
  carregando: boolean;
  serieSelecionada?: string;
}) {
  // Base para calculo de percentuais: alunos avaliados (com P ou F), nao total cadastrado
  const basePercentual = estatisticas.totalAlunosAvaliados > 0 ? estatisticas.totalAlunosAvaliados : estatisticas.totalAlunos

  return (
    <div className={`space-y-6 ${carregando ? 'opacity-50' : ''}`}>
      {/* Aviso quando série selecionada - dados estão filtrados */}
      {serieSelecionada && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-3">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            <strong>Filtro ativo:</strong> Exibindo estatísticas do <strong>{serieSelecionada}</strong>.
            Clique em "Todas" para ver dados de todas as séries.
          </p>
        </div>
      )}
      {/* Cards principais */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {tipoUsuario !== 'escola' && (
          <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">Total de Escolas</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">{estatisticas.totalEscolas}</p>
              </div>
              <School className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 border-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">
                {serieSelecionada ? `Alunos do ${serieSelecionada}` : 'Total de Alunos'}
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                {estatisticas.totalAlunos.toLocaleString('pt-BR')}
              </p>
              {estatisticas.totalAlunosAvaliados > 0 && estatisticas.totalAlunosAvaliados !== estatisticas.totalAlunos && (
                <p className="text-[10px] sm:text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                  {estatisticas.totalAlunosAvaliados.toLocaleString('pt-BR')} avaliados
                </p>
              )}
            </div>
            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">
                {serieSelecionada ? `Turmas do ${serieSelecionada}` : 'Total de Turmas'}
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">{estatisticas.totalTurmas}</p>
              {serieSelecionada && (
                <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {estatisticas.totalTurmas === 1 ? '1 turma' : `${estatisticas.totalTurmas} turmas`} desta série
                </p>
              )}
            </div>
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">
                {serieSelecionada ? `Provas do ${serieSelecionada}` : 'Resultados de Provas'}
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">
                {estatisticas.totalResultados.toLocaleString('pt-BR')}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Cards de Presenca e Media */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs md:text-sm font-medium">Presentes</p>
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-700 dark:text-green-400">{estatisticas.totalAlunosPresentes.toLocaleString('pt-BR')}</p>
          {basePercentual > 0 && (
            <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 mt-1">
              {((estatisticas.totalAlunosPresentes / basePercentual) * 100).toFixed(1)}%
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs md:text-sm font-medium">Faltantes</p>
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-700 dark:text-red-400">{estatisticas.totalAlunosFaltantes.toLocaleString('pt-BR')}</p>
          {basePercentual > 0 && (
            <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mt-1">
              {((estatisticas.totalAlunosFaltantes / basePercentual) * 100).toFixed(1)}%
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-blue-200 dark:border-blue-800 col-span-2 md:col-span-2">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs md:text-sm font-medium">Media Geral</p>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-400">
            {estatisticas.mediaGeral > 0 ? estatisticas.mediaGeral.toFixed(2) : '-'}
          </p>
          {estatisticas.mediaGeral > 0 && (
            <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1">
              {estatisticas.mediaGeral >= 7 ? 'Excelente' : estatisticas.mediaGeral >= 5 ? 'Bom' : 'Abaixo da media'}
            </p>
          )}
        </div>
      </div>

      {/* Cards Anos Iniciais e Finais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-emerald-500 rounded-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold">Anos Iniciais</p>
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400">1º ao 5º Ano</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                {estatisticas.mediaAnosIniciais > 0 ? estatisticas.mediaAnosIniciais.toFixed(2) : '-'}
              </p>
              <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-1">Média</p>
            </div>
            <div className="text-right">
              <p className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {estatisticas.totalAnosIniciais.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">alunos</p>
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

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/40 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-violet-500 rounded-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold">Anos Finais</p>
              <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400">6º ao 9º Ano</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-violet-700 dark:text-violet-400">
                {estatisticas.mediaAnosFinais > 0 ? estatisticas.mediaAnosFinais.toFixed(2) : '-'}
              </p>
              <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400 mt-1">Média</p>
            </div>
            <div className="text-right">
              <p className="text-base sm:text-lg font-semibold text-violet-600 dark:text-violet-400">
                {estatisticas.totalAnosFinais.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">alunos</p>
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
function AbaEscolas({ escolas, busca, setBusca, carregando, pesquisou, onPesquisar, serieSelecionada }: {
  escolas: Escola[];
  busca: string;
  setBusca: (v: string) => void;
  carregando: boolean;
  pesquisou: boolean;
  onPesquisar: () => void;
  serieSelecionada?: string;
}) {
  // Detectar se é anos iniciais (2, 3, 5) para mostrar PROD em vez de CH/CN
  const numSerie = serieSelecionada?.replace(/[^0-9]/g, '') || ''
  const isAnosIniciaisSerie = ['2', '3', '5'].includes(numSerie)
  const temFiltroSerie = !!serieSelecionada && serieSelecionada.trim() !== ''

  return (
    <div className="space-y-4">
      {/* Busca e Botão Pesquisar */}
      <BarraBuscaPesquisar
        placeholder="Buscar escola por nome..."
        busca={busca}
        setBusca={setBusca}
        onPesquisar={onPesquisar}
        carregando={carregando}
      />

      {/* Lista de Escolas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {carregando ? (
          <TabelaCarregando Icone={School} mensagem="Carregando escolas..." />
        ) : !pesquisou ? (
          <EstadoBuscaInicial
            titulo="Pesquise as escolas"
            mensagem="Clique no botão Pesquisar para carregar a lista de escolas. Use o campo de busca para filtrar por nome."
          />
        ) : escolas.length === 0 ? (
          <div className="text-center py-12">
            <School className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma escola encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full min-w-[800px] lg:min-w-[1000px]">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[180px]">Escola</th>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[100px]">Polo</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Turmas</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Alunos</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Média</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">LP</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">MAT</th>
                  {/* PROD - mostrar apenas para anos iniciais (2, 3, 5) ou quando sem filtro */}
                  {(!temFiltroSerie || isAnosIniciaisSerie) && (
                    <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">PROD</th>
                  )}
                  {/* CH/CN - mostrar apenas para anos finais (6, 7, 8, 9) ou quando sem filtro */}
                  {(!temFiltroSerie || !isAnosIniciaisSerie) && (
                    <>
                      <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">CH</th>
                      <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">CN</th>
                    </>
                  )}
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Pres.</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Falt.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {escolas.map((escola) => (
                  <tr key={escola.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="py-2 px-2 lg:px-3">
                      <div className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm truncate max-w-[200px]" title={escola.nome}>{escola.nome}</div>
                    </td>
                    <td className="py-2 px-2 lg:px-3 text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={escola.polo_nome || '-'}>{escola.polo_nome || '-'}</td>
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold text-xs lg:text-sm">
                        {escola.total_turmas || 0}
                      </span>
                    </td>
                    <td className="py-2 px-1 lg:px-2 text-center text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{escola.total_alunos || 0}</td>
                    {/* Média Geral + Nível */}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-bold text-xs lg:text-sm ${getNotaColor(escola.media_geral)}`}>
                          {escola.media_geral != null ? escola.media_geral.toFixed(2) : '-'}
                        </span>
                        {escola.media_geral != null && calcularNivel(escola.media_geral) && (
                          <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_geral))}`}>
                            {calcularNivel(escola.media_geral)}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* LP */}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_lp)}`}>
                          {escola.media_lp != null ? escola.media_lp.toFixed(2) : '-'}
                        </span>
                        {escola.media_lp != null && calcularNivel(escola.media_lp) && (
                          <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_lp))}`}>
                            {calcularNivel(escola.media_lp)}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* MAT */}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_mat)}`}>
                          {escola.media_mat != null ? escola.media_mat.toFixed(2) : '-'}
                        </span>
                        {escola.media_mat != null && calcularNivel(escola.media_mat) && (
                          <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_mat))}`}>
                            {calcularNivel(escola.media_mat)}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* PROD - mostrar apenas para anos iniciais (2, 3, 5) ou quando sem filtro */}
                    {(!temFiltroSerie || isAnosIniciaisSerie) && (
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_prod)}`}>
                            {escola.media_prod != null ? escola.media_prod.toFixed(2) : '-'}
                          </span>
                          {escola.media_prod != null && calcularNivel(escola.media_prod) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_prod))}`}>
                              {calcularNivel(escola.media_prod)}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {/* CH/CN - mostrar apenas para anos finais (6, 7, 8, 9) ou quando sem filtro */}
                    {(!temFiltroSerie || !isAnosIniciaisSerie) && (
                      <>
                        <td className="py-2 px-1 lg:px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_ch)}`}>
                              {escola.media_ch != null ? escola.media_ch.toFixed(2) : '-'}
                            </span>
                            {escola.media_ch != null && calcularNivel(escola.media_ch) && (
                              <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_ch))}`}>
                                {calcularNivel(escola.media_ch)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-1 lg:px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs lg:text-sm font-medium ${getNotaColor(escola.media_cn)}`}>
                              {escola.media_cn != null ? escola.media_cn.toFixed(2) : '-'}
                            </span>
                            {escola.media_cn != null && calcularNivel(escola.media_cn) && (
                              <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(escola.media_cn))}`}>
                                {calcularNivel(escola.media_cn)}
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <span className="text-xs lg:text-sm text-green-600 dark:text-green-400 font-medium">{escola.presentes || 0}</span>
                    </td>
                    <td className="py-2 px-1 lg:px-2 text-center">
                      <span className="text-xs lg:text-sm text-red-600 dark:text-red-400 font-medium">{escola.faltantes || 0}</span>
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
function AbaTurmas({ turmas, busca, setBusca, carregando, pesquisou, onPesquisar, serieSelecionada }: {
  turmas: Turma[];
  busca: string;
  setBusca: (v: string) => void;
  carregando: boolean;
  pesquisou: boolean;
  onPesquisar: () => void;
  serieSelecionada?: string;
}) {
  // Detectar se é anos iniciais (2, 3, 5) para mostrar PROD em vez de CH/CN
  const numSerie = serieSelecionada?.replace(/[^0-9]/g, '') || ''
  const isAnosIniciaisSerie = ['2', '3', '5'].includes(numSerie)
  const temFiltroSerie = !!serieSelecionada && serieSelecionada.trim() !== ''

  return (
    <div className="space-y-4">
      {/* Busca e Botão Pesquisar */}
      <BarraBuscaPesquisar
        placeholder="Buscar turma por código ou escola..."
        busca={busca}
        setBusca={setBusca}
        onPesquisar={onPesquisar}
        carregando={carregando}
      />

      {/* Lista de Turmas */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {carregando ? (
          <TabelaCarregando Icone={BookOpen} mensagem="Carregando turmas..." />
        ) : !pesquisou ? (
          <EstadoBuscaInicial
            titulo="Pesquise as turmas"
            mensagem="Clique no botão Pesquisar para carregar a lista de turmas. Use o campo de busca para filtrar por código ou escola."
          />
        ) : turmas.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma turma encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full min-w-[800px] lg:min-w-[1000px]">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[100px]">Turma</th>
                  <th className="text-left py-2 px-2 lg:px-3 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase min-w-[150px]">Escola</th>
                  <th className="text-left py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Série</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Alunos</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Média</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">LP</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">MAT</th>
                  {/* PROD - mostrar apenas para anos iniciais (2, 3, 5) ou quando sem filtro */}
                  {(!temFiltroSerie || isAnosIniciaisSerie) && (
                    <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">PROD</th>
                  )}
                  {/* CH/CN - mostrar apenas para anos finais (6, 7, 8, 9) ou quando sem filtro */}
                  {(!temFiltroSerie || !isAnosIniciaisSerie) && (
                    <>
                      <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">CH</th>
                      <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">CN</th>
                    </>
                  )}
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Pres.</th>
                  <th className="text-center py-2 px-1 lg:px-2 font-bold text-indigo-900 dark:text-white text-[10px] lg:text-xs uppercase">Falt.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {turmas.map((turma) => (
                    <tr key={turma.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="py-2 px-2 lg:px-3">
                        <div className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm">{turma.codigo || turma.nome || '-'}</div>
                      </td>
                      <td className="py-2 px-2 lg:px-3 text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[180px]" title={turma.escola_nome || '-'}>{turma.escola_nome || '-'}</td>
                      <td className="py-2 px-1 lg:px-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">{turma.serie || '-'}</td>
                      <td className="py-2 px-1 lg:px-2 text-center text-xs lg:text-sm font-medium text-gray-900 dark:text-white">{turma.total_alunos || 0}</td>
                      {/* Média Geral + Nível */}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-bold text-xs lg:text-sm ${getNotaColor(turma.media_geral)}`}>
                            {turma.media_geral != null ? turma.media_geral.toFixed(2) : '-'}
                          </span>
                          {turma.media_geral != null && calcularNivel(turma.media_geral) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_geral))}`}>
                              {calcularNivel(turma.media_geral)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* LP */}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_lp)}`}>
                            {turma.media_lp != null ? turma.media_lp.toFixed(2) : '-'}
                          </span>
                          {turma.media_lp != null && calcularNivel(turma.media_lp) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_lp))}`}>
                              {calcularNivel(turma.media_lp)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* MAT */}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_mat)}`}>
                            {turma.media_mat != null ? turma.media_mat.toFixed(2) : '-'}
                          </span>
                          {turma.media_mat != null && calcularNivel(turma.media_mat) && (
                            <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_mat))}`}>
                              {calcularNivel(turma.media_mat)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* PROD - mostrar apenas para anos iniciais (2, 3, 5) ou quando sem filtro */}
                      {(!temFiltroSerie || isAnosIniciaisSerie) && (
                        <td className="py-2 px-1 lg:px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_prod)}`}>
                              {turma.media_prod != null ? turma.media_prod.toFixed(2) : '-'}
                            </span>
                            {turma.media_prod != null && calcularNivel(turma.media_prod) && (
                              <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_prod))}`}>
                                {calcularNivel(turma.media_prod)}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {/* CH/CN - mostrar apenas para anos finais (6, 7, 8, 9) ou quando sem filtro */}
                      {(!temFiltroSerie || !isAnosIniciaisSerie) && (
                        <>
                          <td className="py-2 px-1 lg:px-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_ch)}`}>
                                {turma.media_ch != null ? turma.media_ch.toFixed(2) : '-'}
                              </span>
                              {turma.media_ch != null && calcularNivel(turma.media_ch) && (
                                <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_ch))}`}>
                                  {calcularNivel(turma.media_ch)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1 lg:px-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs lg:text-sm font-medium ${getNotaColor(turma.media_cn)}`}>
                                {turma.media_cn != null ? turma.media_cn.toFixed(2) : '-'}
                              </span>
                              {turma.media_cn != null && calcularNivel(turma.media_cn) && (
                                <span className={`text-[9px] lg:text-[10px] font-bold px-1 py-0.5 rounded ${getNivelBadgeClass(calcularNivel(turma.media_cn))}`}>
                                  {calcularNivel(turma.media_cn)}
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <span className="text-xs lg:text-sm text-green-600 dark:text-green-400 font-medium">{turma.presentes || 0}</span>
                      </td>
                      <td className="py-2 px-1 lg:px-2 text-center">
                        <span className="text-xs lg:text-sm text-red-600 dark:text-red-400 font-medium">{turma.faltantes || 0}</span>
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
  filtros: FiltrosAlunos
  setFiltros: (v: FiltrosAlunos) => void
  listaEscolas: OpcaoSelect[]
  listaTurmas: OpcaoSelect[]
  listaSeries: string[]
  paginacao: PaginacaoInfo & { temProxima: boolean; temAnterior: boolean }
  paginaAtual: number
  carregarAlunos: (p: number) => void
  carregarAlunosComFiltros: (filtros: FiltrosAlunos, busca: string, pagina: number) => void
  carregando: boolean
  disciplinasExibir: Disciplina[]
  getTotalQuestoesPorSerie: (resultado: ResultadoConsolidado, codigo: string) => number | undefined
  setAlunoSelecionado: (v: AlunoSelecionado | null) => void
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
      ? listaTurmas.filter((t) => t.escola_id === filtros.escola_id)
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

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {tipoUsuario !== 'escola' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Escola</label>
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
              {turmasFiltradas.map((t) => (
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
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg sm:min-w-[160px]"
          >
            {carregando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span className="hidden sm:inline">Pesquisando...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Pesquisar Alunos</span>
                <span className="sm:hidden">Pesquisar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabela de Alunos */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-450px)] min-h-[300px]">
          {carregando ? (
            <TabelaCarregando Icone={GraduationCap} mensagem="Carregando alunos..." />
          ) : resultados.length === 0 ? (
            <EstadoBuscaInicial
              titulo="Pesquise os alunos"
              mensagem="Utilize os filtros acima para refinar sua busca e clique em Pesquisar Alunos para carregar os resultados."
              textoBotao="Pesquisar Alunos"
            />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] sm:min-w-[600px] md:min-w-[750px] lg:min-w-[900px]">
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
                            niveisDisciplinas: {
                              nivel_lp: resultado.nivel_lp,
                              nivel_mat: resultado.nivel_mat,
                              nivel_prod: resultado.nivel_prod,
                              nivel_aluno: resultado.nivel_aluno,
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
                      const nota = getNotaNumero(resultado[disciplina.campo_nota as keyof ResultadoConsolidado] as number | string | null)
                      const acertos = disciplina.campo_acertos ? resultado[disciplina.campo_acertos as keyof ResultadoConsolidado] as number | string : null
                      const totalQuestoes = getTotalQuestoesPorSerie(resultado, disciplina.codigo)
                      const aplicavel = isDisciplinaAplicavel(disciplina.codigo, resultado.serie)
                      // Obter nível correspondente à disciplina
                      const nivelDisciplina = disciplina.codigo === 'LP' ? resultado.nivel_lp :
                                             disciplina.codigo === 'MAT' ? resultado.nivel_mat :
                                             disciplina.codigo === 'PROD' ? resultado.nivel_prod : null

                      return (
                        <td key={disciplina.codigo} className="text-center py-1 px-0.5 sm:py-2 sm:px-1">
                          {!aplicavel ? (
                            <div className="inline-flex flex-col items-center p-1 sm:p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 w-full max-w-[55px] sm:max-w-[65px]">
                              <div className="text-xs sm:text-sm font-bold text-gray-400">N/A</div>
                            </div>
                          ) : disciplina.tipo === 'nivel' ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getNivelColorDescritivo(resultado.nivel_aprendizagem)}`}>
                              {resultado.nivel_aprendizagem?.substring(0, 3) || '-'}
                            </span>
                          ) : (
                            <div className={`inline-flex flex-col items-center p-1 sm:p-1.5 rounded-lg ${getNotaBgColor(nota)} dark:bg-slate-700 border w-full max-w-[55px] sm:max-w-[65px]`}>
                              {totalQuestoes && acertos !== null && (
                                <div className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 mb-0.5 font-medium">
                                  {acertos}/{totalQuestoes}
                                </div>
                              )}
                              <div className={`text-xs sm:text-sm font-bold ${getNotaColor(nota)}`}>
                                {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                              </div>
                              {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 sm:h-1 mt-0.5">
                                  <div
                                    className={`h-0.5 sm:h-1 rounded-full ${
                                      nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              )}
                              {/* Badge de nível dentro da célula (Anos Iniciais) */}
                              {isAnosIniciais(resultado.serie) && nivelDisciplina && (
                                <div className="mt-0.5">
                                  <NivelBadge nivel={nivelDisciplina} />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center py-1 px-0.5 sm:py-2 sm:px-1">
                      {(() => {
                        const mediaNum = getNotaNumero(resultado.media_aluno)
                        return (
                          <div className={`inline-flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl ${getNotaBgColor(resultado.media_aluno)} dark:bg-slate-700 border-2 ${
                            mediaNum !== null && mediaNum >= 7 ? 'border-green-500' :
                            mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' :
                            'border-red-500'
                          } w-full max-w-[55px] sm:max-w-[65px]`}>
                            <div className={`text-xs sm:text-sm font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                              {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {mediaNum !== null && mediaNum !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="text-[9px] sm:text-[10px] font-medium text-gray-600 dark:text-gray-400">
                                Média
                              </div>
                            )}
                            {/* Nível geral do aluno (Anos Iniciais) */}
                            {isAnosIniciais(resultado.serie) && resultado.nivel_aluno && (
                              <NivelBadge nivel={resultado.nivel_aluno} className="mt-0.5 font-extrabold" />
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="text-center py-1 px-0.5 sm:py-2 sm:px-1">
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
                            niveisDisciplinas: {
                              nivel_lp: resultado.nivel_lp,
                              nivel_mat: resultado.nivel_mat,
                              nivel_prod: resultado.nivel_prod,
                              nivel_aluno: resultado.nivel_aluno,
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
            </div>
          )}
        </div>

        {/* Paginacao */}
        <PaginationControls
          paginaAtual={paginaAtual}
          totalPaginas={paginacao.totalPaginas}
          total={paginacao.total}
          itensPorPagina={50}
          temProxima={paginacao.temProxima}
          temAnterior={paginacao.temAnterior}
          onProxima={() => carregarAlunos(paginaAtual + 1)}
          onAnterior={() => carregarAlunos(paginaAtual - 1)}
          mostrarContagem={true}
          tamanhoIcone="sm"
          className="bg-gray-50 dark:bg-slate-700"
        />

        {/* Legenda de Critérios de Avaliação (Anos Iniciais) */}
        {filtros.serie && isAnosIniciais(filtros.serie) && (
          <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-200 dark:border-indigo-700">
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Critérios de Avaliação por Nível:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] sm:text-xs">
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-[9px]">N1</span>
                <span className="text-gray-700 dark:text-gray-300">Crítico: LP/MAT 1-3 acertos; 5º MAT 1-5</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 text-[9px]">N2</span>
                <span className="text-gray-700 dark:text-gray-300">Básico: LP/MAT 4-7 acertos; 5º MAT 6-10</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[9px]">N3</span>
                <span className="text-gray-700 dark:text-gray-300">Adequado: LP/MAT 8-11 acertos; 5º MAT 11-15</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[9px]">N4</span>
                <span className="text-gray-700 dark:text-gray-300">Avançado: LP/MAT 12+ acertos; 5º MAT 16+</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">* PROD: Insuficiente→N1, Básico→N2, Adequado→N3, Avançado→N4. Nível Geral = média dos níveis.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente Aba Analises
function AbaAnalises({ estatisticas, carregando, serieSelecionada }: {
  estatisticas: Estatisticas;
  carregando: boolean;
  serieSelecionada?: string;
}) {
  // Base para calculo de percentuais: alunos avaliados (com P ou F)
  const basePercentual = estatisticas.totalAlunosAvaliados > 0 ? estatisticas.totalAlunosAvaliados : estatisticas.totalAlunos

  return (
    <div className={`space-y-6 ${carregando ? 'opacity-50' : ''}`}>
      {/* Aviso quando série selecionada - dados estão filtrados */}
      {serieSelecionada && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-3">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            <strong>Filtro ativo:</strong> Exibindo análises do <strong>{serieSelecionada}</strong>.
            Clique em "Todas" para ver dados de todas as séries.
          </p>
        </div>
      )}
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
