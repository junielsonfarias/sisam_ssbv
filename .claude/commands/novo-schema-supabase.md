Crie um schema SQL completo para Supabase PostgreSQL no padrao SISAM.

Entrada: $ARGUMENTS (tabela e campos)
Exemplo: "eventos titulo:varchar(255),descricao:text?,tipo:enum(reuniao,formatura,geral),data_inicio:timestamp,publico:boolean,escola_id:fk(escolas)"

## Padrao de tabela
```sql
-- =====================================================
-- SISAM - Migration: [Descricao]
-- Data: [data atual]
-- =====================================================

-- 1. TABELA PRINCIPAL
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL DEFAULT 'geral'
    CHECK (tipo IN ('reuniao', 'formatura', 'jogos', 'capacitacao', 'geral')),
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP,
  local VARCHAR(255),
  publico BOOLEAN DEFAULT true,
  escola_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. INDICES
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_escola ON eventos(escola_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_eventos_publico ON eventos(publico, ativo) WHERE ativo = true;

-- 3. TRIGGER para atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_eventos_atualizado_em
  BEFORE UPDATE ON eventos
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();
```

## Convencoes
- IDs: UUID com `gen_random_uuid()` (nativo PG 13+)
- Foreign keys: `ON DELETE CASCADE` para dependencias fortes, `SET NULL` para opcionais
- Soft delete: campo `ativo BOOLEAN DEFAULT true` (nunca DELETE fisico)
- Timestamps: `criado_em`, `atualizado_em` com CURRENT_TIMESTAMP
- Indices: campos de busca, foreign keys, campos de filtro
- Indices parciais: `WHERE ativo = true` para excluir deletados
- Enums: CHECK constraint com IN (nao tipo ENUM do PG — mais flexivel)
- Nomes: snake_case, tabelas no plural

## Tipos comuns
| Campo | Tipo SQL | Observacao |
|-------|----------|-----------|
| id | UUID PRIMARY KEY | gen_random_uuid() |
| nome | VARCHAR(255) NOT NULL | |
| email | VARCHAR(254) UNIQUE | |
| senha | VARCHAR(255) | bcrypt hash |
| descricao | TEXT | ilimitado |
| valor | NUMERIC(10,2) | moeda |
| nota | NUMERIC(4,2) | 0.00 a 10.00 |
| data | DATE | sem hora |
| hora | TIME | sem data |
| data_hora | TIMESTAMP | com hora |
| config | JSONB | dados flexiveis |
| ativo | BOOLEAN DEFAULT true | soft delete |
| ordem | INTEGER DEFAULT 0 | ordenacao |

## Relacoes
```sql
-- 1:N (escola tem muitos alunos)
escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE

-- N:M (via tabela intermediaria)
CREATE TABLE IF NOT EXISTS turma_disciplinas (
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
  PRIMARY KEY (turma_id, disciplina_id)
);
```
