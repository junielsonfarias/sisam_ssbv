/**
 * Configuracao do gate de habilitacao do ETL (Sisam -> Gestor)
 *
 * O cadastro mestre (polos, escolas, turmas, alunos) e responsabilidade
 * EXCLUSIVA do modulo Gestor Escolar. O ETL do Sisam nao deve CRIAR dado
 * mestre — apenas consumir/complementar resultados vinculados a registros
 * ja cadastrados pelo Gestor.
 *
 * Este modulo define como o ETL se comporta quando uma turma/aluno do arquivo
 * nao existe no cadastro mestre:
 *
 *   - 'estrito'   : NAO cria. Registra DIVERGENCIA (como ja se faz com escola)
 *                   e deixa o Gestor cadastrar antes de reimportar.
 *   - 'transicao' : Cria, porem SEMPRE marcando origem='sisam_etl' +
 *                   origem_importacao_id (rastreabilidade). Expoe o que foi
 *                   criado pelo ETL via relatorio de divergencias para o Gestor
 *                   regularizar/assumir.
 *
 * Modo padrao: 'transicao' (nao quebra importacoes em ambientes que ainda nao
 * migraram o cadastro mestre para o Gestor). Defina ETL_GATE_MESTRE='estrito'
 * para ativar o gate completo.
 *
 * @module services/importacao/config
 */

export type EtlGateMode = 'estrito' | 'transicao'

// Origem do ETL: reexportada da politica unica de mestre (fonte unica de
// regras), preservando o import existente `from './config'`.
export { ORIGEM_SISAM_ETL } from '@/lib/services/gestor/mestre.service'

/**
 * Resolve o modo do gate de habilitacao para turmas/alunos a partir do ambiente.
 * Qualquer valor diferente de 'estrito' cai no modo 'transicao' (conservador).
 */
export function getEtlGateMode(): EtlGateMode {
  return process.env.ETL_GATE_MESTRE === 'estrito' ? 'estrito' : 'transicao'
}
