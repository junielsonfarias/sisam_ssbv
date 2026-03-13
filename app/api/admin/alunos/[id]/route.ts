import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/alunos/[id]
 * Retorna dados completos do aluno: informações pessoais, escola, turma,
 * histórico de situação, notas escolares, frequência, SISAM e conselho.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const alunoId = params.id

    // 1. Dados completos do aluno
    const alunoResult = await pool.query(
      `SELECT a.*,
              e.nome as escola_nome, e.id as escola_id,
              t.codigo as turma_codigo, t.nome as turma_nome, t.serie as turma_serie,
              p.nome as polo_nome, p.id as polo_id
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       LEFT JOIN polos p ON e.polo_id = p.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Restrição de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== aluno.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    // 2-7: Buscar dados complementares em paralelo
    const [
      historicoResult,
      notasResult,
      freqResult,
      sisamResult,
      conselhoResult,
      turmasHistResult,
    ] = await Promise.all([
      // 2. Histórico de situação
      pool.query(
        `SELECT hs.*, u.nome as registrado_por_nome,
                ed.nome as escola_destino_ref_nome,
                eo.nome as escola_origem_ref_nome
         FROM historico_situacao hs
         LEFT JOIN usuarios u ON hs.registrado_por = u.id
         LEFT JOIN escolas ed ON hs.escola_destino_id = ed.id
         LEFT JOIN escolas eo ON hs.escola_origem_id = eo.id
         WHERE hs.aluno_id = $1
         ORDER BY hs.data DESC, hs.criado_em DESC`,
        [alunoId]
      ),

      // 3. Notas escolares (todos os períodos)
      pool.query(
        `SELECT ne.*, d.nome as disciplina_nome, d.abreviacao as disciplina_abreviacao,
                pl.nome as periodo_nome, pl.numero as periodo_numero
         FROM notas_escolares ne
         INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
         INNER JOIN periodos_letivos pl ON ne.periodo_id = pl.id
         WHERE ne.aluno_id = $1
         ORDER BY ne.ano_letivo DESC, pl.numero, d.nome`,
        [alunoId]
      ),

      // 4. Frequência unificada
      pool.query(
        `SELECT fb.*, pl.nome as periodo_nome, pl.numero as periodo_numero
         FROM frequencia_bimestral fb
         INNER JOIN periodos_letivos pl ON fb.periodo_id = pl.id
         WHERE fb.aluno_id = $1
         ORDER BY fb.ano_letivo DESC, pl.numero`,
        [alunoId]
      ),

      // 5. Resultados SISAM (consolidados) com config da série
      pool.query(
        `SELECT rc.*,
                cs.qtd_questoes_lp, cs.qtd_questoes_mat, cs.qtd_questoes_ch, cs.qtd_questoes_cn,
                cs.tem_producao_textual, cs.qtd_itens_producao,
                cs.avalia_lp, cs.avalia_mat, cs.avalia_ch, cs.avalia_cn,
                cs.usa_nivel_aprendizagem
         FROM resultados_consolidados rc
         LEFT JOIN configuracao_series cs ON cs.serie = REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')
         WHERE rc.aluno_id = $1
         ORDER BY rc.ano_letivo DESC`,
        [alunoId]
      ),

      // 6. Pareceres do conselho de classe
      pool.query(
        `SELECT cca.parecer, cca.observacao, cc.ano_letivo,
                pl.nome as periodo_nome, pl.numero as periodo_numero
         FROM conselho_classe_alunos cca
         INNER JOIN conselho_classe cc ON cca.conselho_id = cc.id
         INNER JOIN periodos_letivos pl ON cc.periodo_id = pl.id
         WHERE cca.aluno_id = $1
         ORDER BY cc.ano_letivo DESC, pl.numero`,
        [alunoId]
      ),

      // 7. Histórico de turmas (matrículas em diferentes turmas/anos)
      pool.query(
        `SELECT DISTINCT a2.ano_letivo, a2.serie, t2.codigo as turma_codigo, t2.nome as turma_nome,
                e2.nome as escola_nome, a2.situacao, a2.data_matricula
         FROM alunos a2
         INNER JOIN escolas e2 ON a2.escola_id = e2.id
         LEFT JOIN turmas t2 ON a2.turma_id = t2.id
         WHERE (a2.id = $1 OR (a2.nome = $2 AND a2.codigo = $3))
         ORDER BY a2.ano_letivo DESC`,
        [alunoId, aluno.nome, aluno.codigo]
      ),
    ])

    // Organizar notas por ano/período
    const notasPorAno: Record<string, any[]> = {}
    for (const n of notasResult.rows) {
      const key = n.ano_letivo
      if (!notasPorAno[key]) notasPorAno[key] = []
      notasPorAno[key].push({
        disciplina: n.disciplina_nome,
        abreviacao: n.disciplina_abreviacao,
        periodo: n.periodo_nome,
        periodo_numero: n.periodo_numero,
        nota: n.nota !== null ? parseFloat(n.nota) : null,
        nota_recuperacao: n.nota_recuperacao !== null ? parseFloat(n.nota_recuperacao) : null,
        nota_final: n.nota_final !== null ? parseFloat(n.nota_final) : null,
        faltas: n.faltas || 0,
      })
    }

    return NextResponse.json({
      aluno,
      historico_situacao: historicoResult.rows,
      notas: notasPorAno,
      frequencia: freqResult.rows.map(f => ({
        ...f,
        percentual_frequencia: f.percentual_frequencia ? parseFloat(f.percentual_frequencia) : null,
      })),
      sisam: sisamResult.rows,
      conselho: conselhoResult.rows,
      historico_turmas: turmasHistResult.rows,
    })
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/alunos/[id]
 * Atualiza dados do aluno (todos os campos)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const alunoId = params.id
    const body = await request.json()

    // Verificar se aluno existe
    const existeResult = await pool.query('SELECT escola_id FROM alunos WHERE id = $1', [alunoId])
    if (existeResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    // Restrição para escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== existeResult.rows[0].escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    // Campos atualizáveis
    const campos = [
      'nome', 'codigo', 'escola_id', 'turma_id', 'serie', 'ano_letivo',
      'cpf', 'data_nascimento', 'pcd',
      'nome_mae', 'nome_pai', 'responsavel', 'telefone_responsavel',
      'genero', 'raca_cor', 'naturalidade', 'nacionalidade',
      'rg', 'certidao_nascimento', 'sus',
      'endereco', 'bairro', 'cidade', 'cep',
      'bolsa_familia', 'nis',
      'projeto_contraturno', 'projeto_nome',
      'tipo_deficiencia', 'alergia', 'medicacao',
      'observacoes',
    ]

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 1

    for (const campo of campos) {
      if (body[campo] !== undefined) {
        setClauses.push(`${campo} = $${idx}`)
        values.push(body[campo] === '' ? null : body[campo])
        idx++
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ mensagem: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    setClauses.push(`atualizado_em = CURRENT_TIMESTAMP`)
    values.push(alunoId)

    await pool.query(
      `UPDATE alunos SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    )

    return NextResponse.json({ mensagem: 'Aluno atualizado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao atualizar aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
