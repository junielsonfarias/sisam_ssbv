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
  'escola',
  'professor',
  'editor'
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
// Schemas de validação adicionais
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
// Schemas para rotas específicas
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
// Schemas Lote 2 — Rotas médias (5-10 campos)
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
// Helper para validação em APIs
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
