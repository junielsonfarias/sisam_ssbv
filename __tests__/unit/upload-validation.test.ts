import { describe, it, expect } from 'vitest'
import { validarArquivoUpload } from '@/lib/api-helpers'

// ============================================================================
// HELPER — cria File fake para testes
// ============================================================================

function fakeFile(overrides: { type?: string; size?: number; name?: string } = {}): File {
  const blob = new Blob(['conteudo'], { type: overrides.type ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const file = new File([blob], overrides.name ?? 'planilha.xlsx', {
    type: overrides.type ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  // Override size via Object.defineProperty since File.size is readonly
  if (overrides.size !== undefined) {
    Object.defineProperty(file, 'size', { value: overrides.size })
  }
  return file
}

const MB = 1024 * 1024

// ============================================================================
// TESTES DE VALIDAÇÃO DE UPLOAD
// ============================================================================

describe('validarArquivoUpload', () => {
  // --------------------------------------------------------------------------
  // TIPOS VÁLIDOS
  // --------------------------------------------------------------------------

  it('aceita arquivo .xlsx válido', () => {
    const file = fakeFile({
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1 * MB,
    })
    expect(validarArquivoUpload(file)).toBeNull()
  })

  it('aceita arquivo .xls válido', () => {
    const file = fakeFile({
      type: 'application/vnd.ms-excel',
      size: 1 * MB,
    })
    expect(validarArquivoUpload(file)).toBeNull()
  })

  it('aceita arquivo .csv (text/csv)', () => {
    const file = fakeFile({ type: 'text/csv', size: 500 })
    expect(validarArquivoUpload(file)).toBeNull()
  })

  it('aceita arquivo .csv (application/csv)', () => {
    const file = fakeFile({ type: 'application/csv', size: 500 })
    expect(validarArquivoUpload(file)).toBeNull()
  })

  // --------------------------------------------------------------------------
  // TIPOS INVÁLIDOS
  // --------------------------------------------------------------------------

  it('rejeita application/pdf', () => {
    const file = fakeFile({ type: 'application/pdf', size: 1 * MB })
    const erro = validarArquivoUpload(file)
    expect(erro).not.toBeNull()
    expect(erro).toContain('não permitido')
  })

  it('rejeita image/png', () => {
    const file = fakeFile({ type: 'image/png', size: 1 * MB })
    const erro = validarArquivoUpload(file)
    expect(erro).not.toBeNull()
    expect(erro).toContain('não permitido')
  })

  it('rejeita application/zip', () => {
    const file = fakeFile({ type: 'application/zip', size: 1 * MB })
    expect(validarArquivoUpload(file)).not.toBeNull()
  })

  it('rejeita text/html', () => {
    const file = fakeFile({ type: 'text/html', size: 1 * MB })
    expect(validarArquivoUpload(file)).not.toBeNull()
  })

  // --------------------------------------------------------------------------
  // TAMANHO
  // --------------------------------------------------------------------------

  it('rejeita arquivo maior que 50MB', () => {
    const file = fakeFile({ size: 51 * MB })
    const erro = validarArquivoUpload(file)
    expect(erro).not.toBeNull()
    expect(erro).toContain('muito grande')
  })

  it('aceita arquivo no limite exato de 50MB', () => {
    const file = fakeFile({ size: 50 * MB })
    expect(validarArquivoUpload(file)).toBeNull()
  })

  it('aceita arquivo pequeno (1 byte)', () => {
    const file = fakeFile({ size: 1 })
    expect(validarArquivoUpload(file)).toBeNull()
  })

  it('rejeita com maxSize customizado', () => {
    const file = fakeFile({ size: 6 * MB })
    const erro = validarArquivoUpload(file, { maxSize: 5 * MB })
    expect(erro).not.toBeNull()
    expect(erro).toContain('muito grande')
  })

  it('aceita com maxSize customizado quando dentro do limite', () => {
    const file = fakeFile({ size: 4 * MB })
    expect(validarArquivoUpload(file, { maxSize: 5 * MB })).toBeNull()
  })

  // --------------------------------------------------------------------------
  // EDGE CASES
  // --------------------------------------------------------------------------

  it('aceita arquivo com type vazio (browser pode omitir)', () => {
    const file = fakeFile({ type: '', size: 1 * MB })
    expect(validarArquivoUpload(file)).toBeNull()
  })

  it('aceita mimes customizados', () => {
    const file = fakeFile({ type: 'application/json', size: 100 })
    // Com mimes padrão, seria rejeitado
    expect(validarArquivoUpload(file)).not.toBeNull()
    // Com mimes customizados incluindo json, passa
    expect(validarArquivoUpload(file, { mimes: ['application/json'] })).toBeNull()
  })

  it('mensagem de erro inclui o tipo recebido', () => {
    const file = fakeFile({ type: 'application/pdf', size: 1 * MB })
    const erro = validarArquivoUpload(file)
    expect(erro).toContain('application/pdf')
  })

  it('mensagem de erro de tamanho inclui MB', () => {
    const file = fakeFile({ size: 60 * MB })
    const erro = validarArquivoUpload(file)
    expect(erro).toContain('MB')
    expect(erro).toContain('50')
  })
})
