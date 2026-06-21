/**
 * KPIs gerais municipais (alunos, escolas, professores, servidores, PNE, Bolsa Família).
 *
 * @module services/kpis-semed/gerais
 */

import pool from '@/database/connection'
import { reportarErroSilencioso } from '@/lib/observabilidade/capturar-erro-silencioso'
import { poloDoUsuario, type KpisGerais, type UsuarioEscopo } from './types'

export async function obterKpisGerais(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisGerais> {
  // Alunos/AEE/Bolsa Familia sao filtrados por ano_letivo — assim cada ano
  // tem seu proprio "snapshot" e o dashboard reflete a matricula vigente.
  // Escolas/professores/servidores sao cadastros atemporais (filtram por ativo).
  // Quando o usuário é 'polo', todas as contagens são restritas às escolas do
  // polo (anti-vazamento de totais municipais para fora do escopo).
  const polo = poloDoUsuario(usuario)
  const params: unknown[] = [anoLetivo]
  let escolasFiltro = ''
  let alunosEscolaFiltro = ''
  let escolasIdSub = '' // subquery de ids de escolas do polo, para joins
  if (polo) {
    params.push(polo)
    escolasFiltro = ` AND polo_id = $${params.length}`
    escolasIdSub = `(SELECT id FROM escolas WHERE polo_id = $${params.length})`
    alunosEscolaFiltro = ` AND escola_id IN ${escolasIdSub}`
  }

  const r = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM alunos
          WHERE ativo IS NOT FALSE AND ano_letivo = $1${alunosEscolaFiltro}) AS total_alunos,
       (SELECT COUNT(*) FROM escolas WHERE ativo IS NOT FALSE${escolasFiltro}) AS total_escolas,
       (SELECT COUNT(*) FROM usuarios
          WHERE tipo_usuario = 'professor' AND ativo IS NOT FALSE${polo ? ` AND escola_id IN ${escolasIdSub}` : ''}) AS total_professores,
       ${polo ? '0' : '(SELECT COUNT(*) FROM servidores WHERE ativo = TRUE)'} AS total_servidores,
       (SELECT COUNT(DISTINCT ae.aluno_id)
          FROM alunos_aee ae
          INNER JOIN alunos a ON a.id = ae.aluno_id
         WHERE a.ano_letivo = $1 AND a.ativo IS NOT FALSE${polo ? ` AND a.escola_id IN ${escolasIdSub}` : ''}) AS alunos_pne,
       (SELECT COUNT(*) FROM alunos
         WHERE beneficiario_bolsa_familia = TRUE
           AND ano_letivo = $1 AND ativo IS NOT FALSE${alunosEscolaFiltro}) AS alunos_bf`,
    params
  ).catch((error) => {
    reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisGerais' })
    return { rows: [{}] }
  })

  const row = r.rows[0]
  return {
    total_alunos: parseInt(row.total_alunos || '0', 10),
    total_escolas: parseInt(row.total_escolas || '0', 10),
    total_professores: parseInt(row.total_professores || '0', 10),
    total_servidores: parseInt(row.total_servidores || '0', 10),
    alunos_pne: parseInt(row.alunos_pne || '0', 10),
    alunos_bf: parseInt(row.alunos_bf || '0', 10),
    ano_letivo: anoLetivo,
  }
}
