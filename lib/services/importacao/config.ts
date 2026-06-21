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
 * Modo padrao: 'estrito' (principio "externos apenas consomem e complementam":
 * o ETL do Sisam NUNCA cria dado mestre). O modo 'transicao' so e ativado
 * atras de flag explicita por ambiente — defina ETL_GATE_MESTRE='transicao'
 * para ambientes que ainda nao migraram o cadastro mestre para o Gestor.
 *
 * @module services/importacao/config
 */

export type EtlGateMode = 'estrito' | 'transicao'

// Origem do ETL: reexportada da politica unica de mestre (fonte unica de
// regras), preservando o import existente `from './config'`.
export { ORIGEM_SISAM_ETL } from '@/lib/services/gestor/mestre.service'

/**
 * Resolve o modo do gate de habilitacao para turmas/alunos a partir do ambiente.
 * Padrao 'estrito': o ETL nao cria dado mestre. Apenas o valor explicito
 * ETL_GATE_MESTRE='transicao' habilita a criacao residual (rastreavel) para
 * ambientes ainda em migracao do cadastro mestre para o Gestor.
 */
export function getEtlGateMode(): EtlGateMode {
  return process.env.ETL_GATE_MESTRE === 'transicao' ? 'transicao' : 'estrito'
}
