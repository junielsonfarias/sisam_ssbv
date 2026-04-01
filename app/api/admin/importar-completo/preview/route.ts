import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { lerPlanilha } from '@/lib/excel-reader'
import { validarArquivoUpload } from '@/lib/api-helpers'
import { lerSerieDoExcel } from '@/lib/services/importacao/parse'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// ============================================================================
// TIPOS E SCHEMAS
// ============================================================================

/** Schema de resposta da pre-visualizacao */
const previewResponseSchema = z.object({
  total_linhas: z.number(),
  polos: z.array(z.string()),
  escolas: z.array(z.string()),
  turmas: z.array(z.string()),
  alunos: z.number(),
  duplicatas: z.array(z.object({
    nome_original: z.string(),
    nome_similar: z.string(),
    linha_original: z.number(),
    linha_similar: z.number(),
  })),
  series_invalidas: z.array(z.object({
    serie: z.string(),
    linha: z.number(),
    aluno: z.string(),
  })),
  erros_formato: z.array(z.object({
    linha: z.number(),
    campo: z.string(),
    mensagem: z.string(),
  })),
  amostra: z.array(z.record(z.unknown())),
})

// Series validas no sistema (numero extraido)
const SERIES_VALIDAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

// Campos obrigatorios na planilha
const CAMPOS_OBRIGATORIOS = ['POLO', 'ESCOLA', 'TURMA', 'ALUNO'] as const

// ============================================================================
// FUNCOES AUXILIARES
// ============================================================================

/**
 * Normaliza nome para comparacao de duplicatas.
 * Remove acentos, converte para minusculas, remove espacos extras.
 */
function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrai valor de coluna com multiplas variacoes de nome.
 */
function extrairCampo(linha: Record<string, unknown>, variantes: string[]): string {
  for (const v of variantes) {
    const val = linha[v]
    if (val !== undefined && val !== null && val !== '') {
      return String(val).trim()
    }
  }
  return ''
}

/**
 * Extrai numero da serie a partir de texto livre.
 */
function extrairNumero(serie: string): string | null {
  if (!serie) return null
  const match = serie.match(/(\d+)/)
  return match ? match[1] : null
}

/**
 * Detecta duplicatas por nomes normalizados identicos em escolas diferentes
 * ou nomes muito similares na mesma escola.
 */
function detectarDuplicatas(
  linhas: Array<{ nome: string; escola: string; linhaNum: number }>
): Array<{ nome_original: string; nome_similar: string; linha_original: number; linha_similar: number }> {
  const duplicatas: Array<{
    nome_original: string
    nome_similar: string
    linha_original: number
    linha_similar: number
  }> = []

  // Agrupar por escola para detectar duplicatas dentro da mesma escola
  const porEscola = new Map<string, Array<{ nome: string; normalizado: string; linhaNum: number }>>()

  for (const item of linhas) {
    const chave = normalizarNome(item.escola)
    if (!porEscola.has(chave)) porEscola.set(chave, [])
    porEscola.get(chave)!.push({
      nome: item.nome,
      normalizado: normalizarNome(item.nome),
      linhaNum: item.linhaNum,
    })
  }

  // Para cada escola, verificar nomes normalizados identicos
  for (const alunos of porEscola.values()) {
    const vistos = new Map<string, { nome: string; linhaNum: number }>()
    for (const aluno of alunos) {
      const existente = vistos.get(aluno.normalizado)
      if (existente && existente.linhaNum !== aluno.linhaNum) {
        duplicatas.push({
          nome_original: existente.nome,
          nome_similar: aluno.nome,
          linha_original: existente.linhaNum,
          linha_similar: aluno.linhaNum,
        })
      } else {
        vistos.set(aluno.normalizado, { nome: aluno.nome, linhaNum: aluno.linhaNum })
      }
    }
  }

  // Limitar a 50 duplicatas para nao sobrecarregar a resposta
  return duplicatas.slice(0, 50)
}

// ============================================================================
// ROTA POST — PRE-VISUALIZACAO DE IMPORTACAO
// ============================================================================

export const POST = withAuth(['administrador', 'tecnico'], async (request: NextRequest) => {
  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File

  if (!arquivo) {
    return NextResponse.json(
      { mensagem: 'Arquivo nao fornecido' },
      { status: 400 }
    )
  }

  // Validar tipo e tamanho do arquivo
  const erroUpload = validarArquivoUpload(arquivo)
  if (erroUpload) {
    return NextResponse.json({ mensagem: erroUpload }, { status: 400 })
  }

  // Ler planilha
  const arrayBuffer = await arquivo.arrayBuffer()
  const dados = await lerPlanilha(arrayBuffer)

  if (!dados || dados.length === 0) {
    return NextResponse.json(
      { mensagem: 'Arquivo vazio ou invalido' },
      { status: 400 }
    )
  }

  // Coletar dados unicos
  const polosSet = new Set<string>()
  const escolasSet = new Set<string>()
  const turmasSet = new Set<string>()
  const alunosSet = new Set<string>()
  const alunosParaDuplicata: Array<{ nome: string; escola: string; linhaNum: number }> = []
  const seriesInvalidas: Array<{ serie: string; linha: number; aluno: string }> = []
  const errosFormato: Array<{ linha: number; campo: string; mensagem: string }> = []

  for (let i = 0; i < dados.length; i++) {
    const linha = dados[i]
    const linhaNum = i + 2 // +2 pq i=0 eh linha 2 do Excel (cabecalho eh linha 1)

    const polo = extrairCampo(linha, ['POLO', 'Polo', 'polo'])
    const escola = extrairCampo(linha, ['ESCOLA', 'Escola', 'escola'])
    const turma = extrairCampo(linha, ['TURMA', 'Turma', 'turma'])
    const aluno = extrairCampo(linha, ['ALUNO', 'Aluno', 'aluno'])

    // Verificar campos obrigatorios
    if (!polo) errosFormato.push({ linha: linhaNum, campo: 'POLO', mensagem: 'Polo nao informado' })
    if (!escola) errosFormato.push({ linha: linhaNum, campo: 'ESCOLA', mensagem: 'Escola nao informada' })
    if (!turma) errosFormato.push({ linha: linhaNum, campo: 'TURMA', mensagem: 'Turma nao informada' })
    if (!aluno) errosFormato.push({ linha: linhaNum, campo: 'ALUNO', mensagem: 'Aluno nao informado' })

    // Coletar entidades unicas
    if (polo) polosSet.add(polo)
    if (escola) escolasSet.add(escola)
    if (turma) turmasSet.add(turma)
    if (aluno && escola) {
      alunosSet.add(`${aluno}_${escola}`)
      alunosParaDuplicata.push({ nome: aluno, escola, linhaNum })
    }

    // Validar serie
    const serie = lerSerieDoExcel(linha as Record<string, unknown>, turma)
    const numero = extrairNumero(serie)
    if (serie && numero && !SERIES_VALIDAS.includes(numero)) {
      seriesInvalidas.push({ serie, linha: linhaNum, aluno: aluno || '(sem nome)' })
    } else if (!serie && aluno) {
      // Serie nao encontrada — pode ser um problema
      seriesInvalidas.push({ serie: '(vazia)', linha: linhaNum, aluno: aluno || '(sem nome)' })
    }
  }

  // Detectar duplicatas
  const duplicatas = detectarDuplicatas(alunosParaDuplicata)

  // Amostra: primeiras 10 linhas
  const amostra = dados.slice(0, 10).map((linha) => {
    // Limitar campos para nao enviar Q1-Q60 na amostra
    const campos: Record<string, unknown> = {}
    const camposRelevantes = [
      'POLO', 'Polo', 'polo',
      'ESCOLA', 'Escola', 'escola',
      'TURMA', 'Turma', 'turma',
      'ALUNO', 'Aluno', 'aluno',
      'ANO/SERIE', 'ANO/SÉRIE', 'Serie', 'SERIE', 'Série',
      'FALTA', 'Falta', 'falta',
      'MED_ALUNO', 'MED ALUNO', 'Media', 'Média',
    ]
    for (const [chave, valor] of Object.entries(linha)) {
      if (camposRelevantes.includes(chave) || chave.startsWith('Q')) {
        campos[chave] = valor
      }
    }
    return campos
  })

  // Limitar erros de formato a 100 para nao sobrecarregar
  const errosLimitados = errosFormato.slice(0, 100)
  // Limitar series invalidas a 50
  const seriesLimitadas = seriesInvalidas.slice(0, 50)

  const resultado = {
    total_linhas: dados.length,
    polos: Array.from(polosSet).sort(),
    escolas: Array.from(escolasSet).sort(),
    turmas: Array.from(turmasSet).sort(),
    alunos: alunosSet.size,
    duplicatas,
    series_invalidas: seriesLimitadas,
    erros_formato: errosLimitados,
    amostra,
  }

  // Validar resposta com Zod (garante contrato)
  const parsed = previewResponseSchema.safeParse(resultado)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Erro ao gerar pre-visualizacao', detalhes: parsed.error.flatten() },
      { status: 500 }
    )
  }

  return NextResponse.json(parsed.data)
})
