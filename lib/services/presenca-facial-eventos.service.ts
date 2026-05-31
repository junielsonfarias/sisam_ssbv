/**
 * Classificador de eventos do terminal facial.
 *
 * Cada scan vira 1 linha em `presenca_facial_eventos` com tipo:
 *   entrada   = primeiro scan do dia OU primeiro apos uma saida valida
 *   saida     = scan apos uma entrada com >= 30 min de diferenca
 *   duplicado = scan dentro da janela curta (erro provavel)
 *
 * Janelas (em minutos):
 *   - Apos entrada: < 30min = duplicado; >= 30min = saida
 *   - Apos saida:   < 30min = duplicado; >= 30min = nova entrada
 *     (cobre caso de aluno que sai pra lanchar e volta apos pausa).
 *
 * Cobre o problema descrito em 31/05/2026:
 *   7:00 -> ENTRADA. 7:15 (acidental) -> DUPLICADO (nao vira saida).
 *   11:30 (saida real, >= 30min) -> SAIDA. 11:32 (passou de novo) ->
 *   DUPLICADO. 13:00 (volta apos pausa, >= 30min) -> ENTRADA. etc.
 */

import type { PoolClient } from 'pg'
import { createLogger } from '@/lib/logger'

const log = createLogger('PresencaFacialEventos')

export type TipoEvento = 'entrada' | 'saida' | 'duplicado'
export const JANELA_DUPLICADO_MIN = 30

interface UltimoEvento {
  tipo: TipoEvento
  registrado_em: string  // timestamptz ISO
}

export interface RegistrarEventoParams {
  aluno_id: string
  escola_id: string
  registrado_em: Date           // momento real do scan
  data: string                  // YYYY-MM-DD (deve bater com fuso local)
  dispositivo_id?: string | null
  confianca?: number | null
  origem: 'dispositivo' | 'terminal_web'
  registrado_por?: string | null
}

export interface EventoRegistrado {
  id: string
  tipo: TipoEvento
  registrado_em: string
  primeiro_do_dia: boolean
}

/**
 * Classifica o tipo do evento dado o estado do dia.
 *
 * Recebe o ultimo evento NAO-DUPLICADO do dia (ou null se nenhum) e o
 * momento do novo scan. Retorna o tipo a ser atribuido.
 *
 * Algoritmo:
 *   - ultimo == null         -> entrada (primeiro do dia)
 *   - ultimo == 'entrada':
 *       delta < 30min        -> duplicado
 *       delta >= 30min       -> saida
 *   - ultimo == 'saida':
 *       delta < 30min        -> duplicado
 *       delta >= 30min       -> entrada (volta apos pausa)
 */
export function classificarEvento(
  ultimo: UltimoEvento | null,
  agora: Date
): TipoEvento {
  if (!ultimo) return 'entrada'
  if (ultimo.tipo === 'duplicado') {
    log.warn(`classificarEvento recebeu ultimo='duplicado' (devia ser filtrado pelo caller)`)
    return 'duplicado'
  }

  const deltaMs = agora.getTime() - new Date(ultimo.registrado_em).getTime()
  const deltaMin = deltaMs / 60_000
  const dentroJanela = deltaMin < JANELA_DUPLICADO_MIN

  if (dentroJanela) return 'duplicado'
  return ultimo.tipo === 'entrada' ? 'saida' : 'entrada'
}

/**
 * Registra 1 evento em `presenca_facial_eventos` e atualiza
 * `frequencia_diaria` (hora_entrada = primeira entrada do dia;
 * hora_saida = ultima saida do dia).
 *
 * - Eventos 'duplicado' NAO atualizam frequencia_diaria.
 * - 'entrada' atualiza hora_entrada APENAS se ainda nao havia entrada
 *   no dia (primeira do dia); novas entradas (volta apos pausa) ja
 *   nao mexem em hora_entrada.
 * - 'saida' sempre atualiza hora_saida (ultima saida vence).
 *
 * Deve ser chamado dentro de uma transacao (client em BEGIN).
 */
export async function registrarEventoFacial(
  client: PoolClient,
  params: RegistrarEventoParams,
  alunoTurmaId: string
): Promise<EventoRegistrado> {
  // 1) Buscar ultimo evento NAO-DUPLICADO do dia para classificar
  const ultimoResult = await client.query<{ tipo: TipoEvento; registrado_em: string }>(
    `SELECT tipo, registrado_em
       FROM presenca_facial_eventos
      WHERE aluno_id = $1 AND data = $2 AND tipo IN ('entrada','saida')
      ORDER BY registrado_em DESC
      LIMIT 1`,
    [params.aluno_id, params.data]
  )
  const ultimo: UltimoEvento | null = ultimoResult.rows[0] ?? null

  const tipo = classificarEvento(ultimo, params.registrado_em)

  // 2) Inserir o evento (sempre — duplicados tambem ficam no historico)
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO presenca_facial_eventos
       (aluno_id, escola_id, dispositivo_id, registrado_em, data, tipo,
        confianca, origem, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      params.aluno_id, params.escola_id, params.dispositivo_id ?? null,
      params.registrado_em.toISOString(), params.data, tipo,
      params.confianca ?? null, params.origem, params.registrado_por ?? null,
    ]
  )
  const eventoId = inserted.rows[0].id

  // Hora local HH:MM:SS (para frequencia_diaria.hora_entrada / hora_saida)
  const horaLocal = params.registrado_em.toLocaleTimeString('pt-BR', { hour12: false })

  // 3) Atualizar frequencia_diaria conforme tipo
  let primeiroDoDia = false

  if (tipo === 'entrada') {
    // hora_entrada so e setada se ainda nao houver registro hoje
    const upsert = await client.query(
      `INSERT INTO frequencia_diaria
         (aluno_id, turma_id, escola_id, data, hora_entrada, metodo,
          dispositivo_id, confianca, registrado_por)
       VALUES ($1, $2, $3, $4, $5, 'facial', $6, $7, $8)
       ON CONFLICT (aluno_id, data) DO UPDATE
          SET hora_entrada = COALESCE(frequencia_diaria.hora_entrada, EXCLUDED.hora_entrada),
              confianca = GREATEST(COALESCE(frequencia_diaria.confianca, 0), EXCLUDED.confianca),
              atualizado_em = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserido`,
      [
        params.aluno_id, alunoTurmaId, params.escola_id, params.data, horaLocal,
        params.dispositivo_id ?? null, params.confianca ?? null,
        params.registrado_por ?? null,
      ]
    )
    primeiroDoDia = upsert.rows[0]?.inserido === true
  } else if (tipo === 'saida') {
    // saida sempre atualiza (ultima saida vence)
    await client.query(
      `UPDATE frequencia_diaria
          SET hora_saida = $3,
              atualizado_em = CURRENT_TIMESTAMP
        WHERE aluno_id = $1 AND data = $2`,
      [params.aluno_id, params.data, horaLocal]
    )
  }
  // 'duplicado' NAO toca frequencia_diaria

  return {
    id: eventoId,
    tipo,
    registrado_em: params.registrado_em.toISOString(),
    primeiro_do_dia: primeiroDoDia,
  }
}
