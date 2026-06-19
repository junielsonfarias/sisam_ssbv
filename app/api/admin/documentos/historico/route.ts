/**
 * POST /api/admin/documentos/historico
 *
 * Emite histórico escolar formal para um aluno. Retorna código de validação
 * e snapshot dos dados. PDF é gerado em endpoint separado / cliente.
 *
 * Body: { alunoId: uuid }
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarAluno } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import {
  coletarDadosHistoricoEscolar,
  emitirDocumento,
} from '@/lib/services/documentos.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  alunoId: z.string().uuid(),
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'alunoId obrigatório' }, { status: 400 })
  }

  // IDOR: escola só emite histórico (documento com fé pública) de aluno da
  // própria escola.
  if (!(await podeAcessarAluno(usuario, parsed.data.alunoId))) {
    return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
  }

  let dados: Record<string, unknown>
  try {
    dados = await coletarDadosHistoricoEscolar(parsed.data.alunoId)
  } catch (e) {
    return NextResponse.json({ mensagem: (e as Error).message }, { status: 404 })
  }

  // A escola do documento deve ser a do ALUNO, não a do emissor (admin/técnico
  // emite p/ qualquer escola; antes gravava usuario.escola_id e saía errado).
  const escAluno = await pool.query('SELECT escola_id FROM alunos WHERE id = $1', [parsed.data.alunoId])
  const escolaIdAluno = escAluno.rows[0]?.escola_id ?? usuario.escola_id ?? null

  const resultado = await emitirDocumento({
    tipo: 'historico_escolar',
    alunoId: parsed.data.alunoId,
    dados,
    emitidoPor: usuario.id,
    escolaId: escolaIdAluno,
    escolaNome: (dados.escola_atual as any)?.nome || null,
  })

  return NextResponse.json({
    ...resultado,
    dados,
    url_validacao: `/validar/${resultado.codigo_validacao}`,
    mensagem: 'Histórico emitido. Use o código de validação para verificar autenticidade.',
  }, { status: 201 })
})
