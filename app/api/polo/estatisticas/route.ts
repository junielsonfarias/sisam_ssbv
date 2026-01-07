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

    let nomePolo = ''
    let totalEscolas = 0
    let totalResultados = 0
    let totalAlunos = 0
    let totalTurmas = 0
    let totalAlunosPresentes = 0
    let totalAlunosFaltantes = 0
    let mediaGeral = 0

    // Buscar nome do polo
    try {
      const poloResult = await pool.query(
        'SELECT nome FROM polos WHERE id = $1',
        [usuario.polo_id]
      )
      nomePolo = poloResult.rows[0]?.nome || ''
    } catch (error: any) {
      console.error('Erro ao buscar nome do polo:', error.message)
    }

    try {
      const escolasResult = await pool.query(
        'SELECT COUNT(*) as total FROM escolas WHERE polo_id = $1 AND ativo = true',
        [usuario.polo_id]
      )
      totalEscolas = parseInt(escolasResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de escolas:', error.message)
    }

    // Buscar total de turmas
    try {
      const turmasResult = await pool.query(
        `SELECT COUNT(*) as total FROM turmas t
         INNER JOIN escolas e ON t.escola_id = e.id
         WHERE e.polo_id = $1 AND t.ativo = true`,
        [usuario.polo_id]
      )
      totalTurmas = parseInt(turmasResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de turmas:', error.message)
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
        `SELECT
          COUNT(CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN 1 END) as presentes,
          COUNT(CASE WHEN rc.presenca = 'F' OR rc.presenca = 'f' THEN 1 END) as faltantes
         FROM resultados_consolidados_unificada rc
         INNER JOIN escolas e ON rc.escola_id = e.id
         WHERE e.polo_id = $1`,
        [usuario.polo_id]
      )
      totalAlunosPresentes = parseInt(presencaResult.rows[0]?.presentes || '0', 10) || 0
      totalAlunosFaltantes = parseInt(presencaResult.rows[0]?.faltantes || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar alunos presentes:', error.message)
    }

    try {
      const mediaResult = await pool.query(
        `SELECT ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral
         FROM resultados_consolidados_unificada rc
         INNER JOIN escolas e ON rc.escola_id = e.id
         WHERE e.polo_id = $1`,
        [usuario.polo_id]
      )
      mediaGeral = parseFloat(mediaResult.rows[0]?.media_geral || '0') || 0
    } catch (error: any) {
      console.error('Erro ao buscar média geral:', error.message)
    }

    // Médias por tipo de ensino (anos iniciais e finais)
    let mediaAnosIniciais = 0
    let mediaAnosFinais = 0
    let totalAnosIniciais = 0
    let totalAnosFinais = 0

    try {
      // Extrair apenas o número da série para fazer o JOIN (ex: '2º Ano' -> '2')
      const mediaTipoResult = await pool.query(`
        SELECT
          cs.tipo_ensino,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno > 0 THEN rc.media_aluno ELSE NULL END), 2) as media,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno > 0 THEN 1 END) as total
        FROM resultados_consolidados_unificada rc
        JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') = cs.serie
        JOIN escolas e ON rc.escola_id = e.id
        WHERE rc.presenca IN ('P', 'p') AND e.polo_id = $1
        GROUP BY cs.tipo_ensino
      `, [usuario.polo_id])

      for (const row of mediaTipoResult.rows) {
        if (row.tipo_ensino === 'anos_iniciais') {
          mediaAnosIniciais = parseFloat(row.media || '0') || 0
          totalAnosIniciais = parseInt(row.total || '0', 10) || 0
        } else if (row.tipo_ensino === 'anos_finais') {
          mediaAnosFinais = parseFloat(row.media || '0') || 0
          totalAnosFinais = parseInt(row.total || '0', 10) || 0
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar médias por tipo de ensino:', error.message)
    }

    return NextResponse.json({
      nomePolo,
      totalEscolas,
      totalResultados,
      totalAlunos,
      totalTurmas,
      totalAlunosPresentes,
      totalAlunosFaltantes,
      mediaGeral,
      mediaAnosIniciais,
      mediaAnosFinais,
      totalAnosIniciais,
      totalAnosFinais,
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

