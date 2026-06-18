import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/aluno-detalhes?aluno_id=UUID
 *
 * Dados cadastrais do aluno em modo SOMENTE LEITURA para o responsavel vinculado.
 * O responsavel visualiza; alteracoes nos dados oficiais sao feitas pela escola.
 * Validado pelo vinculo ativo em responsaveis_alunos.
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const alunoId = new URL(request.url).searchParams.get('aluno_id')
    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id e obrigatorio' }, { status: 400 })
    }

    const vinculo = await pool.query(
      "SELECT 1 FROM responsaveis_alunos WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true AND status = 'aprovado' LIMIT 1",
      [usuario.id, alunoId]
    )
    if (vinculo.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao vinculado a este responsavel' }, { status: 403 })
    }

    const r = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.cpf, a.rg,
              to_char(a.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
              a.genero, a.raca_cor, a.naturalidade, a.nacionalidade,
              a.serie, a.ano_letivo, a.situacao, a.modalidade,
              to_char(a.data_matricula, 'YYYY-MM-DD') AS data_matricula,
              a.nome_mae, a.nome_pai, a.responsavel, a.telefone_responsavel,
              a.endereco, a.bairro, a.cidade, a.cep, a.zona_residencia,
              a.utiliza_transporte_publico, a.tipo_transporte,
              a.pcd, a.tipo_deficiencia, a.alergia, a.medicacao,
              a.sus, a.codigo_inep_aluno,
              e.nome AS escola_nome, t.codigo AS turma_codigo, t.nome AS turma_nome
         FROM alunos a
         JOIN escolas e ON e.id = a.escola_id
         LEFT JOIN turmas t ON t.id = a.turma_id
        WHERE a.id = $1`,
      [alunoId]
    )
    if (r.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao encontrado' }, { status: 404 })
    }

    return NextResponse.json({ aluno: r.rows[0] })
  } catch (error: unknown) {
    console.error('Erro ao buscar dados do aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
