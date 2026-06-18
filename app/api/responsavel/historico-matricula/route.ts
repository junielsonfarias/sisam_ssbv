/**
 * GET /api/responsavel/historico-matricula?aluno_id=
 *
 * Histórico de matrícula/situação do aluno (timeline de `historico_situacao`)
 * + resumo da matrícula atual. Restrito ao responsável vinculado.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['responsavel'], async (request, usuario) => {
  const alunoId = new URL(request.url).searchParams.get('aluno_id')
  if (!alunoId) {
    return NextResponse.json({ mensagem: 'Informe aluno_id' }, { status: 400 })
  }

  const vinculo = await pool.query(
    "SELECT 1 FROM responsaveis_alunos WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true AND status = 'aprovado' LIMIT 1",
    [usuario.id, alunoId]
  )
  if (vinculo.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Sem permissão para acessar este aluno' }, { status: 403 })
  }

  // Resumo da matrícula atual
  const alunoR = await pool.query(
    `SELECT a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao,
            to_char(a.data_matricula, 'YYYY-MM-DD') AS data_matricula,
            e.nome AS escola_nome, t.codigo AS turma_codigo, t.nome AS turma_nome
       FROM alunos a
       JOIN escolas e ON e.id = a.escola_id
       LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE a.id = $1`,
    [alunoId]
  )
  if (alunoR.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
  }

  // Timeline de situação/movimentação (mais recente primeiro)
  const histR = await pool.query(
    `SELECT situacao, situacao_anterior, to_char(data, 'YYYY-MM-DD') AS data,
            observacao, tipo_transferencia,
            tipo_movimentacao, escola_origem_nome, escola_destino_nome, criado_em
       FROM historico_situacao
      WHERE aluno_id = $1
      ORDER BY data DESC, criado_em DESC`,
    [alunoId]
  )

  const a = alunoR.rows[0]
  return NextResponse.json({
    matricula: {
      nome: a.nome,
      codigo: a.codigo,
      serie: a.serie,
      ano_letivo: a.ano_letivo,
      situacao: a.situacao,
      data_matricula: a.data_matricula ? String(a.data_matricula).slice(0, 10) : null,
      escola_nome: a.escola_nome,
      turma_codigo: a.turma_codigo,
      turma_nome: a.turma_nome,
    },
    historico: histR.rows.map((h: Record<string, unknown>) => ({
      situacao: h.situacao ? String(h.situacao) : null,
      situacao_anterior: h.situacao_anterior ? String(h.situacao_anterior) : null,
      data: h.data ? String(h.data).slice(0, 10) : null,
      observacao: h.observacao ? String(h.observacao) : null,
      tipo_transferencia: h.tipo_transferencia ? String(h.tipo_transferencia) : null,
      tipo_movimentacao: h.tipo_movimentacao ? String(h.tipo_movimentacao) : null,
      escola_origem_nome: h.escola_origem_nome ? String(h.escola_origem_nome) : null,
      escola_destino_nome: h.escola_destino_nome ? String(h.escola_destino_nome) : null,
    })),
  })
})
