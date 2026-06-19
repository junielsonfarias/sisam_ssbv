/**
 * POST /api/admin/ficai/[id]/acao
 *
 * Registra nova ação na timeline do caso FICAI.
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { registrarAcao } from '@/lib/services/ficai.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  tipo: z.enum([
    'contato_telefone', 'contato_visita', 'contato_email', 'contato_whatsapp',
    'reuniao_responsavel', 'aluno_retornou',
    'encaminhamento_conselho_tutelar', 'encaminhamento_ministerio_publico',
    'oficio_emitido', 'observacao',
  ]),
  descricao: z.string().min(5).max(5000),
  anexo_url: z.string().url().nullable().optional(),
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'polo', 'escola'], 'semed', async (request, usuario) => {
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0]
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  // IDOR: o irmão [id]/route.ts (PATCH/GET) valida o dono do caso; /acao não.
  // Ações da timeline FICAI têm peso ECA (encaminhamentos a CT/MP).
  const casoResult = await pool.query('SELECT escola_id FROM ficai_casos WHERE id = $1 LIMIT 1', [id])
  if (casoResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Caso FICAI não encontrado' }, { status: 404 })
  }
  if (!(await podeAcessarEscola(usuario, casoResult.rows[0].escola_id))) {
    return NextResponse.json({ mensagem: 'Sem permissão para este caso FICAI' }, { status: 403 })
  }

  const acaoId = await registrarAcao({
    caso_id: id,
    tipo: parsed.data.tipo,
    descricao: parsed.data.descricao,
    anexo_url: parsed.data.anexo_url || undefined,
    realizado_por: usuario.id,
  })

  // ECA — encaminhamentos a Conselho Tutelar/MP têm peso legal
  // Descrição NÃO é gravada (pode conter dados sensíveis do aluno/família)
  const TIPOS_CRITICOS = ['encaminhamento_conselho_tutelar', 'encaminhamento_ministerio_publico', 'oficio_emitido']
  const acaoAuditoria = TIPOS_CRITICOS.includes(parsed.data.tipo)
    ? 'FICAI_ENCAMINHAR'
    : 'FICAI_REGISTRAR_ACAO'

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: acaoAuditoria,
    entidade: 'ficai_acoes',
    entidadeId: acaoId,
    detalhes: {
      caso_id: id,
      tipo: parsed.data.tipo,
      tamanho_descricao: parsed.data.descricao.length,
      tem_anexo: !!parsed.data.anexo_url,
    },
  })

  return NextResponse.json({ id: acaoId, mensagem: 'Ação registrada' }, { status: 201 })
})
