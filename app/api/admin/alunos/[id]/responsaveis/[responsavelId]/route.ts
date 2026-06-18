/**
 * /api/admin/alunos/[id]/responsaveis/[responsavelId]
 *
 * PATCH  — atualiza dados do responsável + parentesco/principal do vínculo.
 * DELETE — remove o vínculo (e a entidade se ficar órfã). (Fase 3.1)
 *
 * Permissão: administrador / tecnico / escola (escola apenas alunos da sua escola).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import {
  atualizarVinculoResponsavel,
  removerVinculoResponsavel,
} from '@/lib/services/responsaveis.service'

export const dynamic = 'force-dynamic'

const PARENTESCOS = ['mae', 'pai', 'responsavel', 'avo', 'tio', 'irmao', 'outro'] as const

const patchSchema = z.object({
  nome: z.string().trim().min(3).max(255).optional(),
  cpf: z.string().max(14).optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  parentesco: z.enum(PARENTESCOS).optional(),
  principal: z.boolean().optional(),
})

async function podeAcessarAluno(usuario: { tipo_usuario: string; escola_id?: string | null }, alunoId: string): Promise<boolean> {
  if (usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') return true
  if (usuario.tipo_usuario !== 'escola') return false
  const r = await pool.query(`SELECT escola_id FROM alunos WHERE id = $1`, [alunoId])
  return r.rows.length > 0 && String(r.rows[0].escola_id) === String(usuario.escola_id)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; responsavelId: string } }) {
  const usuario = await getUsuarioFromRequest(request)
  if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }
  if (!(await podeAcessarAluno(usuario, params.id))) {
    return NextResponse.json({ mensagem: 'Sem permissão para este aluno' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const ok = await atualizarVinculoResponsavel(params.id, params.responsavelId, {
      ...parsed.data,
      email: parsed.data.email === '' ? null : parsed.data.email,
    })
    if (!ok) return NextResponse.json({ mensagem: 'Vínculo não encontrado' }, { status: 404 })
    return NextResponse.json({ mensagem: 'Responsável atualizado' })
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return NextResponse.json({ mensagem: 'CPF já cadastrado para outro responsável' }, { status: 409 })
    }
    throw e
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; responsavelId: string } }) {
  const usuario = await getUsuarioFromRequest(request)
  if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }
  if (!(await podeAcessarAluno(usuario, params.id))) {
    return NextResponse.json({ mensagem: 'Sem permissão para este aluno' }, { status: 403 })
  }

  const ok = await removerVinculoResponsavel(params.id, params.responsavelId)
  if (!ok) return NextResponse.json({ mensagem: 'Vínculo não encontrado' }, { status: 404 })
  return NextResponse.json({ mensagem: 'Vínculo removido' })
}
