/**
 * Service de Carga Horária — validação LDB Art. 24.
 *
 * Calcula dias letivos efetivos e carga horária por turma/escola.
 * Validações mínimas conforme LDB:
 *  - 200 dias letivos / ano para Ensino Fundamental
 *  - 800 horas / ano de carga horária mínima
 *  - 4 horas-aula diárias mínimas (excluindo intervalo)
 *
 * @module services/carga-horaria
 */

import pool from '@/database/connection'

export interface RelatorioCargaHoraria {
  ano_letivo: string
  escola_id: string
  escola_nome: string
  turma_id?: string
  turma_codigo?: string
  dias_letivos_planejados: number
  dias_letivos_efetivos: number
  carga_horaria_planejada: number
  carga_horaria_efetiva: number
  // Validações
  cumpre_200_dias: boolean
  cumpre_800_horas: boolean
  alertas: string[]
}

const MIN_DIAS_LETIVOS = 200
const MIN_CARGA_HORARIA = 800
const MIN_HORAS_AULA_DIARIA = 4

/**
 * Calcula dias letivos efetivos no ano para uma escola.
 * Usa a função SQL `contar_dias_letivos` definida na migration.
 */
export async function calcularDiasLetivos(params: {
  anoLetivoId: string
  escolaId: string
  dataInicio: string
  dataFim: string
}): Promise<number> {
  const r = await pool.query(
    `SELECT contar_dias_letivos($1, $2, $3, $4) AS dias`,
    [params.anoLetivoId, params.escolaId, params.dataInicio, params.dataFim]
  )
  return r.rows[0]?.dias ?? 0
}

/**
 * Calcula carga horária semanal de uma turma com base nos horários cadastrados.
 */
export async function calcularCargaHorariaSemanalTurma(turmaId: string): Promise<number> {
  // Verifica se existe tabela horarios_aula
  const r = await pool.query(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.tables
        WHERE table_name = 'horarios_aula'
     ) AS existe`
  )
  if (!r.rows[0]?.existe) return 0

  const result = await pool.query(
    `SELECT COALESCE(SUM(
       CASE
         WHEN duracao_minutos IS NOT NULL THEN duracao_minutos / 60.0
         ELSE 1.0  -- default 1 hora-aula
       END
     ), 0) AS horas_semanais
       FROM horarios_aula
      WHERE turma_id = $1`,
    [turmaId]
  )
  return parseFloat(result.rows[0]?.horas_semanais || '0')
}

/**
 * Gera relatório completo de carga horária por escola, com validações.
 */
export async function gerarRelatorioEscola(params: {
  anoLetivoId: string
  escolaId: string
}): Promise<RelatorioCargaHoraria> {
  // 1. Busca ano letivo
  const anoR = await pool.query(
    `SELECT ano, data_inicio, data_fim, dias_letivos_total
       FROM anos_letivos WHERE id = $1`,
    [params.anoLetivoId]
  )
  const ano = anoR.rows[0]
  if (!ano) throw new Error('Ano letivo não encontrado')

  // 2. Busca escola
  const escR = await pool.query(
    `SELECT nome FROM escolas WHERE id = $1`,
    [params.escolaId]
  )
  const esc = escR.rows[0]
  if (!esc) throw new Error('Escola não encontrada')

  // 3. Calcula dias letivos efetivos
  const dataInicio = ano.data_inicio || `${ano.ano}-02-01`
  const dataFim = ano.data_fim || `${ano.ano}-12-20`
  const diasEfetivos = await calcularDiasLetivos({
    anoLetivoId: params.anoLetivoId,
    escolaId: params.escolaId,
    dataInicio: dataInicio.toString(),
    dataFim: dataFim.toString(),
  })

  // 4. Calcula carga horária média (das turmas da escola)
  const turmasR = await pool.query(
    `SELECT t.id, t.codigo FROM turmas t WHERE t.escola_id = $1 AND t.ativa IS NOT FALSE`,
    [params.escolaId]
  )

  let totalHorasSemanais = 0
  let totalTurmas = 0
  for (const turma of turmasR.rows) {
    const horas = await calcularCargaHorariaSemanalTurma(turma.id)
    totalHorasSemanais += horas
    totalTurmas++
  }

  const horasSemanaisMedia = totalTurmas > 0 ? totalHorasSemanais / totalTurmas : 0
  const semanasLetivas = diasEfetivos / 5  // assume 5 dias letivos por semana
  const cargaHorariaEfetiva = horasSemanaisMedia * semanasLetivas
  const cargaHorariaPlanejada = horasSemanaisMedia * (MIN_DIAS_LETIVOS / 5)

  // 5. Validações
  const cumpre200 = diasEfetivos >= MIN_DIAS_LETIVOS
  const cumpre800 = cargaHorariaEfetiva >= MIN_CARGA_HORARIA

  const alertas: string[] = []
  if (!cumpre200) {
    alertas.push(`Faltam ${MIN_DIAS_LETIVOS - diasEfetivos} dias letivos para atingir o mínimo legal (200).`)
  }
  if (!cumpre800) {
    alertas.push(`Carga horária ${cargaHorariaEfetiva.toFixed(1)}h abaixo do mínimo legal (800h). Faltam ${(MIN_CARGA_HORARIA - cargaHorariaEfetiva).toFixed(1)}h.`)
  }
  if (horasSemanaisMedia < MIN_HORAS_AULA_DIARIA * 5) {
    alertas.push(`Carga horária semanal média (${horasSemanaisMedia.toFixed(1)}h) abaixo do mínimo de ${MIN_HORAS_AULA_DIARIA}h/dia.`)
  }
  if (totalTurmas === 0) {
    alertas.push('Nenhuma turma ativa encontrada — não foi possível calcular carga horária.')
  }

  return {
    ano_letivo: ano.ano,
    escola_id: params.escolaId,
    escola_nome: esc.nome,
    dias_letivos_planejados: ano.dias_letivos_total || MIN_DIAS_LETIVOS,
    dias_letivos_efetivos: diasEfetivos,
    carga_horaria_planejada: Math.round(cargaHorariaPlanejada * 10) / 10,
    carga_horaria_efetiva: Math.round(cargaHorariaEfetiva * 10) / 10,
    cumpre_200_dias: cumpre200,
    cumpre_800_horas: cumpre800,
    alertas,
  }
}

/**
 * Lista alertas de todas as escolas do município no ano letivo atual.
 * Útil para o dashboard SEMED.
 */
export async function listarAlertasMunicipio(anoLetivoId: string): Promise<RelatorioCargaHoraria[]> {
  const escR = await pool.query(
    `SELECT id FROM escolas WHERE ativa IS NOT FALSE`
  )

  const resultados: RelatorioCargaHoraria[] = []
  for (const e of escR.rows) {
    try {
      const r = await gerarRelatorioEscola({ anoLetivoId, escolaId: e.id })
      resultados.push(r)
    } catch {
      // Pula escola com erro
    }
  }
  return resultados
}
