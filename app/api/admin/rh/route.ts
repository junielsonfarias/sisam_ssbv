/**
 * /api/admin/rh
 *
 * GET ?recurso=servidores|servidor|lotacoes|formacoes|relatorio
 * POST ?acao=servidor|lotacao|formacao
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  buscarServidor,
  cadastrarServidor,
  listarFormacoesServidor,
  listarLotacoesEscola,
  listarServidores,
  registrarFormacao,
  registrarLotacao,
  relatorioFormacoes,
} from '@/lib/services/rh.service'

export const dynamic = 'force-dynamic'

const TIPOS_VINCULO = [
  'concursado_efetivo', 'concursado_estavel', 'contrato_temporario',
  'comissionado', 'cedido', 'terceirizado', 'estagiario', 'rpa',
] as const

const FORMACAO_MAXIMA = [
  'fundamental_incompleto', 'fundamental_completo',
  'medio_incompleto', 'medio_completo', 'medio_normal_magisterio',
  'superior_incompleto', 'superior_completo_licenciatura',
  'superior_completo_bacharelado', 'especializacao', 'mestrado', 'doutorado',
] as const

const servidorSchema = z.object({
  matricula_funcional: z.string().max(20).optional(),
  cpf: z.string().min(11).max(14),
  nome: z.string().min(2).max(255),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sexo: z.enum(['M', 'F']).optional(),
  rg: z.string().max(20).optional(),
  pis: z.string().max(11).optional(),
  email: z.string().email().optional(),
  telefone: z.string().max(20).optional(),
  endereco: z.string().max(500).optional(),
  tipo_vinculo: z.enum(TIPOS_VINCULO),
  data_admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_demissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cargo: z.string().max(255).optional(),
  formacao_maxima: z.enum(FORMACAO_MAXIMA).optional(),
  area_formacao: z.string().max(255).optional(),
  usuario_id: z.string().uuid().optional(),
})

const lotacaoSchema = z.object({
  servidor_id: z.string().uuid(),
  escola_id: z.string().uuid().nullable().optional(),
  funcao: z.string().min(2).max(100),
  carga_horaria_semanal: z.number().int().min(1).max(60),
  turno: z.enum(['matutino', 'vespertino', 'noturno', 'integral']).optional(),
  vigencia_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vigencia_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  e_principal: z.boolean().optional(),
  observacoes: z.string().max(2000).optional(),
})

const formacaoSchema = z.object({
  servidor_id: z.string().uuid(),
  nome_curso: z.string().min(2).max(500),
  instituicao: z.string().max(255).optional(),
  modalidade: z.enum(['presencial', 'ead', 'hibrida']).optional(),
  carga_horaria: z.number().int().min(1).max(10000),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_conclusao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['inscrito', 'em_andamento', 'concluido', 'desistente', 'reprovado']).optional(),
  certificado_url: z.string().url().optional(),
  categoria: z.string().max(50).optional(),
  observacoes: z.string().max(2000).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'servidores'

  switch (recurso) {
    case 'servidores': {
      const dados = await listarServidores({
        tipoVinculo: searchParams.get('vinculo') as any || undefined,
        escolaId: searchParams.get('escola') || undefined,
        busca: searchParams.get('busca') || undefined,
        limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
      })
      return NextResponse.json({ servidores: dados })
    }
    case 'servidor': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })
      const dados = await buscarServidor(id)
      return NextResponse.json({ servidor: dados })
    }
    case 'lotacoes': {
      const escola = searchParams.get('escola')
      if (!escola) return NextResponse.json({ mensagem: 'Informe ?escola=' }, { status: 400 })
      const dados = await listarLotacoesEscola(escola)
      return NextResponse.json({ lotacoes: dados })
    }
    case 'formacoes': {
      const servidor = searchParams.get('servidor')
      if (!servidor) return NextResponse.json({ mensagem: 'Informe ?servidor=' }, { status: 400 })
      const dados = await listarFormacoesServidor(servidor)
      return NextResponse.json({ formacoes: dados })
    }
    case 'relatorio_formacoes': {
      const dados = await relatorioFormacoes({
        ano: searchParams.get('ano') || undefined,
        categoria: searchParams.get('categoria') || undefined,
      })
      return NextResponse.json({ relatorio: dados })
    }
    default:
      return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
  }
})

export const POST = withAuthModulo(['administrador', 'tecnico'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'servidor': {
      const parsed = servidorSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await cadastrarServidor(parsed.data)
        return NextResponse.json({ id, mensagem: 'Servidor cadastrado' }, { status: 201 })
      } catch (e) {
        const err = e as { code?: string; constraint?: string; detail?: string }
        if (err.code === '23505') {
          // Identifica qual UNIQUE foi violado para mensagem específica
          const constraint = err.constraint || ''
          if (constraint.includes('cpf')) return NextResponse.json({ mensagem: 'Já existe servidor com este CPF' }, { status: 409 })
          if (constraint.includes('matricula')) return NextResponse.json({ mensagem: 'Já existe servidor com esta matrícula funcional' }, { status: 409 })
          if (constraint.includes('usuario')) return NextResponse.json({ mensagem: 'Este usuário já está vinculado a outro servidor' }, { status: 409 })
          return NextResponse.json({ mensagem: 'Servidor duplicado (CPF, matrícula ou vínculo já existe)' }, { status: 409 })
        }
        if (err.code === '23503') return NextResponse.json({ mensagem: 'Usuário vinculado não encontrado' }, { status: 400 })
        throw e
      }
    }
    case 'lotacao': {
      const parsed = lotacaoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await registrarLotacao(parsed.data)
        return NextResponse.json({ id, mensagem: 'Lotação registrada' }, { status: 201 })
      } catch (e) {
        if ((e as { code?: string }).code === '23503') {
          return NextResponse.json({ mensagem: 'Servidor ou escola não encontrados' }, { status: 400 })
        }
        throw e
      }
    }
    case 'formacao': {
      const parsed = formacaoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await registrarFormacao({ ...parsed.data, registrado_por: usuario.id })
        return NextResponse.json({ id, mensagem: 'Formação registrada' }, { status: 201 })
      } catch (e) {
        if ((e as { code?: string }).code === '23503') {
          return NextResponse.json({ mensagem: 'Servidor não encontrado' }, { status: 400 })
        }
        throw e
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
