/**
 * Politica unica de criacao de dado MESTRE (polos, escolas, turmas, alunos).
 *
 * Existem duas "portas" que criam/atualizam cadastro mestre no SISAM:
 *
 *   1. Gestor (cadastro via planilha) — `POST /api/admin/importar-cadastros`.
 *   2. Sisam (ETL de resultados)      — `lib/services/importacao/*`.
 *
 * Antes, cada porta reimplementava por conta propria: a normalizacao/chave de
 * unicidade (UPPER/TRIM/remocao de pontos), a geracao de codigo e a marcacao de
 * `origem`. Isso significava DUAS politicas paralelas — a regra de "quem pode
 * criar o que" dependia de qual porta foi usada.
 *
 * Este modulo e a FONTE UNICA dessas regras. As duas portas devem consumir:
 *   - as constantes de `origem`;
 *   - as funcoes de normalizacao/chave (unicidade);
 *   - os helpers de codigo;
 *   - a politica `podeCriarMestre(origem, entidade)` (quem cria o que).
 *
 * @module services/gestor/mestre.service
 */

/** Origem de um registro de cadastro mestre criado pelo modulo Gestor. */
export const ORIGEM_GESTOR = 'gestor' as const

/** Origem de um registro de cadastro mestre criado pelo ETL do Sisam. */
export const ORIGEM_SISAM_ETL = 'sisam_etl' as const

/** Origens reconhecidas para dado mestre. */
export type OrigemMestre = typeof ORIGEM_GESTOR | typeof ORIGEM_SISAM_ETL

/** Entidades de cadastro mestre cobertas pela politica. */
export type EntidadeMestre = 'polo' | 'escola' | 'turma' | 'aluno'

/**
 * Politica de criacao de mestre por origem.
 *
 * Regra de negocio do projeto: o cadastro mestre e responsabilidade do modulo
 * Gestor. O ETL do Sisam NUNCA cria escola (gate de habilitacao) — apenas
 * vincula resultados a escolas ja cadastradas. Para turma/aluno o ETL pode
 * criar em modo transicao, sempre marcando `origem='sisam_etl'`.
 *
 * `true`  => a origem PODE criar a entidade no cadastro mestre.
 * `false` => a origem NAO cria; deve registrar divergencia e exigir cadastro
 *            previo pelo Gestor.
 */
const POLITICA_CRIACAO: Record<OrigemMestre, Record<EntidadeMestre, boolean>> = {
  [ORIGEM_GESTOR]: { polo: true, escola: true, turma: true, aluno: true },
  // ETL: cria polo (auxiliar) e, em transicao, turma/aluno. NUNCA escola.
  [ORIGEM_SISAM_ETL]: { polo: true, escola: false, turma: true, aluno: true },
}

/**
 * Fonte unica da regra "quem pode criar o que". Substitui decisoes espalhadas
 * (literais `'gestor'`/`'sisam_etl'` + gates locais) em ambas as portas.
 */
export function podeCriarMestre(origem: OrigemMestre, entidade: EntidadeMestre): boolean {
  return POLITICA_CRIACAO[origem]?.[entidade] ?? false
}

// ============================================================================
// NORMALIZACAO / CHAVES DE UNICIDADE (regra unica)
// ============================================================================

/**
 * Chave de unicidade de POLO (normalizada). Usada para deduplicar polos
 * independentemente da porta de entrada.
 */
export function normalizarNomePolo(nome: string): string {
  return nome.toUpperCase().trim()
}

/**
 * Chave de unicidade de ESCOLA (normalizada): maiusculas, sem pontos e com
 * espacos colapsados. Era reimplementada inline no importar-cadastros e como
 * `normalizarNomeEscola` no ETL — agora ha uma so definicao.
 */
export function normalizarNomeEscola(nome: string): string {
  return nome
    .toUpperCase()
    .trim()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Chave de unicidade de ALUNO dentro de um ano letivo:
 * `NOME_NORMALIZADO:escolaId:turmaId`.
 */
export function chaveAluno(nome: string, escolaId: string, turmaId: string | null): string {
  return `${nome.toUpperCase().trim()}:${escolaId}:${turmaId || 'null'}`
}

// ============================================================================
// GERACAO DE CODIGO (regra unica)
// ============================================================================

/** Codigo canonico de POLO a partir do nome. */
export function codigoPolo(nome: string): string {
  return nome.toUpperCase().replace(/\s+/g, '_')
}

/** Codigo canonico de ESCOLA a partir do nome (limitado a 50 chars). */
export function codigoEscola(nome: string): string {
  return normalizarNomeEscola(nome).replace(/\s+/g, '_').substring(0, 50)
}
