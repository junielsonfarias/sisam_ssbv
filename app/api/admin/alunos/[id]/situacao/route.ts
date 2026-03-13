import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

const SITUACOES_VALIDAS = ['cursando', 'transferido', 'abandono', 'aprovado', 'reprovado', 'remanejado']

// GET - Buscar situação atual e histórico do aluno
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const alunoId = params.id

    // Buscar aluno com situação atual
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.situacao, a.escola_id, a.turma_id, a.serie, a.ano_letivo,
              e.nome as escola_nome, t.codigo as turma_codigo
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    // Buscar histórico de situações com dados de transferência
    const historicoResult = await pool.query(
      `SELECT hs.id, hs.situacao, hs.situacao_anterior, hs.data, hs.observacao, hs.criado_em,
              hs.tipo_transferencia, hs.tipo_movimentacao,
              hs.escola_destino_id, hs.escola_destino_nome,
              hs.escola_origem_id, hs.escola_origem_nome,
              u.nome as registrado_por_nome,
              ed.nome as escola_destino_ref_nome,
              eo.nome as escola_origem_ref_nome
       FROM historico_situacao hs
       LEFT JOIN usuarios u ON hs.registrado_por = u.id
       LEFT JOIN escolas ed ON hs.escola_destino_id = ed.id
       LEFT JOIN escolas eo ON hs.escola_origem_id = eo.id
       WHERE hs.aluno_id = $1
       ORDER BY hs.data DESC, hs.criado_em DESC`,
      [alunoId]
    )

    return NextResponse.json({
      aluno: alunoResult.rows[0],
      historico: historicoResult.rows,
    })
  } catch (error: any) {
    console.error('Erro ao buscar situação do aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Alterar situação do aluno
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const alunoId = params.id
    const body = await request.json()
    const { situacao, data, observacao, tipo_transferencia, escola_destino_id,
            escola_destino_nome, escola_origem_id, escola_origem_nome } = body

    if (!situacao || !SITUACOES_VALIDAS.includes(situacao)) {
      return NextResponse.json(
        { mensagem: `Situação inválida. Valores permitidos: ${SITUACOES_VALIDAS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validar observação (máximo 500 caracteres)
    if (observacao && typeof observacao === 'string' && observacao.length > 500) {
      return NextResponse.json(
        { mensagem: 'Observação deve ter no máximo 500 caracteres' },
        { status: 400 }
      )
    }

    // Validações específicas para transferência
    if (situacao === 'transferido') {
      if (!tipo_transferencia || !['dentro_municipio', 'fora_municipio'].includes(tipo_transferencia)) {
        return NextResponse.json(
          { mensagem: 'Tipo de transferência é obrigatório (dentro_municipio ou fora_municipio)' },
          { status: 400 }
        )
      }
      if (tipo_transferencia === 'dentro_municipio' && !escola_destino_id) {
        return NextResponse.json(
          { mensagem: 'Escola destino é obrigatória para transferência dentro do município' },
          { status: 400 }
        )
      }
      // escola_destino_nome é opcional para fora do município
    }

    // Validar data (se fornecida, deve ser formato válido e não futura)
    if (data) {
      const dataObj = new Date(data + 'T12:00:00')
      if (isNaN(dataObj.getTime())) {
        return NextResponse.json({ mensagem: 'Data inválida' }, { status: 400 })
      }
      const hoje = new Date()
      hoje.setHours(23, 59, 59, 999)
      if (dataObj > hoje) {
        return NextResponse.json({ mensagem: 'A data não pode ser futura' }, { status: 400 })
      }
    }

    // Buscar situação atual
    const alunoResult = await pool.query(
      'SELECT id, situacao, ativo FROM alunos WHERE id = $1',
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    const situacaoAnterior = alunoResult.rows[0].situacao

    if (situacaoAnterior === situacao) {
      return NextResponse.json({ mensagem: 'O aluno já possui esta situação' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Atualizar situação na tabela alunos
      const isAtivo = !['transferido', 'abandono'].includes(situacao)

      if (situacao === 'transferido') {
        // Desvincular da turma ao transferir
        await client.query(
          `UPDATE alunos SET situacao = $2, ativo = $3, turma_id = NULL, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
          [alunoId, situacao, isAtivo]
        )
      } else {
        await client.query(
          `UPDATE alunos SET situacao = $2, ativo = $3, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
          [alunoId, situacao, isAtivo]
        )
      }

      // Determinar tipo de movimentação
      let tipoMovimentacao: string | null = null
      if (situacao === 'transferido') {
        tipoMovimentacao = 'saida'
      } else if (situacao === 'cursando' && (escola_origem_id || escola_origem_nome)) {
        tipoMovimentacao = 'entrada'
      }

      // Registrar no histórico com dados de transferência
      await client.query(
        `INSERT INTO historico_situacao (aluno_id, situacao, situacao_anterior, data, observacao, registrado_por,
         tipo_transferencia, escola_destino_id, escola_destino_nome, escola_origem_id, escola_origem_nome, tipo_movimentacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          alunoId,
          situacao,
          situacaoAnterior,
          data || new Date().toISOString().split('T')[0],
          observacao || null,
          usuario.id,
          tipo_transferencia || null,
          escola_destino_id || null,
          escola_destino_nome || null,
          escola_origem_id || null,
          escola_origem_nome || null,
          tipoMovimentacao,
        ]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: 'Situação atualizada com sucesso',
        situacao_anterior: situacaoAnterior,
        situacao_nova: situacao,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao alterar situação do aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
