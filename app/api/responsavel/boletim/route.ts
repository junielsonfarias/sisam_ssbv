import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { calcularMediaAnual, type PesoPeriodo } from '@/lib/services/media-anual'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/boletim?aluno_id=UUID
 * Retorna notas, frequencia e boletim completo de um filho do responsavel
 * Valida que o aluno pertence ao responsavel logado
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id e obrigatorio' }, { status: 400 })
    }

    // Verificar vinculo: o aluno pertence ao responsavel?
    const vinculoResult = await pool.query(
      "SELECT id FROM responsaveis_alunos WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true AND status = 'aprovado'",
      [usuario.id, alunoId]
    )
    if (vinculoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao vinculado a este responsavel' }, { status: 403 })
    }

    // Buscar dados do aluno
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao,
              a.data_nascimento, a.pcd, a.turma_id, a.escola_id,
              e.nome AS escola_nome,
              t.codigo AS turma_codigo, t.nome AS turma_nome
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Buscar em paralelo: notas, frequencia, disciplinas, periodos
    const [notasResult, freqResult, disciplinasResult, periodosResult] = await Promise.all([
      // Notas escolares
      pool.query(
        `SELECT ne.nota_final, ne.nota_recuperacao, ne.faltas,
                ne.disciplina_id, ne.periodo_id,
                d.nome AS disciplina, d.abreviacao, d.codigo AS disciplina_codigo,
                p.nome AS periodo, p.numero
         FROM notas_escolares ne
         INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
         INNER JOIN periodos_letivos p ON ne.periodo_id = p.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY p.numero, d.nome`,
        [alunoId, anoLetivo]
      ),
      // Frequencia por periodo (consolidada).
      //
      // Padrao alinhado com /api/admin/turmas/[id]/diario-completo e
      // /api/boletim — mesma estrategia do fix do dia 30/05 (commit
      // d3dd97d):
      // - dias_letivos via contar_dias_letivos() (respeita calendario)
      // - presencas/faltas: COUNT FILTER em frequencia_diaria
      // - COALESCE com frequencia_bimestral preserva snapshot oficial
      // - CTE tipo_primario evita duplicacao bimestre+semestre derivado
      //
      // Bug anterior: dependia 100% de frequencia_bimestral (snapshot
      // vazio em prod, 0 registros) — boletim do responsavel mostrava
      // sempre vazio mesmo com lancamentos diarios feitos pelo professor.
      pool.query(
        `WITH tipo_primario AS (
           SELECT CASE
             WHEN COUNT(*) FILTER (WHERE tipo = 'bimestre')  > 0 THEN 'bimestre'
             WHEN COUNT(*) FILTER (WHERE tipo = 'trimestre') > 0 THEN 'trimestre'
             WHEN COUNT(*) FILTER (WHERE tipo = 'semestre')  > 0 THEN 'semestre'
             ELSE NULL
           END AS tipo
             FROM periodos_letivos
            WHERE ano_letivo = $2
         ),
         escopos AS (
           SELECT pl.id AS periodo_id, pl.nome, pl.numero, pl.tipo,
                  pl.data_inicio, pl.data_fim,
                  al.id AS ano_letivo_id
             FROM periodos_letivos pl
             LEFT JOIN anos_letivos al ON al.ano = pl.ano_letivo
            WHERE pl.ano_letivo = $2
              AND pl.tipo = (SELECT tipo FROM tipo_primario)
              AND pl.data_inicio IS NOT NULL
              AND pl.data_fim IS NOT NULL
         ),
         dias AS (
           SELECT e.periodo_id,
                  CASE
                    WHEN e.ano_letivo_id IS NOT NULL AND $3::uuid IS NOT NULL
                      THEN contar_dias_letivos(e.ano_letivo_id, $3::uuid, e.data_inicio, e.data_fim)
                    ELSE (
                      SELECT COUNT(*)::int
                        FROM generate_series(e.data_inicio, e.data_fim, '1 day') d
                       WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
                    )
                  END AS dias_letivos
             FROM escopos e
         ),
         -- Frequencia diaria agregada por periodo (anos iniciais)
         fd_agg AS (
           SELECT e.periodo_id,
                  COUNT(fd.id) FILTER (WHERE fd.status = 'presente')::int    AS presencas,
                  COUNT(fd.id) FILTER (WHERE fd.status = 'ausente')::int     AS faltas,
                  COUNT(fd.id) FILTER (WHERE fd.status = 'justificado')::int AS justificadas,
                  COUNT(fd.id)::int AS total
             FROM escopos e
             LEFT JOIN frequencia_diaria fd
                    ON fd.aluno_id = $1 AND fd.turma_id = $4::uuid
                   AND fd.data BETWEEN e.data_inicio AND e.data_fim
            GROUP BY e.periodo_id
         ),
         -- Frequencia por hora-aula agregada a nivel de DIA (anos finais 6-9):
         -- o aluno conta presente no dia se esteve presente em ao menos 1 aula.
         -- Sem isso, a frequencia de 6-9 so aparecia apos a agregacao manual.
         fha_agg AS (
           SELECT e.periodo_id,
                  COUNT(*) FILTER (WHERE dh.presente)::int     AS presencas,
                  COUNT(*) FILTER (WHERE NOT dh.presente)::int AS faltas,
                  COUNT(*)::int AS total
             FROM escopos e
             JOIN (
               SELECT data, BOOL_OR(presente) AS presente
                 FROM frequencia_hora_aula
                WHERE aluno_id = $1 AND turma_id = $4::uuid
                GROUP BY data
             ) dh ON dh.data BETWEEN e.data_inicio AND e.data_fim
            GROUP BY e.periodo_id
         )
         SELECT e.numero AS bimestre,
                d.dias_letivos AS aulas_dadas,
                COALESCE(fb.presencas,
                         CASE WHEN COALESCE(fd.total,0) > 0 THEN fd.presencas
                              WHEN COALESCE(fha.total,0) > 0 THEN fha.presencas
                              ELSE 0 END) AS presencas,
                COALESCE(fb.faltas,
                         CASE WHEN COALESCE(fd.total,0) > 0 THEN fd.faltas
                              WHEN COALESCE(fha.total,0) > 0 THEN fha.faltas
                              ELSE 0 END) AS faltas,
                COALESCE(fb.faltas_justificadas, COALESCE(fd.justificadas, 0)) AS faltas_justificadas,
                COALESCE(fb.percentual_frequencia,
                         CASE WHEN d.dias_letivos > 0
                              THEN ROUND(
                                ((CASE WHEN COALESCE(fd.total,0) > 0 THEN fd.presencas
                                       WHEN COALESCE(fha.total,0) > 0 THEN fha.presencas
                                       ELSE 0 END)::numeric / d.dias_letivos) * 100, 2)
                              ELSE NULL
                         END) AS percentual_frequencia,
                e.nome AS periodo_nome
           FROM escopos e
           JOIN dias d ON d.periodo_id = e.periodo_id
           LEFT JOIN frequencia_bimestral fb ON fb.aluno_id = $1 AND fb.periodo_id = e.periodo_id
           LEFT JOIN fd_agg fd ON fd.periodo_id = e.periodo_id
           LEFT JOIN fha_agg fha ON fha.periodo_id = e.periodo_id
          ORDER BY e.numero`,
        [alunoId, anoLetivo, aluno.escola_id || null, aluno.turma_id || null]
      ),
      // Disciplinas da turma
      pool.query(
        `SELECT DISTINCT d.id, d.nome, d.codigo, d.abreviacao, d.ordem
         FROM disciplinas_escolares d
         INNER JOIN notas_escolares ne ON ne.disciplina_id = d.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY d.ordem, d.nome`,
        [alunoId, anoLetivo]
      ),
      // Periodos letivos
      pool.query(
        `SELECT DISTINCT p.id, p.nome, p.numero, p.data_inicio, p.data_fim
         FROM periodos_letivos p
         INNER JOIN notas_escolares ne ON ne.periodo_id = p.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY p.numero`,
        [alunoId, anoLetivo]
      ),
    ])

    // Organizar notas por disciplina e periodo
    const notas: Record<string, Record<string, any>> = {}
    for (const row of notasResult.rows) {
      if (!notas[row.disciplina_id]) notas[row.disciplina_id] = {}
      notas[row.disciplina_id][row.numero] = {
        nota_final: row.nota_final,
        nota_recuperacao: row.nota_recuperacao,
        faltas: row.faltas,
      }
    }

    // Calcular frequencia geral
    let totalFaltas = 0
    let totalAulas = 0
    for (const f of freqResult.rows) {
      totalFaltas += parseInt(f.faltas) || 0
      totalAulas += parseInt(f.aulas_dadas) || 0
    }
    const frequenciaGeral = totalAulas > 0 ? Math.round(((totalAulas - totalFaltas) / totalAulas) * 1000) / 10 : 0

    // Média anual: usa o MESMO helper do boletim oficial e do fechamento, para
    // que o número exibido ao responsável nunca divirja (honra formula_media,
    // pesos, arredondamento e o critério de aprovação da série/escola).
    const regraResult = await pool.query(
      `SELECT
          COALESCE(ra_over.formula_media, ra.formula_media) AS formula_efetiva,
          COALESCE(ra_over.pesos_periodos, ra.pesos_periodos) AS pesos_efetivos,
          COALESCE(ra_over.qtd_periodos, ra.qtd_periodos) AS qtd_periodos,
          ra.arredondamento, ra.casas_decimais,
          ra.media_aprovacao AS regra_media_aprovacao,
          era.media_aprovacao AS escola_media_aprovacao
       FROM series_escolares se
       LEFT JOIN regras_avaliacao ra ON ra.id = se.regra_avaliacao_id
       LEFT JOIN escola_regras_avaliacao era ON era.escola_id = $2 AND era.serie_escolar_id = se.id AND era.ativo = true
       LEFT JOIN regras_avaliacao ra_over ON ra_over.id = era.regra_avaliacao_id
       WHERE se.codigo = CASE
         WHEN $1 ILIKE '%creche%' THEN 'CRE'
         WHEN $1 ILIKE '%pré i%' OR $1 ILIKE '%pre i%' THEN 'PRE1'
         WHEN $1 ILIKE '%pré ii%' OR $1 ILIKE '%pre ii%' THEN 'PRE2'
         WHEN $1 ILIKE '%eja%1%' THEN 'EJA1'
         WHEN $1 ILIKE '%eja%2%' THEN 'EJA2'
         WHEN $1 ILIKE '%eja%3%' THEN 'EJA3'
         WHEN $1 ILIKE '%eja%4%' THEN 'EJA4'
         ELSE REGEXP_REPLACE($1, '[^0-9]', '', 'g')
       END
       LIMIT 1`,
      [aluno.serie || '', aluno.escola_id]
    )
    const regra = regraResult.rows[0] || null
    const formulaMedia = regra?.formula_efetiva || 'media_aritmetica'
    const pesosConfig: PesoPeriodo[] = regra?.pesos_efetivos
      ? (typeof regra.pesos_efetivos === 'string' ? JSON.parse(regra.pesos_efetivos) : regra.pesos_efetivos)
      : []
    const pesosPeriodos: PesoPeriodo[] = pesosConfig.length > 0
      ? pesosConfig
      : Array.from({ length: regra?.qtd_periodos || 4 }, (_, i) => ({ periodo: i + 1, peso: 1 }))
    const mediaAprovacao = parseFloat(regra?.escola_media_aprovacao) || parseFloat(regra?.regra_media_aprovacao) || 6
    const casasDecimais = regra?.casas_decimais ?? 1

    // Média por disciplina (mesmo cálculo do oficial) + média geral
    const medias: Record<string, number | null> = {}
    const mediasValidas: number[] = []
    for (const d of disciplinasResult.rows) {
      const notasPorPeriodo = new Map<number, number>()
      for (const [numero, n] of Object.entries(notas[d.id] || {})) {
        const nf = parseFloat(String((n as any).nota_final))
        if (!isNaN(nf)) notasPorPeriodo.set(Number(numero), nf)
      }
      const r = calcularMediaAnual(notasPorPeriodo, {
        formula: formulaMedia, pesosPeriodos, casasDecimais, arredondamento: regra?.arredondamento || 'normal',
      })
      const m = r.periodos_com_nota > 0 ? r.media : null
      medias[d.id] = m
      if (m !== null) mediasValidas.push(m)
    }
    const mediaGeral = mediasValidas.length > 0
      ? Math.round((mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length) * 10) / 10
      : null

    return NextResponse.json({
      aluno,
      disciplinas: disciplinasResult.rows,
      periodos: periodosResult.rows,
      notas,
      medias,
      media_geral: mediaGeral,
      media_aprovacao: mediaAprovacao,
      frequencia: freqResult.rows,
      frequencia_geral: frequenciaGeral,
      total_faltas: totalFaltas,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar boletim:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
