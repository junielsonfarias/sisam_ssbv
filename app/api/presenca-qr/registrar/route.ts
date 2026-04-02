import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { z } from 'zod'
import { checkRateLimit, getClientIP, createRateLimitKey } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const registrarSchema = z.object({
  token: z.string().min(10),
  aluno_codigo: z.string().min(1).optional(),
  aluno_cpf: z.string().optional(),
  aluno_nome: z.string().optional(),
})

/**
 * POST /api/presenca-qr/registrar
 * Aluno escaneia QR code e registra presença
 * Não requer autenticação — usa o token do QR como validação
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 tentativas por minuto por IP
    const clientIP = getClientIP(request)
    const rateLimitKey = createRateLimitKey(clientIP, 'qr-presenca')
    const rateResult = checkRateLimit(rateLimitKey, 10, 60 * 1000)
    if (!rateResult.allowed) {
      return NextResponse.json({ mensagem: 'Muitas tentativas. Aguarde um momento.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = registrarSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
    }

    const { token, aluno_codigo, aluno_cpf } = parsed.data

    // Verificar token válido e não expirado
    const qrResult = await pool.query(
      `SELECT qr.id, qr.turma_id, qr.data, qr.expira_em,
              t.escola_id
       FROM qr_presenca qr
       INNER JOIN turmas t ON qr.turma_id = t.id
       WHERE qr.token = $1 AND qr.ativo = true`,
      [token]
    )

    if (qrResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'QR code invalido ou expirado' }, { status: 404 })
    }

    const qr = qrResult.rows[0]

    // Verificar se expirou
    if (new Date(qr.expira_em) < new Date()) {
      return NextResponse.json({ mensagem: 'QR code expirado. Solicite um novo ao professor.' }, { status: 410 })
    }

    // Buscar aluno pelo código ou CPF
    let alunoQuery = ''
    let alunoParam: string = ''

    if (aluno_codigo) {
      alunoQuery = 'SELECT id, nome, turma_id, escola_id FROM alunos WHERE codigo = $1 AND ativo = true'
      alunoParam = aluno_codigo
    } else if (aluno_cpf) {
      alunoQuery = 'SELECT id, nome, turma_id, escola_id FROM alunos WHERE cpf = $1 AND ativo = true'
      alunoParam = aluno_cpf.replace(/\D/g, '')
    } else {
      return NextResponse.json({ mensagem: 'Informe o codigo ou CPF do aluno' }, { status: 400 })
    }

    const alunoResult = await pool.query(alunoQuery, [alunoParam])

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Verificar que o aluno pertence à turma do QR
    if (aluno.turma_id !== qr.turma_id) {
      return NextResponse.json({ mensagem: 'Aluno nao pertence a esta turma' }, { status: 403 })
    }

    // Registrar presença (mesma lógica da frequência diária)
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const result = await pool.query(
      `INSERT INTO frequencia_diaria
        (aluno_id, turma_id, escola_id, data, hora_entrada, metodo)
       VALUES ($1, $2, $3, $4, $5, 'qrcode')
       ON CONFLICT (aluno_id, data) DO UPDATE SET
        hora_saida = $5,
        atualizado_em = CURRENT_TIMESTAMP
       RETURNING id, hora_entrada, hora_saida`,
      [aluno.id, qr.turma_id, qr.escola_id, qr.data, hora]
    )

    const registro = result.rows[0]

    return NextResponse.json({
      sucesso: true,
      aluno_nome: aluno.nome,
      tipo: registro.hora_saida ? 'saida' : 'entrada',
      hora,
      data: qr.data,
    })
  } catch (error: unknown) {
    console.error('Erro ao registrar presenca QR:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
