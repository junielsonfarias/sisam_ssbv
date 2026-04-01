/**
 * Schemas de Operacoes
 *
 * Login, alteracao de senha, avaliacoes.
 */

import { z } from 'zod'
import { emailSchema, senhaSchema, anoLetivoSchema } from './base'

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
