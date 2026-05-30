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
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { professorEstaVinculadoNaTurma } from '@/lib/services/turmas.service'

const log = createLogger('AdminDiarioDetalhado')

const uuidSchema = z.string().uuid()

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

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'professor'], async (request, usuario) => {
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

    if (usuario.tipo_usuario === 'professor') {
      const vinculado = await professorEstaVinculadoNaTurma(usuario.id, turmaId, turma.ano_letivo)
      if (!vinculado) {
        return NextResponse.json({ mensagem: 'Sem permissão para visualizar esta turma' }, { status: 403 })
      }
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
      // Mesma defesa do /diario-lacunas: valida formato YYYY antes de
      // concatenar para evitar "NaN-01-01" em ano_letivo invalido.
      const anoMatch = /^(\d{4})$/.exec(turma.ano_letivo || '')
      const ano = anoMatch ? anoMatch[1] : null
      if (!turma.ano_data_inicio && !ano) {
        return NextResponse.json({
          mensagem: `Ano letivo "${turma.ano_letivo}" inválido — esperado formato YYYY ou datas cadastradas em anos_letivos.`,
        }, { status: 422 })
      }
      dataInicio = turma.ano_data_inicio || `${ano}-01-01`
      dataFim = turma.ano_data_fim || `${ano}-12-31`
    }

    // 3+4) Dias letivos e Alunos em paralelo (consultas independentes)
    const [diasRes, alunosRes] = await Promise.all([
      pool.query(
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
      ),
      pool.query(
        `SELECT id, nome FROM alunos WHERE turma_id = $1 AND ativo = TRUE ORDER BY nome`,
        [turmaId]
      ),
    ])

    const diasLetivos: string[] = diasRes.rows.map((r: { data: Date | string }) =>
      typeof r.data === 'string' ? r.data.slice(0, 10) : new Date(r.data).toISOString().slice(0, 10)
    )
    const alunos: Array<{ id: string; nome: string }> = alunosRes.rows
    const usaHoraAula = isAnosFinais(turma.serie)
    const modeloFrequencia = usaHoraAula ? 'hora_aula' : 'diaria'

    const turmaPayload = {
      id: turma.id, codigo: turma.codigo, nome: turma.nome,
      serie: turma.serie, turno: turma.turno, ano_letivo: turma.ano_letivo,
      escola_id: turma.escola_id, escola_nome: turma.escola_nome,
      escola_logo_url: turma.escola_logo_url, sensivel: turma.sensivel,
    }
    const escopoPayload = { data_inicio: dataInicio, data_fim: dataFim, periodo: periodoInfo }

    // Caso vazio: retorna estrutura completa com disciplinas: [] para que o
    // cliente nao quebre tentando .flatMap em undefined (bug encontrado na
    // revisao critica Pt.5)
    if (diasLetivos.length === 0) {
      return NextResponse.json({
        turma: turmaPayload,
        escopo: escopoPayload,
        modelo_frequencia: modeloFrequencia,
        disciplinas: [],
      })
    }

    // 5) Frequencia conforme modelo
    const disciplinas = usaHoraAula
      ? await montarDisciplinasAnosFinais(turmaId, dataInicio, dataFim, alunos)
      : [await montarDisciplinaAnosIniciais(turmaId, dataInicio, dataFim, alunos, diasLetivos)]

    return NextResponse.json({
      turma: turmaPayload,
      escopo: escopoPayload,
      modelo_frequencia: modeloFrequencia,
      disciplinas,
    })
  } catch (error) {
    log.error('Erro ao gerar diário detalhado', error, { turmaId, periodoId })
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

// ============================================================================
// Helpers de montagem (extraidos para manter o handler enxuto)
// ============================================================================
type Aluno = { id: string; nome: string }

function isoData(d: Date | string): string {
  return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
}

function agruparMeses(
  dias: string[],
  alunos: Aluno[],
  celulas: Record<string, Record<string, StatusCelula>>,
) {
  const diasPorMes: Map<string, string[]> = new Map()
  dias.forEach(d => {
    const k = d.slice(0, 7)
    if (!diasPorMes.has(k)) diasPorMes.set(k, [])
    diasPorMes.get(k)!.push(d)
  })

  return Array.from(diasPorMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([anoMes, dd]) => {
      const [ano, mes] = anoMes.split('-')
      return {
        ano: parseInt(ano, 10),
        mes: parseInt(mes, 10),
        mes_nome: MESES_PT[parseInt(mes, 10) - 1],
        dias_letivos: dd,
        alunos: alunos.map(a => {
          const cel: Record<string, StatusCelula> = {}
          let p = 0, f = 0, fj = 0
          dd.forEach(d => {
            const v = celulas[a.id]?.[d] ?? null
            cel[d] = v
            if (v === 'P') p++
            else if (v === 'F') f++
            else if (v === 'FJ') fj++
          })
          return { id: a.id, nome: a.nome, celulas: cel, totais: { presencas: p, faltas: f, justificadas: fj } }
        }),
      }
    })
}

async function montarDisciplinaAnosIniciais(
  turmaId: string, dt_ini: string, dt_fim: string, alunos: Aluno[], dias: string[],
) {
  const celulas: Record<string, Record<string, StatusCelula>> = {}
  alunos.forEach(a => { celulas[a.id] = {} })

  const freqRes = await pool.query(
    `SELECT aluno_id, data, status, justificativa
       FROM frequencia_diaria
      WHERE turma_id = $1 AND data BETWEEN $2 AND $3`,
    [turmaId, dt_ini, dt_fim]
  )
  freqRes.rows.forEach((r: { aluno_id: string; data: Date | string; status: string; justificativa: string | null }) => {
    const d = isoData(r.data)
    if (!celulas[r.aluno_id]) return
    if (r.status === 'presente') celulas[r.aluno_id][d] = 'P'
    else if (r.justificativa) celulas[r.aluno_id][d] = 'FJ'
    else celulas[r.aluno_id][d] = 'F'
  })

  return { id: null, nome: null, meses: agruparMeses(dias, alunos, celulas) }
}

async function montarDisciplinasAnosFinais(
  turmaId: string, dt_ini: string, dt_fim: string, alunos: Aluno[],
) {
  // Uma unica query traz tudo agrupado (disciplina x aluno x dia)
  const res = await pool.query(
    `SELECT fha.disciplina_id, d.nome AS disciplina_nome,
            fha.aluno_id, fha.data,
            BOOL_OR(fha.presente) AS houve_presenca
       FROM frequencia_hora_aula fha
       JOIN disciplinas_escolares d ON d.id = fha.disciplina_id
      WHERE fha.turma_id = $1 AND fha.data BETWEEN $2 AND $3
      GROUP BY fha.disciplina_id, d.nome, fha.aluno_id, fha.data
      ORDER BY d.nome, fha.data, fha.aluno_id`,
    [turmaId, dt_ini, dt_fim]
  )

  // Agrupa em memoria: disciplina -> { dias: Set, celulas: { aluno: { data: status } } }
  type DiscAcc = { id: string; nome: string; dias: Set<string>; celulas: Record<string, Record<string, StatusCelula>> }
  const porDisciplina = new Map<string, DiscAcc>()

  res.rows.forEach((r: {
    disciplina_id: string; disciplina_nome: string; aluno_id: string;
    data: Date | string; houve_presenca: boolean
  }) => {
    if (!porDisciplina.has(r.disciplina_id)) {
      const cel: Record<string, Record<string, StatusCelula>> = {}
      alunos.forEach(a => { cel[a.id] = {} })
      porDisciplina.set(r.disciplina_id, {
        id: r.disciplina_id, nome: r.disciplina_nome, dias: new Set(), celulas: cel,
      })
    }
    const acc = porDisciplina.get(r.disciplina_id)!
    const d = isoData(r.data)
    acc.dias.add(d)
    if (acc.celulas[r.aluno_id]) {
      acc.celulas[r.aluno_id][d] = r.houve_presenca ? 'P' : 'F'
    }
  })

  return Array.from(porDisciplina.values()).map(d => ({
    id: d.id,
    nome: d.nome,
    meses: agruparMeses(Array.from(d.dias).sort(), alunos, d.celulas),
  }))
}
