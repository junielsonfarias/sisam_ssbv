/**
 * Service de Analytics Preditiva — Risco de Evasão Escolar.
 *
 * **Não é Machine Learning real.** É um sistema de pesos baseado em
 * regras pedagógicas conhecidas, calibrado para ser interpretável.
 *
 * Funciona como um score 0-100 calculado a partir de fatores:
 *  - Frequência (peso 35) — fator mais correlacionado a evasão
 *  - Notas (peso 25)
 *  - Caso FICAI ativo (peso 20)
 *  - Histórico social: Bolsa Família + idade > esperada (peso 10)
 *  - Histórico de transferências/abandono prévio (peso 10)
 *
 * Classificação final:
 *  - 0-30:  Baixo risco
 *  - 31-60: Médio risco (alerta)
 *  - 61-100: Alto risco (ação imediata)
 *
 * Sem dependência de bibliotecas ML — totalmente em SQL + lógica simples.
 *
 * Recomendação: validar empiricamente comparando previsões com evasões
 * reais ao longo de 2-3 ciclos letivos. Se acurácia < 70%, ajustar pesos.
 *
 * @module services/analytics-preditiva
 */

import pool from '@/database/connection'

export type NivelRisco = 'baixo' | 'medio' | 'alto'

export interface FatorRisco {
  nome: string
  contribuicao: number
  detalhe: string
}

export interface PredicaoEvasao {
  aluno_id: string
  aluno_nome: string
  escola_id: string | null
  escola_nome: string | null
  turma_codigo: string | null
  score: number
  nivel: NivelRisco
  fatores: FatorRisco[]
}

const LIMITE_MEDIO = 31
const LIMITE_ALTO = 61

function classificarRisco(score: number): NivelRisco {
  if (score >= LIMITE_ALTO) return 'alto'
  if (score >= LIMITE_MEDIO) return 'medio'
  return 'baixo'
}

/**
 * Calcula risco para um aluno específico.
 */
export async function calcularRiscoAluno(
  alunoId: string,
  anoLetivo: string
): Promise<PredicaoEvasao | null> {
  // Dados básicos
  const alR = await pool.query(
    `SELECT a.id, a.nome, a.data_nascimento, a.serie, a.escola_id,
            a.beneficiario_bolsa_familia,
            e.nome AS escola_nome, t.codigo AS turma_codigo
       FROM alunos a
       LEFT JOIN escolas e ON e.id = a.escola_id
       LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE a.id = $1`,
    [alunoId]
  )
  const aluno = alR.rows[0]
  if (!aluno) return null

  const fatores: FatorRisco[] = []
  let score = 0

  // Fator 1: Frequência (peso 35)
  try {
    const freq = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE presenca IN ('P','p'))::float / NULLIF(COUNT(*), 0) AS pct
         FROM frequencia_diaria
        WHERE aluno_id = $1 AND data BETWEEN ($2 || '-01-01')::date AND ($2 || '-12-31')::date`,
      [alunoId, anoLetivo]
    )
    const pct = freq.rows[0]?.pct ? parseFloat(freq.rows[0].pct) * 100 : null
    if (pct != null) {
      let contrib = 0
      if (pct < 50) { contrib = 35; fatores.push({ nome: 'Frequência crítica (<50%)', contribuicao: 35, detalhe: `${pct.toFixed(1)}%` }) }
      else if (pct < 75) { contrib = 20; fatores.push({ nome: 'Frequência baixa (<75%)', contribuicao: 20, detalhe: `${pct.toFixed(1)}%` }) }
      else if (pct < 85) { contrib = 10; fatores.push({ nome: 'Frequência regular (<85%)', contribuicao: 10, detalhe: `${pct.toFixed(1)}%` }) }
      score += contrib
    }
  } catch { /* sem dados */ }

  // Fator 2: Notas (peso 25)
  try {
    const nota = await pool.query(
      `SELECT AVG(CAST(nota AS NUMERIC)) AS media
         FROM notas_escolares
        WHERE aluno_id = $1 AND ano_letivo = $2 AND nota IS NOT NULL`,
      [alunoId, anoLetivo]
    )
    const media = nota.rows[0]?.media ? parseFloat(nota.rows[0].media) : null
    if (media != null) {
      let contrib = 0
      if (media < 4) { contrib = 25; fatores.push({ nome: 'Média crítica (<4.0)', contribuicao: 25, detalhe: media.toFixed(1) }) }
      else if (media < 5) { contrib = 18; fatores.push({ nome: 'Média baixa (<5.0)', contribuicao: 18, detalhe: media.toFixed(1) }) }
      else if (media < 6) { contrib = 10; fatores.push({ nome: 'Média insuficiente (<6.0)', contribuicao: 10, detalhe: media.toFixed(1) }) }
      score += contrib
    }
  } catch { /* sem dados */ }

  // Fator 3: FICAI ativo (peso 20)
  try {
    const ficai = await pool.query(
      `SELECT COUNT(*) AS total
         FROM ficai_casos
        WHERE aluno_id = $1 AND status IN (
          'aberto', 'contato_responsavel', 'encaminhado_conselho_tutelar',
          'encaminhado_ministerio_publico'
        )`,
      [alunoId]
    )
    const total = parseInt(ficai.rows[0]?.total || '0', 10)
    if (total > 0) {
      score += 20
      fatores.push({ nome: 'Caso FICAI ativo', contribuicao: 20, detalhe: `${total} caso(s)` })
    }
  } catch { /* sem dados */ }

  // Fator 4: Histórico social (peso 10) — Bolsa Família + idade-série acima do esperado
  if (aluno.beneficiario_bolsa_familia) {
    score += 5
    fatores.push({ nome: 'Beneficiário Bolsa Família', contribuicao: 5, detalhe: 'Vulnerabilidade socioeconômica' })
  }

  if (aluno.data_nascimento && aluno.serie) {
    try {
      const idade = Math.floor((Date.now() - new Date(aluno.data_nascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      const serieNum = parseInt(String(aluno.serie).replace(/[^0-9]/g, ''), 10)
      if (serieNum) {
        const idadeEsperada = serieNum + 5
        if (idade >= idadeEsperada + 2) {
          score += 5
          fatores.push({
            nome: 'Distorção idade-série',
            contribuicao: 5,
            detalhe: `${idade} anos na ${serieNum}ª série (esperado: ${idadeEsperada})`,
          })
        }
      }
    } catch { /* ignora se conversão falhar */ }
  }

  // Fator 5: Histórico de transferências/abandono prévio (peso 10)
  try {
    const hist = await pool.query(
      `SELECT COUNT(*) AS total
         FROM historico_situacao
        WHERE aluno_id = $1 AND situacao IN ('abandono', 'evadido', 'transferido')`,
      [alunoId]
    )
    const total = parseInt(hist.rows[0]?.total || '0', 10)
    if (total >= 2) {
      score += 10
      fatores.push({ nome: 'Histórico instável', contribuicao: 10, detalhe: `${total} transferência(s)/abandono(s) anterior(es)` })
    } else if (total === 1) {
      score += 5
      fatores.push({ nome: 'Histórico de transferência', contribuicao: 5, detalhe: '1 evento anterior' })
    }
  } catch { /* tabela pode não existir */ }

  score = Math.min(100, Math.round(score))

  return {
    aluno_id: aluno.id,
    aluno_nome: aluno.nome,
    escola_id: aluno.escola_id,
    escola_nome: aluno.escola_nome,
    turma_codigo: aluno.turma_codigo,
    score,
    nivel: classificarRisco(score),
    fatores: fatores.sort((a, b) => b.contribuicao - a.contribuicao),
  }
}

/**
 * Calcula risco para todos alunos da escola (ou município se omitida).
 * Retorna lista ordenada do maior risco para o menor.
 */
export async function listarRiscosEscola(params: {
  escolaId?: string
  anoLetivo: string
  nivelMinimo?: NivelRisco
  limite?: number
}): Promise<PredicaoEvasao[]> {
  const where: string[] = ['a.ativo IS NOT FALSE']
  const queryParams: unknown[] = []
  let i = 1

  if (params.escolaId) {
    queryParams.push(params.escolaId)
    where.push(`a.escola_id = $${i++}`)
  }

  const alunosR = await pool.query(
    `SELECT a.id FROM alunos a WHERE ${where.join(' AND ')} ORDER BY a.nome LIMIT 1000`,
    queryParams
  )

  // Calcula risco para cada aluno (sequencial para não sobrecarregar pool)
  const predicoes: PredicaoEvasao[] = []
  for (const a of alunosR.rows) {
    const p = await calcularRiscoAluno(a.id, params.anoLetivo)
    if (p) predicoes.push(p)
  }

  // Filtra por nível mínimo
  const minScore = params.nivelMinimo === 'alto' ? LIMITE_ALTO
    : params.nivelMinimo === 'medio' ? LIMITE_MEDIO : 0

  const filtrados = predicoes
    .filter((p) => p.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limite ?? 100)

  return filtrados
}

/**
 * Estatísticas agregadas de risco por escola.
 */
export async function estatisticasRisco(anoLetivo: string) {
  const riscos = await listarRiscosEscola({ anoLetivo, limite: 10000 })

  const total = riscos.length
  const alto = riscos.filter((r) => r.nivel === 'alto').length
  const medio = riscos.filter((r) => r.nivel === 'medio').length
  const baixo = riscos.filter((r) => r.nivel === 'baixo').length

  return {
    total_avaliados: total,
    alto_risco: alto,
    medio_risco: medio,
    baixo_risco: baixo,
    percentual_alto: total > 0 ? Math.round((alto / total) * 1000) / 10 : 0,
    percentual_medio_ou_alto: total > 0 ? Math.round(((alto + medio) / total) * 1000) / 10 : 0,
  }
}
