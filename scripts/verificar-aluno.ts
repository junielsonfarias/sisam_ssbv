import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import pool from '../database/connection'

async function verificar() {
  const result = await pool.query(`
    SELECT
      rc.id, a.nome as aluno_nome, e.nome as escola_nome, t.codigo as turma,
      rc.serie, rc.nota_producao, rc.nivel_aprendizagem,
      rc.nivel_lp, rc.nivel_mat, rc.nivel_prod, rc.nivel_aluno
    FROM resultados_consolidados rc
    JOIN alunos a ON a.id = rc.aluno_id
    JOIN escolas e ON e.id = rc.escola_id
    LEFT JOIN turmas t ON t.id = rc.turma_id
    WHERE UPPER(a.nome) LIKE '%LYOTO%'
    LIMIT 5
  `)

  console.log('Resultado para LYOTO:')
  console.log(JSON.stringify(result.rows, null, 2))
  await pool.end()
}

verificar()
