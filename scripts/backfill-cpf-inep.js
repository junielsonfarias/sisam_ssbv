#!/usr/bin/env node
/**
 * backfill-cpf-inep.js — Ingestão da planilha OFICIAL de identidade dos alunos.
 *
 * Por que existe: o sistema hoje tem ~100% dos alunos sem `cpf` e sem
 * `codigo_inep_aluno`. Esses são dados de IDENTIDADE REAL (PII) e NÃO podem ser
 * inventados — precisam vir da planilha oficial da secretaria. Este script
 * apenas INGERE esses dados quando o arquivo é fornecido; os índices UNIQUE
 * parciais (idx_alunos_cpf_unique / idx_alunos_inep_unique) já existem para
 * garantir não-duplicação.
 *
 * Uso:
 *   1) Coloque a planilha oficial em CSV em: data/oficial/alunos-cpf-inep.csv
 *      Cabeçalho aceito (case-insensitive), pelo menos `codigo` + (cpf e/ou inep):
 *        codigo,cpf,codigo_inep_aluno
 *      (sinônimos aceitos: matricula->codigo, inep->codigo_inep_aluno)
 *   2) Dry-run (padrão, NÃO escreve):  node scripts/backfill-cpf-inep.js
 *   3) Aplicar de verdade:             node scripts/backfill-cpf-inep.js --apply
 *      Caminho custom:                 node scripts/backfill-cpf-inep.js --apply caminho/arquivo.csv
 *
 * Regras de segurança:
 *   - Idempotente: só preenche `cpf`/`codigo_inep_aluno` quando estão NULL
 *     (não sobrescreve valor já existente).
 *   - Valida formato: CPF = 11 dígitos; INEP = 12 dígitos. Linhas inválidas são
 *     puladas e listadas no relatório.
 *   - Casa o aluno por `codigo` (código de matrícula). Códigos não encontrados
 *     são reportados (não cria aluno).
 *   - Conexão via variável de ambiente DATABASE_URL (ou SUPABASE_DB_URL).
 *     Aponte para o banco em uso (educanet-demo nesta fase).
 */

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const APPLY = process.argv.includes('--apply')
const fileArg = process.argv.find((a) => a.endsWith('.csv'))
const CSV_PATH = fileArg || path.join('data', 'oficial', 'alunos-cpf-inep.csv')
const CONN = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

function fail(msg) { console.error('ERRO:', msg); process.exit(1) }

function parseCsv(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '')
  if (linhas.length === 0) return []
  const sep = linhas[0].includes(';') && !linhas[0].includes(',') ? ';' : ','
  const head = linhas[0].split(sep).map((h) => h.trim().toLowerCase())
  const idx = (nomes) => nomes.map((n) => head.indexOf(n)).find((i) => i >= 0)
  const ci = idx(['codigo', 'matricula'])
  const cpfI = idx(['cpf'])
  const inepI = idx(['codigo_inep_aluno', 'inep', 'codigo_inep'])
  if (ci === undefined) fail(`CSV precisa de coluna "codigo" (ou "matricula"). Cabeçalho lido: ${head.join(', ')}`)
  return linhas.slice(1).map((l) => {
    const c = l.split(sep)
    const dig = (s) => (s || '').replace(/\D/g, '')
    return {
      codigo: (c[ci] || '').trim(),
      cpf: cpfI !== undefined ? dig(c[cpfI]) : '',
      inep: inepI !== undefined ? dig(c[inepI]) : '',
    }
  })
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    fail(`Planilha não encontrada: ${CSV_PATH}\n` +
      `Coloque a planilha oficial (codigo,cpf,codigo_inep_aluno) nesse caminho e rode de novo.\n` +
      `Sem a planilha oficial NÃO é possível preencher CPF/INEP (são dados reais, não inventáveis).`)
  }
  if (!CONN) fail('Defina DATABASE_URL (ou SUPABASE_DB_URL) apontando para o banco em uso (educanet-demo).')

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'))
  const validas = []
  const invalidas = []
  for (const r of rows) {
    if (!r.codigo) { invalidas.push({ ...r, motivo: 'sem codigo' }); continue }
    if (r.cpf && r.cpf.length !== 11) { invalidas.push({ ...r, motivo: 'cpf != 11 digitos' }); continue }
    if (r.inep && r.inep.length !== 12) { invalidas.push({ ...r, motivo: 'inep != 12 digitos' }); continue }
    if (!r.cpf && !r.inep) { invalidas.push({ ...r, motivo: 'sem cpf nem inep' }); continue }
    validas.push(r)
  }

  console.log(`Planilha: ${CSV_PATH}`)
  console.log(`Modo: ${APPLY ? 'APLICAR (escreve no banco)' : 'DRY-RUN (não escreve) — use --apply para gravar'}`)
  console.log(`Linhas: ${rows.length} | válidas: ${validas.length} | inválidas: ${invalidas.length}`)

  const pool = new Pool({ connectionString: CONN, ssl: CONN.includes('supabase') ? { rejectUnauthorized: false } : undefined })
  let atualizados = 0, naoEncontrados = 0, jaPreenchidos = 0
  try {
    for (const r of validas) {
      const al = await pool.query('SELECT id, cpf, codigo_inep_aluno FROM alunos WHERE codigo = $1', [r.codigo])
      if (al.rows.length === 0) { naoEncontrados++; continue }
      const a = al.rows[0]
      const setCpf = r.cpf && !a.cpf
      const setInep = r.inep && !a.codigo_inep_aluno
      if (!setCpf && !setInep) { jaPreenchidos++; continue }
      if (APPLY) {
        await pool.query(
          `UPDATE alunos SET
             cpf = COALESCE(cpf, $2),
             codigo_inep_aluno = COALESCE(codigo_inep_aluno, $3)
           WHERE id = $1`,
          [a.id, setCpf ? r.cpf : null, setInep ? r.inep : null]
        )
      }
      atualizados++
    }
  } finally {
    await pool.end()
  }

  console.log('--- RESULTADO ---')
  console.log(`${APPLY ? 'Atualizados' : 'Atualizaria'}: ${atualizados}`)
  console.log(`Já preenchidos (pulados): ${jaPreenchidos}`)
  console.log(`Código não encontrado: ${naoEncontrados}`)
  if (invalidas.length) {
    console.log(`Inválidas (${invalidas.length}):`)
    invalidas.slice(0, 20).forEach((i) => console.log(`  codigo=${i.codigo} motivo=${i.motivo}`))
    if (invalidas.length > 20) console.log(`  ... +${invalidas.length - 20}`)
  }
  if (!APPLY) console.log('\nNenhuma alteração feita (dry-run). Revise os números e rode com --apply.')
}

main().catch((e) => fail(e.message))
