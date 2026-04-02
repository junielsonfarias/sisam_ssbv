import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const criarResponsavelSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email invalido'),
  cpf: z.string().optional(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  aluno_ids: z.array(z.string().uuid()).min(1, 'Selecione pelo menos 1 aluno'),
  tipo_vinculo: z.enum(['mae', 'pai', 'responsavel', 'avos', 'outro']).default('responsavel'),
})

/**
 * GET /api/admin/responsaveis
 * Lista responsaveis com seus alunos vinculados
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id') || usuario.escola_id

    let query = `
      SELECT u.id, u.nome, u.email, u.cpf, u.ativo, u.criado_em,
             json_agg(json_build_object(
               'aluno_id', a.id,
               'aluno_nome', a.nome,
               'aluno_codigo', a.codigo,
               'serie', a.serie,
               'escola_nome', e.nome,
               'tipo_vinculo', ra.tipo_vinculo,
               'vinculo_ativo', ra.ativo
             )) AS filhos
      FROM usuarios u
      INNER JOIN responsaveis_alunos ra ON ra.usuario_id = u.id
      INNER JOIN alunos a ON ra.aluno_id = a.id
      INNER JOIN escolas e ON a.escola_id = e.id
      WHERE u.tipo_usuario = 'responsavel'
    `
    const params: string[] = []

    if (escolaId) {
      params.push(escolaId)
      query += ` AND a.escola_id = $${params.length}`
    }

    query += ` GROUP BY u.id ORDER BY u.nome`

    const result = await pool.query(query, params)
    return NextResponse.json({ responsaveis: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao listar responsaveis:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/admin/responsaveis
 * Cria um responsavel e vincula a aluno(s)
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request) => {
  try {
    const body = await request.json()
    const parsed = criarResponsavelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos', erros: parsed.error.errors }, { status: 400 })
    }

    const { nome, email, cpf, senha, aluno_ids, tipo_vinculo } = parsed.data

    // Verificar email duplicado
    const emailCheck = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()])
    if (emailCheck.rows.length > 0) {
      return NextResponse.json({ mensagem: 'Email ja cadastrado no sistema' }, { status: 409 })
    }

    // Hash da senha
    const senhaHash = await hashPassword(senha)

    // Criar usuario
    const userResult = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario, cpf, ativo)
       VALUES ($1, $2, $3, 'responsavel', $4, true)
       RETURNING id`,
      [nome, email.toLowerCase(), senhaHash, cpf || null]
    )
    const usuarioId = userResult.rows[0].id

    // Vincular alunos
    let vinculados = 0
    for (const alunoId of aluno_ids) {
      try {
        await pool.query(
          `INSERT INTO responsaveis_alunos (usuario_id, aluno_id, tipo_vinculo)
           VALUES ($1, $2, $3)
           ON CONFLICT (usuario_id, aluno_id) DO NOTHING`,
          [usuarioId, alunoId, tipo_vinculo]
        )
        vinculados++
      } catch {
        // Aluno nao existe ou vinculo duplicado
      }
    }

    return NextResponse.json({
      mensagem: 'Responsavel criado com sucesso',
      id: usuarioId,
      alunos_vinculados: vinculados,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar responsavel:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
