import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '@/database/connection';
import { Usuario, TipoUsuario } from './types';

// IMPORTANTE: JWT_SECRET DEVE ser configurado via variavel de ambiente
// Em producao, NUNCA use o valor padrao - gere uma chave segura com pelo menos 32 caracteres
const JWT_SECRET = process.env.JWT_SECRET;

// Validar JWT_SECRET na inicializacao
if (!JWT_SECRET) {
  console.error('ERRO CRITICO: JWT_SECRET nao esta configurado!');
  console.error('Configure a variavel de ambiente JWT_SECRET com uma chave segura de pelo menos 32 caracteres.');
}

if (JWT_SECRET && JWT_SECRET.length < 32) {
  console.warn('AVISO: JWT_SECRET deve ter pelo menos 32 caracteres para seguranca adequada.');
}

export interface TokenPayload {
  userId: string;
  email: string;
  tipoUsuario: TipoUsuario;
  poloId?: string | null;
  escolaId?: string | null;
}

export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function comparePassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

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

// Helper para verificar se é admin (aceita 'admin' ou 'administrador')
function isAdmin(tipoUsuario: string): boolean {
  return tipoUsuario === 'administrador' || tipoUsuario === 'admin';
}

/**
 * Verifica se o usuario pode acessar uma escola especifica
 * IMPORTANTE: Para usuarios do tipo 'polo', verifica se a escola pertence ao polo do usuario
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
 * Versao sincrona para verificacao rapida (sem consulta ao banco)
 * Usar apenas quando ja tiver o polo_id da escola disponivel
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

export function podeAcessarPolo(usuario: Usuario, poloId: string): boolean {
  if (isAdmin(usuario.tipo_usuario) || usuario.tipo_usuario === 'tecnico') {
    return true;
  }

  if (usuario.tipo_usuario === 'polo') {
    return usuario.polo_id === poloId;
  }

  return false;
}

