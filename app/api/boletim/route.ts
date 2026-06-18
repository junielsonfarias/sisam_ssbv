import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('Boletim')

export const dynamic = 'force-dynamic'

// ============================================================================
// RATE LIMITING (LGPD — 30 req/15min por IP)
// ============================================================================
const boletimLimiter = new Map<string, { count: number; resetAt: number }>()
const BOLETIM_MAX = 5
const BOLETIM_WINDOW = 15 * 60 * 1000

/** Delay progressivo baseado em tentativas recentes (ms) */
function getProgressiveDelay(ip: string): number {
  const entry = boletimLimiter.get(ip)
  if (!entry || entry.count <= 1) return 0
  // 500ms por tentativa após a primeira (máx 3s)
  return Math.min(entry.count * 500, 3000)
}

function checkBoletimRate(ip: string): boolean {
  const now = Date.now()
  const entry = boletimLimiter.get(ip)
  if (!entry || now > entry.resetAt) {
    boletimLimiter.set(ip, { count: 1, resetAt: now + BOLETIM_WINDOW })
    return true
  }
  if (entry.count >= BOLETIM_MAX) return false
  entry.count++
  return true
}

// ============================================================================
// CACHE EM MEMÓRIA (5 min TTL — reduz 7 queries para 0 em consultas repetidas)
// ============================================================================
const boletimCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
const CACHE_MAX_ENTRIES = 2000   // Limite de memória (~2000 alunos * ~5KB = ~10MB)

function getCacheKey(codigo: string | null, cpf: string | null, dataNascimento: string | null, anoLetivo: string): string {
  if (codigo) return `cod:${codigo}:${anoLetivo}`
  // V5 fix (PII): hash do CPF+data para a chave em memória — evita que
  // CPF em texto plano vaze em heap dumps / inspeção de processo.
  const hash = crypto.createHash('sha256').update(`${cpf}|${dataNascimento}`).digest('hex').slice(0, 24)
  return `cpf:${hash}:${anoLetivo}`
}

function getFromCache(key: string): any | null {
  const entry = boletimCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    boletimCache.delete(key)
    return null
  }
  return entry.data
}

function setInCache(key: string, data: any): void {
  // Evictar entradas antigas se atingir limite
  if (boletimCache.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now()
    for (const [k, v] of boletimCache) {
      if (now > v.expiresAt) boletimCache.delete(k)
    }
    // Se ainda cheio, remover as mais antigas (FIFO)
    if (boletimCache.size >= CACHE_MAX_ENTRIES) {
      const keysToDelete = Array.from(boletimCache.keys()).slice(0, Math.floor(CACHE_MAX_ENTRIES * 0.2))
      for (const k of keysToDelete) boletimCache.delete(k)
    }
  }
  boletimCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

// Cleanup a cada 10 minutos (rate limiter + cache)
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of boletimLimiter) {
    if (now > entry.resetAt) boletimLimiter.delete(ip)
  }
  for (const [key, entry] of boletimCache) {
    if (now > entry.expiresAt) boletimCache.delete(key)
  }
}, 10 * 60 * 1000)

/**
 * GET /api/boletim
 *
 * Endpoint publico para consulta de boletim escolar completo.
 * Busca por codigo do aluno OU cpf + data_nascimento.
 * Rate limited: 30 req/15min por IP (proteção LGPD).
 *
 * Retorna:
 * - Dados do aluno (nome, escola, turma, serie, situacao, pcd)
 * - Disciplinas cadastradas para a turma/serie
 * - Notas escolares por periodo (bimestre)
 * - Resultados das avaliacoes SISAM (diagnostica, final)
 * - Frequencia bimestral
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkBoletimRate(ip)) {
      return NextResponse.json(
        { mensagem: 'Muitas consultas. Tente novamente em alguns minutos.' },
        { status: 429 }
      )
    }

    // Delay progressivo anti-enumeração
    const delay = getProgressiveDelay(ip)
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo')?.trim()
    const cpfRaw = searchParams.get('cpf')?.trim()
    const dataNascimento = searchParams.get('data_nascimento')?.trim()
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    // Mensagem genérica para qualquer falha de validação (anti-enumeração)
    const MENSAGEM_NAO_ENCONTRADO = 'Dados não encontrados'

    if (!codigo && (!cpfRaw || !dataNascimento)) {
      return NextResponse.json(
        { mensagem: MENSAGEM_NAO_ENCONTRADO },
        { status: 404 }
      )
    }

    const cpf = cpfRaw ? cpfRaw.replace(/\D/g, '') : null

    if (cpf && cpf.length !== 11) {
      return NextResponse.json(
        { mensagem: MENSAGEM_NAO_ENCONTRADO },
        { status: 404 }
      )
    }

    if (dataNascimento) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        return NextResponse.json(
          { mensagem: MENSAGEM_NAO_ENCONTRADO },
          { status: 404 }
        )
      }
      const ano = parseInt(dataNascimento.substring(0, 4))
      if (ano < 1950 || ano > new Date().getFullYear()) {
        return NextResponse.json(
          { mensagem: MENSAGEM_NAO_ENCONTRADO },
          { status: 404 }
        )
      }
    }

    // ============================================
    // CACHE: verificar se já temos resultado em memória
    // ============================================
    const cacheKey = getCacheKey(codigo || null, cpf, dataNascimento || null, anoLetivo)
    const cached = getFromCache(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('X-Cache', 'HIT')
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
      return response
    }

    // ============================================
    // 1. Buscar aluno
    // ============================================
    let alunoQuery: string
    let alunoParams: any[]

    if (codigo) {
      alunoQuery = `
        SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao, a.pcd,
               a.data_nascimento, a.turma_id, a.escola_id,
               e.nome as escola_nome,
               t.codigo as turma_codigo, t.nome as turma_nome, t.serie as turma_serie
        FROM alunos a
        INNER JOIN escolas e ON a.escola_id = e.id
        LEFT JOIN turmas t ON a.turma_id = t.id
        WHERE a.codigo = $1 AND a.ativo = true AND a.ano_letivo = $2`
      alunoParams = [codigo, anoLetivo]
    } else {
      alunoQuery = `
        SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao, a.pcd,
               a.data_nascimento, a.turma_id, a.escola_id,
               e.nome as escola_nome,
               t.codigo as turma_codigo, t.nome as turma_nome, t.serie as turma_serie
        FROM alunos a
        INNER JOIN escolas e ON a.escola_id = e.id
        LEFT JOIN turmas t ON a.turma_id = t.id
        WHERE a.cpf = $1 AND a.data_nascimento = $2 AND a.ativo = true AND a.ano_letivo = $3`
      alunoParams = [cpf, dataNascimento, anoLetivo]
    }

    const alunoResult = await pool.query(alunoQuery, alunoParams)

    if (alunoResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: MENSAGEM_NAO_ENCONTRADO },
        { status: 404 }
      )
    }

    const aluno = alunoResult.rows[0]

    // Helper: query segura que retorna rows vazio em caso de erro
    const safeQuery = async (sql: string, params: any[] = [], label: string = '') => {
      try {
        return await pool.query(sql, params)
      } catch (err: unknown) {
        log.error(`Erro em ${label}: ${(err as Error)?.message}`, err)
        return { rows: [] }
      }
    }

    // Executar todas as queries em paralelo (cada uma tolerante a falha)
    const [disciplinasResult, periodosResult, notasResult, sisamResult, frequenciaResult, freqDiariaResult] = await Promise.all([
      // 2. Disciplinas
      safeQuery(
        `SELECT id, nome, codigo, abreviacao, ordem FROM disciplinas_escolares WHERE ativo = true ORDER BY ordem, nome`,
        [], 'disciplinas'
      ),
      // 3. Periodos letivos
      safeQuery(
        `SELECT id, nome, tipo, numero, data_inicio, data_fim FROM periodos_letivos WHERE ano_letivo = $1 AND ativo = true ORDER BY numero`,
        [anoLetivo], 'periodos'
      ),
      // 4. Notas escolares
      safeQuery(
        `SELECT ne.nota_final, ne.nota_recuperacao, ne.faltas,
                ne.disciplina_id, ne.periodo_id,
                d.nome as disciplina, d.abreviacao, d.codigo as disciplina_codigo,
                p.nome as periodo, p.numero as periodo_numero
         FROM notas_escolares ne
         INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
         INNER JOIN periodos_letivos p ON ne.periodo_id = p.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY p.numero, d.nome`,
        [aluno.id, anoLetivo], 'notas'
      ),
      // 5. Resultados SISAM
      safeQuery(
        `SELECT rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.nota_producao,
                rc.media_aluno, rc.presenca, rc.nivel_aprendizagem,
                rc.total_acertos_lp, rc.total_acertos_mat,
                rc.total_acertos_ch, rc.total_acertos_cn,
                av.nome as avaliacao_nome, av.tipo as avaliacao_tipo
         FROM resultados_consolidados rc
         INNER JOIN avaliacoes av ON rc.avaliacao_id = av.id
         WHERE rc.aluno_id = $1 AND rc.ano_letivo = $2
           AND (rc.nota_lp IS NOT NULL OR rc.nota_mat IS NOT NULL
                OR rc.nota_ch IS NOT NULL OR rc.nota_cn IS NOT NULL
                OR rc.nota_producao IS NOT NULL
                OR rc.total_acertos_lp > 0 OR rc.total_acertos_mat > 0)
         ORDER BY av.ordem`,
        [aluno.id, anoLetivo], 'sisam'
      ),
      // 6. Frequencia por periodo (consolidada).
      //
      // Padrao alinhado com /api/admin/turmas/[id]/diario-completo (paridade
      // com o diario do gestor):
      // - dias_letivos = contar_dias_letivos(ano_letivo_id, escola_id, dt_ini, dt_fim)
      // - presencas: COUNT FILTER (status = 'presente') em frequencia_diaria
      // - COALESCE com frequencia_bimestral preserva snapshot oficial.
      // - Filtro de tipo PRIMARIO (bimestre > trimestre > semestre) evita
      //   duplicacao quando ha semestres derivados (Pt.6) coexistindo com
      //   bimestres — mesmo principio do fix do calendario (commit 054c46e).
      //
      // Bug anterior: SELECT fb.bimestre, fb.aulas_dadas (colunas que NUNCA
      // existiram em frequencia_bimestral) — capturado por safeQuery e
      // devolvia rows:[] silenciosamente. Boletim do responsavel ficava
      // sem a secao de frequencia bimestral em producao.
      safeQuery(
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
         -- Frequencia diaria agregada (anos iniciais)
         fd_agg AS (
           SELECT e.periodo_id,
                  COUNT(fd.id) FILTER (WHERE fd.status = 'presente')::int AS presencas,
                  COUNT(fd.id) FILTER (WHERE fd.status = 'ausente')::int  AS faltas,
                  COUNT(fd.id)::int AS total
             FROM escopos e
             LEFT JOIN frequencia_diaria fd
                    ON fd.aluno_id = $1 AND fd.turma_id = $4::uuid
                   AND fd.data BETWEEN e.data_inicio AND e.data_fim
            GROUP BY e.periodo_id
         ),
         -- Frequencia por hora-aula agregada a nivel de DIA (anos finais 6-9).
         -- Sem isso, a frequencia de 6-9 nao aparecia no boletim oficial.
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
         SELECT e.periodo_id, e.nome AS periodo_nome, e.numero AS bimestre, e.tipo,
                d.dias_letivos AS aulas_dadas,
                COALESCE(fb.presencas,
                         CASE WHEN COALESCE(fd.total,0) > 0 THEN fd.presencas
                              WHEN COALESCE(fha.total,0) > 0 THEN fha.presencas
                              ELSE 0 END) AS presencas,
                COALESCE(fb.faltas,
                         CASE WHEN COALESCE(fd.total,0) > 0 THEN fd.faltas
                              WHEN COALESCE(fha.total,0) > 0 THEN fha.faltas
                              ELSE 0 END) AS faltas,
                COALESCE(fb.percentual_frequencia,
                         CASE WHEN d.dias_letivos > 0
                              THEN ROUND(
                                ((CASE WHEN COALESCE(fd.total,0) > 0 THEN fd.presencas
                                       WHEN COALESCE(fha.total,0) > 0 THEN fha.presencas
                                       ELSE 0 END)::numeric / d.dias_letivos) * 100, 2)
                              ELSE NULL
                         END) AS percentual_frequencia
           FROM escopos e
           JOIN dias d ON d.periodo_id = e.periodo_id
           LEFT JOIN frequencia_bimestral fb ON fb.aluno_id = $1 AND fb.periodo_id = e.periodo_id
           LEFT JOIN fd_agg fd ON fd.periodo_id = e.periodo_id
           LEFT JOIN fha_agg fha ON fha.periodo_id = e.periodo_id
          ORDER BY e.numero`,
        [aluno.id, anoLetivo, aluno.escola_id || null, aluno.turma_id || null], 'frequencia'
      ),
      // 7. Frequencia diaria — usa coluna status (lancamento manual nao
      // preenche hora_entrada, antes contava sempre 0). Justificado eh
      // ausente justificado: nao conta como presente.
      safeQuery(
        `SELECT COUNT(*) as total_dias,
                COUNT(*) FILTER (WHERE status = 'presente') as dias_presente,
                COUNT(*) FILTER (WHERE status = 'ausente') as dias_ausente,
                COUNT(*) FILTER (WHERE status = 'justificado') as dias_justificado,
                MIN(data) as primeira_data, MAX(data) as ultima_data
         FROM frequencia_diaria
         WHERE aluno_id = $1 AND EXTRACT(YEAR FROM data) = $2::int`,
        [aluno.id, anoLetivo], 'freq_diaria'
      ),
    ])

    // ============================================
    // Montar resposta
    // ============================================

    // Disciplinas
    const disciplinas = disciplinasResult.rows.map((d: any) => ({
      id: d.id,
      nome: d.nome,
      codigo: d.codigo,
      abreviacao: d.abreviacao,
      ordem: d.ordem,
    }))

    // Periodos
    const periodos = periodosResult.rows.map((p: any) => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      numero: p.numero,
      data_inicio: p.data_inicio,
      data_fim: p.data_fim,
    }))

    // Notas organizadas: { [disciplina_id]: { [periodo_numero]: { nota_final, nota_recuperacao, faltas } } }
    const notasMap: Record<string, Record<number, any>> = {}
    for (const nota of notasResult.rows) {
      if (!notasMap[nota.disciplina_id]) notasMap[nota.disciplina_id] = {}
      notasMap[nota.disciplina_id][nota.periodo_numero] = {
        nota_final: nota.nota_final !== null ? parseFloat(nota.nota_final) : null,
        nota_recuperacao: nota.nota_recuperacao !== null ? parseFloat(nota.nota_recuperacao) : null,
        faltas: parseInt(nota.faltas) || 0,
      }
    }

    // Avaliacoes SISAM
    const avaliacoes = sisamResult.rows.map((r: any) => ({
      avaliacao: r.avaliacao_nome,
      tipo: r.avaliacao_tipo,
      presenca: r.presenca,
      nota_lp: r.nota_lp !== null ? parseFloat(r.nota_lp) : null,
      nota_mat: r.nota_mat !== null ? parseFloat(r.nota_mat) : null,
      nota_ch: r.nota_ch !== null ? parseFloat(r.nota_ch) : null,
      nota_cn: r.nota_cn !== null ? parseFloat(r.nota_cn) : null,
      nota_producao: r.nota_producao !== null ? parseFloat(r.nota_producao) : null,
      media: r.media_aluno !== null ? parseFloat(r.media_aluno) : null,
      nivel: r.nivel_aprendizagem,
      acertos_lp: parseInt(r.total_acertos_lp) || 0,
      acertos_mat: parseInt(r.total_acertos_mat) || 0,
      acertos_ch: parseInt(r.total_acertos_ch) || 0,
      acertos_cn: parseInt(r.total_acertos_cn) || 0,
    }))

    // Frequencia bimestral
    const frequencia = frequenciaResult.rows.map((f: any) => ({
      bimestre: f.bimestre,
      periodo_nome: f.periodo_nome?.replace('Bimestre', 'Avaliacao') || `${f.bimestre}a Avaliacao`,
      aulas_dadas: parseInt(f.aulas_dadas) || 0,
      faltas: parseInt(f.faltas) || 0,
      percentual: f.percentual_frequencia !== null ? parseFloat(f.percentual_frequencia) : null,
    }))

    // Frequencia geral
    const freqComValor = frequencia.filter((f: any) => f.percentual !== null)
    const frequenciaGeral = freqComValor.length > 0
      ? Math.round((freqComValor.reduce((s: number, f: any) => s + f.percentual, 0) / freqComValor.length) * 100) / 100
      : null
    const totalFaltas = frequencia.reduce((s: number, f: any) => s + f.faltas, 0)

    // Frequencia diaria resumo
    const freqDiaria = freqDiariaResult.rows[0]

    const responseData = {
      aluno: {
        nome: aluno.nome,
        codigo: aluno.codigo,
        serie: aluno.serie,
        turma_codigo: aluno.turma_codigo,
        turma_nome: aluno.turma_nome,
        escola_nome: aluno.escola_nome,
        ano_letivo: aluno.ano_letivo,
        situacao: aluno.situacao || 'cursando',
        pcd: aluno.pcd || false,
        data_nascimento: aluno.data_nascimento,
      },
      disciplinas,
      periodos,
      notas: notasMap,
      avaliacoes_sisam: avaliacoes,
      frequencia,
      frequencia_geral: frequenciaGeral,
      total_faltas: totalFaltas,
      frequencia_diaria: {
        total_dias: parseInt(freqDiaria?.total_dias) || 0,
        dias_presente: parseInt(freqDiaria?.dias_presente) || 0,
        dias_ausente: parseInt(freqDiaria?.dias_ausente) || 0,
        dias_justificado: parseInt(freqDiaria?.dias_justificado) || 0,
        primeira_data: freqDiaria?.primeira_data,
        ultima_data: freqDiaria?.ultima_data,
      },
    }

    // Salvar no cache (5 min TTL)
    setInCache(cacheKey, responseData)

    const response = NextResponse.json(responseData)
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    return response
  } catch (error: unknown) {
    log.error('Erro ao consultar boletim', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}
