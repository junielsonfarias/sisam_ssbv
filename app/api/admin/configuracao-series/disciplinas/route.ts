import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// GET - Listar disciplinas de uma série
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const serieId = searchParams.get('serie_id')

    if (serieId) {
      // Buscar disciplinas de uma série específica
      const result = await pool.query(`
        SELECT
          csd.id,
          csd.serie_id,
          csd.disciplina,
          csd.sigla,
          csd.ordem,
          csd.questao_inicio,
          csd.questao_fim,
          csd.qtd_questoes,
          csd.valor_questao,
          csd.nota_maxima,
          csd.ativo
        FROM configuracao_series_disciplinas csd
        WHERE csd.serie_id = $1 AND csd.ativo = true
        ORDER BY csd.ordem
      `, [serieId])

      return NextResponse.json(result.rows)
    } else {
      // Buscar todas as disciplinas agrupadas por série
      const result = await pool.query(`
        SELECT
          cs.id as serie_id,
          cs.serie,
          cs.nome_serie,
          cs.tipo_ensino,
          json_agg(
            json_build_object(
              'id', csd.id,
              'disciplina', csd.disciplina,
              'sigla', csd.sigla,
              'ordem', csd.ordem,
              'questao_inicio', csd.questao_inicio,
              'questao_fim', csd.questao_fim,
              'qtd_questoes', csd.qtd_questoes,
              'valor_questao', csd.valor_questao,
              'nota_maxima', csd.nota_maxima
            ) ORDER BY csd.ordem
          ) FILTER (WHERE csd.id IS NOT NULL) as disciplinas
        FROM configuracao_series cs
        LEFT JOIN configuracao_series_disciplinas csd ON cs.id = csd.serie_id AND csd.ativo = true
        GROUP BY cs.id, cs.serie, cs.nome_serie, cs.tipo_ensino
        ORDER BY cs.serie
      `)

      return NextResponse.json(result.rows)
    }
  } catch (error: any) {
    console.error('Erro ao buscar disciplinas:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar/Atualizar disciplinas de uma série
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { serie_id, disciplinas } = body

    if (!serie_id || !disciplinas || !Array.isArray(disciplinas)) {
      return NextResponse.json(
        { mensagem: 'Dados inválidos. Informe serie_id e array de disciplinas.' },
        { status: 400 }
      )
    }

    // Validar se as questões não se sobrepõem
    const sortedDisciplinas = [...disciplinas].sort((a, b) => a.ordem - b.ordem)
    for (let i = 0; i < sortedDisciplinas.length - 1; i++) {
      const atual = sortedDisciplinas[i]
      const proxima = sortedDisciplinas[i + 1]

      if (atual.questao_fim >= proxima.questao_inicio) {
        return NextResponse.json(
          {
            mensagem: `Erro: As questões de "${atual.disciplina}" (Q${atual.questao_inicio}-Q${atual.questao_fim}) se sobrepõem com "${proxima.disciplina}" (Q${proxima.questao_inicio}-Q${proxima.questao_fim})`
          },
          { status: 400 }
        )
      }
    }

    // Iniciar transação
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Desativar disciplinas existentes (soft delete)
      await client.query(`
        UPDATE configuracao_series_disciplinas
        SET ativo = false, atualizado_em = CURRENT_TIMESTAMP
        WHERE serie_id = $1
      `, [serie_id])

      // Inserir/atualizar novas disciplinas
      for (const disc of disciplinas) {
        const qtdQuestoes = disc.questao_fim - disc.questao_inicio + 1
        const valorQuestao = disc.valor_questao || (10 / qtdQuestoes).toFixed(2)

        await client.query(`
          INSERT INTO configuracao_series_disciplinas (
            serie_id, disciplina, sigla, ordem,
            questao_inicio, questao_fim, qtd_questoes,
            valor_questao, nota_maxima, ativo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
          ON CONFLICT (serie_id, sigla)
          DO UPDATE SET
            disciplina = EXCLUDED.disciplina,
            ordem = EXCLUDED.ordem,
            questao_inicio = EXCLUDED.questao_inicio,
            questao_fim = EXCLUDED.questao_fim,
            qtd_questoes = EXCLUDED.qtd_questoes,
            valor_questao = EXCLUDED.valor_questao,
            nota_maxima = EXCLUDED.nota_maxima,
            ativo = true,
            atualizado_em = CURRENT_TIMESTAMP
        `, [
          serie_id,
          disc.disciplina,
          disc.sigla,
          disc.ordem,
          disc.questao_inicio,
          disc.questao_fim,
          qtdQuestoes,
          valorQuestao,
          disc.nota_maxima || 10
        ])
      }

      // Atualizar campos legados em configuracao_series para compatibilidade
      const totalQuestoes = disciplinas.reduce((sum: number, d: any) => sum + (d.questao_fim - d.questao_inicio + 1), 0)

      const lpDisc = disciplinas.find((d: any) => d.sigla === 'LP')
      const matDisc = disciplinas.find((d: any) => d.sigla === 'MAT')
      const chDisc = disciplinas.find((d: any) => d.sigla === 'CH')
      const cnDisc = disciplinas.find((d: any) => d.sigla === 'CN')

      await client.query(`
        UPDATE configuracao_series
        SET
          avalia_lp = $2,
          avalia_mat = $3,
          avalia_ch = $4,
          avalia_cn = $5,
          qtd_questoes_lp = $6,
          qtd_questoes_mat = $7,
          qtd_questoes_ch = $8,
          qtd_questoes_cn = $9,
          total_questoes = $10,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [
        serie_id,
        !!lpDisc,
        !!matDisc,
        !!chDisc,
        !!cnDisc,
        lpDisc ? lpDisc.questao_fim - lpDisc.questao_inicio + 1 : 0,
        matDisc ? matDisc.questao_fim - matDisc.questao_inicio + 1 : 0,
        chDisc ? chDisc.questao_fim - chDisc.questao_inicio + 1 : 0,
        cnDisc ? cnDisc.questao_fim - cnDisc.questao_inicio + 1 : 0,
        totalQuestoes
      ])

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: 'Disciplinas atualizadas com sucesso',
        total_disciplinas: disciplinas.length,
        total_questoes: totalQuestoes
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Erro ao salvar disciplinas:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover uma disciplina específica
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const disciplinaId = searchParams.get('id')

    if (!disciplinaId) {
      return NextResponse.json(
        { mensagem: 'ID da disciplina não informado' },
        { status: 400 }
      )
    }

    await pool.query(`
      UPDATE configuracao_series_disciplinas
      SET ativo = false, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [disciplinaId])

    return NextResponse.json({
      mensagem: 'Disciplina removida com sucesso'
    })

  } catch (error: any) {
    console.error('Erro ao remover disciplina:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
