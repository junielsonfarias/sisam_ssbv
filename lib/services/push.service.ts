/**
 * Service de Push Notifications — integra com fluxos do SISAM
 *
 * Funções de alto nível que enviam push nos momentos certos.
 * Cada função é fire-and-forget (não bloqueia o fluxo principal).
 */

import { enviarPushParaUsuario, enviarPushResponsaveisAluno, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

// ============================================================================
// NOTAS
// ============================================================================

/**
 * Notifica responsáveis quando notas são lançadas para um aluno
 */
export async function notificarNotaLancada(
  alunoId: string,
  alunoNome: string,
  disciplina: string,
  periodo: string,
): Promise<void> {
  if (!isFirebaseAdminConfigured()) return

  try {
    await enviarPushResponsaveisAluno(
      alunoId,
      `Nova nota: ${disciplina}`,
      `${alunoNome} recebeu nota em ${disciplina} (${periodo})`,
      { tipo: 'nova_nota', aluno_id: alunoId },
      `/responsavel/filho?id=${alunoId}`,
    )
  } catch (error) {
    console.error('[Push] Erro ao notificar nota:', error)
  }
}

// ============================================================================
// FREQUÊNCIA
// ============================================================================

/**
 * Notifica responsáveis quando aluno tem falta registrada
 */
export async function notificarFaltaRegistrada(
  alunoId: string,
  alunoNome: string,
  data: string,
): Promise<void> {
  if (!isFirebaseAdminConfigured()) return

  try {
    await enviarPushResponsaveisAluno(
      alunoId,
      'Falta registrada',
      `${alunoNome} teve falta registrada em ${data}`,
      { tipo: 'falta_registrada', aluno_id: alunoId },
      `/responsavel/filho?id=${alunoId}&aba=frequencia`,
    )
  } catch (error) {
    console.error('[Push] Erro ao notificar falta:', error)
  }
}

// ============================================================================
// MENSAGENS (CHAT)
// ============================================================================

/**
 * Notifica responsável quando professor envia mensagem
 */
export async function notificarNovaMensagemParaResponsavel(
  responsavelId: string,
  professorNome: string,
  alunoNome: string,
  threadId: string,
): Promise<void> {
  if (!isFirebaseAdminConfigured()) return

  try {
    await enviarPushParaUsuario(
      responsavelId,
      `Mensagem de Prof. ${professorNome}`,
      `Sobre ${alunoNome}`,
      { tipo: 'nova_mensagem', thread_id: threadId },
      `/responsavel/mensagens?thread_id=${threadId}`,
    )
  } catch (error) {
    console.error('[Push] Erro ao notificar mensagem para responsavel:', error)
  }
}

/**
 * Notifica professor quando responsável responde
 */
export async function notificarNovaMensagemParaProfessor(
  professorId: string,
  responsavelNome: string,
  alunoNome: string,
  threadId: string,
): Promise<void> {
  if (!isFirebaseAdminConfigured()) return

  try {
    await enviarPushParaUsuario(
      professorId,
      `Resposta de ${responsavelNome}`,
      `Sobre ${alunoNome}`,
      { tipo: 'nova_mensagem', thread_id: threadId },
      `/professor/mensagens?thread_id=${threadId}`,
    )
  } catch (error) {
    console.error('[Push] Erro ao notificar mensagem para professor:', error)
  }
}

// ============================================================================
// COMUNICADOS
// ============================================================================

/**
 * Notifica responsáveis quando professor publica comunicado na turma
 */
export async function notificarComunicadoTurma(
  turmaId: string,
  titulo: string,
  professorNome: string,
): Promise<void> {
  if (!isFirebaseAdminConfigured()) return

  try {
    const pool = (await import('@/database/connection')).default

    // Buscar todos os responsáveis de alunos da turma
    const result = await pool.query(
      `SELECT DISTINCT dp.token FROM dispositivos_push dp
       INNER JOIN responsaveis_alunos ra ON ra.usuario_id = dp.usuario_id
       INNER JOIN alunos a ON ra.aluno_id = a.id
       WHERE a.turma_id = $1 AND a.ativo = true AND ra.ativo = true AND dp.ativo = true`,
      [turmaId]
    )

    if (result.rows.length === 0) return

    const { enviarPush } = await import('@/lib/firebase/admin')
    const tokens = result.rows.map((r: any) => r.token)

    await enviarPush(
      tokens,
      `Comunicado: ${titulo}`,
      `Prof. ${professorNome} publicou um comunicado`,
      { tipo: 'novo_comunicado', turma_id: turmaId },
      '/responsavel/comunicados',
    )
  } catch (error) {
    console.error('[Push] Erro ao notificar comunicado:', error)
  }
}
