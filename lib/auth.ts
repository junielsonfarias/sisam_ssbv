/**
 * Módulo de Autenticação e Autorização
 *
 * Este módulo fornece funcionalidades para:
 * - Geração e verificação de tokens JWT
 * - Hash e comparação de senhas com bcrypt
 * - Verificação de permissões baseada em tipos de usuário
 * - Controle de acesso a escolas e polos
 *
 * Hierarquia de permissões:
 * - administrador/admin: Acesso total ao sistema
 * - tecnico: Acesso total (mesmas permissões do admin)
 * - polo: Acesso a dados do seu polo e escolas vinculadas
 * - escola: Acesso apenas aos dados da sua escola
 *
 * @module lib/auth
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '@/database/connection';
import { Usuario, TipoUsuario } from './types';

// ============================================================================
// CONFIGURAÇÃO DE SEGURANÇA
// ============================================================================

/**
 * Chave secreta para assinatura de tokens JWT.
 * IMPORTANTE: Deve ser configurada via variável de ambiente.
 * Nunca use valor padrão em produção - gere uma chave segura com pelo menos 32 caracteres.
 */
const JWT_SECRET = process.env.JWT_SECRET;

// Validar JWT_SECRET na inicializacao
if (!JWT_SECRET) {
  console.error('ERRO CRITICO: JWT_SECRET nao esta configurado!');
  console.error('Configure a variavel de ambiente JWT_SECRET com uma chave segura de pelo menos 32 caracteres.');
}

if (JWT_SECRET && JWT_SECRET.length < 32) {
  console.warn('AVISO: JWT_SECRET deve ter pelo menos 32 caracteres para seguranca adequada.');
}

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Payload do token JWT
 * Contém informações do usuário para autenticação stateless
 */
export interface TokenPayload {
  /** ID único do usuário */
  userId: string;
  /** Email do usuário (usado como identificador de login) */
  email: string;
  /** Tipo de usuário para controle de acesso */
  tipoUsuario: TipoUsuario;
  /** ID do polo (para usuários do tipo 'polo') */
  poloId?: string | null;
  /** ID da escola (para usuários do tipo 'escola') */
  escolaId?: string | null;
}

// ============================================================================
// FUNÇÕES DE SENHA
// ============================================================================

/**
 * Gera hash bcrypt de uma senha
 *
 * @param senha - Senha em texto plano
 * @returns Hash bcrypt da senha (salt rounds: 10)
 *
 * @example
 * const hash = await hashPassword('minhaSenha123')
 * // Salvar hash no banco de dados
 */
export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

/**
 * Compara uma senha com seu hash
 *
 * @param senha - Senha em texto plano para verificar
 * @param hash - Hash bcrypt armazenado
 * @returns true se a senha corresponde ao hash
 *
 * @example
 * const valida = await comparePassword('minhaSenha123', hashDoBanco)
 * if (!valida) throw new Error('Senha incorreta')
 */
export async function comparePassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

// ============================================================================
// FUNÇÕES DE TOKEN JWT
// ============================================================================

/**
 * Gera um token JWT assinado
 *
 * @param payload - Dados do usuário a serem incluídos no token
 * @returns Token JWT assinado com expiração de 7 dias
 * @throws Error se JWT_SECRET não estiver configurado
 * @throws Error se payload estiver incompleto
 *
 * @example
 * const token = generateToken({
 *   userId: '123',
 *   email: 'usuario@exemplo.com',
 *   tipoUsuario: 'administrador'
 * })
 */
export function generateToken(payload: TokenPayload): string {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET nao esta configurado. Configure a variavel de ambiente JWT_SECRET.')
    }

    if (JWT_SECRET.length < 32) {
      console.warn('AVISO: JWT_SECRET deve ter pelo menos 32 caracteres para seguranca adequada.')
    }

    if (!payload.userId || !payload.email || !payload.tipoUsuario) {
      throw new Error('Payload do token incompleto. userId, email e tipoUsuario sao obrigatorios.')
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  } catch (error: any) {
    console.error('Erro ao gerar token JWT:', error)
    throw error
  }
}

/**
 * Verifica e decodifica um token JWT
 *
 * @param token - Token JWT a ser verificado
 * @returns Payload decodificado ou null se inválido/expirado
 *
 * @example
 * const payload = verifyToken(token)
 * if (!payload) {
 *   return redirect('/login')
 * }
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET nao esta configurado')
      return null;
    }
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// ============================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================================================

/**
 * Extrai e valida usuário a partir de uma requisição Next.js
 *
 * Busca o token do cookie, verifica sua validade e retorna os dados
 * completos do usuário do banco de dados.
 *
 * @param request - Objeto NextRequest da requisição
 * @returns Usuário completo do banco ou null se não autenticado
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const usuario = await getUsuarioFromRequest(request)
 *   if (!usuario) {
 *     return unauthorized()
 *   }
 *   // Usuário autenticado, continuar...
 * }
 */
export async function getUsuarioFromRequest(request: NextRequest): Promise<Usuario | null> {
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1 AND ativo = true',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Usuario;
  } catch (error: any) {
    console.error('Erro ao buscar usuário no banco de dados:', {
      code: error?.code,
      message: error?.message,
      userId: payload.userId,
    });
    
    // Em caso de erro de conexão, retornar null para não quebrar a aplicação
    // O erro será logado para diagnóstico
    return null;
  }
}

// ============================================================================
// FUNÇÕES DE AUTORIZAÇÃO
// ============================================================================

/**
 * Verifica se o usuário tem permissão baseada em seu tipo
 *
 * @param usuario - Usuário a verificar (pode ser null)
 * @param tiposPermitidos - Lista de tipos de usuário permitidos
 * @returns true se o usuário tem um dos tipos permitidos
 *
 * @example
 * // Verificar se é admin ou técnico
 * if (!verificarPermissao(usuario, ['administrador', 'tecnico'])) {
 *   return forbidden()
 * }
 *
 * @example
 * // Verificar se pode acessar área de polo
 * if (!verificarPermissao(usuario, ['administrador', 'tecnico', 'polo'])) {
 *   return forbidden()
 * }
 */
export function verificarPermissao(
  usuario: Usuario | null,
  tiposPermitidos: TipoUsuario[]
): boolean {
  if (!usuario) return false;

  // Normalizar tipo de usuario para compatibilidade com dados legados
  // 'admin' é tratado como 'administrador'
  const tipoNormalizado = usuario.tipo_usuario === 'admin' as any
    ? 'administrador'
    : usuario.tipo_usuario;

  // Expandir tipos permitidos para incluir ambas as variantes de admin
  const tiposExpandidos = tiposPermitidos.includes('administrador')
    ? [...tiposPermitidos, 'admin' as TipoUsuario]
    : tiposPermitidos;

  return tiposExpandidos.includes(tipoNormalizado) || tiposExpandidos.includes(usuario.tipo_usuario);
}

/**
 * Verifica se o tipo de usuário é administrador
 * Aceita tanto 'admin' quanto 'administrador' para compatibilidade
 *
 * @param tipoUsuario - Tipo de usuário a verificar
 * @returns true se é admin ou administrador
 */
function isAdmin(tipoUsuario: string): boolean {
  return tipoUsuario === 'administrador' || tipoUsuario === 'admin';
}

/**
 * Verifica se o usuário pode acessar dados de uma escola específica
 *
 * Esta função faz consulta ao banco de dados para verificar se uma escola
 * pertence ao polo do usuário (quando aplicável).
 *
 * Regras de acesso:
 * - Admin/Técnico: Acesso a qualquer escola
 * - Polo: Apenas escolas do seu polo (verificado via banco de dados)
 * - Escola: Apenas sua própria escola
 *
 * @param usuario - Usuário autenticado
 * @param escolaId - ID da escola a ser acessada
 * @returns true se tem permissão de acesso
 *
 * @example
 * const podeAcessar = await podeAcessarEscola(usuario, escolaId)
 * if (!podeAcessar) {
 *   return forbidden('Você não tem acesso a esta escola')
 * }
 */
export async function podeAcessarEscola(usuario: Usuario, escolaId: string): Promise<boolean> {
  // Administrador e tecnico tem acesso total
  if (isAdmin(usuario.tipo_usuario) || usuario.tipo_usuario === 'tecnico') {
    return true;
  }

  // Usuario de escola so acessa sua propria escola
  if (usuario.tipo_usuario === 'escola') {
    return usuario.escola_id === escolaId;
  }

  // Usuario de polo: verificar se a escola pertence ao polo do usuario
  if (usuario.tipo_usuario === 'polo') {
    if (!usuario.polo_id) {
      return false;
    }

    try {
      const result = await pool.query(
        'SELECT id FROM escolas WHERE id = $1 AND polo_id = $2 AND ativo = true',
        [escolaId, usuario.polo_id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar acesso a escola:', error);
      return false;
    }
  }

  return false;
}

/**
 * Versão síncrona para verificação rápida de acesso a escola
 *
 * Diferente de `podeAcessarEscola`, esta função NÃO faz consulta ao banco.
 * Use apenas quando já tiver o polo_id da escola disponível.
 *
 * @param usuario - Usuário autenticado
 * @param escolaId - ID da escola a ser acessada
 * @param escolaPoloId - ID do polo da escola (necessário para usuários de polo)
 * @returns true se tem permissão de acesso
 *
 * @example
 * // Quando já tem os dados da escola carregados
 * if (!podeAcessarEscolaSync(usuario, escola.id, escola.polo_id)) {
 *   return forbidden()
 * }
 */
export function podeAcessarEscolaSync(usuario: Usuario, escolaId: string, escolaPoloId?: string | null): boolean {
  if (isAdmin(usuario.tipo_usuario) || usuario.tipo_usuario === 'tecnico') {
    return true;
  }

  if (usuario.tipo_usuario === 'escola') {
    return usuario.escola_id === escolaId;
  }

  if (usuario.tipo_usuario === 'polo') {
    if (!usuario.polo_id || !escolaPoloId) {
      return false;
    }
    return usuario.polo_id === escolaPoloId;
  }

  return false;
}

/**
 * Verifica se o usuário pode acessar dados de um polo específico
 *
 * Regras de acesso:
 * - Admin/Técnico: Acesso a qualquer polo
 * - Polo: Apenas seu próprio polo
 * - Escola: Sem acesso direto a polos
 *
 * @param usuario - Usuário autenticado
 * @param poloId - ID do polo a ser acessado
 * @returns true se tem permissão de acesso
 *
 * @example
 * if (!podeAcessarPolo(usuario, poloId)) {
 *   return forbidden('Você não tem acesso a este polo')
 * }
 */
export function podeAcessarPolo(usuario: Usuario, poloId: string): boolean {
  if (isAdmin(usuario.tipo_usuario) || usuario.tipo_usuario === 'tecnico') {
    return true;
  }

  if (usuario.tipo_usuario === 'polo') {
    return usuario.polo_id === poloId;
  }

  return false;
}

