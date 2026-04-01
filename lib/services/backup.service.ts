import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { createGzip } from 'zlib'
import { Readable } from 'stream'

const log = createLogger('Backup')

// ============================================================================
// TIPOS
// ============================================================================

export interface BackupResult {
  id: string
  status: 'sucesso' | 'erro'
  tamanho_bytes: number
  tabelas_exportadas: number
  registros_exportados: number
  google_drive_file_id?: string
  erro?: string
  duracao_ms: number
}

export interface ConfigBackup {
  google_drive_folder_id: string
  manter_ultimos: number
  backup_automatico: boolean
  horario_backup: string
}

export interface LogBackup {
  id: string
  tipo: string
  status: string
  tamanho_bytes: number | null
  tabelas_exportadas: number | null
  registros_exportados: number | null
  google_drive_file_id: string | null
  erro: string | null
  iniciado_em: string
  finalizado_em: string | null
  executado_por: string | null
}

/** Tabelas críticas para backup (ordem de dependência) */
const TABELAS_BACKUP = [
  'usuarios',
  'polos',
  'escolas',
  'series_escolares',
  'turmas',
  'alunos',
  'matriculas',
  'notas_escolares',
  'frequencia_diaria',
  'resultados_consolidados',
  'avaliacoes',
  'site_config',
] as const

// ============================================================================
// BUSCAR CONFIGURAÇÃO
// ============================================================================

/**
 * Busca configuração de backup da tabela site_config.
 * Usado por: /api/admin/backup, /api/cron/backup
 */
export async function buscarConfigBackup(): Promise<ConfigBackup> {
  try {
    const result = await pool.query(
      "SELECT conteudo FROM site_config WHERE secao = 'backup'"
    )
    const conteudo = result.rows[0]?.conteudo
    return {
      google_drive_folder_id: conteudo?.google_drive_folder_id || '',
      manter_ultimos: conteudo?.manter_ultimos || 30,
      backup_automatico: conteudo?.backup_automatico || false,
      horario_backup: conteudo?.horario_backup || '03:00',
    }
  } catch {
    return {
      google_drive_folder_id: '',
      manter_ultimos: 30,
      backup_automatico: false,
      horario_backup: '03:00',
    }
  }
}

// ============================================================================
// EXECUTAR BACKUP
// ============================================================================

/**
 * Exporta dados críticos como JSON compactado.
 * Na Vercel não há pg_dump, então exportamos via queries SELECT.
 * Usado por: /api/admin/backup (POST), /api/cron/backup
 */
export async function executarBackup(
  tipo: 'manual' | 'automatico' = 'manual',
  executadoPor?: string
): Promise<BackupResult> {
  const inicio = Date.now()

  // Registrar início do backup
  const logResult = await pool.query(
    `INSERT INTO logs_backup (tipo, status, executado_por)
     VALUES ($1, 'executando', $2)
     RETURNING id`,
    [tipo, executadoPor || null]
  )
  const backupId = logResult.rows[0].id

  try {
    const dados: Record<string, unknown[]> = {}
    let totalRegistros = 0

    // Exportar cada tabela
    for (const tabela of TABELAS_BACKUP) {
      try {
        const result = await pool.query(
          `SELECT * FROM ${tabela} LIMIT 100000`
        )
        dados[tabela] = result.rows
        totalRegistros += result.rows.length
      } catch {
        // Tabela pode não existir — pular
        log.warn(`Tabela ${tabela} não encontrada, pulando`)
      }
    }

    // Comprimir com gzip
    const jsonString = JSON.stringify({
      versao: '1.0',
      sistema: 'SISAM',
      data_backup: new Date().toISOString(),
      tabelas: Object.keys(dados),
      dados,
    })

    const comprimido = await comprimirGzip(Buffer.from(jsonString, 'utf-8'))
    const tamanhoBytes = comprimido.length

    // Tentar upload Google Drive
    let googleDriveFileId: string | undefined
    const config = await buscarConfigBackup()

    if (config.google_drive_folder_id && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        googleDriveFileId = await uploadGoogleDrive(
          comprimido,
          `sisam-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`,
          config.google_drive_folder_id
        )
      } catch (error) {
        log.error('Erro ao fazer upload para Google Drive', error)
      }
    }

    // Atualizar log
    await pool.query(
      `UPDATE logs_backup
       SET status = 'sucesso',
           tamanho_bytes = $1,
           tabelas_exportadas = $2,
           registros_exportados = $3,
           google_drive_file_id = $4,
           finalizado_em = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [tamanhoBytes, Object.keys(dados).length, totalRegistros, googleDriveFileId || null, backupId]
    )

    // Limpar backups antigos
    await limparBackupsAntigos(config.manter_ultimos)

    const resultado: BackupResult = {
      id: backupId,
      status: 'sucesso',
      tamanho_bytes: tamanhoBytes,
      tabelas_exportadas: Object.keys(dados).length,
      registros_exportados: totalRegistros,
      google_drive_file_id: googleDriveFileId,
      duracao_ms: Date.now() - inicio,
    }

    log.info('Backup concluído', { details: JSON.stringify(resultado) })
    return resultado
  } catch (error) {
    const erro = (error as Error).message

    await pool.query(
      `UPDATE logs_backup
       SET status = 'erro', erro = $1, finalizado_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [erro, backupId]
    )

    log.error('Erro ao executar backup', error)
    return {
      id: backupId,
      status: 'erro',
      tamanho_bytes: 0,
      tabelas_exportadas: 0,
      registros_exportados: 0,
      erro,
      duracao_ms: Date.now() - inicio,
    }
  }
}

// ============================================================================
// LISTAR BACKUPS
// ============================================================================

/**
 * Lista backups recentes.
 * Usado por: /api/admin/backup (GET)
 */
export async function listarBackups(limite: number = 20): Promise<LogBackup[]> {
  try {
    const result = await pool.query(
      `SELECT lb.*, u.nome AS executado_por_nome
       FROM logs_backup lb
       LEFT JOIN usuarios u ON u.id = lb.executado_por
       ORDER BY lb.iniciado_em DESC
       LIMIT $1`,
      [limite]
    )
    return result.rows
  } catch {
    return []
  }
}

// ============================================================================
// GOOGLE DRIVE
// ============================================================================

/**
 * Faz upload de arquivo para Google Drive via API REST.
 * Usa Service Account (GOOGLE_SERVICE_ACCOUNT_KEY em base64).
 * Usado por: executarBackup
 */
export async function uploadGoogleDrive(
  dados: Buffer,
  nomeArquivo: string,
  folderId: string
): Promise<string> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada')
  }

  // Decodificar Service Account JSON
  const saJson = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'))

  // Gerar JWT para autenticação
  const token = await gerarTokenGoogleDrive(saJson)

  // Upload multipart
  const boundary = '-----sisam-backup-boundary'
  const metadata = JSON.stringify({
    name: nomeArquivo,
    parents: [folderId],
    mimeType: 'application/gzip',
  })

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/gzip\r\n\r\n`),
    dados,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Drive upload falhou: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  log.info('Upload Google Drive concluído', { fileId: result.id, nome: nomeArquivo })
  return result.id
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

async function gerarTokenGoogleDrive(
  saJson: { client_email: string; private_key: string }
): Promise<string> {
  const { SignJWT } = await import('jose')
  const privateKey = await import('crypto').then(crypto =>
    crypto.createPrivateKey(saJson.private_key)
  )

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/drive.file',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(saJson.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await response.json()
  return data.access_token
}

function comprimirGzip(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const gzip = createGzip()
    const stream = Readable.from(buffer)

    stream.pipe(gzip)
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject)
  })
}

async function limparBackupsAntigos(manter: number): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM logs_backup
       WHERE id NOT IN (
         SELECT id FROM logs_backup
         ORDER BY iniciado_em DESC
         LIMIT $1
       )`,
      [manter]
    )
  } catch (error) {
    log.warn('Erro ao limpar backups antigos', { details: String(error) })
  }
}
