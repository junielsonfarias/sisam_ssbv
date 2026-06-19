import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao, podeAcessarEscolaSync } from '@/lib/auth'
import { validateRequest, presencaFacialSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import { extrairDataHoraLocal } from '@/lib/api-helpers'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { registrarEventoFacial } from '@/lib/services/presenca-facial-eventos.service'

const log = createLogger('FacialTerminal')

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/facial/presenca-terminal
 * Registra presença via terminal web (usa JWT do usuario logado, não API key)
 * Body: { aluno_id, timestamp, confianca }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, presencaFacialSchema)
    if (!validacao.success) return validacao.response

    const { aluno_id, timestamp, confianca, prova_vida } = validacao.data

    // O FaceMatcher no terminal já filtra por threshold configurável.
    // A API aceita qualquer confiança > 0 (a qualidade é controlada no terminal).
    if (confianca <= 0) {
      return NextResponse.json(
        { mensagem: 'Confiança deve ser maior que 0' },
        { status: 400 }
      )
    }

    // Reforço de prova de vida (anti-foto), retrocompatível:
    // - prova_vida ausente -> aceita (eventos offline legados / clientes antigos)
    // - prova_vida presente com vivo !== true -> rejeita (cliente detectou foto)
    // O endurecimento (exigir prova_vida em eventos online) é dívida documentada.
    if (prova_vida && prova_vida.vivo !== true) {
      return NextResponse.json(
        { mensagem: 'Prova de vida não confirmada' },
        { status: 422 }
      )
    }

    // Buscar aluno
    const alunoResult = await pool.query(
      `SELECT a.id, a.turma_id, a.escola_id
       FROM alunos a
       WHERE a.id = $1 AND a.ativo = true AND a.situacao = 'cursando'`,
      [aluno_id]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado ou inativo' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Controle de acesso por escopo (IDOR): usuario do tipo 'escola' so pode
    // registrar presenca de alunos da propria escola. Admin/tecnico irrestritos.
    // A rota nao admite 'polo', entao o check sincrono (sem polo_id) basta.
    if (!podeAcessarEscolaSync(usuario, aluno.escola_id)) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    // Verificar consentimento facial ativo (LGPD)
    const consentimentoResult = await pool.query(
      `SELECT id FROM consentimentos_faciais
       WHERE aluno_id = $1 AND consentido = true AND data_revogacao IS NULL`,
      [aluno_id]
    )

    if (consentimentoResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno sem consentimento facial ativo' },
        { status: 403 }
      )
    }

    // Extrair data e hora no fuso local (não UTC)
    const { data, hora } = extrairDataHoraLocal(timestamp)
    const registradoEm = new Date(timestamp)
    if (isNaN(registradoEm.getTime())) {
      return NextResponse.json({ mensagem: 'Timestamp inválido' }, { status: 400 })
    }

    // Service classifica entrada/saida/duplicado (janela 30min)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const evento = await registrarEventoFacial(client, {
        aluno_id,
        escola_id: aluno.escola_id,
        registrado_em: registradoEm,
        data,
        confianca,
        origem: 'terminal_web',
        registrado_por: usuario.id,
      }, aluno.turma_id)

      await client.query('COMMIT')

      return NextResponse.json({
        sucesso: true,
        evento_id: evento.id,
        tipo: evento.tipo,
        primeiro_do_dia: evento.primeiro_do_dia,
        data,
        hora,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    log.error('Erro ao registrar presença via terminal', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
