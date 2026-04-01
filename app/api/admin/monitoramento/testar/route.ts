import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { createLogger } from '@/lib/logger'
import {
  buscarConfigMonitoramento,
  enviarAlerta,
  verificarSaude,
} from '@/lib/services/monitoramento.service'

const log = createLogger('AdminMonitoramentoTestar')

export const dynamic = 'force-dynamic'

// ============================================================================
// POST — Enviar email de teste
// ============================================================================

/**
 * POST /api/admin/monitoramento/testar
 *
 * Envia um email de teste para os emails cadastrados na config.
 * Acessível por administrador.
 */
export const POST = withAuth(['administrador'], async (_request, usuario) => {
  try {
    const config = await buscarConfigMonitoramento()

    if (config.emails_alerta.length === 0) {
      return NextResponse.json(
        { mensagem: 'Nenhum email de alerta configurado' },
        { status: 400 }
      )
    }

    // Obter status atual para incluir no email de teste
    const saude = await verificarSaude()

    const corpo = `
      <p><strong>Este é um email de teste</strong> enviado pelo painel de monitoramento do SISAM.</p>
      <p>Se você recebeu este email, os alertas estão funcionando corretamente.</p>
      <h3>Status atual do sistema:</h3>
      <ul>
        <li>Banco de dados: <strong>${saude.banco.ok ? 'OK' : 'ERRO'}</strong>
          ${saude.banco.latencia_ms ? ` (${saude.banco.latencia_ms}ms)` : ''}</li>
        <li>Redis: <strong>${saude.redis.ok ? 'OK' : 'ERRO'}</strong>
          ${saude.redis.latencia_ms ? ` (${saude.redis.latencia_ms}ms)` : ''}</li>
      </ul>
      <p style="color: #64748b;">Enviado por: ${usuario.nome || usuario.email}</p>
    `

    const resultado = await enviarAlerta(
      'Teste de Alerta',
      corpo,
      config.emails_alerta
    )

    log.info('Email de teste enviado', {
      usuario: usuario.email,
      emails: config.emails_alerta,
      metodo: resultado.metodo,
    })

    return NextResponse.json({
      mensagem: resultado.enviado
        ? 'Email de teste enviado com sucesso'
        : `Email simulado (método: ${resultado.metodo}). Configure RESEND_API_KEY para envio real.`,
      enviado: resultado.enviado,
      metodo: resultado.metodo,
      emails: config.emails_alerta,
    })
  } catch (error) {
    log.error('Erro ao enviar email de teste', error)
    return NextResponse.json({ mensagem: 'Erro ao enviar email de teste' }, { status: 500 })
  }
})
