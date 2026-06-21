// SISAM - Verificadores de Divergências: Governança de Cadastro Mestre (ETL → Gestor)
//
// Estes verificadores fecham o elo "migração com histórico/governança" entre o
// ETL do Sisam e o Gestor Escolar: o que o ETL CRIOU (modo transição) ou RECUSOU
// criar (gate estrito) deixa de se perder ao fim da importação e passa a aparecer
// como tarefa de regularização persistente e consultável na página de divergências.
//
//   - mestre_criado_etl    : estado VIVO — turmas/alunos com origem='sisam_etl'
//                            ainda não assumidos pelo Gestor (corrigível: "Assumir
//                            no Gestor", que seta origem='gestor' e limpa o vínculo
//                            com a importação).
//   - mestre_ausente_gestor: registros que o ETL RECUSOU criar (não existem no
//                            banco) — reconstituídos a partir da trilha persistida
//                            em divergencias_historico pelo ETL.

import pool from '@/database/connection'
import {
  Divergencia,
  DivergenciaDetalhe,
  CONFIGURACOES_DIVERGENCIAS
} from './tipos'
import { ORIGEM_SISAM_ETL } from '@/lib/services/gestor/mestre.service'

/**
 * Verifica cadastro mestre CRIADO pelo ETL Sisam e ainda não assumido pelo Gestor.
 *
 * Lê o estado vivo das tabelas (turmas/alunos com origem='sisam_etl'). Assumir no
 * Gestor remove o registro desta lista (passa a origem='gestor').
 */
export async function verificarMestreCriadoEtl(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.mestre_criado_etl

    const [turmasResult, alunosResult] = await Promise.all([
      pool.query(
        `SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.origem_importacao_id,
                e.nome AS escola_nome, e.id AS escola_id
         FROM turmas t
         LEFT JOIN escolas e ON e.id = t.escola_id
         WHERE t.origem = $1
         ORDER BY e.nome NULLS LAST, t.codigo`,
        [ORIGEM_SISAM_ETL]
      ),
      pool.query(
        `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.origem_importacao_id,
                e.nome AS escola_nome, e.id AS escola_id, t.codigo AS turma_codigo
         FROM alunos a
         LEFT JOIN escolas e ON e.id = a.escola_id
         LEFT JOIN turmas t ON t.id = a.turma_id
         WHERE a.origem = $1
         ORDER BY e.nome NULLS LAST, a.nome`,
        [ORIGEM_SISAM_ETL]
      ),
    ])

    const detalhes: DivergenciaDetalhe[] = []

    for (const row of turmasResult.rows as any[]) {
      detalhes.push({
        id: row.id,
        entidade: 'turma',
        entidadeId: row.id,
        codigo: row.codigo,
        nome: row.nome,
        escola: row.escola_nome,
        escolaId: row.escola_id,
        serie: row.serie,
        anoLetivo: row.ano_letivo,
        descricaoProblema: 'Turma criada pelo ETL Sisam (transição), ainda não assumida pelo Gestor',
        sugestaoCorrecao: 'Assumir no Gestor',
        dadosExtras: { origemImportacaoId: row.origem_importacao_id }
      })
    }

    for (const row of alunosResult.rows as any[]) {
      detalhes.push({
        id: row.id,
        entidade: 'aluno',
        entidadeId: row.id,
        codigo: row.codigo,
        nome: row.nome,
        escola: row.escola_nome,
        escolaId: row.escola_id,
        turma: row.turma_codigo,
        serie: row.serie,
        anoLetivo: row.ano_letivo,
        descricaoProblema: 'Aluno criado pelo ETL Sisam (transição), ainda não assumido pelo Gestor',
        sugestaoCorrecao: 'Assumir no Gestor',
        dadosExtras: { origemImportacaoId: row.origem_importacao_id }
      })
    }

    if (detalhes.length === 0) return null

    return { id: 'mestre_criado_etl', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar cadastro mestre criado pelo ETL:', error)
    return null
  }
}

/**
 * Verifica cadastro mestre AUSENTE que o ETL recusou criar (gate estrito).
 *
 * Os registros recusados nunca foram criados no banco; sua trilha persistente
 * fica em divergencias_historico (gravada pelo ETL com tipo 'mestre_ausente_gestor').
 * Reconstituímos a lista a partir desse histórico, limitada à janela de retenção
 * (30 dias), para que o Gestor saiba o que precisa cadastrar antes de reimportar.
 */
export async function verificarMestreAusenteGestor(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.mestre_ausente_gestor

    const result = await pool.query(
      `SELECT id, entidade, entidade_nome, dados_antes, dados_depois, created_at
       FROM divergencias_historico
       WHERE tipo = 'mestre_ausente_gestor'
         AND created_at >= NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC`
    )

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = (result.rows as any[]).map((row) => {
      const extras = row.dados_antes || {}
      return {
        id: row.id,
        entidade: row.entidade || 'mestre',
        entidadeId: row.id,
        nome: row.entidade_nome || extras.nome || '(sem nome)',
        escola: extras.escola_nome || extras.escola,
        turma: extras.turma_codigo || extras.turma,
        anoLetivo: extras.ano_letivo,
        descricaoProblema: 'Registro recusado pelo ETL Sisam (não existe no cadastro mestre do Gestor)',
        sugestaoCorrecao: 'Cadastre no módulo Gestor e reimporte',
        dadosExtras: { importacaoId: extras.importacao_id, recusadoEm: row.created_at }
      }
    })

    return { id: 'mestre_ausente_gestor', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar cadastro mestre ausente (gate Gestor):', error)
    return null
  }
}
