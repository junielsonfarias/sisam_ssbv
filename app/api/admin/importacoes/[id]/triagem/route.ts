import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const log = createLogger('ImportacaoTriagem')

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Filtros aceitos na listagem de divergências de triagem (ADR-001). */
const listarQuerySchema = z.object({
  status: z.enum(['pendente', 'vinculado', 'ignorado']).optional(),
  tipo: z.enum(['turma', 'aluno']).optional(),
})

/**
 * GET /api/admin/importacoes/[id]/triagem
 *
 * Lista as DIVERGÊNCIAS de triagem (ADR-001) de uma importação — turmas/alunos
 * que o ETL em modo match-only NÃO encontrou no cadastro mestre (Gestor) e
 * registrou em `importacao_divergencias` em vez de criar.
 *
 * Cada divergência é uma tarefa pendente de resolução ("Cadastrar no Gestor" /
 * "Vincular a existente"), tratada pelo PATCH em
 * `/api/admin/importacoes/[id]/triagem/[divergenciaId]`.
 *
 * Query params (opcionais): `status` (pendente|vinculado|ignorado),
 * `tipo` (turma|aluno).
 */
export const GET = withAuth(['administrador', 'tecnico'], async (request, _usuario) => {
  // O id da importação vem do path: /api/admin/importacoes/{id}/triagem
  const segments = request.nextUrl.pathname.split('/')
  const importacaoId = segments[segments.indexOf('importacoes') + 1]
  if (!importacaoId || !UUID_RE.test(importacaoId)) {
    return NextResponse.json({ mensagem: 'Identificador de importação inválido' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = listarQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    tipo: searchParams.get('tipo') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Filtros inválidos' }, { status: 400 })
  }
  const { status, tipo } = parsed.data

  const impResult = await pool.query(
    'SELECT id, nome_arquivo, ano_letivo, status FROM importacoes WHERE id = $1',
    [importacaoId]
  )
  if (impResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Importação não encontrada' }, { status: 404 })
  }

  // WHERE dinâmico com parâmetros posicionais ($1 fixo = importacao_id).
  const condicoes: string[] = ['d.importacao_id = $1']
  const params: unknown[] = [importacaoId]
  if (status) {
    params.push(status)
    condicoes.push(`d.status = $${params.length}`)
  }
  if (tipo) {
    params.push(tipo)
    condicoes.push(`d.tipo = $${params.length}`)
  }

  const divergenciasResult = await pool.query(
    `SELECT d.id, d.tipo, d.dado_etl, d.chave_tentada, d.status,
            d.vinculado_a_id, d.criado_em, d.resolvido_em, d.resolvido_por,
            u.nome AS resolvido_por_nome
     FROM importacao_divergencias d
     LEFT JOIN usuarios u ON u.id = d.resolvido_por
     WHERE ${condicoes.join(' AND ')}
     ORDER BY d.criado_em ASC`,
    params
  )

  const rows = divergenciasResult.rows as { status: string }[]
  const totais = {
    total: rows.length,
    pendentes: rows.filter((r) => r.status === 'pendente').length,
    vinculadas: rows.filter((r) => r.status === 'vinculado').length,
    ignoradas: rows.filter((r) => r.status === 'ignorado').length,
  }

  log.info(`Listagem de triagem da importação ${importacaoId}: ${rows.length} divergência(s)`)

  return NextResponse.json({
    importacao: impResult.rows[0],
    divergencias: divergenciasResult.rows,
    totais,
  })
})
