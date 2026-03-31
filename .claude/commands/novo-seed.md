Crie dados de seed (populacao inicial) para o banco de dados.

Entrada: $ARGUMENTS (tipo: "supabase" ou "prisma" e dados desejados)
Exemplo: "supabase admin+escolas+turmas" ou "prisma admin+categorias"

## Para Supabase (SQL raw)

### Criar `scripts/seed.js`
```javascript
require('dotenv').config()
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

async function seed() {
  console.log('Iniciando seed...')

  // 1. Criar usuario admin
  const senhaHash = await bcrypt.hash('Admin@2026!', 12)
  await pool.query(`
    INSERT INTO usuarios (nome, email, senha, tipo_usuario)
    VALUES ('Administrador', 'admin@sistema.com', $1, 'administrador')
    ON CONFLICT (email) DO NOTHING
  `, [senhaHash])
  console.log('Admin criado: admin@sistema.com')

  // 2. Criar polos
  const polos = ['POLO CENTRO', 'POLO NORTE', 'POLO SUL']
  for (const nome of polos) {
    await pool.query(`
      INSERT INTO polos (nome, codigo) VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [nome, nome.replace(/\s+/g, '_')])
  }
  console.log(`${polos.length} polos criados`)

  // 3. Criar escolas
  // ...

  console.log('Seed concluido!')
  await pool.end()
}

seed().catch(err => { console.error('Erro no seed:', err); process.exit(1) })
```

### package.json
```json
"seed": "node scripts/seed.js"
```

## Para Prisma

### Criar `prisma/seed.ts`
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // 1. Admin
  const senhaHash = await bcrypt.hash('Admin@2026!', 12)
  await prisma.usuario.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@sistema.com',
      senha: senhaHash,
      tipoUsuario: 'administrador',
    },
  })

  // 2. Polos
  const polos = ['POLO CENTRO', 'POLO NORTE', 'POLO SUL']
  for (const nome of polos) {
    await prisma.polo.upsert({
      where: { nome },
      update: {},
      create: { nome, codigo: nome.replace(/\s+/g, '_') },
    })
  }

  console.log('Seed concluido!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
```

### package.json
```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```

## Dados padrao recomendados
1. **Usuario admin** — email e senha conhecidos para primeiro acesso
2. **Polos/Regioes** — categorias base
3. **Escolas** — pelo menos 3 para testes
4. **Series/Turmas** — estrutura escolar basica
5. **Disciplinas** — LP, MAT, CH, CN, Prod. Textual
6. **Periodos** — 1o ao 4o Bimestre

## Seguranca
- Senha do admin deve ser forte (12+ chars)
- NUNCA commitar senhas reais no seed
- Usar ON CONFLICT / upsert para idempotencia
- Seed deve ser re-executavel sem duplicar dados
