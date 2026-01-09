import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, podeAcessarEscola, podeAcessarPolo } from '@/lib/auth'
import pool from '@/database/connection'
import { FiltrosAnalise } from '@/lib/types'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filtros: FiltrosAnalise = {
      escola_id: searchParams.get('escola_id') || undefined,
      polo_id: searchParams.get('polo_id') || undefined,
      ano_letivo: searchParams.get('ano_letivo') || undefined,
      serie: searchParams.get('serie') || undefined,
      disciplina: searchParams.get('disciplina') || undefined,
      area_conhecimento: searchParams.get('area_conhecimento') || undefined,
      data_inicio: searchParams.get('data_inicio') || undefined,
      data_fim: searchParams.get('data_fim') || undefined,
      taxa_acertos_min: searchParams.get('taxa_acertos_min')
        ? parseFloat(searchParams.get('taxa_acertos_min')!)
        : undefined,
      taxa_acertos_max: searchParams.get('taxa_acertos_max')
        ? parseFloat(searchParams.get('taxa_acertos_max')!)
        : undefined,
    }

    // Construir query baseada no tipo de usuário
    let query = 'SELECT * FROM resultados_provas WHERE 1=1'
    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndex} AND ativo = true)`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (filtros.escola_id) {
      if (!(await podeAcessarEscola(usuario, filtros.escola_id))) {
        return NextResponse.json(
          { mensagem: 'Acesso negado a esta escola' },
          { status: 403 }
        )
      }
      query += ` AND escola_id = $${paramIndex}`
      params.push(filtros.escola_id)
      paramIndex++
    }

    if (filtros.polo_id) {
      if (!podeAcessarPolo(usuario, filtros.polo_id)) {
        return NextResponse.json(
          { mensagem: 'Acesso negado a este polo' },
          { status: 403 }
        )
      }
      query += ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndex})`
      params.push(filtros.polo_id)
      paramIndex++
    }

    if (filtros.ano_letivo) {
      query += ` AND ano_letivo = $${paramIndex}`
      params.push(filtros.ano_letivo)
      paramIndex++
    }

    if (filtros.serie) {
      query += ` AND serie = $${paramIndex}`
      params.push(filtros.serie)
      paramIndex++
    }

    if (filtros.disciplina) {
      query += ` AND disciplina = $${paramIndex}`
      params.push(filtros.disciplina)
      paramIndex++
    }

    if (filtros.area_conhecimento) {
      query += ` AND area_conhecimento = $${paramIndex}`
      params.push(filtros.area_conhecimento)
      paramIndex++
    }

    if (filtros.data_inicio) {
      query += ` AND data_prova >= $${paramIndex}`
      params.push(filtros.data_inicio)
      paramIndex++
    }

    if (filtros.data_fim) {
      query += ` AND data_prova <= $${paramIndex}`
      params.push(filtros.data_fim)
      paramIndex++
    }

    const result = await pool.query(query, params)
    const resultados = result.rows

    // Calcular estatísticas
    const totalQuestoes = resultados.length
    const totalAcertos = resultados.filter((r) => r.acertou === true).length
    const taxaAcertos = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0
    const totalAlunos = new Set(resultados.map((r) => r.aluno_codigo).filter(Boolean)).size

    // Filtrar por taxa de acertos se especificado
    let resultadosFiltrados = resultados
    if (filtros.taxa_acertos_min !== undefined || filtros.taxa_acertos_max !== undefined) {
      // Agrupar por aluno e calcular taxa individual
      const alunosTaxa: Record<string, { total: number; acertos: number }> = {}
      resultados.forEach((r) => {
        if (r.aluno_codigo) {
          if (!alunosTaxa[r.aluno_codigo]) {
            alunosTaxa[r.aluno_codigo] = { total: 0, acertos: 0 }
          }
          alunosTaxa[r.aluno_codigo].total++
          if (r.acertou) alunosTaxa[r.aluno_codigo].acertos++
        }
      })

      const alunosFiltrados = Object.keys(alunosTaxa).filter((codigo) => {
        const taxa = (alunosTaxa[codigo].acertos / alunosTaxa[codigo].total) * 100
        if (filtros.taxa_acertos_min !== undefined && taxa < filtros.taxa_acertos_min) {
          return false
        }
        if (filtros.taxa_acertos_max !== undefined && taxa > filtros.taxa_acertos_max) {
          return false
        }
        return true
      })

      resultadosFiltrados = resultados.filter((r) =>
        r.aluno_codigo ? alunosFiltrados.includes(r.aluno_codigo) : false
      )
    }

    return NextResponse.json({
      totalQuestoes: resultadosFiltrados.length,
      totalAcertos: resultadosFiltrados.filter((r) => r.acertou === true).length,
      taxaAcertos: resultadosFiltrados.length > 0
        ? (resultadosFiltrados.filter((r) => r.acertou === true).length /
            resultadosFiltrados.length) *
          100
        : 0,
      totalAlunos: new Set(resultadosFiltrados.map((r) => r.aluno_codigo).filter(Boolean)).size,
      resultados: resultadosFiltrados.slice(0, 100), // Limitar a 100 resultados para performance
    })
  } catch (error: any) {
    console.error('Erro ao buscar dados de análise:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

