import { describe, it, expect } from 'vitest'
import { abreviarNome } from '@/app/admin/gestor/turmas/[turmaId]/diario/components/formatters'

describe('abreviarNome', () => {
  describe('prioridade: nome completo quando <= 4 nomes proprios', () => {
    it('1 nome retorna intacto', () => {
      expect(abreviarNome('MARIA')).toBe('MARIA')
    })

    it('2 nomes retorna intacto', () => {
      expect(abreviarNome('JOAO SILVA')).toBe('JOAO SILVA')
    })

    it('3 nomes retorna intacto', () => {
      expect(abreviarNome('ADRINEY RAMOS FREITAS')).toBe('ADRINEY RAMOS FREITAS')
    })

    it('4 nomes (com preposicao) retorna intacto', () => {
      expect(abreviarNome('ANA BEATRIZ PINHEIRO DE SOUZA')).toBe('ANA BEATRIZ PINHEIRO DE SOUZA')
    })

    it('nome com 4 partes e duas preposicoes ainda retorna intacto', () => {
      // "EDUARDA KAROLINE SOUZA DE SOUZA" tem 5 partes mas 4 nomes proprios
      expect(abreviarNome('EDUARDA KAROLINE SOUZA DE SOUZA')).toBe('EDUARDA KAROLINE SOUZA DE SOUZA')
    })

    it('JAILTON WILLIAN DE SOUZA TEIXEIRA (4 nomes proprios) retorna intacto', () => {
      expect(abreviarNome('JAILTON WILLIAN DE SOUZA TEIXEIRA')).toBe('JAILTON WILLIAN DE SOUZA TEIXEIRA')
    })
  })

  describe('abreviacao: apenas quando > 4 nomes proprios', () => {
    it('5 nomes proprios abrevia do meio', () => {
      expect(abreviarNome('MARIA DAS GRACAS FERREIRA DA SILVA SANTOS'))
        .toBe('MARIA G. F. S. SANTOS')
    })

    it('6 nomes proprios abrevia do meio', () => {
      expect(abreviarNome('JOSE PEDRO HENRIQUE MARQUES ALMEIDA SOUZA'))
        .toBe('JOSE P. H. M. A. SOUZA')
    })

    it('preposicoes do meio sao removidas', () => {
      // 5 nomes proprios: ANA, MARIA, DA, SILVA -> ANA MARIA + (sem DA) + SILVA, mas precisa 5+
      // Vamos usar exemplo claro: PEDRO PAULO DA SILVA DE OLIVEIRA SANTOS NEVES
      // proprios: PEDRO PAULO SILVA OLIVEIRA SANTOS NEVES = 6
      expect(abreviarNome('PEDRO PAULO DA SILVA DE OLIVEIRA SANTOS NEVES'))
        .toBe('PEDRO P. S. O. S. NEVES')
    })
  })

  describe('casos extremos', () => {
    it('string vazia retorna string vazia', () => {
      expect(abreviarNome('')).toBe('')
    })

    it('string com espacos retorna string vazia', () => {
      expect(abreviarNome('   ')).toBe('')
    })

    it('nome com espacos extras e normalizado (trim + colapsa internos)', () => {
      expect(abreviarNome('  JOAO   SILVA  ')).toBe('JOAO SILVA')
    })

    it('cobertura de maxGuard: nome muito longo apos abreviar ainda trunca com ellipsis', () => {
      // 6 nomes proprios, alguns muito longos, maxGuard pequeno (15 chars)
      const longo = 'BENEDITOTERCEIRO ANTONIOABILIO PEDROHENRIQUE MARCOSAURELIO LUIZFILIPE SANTOSDOSREIS'
      const r = abreviarNome(longo, 15)
      expect(r.length).toBeLessThanOrEqual(15)
      expect(r).toMatch(/…$/)
    })

    it('preserva acentuacao', () => {
      expect(abreviarNome('JOÃO PAULO DA SILVA')).toBe('JOÃO PAULO DA SILVA')
    })
  })
})
