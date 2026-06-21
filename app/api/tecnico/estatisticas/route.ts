/**
 * API de Estatísticas - Técnico
 *
 * Retorna estatísticas globais do sistema (mesma lógica do admin).
 * Acesso restrito a usuários do tipo 'tecnico'.
 *
 * @route GET /api/tecnico/estatisticas
 * @query serie - Filtrar por série específica (ex: "2º Ano", "8º Ano")
 */

import { withAuth } from '@/lib/auth/with-auth'
import { getEstatisticas, getEstatisticasPadrao } from '@/lib/services/estatisticas.service'
import { badRequest, ok, okComFallback } from '@/lib/api-utils'
import { estatisticasFiltrosSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth('tecnico', async (request, usuario) => {
  try {
    // Extrair e validar filtros da query string
    const { searchParams } = new URL(request.url)
    const parsed = estatisticasFiltrosSchema.safeParse({
      serie: searchParams.get('serie') ?? undefined,
      ano_letivo: searchParams.get('ano_letivo') ?? undefined,
      avaliacao_id: searchParams.get('avaliacao_id') ?? undefined,
    })

    if (!parsed.success) {
      return badRequest('Filtros inválidos', { codigo: 'ERRO_VALIDACAO' })
    }

    const { serie, ano_letivo: anoLetivo, avaliacao_id: avaliacaoId } = parsed.data

    // Buscar estatísticas usando o serviço centralizado
    const estatisticas = await getEstatisticas(usuario, { serie, anoLetivo, avaliacaoId })

    return ok(estatisticas)
  } catch (error: unknown) {
    console.error('[API Tecnico Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
})
