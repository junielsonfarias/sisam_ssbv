import pool from '@/database/connection'

/**
 * Gera um código simples e único para o aluno
 * Formato: ALU seguido de número sequencial (ex: ALU0001, ALU0002, etc.)
 */
export async function gerarCodigoAluno(): Promise<string> {
  let tentativas = 0
  const maxTentativas = 10

  while (tentativas < maxTentativas) {
    try {
      // Buscar o maior código numérico existente
      const result = await pool.query(
        `SELECT codigo FROM alunos 
         WHERE codigo LIKE 'ALU%' 
         AND codigo ~ '^ALU[0-9]+$'
         ORDER BY CAST(SUBSTRING(codigo FROM 4) AS INTEGER) DESC 
         LIMIT 1`
      )

      let proximoNumero = 1
      if (result.rows.length > 0 && result.rows[0].codigo) {
        const codigoAtual = result.rows[0].codigo
        const numeroAtual = parseInt(codigoAtual.replace('ALU', ''))
        proximoNumero = numeroAtual + 1
      }

      const novoCodigo = `ALU${proximoNumero.toString().padStart(4, '0')}`

      // Verificar se o código já existe (para evitar race conditions)
      const verificar = await pool.query(
        'SELECT id FROM alunos WHERE codigo = $1 LIMIT 1',
        [novoCodigo]
      )

      if (verificar.rows.length === 0) {
        return novoCodigo
      }

      tentativas++
    } catch (error) {
      console.error('Erro ao gerar código do aluno:', error)
      // Fallback: usar timestamp se houver erro
      return `ALU${Date.now().toString().slice(-6)}`
    }
  }

  // Se todas as tentativas falharem, usar timestamp
  return `ALU${Date.now().toString().slice(-6)}`
}

/**
 * Gera um código simples baseado em um contador
 * Útil para importações em lote (usa timestamp para garantir unicidade)
 */
export function gerarCodigoAlunoSequencial(contador: number): string {
  // Usar contador + timestamp para garantir unicidade
  const timestamp = Date.now().toString().slice(-4)
  return `ALU${contador.toString().padStart(3, '0')}${timestamp}`
}

