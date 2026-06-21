/**
 * Tipos e helpers compartilhados entre os submódulos de KPIs da SEMED.
 *
 * @module services/kpis-semed/types
 */

import type { Usuario } from '@/lib/types/usuario'

/** Subconjunto do usuário necessário para aplicar escopo de acesso. */
export type UsuarioEscopo = Pick<Usuario, 'tipo_usuario' | 'polo_id' | 'escola_id'>

/**
 * Resolve o filtro de polo para usuários do tipo 'polo'.
 * Retorna `null` para administrador/técnico (sem restrição).
 */
export function poloDoUsuario(usuario?: UsuarioEscopo): string | null {
  return usuario?.tipo_usuario === 'polo' && usuario.polo_id ? usuario.polo_id : null
}

export interface KpisGerais {
  total_alunos: number
  total_escolas: number
  total_professores: number
  total_servidores: number
  alunos_pne: number
  alunos_bf: number
  ano_letivo: string
}

export interface KpisFrequencia {
  frequencia_media_pct: number
  alunos_infrequentes: number  // < 75%
  alunos_evasao_risco: number  // FICAI abertos
}

export interface KpisDesempenho {
  media_geral: number | null
  taxa_aprovacao_pct: number | null
  taxa_reprovacao_pct: number | null
  taxa_abandono_pct: number | null
  distorcao_idade_serie_pct: number | null
  ideb_projetado: number | null
}

export interface KpisProgramas {
  pnae_refeicoes_mes: number
  pnate_alunos_atendidos: number
  pdde_executado_pct: number | null
  ordens_servico_abertas: number
  ordens_servico_urgentes: number
}

export interface ComparativoEscola {
  escola_id: string
  escola_nome: string
  polo_nome: string | null
  total_alunos: number
  frequencia_pct: number | null
  media_geral: number | null
  alunos_pne: number
  alertas_ficai: number
}

export interface KpisCompletos {
  gerais: KpisGerais
  frequencia: KpisFrequencia
  desempenho: KpisDesempenho
  programas: KpisProgramas
  comparativo_escolas?: ComparativoEscola[]
  gerado_em: string
}
