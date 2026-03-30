import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { buscarNotas, buscarTurma, buscarConfigNotas, lancarNotas } from '@/lib/services/notas'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const notasProfessorSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
  notas: z.array(z.object({
    aluno_id: z.string().uuid(),
    nota: z.number().min(0).max(100).nullable().optional(),
    nota_recuperacao: z.number().min(0).max(100).nullable().optional(),
    faltas: z.number().int().min(0).optional(),
    observacao: z.string().max(500).nullable().optional(),
  })),
})

/**
 * GET /api/professor/notas?turma_id=X&disciplina_id=Y&periodo_id=Z
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')
  const disciplinaId = searchParams.get('disciplina_id')
  const periodoId = searchParams.get('periodo_id')

  if (!turmaId || !disciplinaId || !periodoId) {
    return NextResponse.json({ mensagem: 'turma_id, disciplina_id e periodo_id são obrigatórios' }, { status: 400 })
  }

  // Executar verificação de vínculo, busca de notas e turma em paralelo
  const [temVinculo, alunos, turma] = await Promise.all([
    verificarVinculoProfessor(usuario.id, turmaId),
    buscarNotas(turmaId, disciplinaId, periodoId),
    buscarTurma(turmaId),
  ])

  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const config = turma
    ? await buscarConfigNotas(turma.escola_id, turma.ano_letivo)
    : { nota_maxima: 10, media_aprovacao: 6, permite_recuperacao: true }

  return NextResponse.json({ alunos, config })
})

/**
 * POST /api/professor/notas
 * Lançar notas em lote
 */
export const POST = withAuth('professor', async (request, usuario) => {
  const body = await request.json()
  const validacao = notasProfessorSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { turma_id, disciplina_id, periodo_id, notas } = validacao.data

  // Executar verificações e busca de turma em paralelo (3 queries → 1 round-trip)
  const [vinculoResult, turma] = await Promise.all([
    pool.query(
      `SELECT tipo_vinculo, disciplina_id FROM professor_turmas
       WHERE professor_id = $1 AND turma_id = $2 AND ativo = true`,
      [usuario.id, turma_id]
    ),
    buscarTurma(turma_id),
  ])

  const vinculos = vinculoResult.rows
  if (vinculos.length === 0) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const isPolivalente = vinculos.some((v: any) => v.tipo_vinculo === 'polivalente')
  const temDisciplina = vinculos.some((v: any) => v.disciplina_id === disciplina_id)

  if (!isPolivalente && !temDisciplina) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta disciplina' }, { status: 403 })
  }

  if (!turma) {
    return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
  }
  const config = await buscarConfigNotas(turma.escola_id, turma.ano_letivo)

  const resultado = await lancarNotas({
    turmaId: turma_id,
    disciplinaId: disciplina_id,
    periodoId: periodo_id,
    escolaId: turma.escola_id,
    anoLetivo: turma.ano_letivo,
    notas,
    config,
    registradoPor: usuario.id,
  })

  return NextResponse.json({
    mensagem: `${resultado.processados} nota(s) salva(s) com sucesso`,
    processados: resultado.processados,
    erros: resultado.erros.length > 0 ? resultado.erros : undefined,
  })
})
