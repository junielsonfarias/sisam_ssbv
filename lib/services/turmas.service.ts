import pool from '@/database/connection'

// ============================================================================
// Service de Turmas — lógica compartilhada entre admin e professor
// ============================================================================

export interface AlunoTurma {
  id: string
  codigo: string
  nome: string
  serie: string
  ano_letivo: string
  ativo: boolean
  data_nascimento: string | null
  pcd: boolean
  situacao: string
  data_matricula: string | null
  data_transferencia: string | null
}

export interface TurmaComEscola {
  id: string
  codigo: string
  nome: string
  serie: string
  ano_letivo: string
  escola_id: string
  escola_nome: string
  polo_id: string | null
  polo_nome: string | null
  multiserie: boolean
  multietapa: boolean
}

export interface TurmaProfessor {
  vinculo_id: string
  tipo_vinculo: string
  ano_letivo: string
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  turma_codigo: string
  escola_id: string
  escola_nome: string
  disciplina_id: string | null
  disciplina_nome: string | null
  disciplina_abreviacao: string | null
  etapa: string | null
  total_alunos: number
}

export type StatusLancamento = 'em_dia' | 'pendente' | 'sem_lancamento' | 'sem_letivos'

export interface StatusSemanalTurma {
  dias_letivos: number      // dias letivos nos ultimos 7 dias corridos
  dias_lancados: number     // dias DISTINTOS com >=1 registro em frequencia_diaria OU frequencia_hora_aula
  status: StatusLancamento
}

/**
 * Busca alunos de uma turma (incluindo transferidos/inativos)
 * Usado por: admin/turmas/[id]/alunos, professor/alunos
 */
export async function buscarAlunosDaTurma(turmaId: string): Promise<AlunoTurma[]> {
  const result = await pool.query(
    `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.ativo,
            a.data_nascimento, a.pcd, a.situacao, a.data_matricula,
            (SELECT hs.data FROM historico_situacao hs
             WHERE hs.aluno_id = a.id AND hs.situacao = 'transferido'
             ORDER BY hs.data DESC, hs.criado_em DESC LIMIT 1
            ) as data_transferencia
     FROM alunos a
     WHERE a.turma_id = $1
     ORDER BY
       CASE WHEN a.situacao IN ('transferido', 'abandono') THEN 1 ELSE 0 END,
       a.nome`,
    [turmaId]
  )

  return result.rows
}

/**
 * Busca turmas vinculadas a um professor.
 *
 * Cruza pt.ano_letivo = t.ano_letivo para invalidar vinculos orfaos
 * (ex: vinculo de 2025 ainda marcado ativo apos virada de ano).
 *
 * @param anoLetivo Filtra pelo ano letivo (default: ano_letivo ativo em anos_letivos).
 *                  Quando nao houver ano marcado como ativo, usa o ano corrente.
 *
 * Usado por: GET /api/professor/turmas
 */
export async function buscarTurmasDoProfessor(
  professorId: string,
  anoLetivo?: string,
): Promise<TurmaProfessor[]> {
  const ano = anoLetivo || (await buscarAnoLetivoAtivo())

  const result = await pool.query(
    `SELECT pt.id as vinculo_id, pt.tipo_vinculo, pt.ano_letivo,
            t.id as turma_id, t.nome as turma_nome, t.serie, t.turno, t.codigo as turma_codigo,
            e.id as escola_id, e.nome as escola_nome,
            de.id as disciplina_id, de.nome as disciplina_nome, de.abreviacao as disciplina_abreviacao,
            se.etapa,
            (SELECT COUNT(*) FROM alunos a WHERE a.turma_id = t.id AND a.ativo = true AND a.situacao = 'cursando') as total_alunos
     FROM professor_turmas pt
     INNER JOIN turmas t ON t.id = pt.turma_id
     INNER JOIN escolas e ON e.id = t.escola_id
     LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
     LEFT JOIN series_escolares se ON se.codigo = t.serie OR se.nome = t.serie
     WHERE pt.professor_id = $1
       AND pt.ativo = true
       AND pt.ano_letivo = t.ano_letivo
       AND pt.ano_letivo = $2
     ORDER BY e.nome, t.turno, t.serie, t.nome, de.nome`,
    [professorId, ano]
  )

  return result.rows
}

/**
 * Calcula o status de lancamento de frequencia nos ULTIMOS 7 DIAS CORRIDOS
 * para um conjunto de turmas, em uma unica query (sem N+1).
 *
 * Status:
 *   - em_dia:         dias_letivos > 0 E dias_lancados >= dias_letivos
 *   - pendente:       dias_letivos > 0 E 0 < dias_lancados < dias_letivos
 *   - sem_lancamento: dias_letivos > 0 E dias_lancados == 0
 *   - sem_letivos:    dias_letivos == 0 (semana toda foi feriado/recesso/fim de semana)
 *
 * Considera lancamento em frequencia_diaria UNION frequencia_hora_aula —
 * basta UM registro qualquer no dia para nao virar pendente (cobre tanto
 * anos iniciais como anos finais sem ramificar). Usa contar_dias_letivos()
 * (mesma funcao SQL do admin/diario) para contar dias letivos corretos
 * — considera calendario_eventos da escola.
 *
 * Usado por: GET /api/professor/turmas (badge de status no card).
 */
export async function buscarStatusSemanalDasTurmas(
  turmaIds: string[],
): Promise<Map<string, StatusSemanalTurma>> {
  const mapa = new Map<string, StatusSemanalTurma>()
  if (turmaIds.length === 0) return mapa

  const result = await pool.query(
    `WITH escopo AS (
       SELECT t.id AS turma_id, t.escola_id, t.ano_letivo,
              al.id AS ano_letivo_id,
              (CURRENT_DATE - INTERVAL '6 days')::date AS dt_ini,
              CURRENT_DATE AS dt_fim
         FROM turmas t
         LEFT JOIN anos_letivos al ON al.ano = t.ano_letivo
        WHERE t.id = ANY($1)
     ),
     dias_letivos_por_turma AS (
       SELECT e.turma_id,
              CASE WHEN e.ano_letivo_id IS NOT NULL
                   THEN contar_dias_letivos(e.ano_letivo_id, e.escola_id, e.dt_ini, e.dt_fim)
                   ELSE (
                     SELECT COUNT(*)::int
                       FROM generate_series(e.dt_ini, e.dt_fim, '1 day') d
                      WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
                   )
              END AS dias_letivos
         FROM escopo e
     ),
     lancamentos AS (
       SELECT e.turma_id, fd.data
         FROM escopo e
         JOIN frequencia_diaria fd
              ON fd.turma_id = e.turma_id
             AND fd.data BETWEEN e.dt_ini AND e.dt_fim
       UNION
       SELECT e.turma_id, fha.data
         FROM escopo e
         JOIN frequencia_hora_aula fha
              ON fha.turma_id = e.turma_id
             AND fha.data BETWEEN e.dt_ini AND e.dt_fim
     )
     SELECT dl.turma_id, dl.dias_letivos,
            COALESCE((SELECT COUNT(DISTINCT data)
                        FROM lancamentos l
                       WHERE l.turma_id = dl.turma_id), 0)::int AS dias_lancados
       FROM dias_letivos_por_turma dl`,
    [turmaIds]
  )

  for (const row of result.rows as Array<{ turma_id: string; dias_letivos: number; dias_lancados: number }>) {
    const diasLetivos = row.dias_letivos
    const diasLancados = row.dias_lancados
    let status: StatusLancamento
    if (diasLetivos === 0) status = 'sem_letivos'
    else if (diasLancados === 0) status = 'sem_lancamento'
    else if (diasLancados >= diasLetivos) status = 'em_dia'
    else status = 'pendente'

    mapa.set(row.turma_id, { dias_letivos: diasLetivos, dias_lancados: diasLancados, status })
  }

  return mapa
}

/**
 * Verifica se o professor tem vinculo ATIVO na turma para o ano letivo dela.
 * Usado por endpoints admin que aceitam tambem `tipo='professor'` (diario
 * consolidado, lacunas, detalhado) para restringir o acesso apenas as suas
 * proprias turmas — espelha o filtro de buscarTurmasDoProfessor.
 *
 * Regra: pt.ativo=true AND pt.ano_letivo=anoLetivoDaTurma. Nao confiamos
 * em pt.ano_letivo isolado porque a turma pode ter sido finalizada em outro
 * ano e o vinculo legado continuar marcado ativo (defesa em profundidade
 * registrada na Pt.6).
 */
export async function professorEstaVinculadoNaTurma(
  professorId: string,
  turmaId: string,
  anoLetivoDaTurma: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
       FROM professor_turmas
      WHERE professor_id = $1
        AND turma_id = $2
        AND ano_letivo = $3
        AND ativo = true
      LIMIT 1`,
    [professorId, turmaId, anoLetivoDaTurma]
  )
  return result.rows.length > 0
}

/**
 * Retorna o ano letivo marcado como ativo em anos_letivos.
 * Fallback: ano corrente quando a tabela nao existir ou nao houver ano ativo.
 */
export async function buscarAnoLetivoAtivo(): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT ano FROM anos_letivos WHERE status = 'ativo' ORDER BY ano DESC LIMIT 1`
    )
    if (result.rows.length > 0) return result.rows[0].ano
  } catch {
    /* tabela pode nao existir em ambientes legacy */
  }
  return new Date().getFullYear().toString()
}

/**
 * Lista os anos letivos em que o professor tem vinculo ativo,
 * em ordem decrescente, com o status do ano (ativo/finalizado/planejamento).
 *
 * Usado por: GET /api/professor/turmas (seletor de ano na UI)
 */
export async function buscarAnosLetivosDoProfessor(
  professorId: string,
): Promise<Array<{ ano: string; status: string | null }>> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT pt.ano_letivo as ano, al.status
         FROM professor_turmas pt
         LEFT JOIN anos_letivos al ON al.ano = pt.ano_letivo
        WHERE pt.professor_id = $1
          AND pt.ativo = true
        ORDER BY pt.ano_letivo DESC`,
      [professorId]
    )
    return result.rows
  } catch {
    // Fallback: tabela anos_letivos pode nao existir em instalacoes legacy.
    const result = await pool.query(
      `SELECT DISTINCT pt.ano_letivo as ano
         FROM professor_turmas pt
        WHERE pt.professor_id = $1
          AND pt.ativo = true
        ORDER BY pt.ano_letivo DESC`,
      [professorId]
    )
    return result.rows.map(r => ({ ano: r.ano, status: null }))
  }
}

/**
 * Busca turma com dados da escola e polo
 * Usado por: turmas/[id]/alunos (verificação de acesso)
 */
export async function buscarTurmaComEscola(turmaId: string): Promise<TurmaComEscola | null> {
  const result = await pool.query(
    `SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
            e.nome as escola_nome, e.polo_id, p.nome as polo_nome,
            COALESCE(t.multiserie, false) as multiserie,
            COALESCE(t.multietapa, false) as multietapa
     FROM turmas t
     INNER JOIN escolas e ON t.escola_id = e.id
     LEFT JOIN polos p ON e.polo_id = p.id
     WHERE t.id = $1`,
    [turmaId]
  )

  return result.rows[0] || null
}

/**
 * Verifica se turma tem alunos ativos (antes de deletar)
 */
export async function verificarAlunosAtivos(turmaId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as total FROM alunos WHERE turma_id = $1 AND ativo = true',
    [turmaId]
  )

  return parseInt(result.rows[0].total)
}
