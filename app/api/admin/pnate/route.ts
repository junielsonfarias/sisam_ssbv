/**
 * /api/admin/pnate
 *
 * GET ?recurso=veiculos|motoristas|rotas|alertas|rota — lista o recurso
 * POST ?acao=veiculo|motorista|rota|vincular_aluno
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  buscarRotaCompleta,
  cadastrarMotorista,
  cadastrarVeiculo,
  criarRota,
  listarVeiculos,
  listarMotoristas,
  listarRotas,
  alertasVencimento,
  vincularAlunoRota,
} from '@/lib/services/pnate.service'

export const dynamic = 'force-dynamic'

const TIPOS_VEICULO = ['onibus', 'micro_onibus', 'van', 'kombi', 'lancha', 'barco', 'outro'] as const
const VINCULOS_VEICULO = ['proprio', 'terceirizado', 'conveniado'] as const
const VINCULOS_MOTORISTA = ['concursado', 'contrato', 'terceirizado', 'rpa'] as const
const TURNOS = ['matutino', 'vespertino', 'noturno', 'integral'] as const

const veiculoSchema = z.object({
  placa: z.string().min(5).max(10),
  tipo: z.enum(TIPOS_VEICULO),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  ano_fabricacao: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
  capacidade: z.number().int().min(1).max(200),
  combustivel: z.string().max(50).optional(),
  vinculo: z.enum(VINCULOS_VEICULO).optional(),
  empresa_terceirizada: z.string().max(255).optional(),
  vistoria_data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vistoria_validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  acessivel_pcd: z.boolean().optional(),
  observacoes: z.string().max(2000).optional(),
})

const motoristaSchema = z.object({
  nome: z.string().min(2).max(255),
  cpf: z.string().min(11).max(14),
  cnh_numero: z.string().min(5).max(20),
  cnh_categoria: z.string().min(1).max(5),
  cnh_validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  curso_escolar_validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  telefone: z.string().max(20).optional(),
  vinculo: z.enum(VINCULOS_MOTORISTA).optional(),
})

const paradaSchema = z.object({
  ordem: z.number().int().min(1).max(200),
  endereco: z.string().min(2).max(500),
  ponto_referencia: z.string().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  hora_estimada: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
})

const rotaSchema = z.object({
  codigo: z.string().min(1).max(50),
  descricao: z.string().min(2).max(500),
  escolas_ids: z.array(z.string().uuid()).min(1),
  veiculo_id: z.string().uuid().optional(),
  motorista_id: z.string().uuid().optional(),
  turno: z.enum(TURNOS).optional(),
  distancia_km: z.number().nonnegative().optional(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  hora_fim: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  paradas: z.array(paradaSchema).max(100).default([]),
})

const vincularSchema = z.object({
  aluno_id: z.string().uuid(),
  rota_id: z.string().uuid(),
  parada_id: z.string().uuid().optional(),
  tipo_uso: z.enum(['ida', 'volta', 'ida_volta']).optional(),
  vigencia_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'polo', 'escola'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'rotas'

  switch (recurso) {
    case 'veiculos': {
      const dados = await listarVeiculos({
        vencidos: searchParams.get('vencidos') === 'true',
      })
      return NextResponse.json({ veiculos: dados })
    }
    case 'motoristas': {
      const dados = await listarMotoristas({
        vencidos: searchParams.get('vencidos') === 'true',
      })
      return NextResponse.json({ motoristas: dados })
    }
    case 'rotas': {
      const dados = await listarRotas({
        escolaId: searchParams.get('escola') || undefined,
      })
      return NextResponse.json({ rotas: dados })
    }
    case 'rota': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })
      const rota = await buscarRotaCompleta(id)
      return NextResponse.json({ rota })
    }
    case 'alertas': {
      const dados = await alertasVencimento()
      return NextResponse.json(dados)
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
    case 'veiculo': {
      const parsed = veiculoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await cadastrarVeiculo(parsed.data)

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'PNATE_CADASTRAR_VEICULO',
          entidade: 'pnate_veiculos',
          entidadeId: id,
          detalhes: {
            placa: parsed.data.placa,
            tipo: parsed.data.tipo,
            capacidade: parsed.data.capacidade,
            vinculo: parsed.data.vinculo,
            empresa_terceirizada: parsed.data.empresa_terceirizada,
          },
        })

        return NextResponse.json({ id, mensagem: 'Veículo cadastrado' }, { status: 201 })
      } catch (e) {
        if ((e as { code?: string }).code === '23505') {
          return NextResponse.json({ mensagem: 'Placa já cadastrada' }, { status: 409 })
        }
        throw e
      }
    }
    case 'motorista': {
      const parsed = motoristaSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await cadastrarMotorista(parsed.data)

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'PNATE_CADASTRAR_MOTORISTA',
          entidade: 'pnate_motoristas',
          entidadeId: id,
          detalhes: {
            nome: parsed.data.nome,
            cnh_categoria: parsed.data.cnh_categoria,
            cnh_validade: parsed.data.cnh_validade,
            vinculo: parsed.data.vinculo,
          },
        })

        return NextResponse.json({ id, mensagem: 'Motorista cadastrado' }, { status: 201 })
      } catch (e) {
        if ((e as { code?: string }).code === '23505') {
          return NextResponse.json({ mensagem: 'CPF ou CNH já cadastrado' }, { status: 409 })
        }
        throw e
      }
    }
    case 'rota': {
      const parsed = rotaSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await criarRota(parsed.data)

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'PNATE_CRIAR_ROTA',
          entidade: 'pnate_rotas',
          entidadeId: id,
          detalhes: {
            codigo: parsed.data.codigo,
            descricao: parsed.data.descricao,
            escolas_ids: parsed.data.escolas_ids,
            veiculo_id: parsed.data.veiculo_id,
            motorista_id: parsed.data.motorista_id,
            turno: parsed.data.turno,
            distancia_km: parsed.data.distancia_km,
            qtd_paradas: parsed.data.paradas?.length ?? 0,
          },
        })

        return NextResponse.json({ id, mensagem: 'Rota criada' }, { status: 201 })
      } catch (e) {
        if ((e as { code?: string }).code === '23505') {
          return NextResponse.json({ mensagem: 'Código de rota já existe' }, { status: 409 })
        }
        throw e
      }
    }
    case 'vincular_aluno': {
      const parsed = vincularSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const id = await vincularAlunoRota(parsed.data)

      // LGPD — vínculo de dado de menor a serviço público
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'PNATE_VINCULAR_ALUNO',
        entidade: 'pnate_alunos_rotas',
        entidadeId: id,
        detalhes: {
          aluno_id: parsed.data.aluno_id,
          rota_id: parsed.data.rota_id,
          tipo_uso: parsed.data.tipo_uso ?? 'ida_volta',
          vigencia_inicio: parsed.data.vigencia_inicio,
        },
      })

      return NextResponse.json({ id, mensagem: 'Aluno vinculado à rota' }, { status: 201 })
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
