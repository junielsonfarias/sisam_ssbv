/**
 * GET /api/admin/avaliacoes-descritivas
 *
 * Lista global de avaliações descritivas com filtros (escola, turma, professor,
 * status, busca por aluno). Usado pela página admin de acompanhamento
 * pedagógico — administradores e técnicos visualizam pareceres descritivos
 * de anos iniciais e Educação Infantil.
 *
 * Admin/técnico NÃO emite avaliação descritiva (isso é responsabilidade do
 * professor). Esta página é apenas para consulta e auditoria pedagógica.
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)

  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  // IDOR: usuário escola só vê pareceres descritivos (dado pedagógico de
  // menores) da própria escola. Sobrescreve qualquer ?escola= do cliente.
  const escolaScope = usuario.tipo_usuario === 'escola'
    ? (usuario.escola_id || '00000000-0000-0000-0000-000000000000')
    : (searchParams.get('escola') || null)
  if (escolaScope) { params.push(escolaScope); conds.push(`a.escola_id = $${i++}`) }

  // Ano letivo é derivado via periodos_letivos.ano_letivo
  const ano = searchParams.get('ano_letivo') || searchParams.get('ano')
  if (ano) { params.push(ano); conds.push(`p.ano_letivo = $${i++}`) }

  const turma = searchParams.get('turma')
  if (turma) { params.push(turma); conds.push(`a.turma_id = $${i++}`) }

  const professor = searchParams.get('professor')
  if (professor) { params.push(professor); conds.push(`av.professor_id = $${i++}`) }

  const status = searchParams.get('status')
  if (status === 'rascunho' || status === 'publicada') {
    params.push(status); conds.push(`av.status = $${i++}`)
  }

  const buscaAluno = searchParams.get('busca')
  if (buscaAluno && buscaAluno.trim().length >= 2) {
    params.push(buscaAluno.trim())
    conds.push(`a.nome ILIKE '%' || $${i++} || '%'`)
  }

  const conceito = searchParams.get('conceito')
  if (conceito) { params.push(conceito); conds.push(`av.conceito = $${i++}`) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(parseInt(searchParams.get('limite') || '100', 10), 500)
  params.push(limite)

  const r = await pool.query(
    `SELECT av.id, av.aluno_id, av.periodo_id, av.disciplina_id, av.professor_id,
            av.texto_descritivo, av.conceito, av.habilidades_avaliadas,
            av.status, av.criado_em, av.atualizado_em,
            a.nome AS aluno_nome, a.matricula AS aluno_matricula,
            t.codigo AS turma_codigo,
            e.nome AS escola_nome,
            d.nome AS disciplina_nome,
            p.nome AS periodo_nome,
            u.nome AS professor_nome
       FROM avaliacoes_descritivas av
       INNER JOIN alunos a ON a.id = av.aluno_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN escolas e ON e.id = a.escola_id
       LEFT JOIN disciplinas_escolares d ON d.id = av.disciplina_id
       LEFT JOIN periodos_letivos p ON p.id = av.periodo_id
       LEFT JOIN usuarios u ON u.id = av.professor_id
       ${where}
      ORDER BY av.atualizado_em DESC
      LIMIT $${i}`,
    params
  )

  // Estatísticas — herdam o mesmo escopo de escola (não vazar agregados) + ano
  const statsConds: string[] = []
  const statsParams: unknown[] = []
  let j = 1
  if (escolaScope) { statsParams.push(escolaScope); statsConds.push(`a.escola_id = $${j++}`) }
  if (ano) { statsParams.push(ano); statsConds.push(`p.ano_letivo = $${j++}`) }
  const statsWhere = statsConds.length ? `WHERE ${statsConds.join(' AND ')}` : ''

  const statsR = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE av.status = 'rascunho') AS rascunhos,
       COUNT(*) FILTER (WHERE av.status = 'publicada') AS publicadas,
       COUNT(DISTINCT av.aluno_id) AS alunos_distintos,
       COUNT(DISTINCT av.professor_id) AS professores_distintos
     FROM avaliacoes_descritivas av
     INNER JOIN alunos a ON a.id = av.aluno_id
     LEFT JOIN periodos_letivos p ON p.id = av.periodo_id
     ${statsWhere}`,
    statsParams
  )

  return NextResponse.json({
    avaliacoes: r.rows,
    estatisticas: {
      total: parseInt(statsR.rows[0]?.total || '0', 10),
      rascunhos: parseInt(statsR.rows[0]?.rascunhos || '0', 10),
      publicadas: parseInt(statsR.rows[0]?.publicadas || '0', 10),
      alunos_distintos: parseInt(statsR.rows[0]?.alunos_distintos || '0', 10),
      professores_distintos: parseInt(statsR.rows[0]?.professores_distintos || '0', 10),
    },
  })
})
