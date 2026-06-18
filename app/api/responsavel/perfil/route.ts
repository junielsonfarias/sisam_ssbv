import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { hashPassword, comparePassword } from '@/lib/auth'
import { PG_ERRORS } from '@/lib/constants'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * Perfil do responsavel logado.
 * GET  → dados do proprio usuario (nome, email, cpf, telefone, foto).
 * PUT  → atualiza nome/email/telefone e, opcionalmente, troca a senha.
 *
 * O responsavel so altera os PROPRIOS dados — nunca os dados oficiais do aluno
 * (estes sao geridos pela escola/SEMED). Ver /api/responsavel/aluno-detalhes.
 */

const perfilSchema = z.object({
  nome: z.string().trim().min(3, 'Nome muito curto').max(120),
  email: z.string().trim().email('E-mail invalido').max(160),
  telefone: z.string().trim().max(20).optional().or(z.literal('')),
  senha_atual: z.string().optional(),
  senha_nova: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres').optional(),
})

export const GET = withAuth(['responsavel'], async (_request, usuario) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, email, cpf, telefone, foto_url, criado_em
         FROM usuarios WHERE id = $1`,
      [usuario.id]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Usuario nao encontrado' }, { status: 404 })
    }
    return NextResponse.json({ perfil: result.rows[0] })
  } catch (error: unknown) {
    console.error('Erro ao buscar perfil:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const PUT = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = perfilSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { mensagem: parsed.error.errors[0]?.message || 'Dados invalidos' },
        { status: 400 }
      )
    }
    const { nome, email, telefone, senha_atual, senha_nova } = parsed.data

    // Troca de senha (opcional) — exige senha atual correta
    let novaSenhaHash: string | null = null
    if (senha_nova) {
      if (!senha_atual) {
        return NextResponse.json({ mensagem: 'Informe a senha atual para troca-la' }, { status: 400 })
      }
      const atual = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [usuario.id])
      const hash = atual.rows[0]?.senha
      const confere = hash ? await comparePassword(senha_atual, hash) : false
      if (!confere) {
        return NextResponse.json({ mensagem: 'Senha atual incorreta' }, { status: 400 })
      }
      novaSenhaHash = await hashPassword(senha_nova)
    }

    const result = await pool.query(
      `UPDATE usuarios
          SET nome = $1,
              email = $2,
              telefone = NULLIF($3, ''),
              senha = COALESCE($4, senha),
              atualizado_em = NOW()
        WHERE id = $5
        RETURNING id, nome, email, cpf, telefone, foto_url`,
      [nome, email, telefone || '', novaSenhaHash, usuario.id]
    )

    return NextResponse.json({
      mensagem: senha_nova ? 'Perfil e senha atualizados' : 'Perfil atualizado',
      perfil: result.rows[0],
    })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Este e-mail ja esta em uso por outra conta' }, { status: 409 })
    }
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
