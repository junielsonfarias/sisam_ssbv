/**
 * Builder do registro consolidado de um aluno na Fase 5.
 *
 * @module services/importacao/process/consolidado
 */

import type { ConsolidadoParaInserir } from '../types'

export interface MontarConsolidadoParams {
  alunoId: string
  escolaId: string
  turmaId: string | null
  anoLetivo: string
  avaliacaoId: string
  serie: string | null
  presencaFinal: string
  alunoFaltou: boolean
  semDados: boolean
  totalAcertosLP: number
  totalAcertosCH: number
  totalAcertosMAT: number
  totalAcertosCN: number
  notaLP: number | null
  notaCH: number | null
  notaMAT: number | null
  notaCN: number | null
  mediaFinal: number | null
  notaProducao: number | null
  nivelAprendizagem: string | null
  nivelAprendizagemId: string | null
  tipoAvaliacao: string
  totalQuestoesEsperadas: number
  itensProducaoNotas: (number | null)[]
  nivelLp: string | null
  nivelMat: string | null
  nivelProd: string | null
  nivelAluno: string | null
}

/**
 * Monta o registro consolidado aplicando as regras de zeramento/null para
 * alunos faltantes ou sem dados.
 */
export function montarConsolidado(params: MontarConsolidadoParams): ConsolidadoParaInserir {
  const {
    alunoId, escolaId, turmaId, anoLetivo, avaliacaoId, serie, presencaFinal,
    alunoFaltou, semDados,
    totalAcertosLP, totalAcertosCH, totalAcertosMAT, totalAcertosCN,
    notaLP, notaCH, notaMAT, notaCN, mediaFinal, notaProducao,
    nivelAprendizagem, nivelAprendizagemId, tipoAvaliacao, totalQuestoesEsperadas,
    itensProducaoNotas, nivelLp, nivelMat, nivelProd, nivelAluno,
  } = params

  const semValores = alunoFaltou || semDados

  return {
    aluno_id: alunoId,
    escola_id: escolaId,
    turma_id: turmaId,
    ano_letivo: anoLetivo,
    avaliacao_id: avaliacaoId,
    serie: serie || null,
    presenca: presencaFinal,
    total_acertos_lp: semValores ? 0 : totalAcertosLP,
    total_acertos_ch: semValores ? 0 : totalAcertosCH,
    total_acertos_mat: semValores ? 0 : totalAcertosMAT,
    total_acertos_cn: semValores ? 0 : totalAcertosCN,
    nota_lp: semValores ? null : notaLP,
    nota_ch: semValores ? null : notaCH,
    nota_mat: semValores ? null : notaMAT,
    nota_cn: semValores ? null : notaCN,
    media_aluno: semValores ? null : mediaFinal,
    nota_producao: semValores ? null : notaProducao,
    nivel_aprendizagem: semDados ? null : nivelAprendizagem,
    nivel_aprendizagem_id: semDados ? null : nivelAprendizagemId,
    tipo_avaliacao: tipoAvaliacao,
    total_questoes_esperadas: totalQuestoesEsperadas,
    item_producao_1: semValores ? null : (itensProducaoNotas[0] ?? null),
    item_producao_2: semValores ? null : (itensProducaoNotas[1] ?? null),
    item_producao_3: semValores ? null : (itensProducaoNotas[2] ?? null),
    item_producao_4: semValores ? null : (itensProducaoNotas[3] ?? null),
    item_producao_5: semValores ? null : (itensProducaoNotas[4] ?? null),
    item_producao_6: semValores ? null : (itensProducaoNotas[5] ?? null),
    item_producao_7: semValores ? null : (itensProducaoNotas[6] ?? null),
    item_producao_8: semValores ? null : (itensProducaoNotas[7] ?? null),
    nivel_lp: nivelLp,
    nivel_mat: nivelMat,
    nivel_prod: nivelProd,
    nivel_aluno: nivelAluno,
  }
}
