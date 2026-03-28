import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const preMatriculaSchema = z.object({
  aluno_nome: z.string().min(3, 'Nome do aluno deve ter pelo menos 3 caracteres'),
  aluno_data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  aluno_cpf: z.string().optional().nullable(),
  aluno_genero: z.string().optional().nullable(),
  aluno_pcd: z.boolean().optional().default(false),
  responsavel_nome: z.string().min(3, 'Nome do responsável deve ter pelo menos 3 caracteres'),
  responsavel_cpf: z.string().optional().nullable(),
  responsavel_telefone: z.string().min(8, 'Telefone deve ter pelo menos 8 dígitos'),
  responsavel_email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  parentesco: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  escola_pretendida_id: z.string().uuid('Escola inválida').optional().nullable(),
  serie_pretendida: z.string().min(1, 'Série pretendida é obrigatória'),
  ano_letivo: z.string().min(4, 'Ano letivo é obrigatório'),
})

function gerarProtocolo(): string {
  const now = new Date()
  const data = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `MAT-${data}-${rand}`
}

// Rate limiting simples
const limiter = new Map<string, { count: number; resetAt: number }>()
const MAX_REQ = 10
const WINDOW = 15 * 60 * 1000

function checkRate(ip: string): boolean {
  const now = Date.now()
  const entry = limiter.get(ip)
  if (!entry || now > entry.resetAt) {
    limiter.set(ip, { count: 1, resetAt: now + WINDOW })
    return true
  }
  if (entry.count >= MAX_REQ) return false
  entry.count++
  return true
}

/**
 * POST /api/pre-matricula — Criar pré-matrícula (público)
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRate(ip)) {
    return NextResponse.json({ mensagem: 'Muitas requisições. Tente novamente em alguns minutos.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = preMatriculaSchema.safeParse(body)
    if (!parsed.success) {
      const erros = parsed.error.errors.map(e => e.message)
      return NextResponse.json({ mensagem: erros[0], erros }, { status: 400 })
    }

    const d = parsed.data
    let protocolo = gerarProtocolo()

    // Garantir unicidade do protocolo
    for (let i = 0; i < 5; i++) {
      const exists = await pool.query('SELECT 1 FROM pre_matriculas WHERE protocolo = $1', [protocolo])
      if (exists.rows.length === 0) break
      protocolo = gerarProtocolo()
    }

    const result = await pool.query(
      `INSERT INTO pre_matriculas (
        protocolo, aluno_nome, aluno_data_nascimento, aluno_cpf, aluno_genero, aluno_pcd,
        responsavel_nome, responsavel_cpf, responsavel_telefone, responsavel_email, parentesco,
        endereco, bairro, escola_pretendida_id, serie_pretendida, ano_letivo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id, protocolo, criado_em`,
      [
        protocolo, d.aluno_nome, d.aluno_data_nascimento, d.aluno_cpf || null, d.aluno_genero || null, d.aluno_pcd,
        d.responsavel_nome, d.responsavel_cpf || null, d.responsavel_telefone, d.responsavel_email || null, d.parentesco || null,
        d.endereco || null, d.bairro || null, d.escola_pretendida_id || null, d.serie_pretendida, d.ano_letivo,
      ]
    )

    return NextResponse.json({
      mensagem: 'Pré-matrícula registrada com sucesso!',
      protocolo: result.rows[0].protocolo,
      criado_em: result.rows[0].criado_em,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[PRE-MATRICULA POST]', error.message)
    return NextResponse.json({ mensagem: 'Erro ao registrar pré-matrícula.' }, { status: 500 })
  }
}

/**
 * GET /api/pre-matricula?protocolo=MAT-XXXXXXXX-XXXX — Consultar status (público)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const protocolo = searchParams.get('protocolo')?.trim()

  if (!protocolo) {
    return NextResponse.json({ mensagem: 'Informe o protocolo.' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      `SELECT pm.protocolo, pm.aluno_nome, pm.serie_pretendida, pm.ano_letivo,
              pm.status, pm.motivo_rejeicao, pm.criado_em, pm.analisado_em, pm.atualizado_em,
              e.nome AS escola_nome
       FROM pre_matriculas pm
       LEFT JOIN escolas e ON e.id = pm.escola_pretendida_id
       WHERE pm.protocolo = $1`,
      [protocolo]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Protocolo não encontrado.' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('[PRE-MATRICULA GET]', error.message)
    return NextResponse.json({ mensagem: 'Erro ao consultar.' }, { status: 500 })
  }
}
