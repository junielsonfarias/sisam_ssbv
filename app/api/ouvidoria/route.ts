import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('Ouvidoria')

export const dynamic = 'force-dynamic'

const ouvidoriaSchema = z.object({
  tipo: z.enum(['denuncia', 'sugestao', 'elogio', 'reclamacao', 'informacao']),
  nome: z.string().max(255).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  telefone: z.string().max(20).nullable().optional(),
  escola_id: z.string().uuid().nullable().optional(),
  assunto: z.string().min(1, 'Assunto é obrigatório').max(255),
  mensagem: z.string().min(1, 'Mensagem é obrigatória').max(5000),
})

function gerarProtocolo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `OUV-${y}${m}${d}-${rand}`
}

// Rate limiting simples por IP (rota pública gravável — evita flood/spam)
const limiter = new Map<string, { count: number; resetAt: number }>()
const MAX_REQ = 5
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
 * GET /api/ouvidoria?protocolo=OUV-XXXXXXXX-XXXX
 * Consulta pública de protocolo
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const protocolo = searchParams.get('protocolo')

    if (!protocolo) {
      return NextResponse.json({ mensagem: 'Protocolo é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT protocolo, tipo, assunto, status, resposta, respondido_em, criado_em
       FROM ouvidoria WHERE protocolo = $1`,
      [protocolo.trim().toUpperCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Protocolo não encontrado' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    log.error('Erro ao consultar ouvidoria', error)
    return NextResponse.json({ mensagem: 'Erro ao consultar protocolo' }, { status: 500 })
  }
}

/**
 * POST /api/ouvidoria
 * Criar nova manifestação
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRate(ip)) {
    return NextResponse.json({ mensagem: 'Muitas requisições. Tente novamente em alguns minutos.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = ouvidoriaSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }

    const { tipo, nome, email, telefone, escola_id, assunto, mensagem } = parsed.data
    const protocolo = gerarProtocolo()

    await pool.query(
      `INSERT INTO ouvidoria (protocolo, tipo, nome, email, telefone, escola_id, assunto, mensagem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [protocolo, tipo, nome || null, email || null, telefone || null, escola_id || null, assunto, mensagem]
    )

    return NextResponse.json({ protocolo, mensagem: 'Manifestação registrada com sucesso' }, { status: 201 })
  } catch (error) {
    log.error('Erro ao criar manifestação', error)
    return NextResponse.json({ mensagem: 'Erro ao registrar manifestação' }, { status: 500 })
  }
}
