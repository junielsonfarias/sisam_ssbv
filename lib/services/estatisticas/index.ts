/**
 * Serviço centralizado de estatísticas
 *
 * Este serviço unifica a lógica de busca de estatísticas para todos os tipos de usuários:
 * - Administrador/Técnico: Acesso global a todos os dados
 * - Polo: Acesso filtrado pelo polo_id do usuário
 * - Escola: Acesso filtrado pela escola_id do usuário
 *
 * @module services/estatisticas
 */

import type { Usuario } from '@/lib/types'
import type { FiltrosEstatisticas, EstatisticasGerais } from './types'
import { executarQuerySegura, determinarEscopo, getEstatisticasPadrao } from './formatters'
import {
  buscarNomePolo,
  buscarNomeEscolaPolo,
  buscarContadoresGlobais,
  buscarTotalEscolas,
  buscarTotalTurmas,
  buscarTotalAlunos,
  buscarTotalResultados,
  buscarTotalAcertos,
  buscarPresenca,
  buscarMediaEAprovacao,
  buscarMediasPorTipoEnsino,
  buscarMediasPorDisciplina,
  buscarSeriesDisponiveis
} from './queries'

// Re-exportar tipos e funções públicas
export type { EscopoEstatisticas, FiltrosEstatisticas, EstatisticasGerais, QueryResult } from './types'
export { determinarEscopo, montarFiltroEscopo, getEstatisticasPadrao } from './formatters'

// ============================================================================
// FUNÇÃO PRINCIPAL DO SERVIÇO
// ============================================================================

/**
 * Busca estatísticas gerais baseado no usuário e filtros
 *
 * Esta função centraliza toda a lógica de busca de estatísticas,
 * aplicando automaticamente os filtros baseados no tipo de usuário.
 *
 * @param usuario - Usuário autenticado
 * @param filtrosAdicionais - Filtros adicionais opcionais
 * @returns Estatísticas gerais filtradas pelo escopo do usuário
 *
 * @example
 * // Para admin/tecnico - retorna estatísticas globais
 * const stats = await getEstatisticas(usuarioAdmin)
 *
 * @example
 * // Para polo - retorna estatísticas filtradas pelo polo
 * const stats = await getEstatisticas(usuarioPolo)
 *
 * @example
 * // Para escola - retorna estatísticas filtradas pela escola
 * const stats = await getEstatisticas(usuarioEscola)
 */
export async function getEstatisticas(
  usuario: Usuario,
  filtrosAdicionais?: Partial<FiltrosEstatisticas>
): Promise<EstatisticasGerais> {
  const escopo = determinarEscopo(usuario)

  // Montar filtros baseados no escopo do usuário
  const filtros: FiltrosEstatisticas = {
    poloId: escopo === 'polo' ? usuario.polo_id : filtrosAdicionais?.poloId,
    escolaId: escopo === 'escola' ? usuario.escola_id : filtrosAdicionais?.escolaId,
    anoLetivo: filtrosAdicionais?.anoLetivo,
    serie: filtrosAdicionais?.serie,
    avaliacaoId: filtrosAdicionais?.avaliacaoId
  }

  // Inicializar resultado com valores padrão
  const resultado: EstatisticasGerais = getEstatisticasPadrao()

  // Buscar identificação (nome polo/escola)
  if (escopo === 'polo' && filtros.poloId) {
    const nomeQuery = await executarQuerySegura(
      () => buscarNomePolo(filtros.poloId!),
      'buscar nome do polo'
    )
    if (nomeQuery.sucesso) {
      resultado.nomePolo = nomeQuery.dados
    }
  } else if (escopo === 'escola' && filtros.escolaId) {
    const nomesQuery = await executarQuerySegura(
      () => buscarNomeEscolaPolo(filtros.escolaId!),
      'buscar nome da escola e polo'
    )
    if (nomesQuery.sucesso && nomesQuery.dados) {
      resultado.nomeEscola = nomesQuery.dados.nomeEscola
      resultado.nomePolo = nomesQuery.dados.nomePolo
    }
  }

  // Buscar contadores globais (apenas para admin/tecnico)
  if (escopo === 'global') {
    const globaisQuery = await executarQuerySegura(
      () => buscarContadoresGlobais(),
      'buscar contadores globais'
    )
    if (globaisQuery.sucesso && globaisQuery.dados) {
      resultado.totalUsuarios = globaisQuery.dados.totalUsuarios
      resultado.totalPolos = globaisQuery.dados.totalPolos
      resultado.totalQuestoes = globaisQuery.dados.totalQuestoes
    }
  }

  // Executar queries em paralelo para melhor performance
  const [
    escolasQuery,
    turmasQuery,
    alunosQuery,
    resultadosQuery,
    presencaQuery,
    mediaQuery,
    tipoEnsinoQuery,
    seriesQuery,
    disciplinasQuery
  ] = await Promise.all([
    executarQuerySegura(() => buscarTotalEscolas(escopo, filtros), 'buscar total de escolas'),
    executarQuerySegura(() => buscarTotalTurmas(escopo, filtros), 'buscar total de turmas'),
    executarQuerySegura(() => buscarTotalAlunos(escopo, filtros), 'buscar total de alunos'),
    executarQuerySegura(() => buscarTotalResultados(escopo, filtros), 'buscar total de resultados'),
    executarQuerySegura(() => buscarPresenca(escopo, filtros), 'buscar presença'),
    executarQuerySegura(() => buscarMediaEAprovacao(escopo, filtros), 'buscar média e aprovação'),
    executarQuerySegura(() => buscarMediasPorTipoEnsino(escopo, filtros), 'buscar médias por tipo de ensino'),
    executarQuerySegura(() => buscarSeriesDisponiveis(escopo, filtros), 'buscar séries disponíveis'),
    executarQuerySegura(() => buscarMediasPorDisciplina(escopo, filtros), 'buscar médias por disciplina')
  ])

  // Preencher resultado com dados das queries
  if (escolasQuery.sucesso) resultado.totalEscolas = escolasQuery.dados!
  if (turmasQuery.sucesso) resultado.totalTurmas = turmasQuery.dados!
  if (alunosQuery.sucesso) resultado.totalAlunos = alunosQuery.dados!
  if (resultadosQuery.sucesso) resultado.totalResultados = resultadosQuery.dados!

  if (presencaQuery.sucesso && presencaQuery.dados) {
    resultado.totalAlunosPresentes = presencaQuery.dados.presentes
    resultado.totalAlunosFaltantes = presencaQuery.dados.faltantes
    resultado.totalAlunosAvaliados = presencaQuery.dados.totalAvaliados
  }

  if (mediaQuery.sucesso && mediaQuery.dados) {
    resultado.mediaGeral = mediaQuery.dados.mediaGeral
    resultado.taxaAprovacao = mediaQuery.dados.taxaAprovacao
  }

  if (tipoEnsinoQuery.sucesso && tipoEnsinoQuery.dados) {
    resultado.mediaAnosIniciais = tipoEnsinoQuery.dados.mediaAnosIniciais
    resultado.mediaAnosFinais = tipoEnsinoQuery.dados.mediaAnosFinais
    resultado.totalAnosIniciais = tipoEnsinoQuery.dados.totalAnosIniciais
    resultado.totalAnosFinais = tipoEnsinoQuery.dados.totalAnosFinais
  }

  if (seriesQuery.sucesso && seriesQuery.dados) {
    resultado.seriesDisponiveis = seriesQuery.dados
  }

  if (disciplinasQuery.sucesso && disciplinasQuery.dados) {
    resultado.mediaLp = disciplinasQuery.dados.mediaLp
    resultado.mediaMat = disciplinasQuery.dados.mediaMat
    resultado.mediaProd = disciplinasQuery.dados.mediaProd
    resultado.mediaCh = disciplinasQuery.dados.mediaCh
    resultado.mediaCn = disciplinasQuery.dados.mediaCn
  }

  // Buscar taxa de acertos (apenas para escola)
  if (escopo === 'escola' && filtros.escolaId) {
    const acertosQuery = await executarQuerySegura(
      () => buscarTotalAcertos(filtros.escolaId!),
      'buscar total de acertos'
    )
    if (acertosQuery.sucesso) {
      const totalAcertos = acertosQuery.dados!
      resultado.taxaAcertos = resultado.totalResultados > 0
        ? (totalAcertos / resultado.totalResultados) * 100
        : 0
    }
  }

  return resultado
}
