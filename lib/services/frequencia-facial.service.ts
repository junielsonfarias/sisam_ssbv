/**
 * Propagacao de presenca facial -> frequencia por disciplina (anos finais).
 *
 * REGRA DE NEGOCIO (definida em 31/05/2026):
 * - Creche / 1o ao 5o ano: frequencia UNIFICADA — 1 registro por aluno/dia
 *   em `frequencia_diaria` (ja feito pelo endpoint facial).
 * - 6o ao 9o ano: frequencia POR DISCIPLINA — ate 6 registros/dia em
 *   `frequencia_hora_aula`, conforme `horarios_aula` da turma.
 *
 * Quando o terminal facial reconhece um aluno de anos finais, alem de
 * gravar `frequencia_diaria` (pra rastreabilidade do "esteve no predio"),
 * ESTE service propaga a presenca para TODAS as aulas previstas naquele
 * dia da semana, conforme o quadro de aulas da turma. Professor pode
 * editar individualmente depois se aluno faltou em alguma aula.
 *
 * Idempotente via UNIQUE(aluno_id, data, numero_aula) — se ja houver
 * registro nao-facial (lancamento manual do professor) o ON CONFLICT
 * PRESERVA o lancamento manual e nao sobrescreve.
 */

import type { PoolClient } from 'pg'
import { isAnosFinais } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('FrequenciaFacial')

export interface PropagarPresencaParams {
  aluno_id: string
  turma_id: string
  data: string         // YYYY-MM-DD
  serie: string | null
  usuario_id?: string | null
}

export interface PropagacaoResultado {
  propagado: boolean
  aulas_marcadas: number
  motivo_skip?: 'serie_anos_iniciais' | 'serie_desconhecida' | 'sem_horario'
}

/**
 * Para anos finais (6o-9o), insere/atualiza `frequencia_hora_aula` em
 * todas as aulas previstas no `horarios_aula` daquela turma + dia_semana.
 *
 * Para anos iniciais (creche-5o) ou serie sem regra clara: nao faz nada
 * (o `frequencia_diaria` ja cobre).
 *
 * Deve ser chamado DENTRO de uma transacao do caller (BEGIN/COMMIT
 * controlados externamente). Recebe o `client` ja com BEGIN ativo.
 */
export async function propagarPresencaFacialParaHoraAula(
  client: PoolClient,
  params: PropagarPresencaParams
): Promise<PropagacaoResultado> {
  if (!params.serie) {
    return { propagado: false, aulas_marcadas: 0, motivo_skip: 'serie_desconhecida' }
  }

  if (!isAnosFinais(params.serie)) {
    // Creche, 1o ao 5o ano: frequencia diaria unificada — nao propagar
    return { propagado: false, aulas_marcadas: 0, motivo_skip: 'serie_anos_iniciais' }
  }

  // EXTRACT(DOW FROM date) em PostgreSQL: 0=domingo, 1=segunda...6=sabado.
  // horarios_aula.dia_semana usa 1-5 (seg-sex), entao o JOIN ja filtra
  // automaticamente fins de semana (sem aulas previstas).
  //
  // Para cada (numero_aula, disciplina_id) do horario, INSERT com
  // ON CONFLICT que PRESERVA registros manuais do professor:
  //   - Se NAO existe registro: cria com metodo='facial', presente=true
  //   - Se ja existe com metodo='manual': NAO altera (professor sabe melhor)
  //   - Se ja existe com metodo='facial': atualiza atualizado_em (idempotente)
  const result = await client.query(
    `WITH aulas_do_dia AS (
       SELECT ha.numero_aula, ha.disciplina_id
         FROM horarios_aula ha
        WHERE ha.turma_id = $1
          AND ha.dia_semana = EXTRACT(DOW FROM $3::date)::int
     )
     INSERT INTO frequencia_hora_aula
       (aluno_id, turma_id, escola_id, data, numero_aula, disciplina_id, presente, metodo, registrado_por)
     SELECT $2, $1, (SELECT escola_id FROM turmas WHERE id = $1), $3, a.numero_aula, a.disciplina_id, true, 'facial', $4
       FROM aulas_do_dia a
     ON CONFLICT (aluno_id, data, numero_aula) DO UPDATE
        SET atualizado_em = CURRENT_TIMESTAMP
      WHERE frequencia_hora_aula.metodo = 'facial'
     RETURNING id`,
    [params.turma_id, params.aluno_id, params.data, params.usuario_id ?? null]
  )

  const aulasMarcadas = result.rowCount ?? 0

  if (aulasMarcadas === 0) {
    log.warn(`Facial em anos finais SEM horarios_aula | turma:${params.turma_id} | aluno:${params.aluno_id} | data:${params.data}`)
    return { propagado: false, aulas_marcadas: 0, motivo_skip: 'sem_horario' }
  }

  log.info(`Facial propagado | aluno:${params.aluno_id} | data:${params.data} | aulas:${aulasMarcadas}`)
  return { propagado: true, aulas_marcadas: aulasMarcadas }
}
