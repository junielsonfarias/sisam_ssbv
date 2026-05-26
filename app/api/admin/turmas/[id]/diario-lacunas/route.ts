/**
 * GET /api/admin/turmas/[id]/diario-lacunas
 *
 * Indica quais dias letivos estao SEM lancamento no diario_classe para a turma.
 * Agrega por mes e inclui as datas exatas em lacuna.
 *
 * Filtros:
 * - `periodo_id` (opcional): se informado, restringe o escopo ao intervalo
 *   data_inicio..data_fim do periodo letivo. Senao, usa o intervalo do ano
 *   letivo (anos_letivos.data_inicio..data_fim, com fallback para Jan 1 - Dez 31).
 *
 * Logica de "dia letivo":
 *   - Dia util (seg-sex) sem evento de feriado/recesso = letivo
 *   - Dia util com evento conta_dia_letivo=FALSE (feriado) = NAO letivo
 *   - Sabado/Domingo + evento conta_dia_letivo=TRUE (reposicao) = letivo
 *   - Replica a semantica de contar_dias_letivos(), mas retornando as datas.
 *
 * "Lacuna" = dia letivo sem nenhum registro em diario_classe(turma_id, data_aula).
 * Definicao simples e util: alerta "a turma X ficou sem registro nesses dias".
 * Nao distingue por disciplina (basta 1 registro qualquer no dia).
 *
 * Permissao:
 * - administrador / tecnico: qualquer turma
 * - escola: somente turmas da propria escola_id
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { withRedisCache, cacheKey, CACHE_TTL } from '@/lib/cache'

const log = createLogger('AdminDiarioLacunas')

const uuidSchema = z.string().uuid()

export const dynamic = 'force-dynamic'

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const segments = request.nextUrl.pathname.split('/')
  const turmaId = segments[segments.indexOf('turmas') + 1]

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turmaId obrigatório' }, { status: 400 })
  }

  const { searchParams } = request.nextUrl
  const periodoIdRaw = searchParams.get('periodo_id')?.trim() || null
  if (periodoIdRaw && !uuidSchema.safeParse(periodoIdRaw).success) {
    return NextResponse.json({ mensagem: 'periodo_id inválido (esperado UUID)' }, { status: 400 })
  }
  const periodoId = periodoIdRaw

  try {
    // 1) Turma + escola + ano_letivo (resolve UUID do ano via JOIN com anos_letivos)
    const turmaRes = await pool.query(
      `SELECT t.id, t.codigo, t.ano_letivo, t.sensivel,
              e.id  AS escola_id,
              al.id AS ano_letivo_id,
              al.data_inicio AS ano_data_inicio,
              al.data_fim    AS ano_data_fim
         FROM turmas t
         JOIN escolas e        ON e.id = t.escola_id
         LEFT JOIN anos_letivos al ON al.ano = t.ano_letivo
        WHERE t.id = $1`,
      [turmaId]
    )

    if (turmaRes.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaRes.rows[0]

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && String(turma.escola_id) !== String(usuario.escola_id)) {
      return NextResponse.json({ mensagem: 'Sem permissão para visualizar esta turma' }, { status: 403 })
    }

    // Auditoria de leitura sensivel (mesmo padrao do /diario-completo).
    if (turma.sensivel) {
      registrarAuditoria({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        acao: 'DIARIO_LER_SENSIVEL',
        entidade: 'turma',
        entidadeId: turmaId,
        detalhes: {
          escola_id: turma.escola_id,
          ano_letivo: turma.ano_letivo,
          tipo_usuario: usuario.tipo_usuario,
          periodo_id: periodoId,
          fonte: 'diario-lacunas',
        },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
    }

    if (!turma.ano_letivo_id) {
      return NextResponse.json({
        mensagem: `Ano letivo "${turma.ano_letivo}" não cadastrado em anos_letivos. Crie o ano antes de calcular lacunas.`,
      }, { status: 422 })
    }

    // 2) Resolve escopo (data_inicio / data_fim)
    let dataInicio: string
    let dataFim: string
    let periodoInfo: { id: string; nome: string; numero: number } | null = null

    if (periodoId) {
      const pRes = await pool.query(
        `SELECT id, nome, numero, data_inicio, data_fim
           FROM periodos_letivos
          WHERE id = $1`,
        [periodoId]
      )
      if (pRes.rows.length === 0) {
        return NextResponse.json({ mensagem: 'Período não encontrado' }, { status: 404 })
      }
      const p = pRes.rows[0]
      if (!p.data_inicio || !p.data_fim) {
        return NextResponse.json({ mensagem: 'Período sem datas configuradas' }, { status: 422 })
      }
      dataInicio = p.data_inicio
      dataFim = p.data_fim
      periodoInfo = { id: p.id, nome: p.nome, numero: p.numero }
    } else {
      // Fallback: Jan 1 - Dez 31 do ano letivo
      const ano = parseInt(turma.ano_letivo, 10)
      dataInicio = turma.ano_data_inicio || `${ano}-01-01`
      dataFim = turma.ano_data_fim || `${ano}-12-31`
    }

    // 3) Query principal: dias letivos no escopo cruzado com lancamentos do diario
    // Cacheada por 60s (chave inclui turma+periodo). Auditoria de leitura
    // fica FORA do cache — toda chamada e registrada mesmo em hit.
    const redisKey = cacheKey('diario-lacunas', turmaId, periodoId ?? 'todos')
    const lacunasData = await withRedisCache(redisKey, 60, async () => {
      const resultRes = await pool.query(
      `
      WITH escopo AS (
        SELECT $1::date AS dt_ini, $2::date AS dt_fim,
               $3::uuid AS ano_letivo_id, $4::uuid AS escola_id, $5::uuid AS turma_id
      ),
      dias AS (
        SELECT d::date AS data
          FROM escopo, generate_series((SELECT dt_ini FROM escopo),
                                       (SELECT dt_fim FROM escopo),
                                       '1 day'::interval) d
      ),
      eventos AS (
        SELECT e.data,
               bool_or(e.conta_dia_letivo)        AS tem_letivo,
               bool_or(NOT e.conta_dia_letivo)    AS tem_feriado
          FROM calendario_eventos e, escopo
         WHERE e.ano_letivo_id = escopo.ano_letivo_id
           AND e.data BETWEEN escopo.dt_ini AND escopo.dt_fim
           AND (e.escola_id = escopo.escola_id OR e.escola_id IS NULL)
         GROUP BY e.data
      ),
      dias_letivos AS (
        SELECT d.data
          FROM dias d
          LEFT JOIN eventos e ON e.data = d.data
         WHERE COALESCE(e.tem_letivo, FALSE)
            OR (EXTRACT(DOW FROM d.data) BETWEEN 1 AND 5
                AND NOT COALESCE(e.tem_feriado, FALSE))
      ),
      lancamentos AS (
        SELECT DISTINCT dc.data_aula AS data
          FROM diario_classe dc, escopo
         WHERE dc.turma_id  = escopo.turma_id
           AND dc.data_aula BETWEEN escopo.dt_ini AND escopo.dt_fim
      )
      SELECT
        EXTRACT(YEAR  FROM dl.data)::int AS ano,
        EXTRACT(MONTH FROM dl.data)::int AS mes,
        COUNT(*)::int AS dias_letivos,
        COUNT(*) FILTER (WHERE l.data IS NOT NULL)::int AS dias_com_lancamento,
        COUNT(*) FILTER (WHERE l.data IS NULL)::int     AS lacunas,
        ARRAY_AGG(dl.data ORDER BY dl.data) FILTER (WHERE l.data IS NULL) AS lacunas_datas
      FROM dias_letivos dl
      LEFT JOIN lancamentos l ON l.data = dl.data
      GROUP BY ano, mes
      ORDER BY ano, mes
      `,
        [dataInicio, dataFim, turma.ano_letivo_id, turma.escola_id, turmaId]
      )

      type Row = {
        ano: number
        mes: number
        dias_letivos: number
        dias_com_lancamento: number
        lacunas: number
        lacunas_datas: string[] | null
      }
      const rows = resultRes.rows as Row[]

      let diasLetivosTotal = 0
      let diasComLancamentoTotal = 0
      const lacunasPorMes = rows.map(r => {
        diasLetivosTotal += r.dias_letivos
        diasComLancamentoTotal += r.dias_com_lancamento
        const datas = (r.lacunas_datas || []).map(d => {
          return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
        })
        return {
          ano: r.ano,
          mes: r.mes,
          mes_nome: MESES_PT[r.mes - 1],
          dias_letivos: r.dias_letivos,
          dias_com_lancamento: r.dias_com_lancamento,
          lacunas: r.lacunas,
          lacunas_datas: datas,
        }
      })

      const lacunasTotal = diasLetivosTotal - diasComLancamentoTotal
      const percentualCobertura = diasLetivosTotal === 0
        ? '0.0'
        : ((diasComLancamentoTotal / diasLetivosTotal) * 100).toFixed(1)

      return {
        resumo: {
          dias_letivos_total: diasLetivosTotal,
          dias_com_lancamento: diasComLancamentoTotal,
          lacunas_total: lacunasTotal,
          percentual_cobertura: percentualCobertura,
        },
        lacunas_por_mes: lacunasPorMes,
      }
    })

    return NextResponse.json({
      escopo: {
        data_inicio: dataInicio,
        data_fim: dataFim,
        periodo: periodoInfo,
        ano_letivo: turma.ano_letivo,
      },
      resumo: lacunasData.resumo,
      lacunas_por_mes: lacunasData.lacunas_por_mes,
    })
  } catch (error) {
    log.error('Erro ao calcular lacunas do diário', error, { turmaId, periodoId })
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
