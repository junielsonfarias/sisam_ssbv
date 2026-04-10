/**
 * Schemas de Entidades
 *
 * Schemas para criar/atualizar entidades principais do sistema.
 */

import { z } from 'zod'
import {
  uuidSchema,
  nomeSchema,
  emailSchema,
  senhaSchema,
  cpfSchema,
  anoLetivoSchema,
  presencaSchema,
  respostaSchema,
  tipoUsuarioSchema,
} from './base'

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
  acesso_sisam: z.boolean().default(true),
  acesso_gestor: z.boolean().default(false),
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
