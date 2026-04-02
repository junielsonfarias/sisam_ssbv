/**
 * Firebase Admin SDK — Envio de Push Notifications (server-side)
 *
 * Requer variável FIREBASE_SERVICE_ACCOUNT_KEY (JSON stringified)
 * Gerar em: Firebase Console > Project Settings > Service Accounts > Generate New Private Key
 */

let adminApp: any = null

async function getAdminApp() {
  if (adminApp) return adminApp

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY nao configurada')
    return null
  }

  try {
    const admin = await import('firebase-admin')
    const credential = JSON.parse(serviceAccountKey)

    if (admin.apps.length === 0) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(credential),
      })
    } else {
      adminApp = admin.app()
    }

    return adminApp
  } catch (error) {
    console.error('[Firebase Admin] Erro ao inicializar:', error)
    return null
  }
}

/** Retorna true se Firebase Admin está configurado */
export function isFirebaseAdminConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
}

/**
 * Envia push notification para um ou mais tokens
 */
export async function enviarPush(
  tokens: string[],
  titulo: string,
  corpo: string,
  dados?: Record<string, string>,
  link?: string,
): Promise<{ sucesso: number; erros: number; tokensInvalidos: string[] }> {
  const app = await getAdminApp()
  if (!app) return { sucesso: 0, erros: 0, tokensInvalidos: [] }

  const admin = await import('firebase-admin')
  const tokensInvalidos: string[] = []
  let sucesso = 0
  let erros = 0

  // Enviar em batches de 500 (limite FCM)
  const BATCH_SIZE = 500
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE)

    try {
      const message = {
        notification: {
          title: titulo,
          body: corpo,
        },
        webpush: {
          fcmOptions: {
            link: link || '/',
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
          },
        },
        data: dados || {},
        tokens: batch,
      }

      const response = await admin.messaging().sendEachForMulticast(message)

      sucesso += response.successCount
      erros += response.failureCount

      // Identificar tokens invalidos para limpeza
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const errorCode = resp.error?.code
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            tokensInvalidos.push(batch[idx])
          }
        }
      })
    } catch (error) {
      console.error('[Firebase Admin] Erro ao enviar batch:', error)
      erros += batch.length
    }
  }

  return { sucesso, erros, tokensInvalidos }
}

/**
 * Envia push para todos os dispositivos de um usuario
 */
export async function enviarPushParaUsuario(
  usuarioId: string,
  titulo: string,
  corpo: string,
  dados?: Record<string, string>,
  link?: string,
): Promise<{ sucesso: number; erros: number }> {
  const pool = (await import('@/database/connection')).default

  const result = await pool.query(
    'SELECT token FROM dispositivos_push WHERE usuario_id = $1 AND ativo = true',
    [usuarioId]
  )

  if (result.rows.length === 0) return { sucesso: 0, erros: 0 }

  const tokens = result.rows.map((r: any) => r.token)
  const { sucesso, erros, tokensInvalidos } = await enviarPush(tokens, titulo, corpo, dados, link)

  // Limpar tokens invalidos
  if (tokensInvalidos.length > 0) {
    await pool.query(
      'UPDATE dispositivos_push SET ativo = false WHERE token = ANY($1)',
      [tokensInvalidos]
    )
  }

  return { sucesso, erros }
}

/**
 * Envia push para todos os responsaveis de um aluno
 */
export async function enviarPushResponsaveisAluno(
  alunoId: string,
  titulo: string,
  corpo: string,
  dados?: Record<string, string>,
  link?: string,
): Promise<{ sucesso: number; erros: number }> {
  const pool = (await import('@/database/connection')).default

  const result = await pool.query(
    `SELECT dp.token FROM dispositivos_push dp
     INNER JOIN responsaveis_alunos ra ON ra.usuario_id = dp.usuario_id
     WHERE ra.aluno_id = $1 AND ra.ativo = true AND dp.ativo = true`,
    [alunoId]
  )

  if (result.rows.length === 0) return { sucesso: 0, erros: 0 }

  const tokens = result.rows.map((r: any) => r.token)
  const { sucesso, erros, tokensInvalidos } = await enviarPush(tokens, titulo, corpo, dados, link)

  if (tokensInvalidos.length > 0) {
    await pool.query(
      'UPDATE dispositivos_push SET ativo = false WHERE token = ANY($1)',
      [tokensInvalidos]
    )
  }

  return { sucesso, erros }
}
