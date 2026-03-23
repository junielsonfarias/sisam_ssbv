import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id é obrigatório' }, { status: 400 })
    }

    // Dados do aluno
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
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    // Filtrar por escola se usuário é escola
    const aluno = alunoResult.rows[0]
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && aluno.escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    // Notas por disciplina e período
    const notasResult = await pool.query(
      `SELECT ne.nota, ne.nota_recuperacao, ne.nota_final, ne.faltas,
              d.nome as disciplina, d.abreviacao, d.ordem,
              pl.nome as periodo, pl.numero as periodo_numero, pl.ano_letivo
       FROM notas_escolares ne
       JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
       JOIN periodos_letivos pl ON ne.periodo_id = pl.id
       WHERE ne.aluno_id = $1
       ORDER BY pl.ano_letivo, d.ordem, pl.numero`,
      [alunoId]
    )

    // Frequência bimestral (unificada)
    const freqResult = await pool.query(
      `SELECT fb.dias_letivos, fb.presencas, fb.faltas, fb.percentual_frequencia,
              pl.nome as periodo, pl.numero as periodo_numero, pl.ano_letivo
       FROM frequencia_bimestral fb
       JOIN periodos_letivos pl ON fb.periodo_id = pl.id
       WHERE fb.aluno_id = $1
       ORDER BY pl.ano_letivo, pl.numero`,
      [alunoId]
    )

    // Conselho de classe (via conselho_classe_alunos)
    const conselhoResult = await pool.query(
      `SELECT cca.parecer, cca.observacao,
              cc.criado_em, cc.ano_letivo,
              t.codigo as turma_codigo
       FROM conselho_classe_alunos cca
       JOIN conselho_classe cc ON cca.conselho_id = cc.id
       LEFT JOIN turmas t ON cc.turma_id = t.id
       WHERE cca.aluno_id = $1
       ORDER BY cc.ano_letivo DESC, cc.criado_em DESC`,
      [alunoId]
    )

    // Histórico de situação (campos reais + extras de transferência)
    const historicoResult = await pool.query(
      `SELECT hs.situacao, hs.situacao_anterior, hs.data, hs.observacao,
              hs.tipo_transferencia, hs.tipo_movimentacao,
              hs.escola_destino_id, hs.escola_destino_nome,
              hs.escola_origem_id, hs.escola_origem_nome,
              hs.criado_em
       FROM historico_situacao hs
       WHERE hs.aluno_id = $1
       ORDER BY hs.data DESC, hs.criado_em DESC`,
      [alunoId]
    )

    // Configuração de notas da escola
    const configResult = await pool.query(
      `SELECT nota_maxima, media_aprovacao
       FROM configuracao_notas_escola
       WHERE escola_id = $1
       LIMIT 1`,
      [aluno.escola_id]
    )

    // Organizar notas por ano_letivo e disciplina
    const notasPorAno: Record<string, any> = {}
    for (const nota of notasResult.rows) {
      const ano = nota.ano_letivo
      if (!notasPorAno[ano]) notasPorAno[ano] = {}
      const disc = nota.disciplina
      if (!notasPorAno[ano][disc]) {
        notasPorAno[ano][disc] = { disciplina: disc, abreviacao: nota.abreviacao, ordem: nota.ordem, bimestres: {} }
      }
      notasPorAno[ano][disc].bimestres[nota.periodo_numero] = {
        nota: nota.nota !== null ? parseFloat(nota.nota) : null,
        recuperacao: nota.nota_recuperacao !== null ? parseFloat(nota.nota_recuperacao) : null,
        final: nota.nota_final !== null ? parseFloat(nota.nota_final) : null,
        faltas: nota.faltas !== null ? parseInt(nota.faltas) : 0
      }
    }

    // Calcular médias por disciplina
    for (const ano of Object.keys(notasPorAno)) {
      for (const disc of Object.keys(notasPorAno[ano])) {
        const bims = notasPorAno[ano][disc].bimestres
        const notasFinais = Object.values(bims).map((b: any) => b.final ?? b.nota).filter((n: any) => n !== null) as number[]
        const totalFaltas = Object.values(bims).reduce((sum: number, b: any) => sum + (b.faltas || 0), 0)
        notasPorAno[ano][disc].media = notasFinais.length > 0
          ? parseFloat((notasFinais.reduce((a, b) => a + b, 0) / notasFinais.length).toFixed(1))
          : null
        notasPorAno[ano][disc].total_faltas = totalFaltas
      }
    }

    // Organizar frequência por ano
    const freqPorAno: Record<string, any[]> = {}
    for (const f of freqResult.rows) {
      const ano = f.ano_letivo
      if (!freqPorAno[ano]) freqPorAno[ano] = []
      freqPorAno[ano].push({
        periodo: f.periodo,
        numero: f.periodo_numero,
        dias_letivos: parseInt(f.dias_letivos || '0'),
        presencas: parseInt(f.presencas || '0'),
        faltas: parseInt(f.faltas || '0'),
        percentual: f.percentual_frequencia !== null ? parseFloat(f.percentual_frequencia) : null
      })
    }

    const config = configResult.rows[0] || { nota_maxima: 10, media_aprovacao: 6 }

    return NextResponse.json({
      aluno: {
        ...aluno,
        data_nascimento: aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') : null
      },
      notas_por_ano: notasPorAno,
      frequencia_por_ano: freqPorAno,
      conselho: conselhoResult.rows,
      historico_situacao: historicoResult.rows,
      config: {
        nota_maxima: parseFloat(config.nota_maxima),
        media_aprovacao: parseFloat(config.media_aprovacao)
      }
    })

  } catch (error: unknown) {
    console.error('Erro ao buscar histórico escolar:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
