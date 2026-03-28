import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const anoLetivo = request.nextUrl.searchParams.get('ano_letivo')
    const contagem = request.nextUrl.searchParams.get('contagem') === 'true'

    // Modo contagem: retorna total de alunos por série
    if (contagem && anoLetivo) {
      const result = await pool.query(
        `SELECT a.serie, COUNT(*) as quantidade
         FROM alunos a
         WHERE a.ano_letivo = $1 AND a.situacao = 'cursando' AND a.serie IN ('1','2','3','4','5','6','7','8','9')
         GROUP BY a.serie ORDER BY a.serie`,
        [anoLetivo]
      )
      const contagemMap: Record<string, number> = {}
      for (const row of result.rows) {
        contagemMap[row.serie] = parseInt(row.quantidade)
      }
      return NextResponse.json({ contagem: contagemMap })
    }

    let query = `
      SELECT sp.id, sp.ano_letivo, sp.serie, sp.ativo,
             se.nome as serie_nome, se.etapa
      FROM sisam_series_participantes sp
      LEFT JOIN series_escolares se ON se.codigo = sp.serie
    `
    const params: string[] = []

    if (anoLetivo) {
      query += ' WHERE sp.ano_letivo = $1'
      params.push(anoLetivo)
    }

    query += ' ORDER BY sp.ano_letivo DESC, se.ordem, sp.serie'

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar séries participantes:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { ano_letivo, series } = await request.json()

    if (!ano_letivo || !Array.isArray(series)) {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }

    // Desativar todas as séries do ano
    await pool.query(
      'UPDATE sisam_series_participantes SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE ano_letivo = $1',
      [ano_letivo]
    )

    // Inserir/ativar as séries selecionadas
    for (const serie of series) {
      await pool.query(
        `INSERT INTO sisam_series_participantes (ano_letivo, serie, ativo)
         VALUES ($1, $2, true)
         ON CONFLICT (ano_letivo, serie) DO UPDATE SET ativo = true, atualizado_em = CURRENT_TIMESTAMP`,
        [ano_letivo, serie]
      )
    }

    return NextResponse.json({ mensagem: 'Séries atualizadas com sucesso', total: series.length })
  } catch (error) {
    console.error('Erro ao salvar séries participantes:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
