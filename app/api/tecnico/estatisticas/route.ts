import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre revalidar, sem cache
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    let totalEscolas = 0
    let totalPolos = 0
    let totalResultados = 0
    let totalAlunos = 0
    let totalAlunosPresentes = 0
    let mediaGeral = 0

    try {
      const escolasResult = await pool.query('SELECT COUNT(*) as total FROM escolas WHERE ativo = true')
      totalEscolas = parseDbInt(escolasResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de escolas:', error.message)
    }

    try {
      const polosResult = await pool.query('SELECT COUNT(*) as total FROM polos WHERE ativo = true')
      totalPolos = parseDbInt(polosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de polos:', error.message)
    }

    try {
      const resultadosResult = await pool.query('SELECT COUNT(*) as total FROM resultados_provas')
      totalResultados = parseDbInt(resultadosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de resultados:', error.message)
    }

    try {
      const alunosResult = await pool.query('SELECT COUNT(*) as total FROM alunos WHERE ativo = true')
      totalAlunos = parseDbInt(alunosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de alunos:', error.message)
    }

    try {
      const presencaResult = await pool.query(`
        SELECT COUNT(*) as presentes
        FROM resultados_consolidados_unificada
        WHERE presenca = 'P' OR presenca = 'p'
      `)
      totalAlunosPresentes = parseDbInt(presencaResult.rows[0]?.presentes)
    } catch (error: any) {
      console.error('Erro ao buscar alunos presentes:', error.message)
    }

    try {
      // Usa media_aluno já calculada corretamente durante importação (com fórmula 70%/30% para anos iniciais)
      const mediaResult = await pool.query(`
        SELECT ROUND(AVG(CAST(media_aluno AS DECIMAL)), 2) as media_geral
        FROM resultados_consolidados_unificada
        WHERE (presenca = 'P' OR presenca = 'p')
          AND media_aluno IS NOT NULL
          AND CAST(media_aluno AS DECIMAL) > 0
      `)
      mediaGeral = parseDbNumber(mediaResult.rows[0]?.media_geral)
    } catch (error: any) {
      console.error('Erro ao buscar média geral:', error.message)
    }

    // Médias por tipo de ensino (anos iniciais e finais)
    let mediaAnosIniciais = 0
    let mediaAnosFinais = 0
    let totalAnosIniciais = 0
    let totalAnosFinais = 0

    try {
      // Usa media_aluno já calculada corretamente durante importação
      const mediaTipoResult = await pool.query(`
        SELECT
          cs.tipo_ensino,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media,
          COUNT(*) as total
        FROM resultados_consolidados_unificada rc
        JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') = cs.serie
        WHERE rc.presenca IN ('P', 'p')
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
        GROUP BY cs.tipo_ensino
      `)

      for (const row of mediaTipoResult.rows) {
        if (row.tipo_ensino === 'anos_iniciais') {
          mediaAnosIniciais = parseDbNumber(row.media)
          totalAnosIniciais = parseDbInt(row.total)
        } else if (row.tipo_ensino === 'anos_finais') {
          mediaAnosFinais = parseDbNumber(row.media)
          totalAnosFinais = parseDbInt(row.total)
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar médias por tipo de ensino:', error.message)
    }

    return NextResponse.json({
      totalEscolas,
      totalPolos,
      totalResultados,
      totalAlunos,
      totalAlunosPresentes,
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
      totalPolos: 0,
      totalResultados: 0,
      erro: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 })
  }
}

