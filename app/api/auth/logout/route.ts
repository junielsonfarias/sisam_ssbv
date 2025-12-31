import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ mensagem: 'Logout realizado com sucesso' })
  response.cookies.delete('token')
  return response
}

