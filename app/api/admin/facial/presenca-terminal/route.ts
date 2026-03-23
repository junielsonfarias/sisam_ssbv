import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest, presencaFacialSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/facial/presenca-terminal
 * Registra presença via terminal web (usa JWT do usuario logado, não API key)
 * Body: { aluno_id, timestamp, confianca }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, presencaFacialSchema)
    if (!validacao.success) return validacao.response

    const { aluno_id, timestamp, confianca } = validacao.data

    // O FaceMatcher no terminal já filtra por threshold configurável.
    // A API aceita qualquer confiança > 0 (a qualidade é controlada no terminal).
    if (confianca <= 0) {
      return NextResponse.json(
        { mensagem: 'Confiança deve ser maior que 0' },
        { status: 400 }
      )
    }

    // Buscar aluno
    const alunoResult = await pool.query(
      `SELECT a.id, a.turma_id, a.escola_id
       FROM alunos a
       WHERE a.id = $1 AND a.ativo = true AND a.situacao = 'cursando'`,
      [aluno_id]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado ou inativo' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Extrair data e hora
    const dataHora = new Date(timestamp)
    const data = dataHora.toISOString().split('T')[0]
    const hora = dataHora.toTimeString().split(' ')[0]

    // Inserir ou atualizar presença
    const result = await pool.query(
      `INSERT INTO frequencia_diaria
        (aluno_id, turma_id, escola_id, data, hora_entrada, metodo, confianca, registrado_por)
       VALUES ($1, $2, $3, $4, $5, 'facial', $6, $7)
       ON CONFLICT (aluno_id, data) DO UPDATE SET
        hora_saida = $5,
        confianca = GREATEST(frequencia_diaria.confianca, $6),
        atualizado_em = CURRENT_TIMESTAMP
       RETURNING id, hora_entrada, hora_saida`,
      [aluno_id, aluno.turma_id, aluno.escola_id, data, hora, confianca, usuario.id]
    )

    const registro = result.rows[0]

    return NextResponse.json({
      sucesso: true,
      registro_id: registro.id,
      tipo: registro.hora_saida ? 'saida' : 'entrada',
      data,
      hora,
    })
  } catch (error: unknown) {
    console.error('Erro ao registrar presença via terminal:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
