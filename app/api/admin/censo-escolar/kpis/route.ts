/**
 * GET /api/admin/censo-escolar/kpis?ano_letivo=&escola_id=
 *
 * KPIs de validação para Censo Escolar — quantos alunos têm campos
 * obrigatórios faltantes (CPF, data_nascimento, nome_mae, escola_inep),
 * total de alunos/turmas/professores ativos.
 *
 * Usado para sinalizar pendências antes de exportar CSV INEP.
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export const GET = withAuthModulo(['administrador', 'tecnico'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const ano = searchParams.get('ano_letivo') || String(new Date().getFullYear())
  const escolaId = searchParams.get('escola_id') || null

  // Filtro condicional reutilizado nas 3 queries
  const params: unknown[] = [ano]
  let filtroEscola = ''
  if (escolaId) {
    params.push(escolaId)
    filtroEscola = 'AND a.escola_id = $2'
  }

  // 1) KPIs de alunos (1 query agregada — sem N+1)
  const alunosR = await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE a.ativo IS NOT FALSE)                              AS alunos_ativos,
        COUNT(*) FILTER (WHERE a.ativo IS NOT FALSE AND e.codigo_inep IS NULL)    AS alunos_sem_inep_escola,
        COUNT(*) FILTER (WHERE a.ativo IS NOT FALSE AND (a.cpf IS NULL OR a.cpf = '')) AS alunos_sem_cpf,
        COUNT(*) FILTER (WHERE a.ativo IS NOT FALSE AND a.data_nascimento IS NULL) AS alunos_sem_data_nascimento,
        COUNT(*) FILTER (WHERE a.ativo IS NOT FALSE AND (a.nome_mae IS NULL OR a.nome_mae = '')) AS alunos_sem_nome_mae
      FROM alunos a
      LEFT JOIN escolas e ON e.id = a.escola_id
      WHERE a.ano_letivo = $1
        ${filtroEscola}`,
    params
  )

  // 2) Turmas ativas
  const turmasParams: unknown[] = [ano]
  let turmasFiltroEscola = ''
  if (escolaId) {
    turmasParams.push(escolaId)
    turmasFiltroEscola = 'AND escola_id = $2'
  }
  const turmasR = await pool.query(
    `SELECT COUNT(*) AS total
       FROM turmas
      WHERE ano_letivo = $1
        AND (ativo IS NOT FALSE)
        ${turmasFiltroEscola}`,
    turmasParams
  ).catch(() => ({ rows: [{ total: '0' }] }))

  // 3) Professores ativos
  const profsR = await pool.query(
    `SELECT COUNT(*) AS total
       FROM usuarios
      WHERE tipo_usuario = 'professor'
        AND (ativo IS NOT FALSE)`
  ).catch(() => ({ rows: [{ total: '0' }] }))

  const a = alunosR.rows[0] || {}
  return NextResponse.json({
    kpis: {
      alunos_ativos: parseInt(a.alunos_ativos || '0', 10),
      alunos_sem_inep_escola: parseInt(a.alunos_sem_inep_escola || '0', 10),
      alunos_sem_cpf: parseInt(a.alunos_sem_cpf || '0', 10),
      alunos_sem_data_nascimento: parseInt(a.alunos_sem_data_nascimento || '0', 10),
      alunos_sem_nome_mae: parseInt(a.alunos_sem_nome_mae || '0', 10),
      turmas_ativas: parseInt(turmasR.rows[0]?.total || '0', 10),
      professores_ativos: parseInt(profsR.rows[0]?.total || '0', 10),
    },
  })
})
