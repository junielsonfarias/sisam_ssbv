/**
 * /api/admin/alunos/[id]/responsaveis
 *
 * GET  — lista os responsáveis (entidade) vinculados ao aluno.
 * POST — adiciona/vincula um responsável ao aluno.
 *
 * Entidade legal `responsaveis` (Fase 3.1), distinta de `responsaveis_alunos`
 * (vínculo do portal). Permissão: administrador/tecnico (qualquer escola) ·
 * escola/polo (apenas alunos da própria escola/polo).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import {
  listarResponsaveisDoAluno,
  adicionarResponsavelAoAluno,
} from '@/lib/services/responsaveis.service'

export const dynamic = 'force-dynamic'

const PARENTESCOS = ['mae', 'pai', 'responsavel', 'avo', 'tio', 'irmao', 'outro'] as const

const postSchema = z.object({
  nome: z.string().trim().min(3).max(255),
  cpf: z.string().max(14).optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  parentesco: z.enum(PARENTESCOS).optional(),
  principal: z.boolean().optional(),
  observacoes: z.string().max(2000).optional().nullable(),
})

/** Verifica se o usuário pode acessar este aluno (escola/polo limitados ao seu escopo). */
async function podeAcessarAluno(usuario: { tipo_usuario: string; escola_id?: string | null; polo_id?: string | null }, alunoId: string): Promise<boolean> {
  if (usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') return true
  const r = await pool.query(
    `SELECT a.escola_id, e.polo_id FROM alunos a JOIN escolas e ON e.id = a.escola_id WHERE a.id = $1`,
    [alunoId]
  )
  if (r.rows.length === 0) return false
  if (usuario.tipo_usuario === 'escola') return String(r.rows[0].escola_id) === String(usuario.escola_id)
  if (usuario.tipo_usuario === 'polo') return String(r.rows[0].polo_id) === String(usuario.polo_id)
  return false
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioFromRequest(request)
  if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }
  if (!(await podeAcessarAluno(usuario, params.id))) {
    return NextResponse.json({ mensagem: 'Sem permissão para este aluno' }, { status: 403 })
  }
  const responsaveis = await listarResponsaveisDoAluno(params.id)
  return NextResponse.json({ responsaveis })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const usuario = await getUsuarioFromRequest(request)
  if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }
  if (!(await podeAcessarAluno(usuario, params.id))) {
    return NextResponse.json({ mensagem: 'Sem permissão para este aluno' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const r = await adicionarResponsavelAoAluno(params.id, {
      ...parsed.data,
      email: parsed.data.email || null,
    })
    return NextResponse.json({ ...r, mensagem: 'Responsável vinculado' }, { status: 201 })
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return NextResponse.json({ mensagem: 'CPF já cadastrado para outro responsável' }, { status: 409 })
    }
    if ((e as { code?: string }).code === '23503') {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }
    throw e
  }
}
