const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
})

async function main() {
  try {
    // ===== 1. TURMAS: media atual vs media corrigida =====
    console.log('=' .repeat(120))
    console.log('IMPACTO NAS TURMAS - Media Atual (AVG medias individuais) vs Media Corrigida (soma medias disciplinas / nº disciplinas)')
    console.log('=' .repeat(120))

    const turmasQuery = `
      SELECT
        t.id,
        t.codigo,
        t.nome,
        t.serie,
        e.nome as escola_nome,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as presentes,
        -- MEDIA ATUAL: AVG das medias individuais dos alunos
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              WHEN REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
              ELSE
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
            END
          ELSE NULL
        END), 2) as media_atual,
        -- MEDIAS POR DISCIPLINA (com COALESCE, nota 0 entra)
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_producao AS DECIMAL), 0) ELSE NULL END), 2) as media_prod,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_cn AS DECIMAL), 0) ELSE NULL END), 2) as media_cn
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
      GROUP BY t.id, t.codigo, t.nome, t.serie, e.nome
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) > 0
      ORDER BY t.serie, media_atual DESC NULLS LAST
    `

    const turmasResult = await pool.query(turmasQuery)

    const turmasComImpacto = turmasResult.rows.map(row => {
      const sn = (row.serie || '').replace(/[^0-9]/g, '')
      const isIniciais = ['2', '3', '5'].includes(sn)
      const lp = parseFloat(row.media_lp) || 0
      const mat = parseFloat(row.media_mat) || 0
      const prod = parseFloat(row.media_prod) || 0
      const ch = parseFloat(row.media_ch) || 0
      const cn = parseFloat(row.media_cn) || 0

      const mediaCorrigida = isIniciais
        ? (lp + mat + prod) / 3
        : (lp + mat + ch + cn) / 4

      const mediaAtual = parseFloat(row.media_atual) || 0
      const diferenca = mediaCorrigida - mediaAtual

      return {
        codigo: row.codigo || row.nome,
        serie: row.serie,
        escola: row.escola_nome,
        presentes: parseInt(row.presentes),
        media_atual: mediaAtual,
        lp, mat, prod: isIniciais ? prod : null, ch: !isIniciais ? ch : null, cn: !isIniciais ? cn : null,
        media_corrigida: Math.round(mediaCorrigida * 100) / 100,
        diferenca: Math.round(diferenca * 100) / 100
      }
    })

    // Ranking atual
    const turmasOrdenadas = [...turmasComImpacto].sort((a, b) => b.media_atual - a.media_atual)
    turmasOrdenadas.forEach((t, i) => t.ranking_atual = i + 1)

    // Ranking corrigido
    const turmasOrdenadasCorrigida = [...turmasComImpacto].sort((a, b) => b.media_corrigida - a.media_corrigida)
    turmasOrdenadasCorrigida.forEach((t, i) => t.ranking_corrigido = i + 1)

    // Mapear rankings
    const rankingMap = {}
    turmasOrdenadas.forEach(t => { rankingMap[t.codigo] = { ...t } })
    turmasOrdenadasCorrigida.forEach(t => {
      if (rankingMap[t.codigo]) rankingMap[t.codigo].ranking_corrigido = t.ranking_corrigido
    })

    // Turmas com diferença
    const turmasComDiferenca = turmasComImpacto.filter(t => Math.abs(t.diferenca) >= 0.01)
    const turmasSemDiferenca = turmasComImpacto.filter(t => Math.abs(t.diferenca) < 0.01)

    console.log(`\nTotal de turmas: ${turmasComImpacto.length}`)
    console.log(`Turmas COM diferença (>= 0.01): ${turmasComDiferenca.length}`)
    console.log(`Turmas SEM diferença: ${turmasSemDiferenca.length}`)

    // Mostrar TODAS as turmas por série
    const seriesUnicas = [...new Set(turmasComImpacto.map(t => t.serie))].sort()

    for (const serie of seriesUnicas) {
      const turmasSerie = turmasComImpacto
        .filter(t => t.serie === serie)
        .sort((a, b) => b.media_corrigida - a.media_corrigida)

      console.log(`\n--- ${serie} (${turmasSerie.length} turmas) ---`)
      console.log(`${'Turma'.padEnd(10)} | ${'Escola'.padEnd(35)} | ${'Pres'.padStart(4)} | ${'M.Atual'.padStart(7)} | ${'LP'.padStart(5)} | ${'MAT'.padStart(5)} | ${serie.replace(/[^0-9]/g, '') <= '5' ? 'PROD'.padStart(5) : ' CH '.padStart(5)} | ${serie.replace(/[^0-9]/g, '') > '5' ? ' CN '.padStart(5) : '     '} | ${'M.Corrig'.padStart(8)} | ${'Dif'.padStart(6)} | ${'Rank.A'.padStart(6)} | ${'Rank.C'.padStart(6)} | ${'Mudou'.padStart(5)}`)
      console.log('-'.repeat(140))

      for (const t of turmasSerie) {
        const ra = rankingMap[t.codigo]?.ranking_atual || '-'
        const rc = rankingMap[t.codigo]?.ranking_corrigido || '-'
        const mudou = ra !== rc ? `${ra > rc ? '↑' : '↓'}${Math.abs(ra - rc)}` : '='
        const sn = (t.serie || '').replace(/[^0-9]/g, '')
        const isIniciais = ['2', '3', '5'].includes(sn)

        const d3 = isIniciais ? (t.prod != null ? t.prod.toFixed(2) : '-').padStart(5) : (t.ch != null ? t.ch.toFixed(2) : '-').padStart(5)
        const d4 = !isIniciais ? (t.cn != null ? t.cn.toFixed(2) : '-').padStart(5) : '     '

        console.log(
          `${t.codigo.padEnd(10)} | ${(t.escola || '').substring(0, 35).padEnd(35)} | ${String(t.presentes).padStart(4)} | ${t.media_atual.toFixed(2).padStart(7)} | ${t.lp.toFixed(2).padStart(5)} | ${t.mat.toFixed(2).padStart(5)} | ${d3} | ${d4} | ${t.media_corrigida.toFixed(2).padStart(8)} | ${(t.diferenca >= 0 ? '+' : '') + t.diferenca.toFixed(2)} | ${String(ra).padStart(6)} | ${String(rc).padStart(6)} | ${mudou.padStart(5)}`
        )
      }
    }

    // ===== 2. ESCOLAS: media atual vs media corrigida =====
    console.log('\n\n' + '=' .repeat(120))
    console.log('IMPACTO NAS ESCOLAS - Media Atual vs Media Corrigida')
    console.log('=' .repeat(120))

    const escolasQuery = `
      SELECT
        e.id,
        e.nome,
        p.nome as polo_nome,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as presentes,
        -- MEDIA ATUAL
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
              ELSE
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
            END
          ELSE NULL
        END), 2) as media_atual,
        -- MEDIAS POR DISCIPLINA
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_producao AS DECIMAL), 0) ELSE NULL END), 2) as media_prod,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_cn AS DECIMAL), 0) ELSE NULL END), 2) as media_cn,
        -- Contagens por tipo
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc.aluno_id END) as presentes_iniciais,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9') THEN rc.aluno_id END) as presentes_finais
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
      GROUP BY e.id, e.nome, p.nome
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) > 0
      ORDER BY media_atual DESC NULLS LAST
    `

    const escolasResult = await pool.query(escolasQuery)

    // Para escolas com alunos de ambos os tipos (iniciais e finais),
    // a media corrigida precisa ser: media ponderada das disciplinas considerando o tipo
    // Mas como escola mistura séries, a forma correta é diferente...
    // Na verdade para escola a media_geral no backend é: AVG das medias individuais dos alunos
    // A media corrigida seria: para cada aluno calcular (disciplinas/nº), depois AVG
    // O que é MATEMATICAMENTE EQUIVALENTE quando todos tem COALESCE
    // Então para escolas COM MISTURA de séries, as médias por disciplina são de TODOS os alunos
    // e não dá para simplesmente fazer (lp+mat+prod)/3 porque inclui alunos de anos finais no lp/mat

    // Para escolas, a media corrigida faz mais sentido por segmento
    // Mas vou mostrar a comparação da mesma forma

    const escolasComImpacto = escolasResult.rows.map(row => {
      const mediaAtual = parseFloat(row.media_atual) || 0
      const lp = parseFloat(row.media_lp) || 0
      const mat = parseFloat(row.media_mat) || 0
      const prod = parseFloat(row.media_prod) || 0
      const ch = parseFloat(row.media_ch) || 0
      const cn = parseFloat(row.media_cn) || 0
      const presIni = parseInt(row.presentes_iniciais) || 0
      const presFin = parseInt(row.presentes_finais) || 0

      // Nota: para escolas com ambas etapas, a media por disciplina mistura alunos de series diferentes
      // LP e MAT incluem TODOS os alunos, PROD só anos iniciais, CH/CN só anos finais
      // Então não é possível fazer simplesmente (lp+mat+prod)/3 para a escola toda
      // A media corrigida precisa ser calculada de outra forma para escolas mistas

      return {
        nome: row.nome,
        polo: row.polo_nome,
        presentes: parseInt(row.presentes),
        presIni,
        presFin,
        media_atual: mediaAtual,
        lp, mat, prod, ch, cn
      }
    })

    // Ranking atual
    escolasComImpacto.sort((a, b) => b.media_atual - a.media_atual)
    escolasComImpacto.forEach((e, i) => e.ranking_atual = i + 1)

    console.log(`\nTotal de escolas: ${escolasComImpacto.length}`)
    console.log(`\nNOTA: Para escolas com alunos de AMBAS as etapas (iniciais + finais),`)
    console.log(`a media_geral = AVG das medias individuais é MATEMATICAMENTE EQUIVALENTE a`)
    console.log(`(soma medias disciplinas / nº disciplinas) quando COALESCE é usado.`)
    console.log(`Isso porque: AVG((LP+MAT+PROD)/3) = (AVG(LP)+AVG(MAT)+AVG(PROD))/3`)
    console.log(`quando todos os alunos tem valor em todas as disciplinas (mesmo 0).`)

    console.log(`\n${'#'.padStart(3)} | ${'Escola'.padEnd(40)} | ${'Polo'.padEnd(20)} | ${'Pres'.padStart(4)} | ${'Ini'.padStart(4)} | ${'Fin'.padStart(4)} | ${'M.Atual'.padStart(7)} | ${'LP'.padStart(5)} | ${'MAT'.padStart(5)} | ${'PROD'.padStart(5)} | ${'CH'.padStart(5)} | ${'CN'.padStart(5)}`)
    console.log('-'.repeat(130))

    for (const e of escolasComImpacto) {
      console.log(
        `${String(e.ranking_atual).padStart(3)} | ${e.nome.substring(0, 40).padEnd(40)} | ${(e.polo || '-').substring(0, 20).padEnd(20)} | ${String(e.presentes).padStart(4)} | ${String(e.presIni).padStart(4)} | ${String(e.presFin).padStart(4)} | ${e.media_atual.toFixed(2).padStart(7)} | ${e.lp.toFixed(2).padStart(5)} | ${e.mat.toFixed(2).padStart(5)} | ${e.prod.toFixed(2).padStart(5)} | ${e.ch.toFixed(2).padStart(5)} | ${e.cn.toFixed(2).padStart(5)}`
      )
    }

    // ===== 3. PROVA MATEMATICA =====
    console.log('\n\n' + '=' .repeat(120))
    console.log('PROVA MATEMATICA: AVG(media_individual) vs (AVG(LP)+AVG(MAT)+AVG(PROD))/3 por turma')
    console.log('Quando TODOS os alunos tem COALESCE (nota 0 = 0), os dois metodos sao equivalentes?')
    console.log('=' .repeat(120))

    const provaQuery = `
      SELECT
        t.codigo,
        t.serie,
        -- Metodo A: AVG das medias individuais
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              WHEN REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
              ELSE
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
            END
          ELSE NULL
        END), 4) as metodo_a,
        -- Metodo B: (AVG_LP + AVG_MAT + AVG_PROD) / 3
        CASE
          WHEN REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            ROUND((
              AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) ELSE NULL END) +
              AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) ELSE NULL END) +
              AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_producao AS DECIMAL), 0) ELSE NULL END)
            ) / 3.0, 4)
          ELSE
            ROUND((
              AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) ELSE NULL END) +
              AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) ELSE NULL END) +
              AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) ELSE NULL END) +
              AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_cn AS DECIMAL), 0) ELSE NULL END)
            ) / 4.0, 4)
        END as metodo_b
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
      GROUP BY t.id, t.codigo, t.serie
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) > 0
      ORDER BY t.serie, t.codigo
    `

    const provaResult = await pool.query(provaQuery)

    let iguais = 0
    let diferentes = 0
    const diferencas = []

    for (const row of provaResult.rows) {
      const a = parseFloat(row.metodo_a) || 0
      const b = parseFloat(row.metodo_b) || 0
      const diff = Math.abs(a - b)

      if (diff < 0.001) {
        iguais++
      } else {
        diferentes++
        diferencas.push({ codigo: row.codigo, serie: row.serie, metodo_a: a, metodo_b: b, diff: Math.round(diff * 10000) / 10000 })
      }
    }

    console.log(`\nResultado: ${iguais} turmas IGUAIS, ${diferentes} turmas DIFERENTES`)

    if (diferencas.length > 0) {
      console.log('\nTurmas com diferença:')
      for (const d of diferencas) {
        console.log(`  ${d.codigo} (${d.serie}): Metodo A = ${d.metodo_a}, Metodo B = ${d.metodo_b}, Diff = ${d.diff}`)
      }
    } else {
      console.log('\nCONCLUSAO: Os dois metodos sao MATEMATICAMENTE EQUIVALENTES para TODAS as turmas.')
      console.log('Isso confirma que AVG((LP+MAT+PROD)/3) = (AVG(LP)+AVG(MAT)+AVG(PROD))/3')
      console.log('quando todos os alunos presentes tem valor COALESCE em todas as disciplinas.')
    }

    // ===== 4. IMPACTO DO ITEM 6: escolas/route.ts com nota > 0 =====
    console.log('\n\n' + '=' .repeat(120))
    console.log('IMPACTO ITEM 6: escolas/route.ts - Medias por disciplina COM nota>0 (atual) vs COM COALESCE (corrigido)')
    console.log('=' .repeat(120))

    const escolasDisciplinaQuery = `
      SELECT
        e.nome,
        -- ATUAL (nota > 0)
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as lp_atual,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as mat_atual,
        -- CORRIGIDO (COALESCE)
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) ELSE NULL END), 2) as lp_corrigido,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) ELSE NULL END), 2) as mat_corrigido
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
        AND (rc.presenca = 'P' OR rc.presenca = 'p')
      GROUP BY e.id, e.nome
      HAVING COUNT(DISTINCT rc.aluno_id) > 0
      ORDER BY e.nome
    `

    const escolasDisciplinaResult = await pool.query(escolasDisciplinaQuery)

    let escolasComDiff = 0
    console.log(`\n${'Escola'.padEnd(45)} | ${'LP Atual'.padStart(8)} | ${'LP Corr'.padStart(8)} | ${'Dif LP'.padStart(7)} | ${'MAT Atual'.padStart(9)} | ${'MAT Corr'.padStart(9)} | ${'Dif MAT'.padStart(8)}`)
    console.log('-'.repeat(110))

    for (const row of escolasDisciplinaResult.rows) {
      const lpA = parseFloat(row.lp_atual) || 0
      const lpC = parseFloat(row.lp_corrigido) || 0
      const matA = parseFloat(row.mat_atual) || 0
      const matC = parseFloat(row.mat_corrigido) || 0
      const diffLp = lpC - lpA
      const diffMat = matC - matA

      if (Math.abs(diffLp) >= 0.01 || Math.abs(diffMat) >= 0.01) {
        escolasComDiff++
      }

      console.log(
        `${row.nome.substring(0, 45).padEnd(45)} | ${lpA.toFixed(2).padStart(8)} | ${lpC.toFixed(2).padStart(8)} | ${((diffLp >= 0 ? '+' : '') + diffLp.toFixed(2)).padStart(7)} | ${matA.toFixed(2).padStart(9)} | ${matC.toFixed(2).padStart(9)} | ${((diffMat >= 0 ? '+' : '') + diffMat.toFixed(2)).padStart(8)}`
      )
    }

    console.log(`\nEscolas com diferenca nas medias por disciplina: ${escolasComDiff} de ${escolasDisciplinaResult.rows.length}`)

    // ===== 5. IMPACTO no modal-alunos-turma (item 5): media_aluno do banco vs calculada =====
    console.log('\n\n' + '=' .repeat(120))
    console.log('IMPACTO ITEM 5: modal-alunos-turma - media_aluno do banco (divisor dinamico) vs calculada (divisor fixo)')
    console.log('=' .repeat(120))

    const alunosQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN ABS(
          CAST(rc.media_aluno AS DECIMAL) -
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
            ELSE
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
          END
        ) >= 0.01 THEN 1 END) as diferentes,
        COUNT(CASE WHEN ABS(
          CAST(rc.media_aluno AS DECIMAL) -
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
            ELSE
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
          END
        ) < 0.01 THEN 1 END) as iguais
      FROM resultados_consolidados rc
      WHERE rc.presenca IN ('P', 'p')
        AND rc.media_aluno IS NOT NULL
    `

    const alunosResult = await pool.query(alunosQuery)
    const r = alunosResult.rows[0]
    console.log(`\nTotal alunos presentes com media: ${r.total}`)
    console.log(`Alunos com media_aluno IGUAL ao calculo fixo: ${r.iguais}`)
    console.log(`Alunos com media_aluno DIFERENTE do calculo fixo: ${r.diferentes}`)
    console.log(`Percentual afetados: ${((parseInt(r.diferentes) / parseInt(r.total)) * 100).toFixed(1)}%`)

    // Mostrar exemplos de alunos afetados
    const exemplosQuery = `
      SELECT
        a.nome,
        rc.serie,
        CAST(rc.media_aluno AS DECIMAL) as media_banco,
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0, 2)
          ELSE
            ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0, 2)
        END as media_calculada,
        rc.nota_lp, rc.nota_mat, rc.nota_producao, rc.nota_ch, rc.nota_cn
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      WHERE rc.presenca IN ('P', 'p')
        AND rc.media_aluno IS NOT NULL
        AND ABS(
          CAST(rc.media_aluno AS DECIMAL) -
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
            ELSE
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
          END
        ) >= 0.01
      ORDER BY ABS(
          CAST(rc.media_aluno AS DECIMAL) -
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
            ELSE
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
          END
        ) DESC
      LIMIT 15
    `

    const exemplosResult = await pool.query(exemplosQuery)

    if (exemplosResult.rows.length > 0) {
      console.log(`\nExemplos de alunos com maior diferenca:`)
      console.log(`${'Nome'.padEnd(35)} | ${'Serie'.padEnd(8)} | ${'M.Banco'.padStart(7)} | ${'M.Calc'.padStart(7)} | ${'Dif'.padStart(6)} | LP     | MAT    | PROD   | CH     | CN`)
      console.log('-'.repeat(120))

      for (const a of exemplosResult.rows) {
        const diff = parseFloat(a.media_banco) - parseFloat(a.media_calculada)
        console.log(
          `${(a.nome || '').substring(0, 35).padEnd(35)} | ${(a.serie || '').padEnd(8)} | ${parseFloat(a.media_banco).toFixed(2).padStart(7)} | ${parseFloat(a.media_calculada).toFixed(2).padStart(7)} | ${((diff >= 0 ? '+' : '') + diff.toFixed(2)).padStart(6)} | ${(a.nota_lp || '0').toString().padStart(6)} | ${(a.nota_mat || '0').toString().padStart(6)} | ${(a.nota_producao || '-').toString().padStart(6)} | ${(a.nota_ch || '-').toString().padStart(6)} | ${(a.nota_cn || '-').toString().padStart(6)}`
        )
      }
    }

    console.log('\n\n' + '=' .repeat(120))
    console.log('RESUMO GERAL DO IMPACTO')
    console.log('=' .repeat(120))
    console.log(`\nItem 1 (Tabela Turmas painel-dados): Media = (LP+MAT+PROD)/3 ao inves de AVG(medias individuais)`)
    console.log(`  → Impacto: prova matematica mostra se ha diferenca real`)
    console.log(`\nItem 2 (Card Visao Geral): mediaGeralCalculada = estatisticas.mediaGeral`)
    console.log(`  → Mesma formula do backend (AVG medias individuais)`)
    console.log(`\nItem 3 (Card Analises): mesmo que item 2`)
    console.log(`\nItem 4 (painel-analise card): mesmo que item 2`)
    console.log(`\nItem 5 (modal-alunos-turma): usa media_aluno do banco (divisor dinamico)`)
    console.log(`  → ${r.diferentes} de ${r.total} alunos afetados (${((parseInt(r.diferentes) / parseInt(r.total)) * 100).toFixed(1)}%)`)
    console.log(`\nItem 6 (escolas/route.ts): medias por disciplina excluem nota 0`)
    console.log(`  → ${escolasComDiff} escolas com diferenca`)
    console.log(`\nItem 7 (RelatorioPoloWeb): usa media_geral do backend`)

  } catch (err) {
    console.error('Erro:', err.message)
  } finally {
    await pool.end()
  }
}

main()
