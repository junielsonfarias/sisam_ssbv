import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import {
  parseSearchParams, createWhereBuilder, addCondition, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/comparativo-notas
 *
 * Retorna dados comparativos entre notas SISAM (resultados_consolidados)
 * e notas escolares (notas_escolares) para uma turma/escola/ano.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const { escola_id, turma_id, serie } = parseSearchParams(searchParams, ['escola_id', 'turma_id', 'serie'])
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    // Restrição de acesso escola
    const escolaFiltro = usuario.tipo_usuario === 'escola' && usuario.escola_id
      ? usuario.escola_id as string
      : escola_id

    if (!escolaFiltro && !turma_id) {
      return NextResponse.json({ mensagem: 'Informe escola_id ou turma_id' }, { status: 400 })
    }

    // 1. Buscar alunos com resultados SISAM
    const where = createWhereBuilder()
    addRawCondition(where, 'a.ativo = true')

    if (turma_id) {
      addCondition(where, 'a.turma_id', turma_id)
    } else if (escolaFiltro) {
      addCondition(where, 'a.escola_id', escolaFiltro)
    }

    if (serie) {
      addRawCondition(where, `REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g') = $${where.paramIndex}`, [serie.replace(/\D/g, '')])
    }

    addCondition(where, 'a.ano_letivo', anoLetivo)

    const sisamResult = await pool.query(
      `SELECT
         a.id as aluno_id, a.nome as aluno_nome, a.codigo as aluno_codigo, a.serie,
         t.codigo as turma_codigo,
         rc.nota_lp as sisam_lp, rc.nota_mat as sisam_mat,
         rc.nota_ch as sisam_ch, rc.nota_cn as sisam_cn,
         rc.media_aluno as sisam_media, rc.nota_producao as sisam_producao
       FROM alunos a
       LEFT JOIN turmas t ON a.turma_id = t.id
       LEFT JOIN resultados_consolidados rc ON rc.aluno_id = a.id AND rc.ano_letivo = a.ano_letivo
       WHERE ${buildConditionsString(where)}
       ORDER BY a.nome`,
      where.params
    )

    if (sisamResult.rows.length === 0) {
      return NextResponse.json({
        alunos: [],
        resumo: null,
        disciplinas_mapeamento: [],
      })
    }

    const alunoIds = sisamResult.rows.map(r => r.aluno_id)

    // 2. Buscar notas escolares (média anual por disciplina) para os mesmos alunos
    const notasResult = await pool.query(
      `SELECT
         n.aluno_id,
         d.nome as disciplina_nome,
         d.codigo as disciplina_codigo,
         ROUND(AVG(n.nota_final)::numeric, 2) as media_escolar,
         SUM(n.faltas) as total_faltas,
         COUNT(n.id) as periodos_lancados
       FROM notas_escolares n
       INNER JOIN disciplinas_escolares d ON n.disciplina_id = d.id
       WHERE n.aluno_id = ANY($1) AND n.ano_letivo = $2 AND n.nota_final IS NOT NULL
       GROUP BY n.aluno_id, d.nome, d.codigo
       ORDER BY d.codigo`,
      [alunoIds, anoLetivo]
    )

    // 3. Organizar notas escolares por aluno
    const notasMap: Record<string, Record<string, { media: number; faltas: number; periodos: number }>> = {}
    for (const n of notasResult.rows) {
      if (!notasMap[n.aluno_id]) notasMap[n.aluno_id] = {}
      notasMap[n.aluno_id][n.disciplina_codigo || n.disciplina_nome] = {
        media: parseFloat(n.media_escolar),
        faltas: parseInt(n.total_faltas) || 0,
        periodos: parseInt(n.periodos_lancados) || 0,
      }
    }

    // 4. Mapeamento SISAM ↔ Escolar
    // SISAM usa: LP (Língua Portuguesa), MAT (Matemática), CH (Ciências Humanas), CN (Ciências da Natureza)
    // Escolar usa: LP (Língua Portuguesa), MAT (Matemática), CIE (Ciências), HIS (História), GEO (Geografia)
    const mapeamento = [
      { sisam: 'LP', escolar: 'LP', label: 'Língua Portuguesa' },
      { sisam: 'MAT', escolar: 'MAT', label: 'Matemática' },
    ]

    // 5. Montar dados por aluno
    const alunos = sisamResult.rows.map(row => {
      const escolares = notasMap[row.aluno_id] || {}

      // Média geral escolar (todas as disciplinas)
      const notasEscolares = Object.values(escolares)
      const mediaEscolarGeral = notasEscolares.length > 0
        ? Math.round((notasEscolares.reduce((s, n) => s + n.media, 0) / notasEscolares.length) * 100) / 100
        : null

      // Comparativos por disciplina mapeada
      const comparativos = mapeamento.map(m => {
        const sisamNota = m.sisam === 'LP' ? row.sisam_lp : row.sisam_mat
        const escolarData = escolares[m.escolar]

        return {
          disciplina: m.label,
          sisam_codigo: m.sisam,
          sisam_nota: sisamNota !== null && sisamNota !== undefined ? parseFloat(sisamNota) : null,
          escolar_media: escolarData?.media ?? null,
          delta: sisamNota !== null && escolarData?.media !== undefined
            ? Math.round((escolarData.media - parseFloat(sisamNota)) * 100) / 100
            : null,
        }
      })

      return {
        aluno_id: row.aluno_id,
        aluno_nome: row.aluno_nome,
        aluno_codigo: row.aluno_codigo,
        serie: row.serie,
        turma_codigo: row.turma_codigo,
        sisam_media: row.sisam_media !== null ? parseFloat(row.sisam_media) : null,
        sisam_lp: row.sisam_lp !== null ? parseFloat(row.sisam_lp) : null,
        sisam_mat: row.sisam_mat !== null ? parseFloat(row.sisam_mat) : null,
        escolar_media: mediaEscolarGeral,
        escolar_lp: escolares['LP']?.media ?? null,
        escolar_mat: escolares['MAT']?.media ?? null,
        comparativos,
        tem_dados_sisam: row.sisam_media !== null,
        tem_dados_escolar: notasEscolares.length > 0,
      }
    })

    // 6. Calcular resumo geral
    const comDados = alunos.filter(a => a.tem_dados_sisam && a.tem_dados_escolar)
    const apenasEscolar = alunos.filter(a => !a.tem_dados_sisam && a.tem_dados_escolar)
    const apenasSisam = alunos.filter(a => a.tem_dados_sisam && !a.tem_dados_escolar)
    const semDados = alunos.filter(a => !a.tem_dados_sisam && !a.tem_dados_escolar)

    const mediaSisam = comDados.length > 0
      ? Math.round((comDados.reduce((s, a) => s + (a.sisam_media || 0), 0) / comDados.length) * 100) / 100
      : null

    const mediaEscolar = comDados.length > 0
      ? Math.round((comDados.reduce((s, a) => s + (a.escolar_media || 0), 0) / comDados.length) * 100) / 100
      : null

    // Alunos com nota escolar >= 6 mas SISAM < 5 (discrepância)
    const discrepanciasAltas = comDados.filter(a =>
      (a.escolar_media || 0) >= 6 && (a.sisam_media || 0) < 5
    ).length

    // Alunos com nota escolar < 6 mas SISAM >= 6 (surpreenderam)
    const discrepanciasBaixas = comDados.filter(a =>
      (a.escolar_media || 0) < 6 && (a.sisam_media || 0) >= 6
    ).length

    // Média por disciplina para resumo
    const resumoPorDisciplina = mapeamento.map(m => {
      const dados = comDados.filter(a => {
        const comp = a.comparativos.find(c => c.sisam_codigo === m.sisam)
        return comp?.sisam_nota !== null && comp?.escolar_media !== null
      })

      if (dados.length === 0) return { disciplina: m.label, codigo: m.sisam, media_sisam: null, media_escolar: null, delta: null }

      const mSisam = dados.reduce((s, a) => {
        const comp = a.comparativos.find(c => c.sisam_codigo === m.sisam)
        return s + (comp?.sisam_nota || 0)
      }, 0) / dados.length

      const mEsc = dados.reduce((s, a) => {
        const comp = a.comparativos.find(c => c.sisam_codigo === m.sisam)
        return s + (comp?.escolar_media || 0)
      }, 0) / dados.length

      return {
        disciplina: m.label,
        codigo: m.sisam,
        media_sisam: Math.round(mSisam * 100) / 100,
        media_escolar: Math.round(mEsc * 100) / 100,
        delta: Math.round((mEsc - mSisam) * 100) / 100,
      }
    })

    return NextResponse.json({
      alunos,
      resumo: {
        total_alunos: alunos.length,
        com_ambos_dados: comDados.length,
        apenas_sisam: apenasSisam.length,
        apenas_escolar: apenasEscolar.length,
        sem_dados: semDados.length,
        media_sisam: mediaSisam,
        media_escolar: mediaEscolar,
        delta_geral: mediaSisam !== null && mediaEscolar !== null
          ? Math.round((mediaEscolar - mediaSisam) * 100) / 100
          : null,
        discrepancias_altas: discrepanciasAltas,
        discrepancias_baixas: discrepanciasBaixas,
        por_disciplina: resumoPorDisciplina,
      },
      disciplinas_mapeamento: mapeamento,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar comparativo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
