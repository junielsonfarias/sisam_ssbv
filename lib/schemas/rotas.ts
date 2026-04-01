/**
 * Schemas para Rotas Especificas
 *
 * Enums centralizados, validacoes adicionais, Lote 1/2/3.
 */

import { z } from 'zod'
import { uuidSchema, nomeSchema, emailSchema, cpfSchema, anoLetivoSchema } from './base'
import { poloSchema } from './entidades'
import { tipoPeriodoSchema } from './gestor'

// ============================================
// Enums centralizados
// ============================================

export const situacaoAlunoSchema = z.enum([
  'cursando', 'transferido', 'abandono', 'aprovado', 'reprovado', 'remanejado'
])

export const statusFilaSchema = z.enum([
  'aguardando', 'convocado', 'matriculado', 'desistente'
])

export const metodoFrequenciaSchema = z.enum([
  'manual', 'facial', 'qrcode'
])

export const statusFrequenciaSchema = z.enum([
  'presente', 'ausente', 'justificado'
])

// ============================================
// Schemas de validacao adicionais
// ============================================

export const filaEsperaPostSchema = z.object({
  aluno_id: uuidSchema,
  turma_id: uuidSchema,
  escola_id: uuidSchema,
  observacao: z.string().max(500).optional().nullable(),
})

export const filaEsperaPutSchema = z.object({
  id: uuidSchema,
  status: statusFilaSchema,
  observacao: z.string().max(500).optional().nullable(),
})

export const professorPostSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128),
})

export const professorPutSchema = z.object({
  professor_id: uuidSchema,
  nome: nomeSchema.optional(),
  email: emailSchema.optional(),
  cpf: cpfSchema.optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
})

export const regraAvaliacaoPostSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  descricao: z.string().max(1000).optional().nullable(),
  tipo_avaliacao_id: uuidSchema,
  tipo_periodo: tipoPeriodoSchema.optional(),
  qtd_periodos: z.number().int().min(1).max(12).optional(),
  media_aprovacao: z.number().min(0).max(100).optional(),
  media_recuperacao: z.number().min(0).max(100).optional(),
  nota_maxima: z.number().min(0).max(100).optional(),
  permite_recuperacao: z.boolean().optional(),
  recuperacao_por_periodo: z.boolean().optional(),
  max_dependencias: z.number().int().min(0).max(20).optional(),
  formula_media: z.string().max(50).optional(),
  pesos_periodos: z.array(z.object({
    periodo: z.number().int().min(1).max(12),
    peso: z.number().min(0).max(1),
  })).refine(pesos => {
    if (pesos.length === 0) return true
    const soma = pesos.reduce((acc, p) => acc + p.peso, 0)
    return Math.abs(soma - 1.0) < 0.01
  }, { message: 'Soma dos pesos dos períodos deve ser igual a 1.0' }).optional().nullable(),
  arredondamento: z.string().max(20).optional(),
  casas_decimais: z.number().int().min(0).max(4).optional(),
  aprovacao_automatica: z.boolean().optional(),
}).refine(data => {
  if (data.media_recuperacao !== undefined && data.media_aprovacao !== undefined) {
    return data.media_recuperacao <= data.media_aprovacao
  }
  return true
}, { message: 'Média de recuperação deve ser menor ou igual à média de aprovação', path: ['media_recuperacao'] })

// ============================================
// Schemas para rotas especificas
// ============================================

export const configuracaoSeriePostSchema = z.object({
  serie: z.string().min(1, 'Série é obrigatória').max(10),
  nome_serie: z.string().min(1, 'Nome da série é obrigatório').max(100),
  tipo_ensino: z.string().max(50).default('anos_iniciais'),
  qtd_questoes_lp: z.number().int().min(0).default(0),
  qtd_questoes_mat: z.number().int().min(0).default(0),
  qtd_questoes_ch: z.number().int().min(0).default(0),
  qtd_questoes_cn: z.number().int().min(0).default(0),
  tem_producao_textual: z.boolean().default(false),
  qtd_itens_producao: z.number().int().min(0).default(0),
  avalia_lp: z.boolean().default(true),
  avalia_mat: z.boolean().default(true),
  avalia_ch: z.boolean().default(false),
  avalia_cn: z.boolean().default(false),
  usa_nivel_aprendizagem: z.boolean().default(false),
  media_aprovacao: z.number().min(0).max(100).default(6.0),
  media_recuperacao: z.number().min(0).max(100).default(5.0),
  nota_maxima: z.number().min(0).max(100).default(10.0),
  max_dependencias: z.number().int().min(0).default(0),
  formula_nota_final: z.string().max(50).optional().nullable(),
})

export const conselhoClassePostSchema = z.object({
  turma_id: uuidSchema,
  periodo_id: uuidSchema,
  data_reuniao: z.string().optional().nullable(),
  ata_geral: z.string().max(5000).optional().nullable(),
  pareceres: z.array(z.object({
    aluno_id: uuidSchema,
    parecer: z.string().max(2000).optional().nullable(),
    observacao: z.string().max(2000).optional().nullable(),
  })).optional(),
})

export const serieEscolaPostSchema = z.object({
  serie: z.string().min(1, 'Série é obrigatória').max(10),
  ano_letivo: anoLetivoSchema,
})

export const lancarFaltasSchema = z.object({
  turma_id: uuidSchema,
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser AAAA-MM-DD'),
})

// ============================================
// Enums centralizados adicionais
// ============================================

export const statusDispositivoSchema = z.enum(['ativo', 'inativo', 'bloqueado'])
export const tipoTransferenciaSchema = z.enum(['dentro_municipio', 'fora_municipio'])
export const tipoVinculoProfessorSchema = z.enum(['polivalente', 'disciplina'])
export const statusAnoLetivoSchema = z.enum(['planejamento', 'ativo', 'finalizado'])

// ============================================
// Schemas Lote 1 — Rotas simples (1-3 campos)
// ============================================

export const professorPatchSchema = z.object({
  professor_id: uuidSchema,
  ativo: z.boolean(),
})

export const professorDeleteSchema = z.object({
  professor_id: uuidSchema,
})

export const professorTurmaPostSchema = z.object({
  professor_id: uuidSchema,
  turma_id: uuidSchema,
  disciplina_id: uuidSchema.optional().nullable(),
  tipo_vinculo: tipoVinculoProfessorSchema,
  ano_letivo: anoLetivoSchema,
}).refine(data => {
  if (data.tipo_vinculo === 'disciplina' && !data.disciplina_id) return false
  return true
}, { message: 'disciplina_id é obrigatório para vínculo por disciplina', path: ['disciplina_id'] })

export const professorTurmaPatchSchema = z.object({
  vinculo_id: uuidSchema,
  novo_professor_id: uuidSchema,
})

export const professorTurmaDeleteSchema = z.object({
  vinculo_id: uuidSchema,
})

export const frequenciaDiariaDeleteSchema = z.object({
  id: uuidSchema,
})

export const frequenciaDiariaPatchSchema = z.object({
  id: uuidSchema,
  justificativa: z.string().max(500).optional().nullable(),
})

export const perfilUpdateSchema = z.object({
  nome: nomeSchema.optional(),
  telefone: z.string().max(20).optional().nullable(),
})

export const perfilSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
  novaSenha: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres').max(128),
  confirmarSenha: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine(data => data.novaSenha === data.confirmarSenha, {
  message: 'A nova senha e a confirmação não coincidem',
  path: ['confirmarSenha'],
})

export const perfilEmailSchema = z.object({
  novoEmail: emailSchema,
  senhaAtual: z.string().min(1, 'Senha é obrigatória para confirmar'),
})

// ============================================
// Schemas Lote 2 — Rotas medias (5-10 campos)
// ============================================

export const turmaPostSchema = z.object({
  codigo: z.string().min(1).max(50),
  nome: z.string().max(255).optional().nullable(),
  escola_id: uuidSchema,
  serie: z.string().min(1).max(50),
  ano_letivo: anoLetivoSchema,
  capacidade_maxima: z.number().int().min(1).max(100).optional(),
  multiserie: z.boolean().optional(),
  multietapa: z.boolean().optional(),
})

export const questaoPostSchema = z.object({
  codigo: z.string().min(1).max(50),
  descricao: z.string().max(2000).optional().nullable(),
  disciplina: z.string().max(100).optional().nullable(),
  area_conhecimento: z.string().max(100).optional().nullable(),
  dificuldade: z.string().max(50).optional().nullable(),
  gabarito: z.string().max(10).optional().nullable(),
  serie_aplicavel: z.string().max(50).optional().nullable(),
  tipo_questao: z.string().max(50).optional().nullable(),
})

export const modulosTecnicoUpdateSchema = z.object({
  modulos: z.array(z.object({
    modulo_key: z.string().min(1),
    habilitado: z.boolean().optional(),
    ordem: z.number().int().min(0).optional(),
    modulo_label: z.string().max(100).optional(),
  })).min(1, 'Informe pelo menos um módulo'),
})

export const controleVagasPutSchema = z.object({
  turma_id: uuidSchema.optional(),
  capacidade_maxima: z.number().int().min(1).max(100).optional(),
  lote: z.array(z.object({
    turma_id: uuidSchema,
    capacidade_maxima: z.number().int().min(1).max(100),
  })).optional(),
})

export const questaoPutSchema = z.object({
  id: uuidSchema,
  codigo: z.string().min(1).max(50).optional().nullable(),
  descricao: z.string().max(2000).optional().nullable(),
  disciplina: z.string().max(100).optional().nullable(),
  area_conhecimento: z.string().max(100).optional().nullable(),
  dificuldade: z.string().max(50).optional().nullable(),
  gabarito: z.string().max(10).optional().nullable(),
  serie_aplicavel: z.string().max(50).optional().nullable(),
  tipo_questao: z.string().max(50).optional().nullable(),
})

export const tipoAvaliacaoPostSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(50),
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  descricao: z.string().max(1000).optional().nullable(),
  tipo_resultado: z.enum(['parecer', 'conceito', 'numerico', 'misto']),
  escala_conceitos: z.any().optional().nullable(),
  nota_minima: z.number().min(0).max(100).optional(),
  nota_maxima: z.number().min(0).max(100).optional(),
  permite_decimal: z.boolean().optional(),
})

export const serieEscolarPostSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(50),
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  etapa: z.string().min(1, 'Etapa é obrigatória').max(100),
  ordem: z.number().int().min(0),
  media_aprovacao: z.number().min(0).max(100).optional(),
  media_recuperacao: z.number().min(0).max(100).optional(),
  nota_maxima: z.number().min(0).max(100).optional(),
  max_dependencias: z.number().int().min(0).optional(),
  formula_nota_final: z.string().max(50).optional().nullable(),
  permite_recuperacao: z.boolean().optional(),
  idade_minima: z.number().int().min(0).optional().nullable(),
  idade_maxima: z.number().int().min(0).optional().nullable(),
})

export const poloPutSchema = poloSchema.extend({
  id: uuidSchema,
})

// ============================================
// Schemas Lote 3 — Rotas complexas
// ============================================

export const professorFrequenciaDiariaPostSchema = z.object({
  turma_id: uuidSchema,
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser AAAA-MM-DD'),
  registros: z.array(z.object({
    aluno_id: uuidSchema,
    status: statusFrequenciaSchema,
  })).min(1),
})

export const professorFrequenciaDiariaDeleteSchema = z.object({
  frequencia_id: uuidSchema,
})

export const professorJustificarSchema = z.object({
  frequencia_id: uuidSchema,
  justificativa: z.string().min(1).max(500),
})

export const professorSyncPostSchema = z.object({
  frequencias: z.array(z.object({
    turma_id: uuidSchema,
    data: z.string(),
    registros: z.array(z.object({
      aluno_id: uuidSchema,
      status: z.string(),
    })),
  })).optional().default([]),
  notas: z.array(z.object({
    turma_id: uuidSchema,
    disciplina_id: uuidSchema,
    periodo_id: uuidSchema,
    notas: z.array(z.object({
      aluno_id: uuidSchema,
      nota: z.number().nullable().optional(),
      nota_recuperacao: z.number().nullable().optional(),
      faltas: z.number().int().min(0).optional(),
      observacao: z.string().nullable().optional(),
    })),
  })).optional().default([]),
})

export const cadastroProfessorSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128),
  cpf: z.string().optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
})

// ============================================
// Schemas de Notificacoes
// ============================================

export const notificacaoMarcarLidaSchema = z.object({
  ids: z.array(uuidSchema).optional(),
  marcar_todas: z.boolean().optional(),
}).refine(data => data.ids?.length || data.marcar_todas, {
  message: 'Informe ids ou marcar_todas=true',
})

export const tipoGeracaoNotificacao = z.enum(['infrequencia', 'nota_baixa', 'recuperacao', 'todas'])

export const notificacaoGerarSchema = z.object({
  tipo_geracao: tipoGeracaoNotificacao,
  escola_id: uuidSchema.optional().nullable(),
  ano_letivo: z.string().max(10).optional().nullable(),
})
