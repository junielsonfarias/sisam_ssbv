/**
 * Filtros e cálculos sobre dados offline. Consumido por páginas de
 * análise/comparativos quando o usuário está off-line.
 */
import { toNumber } from '../utils-numeros'
import { getEscolas, getResultados, getTurmas } from './entities'
import { EstatisticasAluno, OfflineResultado, OfflineTurma } from './types'

// ============================================================================
// FILTRAR RESULTADOS
// ============================================================================
export function filterResultados(filters: {
  polo_id?: string | number
  escola_id?: string | number
  turma_id?: string | number
  serie?: string
  ano_letivo?: string
  presenca?: string
}): OfflineResultado[] {
  let resultados = getResultados()
  const escolas = getEscolas()

  // Filtrar por polo — compara como string (suporta UUIDs)
  if (filters.polo_id && filters.polo_id !== '' && filters.polo_id !== 'todos') {
    const poloIdStr = String(filters.polo_id)
    const escolasDoPolo = escolas.filter(e => String(e.polo_id) === poloIdStr).map(e => String(e.id))
    if (escolasDoPolo.length > 0) {
      resultados = resultados.filter(r => escolasDoPolo.includes(String(r.escola_id)))
    } else {
      // Fallback: filtrar pelo polo_id direto no resultado
      resultados = resultados.filter(r => String(r.polo_id) === poloIdStr)
    }
  }

  if (filters.escola_id && filters.escola_id !== '' && filters.escola_id !== 'todas') {
    const escolaIdStr = String(filters.escola_id)
    resultados = resultados.filter(r => String(r.escola_id) === escolaIdStr)
  }

  if (filters.turma_id && filters.turma_id !== '' && filters.turma_id !== 'todas') {
    const turmaIdStr = String(filters.turma_id)
    resultados = resultados.filter(r => String(r.turma_id) === turmaIdStr)
  }

  if (filters.serie && filters.serie !== '' && filters.serie !== 'todas') {
    resultados = resultados.filter(r => r.serie === filters.serie)
  }

  if (filters.ano_letivo && filters.ano_letivo !== '' && filters.ano_letivo !== 'todos') {
    resultados = resultados.filter(r => r.ano_letivo === filters.ano_letivo)
  }

  if (filters.presenca && filters.presenca !== '' && filters.presenca !== 'Todas') {
    const presencaUpper = filters.presenca.toUpperCase()
    resultados = resultados.filter(r => r.presenca?.toUpperCase() === presencaUpper)
  }

  return resultados
}

// ============================================================================
// CALCULAR ESTATÍSTICAS
// ============================================================================
export function calcularEstatisticas(resultados: OfflineResultado[]): {
  total: number
  presentes: number
  faltosos: number
  media_lp: number
  media_mat: number
  media_ch: number
  media_cn: number
  media_producao: number
  media_geral: number
} {
  const presentes = resultados.filter(r => r.presenca?.toUpperCase() === 'P')
  const faltosos = resultados.filter(r => r.presenca?.toUpperCase() === 'F')

  const calcMedia = (valores: (number | string | null | undefined)[]): number => {
    const numeros = valores.map(v => toNumber(v)).filter(n => n > 0)
    if (numeros.length === 0) return 0
    const sum = numeros.reduce((a, b) => a + b, 0)
    return Number((sum / numeros.length).toFixed(2))
  }

  return {
    total: resultados.length,
    presentes: presentes.length,
    faltosos: faltosos.length,
    media_lp: calcMedia(presentes.map(r => r.nota_lp)),
    media_mat: calcMedia(presentes.map(r => r.nota_mat)),
    media_ch: calcMedia(presentes.map(r => r.nota_ch)),
    media_cn: calcMedia(presentes.map(r => r.nota_cn)),
    media_producao: calcMedia(presentes.map(r => r.nota_producao)),
    media_geral: calcMedia(presentes.map(r => r.media_aluno)),
  }
}

// ============================================================================
// RESULTADO POR ALUNO
// ============================================================================
export function getResultadoByAlunoId(alunoId: string | number, anoLetivo?: string): OfflineResultado | null {
  const resultados = getResultados()
  const alunoIdStr = String(alunoId)

  let resultado = resultados.find(r => String(r.aluno_id) === alunoIdStr)
  if (!resultado) {
    resultado = resultados.find(r => String(r.id) === alunoIdStr)
  }

  if (anoLetivo && resultado) {
    const resultadoComAno = resultados.find(r =>
      (String(r.aluno_id) === alunoIdStr || String(r.id) === alunoIdStr) && r.ano_letivo === anoLetivo
    )
    if (resultadoComAno) resultado = resultadoComAno
  }

  return resultado || null
}

// ============================================================================
// ESTATÍSTICAS DETALHADAS DO ALUNO (por área de conhecimento)
// ============================================================================
export function getEstatisticasAluno(alunoId: string | number, anoLetivo?: string): EstatisticasAluno | null {
  const resultado = getResultadoByAlunoId(alunoId, anoLetivo)
  if (!resultado) return null

  // Anos iniciais (2º, 3º, 5º): LP=14, MAT=14, CH=0, CN=0 (produção textual no lugar)
  // Anos finais: LP=20, MAT=20, CH=10, CN=10
  const serieNum = resultado.serie?.toString().replace(/[^0-9]/g, '') || ''
  const isAnosIniciais = ['2', '3', '5'].includes(serieNum)

  const totalLP = toNumber(resultado.total_questoes_lp) || toNumber(resultado.qtd_questoes_lp) || (isAnosIniciais ? 14 : 20)
  const totalCH = toNumber(resultado.total_questoes_ch) || toNumber(resultado.qtd_questoes_ch) || (isAnosIniciais ? 0 : 10)
  const totalMAT = toNumber(resultado.total_questoes_mat) || toNumber(resultado.qtd_questoes_mat) || (isAnosIniciais ? 14 : 20)
  const totalCN = toNumber(resultado.total_questoes_cn) || toNumber(resultado.qtd_questoes_cn) || (isAnosIniciais ? 0 : 10)

  const acertosLP = toNumber(resultado.total_acertos_lp)
  const acertosCH = toNumber(resultado.total_acertos_ch)
  const acertosMAT = toNumber(resultado.total_acertos_mat)
  const acertosCN = toNumber(resultado.total_acertos_cn)

  const errosLP = totalLP - acertosLP
  const errosCH = totalCH - acertosCH
  const errosMAT = totalMAT - acertosMAT
  const errosCN = totalCN - acertosCN

  const totalQuestoes = totalLP + totalCH + totalMAT + totalCN
  const totalAcertos = acertosLP + acertosCH + acertosMAT + acertosCN
  const totalErros = totalQuestoes - totalAcertos

  return {
    aluno: {
      id: String(resultado.aluno_id),
      nome: resultado.aluno_nome,
      serie: resultado.serie || null,
      ano_letivo: resultado.ano_letivo || null,
      escola_nome: resultado.escola_nome,
      turma_codigo: resultado.turma_codigo || null,
    },
    estatisticas: {
      total: totalQuestoes,
      acertos: totalAcertos,
      erros: totalErros,
      por_area: {
        'Língua Portuguesa': { total: totalLP, acertos: acertosLP, erros: errosLP, media: toNumber(resultado.nota_lp) },
        'Ciências Humanas':  { total: totalCH, acertos: acertosCH, erros: errosCH, media: toNumber(resultado.nota_ch) },
        'Matemática':        { total: totalMAT, acertos: acertosMAT, erros: errosMAT, media: toNumber(resultado.nota_mat) },
        'Ciências da Natureza': { total: totalCN, acertos: acertosCN, erros: errosCN, media: toNumber(resultado.nota_cn) },
      },
      media_geral: toNumber(resultado.media_aluno),
      nivel_aprendizagem: resultado.nivel_aprendizagem || null,
      nota_producao: resultado.nota_producao ? toNumber(resultado.nota_producao) : null,
    },
  }
}

// ============================================================================
// LISTAGENS DERIVADAS
// ============================================================================
export function getSeries(): string[] {
  const resultados = getResultados()
  const series = [...new Set(resultados.map(r => r.serie).filter(Boolean))]
  return series.sort()
}

export function getAnosLetivos(): string[] {
  const resultados = getResultados()
  const anos = [...new Set(resultados.map(r => r.ano_letivo).filter(Boolean))]
  return anos.sort((a, b) => Number(b) - Number(a))
}

export function filterTurmas(escola_id?: string | number, serie?: string): OfflineTurma[] {
  let turmas = getTurmas()
  if (escola_id && escola_id !== '' && escola_id !== 'todas') {
    const escolaIdStr = String(escola_id)
    turmas = turmas.filter(t => String(t.escola_id) === escolaIdStr)
  }
  if (serie && serie !== '' && serie !== 'todas') {
    turmas = turmas.filter(t => t.serie === serie)
  }
  return turmas
}
