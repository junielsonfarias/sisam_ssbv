/**
 * Tipos de usuário e autenticação
 *
 * @module types/usuario
 */

// ============================================================================
// TIPOS DE USUÁRIO
// ============================================================================

/**
 * Tipos de usuário do sistema
 *
 * Hierarquia de permissões (do mais restrito ao mais amplo):
 * - escola: Acesso apenas à sua própria escola
 * - polo: Acesso ao seu polo e escolas vinculadas
 * - tecnico: Acesso total (mesmo que administrador)
 * - administrador: Acesso total ao sistema
 *
 * NOTA: O tipo 'admin' foi removido em favor de 'administrador' para padronização.
 * Se houver dados legados com 'admin', a função verificarPermissao em lib/auth.ts trata a compatibilidade.
 */
export type TipoUsuario = 'administrador' | 'tecnico' | 'polo' | 'escola' | 'professor' | 'editor' | 'publicador' | 'responsavel';

/**
 * Usuário do sistema
 *
 * Representa um usuário autenticado com suas permissões e vínculos.
 */
export interface Usuario {
  /** ID único (UUID) */
  id: string;
  /** Nome completo do usuário */
  nome: string;
  /** Email (usado como login) */
  email: string;
  /** Tipo de usuário para controle de acesso */
  tipo_usuario: TipoUsuario;
  /** ID do polo (para usuários tipo 'polo') */
  polo_id?: string | null;
  /** ID da escola (para usuários tipo 'escola') */
  escola_id?: string | null;
  /** URL da foto de perfil */
  foto_url?: string | null;
  /** Se o usuário está ativo no sistema */
  ativo: boolean;
  /** Data de criação do registro */
  criado_em: Date;
  /** Data da última atualização */
  atualizado_em: Date;
}

/** Dados de usuário para armazenamento offline */
export interface UsuarioOffline {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  polo_id?: string | null
  escola_id?: string | null
  token?: string
}
