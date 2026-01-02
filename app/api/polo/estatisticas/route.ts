import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre revalidar, sem cache
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['polo']) || !usuario.polo_id) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    let totalEscolas = 0
    let totalResultados = 0
    let totalAlunos = 0
    let totalAlunosPresentes = 0
    let mediaGeral = 0

    try {
      const escolasResult = await pool.query(
        'SELECT COUNT(*) as total FROM escolas WHERE polo_id = $1 AND ativo = true',
        [usuario.polo_id]
      )
      totalEscolas = parseInt(escolasResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de escolas:', error.message)
    }

    try {
      const resultadosResult = await pool.query(
        `SELECT COUNT(*) as total FROM resultados_provas 
         WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $1)`,
        [usuario.polo_id]
      )
      totalResultados = parseInt(resultadosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de resultados:', error.message)
    }

    try {
      const alunosResult = await pool.query(
        `SELECT COUNT(*) as total FROM alunos 
         WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $1) AND ativo = true`,
        [usuario.polo_id]
      )
      totalAlunos = parseInt(alunosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de alunos:', error.message)
    }

    try {
      const presencaResult = await pool.query(
        `SELECT COUNT(*) as presentes
         FROM resultados_consolidados rc
         INNER JOIN escolas e ON rc.escola_id = e.id
         WHERE e.polo_id = $1 AND (rc.presenca = 'P' OR rc.presenca = 'p')`,
        [usuario.polo_id]
      )
      totalAlunosPresentes = parseInt(presencaResult.rows[0]?.presentes || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar alunos presentes:', error.message)
    }

    try {
      const mediaResult = await pool.query(
        `SELECT ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral
         FROM resultados_consolidados rc
         INNER JOIN escolas e ON rc.escola_id = e.id
         WHERE e.polo_id = $1`,
        [usuario.polo_id]
      )
      mediaGeral = parseFloat(mediaResult.rows[0]?.media_geral || '0') || 0
    } catch (error: any) {
      console.error('Erro ao buscar média geral:', error.message)
    }

    return NextResponse.json({
      totalEscolas,
      totalResultados,
      totalAlunos,
      totalAlunosPresentes,
      mediaGeral,
    })
  } catch (error: any) {
    console.error('Erro geral ao buscar estatísticas:', error)
    console.error('Stack trace:', error.stack)
    
    return NextResponse.json({
      totalEscolas: 0,
      totalResultados: 0,
      erro: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 })
  }
}

