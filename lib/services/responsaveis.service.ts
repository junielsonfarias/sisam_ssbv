/**
 * Service — Responsável no MODELO UNIFICADO (Lote 3.2, OPÇÃO A).
 *
 * O responsável É um `usuarios` (tipo_usuario='responsavel') e o vínculo com o
 * aluno vive em `responsaveis_alunos` (usuario_id, aluno_id). NÃO usa mais as
 * tabelas legadas `responsaveis`/`aluno_responsaveis`. O cadastro admin e o
 * portal passam a enxergar os MESMOS vínculos.
 *
 * O cadastro admin CRIA a conta de usuário automaticamente quando ela não
 * existir (reusa por CPF normalizado ou email quando existir), com senha
 * provisória forte (bcrypt), espelhando `app/api/admin/responsaveis/route.ts`.
 * O vínculo nasce `status='aprovado'`, `origem='admin'` — ou seja, já aparece
 * no portal (que filtra usuario_id + ativo + status='aprovado').
 *
 * @module services/responsaveis
 */

import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'
import { gerarSenhaForte } from '@/lib/utils/gerar-senha'
import { createLogger } from '@/lib/logger'

const log = createLogger('Responsaveis')

export type Parentesco = 'mae' | 'pai' | 'responsavel' | 'avo' | 'avos' | 'tio' | 'irmao' | 'outro'

/**
 * Normaliza CPF para apenas dígitos. Retorna null se vazio ou se não tiver
 * exatamente 11 dígitos. Função PURA e testável.
 */
export function normalizarCpf(cpf?: string | null): string | null {
  if (!cpf) return null
  const limpo = cpf.replace(/\D/g, '')
  return limpo.length === 11 ? limpo : null
}

/** E-mail de fallback determinístico quando o responsável não informa um. */
function emailPlaceholder(cpf: string | null): string {
  const base = cpf || `r${Date.now()}${Math.floor(Math.random() * 1e6)}`
  return `resp.${base}@sem-email.local`
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
  /** No modelo unificado o responsável É o usuário: responsavel_id = usuario_id. */
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

/**
 * Lista TODOS os vínculos do aluno (inclusive os criados pelo portal), juntando
 * os dados do responsável a partir de `usuarios`.
 */
export async function listarResponsaveisDoAluno(alunoId: string): Promise<ResponsavelDoAluno[]> {
  const r = await pool.query(
    `SELECT ra.id AS vinculo_id, u.id AS usuario_id, u.nome, u.cpf, u.telefone,
            u.email, u.data_nascimento, ra.tipo_vinculo AS parentesco,
            ra.principal, ra.ativo
       FROM responsaveis_alunos ra
       JOIN usuarios u ON u.id = ra.usuario_id
      WHERE ra.aluno_id = $1
      ORDER BY ra.principal DESC, ra.criado_em`,
    [alunoId]
  )
  return r.rows.map((row: Record<string, unknown>) => ({
    vinculo_id: String(row.vinculo_id),
    responsavel_id: String(row.usuario_id),
    nome: String(row.nome),
    cpf: row.cpf ? String(row.cpf) : null,
    telefone: row.telefone ? String(row.telefone) : null,
    email: row.email ? String(row.email) : null,
    data_nascimento: row.data_nascimento ? String(row.data_nascimento).slice(0, 10) : null,
    parentesco: String(row.parentesco),
    principal: !!row.principal,
    ativo: !!row.ativo,
    usuario_id: String(row.usuario_id),
  }))
}

/**
 * Adiciona um responsável a um aluno (modelo unificado). Em transação:
 *  1) Resolve/cria a conta `usuarios` (reusa por CPF normalizado ou email; se
 *     não existir, cria com tipo='responsavel' e senha provisória bcrypt).
 *  2) UPSERT do vínculo em `responsaveis_alunos` com status='aprovado',
 *     origem='admin', ativo=true.
 *  3) Garante `principal` exclusivo por aluno.
 *
 * @returns { responsavel_id: usuarioId, vinculo_id }
 */
export async function adicionarResponsavelAoAluno(
  alunoId: string,
  dados: DadosResponsavel
): Promise<{ responsavel_id: string; vinculo_id: string }> {
  const cpf = normalizarCpf(dados.cpf)
  const email = dados.email?.trim().toLowerCase() || null
  const parentesco: Parentesco = dados.parentesco || 'responsavel'
  const principal = !!dados.principal

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1) Resolve a conta de usuário (reusa por CPF, depois por email).
    let usuarioId: string | null = null
    if (cpf) {
      const porCpf = await client.query(`SELECT id FROM usuarios WHERE cpf = $1 LIMIT 1`, [cpf])
      if (porCpf.rows.length > 0) usuarioId = porCpf.rows[0].id
    }
    if (!usuarioId && email) {
      const porEmail = await client.query(`SELECT id FROM usuarios WHERE email = $1 LIMIT 1`, [email])
      if (porEmail.rows.length > 0) usuarioId = porEmail.rows[0].id
    }

    if (usuarioId) {
      // Atualiza contato da conta existente (sem sobrescrever com null).
      await client.query(
        `UPDATE usuarios SET
           nome = $2,
           cpf = COALESCE($3, cpf),
           telefone = COALESCE($4, telefone),
           email = COALESCE($5, email),
           data_nascimento = COALESCE($6, data_nascimento),
           atualizado_em = NOW()
         WHERE id = $1`,
        [usuarioId, dados.nome.trim(), cpf, dados.telefone || null, email, dados.data_nascimento || null]
      )
    } else {
      // Cria a conta de responsável com senha provisória forte (bcrypt).
      const senhaHash = await hashPassword(gerarSenhaForte())
      const emailFinal = email || emailPlaceholder(cpf)
      const novo = await client.query(
        `INSERT INTO usuarios (nome, email, senha, tipo_usuario, cpf, telefone, data_nascimento, ativo)
         VALUES ($1, $2, $3, 'responsavel', $4, $5, $6, TRUE)
         RETURNING id`,
        [dados.nome.trim(), emailFinal, senhaHash, cpf, dados.telefone || null, dados.data_nascimento || null]
      )
      usuarioId = novo.rows[0].id
    }

    // 2) UPSERT do vínculo (status aprovado, origem admin).
    const vinculo = await client.query(
      `INSERT INTO responsaveis_alunos (usuario_id, aluno_id, tipo_vinculo, principal, ativo, status, origem)
       VALUES ($1, $2, $3, $4, TRUE, 'aprovado', 'admin')
       ON CONFLICT (usuario_id, aluno_id) DO UPDATE SET
         tipo_vinculo = EXCLUDED.tipo_vinculo,
         principal = EXCLUDED.principal,
         ativo = TRUE,
         status = 'aprovado',
         atualizado_em = NOW()
       RETURNING id`,
      [usuarioId, alunoId, parentesco, principal]
    )

    // 3) Principal é exclusivo por aluno.
    if (principal) {
      await client.query(
        `UPDATE responsaveis_alunos SET principal = FALSE, atualizado_em = NOW()
          WHERE aluno_id = $1 AND usuario_id <> $2 AND principal = TRUE`,
        [alunoId, usuarioId]
      )
    }

    await client.query('COMMIT')
    return { responsavel_id: usuarioId!, vinculo_id: vinculo.rows[0].id }
  } catch (err) {
    await client.query('ROLLBACK')
    log.error('Falha ao adicionar responsavel ao aluno', err, { data: { alunoId } })
    throw err
  } finally {
    client.release()
  }
}

/**
 * Atualiza a conta do responsável (usuarios) + parentesco/principal do vínculo.
 * `responsavelId` agora é o `usuario_id`.
 */
export async function atualizarVinculoResponsavel(
  alunoId: string,
  responsavelId: string,
  dados: Partial<DadosResponsavel>
): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const vinc = await client.query(
      `SELECT id FROM responsaveis_alunos WHERE aluno_id = $1 AND usuario_id = $2`,
      [alunoId, responsavelId]
    )
    if (vinc.rows.length === 0) {
      await client.query('ROLLBACK')
      return false
    }

    if (
      dados.nome !== undefined || dados.telefone !== undefined || dados.email !== undefined ||
      dados.data_nascimento !== undefined || dados.cpf !== undefined
    ) {
      await client.query(
        `UPDATE usuarios SET
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
          dados.email ? dados.email.trim().toLowerCase() : null,
          dados.data_nascimento ?? null,
        ]
      )
    }

    if (dados.parentesco !== undefined || dados.principal !== undefined) {
      await client.query(
        `UPDATE responsaveis_alunos SET
           tipo_vinculo = COALESCE($3, tipo_vinculo),
           principal = COALESCE($4, principal),
           atualizado_em = NOW()
         WHERE aluno_id = $1 AND usuario_id = $2`,
        [alunoId, responsavelId, dados.parentesco ?? null, dados.principal ?? null]
      )
      if (dados.principal === true) {
        await client.query(
          `UPDATE responsaveis_alunos SET principal = FALSE, atualizado_em = NOW()
            WHERE aluno_id = $1 AND usuario_id <> $2 AND principal = TRUE`,
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
 * Remove o vínculo aluno<->responsável. `responsavelId` é o `usuario_id`.
 * NÃO apaga a conta de `usuarios` — é conta de login e pode ter outros
 * vínculos/filhos.
 */
export async function removerVinculoResponsavel(alunoId: string, responsavelId: string): Promise<boolean> {
  const del = await pool.query(
    `DELETE FROM responsaveis_alunos WHERE aluno_id = $1 AND usuario_id = $2`,
    [alunoId, responsavelId]
  )
  return (del.rowCount ?? 0) > 0
}
