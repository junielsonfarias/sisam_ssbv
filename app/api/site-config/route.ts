import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { withRedisCache, cacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/site-config
 *
 * Retorna configuracoes do site institucional (publico, sem autenticacao).
 * Aceita query param ?secao=hero para retornar uma secao especifica.
 * Retorna tambem stats auto-calculadas e lista de escolas.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secao = searchParams.get('secao')

    // Secao especifica
    if (secao) {
      const redisKey = cacheKey('site-config', secao)
      const data = await withRedisCache(redisKey, 300, async () => {
        const result = await pool.query(
          'SELECT id, secao, conteudo, atualizado_em FROM site_config WHERE secao = $1',
          [secao]
        )
        return result.rows.length > 0 ? result.rows[0] : null
      })
      if (!data) {
        return NextResponse.json({ mensagem: 'Seção não encontrada' }, { status: 404 })
      }
      return NextResponse.json(data)
    }

    // Todas as secoes + dados complementares
    const redisKey = cacheKey('site-config', 'all')
    const data = await withRedisCache(redisKey, 300, async () => {
      const [secoesResult, statsResult, escolasResult] = await Promise.all([
        pool.query('SELECT id, secao, conteudo, atualizado_em FROM site_config ORDER BY criado_em'),
        getAutoStats(),
        getEscolasPublicas(),
      ])
      return {
        secoes: secoesResult.rows,
        stats: statsResult,
        escolas: escolasResult,
      }
    })

    return NextResponse.json(data)
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNDEFINED_TABLE) {
      return NextResponse.json({ secoes: [], stats: null, escolas: [] })
    }
    console.error('Erro ao buscar configuracao do site:', (error as Error)?.message || error)
    return NextResponse.json({ secoes: [], stats: null, escolas: [] })
  }
}

/**
 * Busca contagens reais do banco para as estatisticas
 */
async function getAutoStats() {
  try {
    const anoAtual = new Date().getFullYear().toString()
    const [escolasRes, alunosRes, turmasRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as total FROM escolas WHERE ativo = true'),
      pool.query(
        "SELECT COUNT(*)::int as total FROM alunos WHERE ano_letivo = $1 AND ativo = true AND (situacao = 'cursando' OR situacao IS NULL)",
        [anoAtual]
      ),
      pool.query(
        'SELECT COUNT(*)::int as total FROM turmas WHERE ano_letivo = $1 AND ativo = true',
        [anoAtual]
      ),
    ])
    return {
      escolas: escolasRes.rows[0]?.total || 0,
      alunos: alunosRes.rows[0]?.total || 0,
      turmas: turmasRes.rows[0]?.total || 0,
      professores: 0,
    }
  } catch {
    return { escolas: 0, alunos: 0, turmas: 0, professores: 0 }
  }
}

/**
 * Busca lista de escolas ativas para exibir no site
 */
async function getEscolasPublicas() {
  try {
    const result = await pool.query(
      'SELECT id, nome, endereco FROM escolas WHERE ativo = true ORDER BY nome LIMIT 50'
    )
    return result.rows
  } catch {
    return []
  }
}
