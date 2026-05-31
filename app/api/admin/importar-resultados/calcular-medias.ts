/**
 * Cálculos de notas, médias e níveis de aprendizagem por aluno.
 */
import {
  calcularNivelAluno, calcularNivelPorAcertos, calcularNivelPorNota,
  converterNivelProducao, isAnosIniciais,
} from '@/lib/config-series'
import { ConfigSerieRow } from './helpers-serie'

export interface AcertosPorDisciplina {
  acertosLP: number
  acertosCH: number
  acertosMAT: number
  acertosCN: number
}

export interface NotasCalculadas {
  notaLP: number
  notaCH: number
  notaMAT: number
  notaCN: number
  mediaAluno: number
  totalQuestoesEsperadas: number
}

/**
 * Calcula notas (LP/CH/MAT/CN) e média do aluno a partir dos acertos.
 * Usa configuração de série do banco quando disponível; cai em fallback
 * baseado no número da série quando não houver.
 */
export function calcularNotasEMedia(
  acertos: AcertosPorDisciplina,
  serie: string,
  configSerie: ConfigSerieRow | undefined,
  notaProducaoPlanilha: number | null
): NotasCalculadas {
  const { acertosLP, acertosCH, acertosMAT, acertosCN } = acertos
  const serieNum = parseInt(serie.replace(/[^\d]/g, ''))

  let notaLP = 0, notaCH = 0, notaMAT = 0, notaCN = 0
  let totalQuestoesEsperadas = 0

  if (configSerie) {
    if (configSerie.avalia_lp) totalQuestoesEsperadas += configSerie.qtd_questoes_lp || 0
    if (configSerie.avalia_mat) totalQuestoesEsperadas += configSerie.qtd_questoes_mat || 0
    if (configSerie.avalia_ch) totalQuestoesEsperadas += configSerie.qtd_questoes_ch || 0
    if (configSerie.avalia_cn) totalQuestoesEsperadas += configSerie.qtd_questoes_cn || 0

    if (configSerie.avalia_lp && configSerie.qtd_questoes_lp > 0) {
      notaLP = acertosLP > 0 ? (acertosLP / configSerie.qtd_questoes_lp) * 10 : 0
    }
    if (configSerie.avalia_mat && configSerie.qtd_questoes_mat > 0) {
      notaMAT = acertosMAT > 0 ? (acertosMAT / configSerie.qtd_questoes_mat) * 10 : 0
    }
    if (configSerie.avalia_ch && configSerie.qtd_questoes_ch > 0) {
      notaCH = acertosCH > 0 ? (acertosCH / configSerie.qtd_questoes_ch) * 10 : 0
    }
    if (configSerie.avalia_cn && configSerie.qtd_questoes_cn > 0) {
      notaCN = acertosCN > 0 ? (acertosCN / configSerie.qtd_questoes_cn) * 10 : 0
    }
  } else {
    // Fallback baseado no número da série
    totalQuestoesEsperadas = serieNum >= 1 && serieNum <= 5 ? 28 : 60

    if (serieNum === 2 || serieNum === 3) {
      notaLP = acertosLP > 0 ? (acertosLP / 14) * 10 : 0
      notaMAT = acertosMAT > 0 ? (acertosMAT / 14) * 10 : 0
    } else if (serieNum === 5) {
      notaLP = acertosLP > 0 ? (acertosLP / 14) * 10 : 0
      notaMAT = acertosMAT > 0 ? (acertosMAT / 20) * 10 : 0
    } else {
      notaLP = acertosLP > 0 ? (acertosLP / 20) * 10 : 0
      notaCH = acertosCH > 0 ? (acertosCH / 10) * 10 : 0
      notaMAT = acertosMAT > 0 ? (acertosMAT / 20) * 10 : 0
      notaCN = acertosCN > 0 ? (acertosCN / 10) * 10 : 0
    }
  }

  // Média
  let mediaAluno = 0
  if (configSerie) {
    let somaNotas = 0
    let disciplinasAvaliadas = 0
    if (configSerie.avalia_lp) { somaNotas += notaLP; disciplinasAvaliadas++ }
    if (configSerie.avalia_mat) { somaNotas += notaMAT; disciplinasAvaliadas++ }
    if (configSerie.avalia_ch) { somaNotas += notaCH; disciplinasAvaliadas++ }
    if (configSerie.avalia_cn) { somaNotas += notaCN; disciplinasAvaliadas++ }

    if (disciplinasAvaliadas > 0) {
      const mediaObjetiva = somaNotas / disciplinasAvaliadas
      // 70% objetiva + 30% produção quando aplicável
      if ((configSerie.qtd_itens_producao || 0) > 0 && notaProducaoPlanilha && notaProducaoPlanilha > 0) {
        mediaAluno = mediaObjetiva * 0.7 + notaProducaoPlanilha * 0.3
      } else {
        mediaAluno = mediaObjetiva
      }
    }
  } else {
    if (serieNum >= 1 && serieNum <= 5) {
      const mediaObjetiva = (notaLP + notaMAT) / 2
      if (notaProducaoPlanilha && notaProducaoPlanilha > 0) {
        mediaAluno = mediaObjetiva * 0.7 + notaProducaoPlanilha * 0.3
      } else {
        mediaAluno = mediaObjetiva
      }
    } else {
      mediaAluno = (notaLP + notaCH + notaMAT + notaCN) / 4
    }
  }

  return { notaLP, notaCH, notaMAT, notaCN, mediaAluno, totalQuestoesEsperadas }
}

export interface NiveisAprendizagem {
  nivelLp: string | null
  nivelMat: string | null
  nivelProd: string | null
  nivelAluno: string | null
}

/**
 * Calcula níveis de aprendizagem por disciplina (apenas Anos Iniciais).
 * Anos finais: tudo null.
 */
export function calcularNiveis(
  serie: string,
  acertos: AcertosPorDisciplina,
  notaProducaoPlanilha: number | null,
  nivelProducao: string | null,
  alunoFaltouOuSemDados: boolean
): NiveisAprendizagem {
  if (!isAnosIniciais(serie) || alunoFaltouOuSemDados) {
    return { nivelLp: null, nivelMat: null, nivelProd: null, nivelAluno: null }
  }

  const nivelLp = calcularNivelPorAcertos(acertos.acertosLP, serie, 'LP')
  const nivelMat = calcularNivelPorAcertos(acertos.acertosMAT, serie, 'MAT')

  let nivelProd = converterNivelProducao(nivelProducao)
  if (!nivelProd && notaProducaoPlanilha !== null && notaProducaoPlanilha !== undefined && Number(notaProducaoPlanilha) > 0) {
    nivelProd = calcularNivelPorNota(Number(notaProducaoPlanilha))
  }

  const nivelAluno = calcularNivelAluno(nivelLp, nivelMat, nivelProd)
  return { nivelLp, nivelMat, nivelProd, nivelAluno }
}
