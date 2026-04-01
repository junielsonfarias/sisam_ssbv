// SISAM - Verificadores de Divergências: Estrutura
// Funções que verificam integridade estrutural (relações entre entidades)

import pool from '@/database/connection'
import {
  Divergencia,
  DivergenciaDetalhe,
  CONFIGURACOES_DIVERGENCIAS
} from './tipos'

/**
 * Verifica escolas sem polo válido
 */
export async function verificarEscolasSemPolo(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.escolas_sem_polo

    const result = await pool.query(`
      SELECT e.id, e.nome, e.codigo, e.polo_id
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      WHERE e.ativo = true AND (e.polo_id IS NULL OR p.id IS NULL)
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((row: any) => ({
      id: row.id,
      entidade: 'escola',
      entidadeId: row.id,
      codigo: row.codigo,
      nome: row.nome,
      descricaoProblema: 'Escola sem polo válido vinculado',
      sugestaoCorrecao: 'Vincular a um polo existente'
    }))

    return {
      id: 'escolas_sem_polo',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar escolas sem polo:', error)
    return null
  }
}

/**
 * Verifica turmas sem escola válida
 */
export async function verificarTurmasSemEscola(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.turmas_sem_escola

    const result = await pool.query(`
      SELECT t.id, t.codigo, t.nome, t.escola_id, t.serie, t.ano_letivo
      FROM turmas t
      LEFT JOIN escolas e ON t.escola_id = e.id
      WHERE t.ativo = true AND (t.escola_id IS NULL OR e.id IS NULL)
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((row: any) => ({
      id: row.id,
      entidade: 'turma',
      entidadeId: row.id,
      codigo: row.codigo,
      nome: row.nome,
      serie: row.serie,
      anoLetivo: row.ano_letivo,
      descricaoProblema: 'Turma sem escola válida vinculada',
      sugestaoCorrecao: 'Vincular a uma escola ou excluir turma'
    }))

    return {
      id: 'turmas_sem_escola',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar turmas sem escola:', error)
    return null
  }
}

/**
 * Verifica séries não configuradas
 */
export async function verificarSeriesNaoConfiguradas(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.serie_nao_configurada
    const result = await pool.query(`
      SELECT DISTINCT serie FROM (
        SELECT serie FROM alunos WHERE serie IS NOT NULL
        UNION SELECT serie FROM resultados_consolidados WHERE serie IS NOT NULL
      ) AS series_usadas
      WHERE serie NOT IN (SELECT serie FROM configuracao_series WHERE serie IS NOT NULL)
    `)
    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: `serie_${r.serie}`,
      entidade: 'serie',
      entidadeId: r.serie,
      nome: r.serie,
      descricaoProblema: `Série "${r.serie}" está sendo usada mas não possui configuração`,
      sugestaoCorrecao: 'Configurar série em Configuração de Séries'
    }))

    return { id: 'serie_nao_configurada', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar séries não configuradas:', error)
    return null
  }
}

/**
 * Verifica turmas vazias
 */
export async function verificarTurmasVazias(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.turmas_vazias

    const result = await pool.query(`
      SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id, e.nome as escola_nome
      FROM turmas t
      LEFT JOIN escolas e ON t.escola_id = e.id
      LEFT JOIN alunos a ON t.id = a.turma_id
      WHERE t.ativo = true
      GROUP BY t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id, e.nome
      HAVING COUNT(a.id) = 0
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'turma',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      escola: r.escola_nome,
      escolaId: r.escola_id,
      serie: r.serie,
      anoLetivo: r.ano_letivo,
      descricaoProblema: 'Turma ativa sem nenhum aluno vinculado',
      sugestaoCorrecao: 'Vincular alunos ou inativar turma'
    }))

    return { id: 'turmas_vazias', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar turmas vazias:', error)
    return null
  }
}

/**
 * Verifica polos sem escolas
 */
export async function verificarPolosSemEscolas(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.polos_sem_escolas

    const result = await pool.query(`
      SELECT p.id, p.nome, p.codigo
      FROM polos p
      LEFT JOIN escolas e ON p.id = e.polo_id
      WHERE p.ativo = true
      GROUP BY p.id, p.nome, p.codigo
      HAVING COUNT(e.id) = 0
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'polo',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      descricaoProblema: 'Polo ativo sem nenhuma escola vinculada',
      sugestaoCorrecao: 'Vincular escolas ou inativar polo'
    }))

    return { id: 'polos_sem_escolas', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar polos sem escolas:', error)
    return null
  }
}

/**
 * Verifica escolas sem alunos
 */
export async function verificarEscolasSemAlunos(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.escolas_sem_alunos

    const result = await pool.query(`
      SELECT e.id, e.nome, e.codigo, e.polo_id, p.nome as polo_nome
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN alunos a ON e.id = a.escola_id
      WHERE e.ativo = true
      GROUP BY e.id, e.nome, e.codigo, e.polo_id, p.nome
      HAVING COUNT(a.id) = 0
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'escola',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      polo: r.polo_nome,
      poloId: r.polo_id,
      descricaoProblema: 'Escola ativa sem nenhum aluno cadastrado',
      sugestaoCorrecao: 'Cadastrar alunos ou inativar escola'
    }))

    return { id: 'escolas_sem_alunos', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar escolas sem alunos:', error)
    return null
  }
}
