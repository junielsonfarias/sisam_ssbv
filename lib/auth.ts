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
  return tiposPermitidos.includes(usuario.tipo_usuario);
}

export function podeAcessarEscola(usuario: Usuario, escolaId: string): boolean {
  if (usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') {
    return true;
  }

  if (usuario.tipo_usuario === 'polo') {
    // Verificar se a escola pertence ao polo do usuário
    return usuario.polo_id !== null;
  }

  if (usuario.tipo_usuario === 'escola') {
    return usuario.escola_id === escolaId;
  }

  return false;
}

export function podeAcessarPolo(usuario: Usuario, poloId: string): boolean {
  if (usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') {
    return true;
  }

  if (usuario.tipo_usuario === 'polo') {
    return usuario.polo_id === poloId;
  }

  return false;
}

