import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { matriculaBatchSchema, validateRequest } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'
import { matricularAlunosBatch, MatriculaError } from '@/lib/services/matriculas.service'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
    const validacao = await validateRequest(request, matriculaBatchSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { escola_id, turma_id, serie, ano_letivo, alunos } = validacao.data

    // Escola só pode matricular na própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Delega ao service: ano letivo ativo + capacity-check com SELECT FOR UPDATE
    // DENTRO da transacao (evita race de capacidade que existia quando a rota
    // checava vagas fora da transacao). Ver matriculas.service.matricularAlunosBatch.
    let resultados
    try {
      resultados = await matricularAlunosBatch({
        escolaId: escola_id,
        turmaId: turma_id,
        serie,
        anoLetivo: ano_letivo,
        alunos,
        usuarioId: usuario.id,
        usuario,
      })
    } catch (err: unknown) {
      if (err instanceof MatriculaError) {
        return NextResponse.json({ mensagem: err.message }, { status: 400 })
      }
      throw err
    }

    try { await cacheDelPattern('alunos:*') } catch {}
    try { await cacheDelPattern('turmas:*') } catch {}
    try { await cacheDelPattern('dashboard:*') } catch {}
    try { await cacheDelPattern('stats:*') } catch {}

    // Auditoria SEMED — apenas dados nao-sensiveis (LGPD art. 11): sem nome/CPF/PII.
    // entidadeId null porque e operacao em lote. Nao bloqueia a resposta.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'matricular_lote',
      entidade: 'aluno',
      entidadeId: null,
      detalhes: {
        escola_id,
        turma_id,
        serie,
        ano_letivo,
        matriculados: resultados.matriculados,
        criados: resultados.criados,
        total_erros: resultados.erros.length,
        total_enviados: alunos.length,
      },
      ip,
    })

    return NextResponse.json({
      mensagem: `${resultados.matriculados} aluno(s) matriculado(s) com sucesso${resultados.criados > 0 ? ` (${resultados.criados} novo(s))` : ''}`,
      ...resultados,
    }, { status: 201 })
})
