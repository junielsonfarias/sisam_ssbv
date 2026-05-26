/**
 * GET /api/admin/turmas/[id]/diario-detalhado
 *
 * Versao detalhada do diario: matriz dias letivos x alunos com status diario
 * (P/F/FJ/null). Pensado para gerar um diario impresso em formato classico
 * (lista de alunos nas linhas, dias do mes nas colunas).
 *
 * Detecta automaticamente o modelo de frequencia conforme a serie:
 *   - Anos finais (6-9): agrega frequencia_hora_aula por dia (>=1 aula
 *     presente = P; todas aulas falta = F; sem registro = nao lancado)
 *   - Demais (creche-5): le frequencia_diaria diretamente
 *
 * Estatus possiveis por celula:
 *   - 'P'  = presente
 *   - 'F'  = falta
 *   - 'FJ' = falta justificada (so disponivel em frequencia_diaria)
 *   - null = nao lancado
 *
 * Filtros:
 *   - periodo_id (opcional): restringe ao intervalo data_inicio..data_fim
 *     do periodo letivo. Sem ele, usa o ano letivo completo.
 *
 * Permissao: administrador, tecnico, escola (escola so ve suas turmas).
 *
 * Auditoria: se a turma for sensivel, registra DIARIO_LER_SENSIVEL com
 * fonte='diario-detalhado'.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const log = createLogger('AdminDiarioDetalhado')

export const dynamic = 'force-dynamic'

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type StatusCelula = 'P' | 'F' | 'FJ' | null

function isAnosFinais(serie: string): boolean {
  const num = serie.replace(/[^\d]/g, '')
  return ['6', '7', '8', '9'].includes(num)
}

export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const segments = request.nextUrl.pathname.split('/')
  const turmaId = segments[segments.indexOf('turmas') + 1]

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turmaId obrigatório' }, { status: 400 })
  }

  const { searchParams } = request.nextUrl
  const periodoId = searchParams.get('periodo_id')?.trim() || null

  try {
    // 1) Turma + escola + ano letivo
    const turmaRes = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, t.turno, t.ano_letivo, t.sensivel,
              e.id  AS escola_id, e.nome AS escola_nome, e.logo_url AS escola_logo_url,
              al.id AS ano_letivo_id,
              al.data_inicio AS ano_data_inicio,
              al.data_fim    AS ano_data_fim
         FROM turmas t
         JOIN escolas e ON e.id = t.escola_id
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

    if (turma.sensivel) {
      registrarAuditoria({
        usuarioId: usuario.id, usuarioEmail: usuario.email,
        acao: 'DIARIO_LER_SENSIVEL', entidade: 'turma', entidadeId: turmaId,
        detalhes: {
          escola_id: turma.escola_id, ano_letivo: turma.ano_letivo,
          tipo_usuario: usuario.tipo_usuario, periodo_id: periodoId,
          fonte: 'diario-detalhado',
        },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
    }

    if (!turma.ano_letivo_id) {
      return NextResponse.json({
        mensagem: `Ano letivo "${turma.ano_letivo}" não cadastrado em anos_letivos.`,
      }, { status: 422 })
    }

    // 2) Escopo (data_inicio / data_fim)
    let dataInicio: string
    let dataFim: string
    let periodoInfo: { id: string; nome: string; numero: number } | null = null

    if (periodoId) {
      const pRes = await pool.query(
        `SELECT id, nome, numero, data_inicio, data_fim FROM periodos_letivos WHERE id = $1`,
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
      const ano = parseInt(turma.ano_letivo, 10)
      dataInicio = turma.ano_data_inicio || `${ano}-01-01`
      dataFim = turma.ano_data_fim || `${ano}-12-31`
    }

    // 3) Lista de dias letivos no escopo (mesma logica de contar_dias_letivos)
    const diasRes = await pool.query(
      `
      WITH escopo AS (
        SELECT $1::date AS dt_ini, $2::date AS dt_fim,
               $3::uuid AS ano_letivo_id, $4::uuid AS escola_id
      ),
      dias AS (
        SELECT d::date AS data
          FROM escopo, generate_series((SELECT dt_ini FROM escopo),
                                       (SELECT dt_fim FROM escopo),
                                       '1 day'::interval) d
      ),
      eventos AS (
        SELECT e.data,
               bool_or(e.conta_dia_letivo)     AS tem_letivo,
               bool_or(NOT e.conta_dia_letivo) AS tem_feriado
          FROM calendario_eventos e, escopo
         WHERE e.ano_letivo_id = escopo.ano_letivo_id
           AND e.data BETWEEN escopo.dt_ini AND escopo.dt_fim
           AND (e.escola_id = escopo.escola_id OR e.escola_id IS NULL)
         GROUP BY e.data
      )
      SELECT d.data
        FROM dias d
        LEFT JOIN eventos e ON e.data = d.data
       WHERE COALESCE(e.tem_letivo, FALSE)
          OR (EXTRACT(DOW FROM d.data) BETWEEN 1 AND 5
              AND NOT COALESCE(e.tem_feriado, FALSE))
       ORDER BY d.data
      `,
      [dataInicio, dataFim, turma.ano_letivo_id, turma.escola_id]
    )

    const diasLetivos: string[] = diasRes.rows.map((r: { data: Date | string }) =>
      typeof r.data === 'string' ? r.data.slice(0, 10) : new Date(r.data).toISOString().slice(0, 10)
    )

    if (diasLetivos.length === 0) {
      return NextResponse.json({ mensagem: 'Nenhum dia letivo no escopo selecionado' }, { status: 200 })
    }

    // 4) Alunos da turma
    const alunosRes = await pool.query(
      `SELECT id, nome FROM alunos WHERE turma_id = $1 AND ativo = TRUE ORDER BY nome`,
      [turmaId]
    )
    const alunos: Array<{ id: string; nome: string }> = alunosRes.rows

    // 5) Frequencia conforme modelo
    const usaHoraAula = isAnosFinais(turma.serie)
    const modeloFrequencia = usaHoraAula ? 'hora_aula' : 'diaria'

    // celulas[aluno_id][YYYY-MM-DD] = 'P' | 'F' | 'FJ' | undefined
    const celulas: Record<string, Record<string, StatusCelula>> = {}
    alunos.forEach(a => { celulas[a.id] = {} })

    if (usaHoraAula) {
      // Agrega frequencia_hora_aula por (aluno, data)
      const freqRes = await pool.query(
        `
        SELECT aluno_id, data, BOOL_OR(presente) AS houve_presenca
          FROM frequencia_hora_aula
         WHERE turma_id = $1
           AND data BETWEEN $2 AND $3
         GROUP BY aluno_id, data
        `,
        [turmaId, dataInicio, dataFim]
      )
      freqRes.rows.forEach((r: { aluno_id: string; data: Date | string; houve_presenca: boolean }) => {
        const dataStr = typeof r.data === 'string' ? r.data.slice(0, 10) : new Date(r.data).toISOString().slice(0, 10)
        if (celulas[r.aluno_id]) {
          celulas[r.aluno_id][dataStr] = r.houve_presenca ? 'P' : 'F'
        }
      })
    } else {
      // Le frequencia_diaria diretamente
      const freqRes = await pool.query(
        `
        SELECT aluno_id, data, status, justificativa
          FROM frequencia_diaria
         WHERE turma_id = $1
           AND data BETWEEN $2 AND $3
        `,
        [turmaId, dataInicio, dataFim]
      )
      freqRes.rows.forEach((r: { aluno_id: string; data: Date | string; status: string; justificativa: string | null }) => {
        const dataStr = typeof r.data === 'string' ? r.data.slice(0, 10) : new Date(r.data).toISOString().slice(0, 10)
        if (!celulas[r.aluno_id]) return
        if (r.status === 'presente') celulas[r.aluno_id][dataStr] = 'P'
        else if (r.justificativa) celulas[r.aluno_id][dataStr] = 'FJ'
        else celulas[r.aluno_id][dataStr] = 'F'
      })
    }

    // 6) Agrupa dias por mes e monta payload final
    const diasPorMes: Map<string, string[]> = new Map()
    diasLetivos.forEach(d => {
      const k = d.slice(0, 7) // YYYY-MM
      if (!diasPorMes.has(k)) diasPorMes.set(k, [])
      diasPorMes.get(k)!.push(d)
    })

    const meses = Array.from(diasPorMes.entries()).map(([anoMes, dias]) => {
      const [ano, mes] = anoMes.split('-')
      return {
        ano: parseInt(ano, 10),
        mes: parseInt(mes, 10),
        mes_nome: MESES_PT[parseInt(mes, 10) - 1],
        dias_letivos: dias,
        alunos: alunos.map(a => {
          const cel: Record<string, StatusCelula> = {}
          let totalP = 0, totalF = 0, totalFJ = 0
          dias.forEach(d => {
            const v = celulas[a.id]?.[d] ?? null
            cel[d] = v
            if (v === 'P') totalP++
            else if (v === 'F') totalF++
            else if (v === 'FJ') totalFJ++
          })
          return {
            id: a.id,
            nome: a.nome,
            celulas: cel,
            totais: { presencas: totalP, faltas: totalF, justificadas: totalFJ },
          }
        }),
      }
    })

    return NextResponse.json({
      turma: {
        id: turma.id, codigo: turma.codigo, nome: turma.nome,
        serie: turma.serie, turno: turma.turno, ano_letivo: turma.ano_letivo,
        escola_id: turma.escola_id, escola_nome: turma.escola_nome,
        escola_logo_url: turma.escola_logo_url, sensivel: turma.sensivel,
      },
      escopo: { data_inicio: dataInicio, data_fim: dataFim, periodo: periodoInfo },
      modelo_frequencia: modeloFrequencia,
      meses,
    })
  } catch (error) {
    log.error('Erro ao gerar diário detalhado', error, { turmaId, periodoId })
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
