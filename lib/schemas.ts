/**
 * Schemas de validação Zod para APIs
 *
 * Centraliza todas as validações de entrada para garantir consistência
 * e segurança em toda a aplicação.
 */

import { z } from 'zod'

// ============================================
// Schemas Base (reutilizáveis)
// ============================================

/** UUID v4 */
export const uuidSchema = z.string().uuid('ID inválido: deve ser um UUID válido')

/** Email */
export const emailSchema = z
  .string()
  .email('Email inválido')
  .min(5, 'Email muito curto')
  .max(254, 'Email muito longo')
  .transform(val => val.toLowerCase().trim())

/** Senha (mínimo 12 caracteres, letra e número) */
export const senhaSchema = z
  .string()
  .min(12, 'Senha deve ter pelo menos 12 caracteres')
  .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos uma letra')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')

/** Nome (2-255 caracteres) */
export const nomeSchema = z
  .string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(255, 'Nome muito longo')
  .transform(val => val.trim())

/** Série escolar (aceita qualquer série com número) */
export const serieSchema = z
  .string()
  .min(1, 'Série é obrigatória')
  .max(50, 'Série muito longa')

/** CPF (11 dígitos ou formato XXX.XXX.XXX-XX, opcional) */
export const cpfSchema = z
  .string()
  .refine(val => {
    if (!val) return true
    const limpo = val.replace(/\D/g, '')
    return limpo.length === 11
  }, 'CPF deve ter 11 dígitos')
  .transform(val => {
    if (!val) return null
    const limpo = val.replace(/\D/g, '')
    return limpo.length > 0 ? limpo : null
  })
  .nullable()
  .optional()

/** Ano letivo (YYYY) */
export const anoLetivoSchema = z
  .string()
  .regex(/^\d{4}$/, 'Ano letivo deve ter 4 dígitos')
  .refine(val => {
    const ano = parseInt(val, 10)
    return ano >= 2020 && ano <= 2100
  }, 'Ano letivo inválido')

/** Presença (P ou F) */
export const presencaSchema = z
  .enum(['P', 'p', 'F', 'f'])
  .transform(val => val.toUpperCase())

/** Tipo de usuário */
export const tipoUsuarioSchema = z.enum([
  'administrador',
  'tecnico',
  'polo',
  'escola'
])

/** Nota (0 a 10) */
export const notaSchema = z
  .number()
  .min(0, 'Nota não pode ser negativa')
  .max(10, 'Nota não pode ser maior que 10')

/** Resposta de questão */
export const respostaSchema = z
  .enum(['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e', '0', '1'])
  .transform(val => val.toUpperCase())

/** Paginação */
export const paginacaoSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(200).default(50),
})

// ============================================
// Schemas de Entidades
// ============================================

/** Schema para criar/atualizar aluno */
export const alunoSchema = z.object({
  nome: nomeSchema,
  codigo: z.string().max(100).optional().nullable(),
  escola_id: uuidSchema,
  turma_id: uuidSchema.optional().nullable(),
  serie: z.string().max(50).optional().nullable(),
  ano_letivo: anoLetivoSchema.optional(),
  cpf: cpfSchema,
  data_nascimento: z.string().optional().nullable(),
  pcd: z.boolean().default(false).optional(),
  // Dados familiares
  nome_mae: z.string().max(255).optional().nullable(),
  nome_pai: z.string().max(255).optional().nullable(),
  responsavel: z.string().max(255).optional().nullable(),
  telefone_responsavel: z.string().max(20).optional().nullable(),
  // Dados pessoais
  genero: z.enum(['masculino', 'feminino', 'outro', 'nao_informado']).optional().nullable(),
  raca_cor: z.enum(['branca', 'preta', 'parda', 'amarela', 'indigena', 'nao_declarada']).optional().nullable(),
  naturalidade: z.string().max(100).optional().nullable(),
  nacionalidade: z.string().max(100).optional().nullable(),
  // Documentos
  rg: z.string().max(20).optional().nullable(),
  certidao_nascimento: z.string().max(50).optional().nullable(),
  sus: z.string().max(20).optional().nullable(),
  // Endereço
  endereco: z.string().max(500).optional().nullable(),
  bairro: z.string().max(100).optional().nullable(),
  cidade: z.string().max(100).optional().nullable(),
  cep: z.string().max(10).optional().nullable(),
  // Programas sociais
  bolsa_familia: z.boolean().default(false).optional(),
  nis: z.string().max(20).optional().nullable(),
  // Projetos
  projeto_contraturno: z.boolean().default(false).optional(),
  projeto_nome: z.string().max(255).optional().nullable(),
  // Saúde
  tipo_deficiencia: z.string().max(255).optional().nullable(),
  alergia: z.string().max(500).optional().nullable(),
  medicacao: z.string().max(500).optional().nullable(),
  // Observações
  observacoes: z.string().max(2000).optional().nullable(),
})

/** Schema para matrícula em lote */
export const matriculaBatchSchema = z.object({
  escola_id: uuidSchema,
  turma_id: uuidSchema,
  serie: z.string().max(50),
  ano_letivo: anoLetivoSchema,
  alunos: z.array(z.object({
    id: uuidSchema.optional(),
    nome: nomeSchema,
    codigo: z.string().max(100).optional().nullable(),
    cpf: cpfSchema,
    data_nascimento: z.string().optional().nullable(),
    pcd: z.boolean().default(false).optional(),
    serie_individual: z.string().max(50).optional().nullable(),
  })).min(1, 'Informe pelo menos um aluno'),
})

/** Schema para criar/atualizar usuário */
export const usuarioSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: senhaSchema.optional(), // Opcional em updates
  tipo_usuario: tipoUsuarioSchema,
  polo_id: uuidSchema.optional().nullable(),
  escola_id: uuidSchema.optional().nullable(),
  ativo: z.boolean().default(true),
})

/** Schema para criar/atualizar escola */
export const escolaSchema = z.object({
  nome: nomeSchema,
  codigo: z.string().max(50).optional().nullable(),
  polo_id: uuidSchema,
  endereco: z.string().max(500).optional().nullable(),
  telefone: z.string().max(50).optional().nullable(),
  email: emailSchema.optional().nullable(),
  ativo: z.boolean().default(true),
})

/** Schema para criar/atualizar polo */
export const poloSchema = z.object({
  nome: nomeSchema,
  codigo: z.string().max(50).optional().nullable(),
  descricao: z.string().max(1000).optional().nullable(),
  ativo: z.boolean().default(true),
})

/** Schema para criar/atualizar turma */
export const turmaSchema = z.object({
  codigo: z.string().min(1).max(50),
  nome: z.string().max(255).optional().nullable(),
  escola_id: uuidSchema,
  serie: z.string().max(50).optional().nullable(),
  ano_letivo: anoLetivoSchema,
  ativo: z.boolean().default(true),
})

/** Schema para criar/atualizar questão */
export const questaoSchema = z.object({
  codigo: z.string().min(1).max(50),
  descricao: z.string().max(1000).optional().nullable(),
  disciplina: z.string().max(100),
  area_conhecimento: z.string().max(100).optional().nullable(),
  dificuldade: z.enum(['facil', 'medio', 'dificil']).optional().nullable(),
  gabarito: z.string().max(10).optional().nullable(),
})

/** Schema para resultado de prova */
export const resultadoProvaSchema = z.object({
  escola_id: uuidSchema,
  aluno_id: uuidSchema.optional().nullable(),
  aluno_codigo: z.string().max(100).optional().nullable(),
  aluno_nome: nomeSchema.optional().nullable(),
  turma_id: uuidSchema.optional().nullable(),
  questao_id: uuidSchema.optional().nullable(),
  questao_codigo: z.string().max(50).optional().nullable(),
  resposta_aluno: respostaSchema.optional().nullable(),
  acertou: z.boolean().optional().nullable(),
  ano_letivo: anoLetivoSchema,
  serie: z.string().max(50).optional().nullable(),
  disciplina: z.string().max(100).optional().nullable(),
  presenca: presencaSchema.default('P'),
})

// ============================================
// Schemas de Operações
// ============================================

/** Schema para login */
export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Senha é obrigatória'),
})

/** Schema para alterar senha */
export const alterarSenhaSchema = z.object({
  senha_atual: z.string().min(1, 'Senha atual é obrigatória'),
  nova_senha: senhaSchema,
})

/** Tipo de avaliação */
export const tipoAvaliacaoSchema = z.enum(['diagnostica', 'final', 'unica'])

/** Schema para criar/atualizar avaliação */
export const avaliacaoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  descricao: z.string().max(1000).optional().nullable(),
  ano_letivo: anoLetivoSchema,
  tipo: tipoAvaliacaoSchema,
  ordem: z.number().int().min(1).max(10).default(1),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
})

// ============================================
// Schemas do Gestor Escolar
// ============================================

/** Schema para disciplina escolar */
export const disciplinaEscolarSchema = z.object({
  nome: nomeSchema,
  codigo: z.string().max(50).optional().nullable(),
  abreviacao: z.string().max(20).optional().nullable(),
  ordem: z.number().int().min(0).max(100).default(0),
  ativo: z.boolean().default(true),
})

/** Tipo de período letivo */
export const tipoPeriodoSchema = z.enum(['bimestre', 'trimestre', 'semestre', 'anual'])

/** Schema para período letivo */
export const periodoLetivoSchema = z.object({
  nome: z.string().min(2).max(255),
  tipo: tipoPeriodoSchema,
  numero: z.number().int().min(1).max(4),
  ano_letivo: anoLetivoSchema,
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
})

/** Schema base para configuração de notas da escola */
export const configuracaoNotasEscolaBaseSchema = z.object({
  escola_id: uuidSchema,
  ano_letivo: anoLetivoSchema,
  tipo_periodo: z.enum(['bimestre', 'trimestre', 'semestre']).default('bimestre'),
  nota_maxima: z.number().min(1).max(100).default(10),
  media_aprovacao: z.number().min(0).max(100).default(6),
  media_recuperacao: z.number().min(0).max(100).default(5),
  peso_avaliacao: z.number().min(0).max(1).default(0.6),
  peso_recuperacao: z.number().min(0).max(1).default(0.4),
  permite_recuperacao: z.boolean().default(true),
})

/** Schema com validações cruzadas */
export const configuracaoNotasEscolaSchema = configuracaoNotasEscolaBaseSchema
  .refine(data => {
    const soma = Math.round((data.peso_avaliacao + data.peso_recuperacao) * 100) / 100
    return soma === 1
  }, { message: 'A soma dos pesos deve ser igual a 1.0', path: ['peso_avaliacao'] })
  .refine(data => {
    return data.media_recuperacao <= data.media_aprovacao
  }, { message: 'Média de recuperação deve ser menor ou igual à média de aprovação', path: ['media_recuperacao'] })

/** Schema para filtros de busca */
export const filtrosSchema = z.object({
  serie: z.string().optional(),
  polo_id: uuidSchema.optional(),
  escola_id: uuidSchema.optional(),
  turma_id: uuidSchema.optional(),
  ano_letivo: anoLetivoSchema.optional(),
  avaliacao_id: uuidSchema.optional(),
  presenca: presencaSchema.optional(),
  busca: z.string().max(200).optional(),
}).partial()

// ============================================
// Schemas do Reconhecimento Facial
// ============================================

/** Schema para registrar/atualizar dispositivo facial */
export const dispositivoFacialSchema = z.object({
  nome: nomeSchema,
  escola_id: uuidSchema,
  localizacao: z.string().max(255).optional().nullable(),
})

/** Schema para presença via reconhecimento facial (unitário) */
export const presencaFacialSchema = z.object({
  aluno_id: uuidSchema,
  timestamp: z.string().datetime({ message: 'Timestamp deve ser ISO 8601 válido' }),
  confianca: z.number().min(0, 'Confiança mínima é 0').max(1, 'Confiança máxima é 1'),
})

/** Schema para presença em lote (sync offline) */
export const presencaFacialLoteSchema = z.object({
  registros: z.array(presencaFacialSchema)
    .min(1, 'Informe pelo menos um registro')
    .max(500, 'Máximo de 500 registros por lote'),
})

/** Schema para consentimento facial (LGPD) */
export const consentimentoFacialSchema = z.object({
  aluno_id: uuidSchema,
  responsavel_nome: nomeSchema,
  responsavel_cpf: cpfSchema,
  consentido: z.boolean(),
})

/** Schema para filtros de frequência diária */
export const filtrosFrequenciaDiariaSchema = z.object({
  escola_id: uuidSchema.optional(),
  turma_id: uuidSchema.optional(),
  data: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  metodo: z.enum(['manual', 'facial', 'qrcode']).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(200).default(50),
}).partial()

/** Schema para enrollment facial */
export const enrollmentFacialSchema = z.object({
  aluno_id: uuidSchema,
  embedding_data: z.string().min(1, 'Embedding é obrigatório'),
  qualidade: z.number().min(0).max(100).optional(),
})

// ============================================
// Schemas de Frequência por Hora-Aula
// ============================================

/** Schema para salvar grade horária em lote */
export const horarioAulaSchema = z.object({
  turma_id: uuidSchema,
  horarios: z.array(z.object({
    dia_semana: z.number().int().min(1).max(5),
    numero_aula: z.number().int().min(1).max(6),
    disciplina_id: uuidSchema,
  })).min(1, 'Informe pelo menos um horário'),
})

/** Schema para registrar frequência por hora-aula em lote */
export const frequenciaHoraAulaSchema = z.object({
  turma_id: uuidSchema,
  data: z.string().min(10, 'Data é obrigatória'),
  numero_aula: z.number().int().min(1).max(6),
  disciplina_id: uuidSchema,
  registros: z.array(z.object({
    aluno_id: uuidSchema,
    presente: z.boolean(),
  })).min(1, 'Informe pelo menos um registro'),
})

// ============================================
// Helper para validação em APIs
// ============================================

import { NextResponse } from 'next/server'

export interface ValidationResult<T> {
  success: true
  data: T
}

export interface ValidationError {
  success: false
  response: NextResponse
}

/**
 * Valida dados contra um schema Zod e retorna resultado tipado
 *
 * @example
 * const result = await validateRequest(request, alunoSchema)
 * if (!result.success) return result.response
 * const aluno = result.data // Tipado corretamente
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T> | ValidationError> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        campo: err.path.join('.'),
        mensagem: err.message
      }))

      return {
        success: false,
        response: NextResponse.json(
          {
            mensagem: 'Dados inválidos',
            erros: errors
          },
          { status: 400 }
        )
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { mensagem: 'Erro ao processar dados da requisição' },
        { status: 400 }
      )
    }
  }
}

/**
 * Valida query parameters contra um schema Zod
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> | ValidationError {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      campo: err.path.join('.'),
      mensagem: err.message
    }))

    return {
      success: false,
      response: NextResponse.json(
        {
          mensagem: 'Parâmetros inválidos',
          erros: errors
        },
        { status: 400 }
      )
    }
  }

  return { success: true, data: result.data }
}

/**
 * Valida um UUID simples
 */
export function validateId(id: string | null | undefined): ValidationResult<string> | ValidationError {
  if (!id) {
    return {
      success: false,
      response: NextResponse.json(
        { mensagem: 'ID é obrigatório' },
        { status: 400 }
      )
    }
  }

  const result = uuidSchema.safeParse(id)

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { mensagem: 'ID inválido: deve ser um UUID válido' },
        { status: 400 }
      )
    }
  }

  return { success: true, data: result.data }
}
