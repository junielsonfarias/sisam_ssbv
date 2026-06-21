/**
 * Helper de calculo de niveis por disciplina (Anos Iniciais) na Fase 5.
 *
 * @module services/importacao/process/niveis
 */

import {
  calcularNivelPorAcertos,
  converterNivelProducao,
  calcularNivelPorNota,
  calcularNivelAluno,
  isAnosIniciais,
} from '@/lib/config-series'
import { createLogger } from '@/lib/logger'

const log = createLogger('Importacao')

export interface NiveisDisciplina {
  nivelLp: string | null
  nivelMat: string | null
  nivelProd: string | null
  nivelAluno: string | null
}

export interface CalcularNiveisParams {
  serie: string | null
  alunoFaltou: boolean
  semDados: boolean
  totalAcertosLP: number
  totalAcertosMAT: number
  notaProducao: number | null
  nivelAprendizagem: string | null
  /** Indice da linha (usado apenas para limitar logs de debug aos primeiros alunos) */
  indiceLinha: number
  /** Nome do aluno (usado apenas em logs de debug) */
  alunoNome: string
}

/**
 * Calcula os niveis por disciplina (LP, MAT, Producao) e o nivel do aluno.
 * Aplicavel apenas a Anos Iniciais (2o, 3o e 5o ano) com aluno presente e com dados.
 * Caso contrario, retorna todos os niveis como null.
 */
export function calcularNiveisDisciplina(params: CalcularNiveisParams): NiveisDisciplina {
  const {
    serie,
    alunoFaltou,
    semDados,
    totalAcertosLP,
    totalAcertosMAT,
    notaProducao,
    nivelAprendizagem,
    indiceLinha: i,
    alunoNome,
  } = params

  const niveis: NiveisDisciplina = {
    nivelLp: null,
    nivelMat: null,
    nivelProd: null,
    nivelAluno: null,
  }

  if (isAnosIniciais(serie) && !alunoFaltou && !semDados) {
    niveis.nivelLp = calcularNivelPorAcertos(totalAcertosLP, serie, 'LP')
    niveis.nivelMat = calcularNivelPorAcertos(totalAcertosMAT, serie, 'MAT')
    niveis.nivelProd = converterNivelProducao(nivelAprendizagem)
    if (!niveis.nivelProd && notaProducao !== null && notaProducao !== undefined && Number(notaProducao) > 0) {
      niveis.nivelProd = calcularNivelPorNota(Number(notaProducao))
    }
    niveis.nivelAluno = calcularNivelAluno(niveis.nivelLp, niveis.nivelMat, niveis.nivelProd)

    if (i < 3) {
      log.debug(`Niveis calculados para "${alunoNome}" (${serie}):`)
      log.debug(`  - Acertos LP: ${totalAcertosLP} -> Nivel LP: ${niveis.nivelLp}`)
      log.debug(`  - Acertos MAT: ${totalAcertosMAT} -> Nivel MAT: ${niveis.nivelMat}`)
      log.debug(`  - Nivel Producao (${nivelAprendizagem}): ${niveis.nivelProd}`)
      log.debug(`  - Nivel Aluno (media): ${niveis.nivelAluno}`)
    }
  }

  return niveis
}
