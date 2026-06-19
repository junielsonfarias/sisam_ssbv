import pool from '@/database/connection'

// ============================================================================
// Service de Importação de Resultados de Provas (importador simples /importar)
// Extrai a deteccao de colunas, carga de caches e parsing de linha para manter
// a rota fina. Usado por: POST /api/admin/importar
// ============================================================================

/** Mapeamento das colunas detectadas na planilha (null = coluna ausente). */
export interface ColunasResultado {
  escola: string | null
  aluno: string | null
  nomeAluno: string | null
  questao: string | null
  resposta: string | null
  acertou: string | null
  nota: string | null
  data: string | null
  ano: string | null
  serie: string | null
  turma: string | null
  disciplina: string | null
  area: string | null
}

/** Caches em memória para resolver escola/questão/aluno sem N+1. */
export interface CachesImportacao {
  escolasCache: Map<string, string>
  questoesCache: Map<string, string>
  alunosCache: Map<string, string>
  buscarEscolaId: (codigo: string) => string | null
}

/**
 * Detecta as colunas da planilha por múltiplos nomes possíveis (exato + case-
 * insensitive). Retorna o nome real de cada coluna ou null se ausente.
 */
export function detectarColunasResultado(colunasDisponiveis: string[]): ColunasResultado {
  const encontrarColuna = (nomesPossiveis: string[]): string | null => {
    for (const nome of nomesPossiveis) {
      if (colunasDisponiveis.includes(nome)) return nome
      const encontrada = colunasDisponiveis.find(
        col => col.toLowerCase().trim() === nome.toLowerCase().trim()
      )
      if (encontrada) return encontrada
    }
    return null
  }

  return {
    escola: encontrarColuna([
      'Código Escola', 'codigo_escola', 'Escola', 'escola',
      'Código da Escola', 'CODIGO_ESCOLA', 'ESCOLA',
      'CódigoEscola', 'CodigoEscola', 'codigoEscola',
    ]),
    aluno: encontrarColuna([
      'Código Aluno', 'codigo_aluno', 'Aluno', 'aluno',
      'Código do Aluno', 'CODIGO_ALUNO', 'ALUNO',
      'CódigoAluno', 'CodigoAluno', 'codigoAluno', 'Matrícula', 'matricula',
    ]),
    nomeAluno: encontrarColuna([
      'Nome Aluno', 'nome_aluno', 'Nome', 'nome',
      'Nome do Aluno', 'NOME_ALUNO', 'NOME',
      'NomeAluno', 'NomeCompleto', 'nome_completo',
    ]),
    questao: encontrarColuna([
      'Código Questão', 'codigo_questao', 'Questão', 'questao',
      'Código da Questão', 'CODIGO_QUESTAO', 'QUESTAO',
      'CódigoQuestão', 'Questao', 'Item',
    ]),
    resposta: encontrarColuna([
      'Resposta', 'resposta', 'Resposta Aluno', 'resposta_aluno',
      'RESPOSTA', 'Alternativa', 'alternativa',
    ]),
    acertou: encontrarColuna([
      'Acertou', 'acertou', 'ACERTOU', 'Acerto', 'acerto',
      'Correto', 'correto', 'Status', 'status',
    ]),
    nota: encontrarColuna([
      'Nota', 'nota', 'NOTA', 'Pontuação', 'pontuacao', 'Pontos', 'pontos',
    ]),
    data: encontrarColuna([
      'Data', 'data', 'DATA', 'Data Prova', 'data_prova',
      'Data da Prova', 'DataProva',
    ]),
    ano: encontrarColuna([
      'Ano Letivo', 'ano_letivo', 'Ano', 'ano', 'ANO',
      'AnoLetivo', 'Ano Escolar',
    ]),
    serie: encontrarColuna([
      'Série', 'serie', 'SERIE', 'Serie', 'Série/Ano',
      'Ano Escolar', 'ano_escolar', 'Grade', 'grade',
    ]),
    turma: encontrarColuna(['Turma', 'turma', 'TURMA', 'Classe', 'classe']),
    disciplina: encontrarColuna([
      'Disciplina', 'disciplina', 'DISCIPLINA', 'Matéria', 'materia',
      'Componente Curricular', 'componente_curricular',
    ]),
    area: encontrarColuna([
      'Área', 'area', 'AREA', 'Área Conhecimento', 'area_conhecimento',
      'Área de Conhecimento', 'AreaConhecimento',
    ]),
  }
}

/**
 * Carrega escolas, questões e alunos em memória (1 query cada, em paralelo) e
 * monta os caches + a função de busca de escola com fallback parcial.
 */
export async function carregarCachesImportacao(): Promise<CachesImportacao> {
  const [escolasResult, questoesResult, alunosResult] = await Promise.all([
    pool.query('SELECT id, codigo, nome FROM escolas WHERE ativo = true'),
    pool.query('SELECT id, codigo FROM questoes'),
    pool.query("SELECT id, codigo FROM alunos WHERE ativo = true AND codigo IS NOT NULL AND codigo <> ''"),
  ])

  const escolasCache = new Map<string, string>()
  for (const e of escolasResult.rows) {
    if (e.codigo) escolasCache.set(e.codigo.toLowerCase(), e.id)
    if (e.nome) {
      escolasCache.set(e.nome.toLowerCase(), e.id)
      escolasCache.set(e.nome.toUpperCase(), e.id)
    }
  }
  const escolasRows = escolasResult.rows

  const questoesCache = new Map<string, string>()
  for (const q of questoesResult.rows) {
    if (q.codigo) questoesCache.set(q.codigo, q.id)
  }

  // Cache codigo -> aluno_id. Sem aluno_id, o ON CONFLICT
  // (aluno_id, questao_codigo, avaliacao_id) NUNCA colide (NULLs sao distintos),
  // duplicando resultados a cada reimport e gerando linhas orfas ilegiveis por
  // aluno. Resolvemos o aluno_id aqui e exigimos que a linha tenha um aluno.
  const alunosCache = new Map<string, string>()
  for (const a of alunosResult.rows) {
    if (a.codigo) alunosCache.set(a.codigo.toString().toLowerCase().trim(), a.id)
  }

  // Função de busca de escola com fallback parcial (contains)
  const buscarEscolaId = (codigo: string): string | null => {
    const lower = codigo.toLowerCase()
    if (escolasCache.has(lower)) return escolasCache.get(lower)!
    for (const e of escolasRows) {
      if (e.nome && e.nome.toLowerCase().includes(lower)) {
        escolasCache.set(lower, e.id)
        return e.id
      }
      if (e.codigo && e.codigo.toLowerCase().includes(lower)) {
        escolasCache.set(lower, e.id)
        return e.id
      }
    }
    return null
  }

  return { escolasCache, questoesCache, alunosCache, buscarEscolaId }
}

/** Quantidade de escolas ativas carregadas no cache (chaves únicas por id). */
export function contarEscolas(caches: CachesImportacao): number {
  return new Set(caches.escolasCache.values()).size
}

/**
 * Converte uma linha da planilha nos 16 valores do INSERT em resultados_provas.
 * Lança Error (com motivo) se faltar escola ou aluno — ambos obrigatórios:
 * escola para integridade e aluno_id porque é a chave do upsert (sem ele a
 * linha duplica a cada reimport e fica órfã).
 *
 * Ordem das colunas: escola_id, aluno_id, aluno_codigo, aluno_nome, questao_id,
 * questao_codigo, resposta_aluno, acertou, nota, data_prova, ano_letivo, serie,
 * turma, disciplina, area_conhecimento, avaliacao_id.
 */
export function montarLinhaResultado(
  linha: Record<string, unknown>,
  cols: ColunasResultado,
  caches: CachesImportacao,
  avaliacaoId: string
): unknown[] {
  const escolaCodigo = cols.escola ? (linha[cols.escola] || '').toString().trim() : null
  const alunoCodigo = cols.aluno ? (linha[cols.aluno] || '').toString().trim() : null
  const alunoNome = cols.nomeAluno ? (linha[cols.nomeAluno] || '').toString().trim() : null
  const questaoCodigo = cols.questao ? (linha[cols.questao] || '').toString().trim() : null
  const respostaAluno = cols.resposta ? (linha[cols.resposta] || '').toString().trim() : null

  let acertou: boolean | null = null
  if (cols.acertou) {
    const valorAcertou = (linha[cols.acertou] || '').toString().toLowerCase().trim()
    if (['sim', 's', 'true', '1', 'x', '✓'].includes(valorAcertou)) {
      acertou = true
    } else if (['não', 'nao', 'n', 'false', '0'].includes(valorAcertou)) {
      acertou = false
    }
  }

  const nota = cols.nota ? parseFloat((linha[cols.nota] || '0').toString().replace(',', '.')) || null : null

  let dataProva: Date | null = null
  if (cols.data && linha[cols.data]) {
    try {
      const dataStr = linha[cols.data]!.toString()
      if (dataStr.includes('/')) {
        const [dia, mes, ano] = dataStr.split('/')
        dataProva = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
      } else {
        dataProva = new Date(dataStr)
      }
      if (isNaN(dataProva.getTime())) dataProva = null
    } catch { dataProva = null }
  }

  const anoLetivo = cols.ano ? (linha[cols.ano] || '').toString().trim() : null
  const serie = cols.serie ? (linha[cols.serie] || '').toString().trim() : null
  const turma = cols.turma ? (linha[cols.turma] || '').toString().trim() : null
  const disciplina = cols.disciplina ? (linha[cols.disciplina] || '').toString().trim() : null
  const areaConhecimento = cols.area ? (linha[cols.area] || '').toString().trim() : null

  if (!escolaCodigo && !alunoCodigo) {
    throw new Error('Linha sem código de escola ou aluno')
  }

  const escolaId = escolaCodigo ? caches.buscarEscolaId(escolaCodigo) : null
  if (!escolaId) {
    throw new Error(`Escola não encontrada: "${escolaCodigo || 'vazio'}"`)
  }

  const alunoId = alunoCodigo ? (caches.alunosCache.get(alunoCodigo.toLowerCase()) || null) : null
  if (!alunoId) {
    throw new Error(`Aluno não encontrado: "${alunoCodigo || 'vazio'}"`)
  }

  const questaoId = questaoCodigo ? (caches.questoesCache.get(questaoCodigo) || null) : null

  return [
    escolaId, alunoId, alunoCodigo || null, alunoNome || null, questaoId,
    questaoCodigo || null, respostaAluno || null, acertou, nota,
    dataProva, anoLetivo || null, serie || null, turma || null,
    disciplina || null, areaConhecimento || null, avaliacaoId,
  ]
}
