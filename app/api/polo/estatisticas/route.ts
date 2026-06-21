/**
 * API de Estatísticas - Polo
 *
 * Retorna estatísticas filtradas pelo polo do usuário logado.
 * Acesso restrito a usuários do tipo 'polo' com polo_id válido.
 *
 * @route GET /api/polo/estatisticas
 */

import { withAuth } from '@/lib/auth/with-auth'
import { getEstatisticas, getEstatisticasPadrao } from '@/lib/services/estatisticas.service'
import { badRequest, forbidden, ok, okComFallback } from '@/lib/api-utils'
import { estatisticasFiltrosSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth('polo', async (request, usuario) => {
  // withAuth garante o tipo 'polo', mas NÃO valida a presença do escopo.
  if (!usuario.polo_id) {
    return forbidden()
  }

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
    // O serviço detecta automaticamente que é usuário de polo e aplica os filtros
    const estatisticas = await getEstatisticas(usuario, { serie, anoLetivo, avaliacaoId })

    return ok(estatisticas)
  } catch (error: unknown) {
    console.error('[API Polo Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
})
