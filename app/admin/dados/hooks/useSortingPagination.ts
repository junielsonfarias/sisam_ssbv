import { useMemo, useCallback } from 'react'
import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'
import { isAnosIniciais as isAnosIniciaisLib } from '@/lib/disciplinas-mapping'
import { toNumber } from '@/lib/dados/utils'
import type { DashboardData, RegistroComMedias } from '@/lib/dados/types'

interface UseSortingPaginationParams {
  dados: DashboardData | null
  dadosCache: DashboardData | null
  filtroPoloId: string
  filtroEscolaId: string
  filtroSerie: string
  filtroTurmaId: string
  filtroTipoEnsino: string
  filtroDisciplina: string
  ordenacao: { coluna: string; direcao: 'asc' | 'desc' }
  paginaAtual: number
  itensPorPagina: number
  abaAtiva: string
}

export function useSortingPagination(params: UseSortingPaginationParams) {
  const {
    dados, dadosCache,
    filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId,
    filtroTipoEnsino, filtroDisciplina,
    ordenacao, paginaAtual, itensPorPagina, abaAtiva,
  } = params

  // Função para verificar se uma disciplina é aplicável à série do aluno
  const isDisciplinaAplicavel = useCallback((serie: string | null | undefined, disciplinaCodigo: string): boolean => {
    if (!serie) return true

    const numeroSerie = serie.match(/(\d+)/)?.[1]
    const isAnosIniciais = ['2', '3', '5'].includes(numeroSerie || '')

    if (isAnosIniciais && (disciplinaCodigo === 'CH' || disciplinaCodigo === 'CN')) {
      return false
    }

    if (!isAnosIniciais && (disciplinaCodigo === 'PROD' || disciplinaCodigo === 'NIVEL')) {
      return false
    }

    return true
  }, [])

  // Obter disciplinas que devem ser exibidas
  const disciplinasExibir = useMemo(() => {
    if (filtroSerie) {
      return obterDisciplinasPorSerieSync(filtroSerie)
    }

    if (filtroTipoEnsino === 'anos_iniciais') {
      return obterDisciplinasPorSerieSync('2º Ano')
    } else if (filtroTipoEnsino === 'anos_finais') {
      return obterDisciplinasPorSerieSync('6º Ano')
    }

    return obterDisciplinasPorSerieSync(null)
  }, [filtroSerie, filtroTipoEnsino])

  // Função para obter o total de questões correto para uma disciplina baseado na série do aluno
  const getTotalQuestoesPorSerie = useCallback((resultado: { serie?: string | null; qtd_questoes_lp?: number | null; qtd_questoes_mat?: number | null; qtd_questoes_ch?: number | null; qtd_questoes_cn?: number | null }, codigoDisciplina: string): number | undefined => {
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

  // Escolas filtradas por polo
  const escolasFiltradas = useMemo(() => {
    if (!dados?.filtros.escolas) return []
    if (!filtroPoloId) return []
    return dados.filtros.escolas.filter(e => String(e.polo_id) === String(filtroPoloId))
  }, [dados?.filtros.escolas, filtroPoloId])

  // Turmas filtradas por escola E série
  const turmasFiltradas = useMemo(() => {
    if (!dados?.filtros.turmas) return []
    if (!filtroSerie) return []
    let turmas = dados.filtros.turmas
    if (filtroEscolaId) {
      turmas = turmas.filter(t => String(t.escola_id) === String(filtroEscolaId))
    }
    return turmas
  }, [dados?.filtros.turmas, filtroEscolaId, filtroSerie])

  // Séries para os chips
  const seriesFiltradas = useMemo(() => {
    if (!dados?.filtros.series) return []
    return dados.filtros.series
  }, [dados?.filtros.series])

  // Disciplinas disponíveis filtradas por Etapa/Série
  const disciplinasDisponiveis = useMemo(() => {
    const todas = [
      { value: '', label: 'Todas as disciplinas' },
      { value: 'LP', label: 'Lingua Portuguesa' },
      { value: 'MAT', label: 'Matematica' },
      { value: 'CH', label: 'Ciencias Humanas' },
      { value: 'CN', label: 'Ciencias da Natureza' },
      { value: 'PT', label: 'Producao Textual' }
    ]

    const isAnosIniciais = filtroTipoEnsino === 'anos_iniciais' ||
      (filtroSerie && isAnosIniciaisLib(filtroSerie))

    const isAnosFinais = filtroTipoEnsino === 'anos_finais' ||
      (filtroSerie && !isAnosIniciaisLib(filtroSerie) && filtroSerie.match(/\d+/)?.[0] &&
        ['6', '7', '8', '9'].includes(filtroSerie.match(/\d+/)![0]))

    if (isAnosIniciais) {
      return todas.filter(d => ['', 'LP', 'MAT', 'PT'].includes(d.value))
    }

    if (isAnosFinais) {
      return todas.filter(d => ['', 'LP', 'MAT', 'CH', 'CN'].includes(d.value))
    }

    return todas
  }, [filtroTipoEnsino, filtroSerie])

  // Helper para obter dados da disciplina selecionada
  const disciplinaSelecionadaInfo = useMemo(() => {
    if (!filtroDisciplina || !dados?.metricas) return null

    const mapaDisciplinas: Record<string, { nome: string; media: number; sigla: string; cor: string }> = {
      'LP': { nome: 'Língua Portuguesa', media: dados.metricas.media_lp, sigla: 'LP', cor: 'blue' },
      'MAT': { nome: 'Matemática', media: dados.metricas.media_mat, sigla: 'MAT', cor: 'purple' },
      'CH': { nome: 'Ciências Humanas', media: dados.metricas.media_ch, sigla: 'CH', cor: 'green' },
      'CN': { nome: 'Ciências da Natureza', media: dados.metricas.media_cn, sigla: 'CN', cor: 'amber' },
      'PT': { nome: 'Produção Textual', media: dados.metricas.media_producao, sigla: 'PT', cor: 'rose' }
    }

    return mapaDisciplinas[filtroDisciplina] || null
  }, [filtroDisciplina, dados?.metricas])

  // Função para obter a média da disciplina de um registro
  const getMediaDisciplina = useCallback((registro: RegistroComMedias): number => {
    if (!filtroDisciplina) return toNumber(registro.media_geral ?? registro.media_aluno)

    switch (filtroDisciplina) {
      case 'LP': return toNumber(registro.nota_lp ?? registro.media_lp)
      case 'MAT': return toNumber(registro.nota_mat ?? registro.media_mat)
      case 'CH': return toNumber(registro.nota_ch ?? registro.media_ch)
      case 'CN': return toNumber(registro.nota_cn ?? registro.media_cn)
      case 'PT': return toNumber(registro.nota_producao ?? registro.media_prod)
      default: return toNumber(registro.media_geral ?? registro.media_aluno)
    }
  }, [filtroDisciplina])

  // Calcular médias por etapa de ensino para cada escola
  const mediasPorEtapaEscola = useMemo(() => {
    if (!dadosCache?.alunosDetalhados) return new Map<string, { media_ai: number | null; media_af: number | null }>()

    const escolasMap = new Map<string, {
      soma_ai: number; count_ai: number;
      soma_af: number; count_af: number;
    }>()

    for (const aluno of dadosCache.alunosDetalhados) {
      const escolaId = String(aluno.escola_id)
      const presencaUpper = aluno.presenca?.toString().toUpperCase()
      const isPresente = presencaUpper === 'P'

      if (!isPresente) continue

      const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciais = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'
      const isAnosFinais = numeroSerie === '6' || numeroSerie === '7' || numeroSerie === '8' || numeroSerie === '9'

      if (!isAnosIniciais && !isAnosFinais) continue

      const notaLp = toNumber(aluno.nota_lp)
      const notaMat = toNumber(aluno.nota_mat)
      const notaCh = toNumber(aluno.nota_ch)
      const notaCn = toNumber(aluno.nota_cn)
      const notaProd = toNumber(aluno.nota_producao)

      let somaNotas = 0
      let countNotas = 0
      if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
      if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
      if (isAnosIniciais) {
        if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
      } else {
        if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
        if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
      }
      const mediaAluno = countNotas > 0 ? somaNotas / countNotas : 0

      if (mediaAluno <= 0) continue

      if (!escolasMap.has(escolaId)) {
        escolasMap.set(escolaId, { soma_ai: 0, count_ai: 0, soma_af: 0, count_af: 0 })
      }

      const acc = escolasMap.get(escolaId)!
      if (isAnosIniciais) {
        acc.soma_ai += mediaAluno
        acc.count_ai++
      } else {
        acc.soma_af += mediaAluno
        acc.count_af++
      }
    }

    const resultado = new Map<string, { media_ai: number | null; media_af: number | null }>()
    escolasMap.forEach((acc, escolaId) => {
      resultado.set(escolaId, {
        media_ai: acc.count_ai > 0 ? Math.round((acc.soma_ai / acc.count_ai) * 100) / 100 : null,
        media_af: acc.count_af > 0 ? Math.round((acc.soma_af / acc.count_af) * 100) / 100 : null
      })
    })

    return resultado
  }, [dadosCache?.alunosDetalhados])

  // Ordenação e paginação de escolas
  const escolasOrdenadas = useMemo(() => {
    if (!dados?.mediasPorEscola) return []
    return [...dados.mediasPorEscola].sort((a, b) => {
      const valorA = a[ordenacao.coluna as keyof typeof a]
      const valorB = b[ordenacao.coluna as keyof typeof b]
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA
      }
      return ordenacao.direcao === 'asc'
        ? String(valorA).localeCompare(String(valorB))
        : String(valorB).localeCompare(String(valorA))
    })
  }, [dados?.mediasPorEscola, ordenacao])

  const escolasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    const escolasPagina = escolasOrdenadas.slice(inicio, inicio + itensPorPagina)

    return escolasPagina.map(escola => {
      const mediaEtapa = mediasPorEtapaEscola.get(escola.escola_id)
      const temAnosFinais = mediaEtapa?.media_af !== null && mediaEtapa?.media_af !== undefined
      const temAnosIniciais = mediaEtapa?.media_ai !== null && mediaEtapa?.media_ai !== undefined
      return {
        ...escola,
        media_ai: mediaEtapa?.media_ai ?? null,
        media_af: mediaEtapa?.media_af ?? null,
        media_ch: temAnosFinais ? escola.media_ch : null,
        media_cn: temAnosFinais ? escola.media_cn : null,
        media_prod: temAnosIniciais ? escola.media_prod : null
      }
    })
  }, [escolasOrdenadas, paginaAtual, itensPorPagina, mediasPorEtapaEscola])

  // Ordenação e paginação de turmas
  const turmasOrdenadas = useMemo(() => {
    if (!dados?.mediasPorTurma) return []
    return [...dados.mediasPorTurma].sort((a, b) => {
      const valorA = a[ordenacao.coluna as keyof typeof a]
      const valorB = b[ordenacao.coluna as keyof typeof b]
      if (valorA === null || valorA === undefined) return 1
      if (valorB === null || valorB === undefined) return -1
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA
      }
      return ordenacao.direcao === 'asc'
        ? String(valorA || '').localeCompare(String(valorB || ''))
        : String(valorB || '').localeCompare(String(valorA || ''))
    })
  }, [dados?.mediasPorTurma, ordenacao])

  const turmasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    const turmasPagina = turmasOrdenadas.slice(inicio, inicio + itensPorPagina)

    return turmasPagina.map(turma => {
      const numSerie = turma.serie?.toString().replace(/[^0-9]/g, '') || ''
      const isAnosIniciais = ['2', '3', '5'].includes(numSerie)
      const isAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
      return {
        ...turma,
        media_ch: isAnosFinais ? turma.media_ch : null,
        media_cn: isAnosFinais ? turma.media_cn : null,
        media_prod: isAnosIniciais ? turma.media_prod : null
      }
    })
  }, [turmasOrdenadas, paginaAtual, itensPorPagina])

  // Ordenação e paginação de alunos
  const alunosOrdenados = useMemo(() => {
    if (!dados?.alunosDetalhados) return []
    return [...dados.alunosDetalhados].sort((a, b) => {
      const valorA = a[ordenacao.coluna as keyof typeof a]
      const valorB = b[ordenacao.coluna as keyof typeof b]
      if (valorA === null) return 1
      if (valorB === null) return -1
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA
      }
      return ordenacao.direcao === 'asc'
        ? String(valorA || '').localeCompare(String(valorB || ''))
        : String(valorB || '').localeCompare(String(valorA || ''))
    })
  }, [dados?.alunosDetalhados, ordenacao])

  const alunosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    const alunosPagina = alunosOrdenados.slice(inicio, inicio + itensPorPagina)

    return alunosPagina.map(aluno => {
      const numSerie = aluno.serie?.toString().replace(/[^0-9]/g, '') || ''
      const isAnosIniciais = ['2', '3', '5'].includes(numSerie)
      const isAnosFinais = ['6', '7', '8', '9'].includes(numSerie)
      return {
        ...aluno,
        nota_ch: isAnosFinais ? aluno.nota_ch : null,
        nota_cn: isAnosFinais ? aluno.nota_cn : null,
        nota_producao: isAnosIniciais ? aluno.nota_producao : null
      }
    })
  }, [alunosOrdenados, paginaAtual, itensPorPagina])

  const totalPaginas = useMemo(() => {
    if (abaAtiva === 'escolas') return Math.ceil(escolasOrdenadas.length / itensPorPagina)
    if (abaAtiva === 'alunos') return Math.ceil(alunosOrdenados.length / itensPorPagina)
    if (abaAtiva === 'turmas') return Math.ceil(turmasOrdenadas.length / itensPorPagina)
    return 1
  }, [abaAtiva, escolasOrdenadas.length, alunosOrdenados.length, turmasOrdenadas.length, itensPorPagina])

  return {
    // Filter helpers
    isDisciplinaAplicavel,
    disciplinasExibir,
    getTotalQuestoesPorSerie,
    escolasFiltradas,
    turmasFiltradas,
    seriesFiltradas,
    disciplinasDisponiveis,
    disciplinaSelecionadaInfo,
    getMediaDisciplina,
    mediasPorEtapaEscola,

    // Sorted and paginated data
    escolasOrdenadas,
    escolasPaginadas,
    turmasOrdenadas,
    turmasPaginadas,
    alunosOrdenados,
    alunosPaginados,
    totalPaginas,
  }
}
