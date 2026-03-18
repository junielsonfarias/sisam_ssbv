import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'
export const revalidate = 60

/**
 * GET /api/site-config
 *
 * Retorna configuracoes do site institucional (publico, sem autenticacao).
 * Aceita query param ?secao=hero para retornar uma secao especifica.
 * Quando stats.auto_count e true, executa COUNT nas tabelas do sistema.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secao = searchParams.get('secao')

    let query: string
    let params: string[] = []

    if (secao) {
      query = 'SELECT id, secao, conteudo, atualizado_em FROM site_config WHERE secao = $1'
      params = [secao]
    } else {
      query = 'SELECT id, secao, conteudo, atualizado_em FROM site_config ORDER BY criado_em'
    }

    const result = await pool.query(query, params)

    if (secao) {
      if (result.rows.length === 0) {
        return NextResponse.json({ mensagem: 'Secao nao encontrada' }, { status: 404 })
      }

      let row = result.rows[0]

      // Se for a secao stats com auto_count habilitado, buscar contagens reais
      if (secao === 'stats' && row.conteudo?.auto_count === true) {
        row = await enrichStatsWithCounts(row)
      }

      return NextResponse.json(row)
    }

    // Para listagem completa, enriquecer stats se auto_count estiver ativo
    const rows = await Promise.all(
      result.rows.map(async (row: any) => {
        if (row.secao === 'stats' && row.conteudo?.auto_count === true) {
          return enrichStatsWithCounts(row)
        }
        return row
      })
    )

    return NextResponse.json(rows)
  } catch (error: any) {
    // Se a tabela nao existe ainda (migracao nao executada), retornar array vazio
    if (error?.code === '42P01') {
      return NextResponse.json([])
    }
    console.error('Erro ao buscar configuracao do site:', error?.message || error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * Enriquece a secao stats com contagens reais do banco de dados.
 * Busca COUNT de escolas, alunos e turmas para o ano corrente.
 */
async function enrichStatsWithCounts(row: any) {
  try {
    const anoAtual = new Date().getFullYear()

    const [escolasResult, alunosResult, turmasResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM escolas WHERE ativo = true'),
      pool.query(
        `SELECT COUNT(DISTINCT a.id)::int AS total
         FROM alunos a
         INNER JOIN matriculas m ON m.aluno_id = a.id
         WHERE m.ano_letivo = $1 AND m.status = 'ativa'`,
        [anoAtual]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS total FROM turmas WHERE ano_letivo = $1 AND ativo = true',
        [anoAtual]
      ),
    ])

    const counts: Record<string, number> = {
      'Escolas': escolasResult.rows[0]?.total || 0,
      'Alunos Matriculados': alunosResult.rows[0]?.total || 0,
      'Turmas Ativas': turmasResult.rows[0]?.total || 0,
    }

    // Atualizar os valores dos itens que correspondem aos labels
    const conteudo = { ...row.conteudo }
    if (Array.isArray(conteudo.itens)) {
      conteudo.itens = conteudo.itens.map((item: any) => {
        if (counts[item.label] !== undefined) {
          return { ...item, valor: counts[item.label] }
        }
        return item
      })
    }

    return { ...row, conteudo }
  } catch (error: any) {
    console.error('Erro ao buscar contagens automaticas:', error?.message || error)
    // Em caso de erro, retornar os dados sem enriquecimento
    return row
  }
}
