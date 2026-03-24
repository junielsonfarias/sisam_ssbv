import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import {
  createWhereBuilder, addCondition, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'

// ============================================================================
// Service de Notificações — lógica de negócio extraída da rota
// ============================================================================

// ============================================================================
// TIPOS
// ============================================================================

export interface NotificacaoUsuario {
  id: string
  tipo_usuario: string
  escola_id?: string | null
  polo_id?: string | null
}

export interface NotificacaoFiltros {
  tipo?: string | null
  apenasNaoLidas?: boolean
  limite?: number
}

export interface NotificacaoItem {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  prioridade: string
  lida: boolean
  lida_em: string | null
  criado_em: string
  escola_id: string | null
  aluno_id: string | null
  turma_id: string | null
  escola_nome: string | null
  aluno_nome: string | null
  turma_codigo: string | null
}

export interface NotificacoesResult {
  notificacoes: NotificacaoItem[]
  nao_lidas: number
}

export interface MarcarLidasResult {
  mensagem: string
}

export interface GerarNotificacoesResult {
  mensagem: string
  geradas: number
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Adiciona filtro de visibilidade por tipo de usuário */
function addNotificacaoAccess(
  where: ReturnType<typeof createWhereBuilder>,
  usuario: NotificacaoUsuario
) {
  if (usuario.tipo_usuario === 'escola') {
    addRawCondition(
      where,
      `(n.destinatario_tipo = 'escola' AND (n.escola_id = $${where.paramIndex} OR n.destinatario_id = $${where.paramIndex + 1}))`,
      [usuario.escola_id || null, usuario.id]
    )
  } else if (usuario.tipo_usuario === 'polo') {
    addRawCondition(
      where,
      `(n.destinatario_tipo IN ('polo', 'escola') AND (n.polo_id = $${where.paramIndex} OR n.destinatario_id = $${where.paramIndex + 1}))`,
      [usuario.polo_id || null, usuario.id]
    )
  } else {
    addRawCondition(where, "n.destinatario_tipo IN ('administrador', 'tecnico')")
  }
}

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Busca notificações com filtro por tipo de usuário.
 * Retorna lista de notificações + contagem de não lidas.
 */
export async function buscarNotificacoes(
  usuario: NotificacaoUsuario,
  filtros: NotificacaoFiltros
): Promise<NotificacoesResult> {
  const { tipo, apenasNaoLidas, limite = 50 } = filtros

  // Query principal
  const where = createWhereBuilder()
  addRawCondition(where, '(n.expira_em IS NULL OR n.expira_em > CURRENT_TIMESTAMP)')
  addNotificacaoAccess(where, usuario)
  addCondition(where, 'n.tipo', tipo)
  if (apenasNaoLidas) addRawCondition(where, 'n.lida = FALSE')

  const result = await pool.query(
    `SELECT n.id, n.tipo, n.titulo, n.mensagem, n.prioridade,
           n.lida, n.lida_em, n.criado_em,
           n.escola_id, n.aluno_id, n.turma_id,
           e.nome as escola_nome, a.nome as aluno_nome, t.codigo as turma_codigo
    FROM notificacoes n
    LEFT JOIN escolas e ON n.escola_id = e.id
    LEFT JOIN alunos a ON n.aluno_id = a.id
    LEFT JOIN turmas t ON n.turma_id = t.id
    WHERE ${buildConditionsString(where)}
    ORDER BY n.criado_em DESC
    LIMIT $${where.paramIndex}`,
    [...where.params, limite]
  )

  // Contagem de não lidas
  const countWhere = createWhereBuilder()
  addRawCondition(countWhere, 'n.lida = FALSE')
  addRawCondition(countWhere, '(n.expira_em IS NULL OR n.expira_em > CURRENT_TIMESTAMP)')
  addNotificacaoAccess(countWhere, usuario)

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM notificacoes n WHERE ${buildConditionsString(countWhere)}`,
    countWhere.params
  )

  return {
    notificacoes: result.rows,
    nao_lidas: parseInt(countResult.rows[0].total)
  }
}

/**
 * Marca notificações como lidas (individual ou todas).
 * Se marcarTodas=true, marca todas as não lidas visíveis para o usuário.
 * Se ids fornecido, marca apenas as notificações especificadas.
 */
export async function marcarComoLidas(
  usuario: NotificacaoUsuario,
  ids?: string[],
  marcarTodas?: boolean
): Promise<MarcarLidasResult> {
  if (marcarTodas) {
    let query = `UPDATE notificacoes SET lida = TRUE, lida_em = CURRENT_TIMESTAMP, lida_por = $1 WHERE lida = FALSE`
    const params: (string | null)[] = [usuario.id]
    let idx = 2

    if (usuario.tipo_usuario === 'escola') {
      query += ` AND destinatario_tipo = 'escola' AND escola_id = $${idx}`
      params.push(usuario.escola_id || null)
    } else if (usuario.tipo_usuario === 'polo') {
      query += ` AND destinatario_tipo IN ('polo', 'escola') AND polo_id = $${idx}`
      params.push(usuario.polo_id || null)
    } else {
      query += ` AND destinatario_tipo IN ('administrador', 'tecnico')`
    }

    await pool.query(query, params)
    return { mensagem: 'Todas marcadas como lidas' }
  }

  if (!ids || ids.length === 0) {
    throw new Error('ids é obrigatório')
  }

  const placeholders = ids.map((_: string, i: number) => `$${i + 2}`).join(',')
  await pool.query(
    `UPDATE notificacoes SET lida = TRUE, lida_em = CURRENT_TIMESTAMP, lida_por = $1 WHERE id IN (${placeholders})`,
    [usuario.id, ...ids]
  )

  return { mensagem: `${ids.length} notificação(ões) marcada(s) como lida(s)` }
}

/**
 * Gera notificações automáticas: infrequência, nota_baixa, recuperação.
 * Usa transação para garantir atomicidade do bulk insert.
 */
export async function gerarNotificacoesAutomaticas(
  tipoGeracao: string,
  anoLetivo: string
): Promise<GerarNotificacoesResult> {
  const ano = anoLetivo || new Date().getFullYear().toString()

  const geradas = await withTransaction(async (client) => {
    let total = 0

    if (tipoGeracao === 'infrequencia' || tipoGeracao === 'todas') {
      // Alunos com frequência < 75%
      const infreq = await client.query(
        `SELECT a.id as aluno_id, a.nome, a.escola_id, e.polo_id,
                fb.percentual_frequencia, pl.nome as periodo
         FROM frequencia_bimestral fb
         JOIN alunos a ON fb.aluno_id = a.id
         JOIN periodos_letivos pl ON fb.periodo_id = pl.id
         JOIN escolas e ON a.escola_id = e.id
         WHERE fb.percentual_frequencia < 75 AND pl.ano_letivo = $1
           AND a.ativo = true
           AND NOT EXISTS (
             SELECT 1 FROM notificacoes n
             WHERE n.aluno_id = a.id AND n.tipo = 'infrequencia'
               AND n.criado_em > CURRENT_TIMESTAMP - INTERVAL '30 days'
           )`,
        [ano]
      )

      if (infreq.rows.length > 0) {
        const values: string[] = []
        const params: (string | null)[] = []
        let idx = 1
        for (const row of infreq.rows) {
          const pctNum = parseFloat(row.percentual_frequencia) || 0
          const pct = pctNum.toFixed(1)
          values.push(`('infrequencia', $${idx}, $${idx+1}, $${idx+2}, 'escola', $${idx+3}, $${idx+4}, $${idx+5})`)
          params.push(
            `Alerta de Infrequência: ${row.nome}`,
            `O aluno ${row.nome} está com ${pct}% de frequência no ${row.periodo}. Atenção para risco de evasão.`,
            pctNum < 50 ? 'urgente' : 'alta',
            row.escola_id, row.polo_id, row.aluno_id
          )
          idx += 6
        }
        await client.query(
          `INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, destinatario_tipo, escola_id, polo_id, aluno_id) VALUES ${values.join(', ')}`,
          params
        )
        total += infreq.rows.length
      }
    }

    if (tipoGeracao === 'nota_baixa' || tipoGeracao === 'todas') {
      // Alunos com nota_final abaixo da média de aprovação (2+ disciplinas)
      const notasBaixas = await client.query(
        `SELECT DISTINCT a.id as aluno_id, a.nome, a.escola_id, e.polo_id,
                COUNT(ne.id) as disciplinas_abaixo
         FROM notas_escolares ne
         JOIN alunos a ON ne.aluno_id = a.id
         JOIN escolas e ON a.escola_id = e.id
         LEFT JOIN configuracao_notas_escola cne ON cne.escola_id = a.escola_id
         JOIN periodos_letivos pl ON ne.periodo_id = pl.id
         WHERE ne.nota_final IS NOT NULL
           AND ne.nota_final < COALESCE(cne.media_aprovacao, 6)
           AND pl.ano_letivo = $1
           AND a.ativo = true
           AND NOT EXISTS (
             SELECT 1 FROM notificacoes n
             WHERE n.aluno_id = a.id AND n.tipo = 'nota_baixa'
               AND n.criado_em > CURRENT_TIMESTAMP - INTERVAL '30 days'
           )
         GROUP BY a.id, a.nome, a.escola_id, e.polo_id
         HAVING COUNT(ne.id) >= 2`,
        [ano]
      )

      if (notasBaixas.rows.length > 0) {
        const values: string[] = []
        const params: (string | null)[] = []
        let idx = 1
        for (const row of notasBaixas.rows) {
          values.push(`('nota_baixa', $${idx}, $${idx+1}, $${idx+2}, 'escola', $${idx+3}, $${idx+4}, $${idx+5})`)
          params.push(
            `Notas Abaixo da Média: ${row.nome}`,
            `O aluno ${row.nome} está com nota abaixo da média em ${row.disciplinas_abaixo} disciplina(s). Considerar encaminhamento para recuperação.`,
            parseInt(row.disciplinas_abaixo) >= 4 ? 'urgente' : 'alta',
            row.escola_id, row.polo_id, row.aluno_id
          )
          idx += 6
        }
        await client.query(
          `INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, destinatario_tipo, escola_id, polo_id, aluno_id) VALUES ${values.join(', ')}`,
          params
        )
        total += notasBaixas.rows.length
      }
    }

    if (tipoGeracao === 'recuperacao' || tipoGeracao === 'todas') {
      // Alunos em recuperação sem nota de recuperação lançada
      const recPendente = await client.query(
        `SELECT DISTINCT a.id as aluno_id, a.nome, a.escola_id, e.polo_id,
                COUNT(ne.id) as disciplinas_pendentes
         FROM notas_escolares ne
         JOIN alunos a ON ne.aluno_id = a.id
         JOIN escolas e ON a.escola_id = e.id
         LEFT JOIN configuracao_notas_escola cne ON cne.escola_id = a.escola_id
         JOIN periodos_letivos pl ON ne.periodo_id = pl.id
         WHERE ne.nota_final IS NOT NULL
           AND ne.nota_final < COALESCE(cne.media_aprovacao, 6)
           AND ne.nota_recuperacao IS NULL
           AND pl.ano_letivo = $1
           AND a.ativo = true
           AND NOT EXISTS (
             SELECT 1 FROM notificacoes n
             WHERE n.aluno_id = a.id AND n.tipo = 'recuperacao'
               AND n.criado_em > CURRENT_TIMESTAMP - INTERVAL '15 days'
           )
         GROUP BY a.id, a.nome, a.escola_id, e.polo_id`,
        [ano]
      )

      if (recPendente.rows.length > 0) {
        const values: string[] = []
        const params: (string | null)[] = []
        let idx = 1
        for (const row of recPendente.rows) {
          values.push(`('recuperacao', $${idx}, $${idx+1}, 'media', 'escola', $${idx+2}, $${idx+3}, $${idx+4})`)
          params.push(
            `Recuperação Pendente: ${row.nome}`,
            `O aluno ${row.nome} tem ${row.disciplinas_pendentes} disciplina(s) aguardando nota de recuperação.`,
            row.escola_id, row.polo_id, row.aluno_id
          )
          idx += 5
        }
        await client.query(
          `INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, destinatario_tipo, escola_id, polo_id, aluno_id) VALUES ${values.join(', ')}`,
          params
        )
        total += recPendente.rows.length
      }
    }

    return total
  })

  return { mensagem: `${geradas} notificação(ões) gerada(s)`, geradas }
}
