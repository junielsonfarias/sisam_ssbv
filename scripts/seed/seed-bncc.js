#!/usr/bin/env node
/**
 * Seed das habilidades BNCC.
 *
 * Carrega todos os arquivos `habilidades-*.json` de `database/bncc-data/`
 * e insere/atualiza na tabela `bncc_habilidades`.
 *
 * Pré-requisitos:
 *  - Migrations `add-bncc-estrutura.sql` e `seed-bncc-estrutura.sql` aplicadas
 *  - Variáveis DB_* configuradas
 *
 * Uso:
 *   node scripts/seed/seed-bncc.js
 */

require('dotenv').config({ path: '.env.local' })

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.resolve(__dirname, '../../database/bncc-data')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
})

function log(level, msg) {
  console.log(`[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${msg}`)
}

async function main() {
  if (!process.env.DB_HOST || !process.env.DB_NAME) {
    log('error', 'Variáveis DB_HOST, DB_NAME, DB_USER, DB_PASSWORD são obrigatórias')
    process.exit(1)
  }

  const arquivos = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('habilidades-') && f.endsWith('.json'))
    .sort()

  if (arquivos.length === 0) {
    log('warn', `Nenhum arquivo habilidades-*.json encontrado em ${DATA_DIR}`)
    process.exit(0)
  }

  log('info', `Encontrados ${arquivos.length} arquivos de habilidades: ${arquivos.join(', ')}`)

  let totalInseridas = 0
  let totalAtualizadas = 0
  let totalErros = 0

  const client = await pool.connect()
  try {
    for (const arquivo of arquivos) {
      const fullPath = path.join(DATA_DIR, arquivo)
      const habilidades = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
      log('info', `Processando ${arquivo} (${habilidades.length} habilidades)...`)

      for (const h of habilidades) {
        try {
          const result = await client.query(
            `INSERT INTO bncc_habilidades
               (codigo, descricao, componente_id, etapa_id, ano, campo_experiencia, faixa_etaria, unidade_tematica_id, ativa)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
             ON CONFLICT (codigo) DO UPDATE
               SET descricao = EXCLUDED.descricao,
                   componente_id = EXCLUDED.componente_id,
                   etapa_id = EXCLUDED.etapa_id,
                   ano = EXCLUDED.ano,
                   campo_experiencia = EXCLUDED.campo_experiencia,
                   faixa_etaria = EXCLUDED.faixa_etaria,
                   ativa = TRUE
             RETURNING (xmax = 0) AS inserido`,
            [
              h.codigo,
              h.descricao,
              h.componente_id || null,
              h.etapa_id || null,
              h.ano || null,
              h.campo_experiencia || null,
              h.faixa_etaria || null,
              h.unidade_tematica_id || null,
            ]
          )
          if (result.rows[0]?.inserido) {
            totalInseridas++
          } else {
            totalAtualizadas++
          }
        } catch (err) {
          log('error', `Erro em ${h.codigo}: ${err.message}`)
          totalErros++
        }
      }
    }
  } finally {
    client.release()
    await pool.end()
  }

  log('info', `Concluído: ${totalInseridas} inseridas, ${totalAtualizadas} atualizadas, ${totalErros} erros`)
  process.exit(totalErros > 0 ? 1 : 0)
}

main().catch((err) => {
  log('error', `Erro fatal: ${err.message}`)
  process.exit(1)
})
