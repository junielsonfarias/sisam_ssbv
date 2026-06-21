/**
 * Helper de leitura de presenca/falta a partir da linha do Excel (Fase 5).
 *
 * @module services/importacao/process/presenca
 */

/**
 * Le as colunas FALTA / PRESENCA da linha e devolve:
 *  - 'F' quando o aluno faltou
 *  - 'P' quando o aluno esteve presente
 *  - null quando nao ha informacao de frequencia
 *
 * Mantem a precedencia da coluna FALTA sobre PRESENCA e os mesmos
 * sinonimos aceitos anteriormente no orquestrador.
 */
export function lerPresenca(linha: Record<string, unknown>): string | null {
  const colunaFalta = linha['FALTA'] || linha['Falta'] || linha['falta']
  const colunaPresenca = linha['PRESENÇA'] || linha['Presença'] || linha['presenca']

  const temColunaFalta = colunaFalta !== undefined && colunaFalta !== null && colunaFalta !== ''
  const temColunaPresenca = colunaPresenca !== undefined && colunaPresenca !== null && colunaPresenca !== ''

  if (temColunaFalta) {
    const valorFalta = String(colunaFalta).trim().toUpperCase()
    if (valorFalta === 'F' || valorFalta === 'X' || valorFalta === 'FALTOU' || valorFalta === 'AUSENTE' || valorFalta === 'SIM' || valorFalta === '1' || valorFalta === 'S') {
      return 'F'
    } else if (valorFalta === 'P' || valorFalta === 'PRESENTE' || valorFalta === 'NAO' || valorFalta === 'NÃO' || valorFalta === '0' || valorFalta === 'N') {
      return 'P'
    } else {
      return 'F'
    }
  } else if (temColunaPresenca) {
    const valorPresenca = String(colunaPresenca).trim().toUpperCase()
    if (valorPresenca === 'P' || valorPresenca === 'PRESENTE' || valorPresenca === 'SIM' || valorPresenca === '1' || valorPresenca === 'S') {
      return 'P'
    } else if (valorPresenca === 'F' || valorPresenca === 'FALTOU' || valorPresenca === 'AUSENTE' || valorPresenca === 'NAO' || valorPresenca === 'NÃO' || valorPresenca === '0' || valorPresenca === 'N') {
      return 'F'
    }
  }

  return null
}
