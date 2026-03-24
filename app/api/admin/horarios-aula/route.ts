import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { horarioAulaSchema } from '@/lib/schemas'
import { isAnosFinais, extrairNumeroSerie } from '@/lib/disciplinas-mapping'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/horarios-aula
 * Retorna grade horária de uma turma (30 slots: 5 dias × 6 aulas)
 * Params: turma_id
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')

    if (!turmaId) {
      return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT h.id, h.dia_semana, h.numero_aula, h.disciplina_id,
              d.nome AS disciplina_nome, d.codigo AS disciplina_codigo
       FROM horarios_aula h
       INNER JOIN disciplinas_escolares d ON d.id = h.disciplina_id
       WHERE h.turma_id = $1
       ORDER BY h.dia_semana, h.numero_aula`,
      [turmaId]
    )

    return NextResponse.json({ horarios: result.rows, turma_id: turmaId })
  } catch (error: unknown) {
    console.error('Erro ao buscar horários:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/horarios-aula
 * Salva grade horária em lote para uma turma
 * Valida que a turma é 6º-9º Ano
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, horarioAulaSchema)
    if (!validacao.success) return validacao.response

    const { turma_id, horarios } = validacao.data

    // Verificar se turma existe, é 6º-9º e pertence à escola do usuário
    const turmaResult = await pool.query(
      'SELECT id, serie, escola_id FROM turmas WHERE id = $1',
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && turmaResult.rows[0].escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta turma' }, { status: 403 })
    }

    const serie = turmaResult.rows[0].serie
    if (!isAnosFinais(serie)) {
      return NextResponse.json(
        { mensagem: 'Grade horária disponível apenas para turmas do 6º ao 9º Ano' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Limpar horários existentes e inserir novos
      await client.query('DELETE FROM horarios_aula WHERE turma_id = $1', [turma_id])

      let salvos = 0
      for (const h of horarios) {
        await client.query(
          `INSERT INTO horarios_aula (turma_id, dia_semana, numero_aula, disciplina_id)
           VALUES ($1, $2, $3, $4)`,
          [turma_id, h.dia_semana, h.numero_aula, h.disciplina_id]
        )
        salvos++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Grade horária salva: ${salvos} aula(s)`,
        salvos,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    console.error('Erro ao salvar horários:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
