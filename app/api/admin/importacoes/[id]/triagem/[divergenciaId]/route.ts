import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  ORIGEM_GESTOR,
  resolverAnoLetivoId,
  resolverSerieId,
} from '@/lib/services/gestor/mestre.service'
import { z } from 'zod'

const log = createLogger('ImportacaoTriagemResolver')

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ações de resolução de uma divergência (ADR-001):
 *  - `cadastrar_no_gestor`: cria o registro mestre (turma/aluno) a partir do
 *    `dado_etl` proposto, marcando `origem='gestor'`, e vincula a divergência ao
 *    novo id.
 *  - `vincular_a_existente`: vincula a divergência a um registro mestre que já
 *    existe (`vinculado_a_id` obrigatório).
 *
 * Em ambos os casos a divergência passa a `status='vinculado'` com
 * `resolvido_por`/`resolvido_em` preenchidos.
 */
const resolverSchema = z
  .object({
    acao: z.enum(['cadastrar_no_gestor', 'vincular_a_existente']),
    vinculado_a_id: z.string().regex(UUID_RE).optional(),
  })
  .refine(
    (d) => d.acao !== 'vincular_a_existente' || !!d.vinculado_a_id,
    { message: 'vinculado_a_id é obrigatório para vincular_a_existente', path: ['vinculado_a_id'] }
  )

interface DivergenciaRow {
  id: string
  importacao_id: string
  tipo: 'turma' | 'aluno'
  dado_etl: Record<string, unknown>
  status: string
}

/** Lê um campo string do `dado_etl` (JSONB) com fallback a null. */
function campoStr(dado: Record<string, unknown>, chave: string): string | null {
  const v = dado[chave]
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/**
 * PATCH /api/admin/importacoes/[id]/triagem/[divergenciaId]
 *
 * Resolve uma divergência de triagem do ETL (ADR-001) com a ação escolhida.
 * Operação transacional: cria/valida o mestre e marca a divergência resolvida
 * de forma atômica. Idempotente: só resolve divergências em estado `pendente`.
 */
export const PATCH = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const segments = request.nextUrl.pathname.split('/')
  const importacaoId = segments[segments.indexOf('importacoes') + 1]
  const divergenciaId = segments[segments.indexOf('triagem') + 1]

  if (!importacaoId || !UUID_RE.test(importacaoId)) {
    return NextResponse.json({ mensagem: 'Identificador de importação inválido' }, { status: 400 })
  }
  if (!divergenciaId || !UUID_RE.test(divergenciaId)) {
    return NextResponse.json({ mensagem: 'Identificador de divergência inválido' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = resolverSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }
  const { acao, vinculado_a_id } = parsed.data

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Trava a divergência para evitar dupla resolução concorrente.
    const divResult = await client.query(
      `SELECT id, importacao_id, tipo, dado_etl, status
       FROM importacao_divergencias
       WHERE id = $1 AND importacao_id = $2
       FOR UPDATE`,
      [divergenciaId, importacaoId]
    )
    if (divResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ mensagem: 'Divergência não encontrada' }, { status: 404 })
    }
    const divergencia = divResult.rows[0] as DivergenciaRow

    if (divergencia.status !== 'pendente') {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { mensagem: 'Esta divergência já foi resolvida' },
        { status: 409 }
      )
    }

    const tabela = divergencia.tipo === 'turma' ? 'turmas' : 'alunos'
    let vinculadoAId: string

    if (acao === 'vincular_a_existente') {
      // Valida que o registro mestre informado existe na tabela correta.
      const alvo = await client.query(`SELECT id FROM ${tabela} WHERE id = $1`, [vinculado_a_id])
      if (alvo.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { mensagem: `Registro de ${divergencia.tipo} para vínculo não encontrado` },
          { status: 404 }
        )
      }
      vinculadoAId = vinculado_a_id as string
    } else {
      // cadastrar_no_gestor: cria o mestre a partir do dado_etl proposto.
      const dado = divergencia.dado_etl || {}
      const codigo = campoStr(dado, 'codigo')
      const nome = campoStr(dado, 'nome')
      const escolaId = campoStr(dado, 'escola_id')
      const serie = campoStr(dado, 'serie')
      const anoLetivo = campoStr(dado, 'ano_letivo')

      if (!escolaId || !UUID_RE.test(escolaId)) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { mensagem: 'Escola do dado de origem inválida — cadastre a escola no Gestor antes' },
          { status: 422 }
        )
      }

      const anoLetivoId = await resolverAnoLetivoId(client, anoLetivo)
      const serieId = await resolverSerieId(client, serie)

      if (divergencia.tipo === 'turma') {
        const ins = await client.query(
          `INSERT INTO turmas (codigo, nome, escola_id, serie, serie_id, ano_letivo, ano_letivo_id, origem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (escola_id, codigo, ano_letivo)
             DO UPDATE SET serie = EXCLUDED.serie
           RETURNING id`,
          [codigo, nome || codigo, escolaId, serie, serieId, anoLetivo, anoLetivoId, ORIGEM_GESTOR]
        )
        vinculadoAId = ins.rows[0].id
      } else {
        const turmaId = campoStr(dado, 'turma_id')
        const ins = await client.query(
          `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, serie_id, ano_letivo, ano_letivo_id, origem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [codigo, nome, escolaId, turmaId, serie, serieId, anoLetivo, anoLetivoId, ORIGEM_GESTOR]
        )
        vinculadoAId = ins.rows[0].id
      }
    }

    const upd = await client.query(
      `UPDATE importacao_divergencias
       SET status = 'vinculado',
           vinculado_a_id = $1,
           resolvido_por = $2,
           resolvido_em = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'pendente'
       RETURNING id, tipo, status, vinculado_a_id, resolvido_por, resolvido_em`,
      [vinculadoAId, usuario.id, divergenciaId]
    )

    await client.query('COMMIT')

    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'resolver',
      entidade: 'importacao_divergencia',
      entidadeId: divergenciaId,
      detalhes: {
        importacao_id: importacaoId,
        tipo: divergencia.tipo,
        acao_triagem: acao,
        vinculado_a_id: vinculadoAId,
      },
    })

    log.info(
      `Divergência ${divergenciaId} (${divergencia.tipo}) resolvida via "${acao}" → ${vinculadoAId}`
    )

    return NextResponse.json({
      mensagem:
        acao === 'cadastrar_no_gestor'
          ? `${divergencia.tipo === 'turma' ? 'Turma' : 'Aluno'} cadastrado no Gestor e vinculado`
          : 'Divergência vinculada ao registro existente',
      divergencia: upd.rows[0],
    })
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    log.error('Erro ao resolver divergência de importação', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  } finally {
    client.release()
  }
})
