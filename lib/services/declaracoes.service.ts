/**
 * Service de Declarações e Atestados automáticos.
 *
 * Gera 4 tipos de declarações simples para o aluno:
 *  - declaracao_matricula: que está matriculado em X serie em Y escola
 *  - declaracao_frequencia: frequência atual no ano em curso
 *  - declaracao_conclusao: que concluiu a série tal no ano tal
 *  - (declaracao_transferencia já está no service de transferencia-documento)
 *
 * Usa o service genérico de documentos para emitir com código de validação.
 *
 * @module services/declaracoes
 */

import pool from '@/database/connection'
import { emitirDocumento, TipoDocumento } from './documentos.service'

export interface DadosDeclaracao {
  tipo: TipoDocumento
  aluno: {
    id: string
    nome: string
    cpf: string | null
    matricula: string | null
    data_nascimento: string | null
  }
  escola: {
    nome: string
    inep: string | null
  }
  ano_letivo: string
  serie: string | null
  conteudo: string  // Texto principal já formatado da declaração
  metadados: Record<string, unknown>
}

async function coletarDadosBase(alunoId: string) {
  const r = await pool.query(
    `SELECT a.id, a.nome, a.cpf, a.matricula, a.data_nascimento, a.serie,
            e.nome AS escola_nome, e.codigo_inep
       FROM alunos a
       LEFT JOIN escolas e ON e.id = a.escola_id
      WHERE a.id = $1`,
    [alunoId]
  )
  return r.rows[0]
}

export async function gerarDeclaracaoMatricula(params: {
  alunoId: string
  anoLetivo: string
  emitidoPor: string
}) {
  const aluno = await coletarDadosBase(params.alunoId)
  if (!aluno) throw new Error('Aluno não encontrado')

  const conteudo = `Declaramos para os devidos fins que o(a) aluno(a) ${aluno.nome}, ` +
    `${aluno.cpf ? `CPF ${aluno.cpf}, ` : ''}` +
    `está regularmente matriculado(a) na ${aluno.serie || 'série não informada'} ` +
    `desta unidade escolar no ano letivo de ${params.anoLetivo}.`

  const dados: DadosDeclaracao = {
    tipo: 'declaracao_matricula',
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      cpf: aluno.cpf,
      matricula: aluno.matricula,
      data_nascimento: aluno.data_nascimento,
    },
    escola: { nome: aluno.escola_nome, inep: aluno.codigo_inep },
    ano_letivo: params.anoLetivo,
    serie: aluno.serie,
    conteudo,
    metadados: {},
  }

  return emitirDocumento({
    tipo: 'declaracao_matricula',
    alunoId: params.alunoId,
    dados: dados as unknown as Record<string, unknown>,
    emitidoPor: params.emitidoPor,
    escolaNome: aluno.escola_nome,
  })
}

export async function gerarDeclaracaoFrequencia(params: {
  alunoId: string
  anoLetivo: string
  emitidoPor: string
}) {
  const aluno = await coletarDadosBase(params.alunoId)
  if (!aluno) throw new Error('Aluno não encontrado')

  // Calcula frequência do ano
  let frequenciaPercentual: number | null = null
  let totalDias = 0
  let presentes = 0
  try {
    const r = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(CASE WHEN status IN ('presente','justificado') THEN 1 END) AS presentes
       FROM frequencia_diaria
       WHERE aluno_id = $1
         AND data >= ($2 || '-01-01')::date
         AND data <= ($2 || '-12-31')::date`,
      [params.alunoId, params.anoLetivo]
    )
    totalDias = parseInt(r.rows[0]?.total || '0', 10)
    presentes = parseInt(r.rows[0]?.presentes || '0', 10)
    if (totalDias > 0) {
      frequenciaPercentual = Math.round((presentes / totalDias) * 1000) / 10
    }
  } catch { /* tabela pode não existir */ }

  const pctTexto = frequenciaPercentual != null
    ? `${frequenciaPercentual.toFixed(1)}% de frequência (${presentes} presenças em ${totalDias} dias letivos registrados)`
    : 'sem registros de frequência no período'

  const conteudo = `Declaramos para os devidos fins que o(a) aluno(a) ${aluno.nome} ` +
    `apresenta ${pctTexto} no ano letivo de ${params.anoLetivo}, ` +
    `na ${aluno.serie || 'série não informada'} desta unidade escolar.`

  const dados: DadosDeclaracao = {
    tipo: 'declaracao_frequencia',
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      cpf: aluno.cpf,
      matricula: aluno.matricula,
      data_nascimento: aluno.data_nascimento,
    },
    escola: { nome: aluno.escola_nome, inep: aluno.codigo_inep },
    ano_letivo: params.anoLetivo,
    serie: aluno.serie,
    conteudo,
    metadados: { frequencia_percentual: frequenciaPercentual, dias_letivos: totalDias, presencas: presentes },
  }

  return emitirDocumento({
    tipo: 'declaracao_frequencia',
    alunoId: params.alunoId,
    dados: dados as unknown as Record<string, unknown>,
    emitidoPor: params.emitidoPor,
    escolaNome: aluno.escola_nome,
  })
}

export async function gerarDeclaracaoConclusao(params: {
  alunoId: string
  anoLetivo: string
  serieConcluida: string
  emitidoPor: string
}) {
  const aluno = await coletarDadosBase(params.alunoId)
  if (!aluno) throw new Error('Aluno não encontrado')

  const conteudo = `Declaramos para os devidos fins que o(a) aluno(a) ${aluno.nome}, ` +
    `${aluno.cpf ? `CPF ${aluno.cpf}, ` : ''}` +
    `concluiu a ${params.serieConcluida} no ano letivo de ${params.anoLetivo}, ` +
    `estando apto(a) a prosseguir para a série seguinte.`

  const dados: DadosDeclaracao = {
    tipo: 'declaracao_conclusao',
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      cpf: aluno.cpf,
      matricula: aluno.matricula,
      data_nascimento: aluno.data_nascimento,
    },
    escola: { nome: aluno.escola_nome, inep: aluno.codigo_inep },
    ano_letivo: params.anoLetivo,
    serie: params.serieConcluida,
    conteudo,
    metadados: { serie_concluida: params.serieConcluida },
  }

  return emitirDocumento({
    tipo: 'declaracao_conclusao',
    alunoId: params.alunoId,
    dados: dados as unknown as Record<string, unknown>,
    emitidoPor: params.emitidoPor,
    escolaNome: aluno.escola_nome,
  })
}
