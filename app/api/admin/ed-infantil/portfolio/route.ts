/**
 * GET /api/admin/ed-infantil/portfolio
 *
 * Lista global de registros do portfólio de Educação Infantil com filtros
 * (escola, campo experiência, tipo, aluno). Visão administrativa — apenas
 * consulta. Inserção/edição é responsabilidade do professor.
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

const TIPOS = ['foto', 'video', 'audio', 'atividade', 'observacao'] as const
const CAMPOS = ['EOEU', 'CG', 'TS', 'EF', 'ET'] as const

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)

  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  // IDOR: usuário escola só vê portfólio (mídia de menores, LGPD art. 11) da
  // própria escola. Sobrescreve qualquer ?escola= do cliente.
  const escolaScope = usuario.tipo_usuario === 'escola'
    ? (usuario.escola_id || '00000000-0000-0000-0000-000000000000')
    : (searchParams.get('escola') || null)
  if (escolaScope) { params.push(escolaScope); conds.push(`a.escola_id = $${i++}`) }

  // Ano letivo (derivado de data_registro — portfólio é registrado ao longo do ano civil)
  const ano = searchParams.get('ano_letivo') || searchParams.get('ano')
  if (ano) {
    params.push(parseInt(ano, 10))
    conds.push(`EXTRACT(YEAR FROM p.data_registro) = $${i++}`)
  }

  const aluno = searchParams.get('aluno')
  if (aluno) { params.push(aluno); conds.push(`p.aluno_id = $${i++}`) }

  const tipo = searchParams.get('tipo')
  if (tipo && (TIPOS as readonly string[]).includes(tipo)) {
    params.push(tipo); conds.push(`p.tipo = $${i++}`)
  }

  const campo = searchParams.get('campo')
  if (campo && (CAMPOS as readonly string[]).includes(campo)) {
    params.push(campo); conds.push(`p.campo_experiencia = $${i++}`)
  }

  const busca = searchParams.get('busca')
  if (busca && busca.trim().length >= 2) {
    params.push(busca.trim())
    conds.push(`a.nome ILIKE '%' || $${i++} || '%'`)
  }

  const dataInicio = searchParams.get('dataInicio')
  if (dataInicio) { params.push(dataInicio); conds.push(`p.data_registro >= $${i++}`) }

  const dataFim = searchParams.get('dataFim')
  if (dataFim) { params.push(dataFim); conds.push(`p.data_registro <= $${i++}`) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(parseInt(searchParams.get('limite') || '100', 10), 300)
  params.push(limite)

  const r = await pool.query(
    `SELECT p.id, p.aluno_id, p.data_registro, p.tipo, p.titulo, p.descricao,
            p.arquivo_url, p.arquivo_tamanho_bytes, p.campo_experiencia,
            p.habilidades_bncc, p.visivel_responsavel, p.criado_em,
            a.nome AS aluno_nome, a.matricula AS aluno_matricula,
            t.codigo AS turma_codigo,
            ge.nome AS grupo_etario_nome,
            e.nome AS escola_nome,
            u.nome AS professor_nome
       FROM ed_infantil_portfolio p
       INNER JOIN alunos a ON a.id = p.aluno_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN ed_infantil_grupos_etarios ge ON ge.id = t.grupo_etario_id
       LEFT JOIN escolas e ON e.id = a.escola_id
       LEFT JOIN usuarios u ON u.id = p.professor_id
       ${where}
      ORDER BY p.data_registro DESC, p.criado_em DESC
      LIMIT $${i}`,
    params
  )

  // Stats herdam o escopo de escola (não vazar agregados) + ano se informado
  const statsConds: string[] = []
  const statsParams: unknown[] = []
  let j = 1
  if (escolaScope) { statsParams.push(escolaScope); statsConds.push(`a.escola_id = $${j++}`) }
  if (ano) { statsParams.push(parseInt(ano, 10)); statsConds.push(`EXTRACT(YEAR FROM p.data_registro) = $${j++}`) }
  const statsWhere = statsConds.length ? `WHERE ${statsConds.join(' AND ')}` : ''

  const statsR = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(DISTINCT p.aluno_id) AS alunos_distintos,
       COUNT(DISTINCT p.professor_id) AS professores_distintos,
       COUNT(*) FILTER (WHERE p.visivel_responsavel = TRUE) AS visiveis_pais,
       COUNT(*) FILTER (WHERE p.tipo = 'foto') AS fotos,
       COUNT(*) FILTER (WHERE p.tipo = 'video') AS videos,
       COUNT(*) FILTER (WHERE p.tipo = 'atividade') AS atividades,
       COUNT(*) FILTER (WHERE p.tipo = 'observacao') AS observacoes
     FROM ed_infantil_portfolio p
     INNER JOIN alunos a ON a.id = p.aluno_id
     ${statsWhere}`,
    statsParams
  )

  return NextResponse.json({
    registros: r.rows,
    estatisticas: {
      total: parseInt(statsR.rows[0]?.total || '0', 10),
      alunos_distintos: parseInt(statsR.rows[0]?.alunos_distintos || '0', 10),
      professores_distintos: parseInt(statsR.rows[0]?.professores_distintos || '0', 10),
      visiveis_pais: parseInt(statsR.rows[0]?.visiveis_pais || '0', 10),
      fotos: parseInt(statsR.rows[0]?.fotos || '0', 10),
      videos: parseInt(statsR.rows[0]?.videos || '0', 10),
      atividades: parseInt(statsR.rows[0]?.atividades || '0', 10),
      observacoes: parseInt(statsR.rows[0]?.observacoes || '0', 10),
    },
  })
})
