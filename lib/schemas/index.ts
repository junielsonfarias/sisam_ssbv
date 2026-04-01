/**
 * Barrel file — re-exporta todos os schemas por dominio
 *
 * Permite imports diretos: import { alunoSchema } from '@/lib/schemas'
 */

// Schemas base (primitivos reutilizaveis)
export * from './base'

// Schemas de entidades (aluno, turma, escola, etc)
export * from './entidades'

// Schemas de operacoes (login, senha, avaliacao)
export * from './operacoes'

// Schemas do gestor escolar (disciplinas, periodos, notas)
export * from './gestor'

// Schemas de dispositivos e frequencia (facial, hora-aula)
export * from './dispositivos'

// Schemas para rotas especificas (enums, lotes 1/2/3, notificacoes)
export * from './rotas'

// Helpers de validacao (validateRequest, validateQueryParams, validateId)
export * from './helpers'
