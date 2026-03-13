import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { gerarCodigoAluno } from '@/lib/gerar-codigo-aluno'
import { matriculaBatchSchema, validateRequest } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, matriculaBatchSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { escola_id, turma_id, serie, ano_letivo, alunos } = validacao.data

    const resultados = {
      matriculados: 0,
      criados: 0,
      erros: [] as string[],
      alunos: [] as any[],
    }

    for (const aluno of alunos) {
      try {
        if (aluno.id) {
          // Aluno existente: atualizar turma, série e ano letivo
          const result = await pool.query(
            `UPDATE alunos
             SET turma_id = $1, serie = $2, ano_letivo = $3, escola_id = $4, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [turma_id, serie, ano_letivo, escola_id, aluno.id]
          )

          if (result.rows.length > 0) {
            resultados.matriculados++
            resultados.alunos.push(result.rows[0])
          } else {
            resultados.erros.push(`Aluno ${aluno.nome}: não encontrado`)
          }
        } else {
          // Novo aluno: criar e matricular
          const codigo = aluno.codigo || await gerarCodigoAluno()

          const result = await pool.query(
            `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo, cpf, data_nascimento, pcd)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              codigo,
              aluno.nome,
              escola_id,
              turma_id,
              serie,
              ano_letivo,
              aluno.cpf || null,
              aluno.data_nascimento || null,
              aluno.pcd || false,
            ]
          )

          resultados.criados++
          resultados.matriculados++
          resultados.alunos.push(result.rows[0])
        }
      } catch (err: any) {
        if (err?.code === '23505') {
          resultados.erros.push(`Aluno ${aluno.nome}: código ou CPF já cadastrado`)
        } else {
          resultados.erros.push(`Aluno ${aluno.nome}: ${err?.message || 'Erro desconhecido'}`)
        }
      }
    }

    return NextResponse.json({
      mensagem: `${resultados.matriculados} aluno(s) matriculado(s) com sucesso${resultados.criados > 0 ? ` (${resultados.criados} novo(s))` : ''}`,
      ...resultados,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao matricular alunos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
