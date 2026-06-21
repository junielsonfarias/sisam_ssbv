import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { ORIGEM_GESTOR, ORIGEM_SISAM_ETL } from '@/lib/services/gestor/mestre.service'
import { z } from 'zod'

const log = createLogger('ImportacoesDivergencias')

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/admin/importacoes/[id]/divergencias
 *
 * Lista a TRILHA CONSULTAVEL POR ENTIDADE AFETADA de uma importacao: os
 * registros de cadastro mestre que foram criados pelo ETL Sisam (origem
 * `sisam_etl`) e estao vinculados a esta importacao via `origem_importacao_id`.
 *
 * Sao exatamente as DIVERGENCIAS que o Gestor precisa revisar/assumir
 * (regularizar) — turmas e alunos que o ETL criou em modo transicao por nao
 * existirem no cadastro mestre no momento da importacao.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const importacaoId = params.id
    if (!UUID_RE.test(importacaoId)) {
      return NextResponse.json({ mensagem: 'Identificador de importação inválido' }, { status: 400 })
    }

    const impResult = await pool.query(
      `SELECT id, nome_arquivo, ano_letivo, status, resumo FROM importacoes WHERE id = $1`,
      [importacaoId]
    )
    if (impResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Importação não encontrada' }, { status: 404 })
    }

    const [turmasResult, alunosResult] = await Promise.all([
      pool.query(
        `SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.origem,
                e.nome AS escola_nome
         FROM turmas t
         LEFT JOIN escolas e ON e.id = t.escola_id
         WHERE t.origem_importacao_id = $1 AND t.origem = $2
         ORDER BY e.nome NULLS LAST, t.codigo`,
        [importacaoId, ORIGEM_SISAM_ETL]
      ),
      pool.query(
        `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.origem,
                e.nome AS escola_nome, t.codigo AS turma_codigo
         FROM alunos a
         LEFT JOIN escolas e ON e.id = a.escola_id
         LEFT JOIN turmas t ON t.id = a.turma_id
         WHERE a.origem_importacao_id = $1 AND a.origem = $2
         ORDER BY e.nome NULLS LAST, a.nome`,
        [importacaoId, ORIGEM_SISAM_ETL]
      ),
    ])

    return NextResponse.json({
      importacao: impResult.rows[0],
      divergencias: {
        turmas: turmasResult.rows,
        alunos: alunosResult.rows,
      },
      totais: {
        turmas: turmasResult.rows.length,
        alunos: alunosResult.rows.length,
        total: turmasResult.rows.length + alunosResult.rows.length,
      },
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar divergências da importação', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

const regularizarSchema = z.object({
  entidade: z.enum(['turma', 'aluno', 'todas']),
  // IDs especificos a regularizar; se omitido com entidade !== 'todas', regulariza
  // todos os registros divergentes daquela entidade na importacao.
  ids: z.array(z.string().regex(UUID_RE)).optional(),
})

/**
 * POST /api/admin/importacoes/[id]/divergencias
 *
 * Dispara a REGULARIZACAO das divergencias: assume no Gestor os registros que o
 * ETL criou (passa `origem` de `sisam_etl` para `gestor`). Nao apaga nem altera
 * dados academicos — apenas a governanca de origem do cadastro mestre.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const importacaoId = params.id
    if (!UUID_RE.test(importacaoId)) {
      return NextResponse.json({ mensagem: 'Identificador de importação inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const parsed = regularizarSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }
    const { entidade, ids } = parsed.data

    const impResult = await pool.query('SELECT id FROM importacoes WHERE id = $1', [importacaoId])
    if (impResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Importação não encontrada' }, { status: 404 })
    }

    const regularizarTabela = async (tabela: 'turmas' | 'alunos'): Promise<number> => {
      const filtroIds = ids && ids.length > 0
      const sql = `UPDATE ${tabela}
         SET origem = $1
         WHERE origem_importacao_id = $2 AND origem = $3
         ${filtroIds ? 'AND id = ANY($4::uuid[])' : ''}
         RETURNING id`
      const queryParams = filtroIds
        ? [ORIGEM_GESTOR, importacaoId, ORIGEM_SISAM_ETL, ids]
        : [ORIGEM_GESTOR, importacaoId, ORIGEM_SISAM_ETL]
      const res = await pool.query(sql, queryParams)
      return res.rows.length
    }

    let turmasRegularizadas = 0
    let alunosRegularizados = 0

    if (entidade === 'turma' || entidade === 'todas') {
      turmasRegularizadas = await regularizarTabela('turmas')
    }
    if (entidade === 'aluno' || entidade === 'todas') {
      alunosRegularizados = await regularizarTabela('alunos')
    }

    const total = turmasRegularizadas + alunosRegularizados

    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'regularizar',
      entidade: 'importacao_divergencia',
      entidadeId: importacaoId,
      detalhes: {
        entidade,
        turmas_regularizadas: turmasRegularizadas,
        alunos_regularizados: alunosRegularizados,
      },
    })

    return NextResponse.json({
      mensagem: total > 0
        ? `${total} registro(s) regularizado(s) e assumido(s) pelo Gestor`
        : 'Nenhuma divergência pendente para regularizar',
      turmas_regularizadas: turmasRegularizadas,
      alunos_regularizados: alunosRegularizados,
      total,
    })
  } catch (error: unknown) {
    log.error('Erro ao regularizar divergências da importação', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
