/**
 * Classificador de eventos do terminal facial.
 *
 * Cada scan vira 1 linha em `presenca_facial_eventos` com tipo:
 *   entrada   = primeiro scan ANTES do meio do turno
 *   saida     = primeiro scan DEPOIS do meio do turno (apos uma entrada)
 *   duplicado = scan repetido no mesmo lado da janela do turno
 *
 * Por que turno e nao janela fixa de 30min:
 *   No SISAM, ~98% das turmas (matutino + vespertino) sao de meio
 *   periodo, sem volta apos almoco. O horario oficial da turma
 *   (turmas.hora_inicio + turmas.hora_fim) define exatamente quando
 *   esperar entrada vs saida. Janela de 30min era frageil — em turma
 *   de 4h, dois scans com 35min de intervalo no inicio davam falsa
 *   "saida".
 *
 * Algoritmo:
 *   - Calcula ponto_meio = (hora_inicio + hora_fim) / 2.
 *   - Scan ANTES do ponto_meio = "lado entrada".
 *   - Scan DEPOIS do ponto_meio = "lado saida".
 *   - Lado entrada:
 *       sem registro ainda            -> entrada
 *       ja tem entrada nesse lado     -> duplicado
 *   - Lado saida:
 *       ainda nao registrou saida     -> saida
 *       ja registrou saida nesse lado -> duplicado
 *
 * Fallback (turma sem hora_inicio/hora_fim cadastrados):
 *   Usa defaults por turno (matutino 7-12, vespertino 13-17:30,
 *   noturno 19-22:30). Turno integral (raro) cai na janela de 30min
 *   antiga, pois pode ter pausa de almoco.
 *
 * Cobre o problema descrito em 31/05/2026:
 *   Matutino 7-12, meio=9:30. 7:00 -> ENTRADA. 7:15 -> DUPLICADO
 *   (ainda lado entrada). 11:30 -> SAIDA (lado saida). 11:32 ->
 *   DUPLICADO (ja saiu).
 */

import type { PoolClient } from 'pg'
import { createLogger } from '@/lib/logger'

const log = createLogger('PresencaFacialEventos')

export type TipoEvento = 'entrada' | 'saida' | 'duplicado'
/** Mantida apenas para fallback em turma integral (sem horario fixo). */
export const JANELA_DUPLICADO_MIN = 30

interface UltimoEvento {
  tipo: TipoEvento
  registrado_em: string  // timestamptz ISO
}

/**
 * Horario oficial da turma. `hora_inicio`/`hora_fim` em formato HH:MM:SS
 * (PostgreSQL TIME). `turno` para fallback quando horario nao cadastrado.
 */
export interface HorarioTurma {
  turno: string | null
  hora_inicio: string | null
  hora_fim: string | null
}

/**
 * Defaults por turno (HH:MM) quando turmas.hora_inicio/fim nao
 * estiverem cadastrados. Cobre os turnos mais comuns. Turno 'integral'
 * deliberadamente fora — cai no fallback de janela.
 */
const DEFAULTS_POR_TURNO: Record<string, { inicio: string; fim: string }> = {
  matutino:   { inicio: '07:00', fim: '12:00' },
  vespertino: { inicio: '13:00', fim: '17:30' },
  noturno:    { inicio: '19:00', fim: '22:30' },
}

/**
 * Converte HH:MM ou HH:MM:SS em minutos desde meia-noite local.
 * Retorna null se invalido.
 */
function hhmmParaMinutos(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hhmm)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/**
 * Retorna a janela [inicio, fim, meio] (em minutos desde meia-noite)
 * para a turma. Usa hora_inicio/fim quando ambos existem; senao, default
 * por turno. Retorna null para integral ou turno desconhecido.
 */
export function calcularJanelaTurno(horario: HorarioTurma): { inicio: number; fim: number; meio: number } | null {
  let ini = hhmmParaMinutos(horario.hora_inicio)
  let fim = hhmmParaMinutos(horario.hora_fim)
  if (ini == null || fim == null) {
    const def = horario.turno ? DEFAULTS_POR_TURNO[horario.turno.toLowerCase()] : undefined
    if (!def) return null
    ini = hhmmParaMinutos(def.inicio)!
    fim = hhmmParaMinutos(def.fim)!
  }
  if (fim <= ini) return null
  return { inicio: ini, fim, meio: Math.floor((ini + fim) / 2) }
}

/** Minutos desde meia-noite local de um Date. */
function minutosLocais(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
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
 * Classifica o tipo do evento dado o estado do dia E o horario da turma.
 *
 * Quando horarioTurma estiver disponivel (~98% das turmas matutino/
 * vespertino), usa o ponto medio do turno como divisor entre "lado
 * entrada" e "lado saida". Caso contrario (turma integral ou sem turno
 * cadastrado), cai no fallback antigo de janela de 30min.
 */
export function classificarEvento(
  ultimo: UltimoEvento | null,
  agora: Date,
  horarioTurma?: HorarioTurma | null
): TipoEvento {
  if (ultimo?.tipo === 'duplicado') {
    log.warn(`classificarEvento recebeu ultimo='duplicado' (devia ser filtrado pelo caller)`)
    return 'duplicado'
  }

  const janela = horarioTurma ? calcularJanelaTurno(horarioTurma) : null

  // ---- CAMINHO PRINCIPAL: turma com horario definido (turno fechado) ----
  if (janela) {
    const minAgora = minutosLocais(agora)
    const ladoSaida = minAgora >= janela.meio
    if (!ultimo) {
      // Sem registros hoje: primeiro scan sempre vira entrada, mesmo
      // que tenha sido tarde — admin pode ajustar manualmente. O caso
      // "aluno chegou so as 14h em turma matutina" e raro.
      return 'entrada'
    }
    if (!ladoSaida) {
      // Estamos antes do meio do turno -> lado entrada.
      // Se ja tem entrada, e duplicado. Se so tem saida (caso bizarro),
      // tratamos como nova entrada (raro: scanou fora do horario).
      return ultimo.tipo === 'entrada' ? 'duplicado' : 'entrada'
    }
    // Estamos depois do meio do turno -> lado saida.
    // Se ainda nao registrou saida hoje, este e a saida. Se ja saiu,
    // duplicado (passou de novo).
    return ultimo.tipo === 'saida' ? 'duplicado' : 'saida'
  }

  // ---- FALLBACK: turma sem horario cadastrado (integral, etc) ----
  if (!ultimo) return 'entrada'
  const deltaMs = agora.getTime() - new Date(ultimo.registrado_em).getTime()
  const deltaMin = deltaMs / 60_000
  if (deltaMin < JANELA_DUPLICADO_MIN) return 'duplicado'
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
  // 1) Buscar ultimo evento NAO-DUPLICADO + horario da turma em paralelo
  const [ultimoResult, turmaResult] = await Promise.all([
    client.query<{ tipo: TipoEvento; registrado_em: string }>(
      `SELECT tipo, registrado_em
         FROM presenca_facial_eventos
        WHERE aluno_id = $1 AND data = $2 AND tipo IN ('entrada','saida')
        ORDER BY registrado_em DESC
        LIMIT 1`,
      [params.aluno_id, params.data]
    ),
    client.query<{ turno: string | null; hora_inicio: string | null; hora_fim: string | null }>(
      `SELECT turno, hora_inicio::text AS hora_inicio, hora_fim::text AS hora_fim
         FROM turmas WHERE id = $1 LIMIT 1`,
      [alunoTurmaId]
    ),
  ])
  const ultimo: UltimoEvento | null = ultimoResult.rows[0] ?? null
  const horarioTurma: HorarioTurma | null = turmaResult.rows[0] ?? null

  const tipo = classificarEvento(ultimo, params.registrado_em, horarioTurma)

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
