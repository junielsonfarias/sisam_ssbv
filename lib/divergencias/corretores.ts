// SISAM - Corretores de Divergências
// Funções para corrigir automaticamente ou com confirmação as divergências encontradas
// TODO: Refatorar completamente para usar pool.query

import pool from '@/database/connection'
import {
  TipoDivergencia,
  ParametrosCorrecao,
  ResultadoCorrecao,
  CONFIGURACOES_DIVERGENCIAS
} from './tipos'

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Registra correção no histórico
 */
export async function registrarHistorico(
  tipo: TipoDivergencia,
  entidade: string,
  entidadeId: string | null,
  entidadeNome: string | null,
  dadosAntes: any,
  dadosDepois: any,
  acaoRealizada: string,
  correcaoAutomatica: boolean,
  usuarioId: string,
  usuarioNome: string
): Promise<void> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS[tipo]

    await pool.query(`
      INSERT INTO divergencias_historico (
        tipo, nivel, titulo, descricao, entidade, entidade_id, entidade_nome,
        dados_antes, dados_depois, acao_realizada, correcao_automatica,
        usuario_id, usuario_nome, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    `, [
      tipo,
      config.nivel,
      config.titulo,
      config.descricao,
      entidade,
      entidadeId,
      entidadeNome,
      JSON.stringify(dadosAntes),
      JSON.stringify(dadosDepois),
      acaoRealizada,
      correcaoAutomatica,
      usuarioId,
      usuarioNome
    ])
  } catch (error) {
    console.error('Erro ao registrar histórico de divergência:', error)
  }
}

// ============================================
// CORRETORES (Implementações simplificadas)
// ============================================

/**
 * Remove resultados órfãos (sem aluno correspondente)
 */
export async function corrigirResultadosOrfaos(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  try {
    const result = await pool.query(`
      DELETE FROM resultados_provas
      WHERE aluno_id IS NULL
      RETURNING id
    `)

    const corrigidos = result.rowCount || 0

    if (corrigidos > 0) {
      await registrarHistorico(
        'resultados_orfaos',
        'resultado_prova',
        null,
        null,
        { total: corrigidos },
        null,
        `${corrigidos} resultado(s) órfão(s) removido(s)`,
        true,
        usuarioId,
        usuarioNome
      )
    }

    return {
      sucesso: true,
      mensagem: `${corrigidos} resultado(s) órfão(s) removido(s)`,
      corrigidos,
      erros: 0
    }
  } catch (error: any) {
    return {
      sucesso: false,
      mensagem: `Erro ao remover resultados órfãos: ${error.message}`,
      corrigidos: 0,
      erros: 1
    }
  }
}

/**
 * Recalcula médias de alunos com valores inconsistentes
 */
export async function corrigirMediasInconsistentes(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  try {
    // Buscar resultados para recalcular
    const { rows } = await pool.query(`
      SELECT id, aluno_id, nota_lp, nota_mat, nota_ch, nota_cn, media_aluno
      FROM resultados_consolidados
      WHERE media_aluno IS NOT NULL
    `)

    let corrigidos = 0
    let erros = 0

    for (const resultado of rows) {
      const notas = [resultado.nota_lp, resultado.nota_mat, resultado.nota_ch, resultado.nota_cn]
        .filter(n => n !== null && n !== undefined)
        .map(n => parseFloat(String(n)) || 0)

      if (notas.length === 0) continue

      const mediaCalculada = Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2))
      const mediaAtual = parseFloat(resultado.media_aluno) || 0

      if (Math.abs(mediaCalculada - mediaAtual) > 0.01) {
        try {
          await pool.query(
            'UPDATE resultados_consolidados SET media_aluno = $1 WHERE id = $2',
            [mediaCalculada, resultado.id]
          )
          corrigidos++

          await registrarHistorico(
            'medias_inconsistentes',
            'resultado_consolidado',
            resultado.id,
            null,
            { media_aluno: mediaAtual },
            { media_aluno: mediaCalculada },
            `Média recalculada de ${mediaAtual} para ${mediaCalculada}`,
            params.corrigirTodos || false,
            usuarioId,
            usuarioNome
          )
        } catch {
          erros++
        }
      }
    }

    return {
      sucesso: erros === 0,
      mensagem: `${corrigidos} média(s) recalculada(s)${erros > 0 ? `, ${erros} erro(s)` : ''}`,
      corrigidos,
      erros
    }
  } catch (error: any) {
    return { sucesso: false, mensagem: `Erro ao corrigir médias: ${error.message}`, corrigidos: 0, erros: 1 }
  }
}

/**
 * Corrige presença inconsistente (faltantes com acertos)
 */
export async function corrigirPresencaInconsistente(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  try {
    const result = await pool.query(`
      UPDATE resultados_consolidados
      SET presenca = 'P'
      WHERE presenca = 'F' AND (
        COALESCE(total_acertos_lp, 0) + COALESCE(total_acertos_mat, 0) +
        COALESCE(total_acertos_ch, 0) + COALESCE(total_acertos_cn, 0)
      ) > 0
      RETURNING id
    `)

    const corrigidos = result.rowCount || 0

    if (corrigidos > 0) {
      await registrarHistorico(
        'presenca_inconsistente',
        'resultado_consolidado',
        null,
        null,
        { presenca: 'F', total: corrigidos },
        { presenca: 'P' },
        `${corrigidos} presença(s) corrigida(s) de F para P`,
        true,
        usuarioId,
        usuarioNome
      )
    }

    return {
      sucesso: true,
      mensagem: `${corrigidos} presença(s) corrigida(s)`,
      corrigidos,
      erros: 0
    }
  } catch (error: any) {
    return { sucesso: false, mensagem: `Erro ao corrigir presenças: ${error.message}`, corrigidos: 0, erros: 1 }
  }
}

/**
 * Inativa turmas vazias
 */
export async function corrigirTurmasVazias(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  try {
    const result = await pool.query(`
      UPDATE turmas SET ativo = false
      WHERE ativo = true AND id IN (
        SELECT t.id FROM turmas t
        LEFT JOIN alunos a ON t.id = a.turma_id
        WHERE t.ativo = true
        GROUP BY t.id
        HAVING COUNT(a.id) = 0
      )
      RETURNING id, nome
    `)

    const corrigidos = result.rowCount || 0

    if (corrigidos > 0) {
      await registrarHistorico(
        'turmas_vazias',
        'turma',
        null,
        null,
        { ativo: true, total: corrigidos },
        { ativo: false },
        `${corrigidos} turma(s) vazia(s) inativada(s)`,
        true,
        usuarioId,
        usuarioNome
      )
    }

    return {
      sucesso: true,
      mensagem: `${corrigidos} turma(s) inativada(s)`,
      corrigidos,
      erros: 0
    }
  } catch (error: any) {
    return { sucesso: false, mensagem: `Erro ao inativar turmas: ${error.message}`, corrigidos: 0, erros: 1 }
  }
}

/**
 * Cancela importações com erro ou pendentes há muito tempo
 */
export async function corrigirImportacoesPendentes(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  try {
    const result = await pool.query(`
      UPDATE importacoes
      SET status = 'erro', erros = COALESCE(erros, '') || ' | Cancelado pelo sistema de divergências'
      WHERE status = 'erro' OR (status = 'processando' AND criado_em < NOW() - INTERVAL '1 day')
      RETURNING id, nome_arquivo
    `)

    const corrigidos = result.rowCount || 0

    if (corrigidos > 0) {
      await registrarHistorico(
        'importacoes_erro_pendente',
        'importacao',
        null,
        null,
        { status: 'processando/erro', total: corrigidos },
        { status: 'erro' },
        `${corrigidos} importação(ões) cancelada(s)`,
        true,
        usuarioId,
        usuarioNome
      )
    }

    return {
      sucesso: true,
      mensagem: `${corrigidos} importação(ões) cancelada(s)`,
      corrigidos,
      erros: 0
    }
  } catch (error: any) {
    return { sucesso: false, mensagem: `Erro ao cancelar importações: ${error.message}`, corrigidos: 0, erros: 1 }
  }
}

/**
 * Correção de alunos duplicados (requer dados adicionais)
 */
export async function corrigirAlunosDuplicados(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  const { ids, dadosCorrecao } = params

  if (!ids || ids.length === 0) {
    return { sucesso: false, mensagem: 'Nenhum aluno selecionado para correção', corrigidos: 0, erros: 1 }
  }

  const acao = dadosCorrecao?.acao as 'excluir' | 'mesclar'

  if (acao === 'excluir') {
    let corrigidos = 0
    let erros = 0

    for (const id of ids) {
      try {
        const { rows } = await pool.query('SELECT nome, codigo FROM alunos WHERE id = $1', [id])
        const aluno = rows[0]

        await pool.query('DELETE FROM alunos WHERE id = $1', [id])
        corrigidos++

        await registrarHistorico(
          'alunos_duplicados',
          'aluno',
          id,
          aluno?.nome || null,
          aluno,
          null,
          'Aluno duplicado excluído',
          false,
          usuarioId,
          usuarioNome
        )
      } catch {
        erros++
      }
    }

    return {
      sucesso: erros === 0,
      mensagem: `${corrigidos} aluno(s) excluído(s)${erros > 0 ? `, ${erros} erro(s)` : ''}`,
      corrigidos,
      erros
    }
  }

  return { sucesso: false, mensagem: 'Ação inválida ou dados incompletos', corrigidos: 0, erros: 1 }
}

/**
 * Vincula escola a um polo
 */
export async function corrigirEscolaSemPolo(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  const { ids, dadosCorrecao } = params
  const poloId = dadosCorrecao?.poloId as string

  if (!ids || ids.length === 0 || !poloId) {
    return { sucesso: false, mensagem: 'Escola ou polo não informado', corrigidos: 0, erros: 1 }
  }

  let corrigidos = 0
  let erros = 0

  for (const escolaId of ids) {
    try {
      const { rows: escolaRows } = await pool.query('SELECT nome FROM escolas WHERE id = $1', [escolaId])
      const { rows: poloRows } = await pool.query('SELECT nome FROM polos WHERE id = $1', [poloId])

      await pool.query('UPDATE escolas SET polo_id = $1 WHERE id = $2', [poloId, escolaId])
      corrigidos++

      await registrarHistorico(
        'escolas_sem_polo',
        'escola',
        escolaId,
        escolaRows[0]?.nome || null,
        { polo_id: null },
        { polo_id: poloId, polo_nome: poloRows[0]?.nome },
        `Escola vinculada ao polo "${poloRows[0]?.nome}"`,
        false,
        usuarioId,
        usuarioNome
      )
    } catch {
      erros++
    }
  }

  return {
    sucesso: erros === 0,
    mensagem: `${corrigidos} escola(s) vinculada(s) ao polo${erros > 0 ? `, ${erros} erro(s)` : ''}`,
    corrigidos,
    erros
  }
}

/**
 * Corrige nota fora do range
 */
export async function corrigirNotaForaRange(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  const { ids, dadosCorrecao } = params
  const campo = dadosCorrecao?.campo as string
  const novoValor = dadosCorrecao?.novoValor as number

  if (!ids || ids.length === 0 || !campo || novoValor === undefined) {
    return { sucesso: false, mensagem: 'Dados incompletos para correção', corrigidos: 0, erros: 1 }
  }

  if (novoValor < 0 || novoValor > 10) {
    return { sucesso: false, mensagem: 'Novo valor deve estar entre 0 e 10', corrigidos: 0, erros: 1 }
  }

  let corrigidos = 0
  let erros = 0

  for (const id of ids) {
    const resultadoId = id.split('_')[0]

    try {
      const { rows } = await pool.query(`SELECT ${campo} as valor_antigo FROM resultados_consolidados WHERE id = $1`, [resultadoId])
      const valorAntigo = rows[0]?.valor_antigo

      await pool.query(`UPDATE resultados_consolidados SET ${campo} = $1 WHERE id = $2`, [novoValor, resultadoId])
      corrigidos++

      await registrarHistorico(
        'notas_fora_range',
        'resultado_consolidado',
        resultadoId,
        null,
        { [campo]: valorAntigo },
        { [campo]: novoValor },
        `${campo} corrigido de ${valorAntigo} para ${novoValor}`,
        false,
        usuarioId,
        usuarioNome
      )
    } catch {
      erros++
    }
  }

  return {
    sucesso: erros === 0,
    mensagem: `${corrigidos} nota(s) corrigida(s)${erros > 0 ? `, ${erros} erro(s)` : ''}`,
    corrigidos,
    erros
  }
}

// ============================================
// DISPATCHER PRINCIPAL
// ============================================

/**
 * Executa correção baseada no tipo de divergência
 */
export async function executarCorrecao(
  params: ParametrosCorrecao,
  usuarioId: string,
  usuarioNome: string
): Promise<ResultadoCorrecao> {
  switch (params.tipo) {
    case 'resultados_orfaos':
      return corrigirResultadosOrfaos(params, usuarioId, usuarioNome)

    case 'medias_inconsistentes':
      return corrigirMediasInconsistentes(params, usuarioId, usuarioNome)

    case 'presenca_inconsistente':
      return corrigirPresencaInconsistente(params, usuarioId, usuarioNome)

    case 'turmas_vazias':
      return corrigirTurmasVazias(params, usuarioId, usuarioNome)

    case 'importacoes_erro_pendente':
      return corrigirImportacoesPendentes(params, usuarioId, usuarioNome)

    case 'alunos_duplicados':
      return corrigirAlunosDuplicados(params, usuarioId, usuarioNome)

    case 'escolas_sem_polo':
      return corrigirEscolaSemPolo(params, usuarioId, usuarioNome)

    case 'notas_fora_range':
      return corrigirNotaForaRange(params, usuarioId, usuarioNome)

    default:
      return {
        sucesso: false,
        mensagem: `Tipo de divergência "${params.tipo}" não possui correção implementada`,
        corrigidos: 0,
        erros: 1
      }
  }
}

/**
 * Limpa histórico de divergências com mais de 30 dias
 */
export async function limparHistoricoAntigo(): Promise<{ removidos: number }> {
  try {
    const result = await pool.query(`
      DELETE FROM divergencias_historico
      WHERE created_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `)

    return { removidos: result.rowCount || 0 }
  } catch (error) {
    console.error('Erro ao limpar histórico antigo:', error)
    return { removidos: 0 }
  }
}
