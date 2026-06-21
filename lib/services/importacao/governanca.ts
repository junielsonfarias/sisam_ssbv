/**
 * Governança ETL → Gestor: persiste em `divergencias_historico` o que o ETL
 * CRIOU (modo transição) ou RECUSOU criar (gate estrito) no cadastro mestre.
 *
 * Antes, divergências de mestre do ETL viviam apenas no array `erros[]` da
 * importação e se perdiam ao fim do processamento. Aqui elas viram trilha
 * persistente e consultável — aparecem na página de divergências do Gestor
 * (tipos `mestre_criado_etl` e `mestre_ausente_gestor`) como tarefa de
 * regularização.
 *
 * Reutiliza `registrarHistorico` (fonte única de gravação no histórico).
 *
 * @module services/importacao/governanca
 */

import { registrarHistorico } from '@/lib/divergencias/corretores'
import { createLogger } from '@/lib/logger'

const log = createLogger('ImportacaoGovernanca')

/** Rótulo do "usuário" sistema para registros automáticos do ETL. */
const ETL_USUARIO_NOME = 'ETL Sisam'

interface MestreAusenteInput {
  entidade: 'escola' | 'turma' | 'aluno'
  nome: string
  escolaNome?: string | null
  turmaCodigo?: string | null
  poloNome?: string | null
  anoLetivo?: string | null
  importacaoId: string
  usuarioId: string
}

/**
 * Registra um cadastro mestre RECUSADO pelo ETL (gate estrito) como divergência
 * `mestre_ausente_gestor`. O registro nunca foi criado no banco — o histórico é
 * sua única trilha consultável para o Gestor saber o que cadastrar antes de
 * reimportar.
 */
export async function registrarMestreAusente(input: MestreAusenteInput): Promise<void> {
  try {
    await registrarHistorico(
      'mestre_ausente_gestor',
      input.entidade,
      null,
      input.nome,
      {
        nome: input.nome,
        escola_nome: input.escolaNome ?? null,
        turma_codigo: input.turmaCodigo ?? null,
        polo_nome: input.poloNome ?? null,
        ano_letivo: input.anoLetivo ?? null,
        importacao_id: input.importacaoId,
      },
      null,
      `${input.entidade} "${input.nome}" recusada pelo ETL (gate estrito): ausente no cadastro mestre do Gestor`,
      true,
      input.usuarioId,
      ETL_USUARIO_NOME
    )
  } catch (error) {
    log.error('Falha ao registrar mestre ausente (gate Gestor):', error)
  }
}

interface MestreCriadoInput {
  entidade: 'polo' | 'turma' | 'aluno'
  entidadeId: string | null
  nome: string
  escolaNome?: string | null
  anoLetivo?: string | null
  importacaoId: string
  usuarioId: string
}

/**
 * Registra um cadastro mestre CRIADO pelo ETL em modo transição como divergência
 * `mestre_criado_etl`, para que o Gestor possa assumi-lo (regularizar) depois.
 */
export async function registrarMestreCriado(input: MestreCriadoInput): Promise<void> {
  try {
    await registrarHistorico(
      'mestre_criado_etl',
      input.entidade,
      input.entidadeId,
      input.nome,
      null,
      {
        nome: input.nome,
        escola_nome: input.escolaNome ?? null,
        ano_letivo: input.anoLetivo ?? null,
        importacao_id: input.importacaoId,
        origem: 'sisam_etl',
      },
      `${input.entidade} "${input.nome}" criada pelo ETL (transição) — pendente de "Assumir no Gestor"`,
      true,
      input.usuarioId,
      ETL_USUARIO_NOME
    )
  } catch (error) {
    log.error('Falha ao registrar mestre criado pelo ETL:', error)
  }
}
