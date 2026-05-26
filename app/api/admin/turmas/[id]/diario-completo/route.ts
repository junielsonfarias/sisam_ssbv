/**
 * GET /api/admin/turmas/[id]/diario-completo
 *
 * Visualização consolidada do diário do professor para admin/técnico/escola:
 * - Frequência (bimestral por padrão)
 * - Notas escolares
 * - Conteúdo lançado no diário (diario_classe)
 *
 * Filtros:
 * - `periodo_id` (opcional): se informado, restringe frequência+notas ao período
 *   e conteúdo do diário ao intervalo data_inicio..data_fim do período.
 * - `tipos` (opcional, CSV): "frequencia,notas,conteudo" — quais seções carregar.
 *   Default: todas. Útil para economizar payload quando UI quer só uma aba.
 *
 * Permissão:
 * - administrador / tecnico: qualquer turma
 * - escola: somente turmas da sua própria `escola_id` (valida antes de consultar)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminDiarioCompleto')

export const dynamic = 'force-dynamic'

type TipoSecao = 'frequencia' | 'notas' | 'conteudo'
const TIPOS_VALIDOS: TipoSecao[] = ['frequencia', 'notas', 'conteudo']

export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  // turmaId vem do segmento dinâmico [id]
  const segments = request.nextUrl.pathname.split('/')
  const turmaId = segments[segments.indexOf('turmas') + 1]

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turmaId obrigatório' }, { status: 400 })
  }

  const { searchParams } = request.nextUrl
  const periodoId = searchParams.get('periodo_id')?.trim() || null
  const tiposRaw = searchParams.get('tipos')?.trim()
  const tipos: Set<TipoSecao> = tiposRaw
    ? new Set(tiposRaw.split(',').map(s => s.trim()).filter((t): t is TipoSecao => TIPOS_VALIDOS.includes(t as TipoSecao)))
    : new Set(TIPOS_VALIDOS)

  try {
    // 1) Buscar turma + escola e validar permissão (escola só vê suas turmas)
    const turmaRes = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, t.turno, t.ano_letivo,
              e.id as escola_id, e.nome as escola_nome
         FROM turmas t
         JOIN escolas e ON e.id = t.escola_id
        WHERE t.id = $1`,
      [turmaId]
    )

    if (turmaRes.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaRes.rows[0]

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && String(turma.escola_id) !== String(usuario.escola_id)) {
      return NextResponse.json({ mensagem: 'Sem permissão para visualizar esta turma' }, { status: 403 })
    }

    // 2) Período (se informado, busca dados; se não, retorna null e filtros aplicam ano_letivo da turma)
    let periodo: { id: string; nome: string; numero: number; data_inicio: string; data_fim: string } | null = null
    if (periodoId) {
      const pRes = await pool.query(
        `SELECT id, nome, numero, data_inicio, data_fim
           FROM periodos_letivos
          WHERE id = $1`,
        [periodoId]
      )
      if (pRes.rows.length > 0) periodo = pRes.rows[0]
    }

    // 3) Professores vinculados à turma (com nome + tipo de vínculo + disciplina se houver)
    const profRes = await pool.query(
      `SELECT pt.id as vinculo_id, pt.tipo_vinculo, pt.disciplina_id,
              u.id as professor_id, u.nome as professor_nome, u.email as professor_email,
              d.nome as disciplina_nome
         FROM professor_turmas pt
         JOIN usuarios u ON u.id = pt.professor_id
         LEFT JOIN disciplinas_escolares d ON d.id = pt.disciplina_id
        WHERE pt.turma_id = $1
          AND pt.ativo = true
          AND pt.ano_letivo = $2
        ORDER BY u.nome`,
      [turmaId, turma.ano_letivo]
    )

    // 4) Executar as 3 seções em paralelo conforme `tipos` solicitado
    const [frequenciaRes, notasRes, conteudoRes] = await Promise.all([
      tipos.has('frequencia') ? buscarFrequencia(turmaId, periodoId) : Promise.resolve(null),
      tipos.has('notas') ? buscarNotas(turmaId, periodoId) : Promise.resolve(null),
      tipos.has('conteudo') ? buscarConteudo(turmaId, periodo) : Promise.resolve(null),
    ])

    return NextResponse.json({
      turma: {
        id: turma.id,
        codigo: turma.codigo,
        nome: turma.nome,
        serie: turma.serie,
        turno: turma.turno,
        ano_letivo: turma.ano_letivo,
        escola_id: turma.escola_id,
        escola_nome: turma.escola_nome,
      },
      periodo,
      professores: profRes.rows,
      frequencia: frequenciaRes,
      notas: notasRes,
      conteudo: conteudoRes,
    })
  } catch (error) {
    log.error('Erro ao consolidar diário', error, { turmaId, periodoId })
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

// ----------------------------------------------------------------------------
// Frequência bimestral por aluno (período opcional)
// ----------------------------------------------------------------------------
async function buscarFrequencia(turmaId: string, periodoId: string | null) {
  const params: (string | null)[] = [turmaId]
  let filtroPeriodo = ''
  if (periodoId) {
    params.push(periodoId)
    filtroPeriodo = 'AND fb.periodo_id = $2'
  }

  const res = await pool.query(
    `SELECT a.id as aluno_id, a.nome as aluno_nome,
            fb.id as freq_id, fb.periodo_id, fb.dias_letivos,
            fb.presencas, fb.faltas, fb.faltas_justificadas,
            fb.percentual_frequencia, fb.observacao, fb.metodo,
            fb.atualizado_em,
            u.nome as registrado_por_nome,
            pl.nome as periodo_nome, pl.numero as periodo_numero
       FROM alunos a
       LEFT JOIN frequencia_bimestral fb
              ON fb.aluno_id = a.id
             AND fb.turma_id = $1
             ${filtroPeriodo}
       LEFT JOIN usuarios u ON u.id = fb.registrado_por
       LEFT JOIN periodos_letivos pl ON pl.id = fb.periodo_id
      WHERE a.turma_id = $1
        AND a.ativo = true
      ORDER BY a.nome`,
    params
  )

  return res.rows
}

// ----------------------------------------------------------------------------
// Notas por aluno × disciplina (período opcional)
// ----------------------------------------------------------------------------
async function buscarNotas(turmaId: string, periodoId: string | null) {
  const params: (string | null)[] = [turmaId]
  let filtroPeriodo = ''
  if (periodoId) {
    params.push(periodoId)
    filtroPeriodo = 'AND n.periodo_id = $2'
  }

  const res = await pool.query(
    `SELECT a.id as aluno_id, a.nome as aluno_nome,
            n.id as nota_id, n.disciplina_id, d.nome as disciplina_nome,
            n.periodo_id, pl.nome as periodo_nome, pl.numero as periodo_numero,
            n.nota, n.nota_recuperacao, n.nota_final, n.faltas,
            n.observacao, n.parecer_descritivo, n.atualizado_em,
            u.nome as registrado_por_nome
       FROM alunos a
       LEFT JOIN notas_escolares n
              ON n.aluno_id = a.id
             AND n.turma_id = $1
             ${filtroPeriodo}
       LEFT JOIN disciplinas_escolares d ON d.id = n.disciplina_id
       LEFT JOIN periodos_letivos pl ON pl.id = n.periodo_id
       LEFT JOIN usuarios u ON u.id = n.registrado_por
      WHERE a.turma_id = $1
        AND a.ativo = true
      ORDER BY a.nome, pl.numero, d.nome`,
    params
  )

  return res.rows
}

// ----------------------------------------------------------------------------
// Conteúdo lançado no diário (filtra por intervalo do período se informado)
// ----------------------------------------------------------------------------
async function buscarConteudo(
  turmaId: string,
  periodo: { data_inicio: string; data_fim: string } | null
) {
  const params: (string | null)[] = [turmaId]
  let filtroData = ''
  if (periodo) {
    params.push(periodo.data_inicio, periodo.data_fim)
    filtroData = 'AND dc.data_aula BETWEEN $2 AND $3'
  }

  const res = await pool.query(
    `SELECT dc.id, dc.data_aula, dc.conteudo, dc.metodologia, dc.observacoes,
            dc.criado_em, dc.atualizado_em,
            u.id as professor_id, u.nome as professor_nome,
            dc.disciplina_id, d.nome as disciplina_nome
       FROM diario_classe dc
       JOIN usuarios u ON u.id = dc.professor_id
       LEFT JOIN disciplinas_escolares d ON d.id = dc.disciplina_id
      WHERE dc.turma_id = $1
        ${filtroData}
      ORDER BY dc.data_aula DESC, dc.criado_em DESC`,
    params
  )

  return res.rows
}
