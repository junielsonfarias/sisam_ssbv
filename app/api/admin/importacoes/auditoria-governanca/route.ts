import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { createLogger } from '@/lib/logger'
import { auditarGovernancaGate } from '@/lib/services/importacao/auditoria-governanca'

const log = createLogger('AuditoriaGovernancaRoute')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/importacoes/auditoria-governanca
 *
 * Rede de seguranca CONTINUA do gate ETL -> Gestor. Conta o cadastro mestre
 * (polos/escolas/turmas/alunos) por origem e prova, a qualquer momento, que
 * nenhum modulo externo criou mestre indevido em producao.
 *
 * Levanta `alerta=true` quando:
 *   - existe linha mestre origem='sisam_etl' nao assumida pelo Gestor, OU
 *   - o gate saiu do modo conservador 'estrito' (ETL_GATE_MESTRE='transicao').
 *
 * Pensado para uso sob demanda (painel de governanca) e para ser pingado por um
 * job/cron periodico que alerta o time quando o veredito vira vermelho.
 */
export const GET = withAuth(['administrador', 'tecnico'], async () => {
  try {
    const resultado = await auditarGovernancaGate()
    // 200 sempre: o consumidor decide o alarme pelo campo `alerta`. Manter o
    // status HTTP estavel facilita o ping por um cron sem tratar status != 200.
    return NextResponse.json(resultado)
  } catch (error: unknown) {
    log.error('Erro ao auditar governanca do gate ETL -> Gestor', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
