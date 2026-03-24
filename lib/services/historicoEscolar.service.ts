import pool from '@/database/connection'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface AlunoHistorico {
  id: string
  codigo: string
  nome: string
  serie: string
  ativo: boolean
  data_nascimento: string | null
  sexo: string
  cpf: string | null
  rg: string | null
  nome_mae: string | null
  nome_pai: string | null
  responsavel: string | null
  naturalidade: string | null
  nacionalidade: string | null
  escola_nome: string | null
  escola_id: string | null
  turma_codigo: string | null
  turma_serie: string | null
  polo_nome: string | null
}

interface BimestreNota {
  nota: number | null
  recuperacao: number | null
  final: number | null
  faltas: number
}

interface DisciplinaNotas {
  disciplina: string
  abreviacao: string
  ordem: number
  bimestres: Record<number, BimestreNota>
  media: number | null
  total_faltas: number
}

interface FrequenciaBimestral {
  periodo: string
  numero: number
  dias_letivos: number
  presencas: number
  faltas: number
  percentual: number | null
}

interface ConselhoClasse {
  parecer: string | null
  observacao: string | null
  criado_em: string
  ano_letivo: number
  turma_codigo: string | null
}

interface HistoricoSituacao {
  situacao: string
  situacao_anterior: string | null
  data: string
  observacao: string | null
  tipo_transferencia: string | null
  tipo_movimentacao: string | null
  escola_destino_id: string | null
  escola_destino_nome: string | null
  escola_origem_id: string | null
  escola_origem_nome: string | null
  criado_em: string
}

interface HistoricoEscolarResult {
  aluno: AlunoHistorico & { data_nascimento: string | null }
  notas_por_ano: Record<string, Record<string, DisciplinaNotas>>
  frequencia_por_ano: Record<string, FrequenciaBimestral[]>
  conselho: ConselhoClasse[]
  historico_situacao: HistoricoSituacao[]
  config: { nota_maxima: number; media_aprovacao: number }
}

// ── Função principal ────────────────────────────────────────────────────────

/**
 * Busca histórico escolar completo de um aluno.
 * Consolida 6 queries paralelas + processamento de dados.
 * Usado por: admin/historico-escolar
 *
 * @returns null se o aluno não existe, HistoricoEscolarResult caso contrário
 */
export async function buscarHistoricoEscolar(
  alunoId: string
): Promise<HistoricoEscolarResult | null> {
  // 1. Dados do aluno (precisa rodar antes para obter escola_id)
  const alunoResult = await pool.query(
    `SELECT a.id, a.codigo, a.nome, a.serie, a.ativo,
            a.data_nascimento, a.sexo, a.cpf, a.rg,
            a.nome_mae, a.nome_pai, a.responsavel,
            a.naturalidade, a.nacionalidade,
            e.nome as escola_nome, e.id as escola_id,
            t.codigo as turma_codigo, t.serie as turma_serie,
            p.nome as polo_nome
     FROM alunos a
     LEFT JOIN escolas e ON a.escola_id = e.id
     LEFT JOIN turmas t ON a.turma_id = t.id
     LEFT JOIN polos p ON e.polo_id = p.id
     WHERE a.id = $1`,
    [alunoId]
  )

  if (alunoResult.rows.length === 0) {
    return null
  }

  const aluno = alunoResult.rows[0]

  // 2. Queries paralelas: notas, frequência, conselho, histórico, config
  const [notasResult, freqResult, conselhoResult, historicoResult, configResult] = await Promise.all([
    // Notas por disciplina e período
    pool.query(
      `SELECT ne.nota, ne.nota_recuperacao, ne.nota_final, ne.faltas,
              d.nome as disciplina, d.abreviacao, d.ordem,
              pl.nome as periodo, pl.numero as periodo_numero, pl.ano_letivo
       FROM notas_escolares ne
       JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
       JOIN periodos_letivos pl ON ne.periodo_id = pl.id
       WHERE ne.aluno_id = $1
       ORDER BY pl.ano_letivo, d.ordem, pl.numero`,
      [alunoId]
    ),

    // Frequência bimestral (unificada)
    pool.query(
      `SELECT fb.dias_letivos, fb.presencas, fb.faltas, fb.percentual_frequencia,
              pl.nome as periodo, pl.numero as periodo_numero, pl.ano_letivo
       FROM frequencia_bimestral fb
       JOIN periodos_letivos pl ON fb.periodo_id = pl.id
       WHERE fb.aluno_id = $1
       ORDER BY pl.ano_letivo, pl.numero`,
      [alunoId]
    ),

    // Conselho de classe
    pool.query(
      `SELECT cca.parecer, cca.observacao,
              cc.criado_em, cc.ano_letivo,
              t.codigo as turma_codigo
       FROM conselho_classe_alunos cca
       JOIN conselho_classe cc ON cca.conselho_id = cc.id
       LEFT JOIN turmas t ON cc.turma_id = t.id
       WHERE cca.aluno_id = $1
       ORDER BY cc.ano_letivo DESC, cc.criado_em DESC`,
      [alunoId]
    ),

    // Histórico de situação
    pool.query(
      `SELECT hs.situacao, hs.situacao_anterior, hs.data, hs.observacao,
              hs.tipo_transferencia, hs.tipo_movimentacao,
              hs.escola_destino_id, hs.escola_destino_nome,
              hs.escola_origem_id, hs.escola_origem_nome,
              hs.criado_em
       FROM historico_situacao hs
       WHERE hs.aluno_id = $1
       ORDER BY hs.data DESC, hs.criado_em DESC`,
      [alunoId]
    ),

    // Configuração de notas da escola
    pool.query(
      `SELECT nota_maxima, media_aprovacao
       FROM configuracao_notas_escola
       WHERE escola_id = $1
       LIMIT 1`,
      [aluno.escola_id]
    ),
  ])

  // 3. Organizar notas por ano_letivo e disciplina
  const notasPorAno: Record<string, Record<string, DisciplinaNotas>> = {}
  for (const nota of notasResult.rows) {
    const ano = nota.ano_letivo
    if (!notasPorAno[ano]) notasPorAno[ano] = {}
    const disc = nota.disciplina
    if (!notasPorAno[ano][disc]) {
      notasPorAno[ano][disc] = {
        disciplina: disc,
        abreviacao: nota.abreviacao,
        ordem: nota.ordem,
        bimestres: {},
        media: null,
        total_faltas: 0,
      }
    }
    notasPorAno[ano][disc].bimestres[nota.periodo_numero] = {
      nota: nota.nota !== null ? parseFloat(nota.nota) : null,
      recuperacao: nota.nota_recuperacao !== null ? parseFloat(nota.nota_recuperacao) : null,
      final: nota.nota_final !== null ? parseFloat(nota.nota_final) : null,
      faltas: nota.faltas !== null ? parseInt(nota.faltas) : 0,
    }
  }

  // 4. Calcular médias por disciplina
  for (const ano of Object.keys(notasPorAno)) {
    for (const disc of Object.keys(notasPorAno[ano])) {
      const bims = notasPorAno[ano][disc].bimestres
      const notasFinais = Object.values(bims)
        .map((b: BimestreNota) => b.final ?? b.nota)
        .filter((n): n is number => n !== null)
      const totalFaltas = Object.values(bims).reduce(
        (sum: number, b: BimestreNota) => sum + (b.faltas || 0),
        0
      )
      notasPorAno[ano][disc].media =
        notasFinais.length > 0
          ? parseFloat((notasFinais.reduce((a, b) => a + b, 0) / notasFinais.length).toFixed(1))
          : null
      notasPorAno[ano][disc].total_faltas = totalFaltas
    }
  }

  // 5. Organizar frequência por ano
  const freqPorAno: Record<string, FrequenciaBimestral[]> = {}
  for (const f of freqResult.rows) {
    const ano = f.ano_letivo
    if (!freqPorAno[ano]) freqPorAno[ano] = []
    freqPorAno[ano].push({
      periodo: f.periodo,
      numero: f.periodo_numero,
      dias_letivos: parseInt(f.dias_letivos || '0'),
      presencas: parseInt(f.presencas || '0'),
      faltas: parseInt(f.faltas || '0'),
      percentual: f.percentual_frequencia !== null ? parseFloat(f.percentual_frequencia) : null,
    })
  }

  // 6. Config com fallback
  const config = configResult.rows[0] || { nota_maxima: 10, media_aprovacao: 6 }

  return {
    aluno: {
      ...aluno,
      data_nascimento: aluno.data_nascimento
        ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')
        : null,
    },
    notas_por_ano: notasPorAno,
    frequencia_por_ano: freqPorAno,
    conselho: conselhoResult.rows,
    historico_situacao: historicoResult.rows,
    config: {
      nota_maxima: parseFloat(config.nota_maxima),
      media_aprovacao: parseFloat(config.media_aprovacao),
    },
  }
}
