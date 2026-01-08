import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'

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

    let nomeEscola = ''
    let nomePolo = ''
    let totalResultados = 0
    let totalAcertos = 0
    let totalAlunos = 0
    let totalTurmas = 0
    let totalAlunosPresentes = 0
    let totalAlunosFaltantes = 0
    let mediaGeral = 0
    let taxaAprovacao = 0

    // Buscar nome da escola e polo
    try {
      const escolaResult = await pool.query(
        `SELECT e.nome as escola_nome, p.nome as polo_nome
         FROM escolas e
         LEFT JOIN polos p ON e.polo_id = p.id
         WHERE e.id = $1`,
        [usuario.escola_id]
      )
      nomeEscola = escolaResult.rows[0]?.escola_nome || ''
      nomePolo = escolaResult.rows[0]?.polo_nome || ''
    } catch (error: any) {
      console.error('Erro ao buscar nome da escola:', error.message)
    }

    try {
      const resultadosResult = await pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1',
        [usuario.escola_id]
      )
      totalResultados = parseDbInt(resultadosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de resultados:', error.message)
    }

    try {
      const acertosResult = await pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1 AND acertou = true',
        [usuario.escola_id]
      )
      totalAcertos = parseDbInt(acertosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de acertos:', error.message)
    }

    try {
      const alunosResult = await pool.query(
        'SELECT COUNT(*) as total FROM alunos WHERE escola_id = $1 AND ativo = true',
        [usuario.escola_id]
      )
      totalAlunos = parseDbInt(alunosResult.rows[0]?.total)
    } catch (error: any) {
      console.error('Erro ao buscar total de alunos:', error.message)
    }

    try {
      const turmasResult = await pool.query(
        'SELECT COUNT(*) as total FROM turmas WHERE escola_id = $1 AND ativo = true',
        [usuario.escola_id]
      )
      totalTurmas = parseDbInt(turmasResult.rows[0]?.total)
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
      totalAlunosPresentes = parseDbInt(presencaResult.rows[0]?.presentes)
      totalAlunosFaltantes = parseDbInt(presencaResult.rows[0]?.faltantes)
    } catch (error: any) {
      console.error('Erro ao buscar presença:', error.message)
    }

    try {
      // Usa media_aluno já calculada corretamente durante importação (com fórmula 70%/30% para anos iniciais)
      const mediaResult = await pool.query(
        `SELECT
          ROUND(AVG(CAST(media_aluno AS DECIMAL)), 2) as media_geral,
          COUNT(CASE WHEN CAST(media_aluno AS DECIMAL) >= 6.0 THEN 1 END) as aprovados,
          COUNT(*) as total_presentes
        FROM resultados_consolidados_unificada
        WHERE escola_id = $1
          AND (presenca = 'P' OR presenca = 'p')
          AND media_aluno IS NOT NULL
          AND CAST(media_aluno AS DECIMAL) > 0`,
        [usuario.escola_id]
      )
      mediaGeral = parseDbNumber(mediaResult.rows[0]?.media_geral)
      const aprovados = parseDbInt(mediaResult.rows[0]?.aprovados)
      const totalPresentes = parseDbInt(mediaResult.rows[0]?.total_presentes)
      taxaAprovacao = totalPresentes > 0 ? (aprovados / totalPresentes) * 100 : 0
    } catch (error: any) {
      console.error('Erro ao buscar média e aprovação:', error.message)
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
          AND rc.escola_id = $1
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
        GROUP BY cs.tipo_ensino
      `, [usuario.escola_id])

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

    const taxaAcertos = totalResultados > 0 ? (totalAcertos / totalResultados) * 100 : 0

    return NextResponse.json({
      nomeEscola,
      nomePolo,
      totalResultados,
      taxaAcertos,
      totalAlunos,
      totalTurmas,
      totalAlunosPresentes,
      totalAlunosFaltantes,
      mediaGeral,
      taxaAprovacao,
      mediaAnosIniciais,
      mediaAnosFinais,
      totalAnosIniciais,
      totalAnosFinais,
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

