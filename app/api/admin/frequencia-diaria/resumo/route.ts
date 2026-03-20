import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { FACIAL } from '@/lib/constants'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frequencia-diaria/resumo
 * Resumo de frequência diária: presentes hoje, métodos, dispositivos online
 * Params: escola_id, data (default: hoje)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]
    let escolaId = searchParams.get('escola_id')

    // Controle de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      escolaId = usuario.escola_id
    }

    // Total de presentes no dia (exclui registros com status='ausente')
    let presencaQuery = `
      SELECT
        COUNT(*) AS total_presentes,
        COUNT(CASE WHEN metodo = 'facial' THEN 1 END) AS presentes_facial,
        COUNT(CASE WHEN metodo = 'manual' THEN 1 END) AS presentes_manual,
        COUNT(CASE WHEN metodo = 'qrcode' THEN 1 END) AS presentes_qrcode
      FROM frequencia_diaria
      WHERE data = $1 AND status = 'presente'
    `
    const presencaParams: string[] = [data]

    if (escolaId) {
      presencaQuery += ` AND escola_id = $2`
      presencaParams.push(escolaId)
    }

    // Total de alunos ativos (para calcular taxa de ausência)
    let alunosQuery = `
      SELECT COUNT(*) AS total_alunos
      FROM alunos
      WHERE ativo = true AND situacao = 'cursando'
    `
    const alunosParams: string[] = []

    if (escolaId) {
      alunosQuery += ` AND escola_id = $1`
      alunosParams.push(escolaId)
    }

    // Dispositivos online
    const timeoutMinutos = FACIAL.PING_TIMEOUT_MINUTOS
    let dispositivosQuery = `
      SELECT
        COUNT(*) AS total_dispositivos,
        COUNT(CASE WHEN ultimo_ping > NOW() - INTERVAL '${timeoutMinutos} minutes' THEN 1 END) AS online,
        COUNT(CASE WHEN status = 'ativo' AND (ultimo_ping IS NULL OR ultimo_ping <= NOW() - INTERVAL '${timeoutMinutos} minutes') THEN 1 END) AS offline
      FROM dispositivos_faciais
      WHERE status != 'bloqueado'
    `
    const dispositivosParams: string[] = []

    if (escolaId) {
      dispositivosQuery += ` AND escola_id = $1`
      dispositivosParams.push(escolaId)
    }

    const safeQuery = async (sql: string, params: any[] = []) => {
      try { return await pool.query(sql, params) }
      catch (err: any) { console.error('[Freq Resumo] Query falhou:', err?.message); return { rows: [] } }
    }

    const [presencaResult, alunosResult, dispositivosResult] = await Promise.all([
      safeQuery(presencaQuery, presencaParams),
      safeQuery(alunosQuery, alunosParams),
      safeQuery(dispositivosQuery, dispositivosParams),
    ])

    const presenca = presencaResult.rows[0]
    const totalAlunos = parseInt(alunosResult.rows[0]?.total_alunos || '0', 10)
    const totalPresentes = parseInt(presenca?.total_presentes || '0', 10)
    const ausentes = totalAlunos - totalPresentes
    const taxaPresenca = totalAlunos > 0 ? Math.round((totalPresentes / totalAlunos) * 10000) / 100 : 0

    return NextResponse.json({
      data,
      presenca: {
        total_presentes: totalPresentes,
        total_ausentes: ausentes,
        taxa_presenca: taxaPresenca,
        por_metodo: {
          facial: parseInt(presenca?.presentes_facial || '0', 10),
          manual: parseInt(presenca?.presentes_manual || '0', 10),
          qrcode: parseInt(presenca?.presentes_qrcode || '0', 10),
        },
      },
      alunos: {
        total: totalAlunos,
      },
      dispositivos: {
        total: parseInt(dispositivosResult.rows[0]?.total_dispositivos || '0', 10),
        online: parseInt(dispositivosResult.rows[0]?.online || '0', 10),
        offline: parseInt(dispositivosResult.rows[0]?.offline || '0', 10),
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar resumo de frequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
