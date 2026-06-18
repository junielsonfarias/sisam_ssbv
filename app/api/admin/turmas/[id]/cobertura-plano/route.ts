/**
 * GET /api/admin/turmas/[id]/cobertura-plano
 *
 * Cobertura de conteúdo: habilidades BNCC planejadas (planos de aula) × efetiva-
 * mente trabalhadas no diário de classe, dentro da vigência de cada plano.
 * Complementa o painel de lacunas. (Fase 4.2 — ciclo pedagógico LDB.)
 *
 * Filtros:
 * - `periodo_id` (opcional): restringe aos planos que tocam o intervalo do período.
 *
 * Permissão (mesmo padrão de /diario-lacunas):
 * - administrador / tecnico: qualquer turma
 * - escola: somente turmas da própria escola
 * - professor: somente turmas em que está vinculado
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { professorEstaVinculadoNaTurma } from '@/lib/services/turmas.service'
import { analisarCoberturaConteudoTurma } from '@/lib/services/planos-aula-cobertura'

const log = createLogger('AdminCoberturaPlano')
const uuidSchema = z.string().uuid()

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'professor'], async (request, usuario) => {
  const segments = request.nextUrl.pathname.split('/')
  const turmaId = segments[segments.indexOf('turmas') + 1]

  if (!turmaId || !uuidSchema.safeParse(turmaId).success) {
    return NextResponse.json({ mensagem: 'turmaId inválido' }, { status: 400 })
  }

  const periodoIdRaw = request.nextUrl.searchParams.get('periodo_id')?.trim() || null
  if (periodoIdRaw && !uuidSchema.safeParse(periodoIdRaw).success) {
    return NextResponse.json({ mensagem: 'periodo_id inválido (esperado UUID)' }, { status: 400 })
  }

  try {
    const turmaRes = await pool.query(
      `SELECT t.id, t.ano_letivo, t.sensivel, e.id AS escola_id
         FROM turmas t
         JOIN escolas e ON e.id = t.escola_id
        WHERE t.id = $1`,
      [turmaId]
    )
    if (turmaRes.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    const turma = turmaRes.rows[0]

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && String(turma.escola_id) !== String(usuario.escola_id)) {
      return NextResponse.json({ mensagem: 'Sem permissão para visualizar esta turma' }, { status: 403 })
    }
    if (usuario.tipo_usuario === 'professor') {
      const vinculado = await professorEstaVinculadoNaTurma(usuario.id, turmaId, turma.ano_letivo)
      if (!vinculado) {
        return NextResponse.json({ mensagem: 'Sem permissão para visualizar esta turma' }, { status: 403 })
      }
    }

    if (turma.sensivel) {
      registrarAuditoria({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        acao: 'DIARIO_LER_SENSIVEL',
        entidade: 'turma',
        entidadeId: turmaId,
        detalhes: { escola_id: turma.escola_id, ano_letivo: turma.ano_letivo, tipo_usuario: usuario.tipo_usuario, fonte: 'cobertura-plano' },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
    }

    // Resolve janela do período (opcional) para restringir os planos analisados.
    let janelaInicio: string | undefined
    let janelaFim: string | undefined
    let periodoInfo: { id: string; nome: string; numero: number } | null = null
    if (periodoIdRaw) {
      const pRes = await pool.query(
        `SELECT id, nome, numero, data_inicio, data_fim FROM periodos_letivos WHERE id = $1`,
        [periodoIdRaw]
      )
      if (pRes.rows.length === 0) {
        return NextResponse.json({ mensagem: 'Período não encontrado' }, { status: 404 })
      }
      const p = pRes.rows[0]
      if (!p.data_inicio || !p.data_fim) {
        return NextResponse.json({ mensagem: 'Período sem datas configuradas' }, { status: 422 })
      }
      janelaInicio = String(p.data_inicio).slice(0, 10)
      janelaFim = String(p.data_fim).slice(0, 10)
      periodoInfo = { id: p.id, nome: p.nome, numero: p.numero }
    }

    const { resumo, planos } = await analisarCoberturaConteudoTurma({ turmaId, janelaInicio, janelaFim })

    return NextResponse.json({
      escopo: { periodo: periodoInfo, ano_letivo: turma.ano_letivo },
      resumo,
      planos,
    })
  } catch (error) {
    log.error('Erro ao calcular cobertura de conteúdo', error, { turmaId, periodoId: periodoIdRaw })
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
