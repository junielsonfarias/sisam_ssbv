/**
 * Service de KPIs estratégicos da Secretaria Municipal de Educação.
 *
 * Agrega indicadores municipais para o painel executivo da SEMED:
 *  - Total alunos/escolas/professores
 *  - Frequência média
 *  - Aprovação e reprovação por escola/polo
 *  - Distorção idade-série
 *  - Inclusão (AEE)
 *  - Atendimento PNAE/PNATE
 *  - Casos FICAI abertos
 *  - Execução PDDE
 *  - IDEB projetado (estimativa baseada em médias internas)
 *
 * @module services/kpis-semed
 */

import pool from '@/database/connection'
import type { Usuario } from '@/lib/types/usuario'

/** Subconjunto do usuário necessário para aplicar escopo de acesso. */
type UsuarioEscopo = Pick<Usuario, 'tipo_usuario' | 'polo_id' | 'escola_id'>

/**
 * Resolve o filtro de polo para usuários do tipo 'polo'.
 * Retorna `null` para administrador/técnico (sem restrição).
 */
function poloDoUsuario(usuario?: UsuarioEscopo): string | null {
  return usuario?.tipo_usuario === 'polo' && usuario.polo_id ? usuario.polo_id : null
}

export interface KpisGerais {
  total_alunos: number
  total_escolas: number
  total_professores: number
  total_servidores: number
  alunos_pne: number
  alunos_bf: number
  ano_letivo: string
}

export interface KpisFrequencia {
  frequencia_media_pct: number
  alunos_infrequentes: number  // < 75%
  alunos_evasao_risco: number  // FICAI abertos
}

export interface KpisDesempenho {
  media_geral: number | null
  taxa_aprovacao_pct: number | null
  taxa_reprovacao_pct: number | null
  taxa_abandono_pct: number | null
  distorcao_idade_serie_pct: number | null
  ideb_projetado: number | null
}

export interface KpisProgramas {
  pnae_refeicoes_mes: number
  pnate_alunos_atendidos: number
  pdde_executado_pct: number | null
  ordens_servico_abertas: number
  ordens_servico_urgentes: number
}

export interface KpisCompletos {
  gerais: KpisGerais
  frequencia: KpisFrequencia
  desempenho: KpisDesempenho
  programas: KpisProgramas
  comparativo_escolas?: ComparativoEscola[]
  gerado_em: string
}

export interface ComparativoEscola {
  escola_id: string
  escola_nome: string
  polo_nome: string | null
  total_alunos: number
  frequencia_pct: number | null
  media_geral: number | null
  alunos_pne: number
  alertas_ficai: number
}

// ============================================================================
// KPIs GERAIS
// ============================================================================

export async function obterKpisGerais(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisGerais> {
  // Alunos/AEE/Bolsa Familia sao filtrados por ano_letivo — assim cada ano
  // tem seu proprio "snapshot" e o dashboard reflete a matricula vigente.
  // Escolas/professores/servidores sao cadastros atemporais (filtram por ativo).
  // Quando o usuário é 'polo', todas as contagens são restritas às escolas do
  // polo (anti-vazamento de totais municipais para fora do escopo).
  const polo = poloDoUsuario(usuario)
  const params: unknown[] = [anoLetivo]
  let escolasFiltro = ''
  let alunosEscolaFiltro = ''
  let escolasIdSub = '' // subquery de ids de escolas do polo, para joins
  if (polo) {
    params.push(polo)
    escolasFiltro = ` AND polo_id = $${params.length}`
    escolasIdSub = `(SELECT id FROM escolas WHERE polo_id = $${params.length})`
    alunosEscolaFiltro = ` AND escola_id IN ${escolasIdSub}`
  }

  const r = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM alunos
          WHERE ativo IS NOT FALSE AND ano_letivo = $1${alunosEscolaFiltro}) AS total_alunos,
       (SELECT COUNT(*) FROM escolas WHERE ativo IS NOT FALSE${escolasFiltro}) AS total_escolas,
       (SELECT COUNT(*) FROM usuarios
          WHERE tipo_usuario = 'professor' AND ativo IS NOT FALSE${polo ? ` AND escola_id IN ${escolasIdSub}` : ''}) AS total_professores,
       ${polo ? '0' : '(SELECT COUNT(*) FROM servidores WHERE ativo = TRUE)'} AS total_servidores,
       (SELECT COUNT(DISTINCT ae.aluno_id)
          FROM alunos_aee ae
          INNER JOIN alunos a ON a.id = ae.aluno_id
         WHERE a.ano_letivo = $1 AND a.ativo IS NOT FALSE${polo ? ` AND a.escola_id IN ${escolasIdSub}` : ''}) AS alunos_pne,
       (SELECT COUNT(*) FROM alunos
         WHERE beneficiario_bolsa_familia = TRUE
           AND ano_letivo = $1 AND ativo IS NOT FALSE${alunosEscolaFiltro}) AS alunos_bf`,
    params
  ).catch(() => ({ rows: [{}] }))

  const row = r.rows[0]
  return {
    total_alunos: parseInt(row.total_alunos || '0', 10),
    total_escolas: parseInt(row.total_escolas || '0', 10),
    total_professores: parseInt(row.total_professores || '0', 10),
    total_servidores: parseInt(row.total_servidores || '0', 10),
    alunos_pne: parseInt(row.alunos_pne || '0', 10),
    alunos_bf: parseInt(row.alunos_bf || '0', 10),
    ano_letivo: anoLetivo,
  }
}

// ============================================================================
// FREQUÊNCIA
// ============================================================================

export async function obterKpisFrequencia(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisFrequencia> {
  try {
    const polo = poloDoUsuario(usuario)
    const freqParams: unknown[] = [anoLetivo]
    let freqEscolaFiltro = ''
    if (polo) {
      freqParams.push(polo)
      // Restringe a frequência aos alunos das escolas do polo.
      freqEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${freqParams.length}))`
    }

    const r = await pool.query(
      `WITH freq_aluno AS (
         SELECT
           aluno_id,
           COUNT(*) AS total,
           COUNT(CASE WHEN status IN ('presente','justificado') THEN 1 END) AS presencas
           FROM frequencia_diaria
          WHERE data BETWEEN ($1 || '-01-01')::date AND ($1 || '-12-31')::date${freqEscolaFiltro}
          GROUP BY aluno_id
       )
       SELECT
         ROUND(AVG(presencas::float / NULLIF(total, 0) * 100)::numeric, 1) AS freq_media,
         COUNT(*) FILTER (WHERE presencas::float / NULLIF(total, 0) < 0.75) AS infrequentes
         FROM freq_aluno`,
      freqParams
    )
    const ficaiParams: unknown[] = [anoLetivo]
    let ficaiEscolaFiltro = ''
    if (polo) {
      ficaiParams.push(polo)
      ficaiEscolaFiltro = ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${ficaiParams.length})`
    }
    const ficaiR = await pool.query(
      `SELECT COUNT(*) AS total FROM ficai_casos
        WHERE ano_letivo = $1${ficaiEscolaFiltro}
          AND status IN ('aberto', 'contato_responsavel', 'aluno_retornou',
                         'encaminhado_conselho_tutelar', 'encaminhado_ministerio_publico')`,
      ficaiParams
    )

    return {
      frequencia_media_pct: parseFloat(r.rows[0]?.freq_media || '0'),
      alunos_infrequentes: parseInt(r.rows[0]?.infrequentes || '0', 10),
      alunos_evasao_risco: parseInt(ficaiR.rows[0]?.total || '0', 10),
    }
  } catch {
    return { frequencia_media_pct: 0, alunos_infrequentes: 0, alunos_evasao_risco: 0 }
  }
}

// ============================================================================
// DESEMPENHO PEDAGÓGICO
// ============================================================================

export async function obterKpisDesempenho(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisDesempenho> {
  try {
    const polo = poloDoUsuario(usuario)

    // Média geral das notas finais
    const notasParams: unknown[] = [anoLetivo]
    let notasEscolaFiltro = ''
    if (polo) {
      notasParams.push(polo)
      notasEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${notasParams.length}))`
    }
    const notasR = await pool.query(
      `SELECT ROUND(AVG(CAST(nota AS NUMERIC))::numeric, 2) AS media
         FROM notas_escolares
        WHERE ano_letivo = $1 AND nota IS NOT NULL${notasEscolaFiltro}`,
      notasParams
    ).catch(() => ({ rows: [{}] }))

    // Taxa aprovação/reprovação
    const situacaoParams: unknown[] = [anoLetivo]
    let situacaoEscolaFiltro = ''
    if (polo) {
      situacaoParams.push(polo)
      situacaoEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${situacaoParams.length}))`
    }
    const situacaoR = await pool.query(
      `SELECT situacao, COUNT(*) AS total
         FROM historico_situacao
        WHERE EXTRACT(YEAR FROM data)::text = $1${situacaoEscolaFiltro}
        GROUP BY situacao`,
      situacaoParams
    ).catch(() => ({ rows: [] }))

    const totalSituacoes = situacaoR.rows.reduce((s: number, r: any) => s + parseInt(r.total, 10), 0)
    const aprovados = situacaoR.rows.find((r: any) => r.situacao === 'aprovado')
    const reprovados = situacaoR.rows.find((r: any) => r.situacao === 'reprovado')
    const abandono = situacaoR.rows.find((r: any) => ['abandono', 'evadido'].includes(r.situacao))

    const pctAprov = totalSituacoes > 0 ? Math.round((parseInt(aprovados?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null
    const pctRepr = totalSituacoes > 0 ? Math.round((parseInt(reprovados?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null
    const pctAband = totalSituacoes > 0 ? Math.round((parseInt(abandono?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null

    // Distorção idade-série (alunos com >=2 anos a mais que o esperado),
    // filtrada pelo ano letivo selecionado
    const distorcaoParams: unknown[] = [anoLetivo]
    let distorcaoEscolaFiltro = ''
    if (polo) {
      distorcaoParams.push(polo)
      distorcaoEscolaFiltro = ` AND a.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${distorcaoParams.length})`
    }
    const distorcaoR = await pool.query(
      `WITH expectativa AS (
         SELECT a.id,
                EXTRACT(YEAR FROM AGE(a.data_nascimento))::int AS idade,
                CASE
                  WHEN REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g') ~ '^\\d+$'
                  THEN REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g')::int + 5
                  ELSE NULL END AS idade_esperada
           FROM alunos a
          WHERE a.ativo IS NOT FALSE
            AND a.data_nascimento IS NOT NULL
            AND a.ano_letivo = $1${distorcaoEscolaFiltro}
       )
       SELECT
         COUNT(*) FILTER (WHERE idade >= idade_esperada + 2)::float /
         NULLIF(COUNT(*), 0) * 100 AS pct
         FROM expectativa
        WHERE idade_esperada IS NOT NULL`,
      distorcaoParams
    ).catch(() => ({ rows: [{}] }))

    const distorcao = distorcaoR.rows[0]?.pct
      ? Math.round(parseFloat(distorcaoR.rows[0].pct) * 10) / 10
      : null

    // IDEB projetado: aproximação simples = (média_nota * 0.6) + (taxa_aprovacao_pct/100 * 4)
    // É uma estimativa interna — IDEB real depende de SAEB nacional
    const media = notasR.rows[0]?.media ? parseFloat(notasR.rows[0].media) : null
    const idebProjetado = (media != null && pctAprov != null)
      ? Math.round(((media * 0.6) + (pctAprov / 100) * 4) * 10) / 10
      : null

    return {
      media_geral: media,
      taxa_aprovacao_pct: pctAprov,
      taxa_reprovacao_pct: pctRepr,
      taxa_abandono_pct: pctAband,
      distorcao_idade_serie_pct: distorcao,
      ideb_projetado: idebProjetado,
    }
  } catch {
    return {
      media_geral: null, taxa_aprovacao_pct: null, taxa_reprovacao_pct: null,
      taxa_abandono_pct: null, distorcao_idade_serie_pct: null, ideb_projetado: null,
    }
  }
}

// ============================================================================
// PROGRAMAS FEDERAIS
// ============================================================================

export async function obterKpisProgramas(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisProgramas> {
  // PNAE: se o ano selecionado for o atual, mostra apenas o mes vigente
  // (intencao original do KPI: "refeicoes_mes"). Para anos passados, agrega
  // o ano inteiro — assim historico nao some.
  // Para usuários 'polo', todas as agregações são restritas às escolas do polo.
  const polo = poloDoUsuario(usuario)
  const anoAtual = new Date().getFullYear()
  const anoInt = parseInt(anoLetivo, 10)
  const mesAtual = new Date().getMonth() + 1

  const pnaeParams: unknown[] = anoInt === anoAtual ? [anoInt, mesAtual] : [anoInt]
  let pnaeEscolaFiltro = ''
  if (polo) {
    pnaeParams.push(polo)
    pnaeEscolaFiltro = ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${pnaeParams.length})`
  }
  const pnae = anoInt === anoAtual
    ? await pool.query(
        `SELECT COALESCE(SUM(qtd_alunos), 0) AS total
           FROM pnae_atendimentos_diarios
          WHERE EXTRACT(YEAR FROM data_atendimento) = $1
            AND EXTRACT(MONTH FROM data_atendimento) = $2${pnaeEscolaFiltro}`,
        pnaeParams
      ).catch(() => ({ rows: [{ total: 0 }] }))
    : await pool.query(
        `SELECT COALESCE(SUM(qtd_alunos), 0) AS total
           FROM pnae_atendimentos_diarios
          WHERE EXTRACT(YEAR FROM data_atendimento) = $1${pnaeEscolaFiltro}`,
        pnaeParams
      ).catch(() => ({ rows: [{ total: 0 }] }))

  const pnateParams: unknown[] = []
  let pnateEscolaFiltro = ''
  if (polo) {
    pnateParams.push(polo)
    pnateEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${pnateParams.length}))`
  }
  const pnate = await pool.query(
    `SELECT COUNT(DISTINCT aluno_id) AS total
       FROM pnate_alunos_rotas WHERE ativo = TRUE${pnateEscolaFiltro}`,
    pnateParams
  ).catch(() => ({ rows: [{ total: 0 }] }))

  const pddeParams: unknown[] = [anoLetivo]
  let pddeEscolaFiltro = ''
  if (polo) {
    pddeParams.push(polo)
    pddeEscolaFiltro = ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${pddeParams.length})`
  }
  const pdde = await pool.query(
    `SELECT
       SUM(valor_recebido) AS recebido,
       SUM(valor_executado) AS executado
       FROM pdde_saldos WHERE ano_letivo = $1${pddeEscolaFiltro}`,
    pddeParams
  ).catch(() => ({ rows: [{}] }))

  const pddeRow = pdde.rows[0] || {}
  const pddePct = pddeRow.recebido && parseFloat(pddeRow.recebido) > 0
    ? Math.round((parseFloat(pddeRow.executado || '0') / parseFloat(pddeRow.recebido)) * 1000) / 10
    : null

  const osParams: unknown[] = []
  let osEscolaFiltro = ''
  if (polo) {
    osParams.push(polo)
    osEscolaFiltro = ` WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${osParams.length})`
  }
  const os = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('concluida','cancelada')) AS abertas,
       COUNT(*) FILTER (WHERE status NOT IN ('concluida','cancelada') AND prioridade = 'urgente') AS urgentes
       FROM ordens_servico${osEscolaFiltro}`,
    osParams
  ).catch(() => ({ rows: [{ abertas: 0, urgentes: 0 }] }))

  return {
    pnae_refeicoes_mes: parseInt(pnae.rows[0]?.total || '0', 10),
    pnate_alunos_atendidos: parseInt(pnate.rows[0]?.total || '0', 10),
    pdde_executado_pct: pddePct,
    ordens_servico_abertas: parseInt(os.rows[0]?.abertas || '0', 10),
    ordens_servico_urgentes: parseInt(os.rows[0]?.urgentes || '0', 10),
  }
}

// ============================================================================
// COMPARATIVO POR ESCOLA
// ============================================================================

export async function obterComparativoEscolas(anoLetivo: string, usuario?: UsuarioEscopo): Promise<ComparativoEscola[]> {
  // Usuário 'polo' só enxerga as escolas do próprio polo (anti-vazamento).
  const polo = poloDoUsuario(usuario)
  const compParams: unknown[] = [anoLetivo]
  let poloFiltro = ''
  if (polo) {
    compParams.push(polo)
    poloFiltro = ` AND e.polo_id = $${compParams.length}`
  }
  const r = await pool.query(
    `SELECT
       e.id AS escola_id, e.nome AS escola_nome,
       p.nome AS polo_nome,
       (SELECT COUNT(*) FROM alunos a
          WHERE a.escola_id = e.id AND a.ativo IS NOT FALSE
            AND a.ano_letivo = $1) AS total_alunos,
       (SELECT COUNT(DISTINCT ae.aluno_id) FROM alunos_aee ae
          INNER JOIN alunos a ON a.id = ae.aluno_id
          WHERE a.escola_id = e.id AND a.ano_letivo = $1 AND a.ativo IS NOT FALSE) AS alunos_pne,
       (SELECT COUNT(*) FROM ficai_casos f WHERE f.escola_id = e.id AND f.ano_letivo = $1 AND f.status NOT IN ('concluido_aluno_transferido', 'concluido_resolvido', 'concluido_evasao_confirmada', 'cancelado')) AS alertas_ficai
       FROM escolas e
       LEFT JOIN polos p ON p.id = e.polo_id
      WHERE e.ativo IS NOT FALSE${poloFiltro}
      ORDER BY e.nome`,
    compParams
  ).catch(() => ({ rows: [] }))

  // Adiciona frequência e média (queries separadas para não bloquear o resto)
  for (const escola of r.rows) {
    try {
      const freq = await pool.query(
        `SELECT AVG(CASE WHEN f.status IN ('presente','justificado') THEN 100.0 ELSE 0 END) AS pct
           FROM frequencia_diaria f
           INNER JOIN alunos a ON a.id = f.aluno_id
          WHERE a.escola_id = $1
            AND f.data BETWEEN ($2 || '-01-01')::date AND ($2 || '-12-31')::date`,
        [escola.escola_id, anoLetivo]
      )
      escola.frequencia_pct = freq.rows[0]?.pct ? Math.round(parseFloat(freq.rows[0].pct) * 10) / 10 : null
    } catch { escola.frequencia_pct = null }

    try {
      const nota = await pool.query(
        `SELECT AVG(CAST(ne.nota AS NUMERIC)) AS media
           FROM notas_escolares ne
           INNER JOIN alunos a ON a.id = ne.aluno_id
          WHERE a.escola_id = $1 AND ne.ano_letivo = $2 AND ne.nota IS NOT NULL`,
        [escola.escola_id, anoLetivo]
      )
      escola.media_geral = nota.rows[0]?.media ? Math.round(parseFloat(nota.rows[0].media) * 10) / 10 : null
    } catch { escola.media_geral = null }
  }

  return r.rows.map((row: any) => ({
    escola_id: row.escola_id,
    escola_nome: row.escola_nome,
    polo_nome: row.polo_nome,
    total_alunos: parseInt(row.total_alunos || '0', 10),
    frequencia_pct: row.frequencia_pct,
    media_geral: row.media_geral,
    alunos_pne: parseInt(row.alunos_pne || '0', 10),
    alertas_ficai: parseInt(row.alertas_ficai || '0', 10),
  }))
}

// ============================================================================
// AGREGADOR COMPLETO
// ============================================================================

export async function obterKpisCompletos(
  usuario: UsuarioEscopo,
  anoLetivo: string,
  incluirComparativo = false
): Promise<KpisCompletos> {
  const [gerais, frequencia, desempenho, programas] = await Promise.all([
    obterKpisGerais(anoLetivo, usuario),
    obterKpisFrequencia(anoLetivo, usuario),
    obterKpisDesempenho(anoLetivo, usuario),
    obterKpisProgramas(anoLetivo, usuario),
  ])

  const result: KpisCompletos = {
    gerais, frequencia, desempenho, programas,
    gerado_em: new Date().toISOString(),
  }

  if (incluirComparativo) {
    result.comparativo_escolas = await obterComparativoEscolas(anoLetivo, usuario)
  }

  return result
}
