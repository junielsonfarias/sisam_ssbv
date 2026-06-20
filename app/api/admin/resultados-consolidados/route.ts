import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache'
import { parsePaginacao } from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'
import { buscarResultadosConsolidados } from '@/lib/services/resultados-consolidados'

const log = createLogger('ResultadosConsolidados')

export const dynamic = 'force-dynamic';

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  // Limpar caches expirados
  try {
    limparCachesExpirados()
  } catch (error: unknown) {
    // Não crítico
  }

  const { searchParams } = new URL(request.url)
  const escolaId = searchParams.get('escola_id')
  const poloId = searchParams.get('polo_id')
  const anoLetivo = searchParams.get('ano_letivo')
  const avaliacaoId = searchParams.get('avaliacao_id')
  const serie = searchParams.get('serie')
  const presencaParam = searchParams.get('presenca')
  // Filtrar valores vazios, "Todas", "todas" - considerar como sem filtro
  const presenca = presencaParam && presencaParam.trim() !== '' && presencaParam.toLowerCase() !== 'todas' ? presencaParam : null
  const turmaId = searchParams.get('turma_id')
  const tipoEnsino = searchParams.get('tipo_ensino') // anos_iniciais ou anos_finais
  const busca = searchParams.get('busca')?.trim() || null // Busca por nome do aluno ou escola

  // Parâmetros de paginação
  const paginacao = parsePaginacao(searchParams, { limiteMax: 200, limitePadrao: 50 })

  const filtros = {
    escolaId,
    poloId,
    anoLetivo,
    avaliacaoId,
    serie,
    presenca,
    turmaId,
    tipoEnsino,
    busca,
  }

  // Verificar cache (incluir paginação nos filtros para cachear por página)
  const cacheOptions = {
    filtros: {
      ...filtros,
      pagina: paginacao.pagina,
      limite: paginacao.limite,
    },
    tipoUsuario: usuario.tipo_usuario,
    usuarioId: usuario.id,
    poloId: usuario.polo_id || null,
    escolaId: usuario.escola_id || null
  }

  const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'

  // Verificar cache com tratamento de erro para ambientes serverless
  try {
    if (!forcarAtualizacao && verificarCache(cacheOptions)) {
      const dadosCache = carregarCache<any>(cacheOptions)
      if (dadosCache) {
        log.info('Retornando resultados consolidados do cache')
        return NextResponse.json(dadosCache)
      }
    }
  } catch {
    // Ignorar erros de cache em ambientes serverless
    log.info('Cache não disponível, buscando do banco')
  }

  const resultado = await buscarResultadosConsolidados(
    {
      tipo_usuario: usuario.tipo_usuario,
      polo_id: usuario.polo_id || null,
      escola_id: usuario.escola_id || null,
    },
    filtros,
    paginacao
  )

  // Salvar no cache (expira em 1 hora) - paginação já está incluída nos filtros
  try {
    salvarCache(cacheOptions, resultado, 'resultados-consolidados')
  } catch (cacheError) {
    log.error('Erro ao salvar cache (não crítico)', cacheError)
  }

  return NextResponse.json(resultado)
})
