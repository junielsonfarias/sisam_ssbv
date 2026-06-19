/**
 * /api/admin/ficai
 *
 * GET: lista casos com filtros
 * POST: abre caso manualmente (escola ou admin)
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { abrirCaso, listarCasos, obterEstatisticas } from '@/lib/services/ficai.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  aluno_id: z.string().uuid(),
  escola_id: z.string().uuid(),
  ano_letivo: z.string().regex(/^\d{4}$/),
  motivo: z.enum(['infrequencia_50', 'ausencia_consecutiva', 'abandono_suspeito', 'evasao_confirmada', 'outro']),
  detalhes_motivo: z.string().max(2000).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'polo', 'escola'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)

  // Escopo por papel (calculado ANTES de qualquer ramo): escola só a própria;
  // polo só as suas; admin/tecnico tudo. Casos FICAI envolvem ECA/menores —
  // leitura cruzada entre escolas é IDOR (vale também p/ o agregado estatístico).
  let escolaId = searchParams.get('escola') || undefined
  let escolaIds: string[] | undefined
  if (usuario.tipo_usuario === 'escola') {
    escolaId = usuario.escola_id || '00000000-0000-0000-0000-000000000000'
  } else if (usuario.tipo_usuario === 'polo') {
    if (escolaId) {
      if (!(await podeAcessarEscola(usuario, escolaId))) {
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
      }
    } else {
      const r = await pool.query('SELECT id FROM escolas WHERE polo_id = $1 AND ativo = true', [usuario.polo_id])
      escolaIds = r.rows.map((x: { id: string }) => x.id)
      if (escolaIds.length === 0) escolaIds = ['00000000-0000-0000-0000-000000000000']
    }
  }

  if (searchParams.get('estatisticas') === 'true') {
    const ano = searchParams.get('ano') || String(new Date().getFullYear())
    const stats = await obterEstatisticas(ano, { escolaId, escolaIds })
    return NextResponse.json({ estatisticas: stats })
  }

  const casos = await listarCasos({
    escolaId,
    escolaIds,
    status: searchParams.get('status') as any || undefined,
    anoLetivo: searchParams.get('ano') || undefined,
    apenasAbertos: searchParams.get('apenasAbertos') === 'true',
    limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
  })

  return NextResponse.json({ casos })
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados inválidos', erros: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const origem = usuario.tipo_usuario === 'escola' ? 'manual_escola'
    : usuario.tipo_usuario === 'polo' ? 'manual_polo'
    : 'manual_admin'

  const aberto = await abrirCaso({
    ...parsed.data,
    origem,
    responsavel_caso_id: usuario.id,
  })

  if (!aberto) {
    return NextResponse.json(
      { mensagem: 'Já existe um caso FICAI aberto para este aluno no ano letivo' },
      { status: 409 }
    )
  }

  // ECA Art. 56 — abertura de caso de infrequência tem peso legal
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: 'FICAI_ABRIR_CASO',
    entidade: 'ficai_casos',
    detalhes: {
      aluno_id: parsed.data.aluno_id,
      escola_id: parsed.data.escola_id,
      ano_letivo: parsed.data.ano_letivo,
      motivo: parsed.data.motivo,
      origem,
    },
  })

  return NextResponse.json({ mensagem: 'Caso FICAI aberto' }, { status: 201 })
})
