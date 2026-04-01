/**
 * Schemas Base (reutilizaveis)
 *
 * Schemas primitivos usados como building blocks por outros modulos.
 */

import { z } from 'zod'

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
  'escola',
  'professor',
  'editor',
  'publicador'
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
