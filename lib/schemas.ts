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

/** Série escolar */
export const serieSchema = z
  .string()
  .refine(val => {
    const numero = val.match(/(\d+)/)?.[1]
    if (!numero) return false
    return ['2', '3', '5', '6', '7', '8', '9'].includes(numero)
  }, 'Série inválida')

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

/** Schema para filtros de busca */
export const filtrosSchema = z.object({
  serie: z.string().optional(),
  polo_id: uuidSchema.optional(),
  escola_id: uuidSchema.optional(),
  turma_id: uuidSchema.optional(),
  ano_letivo: anoLetivoSchema.optional(),
  presenca: presencaSchema.optional(),
  busca: z.string().max(200).optional(),
}).partial()

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
