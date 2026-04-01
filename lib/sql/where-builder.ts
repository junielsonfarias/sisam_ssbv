/**
 * Builder parametrizado para WHERE clauses SQL
 * Elimina duplicação de construção de filtros com paramIndex++ espalhada pelo projeto
 *
 * Usado por: dashboard.service, graficos.service, comparativos, resultados-consolidados
 */

type ParamValue = string | number | boolean | null

/**
 * Builder fluente para construção segura de cláusulas WHERE parametrizadas
 *
 * @example
 * const wb = new WhereBuilder()
 *   .add('rc.ano_letivo = $', anoLetivo)
 *   .addOptional('rc.polo_id = $', poloId)
 *   .addOptional('rc.escola_id = $', escolaId)
 *   .addRaw(`(${getPresencaSQL('rc')})`)
 *
 * const { whereClause, params } = wb.build()
 * // whereClause = "WHERE rc.ano_letivo = $1 AND rc.polo_id = $2 AND (...)"
 * // params = ['2026', 'uuid-polo']
 */
export class WhereBuilder {
  private conditions: string[] = []
  private params: ParamValue[] = []
  private paramIndex: number

  constructor(startIndex: number = 1) {
    this.paramIndex = startIndex
  }

  /** Adiciona condição obrigatória com parâmetro */
  add(condition: string, value: ParamValue): this {
    this.conditions.push(condition.replace('$', `$${this.paramIndex}`))
    this.params.push(value)
    this.paramIndex++
    return this
  }

  /** Adiciona condição apenas se valor não for null/undefined/'' */
  addOptional(condition: string, value: ParamValue | undefined): this {
    if (value !== null && value !== undefined && value !== '') {
      return this.add(condition, value)
    }
    return this
  }

  /** Adiciona condição SQL raw (sem parâmetro) */
  addRaw(condition: string): this {
    this.conditions.push(condition)
    return this
  }

  /** Adiciona condição IN (...) com array de valores */
  addIn(column: string, values: ParamValue[]): this {
    if (values.length === 0) return this
    const placeholders = values.map(() => {
      const p = `$${this.paramIndex}`
      this.paramIndex++
      return p
    })
    this.conditions.push(`${column} IN (${placeholders.join(', ')})`)
    this.params.push(...values)
    return this
  }

  /** Adiciona controle de acesso por tipo de usuário */
  addAccessControl(
    tipoUsuario: string,
    poloId: string | null | undefined,
    escolaId: string | null | undefined,
    alias: string = 'rc'
  ): this {
    if (tipoUsuario === 'polo' && poloId) {
      this.add(`${alias}.polo_id = $`, poloId)
    } else if (tipoUsuario === 'escola' && escolaId) {
      this.add(`${alias}.escola_id = $`, escolaId)
    }
    return this
  }

  /** Retorna o próximo índice de parâmetro (útil para queries subsequentes) */
  getNextParamIndex(): number {
    return this.paramIndex
  }

  /** Retorna quantidade de parâmetros */
  getParamCount(): number {
    return this.params.length
  }

  /** Constrói a cláusula WHERE final */
  build(): { whereClause: string; params: ParamValue[] } {
    if (this.conditions.length === 0) {
      return { whereClause: '', params: [] }
    }
    return {
      whereClause: 'WHERE ' + this.conditions.join(' AND '),
      params: [...this.params],
    }
  }

  /** Constrói apenas as condições (sem WHERE prefix) para uso com AND */
  buildConditions(): { conditions: string; params: ParamValue[] } {
    return {
      conditions: this.conditions.join(' AND '),
      params: [...this.params],
    }
  }
}
