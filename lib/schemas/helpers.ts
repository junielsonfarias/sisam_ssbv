/**
 * Helpers de Validacao
 *
 * Funcoes utilitarias para validar requests e query params em APIs.
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { uuidSchema } from './base'

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
