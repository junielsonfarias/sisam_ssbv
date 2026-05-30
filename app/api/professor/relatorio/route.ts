/**
 * API Route para geração de relatório PDF da turma (Professor)
 * GET /api/professor/relatorio?turma_id=X&periodo_id=Y
 *
 * Gera PDF com lista de alunos, notas por disciplina e frequência.
 * Apenas professores com vínculo ativo na turma podem acessar.
 */

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import React from 'react'
import { RelatorioTurmaPDF } from '@/lib/relatorios/relatorio-turma'
import type { AlunoTurmaRelatorio, DadosRelatorioTurma } from '@/lib/relatorios/relatorio-turma'
import { createLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const log = createLogger('RelatorioTurma')

// Schema de validação dos query params
const querySchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser um UUID válido'),
  periodo_id: z.string().uuid('periodo_id deve ser um UUID válido').optional(),
})

/**
 * GET /api/professor/relatorio?turma_id=X&periodo_id=Y
 * Gera relatório PDF da turma com notas e frequência
 */
export const GET = withAuth('professor', async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      turma_id: searchParams.get('turma_id'),
      periodo_id: searchParams.get('periodo_id') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({
        mensagem: 'Parâmetros inválidos',
        erros: parsed.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
      }, { status: 400 })
    }

    const { turma_id, periodo_id } = parsed.data

    // Verificar vínculo do professor com a turma
    const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Buscar dados da turma, escola e professor em paralelo
    const [turmaResult, professorResult] = await Promise.all([
      pool.query(
        `SELECT t.id, t.nome, t.codigo, t.serie, t.ano_letivo,
                e.nome as escola_nome
         FROM turmas t
         INNER JOIN escolas e ON t.escola_id = e.id
         WHERE t.id = $1`,
        [turma_id]
      ),
      pool.query(
        `SELECT nome FROM usuarios WHERE id = $1`,
        [usuario.id]
      ),
    ])

    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaResult.rows[0]
    const professorNome = professorResult.rows[0]?.nome || 'Professor'

    // Determinar período (se não informado, buscar o mais recente).
    // Carrega data_inicio/data_fim para calcular a janela da frequencia
    // — sem isso, o calculo de % frequencia caia no fallback anos_letivos
    // (ou Jan-Dez) ao inves de respeitar o periodo escolhido.
    let periodoInfo: { id: string; nome: string; numero: number; data_inicio: string | null; data_fim: string | null } | null = null

    if (periodo_id) {
      const periodoResult = await pool.query(
        `SELECT id, nome, numero, data_inicio, data_fim FROM periodos_letivos WHERE id = $1`,
        [periodo_id]
      )
      if (periodoResult.rows.length > 0) {
        periodoInfo = periodoResult.rows[0]
      }
    } else {
      // Buscar período mais recente do ano letivo
      const periodoResult = await pool.query(
        `SELECT id, nome, numero, data_inicio, data_fim FROM periodos_letivos
         WHERE ano_letivo = $1 AND ativo = true
         ORDER BY numero DESC LIMIT 1`,
        [turma.ano_letivo]
      )
      if (periodoResult.rows.length > 0) {
        periodoInfo = periodoResult.rows[0]
      }
    }

    const bimestreLabel = periodoInfo
      ? periodoInfo.nome
      : `Ano Letivo ${turma.ano_letivo}`

    // Buscar disciplinas, alunos, notas e frequência em paralelo
    const [disciplinasResult, alunosResult, notasResult, frequenciaResult] = await Promise.all([
      // Disciplinas ativas
      pool.query(
        `SELECT id, nome, abreviacao FROM disciplinas_escolares
         WHERE ativo = true ORDER BY ordem, nome`
      ),
      // Alunos da turma
      pool.query(
        `SELECT id, nome, codigo FROM alunos
         WHERE turma_id = $1 AND ativo = true
         ORDER BY nome`,
        [turma_id]
      ),
      // Notas do período (ou todas se não especificado)
      periodoInfo
        ? pool.query(
            `SELECT ne.aluno_id, d.abreviacao,
                    ne.nota_final, ne.nota_recuperacao, ne.faltas
             FROM notas_escolares ne
             INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
             WHERE ne.aluno_id IN (SELECT id FROM alunos WHERE turma_id = $1 AND ativo = true)
               AND ne.periodo_id = $2`,
            [turma_id, periodoInfo.id]
          )
        : pool.query(
            `SELECT ne.aluno_id, d.abreviacao,
                    ne.nota_final, ne.nota_recuperacao, ne.faltas
             FROM notas_escolares ne
             INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
             INNER JOIN periodos_letivos p ON ne.periodo_id = p.id
             WHERE ne.aluno_id IN (SELECT id FROM alunos WHERE turma_id = $1 AND ativo = true)
               AND ne.ano_letivo = $2
             ORDER BY p.numero DESC`,
            [turma_id, turma.ano_letivo]
          ),
      // Frequência por aluno.
      //
      // Alinhado com /api/admin/turmas/[id]/diario-completo (paridade com o
      // diario consolidado do admin/gestor):
      // - dias_letivos = contar_dias_letivos(ano_letivo_id, escola_id, dt_ini, dt_fim)
      //   considerando feriados/recessos do calendario.
      // - presencas/faltas: COUNT FILTER por status em frequencia_diaria.
      // - COALESCE com frequencia_bimestral preserva snapshot oficial quando
      //   existir (preferindo o oficial).
      // - Janela: periodo (se informado) > anos_letivos.data_inicio/fim >
      //   fallback Jan-Dez. As datas chegam como $3/$4.
      //
      // Bug anterior: SELECT fb.bimestre, fb.aulas_dadas (colunas que NUNCA
      // existiram em frequencia_bimestral — quebrava com 42703 em tempo de
      // execucao, retornando 500 silencioso). + agregacao via media movel
      // ((perc1+perc2)/2 em loop) que produzia peso exponencial decrescente.
      (() => {
        const dtIni = periodoInfo?.data_inicio ?? null
        const dtFim = periodoInfo?.data_fim ?? null
        return pool.query(
          `WITH escopo AS (
             SELECT t.escola_id, t.ano_letivo,
                    al.id AS ano_letivo_id,
                    COALESCE($3::date, al.data_inicio, (t.ano_letivo || '-01-01')::date) AS dt_ini,
                    COALESCE($4::date, al.data_fim,    (t.ano_letivo || '-12-31')::date) AS dt_fim
               FROM turmas t
               LEFT JOIN anos_letivos al ON al.ano = t.ano_letivo
              WHERE t.id = $1
           ),
           dias AS (
             SELECT CASE
                      WHEN e.ano_letivo_id IS NOT NULL
                        THEN contar_dias_letivos(e.ano_letivo_id, e.escola_id, e.dt_ini, e.dt_fim)
                      ELSE (
                        SELECT COUNT(*)::int
                          FROM generate_series(e.dt_ini, e.dt_fim, '1 day') d
                         WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
                      )
                    END AS dias_letivos,
                    e.dt_ini, e.dt_fim
               FROM escopo e
           )
           SELECT a.id AS aluno_id,
                  (SELECT dias_letivos FROM dias) AS dias_letivos,
                  COALESCE(fb.presencas, COUNT(*) FILTER (WHERE fd.status = 'presente')::int) AS presencas,
                  COALESCE(fb.faltas,    COUNT(*) FILTER (WHERE fd.status = 'ausente')::int) AS faltas,
                  COALESCE(fb.faltas_justificadas,
                           COUNT(*) FILTER (WHERE fd.status = 'justificado')::int) AS faltas_justificadas
             FROM alunos a
             LEFT JOIN frequencia_diaria fd
                    ON fd.aluno_id = a.id
                   AND fd.turma_id = $1
                   AND fd.data BETWEEN (SELECT dt_ini FROM dias) AND (SELECT dt_fim FROM dias)
             LEFT JOIN frequencia_bimestral fb
                    ON fb.aluno_id = a.id
                   AND fb.turma_id = $1
                   AND ($2::uuid IS NULL OR fb.periodo_id = $2)
            WHERE a.turma_id = $1
              AND a.ativo = true
            GROUP BY a.id, fb.presencas, fb.faltas, fb.faltas_justificadas`,
          [turma_id, periodoInfo?.id ?? null, dtIni, dtFim]
        )
      })(),
    ])

    // Montar disciplinas
    const disciplinas = disciplinasResult.rows.map((d: any) => ({
      nome: d.nome,
      abreviacao: d.abreviacao || d.nome.substring(0, 3).toUpperCase(),
    }))

    // Indexar notas por aluno
    const notasMap = new Map<string, Record<string, number | null>>()
    for (const row of notasResult.rows) {
      if (!notasMap.has(row.aluno_id)) {
        notasMap.set(row.aluno_id, {})
      }
      const mapaAluno = notasMap.get(row.aluno_id)!
      // Se já existe (caso sem período específico), manter a mais recente
      if (mapaAluno[row.abreviacao] === undefined) {
        const notaFinal = row.nota_final !== null ? parseFloat(row.nota_final) : null
        const notaRec = row.nota_recuperacao !== null ? parseFloat(row.nota_recuperacao) : null
        // Considerar maior nota (final ou recuperação)
        mapaAluno[row.abreviacao] = notaRec !== null && notaRec > (notaFinal ?? 0)
          ? notaRec
          : notaFinal
      }
    }

    // Indexar frequência por aluno (1 row por aluno — agregado na SQL).
    // Percentual = presencas / dias_letivos * 100 (mesmo do admin/diario).
    const freqMap = new Map<string, { totalFaltas: number; percentual: number | null }>()
    for (const row of frequenciaResult.rows) {
      const diasLetivos = parseInt(row.dias_letivos) || 0
      const presencas = parseInt(row.presencas) || 0
      const faltas = parseInt(row.faltas) || 0
      const percentual = diasLetivos > 0
        ? Math.round((presencas / diasLetivos) * 1000) / 10
        : null
      freqMap.set(row.aluno_id, { totalFaltas: faltas, percentual })
    }

    // Montar lista de alunos com notas e frequência
    const alunos: AlunoTurmaRelatorio[] = alunosResult.rows.map((a: any) => ({
      nome: a.nome,
      codigo: a.codigo || '',
      notas: notasMap.get(a.id) || {},
      total_faltas: freqMap.get(a.id)?.totalFaltas || 0,
      frequencia_percentual: freqMap.get(a.id)?.percentual ?? null,
    }))

    // Dados do relatório
    const dadosRelatorio: DadosRelatorioTurma = {
      escola_nome: turma.escola_nome,
      turma_nome: turma.nome,
      turma_codigo: turma.codigo || '',
      serie: turma.serie,
      professor_nome: professorNome,
      ano_letivo: turma.ano_letivo,
      bimestre: bimestreLabel,
      disciplinas,
      alunos,
      data_geracao: new Date().toLocaleDateString('pt-BR'),
    }

    // Gerar PDF
    const documento = React.createElement(RelatorioTurmaPDF, { dados: dadosRelatorio })
    const pdfBuffer = await renderToBuffer(
      documento as unknown as Parameters<typeof renderToBuffer>[0]
    )

    // Nome do arquivo
    const nomeArquivo = `relatorio_turma_${turma.codigo || turma_id.substring(0, 8)}_${turma.ano_letivo}.pdf`
    const uint8Array = new Uint8Array(pdfBuffer)

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: unknown) {
    log.error('Erro ao gerar relatório da turma', error)
    return NextResponse.json({ mensagem: 'Erro ao gerar relatório' }, { status: 500 })
  }
})
