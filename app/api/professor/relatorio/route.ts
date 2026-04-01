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

    // Determinar período (se não informado, buscar o mais recente)
    let periodoInfo: { id: string; nome: string; numero: number } | null = null

    if (periodo_id) {
      const periodoResult = await pool.query(
        `SELECT id, nome, numero FROM periodos_letivos WHERE id = $1`,
        [periodo_id]
      )
      if (periodoResult.rows.length > 0) {
        periodoInfo = periodoResult.rows[0]
      }
    } else {
      // Buscar período mais recente do ano letivo
      const periodoResult = await pool.query(
        `SELECT id, nome, numero FROM periodos_letivos
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
      // Frequência bimestral
      pool.query(
        `SELECT fb.aluno_id, fb.bimestre, fb.aulas_dadas, fb.faltas, fb.percentual_frequencia
         FROM frequencia_bimestral fb
         WHERE fb.aluno_id IN (SELECT id FROM alunos WHERE turma_id = $1 AND ativo = true)
           AND fb.ano_letivo = $2`,
        [turma_id, turma.ano_letivo]
      ),
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

    // Indexar frequência por aluno (soma total)
    const freqMap = new Map<string, { totalFaltas: number; percentual: number | null }>()
    for (const row of frequenciaResult.rows) {
      const atual = freqMap.get(row.aluno_id) || { totalFaltas: 0, percentual: null }
      atual.totalFaltas += parseInt(row.faltas) || 0
      // Média das frequências
      const perc = row.percentual_frequencia !== null ? parseFloat(row.percentual_frequencia) : null
      if (perc !== null) {
        if (atual.percentual === null) {
          atual.percentual = perc
        } else {
          // Média simples das frequências bimestrais
          atual.percentual = (atual.percentual + perc) / 2
        }
      }
      freqMap.set(row.aluno_id, atual)
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
