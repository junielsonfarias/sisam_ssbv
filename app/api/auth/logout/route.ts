import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export async function POST() {
  const response = NextResponse.json({ mensagem: 'Logout realizado com sucesso' })
  response.cookies.delete('token')
  return response
}

