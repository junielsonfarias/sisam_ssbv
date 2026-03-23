import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// Rate limiting específico para boletim (dados pessoais — LGPD)
// 30 consultas por IP a cada 15 minutos
const boletimLimiter = new Map<string, { count: number; resetAt: number }>()
const BOLETIM_MAX = 30
const BOLETIM_WINDOW = 15 * 60 * 1000

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

// Cleanup a cada 10 minutos
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of boletimLimiter) {
    if (now > entry.resetAt) boletimLimiter.delete(ip)
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
    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo')?.trim()
    const cpfRaw = searchParams.get('cpf')?.trim()
    const dataNascimento = searchParams.get('data_nascimento')?.trim()
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!codigo && (!cpfRaw || !dataNascimento)) {
      return NextResponse.json(
        { mensagem: 'Informe o codigo do aluno ou CPF + data de nascimento.' },
        { status: 400 }
      )
    }

    const cpf = cpfRaw ? cpfRaw.replace(/\D/g, '') : null

    if (cpf && cpf.length !== 11) {
      return NextResponse.json(
        { mensagem: 'CPF deve conter 11 dígitos.' },
        { status: 400 }
      )
    }

    if (dataNascimento) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        return NextResponse.json(
          { mensagem: 'Data de nascimento deve estar no formato AAAA-MM-DD.' },
          { status: 400 }
        )
      }
      const ano = parseInt(dataNascimento.substring(0, 4))
      if (ano < 1950 || ano > new Date().getFullYear()) {
        return NextResponse.json(
          { mensagem: 'Ano de nascimento inválido.' },
          { status: 400 }
        )
      }
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
        { mensagem: 'Aluno nao encontrado. Verifique os dados informados.' },
        { status: 404 }
      )
    }

    const aluno = alunoResult.rows[0]

    // Helper: query segura que retorna rows vazio em caso de erro
    const safeQuery = async (sql: string, params: any[] = [], label: string = '') => {
      try {
        return await pool.query(sql, params)
      } catch (err: unknown) {
        console.error(`[Boletim] Erro em ${label}:`, (err as Error)?.message)
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
      // 6. Frequencia bimestral
      safeQuery(
        `SELECT fb.bimestre, fb.aulas_dadas, fb.faltas, fb.percentual_frequencia,
                p.nome as periodo_nome
         FROM frequencia_bimestral fb
         LEFT JOIN periodos_letivos p ON fb.periodo_id = p.id
         WHERE fb.aluno_id = $1 AND fb.ano_letivo = $2
         ORDER BY fb.bimestre`,
        [aluno.id, anoLetivo], 'frequencia'
      ),
      // 7. Frequencia diaria
      safeQuery(
        `SELECT COUNT(*) as total_dias,
                COUNT(*) FILTER (WHERE hora_entrada IS NOT NULL) as dias_presente,
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

    return NextResponse.json({
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
        primeira_data: freqDiaria?.primeira_data,
        ultima_data: freqDiaria?.ultima_data,
      },
    })
  } catch (error: unknown) {
    console.error('Erro ao consultar boletim:', (error as Error)?.message || error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}
