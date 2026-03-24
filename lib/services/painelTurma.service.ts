import pool from '@/database/connection'
import { isAnosFinais } from '@/lib/disciplinas-mapping'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface TurmaInfo {
  id: string
  codigo: string
  nome: string
  serie: string
  escola_id: string
}

interface AlunoResumo {
  id: string
  nome: string
  codigo: string
  na_escola: boolean
  hora_entrada: string | null
  hora_saida: string | null
  aulas?: Record<number, { presente: boolean; disciplina_id: string; metodo: string } | null>
}

interface HorarioAula {
  numero_aula: number
  disciplina_id: string
  disciplina_nome: string
  disciplina_codigo: string
}

interface PainelTurmaResult {
  turma: Pick<TurmaInfo, 'id' | 'codigo' | 'nome' | 'serie'>
  data: string
  dia_semana: number
  modelo_frequencia: 'por_aula' | 'unificada'
  alunos: AlunoResumo[]
  horario_dia: HorarioAula[]
  aulas_registradas: number[]
  resumo: {
    total_alunos: number
    presentes_na_escola: number
    ausentes: number
    aulas_registradas: number
    total_aulas: number
  }
}

// ── Função principal ────────────────────────────────────────────────────────

/**
 * Busca todos os dados do painel de turma para uma data.
 * Consolida até 5 queries (paralelas quando possível) em uma única função.
 * Usado por: admin/painel-turma
 *
 * @returns null se a turma não existe, PainelTurmaResult caso contrário
 */
export async function buscarPainelTurma(
  turmaId: string,
  data: string
): Promise<PainelTurmaResult | null> {
  // 1. Buscar info da turma
  const turmaResult = await pool.query(
    `SELECT t.id, t.codigo, t.nome, t.serie, t.escola_id
     FROM turmas t WHERE t.id = $1`,
    [turmaId]
  )

  if (turmaResult.rows.length === 0) {
    return null
  }

  const turma: TurmaInfo = turmaResult.rows[0]

  // 2. Determinar modelo de frequência
  const porAula = isAnosFinais(turma.serie)

  // Calcular dia da semana (1=Seg, 5=Sex)
  const dataObj = new Date(data + 'T12:00:00')
  const jsDay = dataObj.getUTCDay() // 0=Dom, 1=Seg, ..., 6=Sab
  const diaSemana = jsDay === 0 ? 7 : jsDay // 1=Seg...5=Sex, 6=Sab, 7=Dom
  const isDiaLetivo = diaSemana >= 1 && diaSemana <= 5

  // 3. Queries paralelas: alunos + entradas (sempre), horário + freq aulas (só anos finais em dia letivo)
  const [alunosResult, entradasResult, horarioResult, fhaResult] = await Promise.all([
    // Alunos da turma
    pool.query(
      `SELECT a.id, a.nome, a.codigo, a.situacao
       FROM alunos a
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
       ORDER BY a.nome`,
      [turmaId]
    ),

    // Entradas do dia (frequencia_diaria)
    pool.query(
      `SELECT aluno_id, hora_entrada, hora_saida
       FROM frequencia_diaria
       WHERE turma_id = $1 AND data = $2`,
      [turmaId, data]
    ),

    // Horário do dia (apenas para 6º-9º em dia letivo)
    porAula && isDiaLetivo
      ? pool.query(
          `SELECT h.numero_aula, h.disciplina_id,
                  d.nome AS disciplina_nome, d.codigo AS disciplina_codigo
           FROM horarios_aula h
           INNER JOIN disciplinas_escolares d ON d.id = h.disciplina_id
           WHERE h.turma_id = $1 AND h.dia_semana = $2
           ORDER BY h.numero_aula`,
          [turmaId, diaSemana]
        )
      : Promise.resolve({ rows: [] as any[] }),

    // Frequência por aula já registrada (apenas para 6º-9º em dia letivo)
    porAula && isDiaLetivo
      ? pool.query(
          `SELECT aluno_id, numero_aula, disciplina_id, presente, metodo
           FROM frequencia_hora_aula
           WHERE turma_id = $1 AND data = $2`,
          [turmaId, data]
        )
      : Promise.resolve({ rows: [] as any[] }),
  ])

  // 4. Montar mapa de entradas
  const entradasMap = new Map<string, { hora_entrada: string | null; hora_saida: string | null }>()
  for (const e of entradasResult.rows) {
    entradasMap.set(e.aluno_id, { hora_entrada: e.hora_entrada, hora_saida: e.hora_saida })
  }

  // 5. Montar mapa de frequência por aula
  const frequenciaAulas = new Map<string, Map<number, any>>()
  for (const f of fhaResult.rows) {
    if (!frequenciaAulas.has(f.aluno_id)) {
      frequenciaAulas.set(f.aluno_id, new Map())
    }
    frequenciaAulas.get(f.aluno_id)!.set(f.numero_aula, {
      presente: f.presente,
      disciplina_id: f.disciplina_id,
      metodo: f.metodo,
    })
  }

  const horarioDia: HorarioAula[] = horarioResult.rows

  // 6. Montar resposta dos alunos
  const alunos: AlunoResumo[] = alunosResult.rows.map((a: any) => {
    const entrada = entradasMap.get(a.id)
    const aulas: Record<number, any> = {}

    if (porAula) {
      const aulasAluno = frequenciaAulas.get(a.id)
      for (let i = 1; i <= 6; i++) {
        aulas[i] = aulasAluno?.get(i) || null
      }
    }

    return {
      id: a.id,
      nome: a.nome,
      codigo: a.codigo,
      na_escola: !!entrada?.hora_entrada,
      hora_entrada: entrada?.hora_entrada || null,
      hora_saida: entrada?.hora_saida || null,
      aulas: porAula ? aulas : undefined,
    }
  })

  // 7. Contar aulas já registradas
  const aulasRegistradas = new Set<number>()
  for (const [, aulasMap] of frequenciaAulas) {
    for (const [num] of aulasMap) {
      aulasRegistradas.add(num)
    }
  }

  // 8. Montar resultado final
  return {
    turma: {
      id: turma.id,
      codigo: turma.codigo,
      nome: turma.nome,
      serie: turma.serie,
    },
    data,
    dia_semana: diaSemana,
    modelo_frequencia: porAula ? 'por_aula' : 'unificada',
    alunos,
    horario_dia: horarioDia,
    aulas_registradas: Array.from(aulasRegistradas),
    resumo: {
      total_alunos: alunos.length,
      presentes_na_escola: alunos.filter(a => a.na_escola).length,
      ausentes: alunos.filter(a => !a.na_escola).length,
      aulas_registradas: aulasRegistradas.size,
      total_aulas: horarioDia.length,
    },
  }
}
