/**
 * Service — Responsável como entidade própria (Fase 3.1 — frente aditiva).
 *
 * Gerencia a entidade legal `responsaveis` e a ponte `aluno_responsaveis`,
 * SEM tocar em `responsaveis_alunos` (vínculo do portal usuarios<->alunos) nem
 * nos campos texto legados de `alunos`. Um responsável (identificado por CPF
 * quando disponível) pode estar vinculado a vários alunos (irmãos).
 *
 * @module services/responsaveis
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('Responsaveis')

export type Parentesco = 'mae' | 'pai' | 'responsavel' | 'avo' | 'tio' | 'irmao' | 'outro'

/**
 * Normaliza CPF para apenas dígitos. Retorna null se vazio ou se não tiver
 * exatamente 11 dígitos. Função PURA e testável.
 */
export function normalizarCpf(cpf?: string | null): string | null {
  if (!cpf) return null
  const limpo = cpf.replace(/\D/g, '')
  return limpo.length === 11 ? limpo : null
}

export interface DadosResponsavel {
  nome: string
  cpf?: string | null
  telefone?: string | null
  email?: string | null
  data_nascimento?: string | null
  parentesco?: Parentesco
  principal?: boolean
  observacoes?: string | null
}

export interface ResponsavelDoAluno {
  vinculo_id: string
  responsavel_id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  data_nascimento: string | null
  parentesco: string
  principal: boolean
  ativo: boolean
  usuario_id: string | null
}

/** Lista os responsáveis (entidade) vinculados a um aluno. */
export async function listarResponsaveisDoAluno(alunoId: string): Promise<ResponsavelDoAluno[]> {
  const r = await pool.query(
    `SELECT ar.id AS vinculo_id, r.id AS responsavel_id, r.nome, r.cpf, r.telefone,
            r.email, r.data_nascimento, ar.parentesco, ar.principal, ar.ativo, r.usuario_id
       FROM aluno_responsaveis ar
       JOIN responsaveis r ON r.id = ar.responsavel_id
      WHERE ar.aluno_id = $1
      ORDER BY ar.principal DESC, ar.criado_em`,
    [alunoId]
  )
  return r.rows.map((row: Record<string, unknown>) => ({
    vinculo_id: String(row.vinculo_id),
    responsavel_id: String(row.responsavel_id),
    nome: String(row.nome),
    cpf: row.cpf ? String(row.cpf) : null,
    telefone: row.telefone ? String(row.telefone) : null,
    email: row.email ? String(row.email) : null,
    data_nascimento: row.data_nascimento ? String(row.data_nascimento).slice(0, 10) : null,
    parentesco: String(row.parentesco),
    principal: !!row.principal,
    ativo: !!row.ativo,
    usuario_id: row.usuario_id ? String(row.usuario_id) : null,
  }))
}

/**
 * Adiciona um responsável a um aluno. Se o CPF já existir, reusa a entidade
 * (atualizando contato) e apenas cria/ativa o vínculo. Marca como principal de
 * forma exclusiva quando solicitado. Tudo em transação.
 */
export async function adicionarResponsavelAoAluno(
  alunoId: string,
  dados: DadosResponsavel
): Promise<{ responsavel_id: string; vinculo_id: string }> {
  const cpf = normalizarCpf(dados.cpf)
  const parentesco: Parentesco = dados.parentesco || 'responsavel'
  const principal = !!dados.principal

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1) Resolve a entidade responsável (reusa por CPF quando houver).
    let responsavelId: string | null = null
    if (cpf) {
      const existente = await client.query(`SELECT id FROM responsaveis WHERE cpf = $1`, [cpf])
      if (existente.rows.length > 0) {
        responsavelId = existente.rows[0].id
        await client.query(
          `UPDATE responsaveis SET
             nome = $2,
             telefone = COALESCE($3, telefone),
             email = COALESCE($4, email),
             data_nascimento = COALESCE($5, data_nascimento),
             atualizado_em = NOW()
           WHERE id = $1`,
          [responsavelId, dados.nome.trim(), dados.telefone || null, dados.email || null, dados.data_nascimento || null]
        )
      }
    }
    if (!responsavelId) {
      const novo = await client.query(
        `INSERT INTO responsaveis (nome, cpf, telefone, email, data_nascimento, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [dados.nome.trim(), cpf, dados.telefone || null, dados.email || null, dados.data_nascimento || null, dados.observacoes || null]
      )
      responsavelId = novo.rows[0].id
    }

    // 2) Cria/reativa o vínculo.
    const vinculo = await client.query(
      `INSERT INTO aluno_responsaveis (aluno_id, responsavel_id, parentesco, principal, ativo)
       VALUES ($1,$2,$3,$4,TRUE)
       ON CONFLICT (aluno_id, responsavel_id) DO UPDATE SET
         parentesco = EXCLUDED.parentesco,
         principal = EXCLUDED.principal,
         ativo = TRUE,
         atualizado_em = NOW()
       RETURNING id`,
      [alunoId, responsavelId, parentesco, principal]
    )

    // 3) Principal é exclusivo por aluno.
    if (principal) {
      await client.query(
        `UPDATE aluno_responsaveis SET principal = FALSE, atualizado_em = NOW()
          WHERE aluno_id = $1 AND responsavel_id <> $2 AND principal = TRUE`,
        [alunoId, responsavelId]
      )
    }

    await client.query('COMMIT')
    return { responsavel_id: responsavelId!, vinculo_id: vinculo.rows[0].id }
  } catch (err) {
    await client.query('ROLLBACK')
    log.error('Falha ao adicionar responsavel ao aluno', err, { data: { alunoId } })
    throw err
  } finally {
    client.release()
  }
}

/** Atualiza dados da entidade responsável + parentesco/principal do vínculo. */
export async function atualizarVinculoResponsavel(
  alunoId: string,
  responsavelId: string,
  dados: Partial<DadosResponsavel>
): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const vinc = await client.query(
      `SELECT id FROM aluno_responsaveis WHERE aluno_id = $1 AND responsavel_id = $2`,
      [alunoId, responsavelId]
    )
    if (vinc.rows.length === 0) {
      await client.query('ROLLBACK')
      return false
    }

    if (dados.nome !== undefined || dados.telefone !== undefined || dados.email !== undefined || dados.data_nascimento !== undefined || dados.cpf !== undefined) {
      await client.query(
        `UPDATE responsaveis SET
           nome = COALESCE($2, nome),
           cpf = COALESCE($3, cpf),
           telefone = COALESCE($4, telefone),
           email = COALESCE($5, email),
           data_nascimento = COALESCE($6, data_nascimento),
           atualizado_em = NOW()
         WHERE id = $1`,
        [
          responsavelId,
          dados.nome?.trim() ?? null,
          dados.cpf !== undefined ? normalizarCpf(dados.cpf) : null,
          dados.telefone ?? null,
          dados.email ?? null,
          dados.data_nascimento ?? null,
        ]
      )
    }

    if (dados.parentesco !== undefined || dados.principal !== undefined) {
      await client.query(
        `UPDATE aluno_responsaveis SET
           parentesco = COALESCE($3, parentesco),
           principal = COALESCE($4, principal),
           atualizado_em = NOW()
         WHERE aluno_id = $1 AND responsavel_id = $2`,
        [alunoId, responsavelId, dados.parentesco ?? null, dados.principal ?? null]
      )
      if (dados.principal === true) {
        await client.query(
          `UPDATE aluno_responsaveis SET principal = FALSE, atualizado_em = NOW()
            WHERE aluno_id = $1 AND responsavel_id <> $2 AND principal = TRUE`,
          [alunoId, responsavelId]
        )
      }
    }

    await client.query('COMMIT')
    return true
  } catch (err) {
    await client.query('ROLLBACK')
    log.error('Falha ao atualizar vinculo de responsavel', err, { data: { alunoId, responsavelId } })
    throw err
  } finally {
    client.release()
  }
}

/**
 * Remove o vínculo aluno<->responsável. Se a entidade responsável ficar órfã
 * (sem outros vínculos e sem usuário de portal), é removida também.
 */
export async function removerVinculoResponsavel(alunoId: string, responsavelId: string): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const del = await client.query(
      `DELETE FROM aluno_responsaveis WHERE aluno_id = $1 AND responsavel_id = $2`,
      [alunoId, responsavelId]
    )
    if ((del.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK')
      return false
    }

    await client.query(
      `DELETE FROM responsaveis r
        WHERE r.id = $1
          AND r.usuario_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM aluno_responsaveis ar WHERE ar.responsavel_id = r.id)`,
      [responsavelId]
    )

    await client.query('COMMIT')
    return true
  } catch (err) {
    await client.query('ROLLBACK')
    log.error('Falha ao remover vinculo de responsavel', err, { data: { alunoId, responsavelId } })
    throw err
  } finally {
    client.release()
  }
}
