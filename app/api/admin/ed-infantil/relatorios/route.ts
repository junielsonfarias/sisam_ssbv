/**
 * GET /api/admin/ed-infantil/relatorios
 *
 * Lista global de relatórios pedagógicos semestrais da Educação Infantil
 * com filtros (escola, ano, período, status). Visão administrativa de consulta.
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

const PERIODOS = ['semestre_1', 'semestre_2', 'final'] as const
const STATUS = ['rascunho', 'publicado', 'entregue'] as const

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)

  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  // IDOR: usuário escola só vê relatórios pedagógicos (dados de menores) da
  // própria escola. Sobrescreve qualquer ?escola= do cliente.
  const escolaScope = usuario.tipo_usuario === 'escola'
    ? (usuario.escola_id || '00000000-0000-0000-0000-000000000000')
    : (searchParams.get('escola') || null)
  if (escolaScope) { params.push(escolaScope); conds.push(`a.escola_id = $${i++}`) }

  const ano = searchParams.get('ano')
  if (ano) { params.push(ano); conds.push(`r.ano_letivo = $${i++}`) }

  const periodo = searchParams.get('periodo')
  if (periodo && (PERIODOS as readonly string[]).includes(periodo)) {
    params.push(periodo); conds.push(`r.periodo = $${i++}`)
  }

  const status = searchParams.get('status')
  if (status && (STATUS as readonly string[]).includes(status)) {
    params.push(status); conds.push(`r.status = $${i++}`)
  }

  const busca = searchParams.get('busca')
  if (busca && busca.trim().length >= 2) {
    params.push(busca.trim())
    conds.push(`a.nome ILIKE '%' || $${i++} || '%'`)
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(parseInt(searchParams.get('limite') || '100', 10), 300)
  params.push(limite)

  const r = await pool.query(
    `SELECT r.id, r.aluno_id, r.ano_letivo, r.periodo, r.status,
            r.eu_outro_nos, r.corpo_gestos_movimentos, r.tracos_sons_cores_formas,
            r.escuta_fala_pensamento, r.espacos_tempos_quantidades,
            r.observacoes_gerais,
            r.publicado_em, r.entregue_em, r.criado_em, r.atualizado_em,
            a.nome AS aluno_nome, a.matricula AS aluno_matricula,
            t.codigo AS turma_codigo,
            ge.nome AS grupo_etario_nome,
            e.nome AS escola_nome,
            u.nome AS professor_nome
       FROM ed_infantil_relatorios r
       INNER JOIN alunos a ON a.id = r.aluno_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN ed_infantil_grupos_etarios ge ON ge.id = t.grupo_etario_id
       LEFT JOIN escolas e ON e.id = a.escola_id
       LEFT JOIN usuarios u ON u.id = r.professor_id
       ${where}
      ORDER BY r.atualizado_em DESC
      LIMIT $${i}`,
    params
  )

  // Stats herdam o escopo de escola (não vazar agregados) + ano se informado
  const statsConds: string[] = []
  const statsParams: unknown[] = []
  let j = 1
  if (escolaScope) { statsParams.push(escolaScope); statsConds.push(`a.escola_id = $${j++}`) }
  if (ano) { statsParams.push(ano); statsConds.push(`r.ano_letivo = $${j++}`) }
  const statsWhere = statsConds.length ? `WHERE ${statsConds.join(' AND ')}` : ''

  const statsR = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE r.status = 'rascunho') AS rascunhos,
       COUNT(*) FILTER (WHERE r.status = 'publicado') AS publicados,
       COUNT(*) FILTER (WHERE r.status = 'entregue') AS entregues,
       COUNT(DISTINCT r.aluno_id) AS alunos_distintos
     FROM ed_infantil_relatorios r
     INNER JOIN alunos a ON a.id = r.aluno_id
     ${statsWhere}`,
    statsParams
  )

  return NextResponse.json({
    relatorios: r.rows,
    estatisticas: {
      total: parseInt(statsR.rows[0]?.total || '0', 10),
      rascunhos: parseInt(statsR.rows[0]?.rascunhos || '0', 10),
      publicados: parseInt(statsR.rows[0]?.publicados || '0', 10),
      entregues: parseInt(statsR.rows[0]?.entregues || '0', 10),
      alunos_distintos: parseInt(statsR.rows[0]?.alunos_distintos || '0', 10),
    },
  })
})
