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

import pool from '@/database/connection'
import { registrarHistorico } from '@/lib/divergencias/corretores'
import { createLogger } from '@/lib/logger'

const log = createLogger('ImportacaoGovernanca')

/** Rótulo do "usuário" sistema para registros automáticos do ETL. */
const ETL_USUARIO_NOME = 'ETL Sisam'

/**
 * Limite defensivo de tamanho para `acao_realizada` em divergencias_historico.
 * A coluna foi ampliada para TEXT (migration divergencias-historico-acao-
 * realizada-text.sql), mas truncamos por segurança para nunca reintroduzir o
 * "value too long" que fazia a divergência do gate estrito sumir silenciosamente.
 */
const ACAO_REALIZADA_MAX = 255

/** Trunca a descrição da ação ao limite seguro da coluna. */
function truncarAcao(acao: string): string {
  return acao.length > ACAO_REALIZADA_MAX ? acao.slice(0, ACAO_REALIZADA_MAX) : acao
}

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
      truncarAcao(`${input.entidade} "${input.nome}" recusada pelo ETL (gate estrito): ausente no cadastro mestre do Gestor`),
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
      truncarAcao(`${input.entidade} "${input.nome}" criada pelo ETL (transição) — pendente de "Assumir no Gestor"`),
      true,
      input.usuarioId,
      ETL_USUARIO_NOME
    )
  } catch (error) {
    log.error('Falha ao registrar mestre criado pelo ETL:', error)
  }
}

interface DivergenciaImportacaoInput {
  /** Tipo do mestre ausente: turma ou aluno. */
  tipo: 'turma' | 'aluno'
  /** Linha proposta pelo ETL (sem PII sensivel) que nao casou com mestre. */
  dadoEtl: Record<string, unknown>
  /** Descricao da chave usada na correspondencia (ex.: codigo+escola+ano). */
  chaveTentada: string
  importacaoId: string
}

/**
 * Registra na tabela dedicada `importacao_divergencias` (ADR-001) uma turma ou
 * aluno que o ETL em modo match-only (estrito) NAO encontrou no cadastro mestre
 * e, portanto, NAO criou. Fica como tarefa de triagem ("Cadastrar no Gestor" /
 * "Vincular a existente") para o administrador do Gestor regularizar.
 *
 * Tolerante a falha: nunca derruba o fluxo de importacao — apenas loga.
 */
export async function registrarDivergenciaImportacao(
  input: DivergenciaImportacaoInput
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO importacao_divergencias (importacao_id, tipo, dado_etl, chave_tentada)
       VALUES ($1, $2, $3, $4)`,
      [input.importacaoId, input.tipo, JSON.stringify(input.dadoEtl), input.chaveTentada]
    )
  } catch (error) {
    log.error('Falha ao registrar divergencia de importacao (match-only):', error)
  }
}
