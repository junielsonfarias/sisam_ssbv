/**
 * POST /api/auth/cadastro-responsavel
 *
 * Cadastro PUBLICO do responsavel (pai/mae). Cria a conta como
 * tipo='responsavel' ativa, mas o vinculo com o aluno fica como
 * status='pendente' ate a escola aprovar em /admin/responsaveis.
 *
 * Body:
 *   nome, email, senha, cpf, telefone (opcional)
 *   aluno: { cpf_ou_codigo, tipo_vinculo }  (opcional — pai pode
 *           solicitar vinculo depois pelo painel)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'
import { validarSenhaNaoVazada } from '@/lib/utils/senha-vazada'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { createLogger } from '@/lib/logger'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'

const log = createLogger('CadastroResponsavel')

export const dynamic = 'force-dynamic'

const schema = z.object({
  nome: z.string().min(3).max(150),
  email: z.string().email().max(254),
  senha: z.string().min(8).max(100),
  cpf: z.string().min(11).max(14).transform(s => s.replace(/\D/g, '')),
  telefone: z.string().max(20).optional().nullable(),
  aluno: z.object({
    cpf_ou_codigo: z.string().min(3).max(20),
    tipo_vinculo: z.enum(['mae','pai','responsavel','avos','outro']).default('responsavel'),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados inválidos', detalhes: parsed.error.format() }, { status: 400 })
    }
    const d = parsed.data
    const email = d.email.toLowerCase().trim()
    const cpf = d.cpf

    // CPF deve ter 11 digitos
    if (cpf.length !== 11) {
      return NextResponse.json({ mensagem: 'CPF inválido (precisa 11 dígitos)' }, { status: 400 })
    }

    // Camada extra: rejeita senha presente em vazamentos públicos (falha-aberto).
    // Antes de abrir a transação para não reter conexão durante I/O externo.
    const checagemVazada = await validarSenhaNaoVazada(d.senha)
    if (!checagemVazada.ok) {
      return NextResponse.json({ mensagem: checagemVazada.mensagem }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1) Email ja existe?
      const existeEmail = await client.query('SELECT id FROM usuarios WHERE email = $1', [email])
      if (existeEmail.rows.length > 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({ mensagem: 'E-mail já cadastrado. Faça login ou recupere a senha.' }, { status: 409 })
      }

      // 2) CPF ja existe?
      const existeCpf = await client.query('SELECT id FROM usuarios WHERE cpf = $1', [cpf])
      if (existeCpf.rows.length > 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({ mensagem: 'CPF já cadastrado.' }, { status: 409 })
      }

      // 3) Buscar aluno (se informou)
      let alunoEncontrado: { id: string; nome: string; escola_id: string } | null = null
      if (d.aluno) {
        const termo = d.aluno.cpf_ou_codigo.replace(/\D/g, '')
        const buscaCpf = termo.length === 11 ? termo : null
        const alunoResult = await client.query(
          `SELECT id, nome, escola_id FROM alunos
            WHERE ativo = true
              AND (
                ($1::text IS NOT NULL AND cpf = $1)
                OR codigo = $2
              )
            LIMIT 1`,
          [buscaCpf, d.aluno.cpf_ou_codigo.trim()]
        )
        if (alunoResult.rows.length === 0) {
          await client.query('ROLLBACK')
          return NextResponse.json({
            mensagem: 'Aluno não encontrado. Confira CPF ou código de matrícula e tente novamente.',
          }, { status: 404 })
        }
        alunoEncontrado = alunoResult.rows[0]
      }

      // 4) Criar usuario tipo='responsavel'
      const senhaHash = await hashPassword(d.senha)
      const userResult = await client.query(
        `INSERT INTO usuarios (nome, email, cpf, telefone, senha, tipo_usuario, ativo)
         VALUES ($1, $2, $3, $4, $5, 'responsavel', true)
         RETURNING id`,
        [d.nome.trim(), email, cpf, d.telefone ?? null, senhaHash]
      )
      const usuarioId = userResult.rows[0].id

      // 5) Criar solicitacao de vinculo (se informou aluno)
      let solicitacaoId: string | null = null
      if (alunoEncontrado) {
        const linkResult = await client.query(
          `INSERT INTO responsaveis_alunos (
             usuario_id, aluno_id, tipo_vinculo, ativo, status, origem, solicitado_em
           ) VALUES ($1, $2, $3, true, 'pendente', 'auto_cadastro', NOW())
           RETURNING id`,
          [usuarioId, alunoEncontrado.id, d.aluno!.tipo_vinculo]
        )
        solicitacaoId = linkResult.rows[0].id
      }

      await client.query('COMMIT')

      registrarAuditoria({
        usuarioId,
        usuarioEmail: email,
        acao: 'RESPONSAVEL_AUTO_CADASTRO',
        entidade: 'usuarios',
        entidadeId: usuarioId,
        detalhes: {
          aluno_solicitado: alunoEncontrado?.id ?? null,
          escola_aluno: alunoEncontrado?.escola_id ?? null,
        },
      })

      return NextResponse.json({
        mensagem: alunoEncontrado
          ? `Cadastro criado. Sua solicitação de vínculo com ${alunoEncontrado.nome} aguarda aprovação da escola.`
          : 'Cadastro criado. Acesse o portal e solicite vínculo com seu(s) filho(s).',
        usuario_id: usuarioId,
        solicitacao_id: solicitacaoId,
        requer_aprovacao: alunoEncontrado !== null,
      }, { status: 201 })
    } catch (err) {
      await client.query('ROLLBACK')
      if ((err as DatabaseError).code === PG_ERRORS.UNIQUE_VIOLATION) {
        return NextResponse.json({ mensagem: 'E-mail ou CPF já cadastrado.' }, { status: 409 })
      }
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    log.error('Erro ao cadastrar responsável', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
