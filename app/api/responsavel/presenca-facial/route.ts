/**
 * GET /api/responsavel/presenca-facial?filho_id=X&inicio=YYYY-MM-DD&fim=YYYY-MM-DD
 *
 * Retorna historico de entradas/saidas pelo terminal facial do filho do
 * responsavel logado. Janela maxima: 90 dias.
 *
 * - Valida vinculo responsavel-aluno (responsaveis_alunos.ativo=true)
 * - Excluiu eventos do tipo 'duplicado' (ruido interno)
 * - Retorna agrupado por dia + resumo (entrada/saida)
 *
 * F5 da auditoria: aluno_id sensivel — exige authz por vinculo familiar.
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/

export const GET = withAuth(['responsavel'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const filhoId = searchParams.get('filho_id')
  const inicio = searchParams.get('inicio')
  const fim = searchParams.get('fim') || inicio

  if (!filhoId || !inicio || !REGEX_DATA.test(inicio) || (fim && !REGEX_DATA.test(fim))) {
    return NextResponse.json({ mensagem: 'Parametros invalidos. Use filho_id, inicio, fim (YYYY-MM-DD).' }, { status: 400 })
  }

  // Janela maxima 90 dias
  const inicioDate = new Date(inicio)
  const fimDate = new Date(fim!)
  const diffDias = (fimDate.getTime() - inicioDate.getTime()) / 86_400_000
  if (diffDias < 0 || diffDias > 90) {
    return NextResponse.json({ mensagem: 'Janela invalida (max 90 dias).' }, { status: 400 })
  }

  // Validar vinculo
  const vinculo = await pool.query(
    `SELECT 1
       FROM responsaveis_alunos
      WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true AND status = 'aprovado'
      LIMIT 1`,
    [usuario.id, filhoId]
  )
  if (vinculo.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Sem permissao para acessar este aluno' }, { status: 403 })
  }

  // Eventos (sem duplicados — ruido)
  const eventos = await pool.query(
    `SELECT id, data, tipo, registrado_em, origem, confianca
       FROM presenca_facial_eventos
      WHERE aluno_id = $1
        AND data BETWEEN $2::date AND $3::date
        AND tipo IN ('entrada','saida')
      ORDER BY data DESC, registrado_em ASC`,
    [filhoId, inicio, fim]
  )

  // Resumo diario direto de frequencia_diaria (1 row por data com primeira
  // entrada e ultima saida ja consolidadas pelo service)
  const resumo = await pool.query(
    `SELECT data, hora_entrada, hora_saida, metodo
       FROM frequencia_diaria
      WHERE aluno_id = $1
        AND data BETWEEN $2::date AND $3::date
      ORDER BY data DESC`,
    [filhoId, inicio, fim]
  )

  // Agrupar eventos por dia para a UI
  const eventosPorDia: Record<string, any[]> = {}
  for (const e of eventos.rows) {
    const dia = e.data instanceof Date ? e.data.toISOString().slice(0, 10) : String(e.data)
    if (!eventosPorDia[dia]) eventosPorDia[dia] = []
    eventosPorDia[dia].push({
      id: e.id,
      tipo: e.tipo,
      registrado_em: e.registrado_em,
      origem: e.origem,
    })
  }

  return NextResponse.json({
    filho_id: filhoId,
    janela: { inicio, fim },
    resumo: resumo.rows.map((r: any) => ({
      data: r.data instanceof Date ? r.data.toISOString().slice(0, 10) : r.data,
      hora_entrada: r.hora_entrada,
      hora_saida: r.hora_saida,
      metodo: r.metodo,
    })),
    eventos_por_dia: eventosPorDia,
    total_eventos: eventos.rows.length,
  })
})
