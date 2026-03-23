'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'
import { isAnosIniciais } from '@/lib/dados/utils'
import { AlunoSelecionado, OpcaoSelect } from '@/lib/dados/types'
import {
  ResultadoConsolidadoAnalise,
  FiltrosAnalise,
  AvaliacaoOption,
  EstatisticasAnalise,
  PaginacaoState,
} from './types'

interface UsePainelAnaliseOptions {
  resultadosEndpoint: string
  escolasEndpoint?: string
  turmasEndpoint?: string
  polosEndpoint?: string
  mostrarFiltroPolo: boolean
  mostrarFiltroEscola: boolean
  escolaIdFixo?: string
  poloIdFixo?: string
}

export function usePainelAnalise({
  resultadosEndpoint,
  escolasEndpoint,
  turmasEndpoint,
  polosEndpoint,
  mostrarFiltroPolo,
  mostrarFiltroEscola,
  escolaIdFixo,
  poloIdFixo
}: UsePainelAnaliseOptions) {
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
  const [avaliacoesOpcoes, setAvaliacoesOpcoes] = useState<AvaliacaoOption[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSelecionado | null>(null)

  const [paginaAtual, setPaginaAtual] = useState(1)
  const [paginacao, setPaginacao] = useState<PaginacaoState>({
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

      promises.push(fetch('/api/admin/configuracao-series').then(r => r.json()).catch(() => ({ series: [] })))

      const [escolasData, polosData, seriesData] = await Promise.all(promises)
      setEscolas(Array.isArray(escolasData) ? escolasData : [])
      setPolos(Array.isArray(polosData) ? polosData : [])

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

  useEffect(() => {
    if (!filtros.ano_letivo || filtros.ano_letivo.length !== 4) {
      setAvaliacoesOpcoes([])
      return
    }
    fetch(`/api/admin/avaliacoes?ano_letivo=${filtros.ano_letivo}`)
      .then(r => r.json())
      .then(data => {
        const avs = Array.isArray(data) ? data : []
        setAvaliacoesOpcoes(avs)
        if (avs.length === 1 && !filtros.avaliacao_id) {
          handleFiltroChange('avaliacao_id', avs[0].id)
        }
      })
      .catch(() => setAvaliacoesOpcoes([]))
  }, [filtros.ano_letivo])

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

      if (campo === 'ano_letivo') {
        delete novo.avaliacao_id
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

  const mediaGeralCalculada = estatisticasAPI.mediaGeral

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

  const handleBuscar = () => {
    setPaginaAtual(1)
    carregarResultados(1, true, busca)
  }

  const handleLimparBusca = () => {
    setBusca('')
    setPaginaAtual(1)
    carregarResultados(1, true, '')
  }

  return {
    // State
    resultados,
    carregando,
    busca,
    setBusca,
    filtros,
    polos,
    escolas,
    turmas,
    series,
    avaliacoesOpcoes,
    modalAberto,
    alunoSelecionado,
    paginaAtual,
    paginacao,
    estatisticasAPI,

    // Computed
    temFiltrosAtivos,
    mediaGeralCalculada,
    escolasFiltradas,

    // Actions
    carregarResultados,
    handleFiltroChange,
    limparFiltros,
    handleBuscar,
    handleLimparBusca,
    proximaPagina,
    paginaAnterior,
    getTotalQuestoesPorSerie,
    handleVisualizarQuestoes,
    handleFecharModal,
  }
}
