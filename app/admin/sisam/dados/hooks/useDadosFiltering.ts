import { useCallback } from 'react'
import {
  compararSeries as compararSeriesLib,
  compararDisciplinas as compararDisciplinasLib,
  isAnosIniciais as isAnosIniciaisLib,
  getDisciplinasValidas
} from '@/lib/disciplinas-mapping'
import { toNumber } from '@/lib/dados/utils'
import type { DashboardData } from '@/lib/dados/types'

interface UseDadosFilteringParams {
  dadosCache: DashboardData | null
  calcularAnaliseDeResumos: (resumos: DashboardData['resumosPorSerie'], serie: string, disciplina?: string) => any
}

export function useDadosFiltering({ dadosCache, calcularAnaliseDeResumos }: UseDadosFilteringParams) {
  const compararSeries = compararSeriesLib
  const compararDisciplinas = compararDisciplinasLib

  const filtrarDadosLocal = useCallback((serie: string, disciplina?: string) => {
    if (!dadosCache) return null

    // Se série vazia E disciplina vazia, retorna os dados completos do cache
    if (!serie && !disciplina) return dadosCache

    // Usar funções centralizadas para verificar tipo de ensino e disciplinas válidas
    const isAnosIniciais = isAnosIniciaisLib(serie)
    const disciplinasValidas = getDisciplinasValidas(serie)

    // Filtrar alunos pela série (comparação flexível)
    const alunosFiltrados = serie
      ? (dadosCache.alunosDetalhados?.filter(aluno => compararSeries(aluno.serie, serie)) || [])
      : (dadosCache.alunosDetalhados || [])

    // Filtrar médias por série
    const mediasPorSerieFiltradas = serie
      ? (dadosCache.mediasPorSerie?.filter(m => compararSeries(m.serie, serie)) || [])
      : (dadosCache.mediasPorSerie || [])

    // Filtrar turmas pela série (recalcular baseado nos alunos filtrados)
    let turmasFiltradas: typeof dadosCache.mediasPorTurma = []

    if (serie && alunosFiltrados.length > 0) {
      const turmasMap = new Map<string, {
        turma_id: string
        turma: string
        escola: string
        serie: string
        total_alunos: number
        presentes: number
        faltantes: number
        soma_geral: number
        count_geral: number
        soma_lp: number
        count_lp: number
        soma_mat: number
        count_mat: number
        soma_prod: number
        count_prod: number
        soma_ch: number
        count_ch: number
        soma_cn: number
        count_cn: number
      }>()

      const turmasDados = new Map<string, { turma: string, escola: string, serie: string }>()
      dadosCache.mediasPorTurma?.forEach(t => {
        turmasDados.set(t.turma_id, { turma: t.turma, escola: t.escola, serie: t.serie })
      })
      const escolasNomes = new Map<string, string>()
      dadosCache.mediasPorEscola?.forEach(e => {
        escolasNomes.set(e.escola_id, e.escola)
      })
      dadosCache.filtros?.turmas?.forEach((t) => {
        if (!turmasDados.has(String(t.id))) {
          const escolaNome = escolasNomes.get(String(t.escola_id)) || ''
          turmasDados.set(String(t.id), { turma: t.codigo || '', escola: escolaNome, serie: '' })
        }
      })

      for (const aluno of alunosFiltrados) {
        const turmaId = aluno.turma_id ? String(aluno.turma_id) : ''
        if (!turmaId || turmaId === 'undefined' || turmaId === 'null' || turmaId === '') continue

        const presencaUpper = aluno.presenca?.toString().toUpperCase()
        const isPresente = presencaUpper === 'P'
        const isFaltante = presencaUpper === 'F'

        if (!isPresente && !isFaltante) continue

        if (!turmasMap.has(turmaId)) {
          const dados = turmasDados.get(turmaId)
          turmasMap.set(turmaId, {
            turma_id: turmaId,
            turma: dados?.turma || '',
            escola: dados?.escola || '',
            serie: dados?.serie || aluno.serie || '',
            total_alunos: 0,
            presentes: 0,
            faltantes: 0,
            soma_geral: 0,
            count_geral: 0,
            soma_lp: 0,
            count_lp: 0,
            soma_mat: 0,
            count_mat: 0,
            soma_prod: 0,
            count_prod: 0,
            soma_ch: 0,
            count_ch: 0,
            soma_cn: 0,
            count_cn: 0
          })
        }

        const acc = turmasMap.get(turmaId)!
        acc.total_alunos++

        if (isPresente) {
          acc.presentes++
          const notaLp = toNumber(aluno.nota_lp)
          const notaMat = toNumber(aluno.nota_mat)
          const notaCh = toNumber(aluno.nota_ch)
          const notaCn = toNumber(aluno.nota_cn)
          const notaProd = toNumber(aluno.nota_producao)

          const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
          const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

          let somaNotas = 0
          let countNotas = 0
          if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
          if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
          if (isAnosIniciaisAluno) {
            if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
          } else {
            if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
            if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
          }
          const mediaCalculada = countNotas > 0 ? somaNotas / countNotas : 0

          if (mediaCalculada > 0) { acc.soma_geral += mediaCalculada; acc.count_geral++ }
          if (notaLp > 0) { acc.soma_lp += notaLp; acc.count_lp++ }
          if (notaMat > 0) { acc.soma_mat += notaMat; acc.count_mat++ }
          if (notaCh > 0) { acc.soma_ch += notaCh; acc.count_ch++ }
          if (notaCn > 0) { acc.soma_cn += notaCn; acc.count_cn++ }
          if (notaProd > 0) { acc.soma_prod += notaProd; acc.count_prod++ }
        }
        if (isFaltante) acc.faltantes++
      }

      const calcMediaArredondada = (soma: number, count: number) => count > 0 ? Math.round((soma / count) * 100) / 100 : 0
      turmasFiltradas = Array.from(turmasMap.values()).map(acc => ({
        turma_id: acc.turma_id,
        turma: acc.turma,
        escola: acc.escola,
        serie: acc.serie,
        total_alunos: acc.total_alunos,
        media_geral: calcMediaArredondada(acc.soma_geral, acc.count_geral),
        media_lp: calcMediaArredondada(acc.soma_lp, acc.count_lp),
        media_mat: calcMediaArredondada(acc.soma_mat, acc.count_mat),
        media_prod: calcMediaArredondada(acc.soma_prod, acc.count_prod),
        media_ch: calcMediaArredondada(acc.soma_ch, acc.count_ch),
        media_cn: calcMediaArredondada(acc.soma_cn, acc.count_cn),
        presentes: acc.presentes,
        faltantes: acc.faltantes
      }))

      if (turmasFiltradas.length === 0) {
        turmasFiltradas = dadosCache.mediasPorTurma?.filter(t => compararSeries(t.serie, serie)) || []
      }
    } else if (serie) {
      turmasFiltradas = dadosCache.mediasPorTurma?.filter(t => compararSeries(t.serie, serie)) || []
    } else {
      turmasFiltradas = dadosCache.mediasPorTurma || []
    }

    // Filtrar escolas (recalcular baseado nos alunos filtrados)
    const escolasIds = [...new Set(alunosFiltrados.map(a => a.escola_id))]
    let escolasFiltradas: typeof dadosCache.mediasPorEscola = []

    if (serie && alunosFiltrados.length > 0) {
      const escolasMap = new Map<string, {
        escola_id: string
        escola: string
        polo: string
        turmas_ids: Set<string>
        total_alunos: number
        presentes: number
        faltantes: number
        soma_geral: number
        count_geral: number
        soma_lp: number
        count_lp: number
        soma_mat: number
        count_mat: number
        soma_prod: number
        count_prod: number
        soma_ch: number
        count_ch: number
        soma_cn: number
        count_cn: number
      }>()

      const escolasDados = new Map<string, { escola: string, polo: string }>()
      dadosCache.mediasPorEscola?.forEach(e => {
        escolasDados.set(e.escola_id, { escola: e.escola, polo: e.polo })
      })

      for (const aluno of alunosFiltrados) {
        const escolaId = String(aluno.escola_id)
        const presencaUpper = aluno.presenca?.toString().toUpperCase()
        const isPresente = presencaUpper === 'P'
        const isFaltante = presencaUpper === 'F'

        if (!isPresente && !isFaltante) continue

        if (!escolasMap.has(escolaId)) {
          const dados = escolasDados.get(escolaId)
          escolasMap.set(escolaId, {
            escola_id: escolaId,
            escola: dados?.escola || '',
            polo: dados?.polo || '',
            turmas_ids: new Set<string>(),
            total_alunos: 0,
            presentes: 0,
            faltantes: 0,
            soma_geral: 0,
            count_geral: 0,
            soma_lp: 0,
            count_lp: 0,
            soma_mat: 0,
            count_mat: 0,
            soma_prod: 0,
            count_prod: 0,
            soma_ch: 0,
            count_ch: 0,
            soma_cn: 0,
            count_cn: 0
          })
        }

        const acc = escolasMap.get(escolaId)!
        if (aluno.turma_id) {
          acc.turmas_ids.add(String(aluno.turma_id))
        }
        acc.total_alunos++

        if (isPresente) {
          acc.presentes++
          const notaLp = toNumber(aluno.nota_lp)
          const notaMat = toNumber(aluno.nota_mat)
          const notaCh = toNumber(aluno.nota_ch)
          const notaCn = toNumber(aluno.nota_cn)
          const notaProd = toNumber(aluno.nota_producao)

          const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
          const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

          let somaNotas = 0
          let countNotas = 0
          if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
          if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
          if (isAnosIniciaisAluno) {
            if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
          } else {
            if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
            if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
          }
          const mediaCalculada = countNotas > 0 ? somaNotas / countNotas : 0

          if (mediaCalculada > 0) { acc.soma_geral += mediaCalculada; acc.count_geral++ }
          if (notaLp > 0) { acc.soma_lp += notaLp; acc.count_lp++ }
          if (notaMat > 0) { acc.soma_mat += notaMat; acc.count_mat++ }
          if (notaCh > 0) { acc.soma_ch += notaCh; acc.count_ch++ }
          if (notaCn > 0) { acc.soma_cn += notaCn; acc.count_cn++ }
          if (notaProd > 0) { acc.soma_prod += notaProd; acc.count_prod++ }
        }
        if (isFaltante) acc.faltantes++
      }

      const calcMediaArredondada = (soma: number, count: number) => count > 0 ? Math.round((soma / count) * 100) / 100 : 0
      escolasFiltradas = Array.from(escolasMap.values()).map(acc => ({
        escola_id: acc.escola_id,
        escola: acc.escola,
        polo: acc.polo,
        total_turmas: acc.turmas_ids.size,
        total_alunos: acc.total_alunos,
        media_geral: calcMediaArredondada(acc.soma_geral, acc.count_geral),
        media_lp: calcMediaArredondada(acc.soma_lp, acc.count_lp),
        media_mat: calcMediaArredondada(acc.soma_mat, acc.count_mat),
        media_prod: calcMediaArredondada(acc.soma_prod, acc.count_prod),
        media_ch: calcMediaArredondada(acc.soma_ch, acc.count_ch),
        media_cn: calcMediaArredondada(acc.soma_cn, acc.count_cn),
        presentes: acc.presentes,
        faltantes: acc.faltantes
      }))

      if (escolasFiltradas.length === 0) {
        escolasFiltradas = dadosCache.mediasPorEscola?.filter(e => escolasIds.includes(e.escola_id)) || []
      }
    } else if (serie) {
      escolasFiltradas = dadosCache.mediasPorEscola?.filter(e => escolasIds.includes(e.escola_id)) || []
    } else {
      escolasFiltradas = dadosCache.mediasPorEscola || []
    }

    // Filtrar análise de acertos/erros
    let analiseAcertosErrosFiltrada = dadosCache.analiseAcertosErros

    if (dadosCache.resumosPorSerie && (serie || disciplina)) {
      const analiseCalculada = calcularAnaliseDeResumos(dadosCache.resumosPorSerie, serie, disciplina)
      if (analiseCalculada) {
        analiseAcertosErrosFiltrada = analiseCalculada
      }
    } else if (dadosCache.analiseAcertosErros) {
      const filtrarPorDisciplina = (d: { disciplina: string }) => {
        if (disciplina) {
          return compararDisciplinas(d.disciplina, disciplina)
        }
        return disciplinasValidas.some(dv => compararDisciplinas(d.disciplina, dv))
      }

      const taxaAcertoPorDisciplinaFiltrada = dadosCache.analiseAcertosErros.taxaAcertoPorDisciplina?.filter(filtrarPorDisciplina) || []
      const questoesComMaisErrosFiltradas = dadosCache.analiseAcertosErros.questoesComMaisErros?.filter(filtrarPorDisciplina) || []
      const questoesComMaisAcertosFiltradas = dadosCache.analiseAcertosErros.questoesComMaisAcertos?.filter(filtrarPorDisciplina) || []

      const turmasComMaisErrosFiltradas = dadosCache.analiseAcertosErros.turmasComMaisErros?.filter(t =>
        compararSeries(t.serie, serie)
      ) || []

      const turmasComMaisAcertosFiltradas = dadosCache.analiseAcertosErros.turmasComMaisAcertos?.filter(t =>
        compararSeries(t.serie, serie)
      ) || []

      const escolasComMaisErrosFiltradas = dadosCache.analiseAcertosErros.escolasComMaisErros?.filter(e =>
        escolasIds.includes(e.escola_id)
      ) || []

      const escolasComMaisAcertosFiltradas = dadosCache.analiseAcertosErros.escolasComMaisAcertos?.filter(e =>
        escolasIds.includes(e.escola_id)
      ) || []

      const totalRespostas = taxaAcertoPorDisciplinaFiltrada.reduce((acc, d) => acc + d.total_respostas, 0)
      const totalAcertos = taxaAcertoPorDisciplinaFiltrada.reduce((acc, d) => acc + d.total_acertos, 0)
      const totalErros = taxaAcertoPorDisciplinaFiltrada.reduce((acc, d) => acc + d.total_erros, 0)

      analiseAcertosErrosFiltrada = {
        taxaAcertoGeral: totalRespostas > 0 ? {
          total_respostas: totalRespostas,
          total_acertos: totalAcertos,
          total_erros: totalErros,
          taxa_acerto_geral: (totalAcertos / totalRespostas) * 100,
          taxa_erro_geral: (totalErros / totalRespostas) * 100
        } : null,
        taxaAcertoPorDisciplina: taxaAcertoPorDisciplinaFiltrada,
        questoesComMaisErros: questoesComMaisErrosFiltradas,
        questoesComMaisAcertos: questoesComMaisAcertosFiltradas,
        turmasComMaisErros: turmasComMaisErrosFiltradas,
        turmasComMaisAcertos: turmasComMaisAcertosFiltradas,
        escolasComMaisErros: escolasComMaisErrosFiltradas,
        escolasComMaisAcertos: escolasComMaisAcertosFiltradas
      }
    }

    // ========== CALCULO OTIMIZADO EM UMA UNICA PASSADA ==========
    const totalAlunos = alunosFiltrados.length

    const estatisticas = alunosFiltrados.reduce((acc, aluno) => {
      const isPresente = aluno.presenca === 'P' || aluno.presenca === 'p'
      const isFaltante = aluno.presenca === 'F' || aluno.presenca === 'f'

      if (isPresente) acc.presentes++

      const notaLp = toNumber(aluno.nota_lp)
      const notaMat = toNumber(aluno.nota_mat)
      const notaCh = toNumber(aluno.nota_ch)
      const notaCn = toNumber(aluno.nota_cn)
      const notaProd = toNumber(aluno.nota_producao)

      const numeroSerie = aluno.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciaisAluno = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'

      let somaNotas = 0
      let countNotas = 0
      if (notaLp > 0) { somaNotas += notaLp; countNotas++ }
      if (notaMat > 0) { somaNotas += notaMat; countNotas++ }
      if (isAnosIniciaisAluno) {
        if (notaProd > 0) { somaNotas += notaProd; countNotas++ }
      } else {
        if (notaCh > 0) { somaNotas += notaCh; countNotas++ }
        if (notaCn > 0) { somaNotas += notaCn; countNotas++ }
      }
      const mediaCalculada = countNotas > 0 ? somaNotas / countNotas : 0

      if (mediaCalculada > 0) {
        acc.somaGeral += mediaCalculada
        acc.countGeral++
        if (mediaCalculada < acc.menorMedia) acc.menorMedia = mediaCalculada
        if (mediaCalculada > acc.maiorMedia) acc.maiorMedia = mediaCalculada

        if (isPresente) {
          if (mediaCalculada < 2) acc.faixas['0 a 2']++
          else if (mediaCalculada < 4) acc.faixas['2 a 4']++
          else if (mediaCalculada < 6) acc.faixas['4 a 6']++
          else if (mediaCalculada < 8) acc.faixas['6 a 8']++
          else acc.faixas['8 a 10']++
        }
      }
      if (notaLp > 0) { acc.somaLp += notaLp; acc.countLp++ }
      if (notaMat > 0) { acc.somaMat += notaMat; acc.countMat++ }
      if (notaCh > 0) { acc.somaCh += notaCh; acc.countCh++ }
      if (notaCn > 0) { acc.somaCn += notaCn; acc.countCn++ }
      if (notaProd > 0) { acc.somaProd += notaProd; acc.countProd++ }

      if (isAnosIniciaisAluno && (isPresente || isFaltante)) {
        const nivel = aluno.nivel_aluno || aluno.nivel_aprendizagem || 'Não classificado'
        acc.niveis[nivel] = (acc.niveis[nivel] || 0) + 1
      }

      return acc
    }, {
      presentes: 0,
      somaGeral: 0, countGeral: 0,
      somaLp: 0, countLp: 0,
      somaMat: 0, countMat: 0,
      somaCh: 0, countCh: 0,
      somaCn: 0, countCn: 0,
      somaProd: 0, countProd: 0,
      menorMedia: Infinity,
      maiorMedia: 0,
      faixas: { '0 a 2': 0, '2 a 4': 0, '4 a 6': 0, '6 a 8': 0, '8 a 10': 0 } as Record<string, number>,
      niveis: {} as Record<string, number>
    })

    const presentes = estatisticas.presentes
    const faltantes = totalAlunos - presentes
    const mediaGeral = estatisticas.countGeral > 0 ? estatisticas.somaGeral / estatisticas.countGeral : 0
    const mediaLp = estatisticas.countLp > 0 ? estatisticas.somaLp / estatisticas.countLp : 0
    const mediaMat = estatisticas.countMat > 0 ? estatisticas.somaMat / estatisticas.countMat : 0
    const mediaCh = estatisticas.countCh > 0 ? estatisticas.somaCh / estatisticas.countCh : 0
    const mediaCn = estatisticas.countCn > 0 ? estatisticas.somaCn / estatisticas.countCn : 0
    const mediaProducao = estatisticas.countProd > 0 ? estatisticas.somaProd / estatisticas.countProd : 0
    const menorMedia = estatisticas.menorMedia === Infinity ? 0 : estatisticas.menorMedia
    const maiorMedia = estatisticas.maiorMedia

    const ordemNiveis: Record<string, number> = {
      'Insuficiente': 1, 'N1': 1,
      'Básico': 2, 'N2': 2,
      'Adequado': 3, 'N3': 3,
      'Avançado': 4, 'N4': 4,
      'Não classificado': 5
    }
    const niveisFiltrados = Object.entries(estatisticas.niveis)
      .map(([nivel, quantidade]) => ({ nivel, quantidade }))
      .sort((a, b) => (ordemNiveis[a.nivel] || 6) - (ordemNiveis[b.nivel] || 6))

    const faixasNotaFiltradas = Object.entries(estatisticas.faixas).map(([faixa, quantidade]) => ({
      faixa,
      quantidade
    }))

    const presencaFiltrada = [
      { status: 'Presente', quantidade: presentes },
      { status: 'Faltante', quantidade: faltantes }
    ]

    return {
      ...dadosCache,
      metricas: {
        ...dadosCache.metricas,
        total_alunos: totalAlunos,
        total_escolas: escolasFiltradas.length,
        total_turmas: turmasFiltradas.length,
        total_presentes: presentes,
        total_faltantes: faltantes,
        taxa_presenca: totalAlunos > 0 ? (presentes / totalAlunos) * 100 : 0,
        media_geral: mediaGeral,
        media_lp: mediaLp,
        media_mat: mediaMat,
        media_ch: mediaCh,
        media_cn: mediaCn,
        media_producao: mediaProducao,
        menor_media: menorMedia,
        maior_media: maiorMedia
      },
      niveis: niveisFiltrados,
      faixasNota: faixasNotaFiltradas,
      presenca: presencaFiltrada,
      alunosDetalhados: alunosFiltrados,
      mediasPorSerie: mediasPorSerieFiltradas,
      mediasPorTurma: turmasFiltradas,
      mediasPorEscola: escolasFiltradas,
      analiseAcertosErros: analiseAcertosErrosFiltrada
    } as DashboardData
  }, [dadosCache, calcularAnaliseDeResumos])

  return { filtrarDadosLocal }
}
