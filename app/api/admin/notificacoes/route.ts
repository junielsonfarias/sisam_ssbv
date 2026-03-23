import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const apenasNaoLidas = searchParams.get('apenas_nao_lidas') === 'true'
    const limite = parseInt(searchParams.get('limite') || '50')

    let query = `
      SELECT n.id, n.tipo, n.titulo, n.mensagem, n.prioridade,
             n.lida, n.lida_em, n.criado_em,
             n.escola_id, n.aluno_id, n.turma_id,
             e.nome as escola_nome,
             a.nome as aluno_nome,
             t.codigo as turma_codigo
      FROM notificacoes n
      LEFT JOIN escolas e ON n.escola_id = e.id
      LEFT JOIN alunos a ON n.aluno_id = a.id
      LEFT JOIN turmas t ON n.turma_id = t.id
      WHERE (n.expira_em IS NULL OR n.expira_em > CURRENT_TIMESTAMP)
    `
    const params: any[] = []
    let idx = 1

    // Filtrar por destino conforme tipo de usuário
    if (usuario.tipo_usuario === 'escola') {
      query += ` AND (n.destinatario_tipo = 'escola' AND (n.escola_id = $${idx} OR n.destinatario_id = $${idx + 1}))`
      params.push(usuario.escola_id, usuario.id)
      idx += 2
    } else if (usuario.tipo_usuario === 'polo') {
      query += ` AND (n.destinatario_tipo IN ('polo', 'escola') AND (n.polo_id = $${idx} OR n.destinatario_id = $${idx + 1}))`
      params.push(usuario.polo_id, usuario.id)
      idx += 2
    } else {
      // Admin/técnico vê tudo
      query += ` AND n.destinatario_tipo IN ('administrador', 'tecnico')`
    }

    if (tipo) {
      query += ` AND n.tipo = $${idx}`
      params.push(tipo)
      idx++
    }

    if (apenasNaoLidas) {
      query += ` AND n.lida = FALSE`
    }

    query += ` ORDER BY n.criado_em DESC LIMIT $${idx}`
    params.push(limite)

    const result = await pool.query(query, params)

    // Contagem de não lidas
    let countQuery = `
      SELECT COUNT(*) as total FROM notificacoes n WHERE n.lida = FALSE
      AND (n.expira_em IS NULL OR n.expira_em > CURRENT_TIMESTAMP)
    `
    const countParams: any[] = []
    let cIdx = 1

    if (usuario.tipo_usuario === 'escola') {
      countQuery += ` AND n.destinatario_tipo = 'escola' AND (n.escola_id = $${cIdx} OR n.destinatario_id = $${cIdx + 1})`
      countParams.push(usuario.escola_id, usuario.id)
    } else if (usuario.tipo_usuario === 'polo') {
      countQuery += ` AND n.destinatario_tipo IN ('polo', 'escola') AND (n.polo_id = $${cIdx} OR n.destinatario_id = $${cIdx + 1})`
      countParams.push(usuario.polo_id, usuario.id)
    } else {
      countQuery += ` AND n.destinatario_tipo IN ('administrador', 'tecnico')`
    }

    const countResult = await pool.query(countQuery, countParams)

    return NextResponse.json({
      notificacoes: result.rows,
      nao_lidas: parseInt(countResult.rows[0].total)
    })

  } catch (error: unknown) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Marcar como lida
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { ids, marcar_todas } = body

    if (marcar_todas) {
      let query = `UPDATE notificacoes SET lida = TRUE, lida_em = CURRENT_TIMESTAMP, lida_por = $1 WHERE lida = FALSE`
      const params: any[] = [usuario.id]
      let idx = 2

      if (usuario.tipo_usuario === 'escola') {
        query += ` AND destinatario_tipo = 'escola' AND escola_id = $${idx}`
        params.push(usuario.escola_id)
      } else if (usuario.tipo_usuario === 'polo') {
        query += ` AND destinatario_tipo IN ('polo', 'escola') AND polo_id = $${idx}`
        params.push(usuario.polo_id)
      } else {
        query += ` AND destinatario_tipo IN ('administrador', 'tecnico')`
      }

      await pool.query(query, params)
      return NextResponse.json({ mensagem: 'Todas marcadas como lidas' })
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ mensagem: 'ids é obrigatório' }, { status: 400 })
    }

    const placeholders = ids.map((_: any, i: number) => `$${i + 2}`).join(',')
    await pool.query(
      `UPDATE notificacoes SET lida = TRUE, lida_em = CURRENT_TIMESTAMP, lida_por = $1 WHERE id IN (${placeholders})`,
      [usuario.id, ...ids]
    )

    return NextResponse.json({ mensagem: `${ids.length} notificação(ões) marcada(s) como lida(s)` })

  } catch (error: unknown) {
    console.error('Erro ao marcar notificações:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Gerar notificações automáticas
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { tipo_geracao, escola_id, ano_letivo } = body
    const ano = ano_letivo || new Date().getFullYear().toString()

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      let geradas = 0

      if (tipo_geracao === 'infrequencia' || tipo_geracao === 'todas') {
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

        // Bulk insert para performance (50+ usuários)
        if (infreq.rows.length > 0) {
          const values: string[] = []
          const params: any[] = []
          let idx = 1
          for (const row of infreq.rows) {
            const pct = parseFloat(row.percentual_frequencia).toFixed(1)
            values.push(`('infrequencia', $${idx}, $${idx+1}, $${idx+2}, 'escola', $${idx+3}, $${idx+4}, $${idx+5})`)
            params.push(
              `Alerta de Infrequência: ${row.nome}`,
              `O aluno ${row.nome} está com ${pct}% de frequência no ${row.periodo}. Atenção para risco de evasão.`,
              parseFloat(row.percentual_frequencia) < 50 ? 'urgente' : 'alta',
              row.escola_id, row.polo_id, row.aluno_id
            )
            idx += 6
          }
          await client.query(
            `INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, destinatario_tipo, escola_id, polo_id, aluno_id) VALUES ${values.join(', ')}`,
            params
          )
          geradas += infreq.rows.length
        }
      }

      if (tipo_geracao === 'nota_baixa' || tipo_geracao === 'todas') {
        // Alunos com nota_final abaixo da média de aprovação
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
          const params: any[] = []
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
          geradas += notasBaixas.rows.length
        }
      }

      if (tipo_geracao === 'recuperacao' || tipo_geracao === 'todas') {
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
          const params: any[] = []
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
          geradas += recPendente.rows.length
        }
      }

      await client.query('COMMIT')
      return NextResponse.json({ mensagem: `${geradas} notificação(ões) gerada(s)`, geradas })

    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

  } catch (error: unknown) {
    console.error('Erro ao gerar notificações:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
