import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('BoletimComunicados')

export const dynamic = 'force-dynamic'

// Mensagem genérica anti-enumeração
const MSG_NAO_ENCONTRADO = 'Dados não encontrados'

/**
 * GET /api/boletim/comunicados?codigo=XXX&ano_letivo=2026
 * Retorna últimos comunicados da turma/escola do aluno (público).
 * Busca por código do aluno OU cpf + data_nascimento.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const codigo = searchParams.get('codigo')?.trim()
  const cpfRaw = searchParams.get('cpf')?.trim()
  const dataNascimento = searchParams.get('data_nascimento')?.trim()
  const anoLetivo = searchParams.get('ano_letivo') || String(new Date().getFullYear())

  if (!codigo && (!cpfRaw || !dataNascimento)) {
    return NextResponse.json({ mensagem: MSG_NAO_ENCONTRADO }, { status: 404 })
  }

  const cpf = cpfRaw ? cpfRaw.replace(/\D/g, '') : null

  try {
    const alunoQueryStr = codigo ? `codigo:${codigo}` : `cpf:${cpf}:${dataNascimento}`
    const redisKey = cacheKey('boletim-comunicados', alunoQueryStr, anoLetivo)

    const data = await withRedisCache(redisKey, CACHE_TTL.BOLETIM, async () => {
      // Localizar aluno
      let alunoQuery: string
      let params: any[]

      if (codigo) {
        alunoQuery = `
          SELECT a.id, a.turma_id, a.escola_id
          FROM alunos a
          WHERE a.codigo = $1 AND a.ativo = true AND a.ano_letivo = $2
          LIMIT 1`
        params = [codigo, anoLetivo]
      } else {
        alunoQuery = `
          SELECT a.id, a.turma_id, a.escola_id
          FROM alunos a
          WHERE a.cpf = $1 AND a.data_nascimento = $2 AND a.ativo = true AND a.ano_letivo = $3
          LIMIT 1`
        params = [cpf, dataNascimento, anoLetivo]
      }

      const alunoRes = await pool.query(alunoQuery, params)
      if (alunoRes.rows.length === 0) {
        return null
      }

      const aluno = alunoRes.rows[0]

      // Buscar comunicados da turma do aluno (últimos 10)
      const comunicadosTurma = aluno.turma_id
        ? await pool.query(
            `SELECT ct.id, ct.titulo, ct.mensagem, ct.tipo, ct.data_publicacao,
                    u.nome AS professor_nome
             FROM comunicados_turma ct
             LEFT JOIN usuarios u ON ct.professor_id = u.id
             WHERE ct.turma_id = $1 AND ct.ativo = true
             ORDER BY ct.data_publicacao DESC
             LIMIT 10`,
            [aluno.turma_id]
          )
        : { rows: [] }

      // Buscar publicações gerais recentes (comunicados/avisos da SEMED)
      const publicacoesGerais = await pool.query(
        `SELECT id, titulo, descricao, tipo, data_publicacao, orgao
         FROM publicacoes
         WHERE ativo = true AND tipo IN ('comunicado', 'aviso', 'portaria')
           AND data_publicacao >= NOW() - INTERVAL '90 days'
         ORDER BY data_publicacao DESC
         LIMIT 5`,
        []
      )

      return {
        comunicados_turma: comunicadosTurma.rows.map((c: any) => ({
          id: c.id,
          titulo: c.titulo,
          mensagem: c.mensagem,
          tipo: c.tipo,
          data_publicacao: c.data_publicacao,
          professor_nome: c.professor_nome,
          origem: 'turma' as const,
        })),
        publicacoes_gerais: publicacoesGerais.rows.map((p: any) => ({
          id: p.id,
          titulo: p.titulo,
          mensagem: p.descricao,
          tipo: p.tipo,
          data_publicacao: p.data_publicacao,
          orgao: p.orgao,
          origem: 'semed' as const,
        })),
      }
    })

    if (!data) {
      return NextResponse.json({ mensagem: MSG_NAO_ENCONTRADO }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    log.error('Erro ao consultar comunicados', error)
    return NextResponse.json(
      { mensagem: 'Erro ao consultar comunicados.' },
      { status: 500 }
    )
  }
}
