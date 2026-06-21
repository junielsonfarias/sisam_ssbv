/**
 * Fases 2-4: Carregar dados existentes, criar polos/escolas, carregar questoes
 *
 * @module services/importacao/load
 */

import pool from '@/database/connection'
import { carregarConfigSeries } from '@/lib/config-series'
import { createLogger } from '@/lib/logger'
import { ConfiguracaoSerie } from '@/lib/types'
import {
  ORIGEM_SISAM_ETL,
  codigoPolo,
  normalizarNomeEscola,
  normalizarNomePolo,
  podeCriarMestre,
} from '@/lib/services/gestor/mestre.service'
import {
  DadosExtraidos,
  DadosExistentes,
  DadosQuestoes,
  ImportacaoResultado,
} from './types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 2: CARREGAR DADOS EXISTENTES DO BANCO
// ============================================================================
// `normalizarNomeEscola` (chave de unicidade) vem da politica unica de mestre
// (@/lib/services/gestor/mestre.service), compartilhada com o importar-cadastros.

/**
 * Fase 2: Carrega todos os dados existentes do banco
 */
export async function carregarDadosExistentes(anoLetivo: string, avaliacaoId: string): Promise<DadosExistentes> {
  log.info('[FASE 2] Carregando dados existentes do banco...')

  const polosMap = new Map<string, string>()
  const escolasMap = new Map<string, string>()
  const turmasMap = new Map<string, string>()
  const alunosMap = new Map<string, string>()
  const questoesMap = new Map<string, string>()

  // Carregar polos existentes
  const polosDB = await pool.query('SELECT id, nome FROM polos')
  polosDB.rows.forEach((p: { id: string; nome: string }) => {
    polosMap.set(normalizarNomePolo(p.nome), p.id)
  })
  log.info(`  -> ${polosDB.rows.length} polos carregados`)

  // Carregar escolas existentes (usando normalizacao para evitar duplicatas)
  const escolasDB = await pool.query('SELECT id, nome FROM escolas WHERE ativo = true')
  escolasDB.rows.forEach((e: { id: string; nome: string }) => {
    const nomeNormalizado = normalizarNomeEscola(e.nome)
    if (!escolasMap.has(nomeNormalizado)) {
      escolasMap.set(nomeNormalizado, e.id)
    }
  })
  log.info(`  -> ${escolasDB.rows.length} escolas carregadas (normalizadas para comparacao)`)

  // Carregar turmas existentes do ano letivo
  const turmasDB = await pool.query(
    'SELECT id, codigo, escola_id FROM turmas WHERE ano_letivo = $1',
    [anoLetivo]
  )
  turmasDB.rows.forEach((t: { id: string; codigo: string; escola_id: string }) => {
    turmasMap.set(`${t.codigo}_${t.escola_id}`, t.id)
  })
  log.info(`  -> ${turmasDB.rows.length} turmas carregadas (ano ${anoLetivo})`)

  // Carregar alunos existentes do ano letivo para evitar duplicatas
  const alunosDB = await pool.query(
    'SELECT id, nome, escola_id, turma_id, ano_letivo FROM alunos WHERE ano_letivo = $1 AND ativo = true',
    [anoLetivo]
  )
  alunosDB.rows.forEach((a: { id: string; nome: string; escola_id: string; turma_id: string | null; ano_letivo: string | null }) => {
    const nomeNormalizado = (a.nome || '').toString().toUpperCase().trim()
    const turmaKey = a.turma_id ? a.turma_id.toString() : 'NULL'
    const alunoKey = `${nomeNormalizado}_${a.escola_id}_${turmaKey}_${a.ano_letivo || ''}`
    alunosMap.set(alunoKey, a.id)
  })
  log.info(`  -> ${alunosDB.rows.length} alunos existentes no banco (ano ${anoLetivo}) - serao atualizados se duplicados`)

  // Carregar questoes existentes
  const questoesDB = await pool.query('SELECT id, codigo FROM questoes')
  questoesDB.rows.forEach((q: { id: string; codigo: string }) => {
    questoesMap.set(q.codigo, q.id)
  })
  log.info(`  -> ${questoesDB.rows.length} questoes carregadas`)

  return { polosMap, escolasMap, turmasMap, alunosMap, questoesMap }
}

// ============================================================================
// FASE 3: CRIAR POLOS E ESCOLAS EM BATCH
// ============================================================================

/**
 * Fase 3: Cria polos e escolas que nao existem no banco
 */
export async function criarPolosEEscolas(
  dadosExcel: DadosExtraidos,
  dadosExistentes: DadosExistentes,
  resultado: ImportacaoResultado,
  erros: string[]
): Promise<void> {
  log.info('[FASE 3] Criando polos e escolas...')

  const { polosUnicos, escolasUnicas } = dadosExcel
  const { polosMap, escolasMap } = dadosExistentes

  // Criar polos faltantes (politica: ETL pode criar polo)
  const polosParaCriar = podeCriarMestre(ORIGEM_SISAM_ETL, 'polo')
    ? Array.from(polosUnicos).filter(p => !polosMap.has(normalizarNomePolo(p)))
    : []
  if (polosParaCriar.length > 0) {
    for (const nomePolo of polosParaCriar) {
      try {
        const result = await pool.query(
          "INSERT INTO polos (nome, codigo, origem) VALUES ($1, $2, $3) RETURNING id",
          [nomePolo, codigoPolo(nomePolo), ORIGEM_SISAM_ETL]
        )
        polosMap.set(normalizarNomePolo(nomePolo), result.rows[0].id)
        resultado.polos.criados++
      } catch (error: unknown) {
        erros.push(`Polo "${nomePolo}": ${(error as Error).message}`)
      }
    }
  }
  resultado.polos.existentes = polosUnicos.size - resultado.polos.criados

  // Criar escolas faltantes (usando normalizacao para evitar duplicatas)
  for (const [nomeEscola, nomePolo] of escolasUnicas) {
    const escolaNorm = normalizarNomeEscola(nomeEscola)
    if (!escolasMap.has(escolaNorm)) {
      const poloId = polosMap.get(normalizarNomePolo(nomePolo))
      if (poloId) {
        try {
          // Verificar novamente no banco com normalizacao para evitar race condition
          const escolaExistente = await pool.query(
            `SELECT id FROM escolas
             WHERE UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(nome, '\\.', '', 'g'), '\\s+', ' ', 'g'))) = $1
             AND ativo = true
             LIMIT 1`,
            [escolaNorm]
          )

          if (escolaExistente.rows.length > 0) {
            // Escola ja existe no cadastro mestre: apenas vincular (sem alterar mestre)
            escolasMap.set(escolaNorm, escolaExistente.rows[0].id)
            resultado.escolas.existentes++
          } else if (podeCriarMestre(ORIGEM_SISAM_ETL, 'escola')) {
            // Politica unica permitiria a criacao pelo ETL — atualmente NUNCA.
            // Mantido por completude da fonte unica de regras.
            const novaEscola = await pool.query(
              "INSERT INTO escolas (nome, codigo, polo_id, origem) VALUES ($1, $2, $3, $4) RETURNING id",
              [nomeEscola.trim(), escolaNorm.replace(/\s+/g, '_').substring(0, 50), poloId, ORIGEM_SISAM_ETL]
            )
            escolasMap.set(escolaNorm, novaEscola.rows[0].id)
            resultado.escolas.criados++
          } else {
            // GATE DE HABILITACAO (Gestor): por politica (podeCriarMestre), o
            // cadastro mestre de escolas e responsabilidade do modulo
            // Gestor/admin. O ETL do SISAM NAO cria escolas — apenas vincula
            // resultados a escolas ja cadastradas. Quando a escola nao existe,
            // registramos divergencia para que um responsavel habilitado faca o
            // cadastro previo.
            resultado.escolas.divergentes++
            erros.push(
              `DIVERGENCIA (gate Gestor): escola "${nomeEscola.trim()}" (polo "${nomePolo.trim()}") ` +
              `nao existe no cadastro mestre e nao foi criada pelo ETL. ` +
              `Cadastre a escola no modulo Gestor antes de reimportar.`
            )
            log.warn(
              `[GATE] Escola "${nomeEscola.trim()}" ignorada na criacao de mestre (responsabilidade do Gestor)`
            )
          }
        } catch (error: unknown) {
          erros.push(`Escola "${nomeEscola}": ${(error as Error).message}`)
        }
      }
    } else {
      resultado.escolas.existentes++
    }
  }

  log.info(`  -> Polos: ${resultado.polos.criados} criados, ${resultado.polos.existentes} existentes`)
  log.info(`  -> Escolas: ${resultado.escolas.criados} criadas, ${resultado.escolas.existentes} existentes, ${resultado.escolas.divergentes} divergentes (gate Gestor)`)
}

// ============================================================================
// FASE 4: CARREGAR/CRIAR QUESTOES E CONFIGURACOES
// ============================================================================

/**
 * Fase 4: Carrega configuracoes de series, cria questoes e carrega itens de producao
 */
export async function carregarQuestoes(
  questoesMap: Map<string, string>,
  resultado: ImportacaoResultado
): Promise<DadosQuestoes> {
  log.info('[FASE 4] Carregando configuracoes de series e criando questoes...')

  // Carregar configuracoes de todas as series
  const configSeries = await carregarConfigSeries()
  log.info(`  -> ${configSeries.size} configuracoes de series carregadas`)

  // Determinar o maximo de questoes necessarias (60 para 8o/9o, 34 para 5o, 28 para 2o/3o)
  const maxQuestoes = 60

  // Criar questoes genericas Q1 a Q60 (serao usadas conforme a serie)
  for (let num = 1; num <= maxQuestoes; num++) {
    const codigo = `Q${num}`
    if (!questoesMap.has(codigo)) {
      try {
        let disciplina = 'Lingua Portuguesa'
        let area = 'Lingua Portuguesa'

        if (num >= 1 && num <= 20) {
          disciplina = 'Língua Portuguesa'
          area = 'Língua Portuguesa'
        } else if (num >= 21 && num <= 30) {
          disciplina = 'Ciências Humanas'
          area = 'Ciências Humanas'
        } else if (num >= 31 && num <= 50) {
          disciplina = 'Matemática'
          area = 'Matemática'
        } else if (num >= 51 && num <= 60) {
          disciplina = 'Ciências da Natureza'
          area = 'Ciências da Natureza'
        }

        const result = await pool.query(
          'INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento) VALUES ($1, $2, $3, $4) RETURNING id',
          [codigo, `Questão ${num}`, disciplina, area]
        )
        questoesMap.set(codigo, result.rows[0].id)
        resultado.questoes.criadas++
      } catch (error: unknown) {
        log.error(`Erro ao criar questao ${codigo}:`, error)
      }
    }
  }
  resultado.questoes.existentes = maxQuestoes - resultado.questoes.criadas
  log.info(`  -> ${resultado.questoes.criadas} criadas, ${resultado.questoes.existentes} existentes`)

  // Carregar itens de producao
  const itensProducaoMap = new Map<string, string>()
  const itensProducaoDB = await pool.query('SELECT id, codigo FROM itens_producao WHERE ativo = true ORDER BY ordem')
  itensProducaoDB.rows.forEach((item: { id: string; codigo: string }) => {
    itensProducaoMap.set(item.codigo, item.id)
  })
  log.info(`  -> ${itensProducaoMap.size} itens de producao carregados`)

  return { configSeries, itensProducaoMap }
}
