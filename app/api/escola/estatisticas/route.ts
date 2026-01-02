import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre revalidar, sem cache
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['escola']) || !usuario.escola_id) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    let totalResultados = 0
    let totalAcertos = 0
    let totalAlunos = 0
    let totalTurmas = 0
    let totalAlunosPresentes = 0
    let totalAlunosFaltantes = 0
    let mediaGeral = 0
    let taxaAprovacao = 0

    try {
      const resultadosResult = await pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1',
        [usuario.escola_id]
      )
      totalResultados = parseInt(resultadosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de resultados:', error.message)
    }

    try {
      const acertosResult = await pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1 AND acertou = true',
        [usuario.escola_id]
      )
      totalAcertos = parseInt(acertosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de acertos:', error.message)
    }

    try {
      const alunosResult = await pool.query(
        'SELECT COUNT(*) as total FROM alunos WHERE escola_id = $1 AND ativo = true',
        [usuario.escola_id]
      )
      totalAlunos = parseInt(alunosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de alunos:', error.message)
    }

    try {
      const turmasResult = await pool.query(
        'SELECT COUNT(*) as total FROM turmas WHERE escola_id = $1 AND ativo = true',
        [usuario.escola_id]
      )
      totalTurmas = parseInt(turmasResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de turmas:', error.message)
    }

    try {
      const presencaResult = await pool.query(
        `SELECT 
          COUNT(CASE WHEN presenca = 'P' OR presenca = 'p' THEN 1 END) as presentes,
          COUNT(CASE WHEN presenca = 'F' OR presenca = 'f' THEN 1 END) as faltantes
        FROM resultados_consolidados_unificada WHERE escola_id = $1`,
        [usuario.escola_id]
      )
      totalAlunosPresentes = parseInt(presencaResult.rows[0]?.presentes || '0', 10) || 0
      totalAlunosFaltantes = parseInt(presencaResult.rows[0]?.faltantes || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar presença:', error.message)
    }

    try {
      const mediaResult = await pool.query(
        `SELECT 
          ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND (media_aluno IS NOT NULL AND CAST(media_aluno AS DECIMAL) > 0) THEN CAST(media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
          COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') AND (media_aluno IS NOT NULL AND CAST(media_aluno AS DECIMAL) >= 6.0) THEN 1 END) as aprovados,
          COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') AND (media_aluno IS NOT NULL AND CAST(media_aluno AS DECIMAL) > 0) THEN 1 END) as total_presentes
        FROM resultados_consolidados_unificada WHERE escola_id = $1`,
        [usuario.escola_id]
      )
      mediaGeral = parseFloat(mediaResult.rows[0]?.media_geral || '0') || 0
      const aprovados = parseInt(mediaResult.rows[0]?.aprovados || '0', 10) || 0
      const totalPresentes = parseInt(mediaResult.rows[0]?.total_presentes || '0', 10) || 0
      taxaAprovacao = totalPresentes > 0 ? (aprovados / totalPresentes) * 100 : 0
    } catch (error: any) {
      console.error('Erro ao buscar média e aprovação:', error.message)
    }

    const taxaAcertos = totalResultados > 0 ? (totalAcertos / totalResultados) * 100 : 0

    return NextResponse.json({
      totalResultados,
      taxaAcertos,
      totalAlunos,
      totalTurmas,
      totalAlunosPresentes,
      totalAlunosFaltantes,
      mediaGeral,
      taxaAprovacao,
    })
  } catch (error: any) {
    console.error('Erro geral ao buscar estatísticas:', error)
    console.error('Stack trace:', error.stack)
    
    return NextResponse.json({
      totalResultados: 0,
      taxaAcertos: 0,
      totalAlunos: 0,
      totalTurmas: 0,
      totalAlunosPresentes: 0,
      totalAlunosFaltantes: 0,
      mediaGeral: 0,
      taxaAprovacao: 0,
      erro: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 })
  }
}

