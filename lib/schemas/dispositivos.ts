/**
 * Schemas de Dispositivos e Frequencia
 *
 * Reconhecimento facial, presenca, enrollment, frequencia por hora-aula.
 */

import { z } from 'zod'
import { uuidSchema, nomeSchema, cpfSchema } from './base'

// ============================================
// Reconhecimento Facial
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
// Frequencia por Hora-Aula
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
