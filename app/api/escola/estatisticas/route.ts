/**
 * API de Estatísticas - Escola
 *
 * Retorna estatísticas filtradas pela escola do usuário logado.
 * Acesso restrito a usuários do tipo 'escola' com escola_id válido.
 *
 * @route GET /api/escola/estatisticas
 */

import { withAuth } from '@/lib/auth/with-auth'
import { getEstatisticas, getEstatisticasPadrao } from '@/lib/services/estatisticas.service'
import { badRequest, forbidden, ok, okComFallback } from '@/lib/api-utils'
import { estatisticasFiltrosSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth('escola', async (request, usuario) => {
  // withAuth garante o tipo 'escola', mas NÃO valida a presença do escopo.
  if (!usuario.escola_id) {
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
    // O serviço detecta automaticamente que é usuário de escola e aplica os filtros
    const estatisticas = await getEstatisticas(usuario, { serie, anoLetivo, avaliacaoId })

    return ok(estatisticas)
  } catch (error: unknown) {
    console.error('[API Escola Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
})
