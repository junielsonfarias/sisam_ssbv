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
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const log = createLogger('AdminDiarioCompleto')

const uuidSchema = z.string().uuid()

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
  const periodoIdRaw = searchParams.get('periodo_id')?.trim() || null
  if (periodoIdRaw && !uuidSchema.safeParse(periodoIdRaw).success) {
    return NextResponse.json({ mensagem: 'periodo_id inválido (esperado UUID)' }, { status: 400 })
  }
  const periodoId = periodoIdRaw
  const tiposRaw = searchParams.get('tipos')?.trim()
  const tipos: Set<TipoSecao> = tiposRaw
    ? new Set(tiposRaw.split(',').map(s => s.trim()).filter((t): t is TipoSecao => TIPOS_VALIDOS.includes(t as TipoSecao)))
    : new Set(TIPOS_VALIDOS)

  try {
    // 1) Buscar turma + escola e validar permissão (escola só vê suas turmas).
    // Tambem carrega data_inicio/data_fim do ano letivo cadastrado em
    // anos_letivos — necessario para alinhar a janela de dias_letivos com
    // o que a Cobertura do diario (/diario-lacunas) ja calcula.
    const turmaRes = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, t.turno, t.ano_letivo, t.sensivel,
              e.id as escola_id, e.nome as escola_nome, e.logo_url as escola_logo_url,
              al.data_inicio as ano_data_inicio, al.data_fim as ano_data_fim
         FROM turmas t
         JOIN escolas e ON e.id = t.escola_id
         LEFT JOIN anos_letivos al ON al.ano = t.ano_letivo
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

    // Auditoria de LEITURA sensível (excecao deliberada ao padrao Pt.2,
    // que so audita mutacoes). Justificativa: LGPD art. 11 - dados sensiveis.
    // Nao bloqueia em caso de falha (auditoria.service ja trata internamente).
    if (turma.sensivel) {
      registrarAuditoria({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        acao: 'DIARIO_LER_SENSIVEL',
        entidade: 'turma',
        entidadeId: turmaId,
        detalhes: {
          escola_id: turma.escola_id,
          ano_letivo: turma.ano_letivo,
          tipo_usuario: usuario.tipo_usuario,
          periodo_id: periodoId,
          secoes: Array.from(tipos),
          fonte: 'diario-completo',
        },
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
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
      tipos.has('frequencia') ? buscarFrequencia(turmaId, periodoId, periodo, turma.ano_letivo, turma.escola_id, turma.ano_data_inicio, turma.ano_data_fim) : Promise.resolve(null),
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
        escola_logo_url: turma.escola_logo_url,
        sensivel: turma.sensivel,
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
// Frequência por aluno (período opcional)
//
// `dias_letivos` = total de dias letivos do periodo, calculado via funcao
// SQL contar_dias_letivos(ano_letivo_id, escola_id, dt_ini, dt_fim) que
// considera dias uteis + calendario_eventos (feriados, recessos, reposicoes).
// E o MESMO valor para todos os alunos do escopo — entao a divisao para
// percentual fica: presencas / dias_letivos.
//
// Quando ja existe `frequencia_bimestral` para o aluno+periodo, usa esses
// valores (snapshot oficial). Senao, agrega `frequencia_diaria` em tempo
// real (lancamentos do professor migram instantaneamente).
// ----------------------------------------------------------------------------
async function buscarFrequencia(
  turmaId: string,
  periodoId: string | null,
  periodo: { data_inicio: string; data_fim: string } | null,
  anoLetivo: string,
  escolaId: string,
  anoDataInicio: string | null,
  anoDataFim: string | null,
) {
  // Faixa de datas: periodo (prioridade) > datas reais cadastradas em
  // anos_letivos > fallback Jan 1 - Dez 31. Garante alinhamento com a
  // mesma janela usada pelo endpoint de Cobertura do diario.
  const dataInicio = periodo?.data_inicio ?? anoDataInicio ?? `${anoLetivo}-01-01`
  const dataFim = periodo?.data_fim ?? anoDataFim ?? `${anoLetivo}-12-31`

  // 1) Resolve ano_letivo_id (UUID) — necessario para contar_dias_letivos.
  const anoRes = await pool.query(
    'SELECT id FROM anos_letivos WHERE ano = $1 LIMIT 1',
    [anoLetivo]
  )
  const anoLetivoId: string | null = anoRes.rows[0]?.id ?? null

  // 2) Total de dias letivos do escopo (igual para todos os alunos).
  // Se nao houver ano cadastrado, usa fallback simples: dias uteis seg-sex.
  let diasLetivosEscopo = 0
  if (anoLetivoId) {
    const dlRes = await pool.query(
      'SELECT contar_dias_letivos($1::uuid, $2::uuid, $3::date, $4::date) AS total',
      [anoLetivoId, escolaId, dataInicio, dataFim]
    )
    diasLetivosEscopo = parseInt(dlRes.rows[0]?.total ?? '0', 10)
  } else {
    const dlRes = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM generate_series($1::date, $2::date, '1 day') d
        WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5`,
      [dataInicio, dataFim]
    )
    diasLetivosEscopo = parseInt(dlRes.rows[0]?.total ?? '0', 10)
  }

  // 3) Agregar frequencia por aluno + COALESCE com frequencia_bimestral.
  const params: (string | null | number)[] = [turmaId, dataInicio, dataFim, diasLetivosEscopo]
  let filtroBimestral = ''
  if (periodoId) {
    params.push(periodoId)
    filtroBimestral = 'AND fb.periodo_id = $5'
  }

  const res = await pool.query(
    `SELECT a.id as aluno_id, a.nome as aluno_nome,
            fb.id as freq_id, fb.periodo_id, fb.observacao, fb.metodo,
            fb.atualizado_em,
            u.nome as registrado_por_nome,
            pl.nome as periodo_nome, pl.numero as periodo_numero,
            -- dias_letivos: prefere snapshot da frequencia_bimestral,
            -- senao usa total do escopo (mesmo para todos).
            COALESCE(fb.dias_letivos, $4::int) AS dias_letivos,
            COALESCE(fb.presencas, fda.presencas, 0) AS presencas,
            COALESCE(fb.faltas, fda.faltas, 0) AS faltas,
            COALESCE(fb.faltas_justificadas, fda.faltas_justificadas, 0) AS faltas_justificadas,
            -- Percentual: presencas / dias_letivos_total * 100.
            COALESCE(
              fb.percentual_frequencia,
              CASE WHEN $4::int > 0
                THEN ROUND((COALESCE(fda.presencas, 0)::numeric / $4) * 100, 2)
                ELSE NULL
              END
            ) AS percentual_frequencia,
            -- Marca a origem do dado para a UI poder destacar
            CASE WHEN fb.id IS NOT NULL THEN 'bimestral'
                 WHEN COALESCE(fda.presencas, 0) + COALESCE(fda.faltas, 0) + COALESCE(fda.faltas_justificadas, 0) > 0 THEN 'diaria'
                 ELSE 'vazio'
            END AS origem
       FROM alunos a
       LEFT JOIN frequencia_bimestral fb
              ON fb.aluno_id = a.id
             AND fb.turma_id = $1
             ${filtroBimestral}
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) FILTER (WHERE fd.status = 'presente')::int AS presencas,
           COUNT(*) FILTER (WHERE fd.status = 'ausente')::int AS faltas,
           COUNT(*) FILTER (WHERE fd.status = 'justificado')::int AS faltas_justificadas
         FROM frequencia_diaria fd
         WHERE fd.aluno_id = a.id
           AND fd.turma_id = $1
           AND fd.data BETWEEN $2::date AND $3::date
       ) fda ON true
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
