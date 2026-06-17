import { describe, it, expect } from 'vitest'
import { gerarSenhaForte } from '@/lib/utils/gerar-senha'
import { avaliarSenha } from '@/lib/utils/senha-forca'

describe('gerarSenhaForte', () => {
  it('gera senhas que SEMPRE passam na política de força (300 amostras)', () => {
    for (let i = 0; i < 300; i++) {
      const senha = gerarSenhaForte()
      const avaliacao = avaliarSenha(senha)
      expect(avaliacao.valida, `senha inválida gerada: "${senha}" -> ${avaliacao.problemas.join('; ')}`).toBe(true)
    }
  })

  it('respeita o tamanho solicitado', () => {
    expect(gerarSenhaForte(16)).toHaveLength(16)
    expect(gerarSenhaForte(20)).toHaveLength(20)
    expect(gerarSenhaForte(24)).toHaveLength(24)
  })

  it('aplica mínimo de 12 caracteres mesmo se pedirem menos', () => {
    expect(gerarSenhaForte(4).length).toBeGreaterThanOrEqual(12)
    expect(gerarSenhaForte(8).length).toBeGreaterThanOrEqual(12)
  })

  it('contém ao menos uma de cada classe (maiúscula, minúscula, número, símbolo)', () => {
    for (let i = 0; i < 50; i++) {
      const senha = gerarSenhaForte()
      expect(/[A-Z]/.test(senha), `sem maiúscula: ${senha}`).toBe(true)
      expect(/[a-z]/.test(senha), `sem minúscula: ${senha}`).toBe(true)
      expect(/[0-9]/.test(senha), `sem número: ${senha}`).toBe(true)
      expect(/[^A-Za-z0-9]/.test(senha), `sem símbolo: ${senha}`).toBe(true)
    }
  })

  it('não usa caracteres ambíguos (0 O 1 l I)', () => {
    for (let i = 0; i < 50; i++) {
      const senha = gerarSenhaForte()
      expect(/[0O1lI]/.test(senha), `caractere ambíguo em: ${senha}`).toBe(false)
    }
  })

  it('produz valores diferentes a cada chamada (aleatoriedade)', () => {
    const amostras = new Set<string>()
    for (let i = 0; i < 100; i++) amostras.add(gerarSenhaForte())
    // Colisão entre 100 senhas de 16 chars é praticamente impossível.
    expect(amostras.size).toBe(100)
  })
})
