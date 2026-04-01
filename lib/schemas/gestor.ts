/**
 * Schemas do Gestor Escolar
 *
 * Disciplinas, periodos letivos, configuracao de notas, filtros.
 */

import { z } from 'zod'
import { uuidSchema, nomeSchema, anoLetivoSchema, presencaSchema } from './base'

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

/** Schema base para período letivo (sem refine, para permitir .extend()) */
const periodoLetivoBaseSchema = z.object({
  nome: z.string().min(2).max(255),
  tipo: tipoPeriodoSchema,
  numero: z.number().int().min(1).max(12),
  ano_letivo: anoLetivoSchema,
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
})

/** Schema para período letivo com validação de datas */
export const periodoLetivoSchema = periodoLetivoBaseSchema.refine(data => {
  if (data.data_inicio && data.data_fim) {
    return data.data_fim >= data.data_inicio
  }
  return true
}, { message: 'Data de fim deve ser posterior à data de início', path: ['data_fim'] })

/** Schema para atualização de período (extend do base, sem refine que bloqueia extend) */
export const periodoLetivoUpdateSchema = periodoLetivoBaseSchema.extend({
  id: uuidSchema,
}).refine(data => {
  if (data.data_inicio && data.data_fim) {
    return data.data_fim >= data.data_inicio
  }
  return true
}, { message: 'Data de fim deve ser posterior à data de início', path: ['data_fim'] })

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
