import { describe, it, expect } from 'vitest'
import {
  maskCpf,
  maskCnpj,
  maskEmail,
  maskTelefone,
  maskPis,
  maskRg,
  maskNome,
  maskToken,
  maskDataNascimento,
  maskEndereco,
  maskIp,
  sanitizePii,
  sanitizePiiString,
} from '@/lib/utils/mask-pii'

describe('mask-pii — funções individuais', () => {
  describe('maskCpf', () => {
    it('mascara CPF com pontuação', () => {
      expect(maskCpf('123.456.789-00')).toBe('***.***.789-**')
    })
    it('mascara CPF sem pontuação', () => {
      expect(maskCpf('12345678900')).toBe('***.***.789-**')
    })
    it('retorna *** para tamanho inválido', () => {
      expect(maskCpf('123')).toBe('***')
    })
    it('aceita null/undefined', () => {
      expect(maskCpf(null)).toBe('')
      expect(maskCpf(undefined)).toBe('')
    })
  })

  describe('maskCnpj', () => {
    it('mascara CNPJ com pontuação', () => {
      expect(maskCnpj('12.345.678/0001-90')).toBe('**.***.***/****-90')
    })
    it('mascara CNPJ sem pontuação', () => {
      expect(maskCnpj('12345678000190')).toBe('**.***.***/****-90')
    })
  })

  describe('maskEmail', () => {
    it('mascara email comum', () => {
      expect(maskEmail('joao@gmail.com')).toBe('j***@gmail.com')
    })
    it('mascara email com letra única', () => {
      expect(maskEmail('a@b.com')).toBe('a***@b.com')
    })
    it('retorna *** se inválido', () => {
      expect(maskEmail('semarroba')).toBe('***')
    })
  })

  describe('maskTelefone', () => {
    it('mascara celular com DDD', () => {
      expect(maskTelefone('(91) 99876-5432')).toBe('(91) ****-5432')
    })
    it('mascara fixo com DDD', () => {
      expect(maskTelefone('9132121234')).toBe('(91) ****-1234')
    })
    it('mascara sem DDD', () => {
      expect(maskTelefone('99876543')).toBe('****-6543')
    })
  })

  describe('maskPis', () => {
    it('mascara PIS', () => {
      expect(maskPis('12345678901')).toBe('***.****.***-01')
    })
  })

  describe('maskRg', () => {
    it('mascara RG mantendo últimos 2', () => {
      expect(maskRg('1234567')).toBe('*****67')
    })
  })

  describe('maskNome', () => {
    it('mascara mantendo primeiro nome', () => {
      expect(maskNome('João Silva')).toBe('João S***')
    })
    it('com nome composto, mantém primeiro e inicial do segundo', () => {
      expect(maskNome('Maria das Dores Silva')).toBe('Maria d***')
    })
    it('retorna nome simples se só tem um', () => {
      expect(maskNome('Madonna')).toBe('Madonna')
    })
  })

  describe('maskToken', () => {
    it('mascara token longo', () => {
      expect(maskToken('abcdefghijklmnop')).toBe('abcd…mnop')
    })
    it('retorna *** se muito curto', () => {
      expect(maskToken('abc')).toBe('***')
    })
  })

  describe('maskDataNascimento', () => {
    it('mantém apenas o ano', () => {
      expect(maskDataNascimento('1990-05-15')).toBe('****-**-1990')
    })
    it('aceita Date', () => {
      expect(maskDataNascimento(new Date('1985-12-01'))).toBe('****-**-1985')
    })
  })

  describe('maskEndereco', () => {
    it('extrai cidade/UF', () => {
      expect(maskEndereco('Rua das Flores, 123 - Belém/PA')).toBe('*** — Belém/PA')
    })
    it('retorna *** se não conseguir extrair', () => {
      expect(maskEndereco('endereço genérico')).toBe('***')
    })
  })

  describe('maskIp', () => {
    it('mascara IPv4 mantendo /24', () => {
      expect(maskIp('192.168.1.100')).toBe('192.168.1.***')
    })
    it('mascara IPv6', () => {
      expect(maskIp('2001:db8:1234:5678::1')).toBe('2001:db8:****')
    })
  })
})

describe('sanitizePii — recursivo em objetos', () => {
  it('mascara campos PII por nome', () => {
    const input = {
      nome_aluno: 'João Silva',
      cpf: '12345678900',
      email: 'joao@gmail.com',
      telefone: '91998765432',
      idade: 30,
      cidade: 'Belém',
    }
    const out = sanitizePii(input) as Record<string, unknown>
    expect(out.nome_aluno).toBe('João S***')
    expect(out.cpf).toBe('***.***.789-**')
    expect(out.email).toBe('j***@gmail.com')
    expect(out.telefone).toBe('(91) ****-5432')
    expect(out.idade).toBe(30)
    expect(out.cidade).toBe('Belém')
  })

  it('mascara recursivamente em objetos aninhados', () => {
    const input = {
      aluno: {
        nome_aluno: 'João',
        cpf: '12345678900',
        responsavel: {
          email: 'pai@x.com',
          telefone: '91988887777',
        },
      },
    }
    const out = sanitizePii(input) as any
    expect(out.aluno.cpf).toBe('***.***.789-**')
    expect(out.aluno.responsavel.email).toBe('p***@x.com')
  })

  it('mascara dentro de arrays', () => {
    const input = {
      alunos: [
        { nome_aluno: 'João', cpf: '11111111111' },
        { nome_aluno: 'Maria', cpf: '22222222222' },
      ],
    }
    const out = sanitizePii(input) as any
    expect(out.alunos[0].cpf).toBe('***.***.111-**')
    expect(out.alunos[1].cpf).toBe('***.***.222-**')
  })

  it('mascara senha e token', () => {
    const input = { password: 'super-secret-123', api_key: 'sk_live_abc123xyz' }
    const out = sanitizePii(input) as any
    expect(out.password).not.toBe('super-secret-123')
    expect(out.password).toContain('…')
    expect(out.api_key).toContain('…')
  })

  it('preserva null e tipos não-PII', () => {
    const input = { id: 1, ativo: true, valor: null, lista: [1, 2, 3] }
    const out = sanitizePii(input) as any
    expect(out.id).toBe(1)
    expect(out.ativo).toBe(true)
    expect(out.valor).toBe(null)
    expect(out.lista).toEqual([1, 2, 3])
  })

  it('respeita profundidade máxima sem stack overflow', () => {
    let deep: any = { val: 1 }
    for (let i = 0; i < 20; i++) deep = { nested: deep }
    expect(() => sanitizePii(deep)).not.toThrow()
  })
})

describe('sanitizePiiString — texto livre', () => {
  it('mascara CPF em texto', () => {
    const out = sanitizePiiString('Aluno CPF 123.456.789-00 inscrito')
    expect(out).toContain('***.***.789-**')
    expect(out).not.toContain('123.456.789-00')
  })

  it('mascara email em texto', () => {
    const out = sanitizePiiString('Contato: joao@escola.gov.br')
    expect(out).toContain('j***@escola.gov.br')
  })

  it('preserva texto sem PII', () => {
    expect(sanitizePiiString('Apenas texto normal')).toBe('Apenas texto normal')
  })

  it('aceita string vazia', () => {
    expect(sanitizePiiString('')).toBe('')
  })
})
