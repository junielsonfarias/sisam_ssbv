'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { obterDisciplinasPorSerieSync, obterTodasDisciplinas, type Disciplina } from '@/lib/disciplinas-por-serie'

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
} from '@/lib/dados/utils'
import {
  SeriesChips,
} from '@/components/dados'

// Sub-componentes extraídos
import AbaGeral from './aba-geral'
import AbaEscolas from './aba-escolas'
import AbaTurmas from './aba-turmas'
import AbaAlunos from './aba-alunos'
import AbaAnalises from './aba-analises'

// Aliases para compatibilidade
type ResultadoConsolidado = ResultadoConsolidadoPainel
type Escola = EscolaPainel
type Turma = TurmaPainel
type Estatisticas = EstatisticasPainel
type AbaAtiva = 'geral' | 'escolas' | 'turmas' | 'alunos' | 'analises'

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
    mediaLp: 0,
    mediaMat: 0,
    mediaProd: 0,
    mediaCh: 0,
    mediaCn: 0,
  })
  const [carregando, setCarregando] = useState(true)

  // Filtro global de ano letivo e avaliação
  // Padrão: 2025 (último ano com dados completos de notas e resultados)
  const anoAtual = new Date().getFullYear()
  const [anoLetivo, setAnoLetivo] = useState<string>('2025')
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([])
  const [avaliacoes, setAvaliacoes] = useState<{ id: string; nome: string; tipo: string }[]>([])
  const [avaliacaoId, setAvaliacaoId] = useState<string>('')

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

  // Buscar anos letivos disponíveis (do banco + garantir ano atual)
  useEffect(() => {
    // Gerar anos base: ano anterior e atual (garantidos mesmo sem dados)
    const anosBase = new Set([String(anoAtual - 1), String(anoAtual)])

    // Buscar anos com dados reais da API
    fetch(`/api/admin/dashboard-dados?apenas_anos=true`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.filtros?.anosLetivos) {
          data.filtros.anosLetivos.forEach((a: string) => anosBase.add(a))
        }
        setAnosDisponiveis(Array.from(anosBase).sort().reverse())
      })
      .catch(() => {
        setAnosDisponiveis(Array.from(anosBase).sort().reverse())
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Buscar avaliações quando o ano letivo mudar
  useEffect(() => {
    if (anoLetivo.length !== 4) return
    fetch(`/api/admin/avaliacoes?ano_letivo=${anoLetivo}`)
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : []
        setAvaliacoes(lista)
        if (lista.length === 1) setAvaliacaoId(lista[0].id)
        else setAvaliacaoId('')
      })
      .catch(() => { setAvaliacoes([]); setAvaliacaoId('') })
  }, [anoLetivo])

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
      if (anoLetivo) {
        url.searchParams.set('ano_letivo', anoLetivo)
      }
      if (avaliacaoId) {
        url.searchParams.set('avaliacao_id', avaliacaoId)
      }
      console.log('[PainelDados] Buscando estatísticas da API - série:', serieParam || 'todas', 'ano:', anoLetivo)
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
          mediaLp: Number(data.mediaLp) || 0,
          mediaMat: Number(data.mediaMat) || 0,
          mediaProd: Number(data.mediaProd) || 0,
          mediaCh: Number(data.mediaCh) || 0,
          mediaCn: Number(data.mediaCn) || 0,
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
  }, [estatisticasEndpoint, anoLetivo, avaliacaoId])

  // Carregar estatísticas iniciais e recarregar quando ano/avaliação/série mudar
  useEffect(() => {
    carregarEstatisticas(filtrosAlunos.serie)
  }, [carregarEstatisticas, filtrosAlunos.serie])

  // Carregar séries da configuração filtradas pelo ano letivo selecionado
  useEffect(() => {
    const carregarSeriesConfig = async () => {
      try {
        const url = anoLetivo
          ? `/api/admin/configuracao-series?ano_letivo=${anoLetivo}`
          : '/api/admin/configuracao-series'
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          if (data?.series && Array.isArray(data.series)) {
            const seriesFormatadas = data.series
              .map((s: { serie: string; nome_serie?: string }) => s.nome_serie || `${s.serie}º Ano`)
              .sort((a: string, b: string) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '0')
                const numB = parseInt(b.match(/\d+/)?.[0] || '0')
                return numA - numB
              })
            setListaSeries(seriesFormatadas)
            // Se a série selecionada não existe no novo ano, limpar o filtro
            if (filtrosAlunos.serie && !seriesFormatadas.includes(filtrosAlunos.serie)) {
              setFiltrosAlunos(prev => ({ ...prev, serie: undefined }))
            }
          } else {
            setListaSeries([])
          }
        }
      } catch (error) {
        console.error('[PainelDados] Erro ao carregar séries:', error)
      }
    }
    carregarSeriesConfig()
  }, [anoLetivo])

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
      if (anoLetivo) url.searchParams.set('ano_letivo', anoLetivo)
      if (avaliacaoId) url.searchParams.set('avaliacao_id', avaliacaoId)

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
  }, [escolasEndpoint, filtrosAlunos.serie, anoLetivo, avaliacaoId])

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
      if (anoLetivo) url.searchParams.set('ano_letivo', anoLetivo)
      if (avaliacaoId) url.searchParams.set('avaliacao_id', avaliacaoId)

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
  }, [turmasEndpoint, filtrosAlunos.serie, anoLetivo, avaliacaoId])

  // Recarregar escolas e turmas automaticamente quando filtros globais mudarem (se já pesquisou)
  useEffect(() => {
    if (pesquisouEscolas) {
      carregarEscolas(filtrosAlunos.serie)
    }
    if (pesquisouTurmas) {
      carregarTurmas(filtrosAlunos.serie)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosAlunos.serie, anoLetivo, avaliacaoId])

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
      if (anoLetivo) params.set('ano_letivo', anoLetivo)
      if (avaliacaoId) params.set('avaliacao_id', avaliacaoId)
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

  // Carregar listas de escolas e turmas filtradas pelo ano letivo
  const carregarFiltros = useCallback(async () => {
    try {
      const promises: Promise<void>[] = []

      if (escolasEndpoint) {
        const urlEscolas = new URL(escolasEndpoint, window.location.origin)
        if (anoLetivo) urlEscolas.searchParams.set('ano_letivo', anoLetivo)
        promises.push(
          fetch(urlEscolas.toString())
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) setListaEscolas(Array.isArray(data) ? data : data.escolas || [])
            })
        )
      }

      if (turmasEndpoint) {
        const urlTurmas = new URL(turmasEndpoint, window.location.origin)
        if (anoLetivo) urlTurmas.searchParams.set('ano_letivo', anoLetivo)
        promises.push(
          fetch(urlTurmas.toString())
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
      setFiltrosCarregados(true)
    }
  }, [escolasEndpoint, turmasEndpoint, anoLetivo])

  // Carregar listas de escolas e turmas (recarrega quando ano letivo muda)
  useEffect(() => {
    carregarFiltros()
    // Limpar filtros de escola/turma ao mudar ano (podem não existir no novo ano)
    setFiltrosAlunos(prev => ({ ...prev, escola_id: undefined, turma_id: undefined }))
  }, [carregarFiltros])

  // Media Geral: usar valor calculado pelo backend (divisor fixo: /3 anos iniciais, /4 anos finais)
  const mediaGeralCalculada = estatisticas.mediaGeral

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{getTitulo()}</h1>
            {estatisticas.nomePolo && tipoUsuario === 'escola' && (
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">Polo: {estatisticas.nomePolo}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Ano Letivo</label>
              <select
                value={anoLetivo}
                onChange={(e) => {
                  setAnoLetivo(e.target.value)
                  setAvaliacaoId('')
                }}
                className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium appearance-none cursor-pointer bg-no-repeat bg-[length:16px_16px] bg-[position:right_8px_center] bg-[image:url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')]"
              >
                {anosDisponiveis.length === 0 ? (
                  <option value={anoLetivo}>{anoLetivo}</option>
                ) : (
                  anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))
                )}
              </select>
            </div>
            {avaliacoes.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Avaliação</label>
                <select
                  value={avaliacaoId}
                  onChange={(e) => setAvaliacaoId(e.target.value)}
                  className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white appearance-none cursor-pointer bg-no-repeat bg-[length:16px_16px] bg-[position:right_8px_center] bg-[image:url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')]"
                >
                  <option value="">Todas</option>
                  {avaliacoes.map(av => (
                    <option key={av.id} value={av.id}>{av.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
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
        <AbaGeral estatisticas={estatisticas} tipoUsuario={tipoUsuario} carregando={carregando} serieSelecionada={filtrosAlunos.serie} mediaGeralCalculada={mediaGeralCalculada} />
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
        <AbaAnalises estatisticas={estatisticas} carregando={carregando} serieSelecionada={filtrosAlunos.serie} mediaGeralCalculada={mediaGeralCalculada} />
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
