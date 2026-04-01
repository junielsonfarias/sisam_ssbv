/**
 * API Route para geração de boletim individual em PDF
 * GET /api/boletim/pdf?codigo=X ou ?cpf=X&data_nascimento=Y
 *
 * Endpoint público (mesmo esquema de autenticação do boletim web).
 * Gera PDF com notas por bimestre, frequência e situação do aluno.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import pool from '@/database/connection'
import { z } from 'zod'
import React from 'react'
import { BoletimPDF } from '@/lib/relatorios/boletim-pdf'
import type { DadosBoletimPDF, DisciplinaBoletim, NotaBimestre, FrequenciaBimestre } from '@/lib/relatorios/boletim-pdf'
import { createLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const log = createLogger('BoletimPDF')

// ============================================================================
// RATE LIMITING (mesmo padrão do boletim web — 5 req/15min por IP)
// ============================================================================

const rateLimiter = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS = 5
const WINDOW_MS = 15 * 60 * 1000

function checkRate(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_REQUESTS) return false
  entry.count++
  return true
}

// Cleanup a cada 10 minutos
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimiter) {
    if (now > entry.resetAt) rateLimiter.delete(ip)
  }
}, 10 * 60 * 1000)

// ============================================================================
// VALIDAÇÃO
// ============================================================================

const queryPorCodigo = z.object({
  codigo: z.string().min(1),
  ano_letivo: z.string().regex(/^\d{4}$/).optional(),
})

const queryPorCpf = z.object({
  cpf: z.string().transform(v => v.replace(/\D/g, '')).pipe(z.string().length(11)),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ano_letivo: z.string().regex(/^\d{4}$/).optional(),
})

// Mensagem genérica anti-enumeração
const MSG_NAO_ENCONTRADO = 'Dados não encontrados'

// ============================================================================
// GET /api/boletim/pdf
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRate(ip)) {
      return NextResponse.json(
        { mensagem: 'Muitas consultas. Tente novamente em alguns minutos.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo')?.trim()
    const cpfRaw = searchParams.get('cpf')?.trim()
    const dataNascimento = searchParams.get('data_nascimento')?.trim()
    const anoLetivoParam = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    // Validar params
    let alunoQuery: string
    let alunoParams: any[]

    if (codigo) {
      const validacao = queryPorCodigo.safeParse({ codigo, ano_letivo: anoLetivoParam })
      if (!validacao.success) {
        return NextResponse.json({ mensagem: MSG_NAO_ENCONTRADO }, { status: 404 })
      }
      alunoQuery = `
        SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao, a.pcd,
               a.data_nascimento, a.turma_id, a.escola_id,
               e.nome as escola_nome,
               t.codigo as turma_codigo, t.nome as turma_nome
        FROM alunos a
        INNER JOIN escolas e ON a.escola_id = e.id
        LEFT JOIN turmas t ON a.turma_id = t.id
        WHERE a.codigo = $1 AND a.ativo = true AND a.ano_letivo = $2`
      alunoParams = [codigo, anoLetivoParam]
    } else if (cpfRaw && dataNascimento) {
      const validacao = queryPorCpf.safeParse({ cpf: cpfRaw, data_nascimento: dataNascimento, ano_letivo: anoLetivoParam })
      if (!validacao.success) {
        return NextResponse.json({ mensagem: MSG_NAO_ENCONTRADO }, { status: 404 })
      }
      const cpf = validacao.data.cpf
      alunoQuery = `
        SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao, a.pcd,
               a.data_nascimento, a.turma_id, a.escola_id,
               e.nome as escola_nome,
               t.codigo as turma_codigo, t.nome as turma_nome
        FROM alunos a
        INNER JOIN escolas e ON a.escola_id = e.id
        LEFT JOIN turmas t ON a.turma_id = t.id
        WHERE a.cpf = $1 AND a.data_nascimento = $2 AND a.ativo = true AND a.ano_letivo = $3`
      alunoParams = [cpf, dataNascimento, anoLetivoParam]
    } else {
      return NextResponse.json({ mensagem: MSG_NAO_ENCONTRADO }, { status: 404 })
    }

    // Buscar aluno
    const alunoResult = await pool.query(alunoQuery, alunoParams)
    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: MSG_NAO_ENCONTRADO }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Helper para queries tolerantes a falha
    const safeQuery = async (sql: string, params: any[] = [], label = '') => {
      try {
        return await pool.query(sql, params)
      } catch (err: unknown) {
        log.error(`Erro em ${label}: ${(err as Error)?.message}`, err)
        return { rows: [] }
      }
    }

    // Buscar dados em paralelo
    const [periodosResult, notasResult, frequenciaResult] = await Promise.all([
      safeQuery(
        `SELECT id, nome, numero FROM periodos_letivos
         WHERE ano_letivo = $1 AND ativo = true ORDER BY numero`,
        [aluno.ano_letivo], 'periodos'
      ),
      safeQuery(
        `SELECT ne.nota_final, ne.nota_recuperacao, ne.faltas,
                ne.disciplina_id, d.nome as disciplina_nome, d.abreviacao,
                p.numero as periodo_numero
         FROM notas_escolares ne
         INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
         INNER JOIN periodos_letivos p ON ne.periodo_id = p.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY d.ordem, d.nome, p.numero`,
        [aluno.id, aluno.ano_letivo], 'notas'
      ),
      safeQuery(
        `SELECT bimestre, aulas_dadas, faltas, percentual_frequencia
         FROM frequencia_bimestral
         WHERE aluno_id = $1 AND ano_letivo = $2
         ORDER BY bimestre`,
        [aluno.id, aluno.ano_letivo], 'frequencia'
      ),
    ])

    // Períodos
    const periodos = periodosResult.rows.map((p: any) => ({
      numero: parseInt(p.numero),
      nome: p.nome,
    }))

    // Montar disciplinas com notas por bimestre
    const discMap = new Map<string, DisciplinaBoletim>()
    for (const row of notasResult.rows) {
      const key = row.disciplina_id
      if (!discMap.has(key)) {
        discMap.set(key, {
          nome: row.disciplina_nome,
          abreviacao: row.abreviacao || row.disciplina_nome.substring(0, 3).toUpperCase(),
          notas: {},
          media_final: null,
        })
      }
      const disc = discMap.get(key)!
      const periodoNum = parseInt(row.periodo_numero)
      const notaBim: NotaBimestre = {
        nota_final: row.nota_final !== null ? parseFloat(row.nota_final) : null,
        nota_recuperacao: row.nota_recuperacao !== null ? parseFloat(row.nota_recuperacao) : null,
        faltas: parseInt(row.faltas) || 0,
      }
      disc.notas[periodoNum] = notaBim
    }

    // Calcular média final de cada disciplina
    for (const disc of discMap.values()) {
      const valores = Object.values(disc.notas)
        .map(n => {
          const rec = n.nota_recuperacao
          const fin = n.nota_final
          return rec !== null && rec > (fin ?? 0) ? rec : fin
        })
        .filter((v): v is number => v !== null)
      disc.media_final = valores.length > 0
        ? valores.reduce((s, v) => s + v, 0) / valores.length
        : null
    }

    const disciplinas = Array.from(discMap.values())

    // Frequência
    const frequencia: FrequenciaBimestre[] = frequenciaResult.rows.map((f: any) => ({
      bimestre: parseInt(f.bimestre),
      aulas_dadas: parseInt(f.aulas_dadas) || 0,
      faltas: parseInt(f.faltas) || 0,
      percentual: f.percentual_frequencia !== null ? parseFloat(f.percentual_frequencia) : null,
    }))

    const freqComValor = frequencia.filter(f => f.percentual !== null)
    const frequenciaGeral = freqComValor.length > 0
      ? freqComValor.reduce((s, f) => s + (f.percentual ?? 0), 0) / freqComValor.length
      : null
    const totalFaltas = frequencia.reduce((s, f) => s + f.faltas, 0)

    // Montar dados do PDF
    const dadosPDF: DadosBoletimPDF = {
      aluno: {
        nome: aluno.nome,
        codigo: aluno.codigo || '',
        serie: aluno.serie,
        turma_nome: aluno.turma_nome || '',
        turma_codigo: aluno.turma_codigo || '',
        escola_nome: aluno.escola_nome,
        ano_letivo: aluno.ano_letivo,
        situacao: aluno.situacao || 'cursando',
        pcd: aluno.pcd || false,
        data_nascimento: aluno.data_nascimento,
      },
      disciplinas,
      periodos,
      frequencia,
      frequencia_geral: frequenciaGeral,
      total_faltas: totalFaltas,
      data_geracao: new Date().toLocaleDateString('pt-BR'),
    }

    // Gerar PDF
    const documento = React.createElement(BoletimPDF, { dados: dadosPDF })
    const pdfBuffer = await renderToBuffer(
      documento as unknown as Parameters<typeof renderToBuffer>[0]
    )

    // Nome do arquivo
    const codigoAluno = aluno.codigo || aluno.id.substring(0, 8)
    const nomeArquivo = `boletim_${codigoAluno}_${aluno.ano_letivo}.pdf`
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
    log.error('Erro ao gerar boletim PDF', error)
    return NextResponse.json({ mensagem: 'Erro ao gerar boletim' }, { status: 500 })
  }
}
