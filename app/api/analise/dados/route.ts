import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, podeAcessarEscola, podeAcessarPolo } from '@/lib/auth'
import pool from '@/database/connection'
import { FiltrosAnalise } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import {
  createWhereBuilder,
  addCondition,
  addRawCondition,
  buildWhereString,
} from '@/lib/api-helpers'

const log = createLogger('AnaliseDados')

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 401 })
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

    // V6 fix: substituir construção manual de paramIndex pelo builder
    // padrão do projeto. Antes: ~80 linhas de query+=...$${paramIndex}++
    // espalhadas, propenso a desincronizar (auditoria 31/05).
    const where = createWhereBuilder()

    // Restrição de acesso por tipo de usuário
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      addRawCondition(
        where,
        `escola_id IN (SELECT id FROM escolas WHERE polo_id = $${where.paramIndex} AND ativo = true)`,
        [usuario.polo_id]
      )
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      addCondition(where, 'escola_id', usuario.escola_id)
    }

    // Filtros opcionais (validar acesso para escola/polo informados)
    if (filtros.escola_id) {
      if (!(await podeAcessarEscola(usuario, filtros.escola_id))) {
        return NextResponse.json({ mensagem: 'Acesso negado a esta escola' }, { status: 403 })
      }
      addCondition(where, 'escola_id', filtros.escola_id)
    }

    if (filtros.polo_id) {
      if (!podeAcessarPolo(usuario, filtros.polo_id)) {
        return NextResponse.json({ mensagem: 'Acesso negado a este polo' }, { status: 403 })
      }
      addRawCondition(
        where,
        `escola_id IN (SELECT id FROM escolas WHERE polo_id = $${where.paramIndex})`,
        [filtros.polo_id]
      )
    }

    addCondition(where, 'ano_letivo', filtros.ano_letivo)
    addCondition(where, 'avaliacao_id', searchParams.get('avaliacao_id'))
    addCondition(where, 'serie', filtros.serie)
    addCondition(where, 'disciplina', filtros.disciplina)
    addCondition(where, 'area_conhecimento', filtros.area_conhecimento)
    addCondition(where, 'data_prova', filtros.data_inicio, '>=')
    addCondition(where, 'data_prova', filtros.data_fim, '<=')

    const whereClause = buildWhereString(where)
    const query = `
      SELECT escola_id, aluno_codigo, aluno_nome, questao_codigo,
             resposta_aluno, acertou, nota, data_prova, ano_letivo,
             serie, turma, disciplina, area_conhecimento, avaliacao_id
        FROM resultados_provas
       ${whereClause}
       LIMIT 50000
    `

    const result = await pool.query(query, where.params)
    const resultados = result.rows

    // Filtrar por taxa de acertos do aluno (cálculo em memória após query)
    let resultadosFiltrados = resultados
    if (filtros.taxa_acertos_min !== undefined || filtros.taxa_acertos_max !== undefined) {
      const alunosTaxa: Record<string, { total: number; acertos: number }> = {}
      for (const r of resultados) {
        if (!r.aluno_codigo) continue
        if (!alunosTaxa[r.aluno_codigo]) alunosTaxa[r.aluno_codigo] = { total: 0, acertos: 0 }
        alunosTaxa[r.aluno_codigo].total++
        if (r.acertou) alunosTaxa[r.aluno_codigo].acertos++
      }

      const alunosFiltrados = new Set(
        Object.keys(alunosTaxa).filter((codigo) => {
          const t = alunosTaxa[codigo]
          const taxa = t.total > 0 ? (t.acertos / t.total) * 100 : 0
          if (filtros.taxa_acertos_min !== undefined && taxa < filtros.taxa_acertos_min) return false
          if (filtros.taxa_acertos_max !== undefined && taxa > filtros.taxa_acertos_max) return false
          return true
        })
      )

      resultadosFiltrados = resultados.filter(
        (r) => r.aluno_codigo && alunosFiltrados.has(r.aluno_codigo)
      )
    }

    const totalAcertos = resultadosFiltrados.filter((r) => r.acertou === true).length
    const totalQuestoes = resultadosFiltrados.length

    return NextResponse.json({
      totalQuestoes,
      totalAcertos,
      taxaAcertos: totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0,
      totalAlunos: new Set(
        resultadosFiltrados.map((r) => r.aluno_codigo).filter(Boolean)
      ).size,
      resultados: resultadosFiltrados.slice(0, 100),
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar dados de análise', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
