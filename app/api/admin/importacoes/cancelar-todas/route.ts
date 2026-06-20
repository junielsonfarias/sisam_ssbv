import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const log = createLogger('ImportacoesCancelarTodas')

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Cancelar importações em processamento ou pausadas.
    // Não-admin (ex.: técnico) só pode cancelar as próprias importações.
    const isAdmin = usuario.tipo_usuario === 'administrador'
    const params: any[] = []
    let filtroUsuario = ''
    if (!isAdmin) {
      params.push(usuario.id)
      filtroUsuario = ` AND usuario_id = $${params.length}`
    }

    const result = await pool.query(
      `UPDATE importacoes
       SET status = 'cancelado',
           concluido_em = CURRENT_TIMESTAMP
       WHERE status IN ('processando', 'pausado')${filtroUsuario}
       RETURNING id, nome_arquivo, status`,
      params
    )

    // Registrar auditoria do cancelamento
    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'cancelar',
      entidade: 'importacao',
      detalhes: {
        total_canceladas: result.rows.length,
        ids: result.rows.map((r: any) => r.id),
      },
    })

    return NextResponse.json({
      mensagem: `${result.rows.length} importação(ões) cancelada(s) com sucesso`,
      canceladas: result.rows.length,
      importacoes: result.rows,
    })
  } catch (error: unknown) {
    log.error('Erro ao cancelar importações', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

