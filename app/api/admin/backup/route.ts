import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'
import {
  buscarConfigBackup,
  listarBackups,
  executarBackup,
} from '@/lib/services/backup.service'

const log = createLogger('AdminBackup')

export const dynamic = 'force-dynamic'

// ============================================================================
// SCHEMAS
// ============================================================================

const configBackupSchema = z.object({
  google_drive_folder_id: z.string().default(''),
  manter_ultimos: z.number().int().min(1).max(365).default(30),
  backup_automatico: z.boolean().default(false),
  horario_backup: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve ser HH:MM').default('03:00'),
})

// ============================================================================
// GET — Buscar config + backups recentes
// ============================================================================

/**
 * GET /api/admin/backup
 *
 * Retorna configuração de backup e lista de backups recentes.
 * Acessível por administrador.
 */
export const GET = withAuth(['administrador'], async () => {
  try {
    const [config, backups] = await Promise.all([
      buscarConfigBackup(),
      listarBackups(20),
    ])

    return NextResponse.json({ config, backups })
  } catch (error) {
    log.error('Erro ao buscar backup', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

// ============================================================================
// PUT — Atualizar config de backup
// ============================================================================

/**
 * PUT /api/admin/backup
 *
 * Atualiza configuração de backup.
 * Acessível por administrador.
 */
export const PUT = withAuth(['administrador'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = configBackupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { mensagem: 'Dados inválidos', erros: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO site_config (secao, conteudo, atualizado_por, atualizado_em)
       VALUES ('backup', $1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (secao) DO UPDATE
       SET conteudo = EXCLUDED.conteudo,
           atualizado_por = EXCLUDED.atualizado_por,
           atualizado_em = CURRENT_TIMESTAMP
       RETURNING id, secao, conteudo, atualizado_em`,
      [JSON.stringify(parsed.data), usuario.id]
    )

    await cacheDelPattern('site-config:*')

    log.info('Config backup atualizada', { usuario: usuario.email })

    return NextResponse.json(result.rows[0])
  } catch (error) {
    log.error('Erro ao atualizar config de backup', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

// ============================================================================
// POST — Executar backup manual
// ============================================================================

/**
 * POST /api/admin/backup
 *
 * Executa backup manual dos dados críticos.
 * Acessível por administrador.
 */
export const POST = withAuth(['administrador'], async (_request, usuario) => {
  try {
    log.info('Backup manual iniciado', { usuario: usuario.email })

    const resultado = await executarBackup('manual', usuario.id)

    if (resultado.status === 'erro') {
      return NextResponse.json(
        { mensagem: 'Erro ao executar backup', erro: resultado.erro },
        { status: 500 }
      )
    }

    return NextResponse.json({
      mensagem: 'Backup executado com sucesso',
      ...resultado,
    }, { status: 201 })
  } catch (error) {
    log.error('Erro ao executar backup manual', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
