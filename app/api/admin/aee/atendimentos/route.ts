/**
 * /api/admin/aee/atendimentos
 *
 * GET ?aluno=&ano=: lista atendimentos do aluno (opcionalmente filtrado por ano)
 * POST: registra novo atendimento
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  listarAtendimentos,
  registrarAtendimento,
} from '@/lib/services/aee.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  plano_id: z.string().uuid(),
  aluno_id: z.string().uuid(),
  data_atendimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duracao_minutos: z.number().int().min(5).max(480).optional(),
  presente: z.boolean().optional(),
  atividades_realizadas: z.string().max(5000).optional(),
  observacoes: z.string().max(5000).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'professor'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const aluno = searchParams.get('aluno')
  if (!aluno) return NextResponse.json({ mensagem: 'Informe ?aluno=' }, { status: 400 })
  const ano = searchParams.get('ano') || undefined
  const dados = await listarAtendimentos(aluno, ano)
  return NextResponse.json({ atendimentos: dados })
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola', 'professor'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }
  try {
    const id = await registrarAtendimento({ ...parsed.data, professor_id: usuario.id })

    // Auditoria LGPD art. 11 (dados sensíveis de saúde/educação especial)
    // Detalhes da sessão NÃO são gravados — só metadados (data, duração, presença)
    await registrarAuditoria({
      usuarioId: usuario.id,
      acao: 'AEE_REGISTRAR_ATENDIMENTO',
      entidade: 'aee_atendimentos',
      entidadeId: id,
      detalhes: {
        aluno_id: parsed.data.aluno_id,
        plano_id: parsed.data.plano_id,
        data_atendimento: parsed.data.data_atendimento,
        duracao_minutos: parsed.data.duracao_minutos ?? 50,
        presente: parsed.data.presente ?? true,
      },
    })

    return NextResponse.json({ id, mensagem: 'Atendimento registrado' }, { status: 201 })
  } catch (e) {
    if ((e as { code?: string }).code === '23503') {
      return NextResponse.json({ mensagem: 'Plano ou aluno não encontrados' }, { status: 400 })
    }
    throw e
  }
})
