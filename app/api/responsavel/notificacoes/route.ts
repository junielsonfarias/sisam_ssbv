import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * Central de avisos do responsavel.
 * Une duas fontes:
 *  - notificacoes_disparos (canal in_app) — alertas gerados pela F4.1
 *    (infrequencia) e demais disparos direcionados ao usuario.
 *  - notificacoes (tabela geral) — avisos direcionados ao usuario ou a um
 *    de seus filhos (aluno_id vinculado), nao expirados.
 *
 * GET   → lista unificada + contagem de nao lidos.
 * PATCH → marca um aviso como lido ({ fonte, id }) ou todos ({ todas: true }).
 */

async function filhosIds(usuarioId: string): Promise<string[]> {
  const r = await pool.query(
    'SELECT aluno_id FROM responsaveis_alunos WHERE usuario_id = $1 AND ativo = true',
    [usuarioId]
  )
  return r.rows.map((x: any) => x.aluno_id)
}

export const GET = withAuth(['responsavel'], async (_request, usuario) => {
  try {
    const filhos = await filhosIds(usuario.id)

    const [disparos, gerais] = await Promise.all([
      pool.query(
        `SELECT id, evento_tipo AS tipo, titulo, corpo AS mensagem,
                NULL::varchar AS prioridade,
                (lida_em IS NOT NULL) AS lida, criada_em AS criado_em
           FROM notificacoes_disparos
          WHERE destinatario_id = $1 AND canal = 'in_app'
          ORDER BY criada_em DESC
          LIMIT 100`,
        [usuario.id]
      ),
      pool.query(
        `SELECT id, tipo, titulo, mensagem, prioridade,
                lida, criado_em
           FROM notificacoes
          WHERE (destinatario_id = $1 OR aluno_id = ANY($2::uuid[]))
            AND (expira_em IS NULL OR expira_em > NOW())
          ORDER BY criado_em DESC
          LIMIT 100`,
        [usuario.id, filhos.length ? filhos : ['00000000-0000-0000-0000-000000000000']]
      ),
    ])

    const itens = [
      ...disparos.rows.map((r: any) => ({ ...r, fonte: 'disparo' })),
      ...gerais.rows.map((r: any) => ({ ...r, fonte: 'notificacao' })),
    ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

    const naoLidos = itens.filter((i) => !i.lida).length

    return NextResponse.json({ avisos: itens, nao_lidos: naoLidos })
  } catch (error: unknown) {
    console.error('Erro ao buscar avisos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

const patchSchema = z.object({
  todas: z.boolean().optional(),
  fonte: z.enum(['disparo', 'notificacao']).optional(),
  id: z.string().uuid().optional(),
})

export const PATCH = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
    }
    const { todas, fonte, id } = parsed.data
    const filhos = await filhosIds(usuario.id)
    const filhosArr = filhos.length ? filhos : ['00000000-0000-0000-0000-000000000000']

    if (todas) {
      await Promise.all([
        pool.query(
          `UPDATE notificacoes_disparos SET lida_em = NOW()
            WHERE destinatario_id = $1 AND canal = 'in_app' AND lida_em IS NULL`,
          [usuario.id]
        ),
        pool.query(
          `UPDATE notificacoes SET lida = true, lida_em = NOW(), lida_por = $1
            WHERE (destinatario_id = $1 OR aluno_id = ANY($2::uuid[])) AND lida = false`,
          [usuario.id, filhosArr]
        ),
      ])
      return NextResponse.json({ mensagem: 'Todos os avisos marcados como lidos' })
    }

    if (!fonte || !id) {
      return NextResponse.json({ mensagem: 'Informe fonte e id, ou todas=true' }, { status: 400 })
    }

    if (fonte === 'disparo') {
      await pool.query(
        `UPDATE notificacoes_disparos SET lida_em = NOW()
          WHERE id = $1 AND destinatario_id = $2 AND lida_em IS NULL`,
        [id, usuario.id]
      )
    } else {
      await pool.query(
        `UPDATE notificacoes SET lida = true, lida_em = NOW(), lida_por = $2
          WHERE id = $1 AND (destinatario_id = $2 OR aluno_id = ANY($3::uuid[]))`,
        [id, usuario.id, filhosArr]
      )
    }
    return NextResponse.json({ mensagem: 'Aviso marcado como lido' })
  } catch (error: unknown) {
    console.error('Erro ao marcar aviso:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
