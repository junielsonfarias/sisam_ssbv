# Dívida Técnica — ALTOS da Auditoria E2E do Gestor (não resolvidos)

> Data da auditoria: 2026-05-26
> Documento criado: 2026-05-26 após a sessão Pt.5
> Status: **3 itens ALTOS exigem sprint dedicada** — não foram corrigidos na
> sessão de auditoria por terem escopo significativo. Os outros 8 ALTOS já
> foram resolvidos em commits desta sessão.

## #10 — Sincronização frequência 100% manual

**Problema:** professor lança em `frequencia_diaria` (anos iniciais) ou
`frequencia_hora_aula` (anos finais), mas só vai pra `frequencia_bimestral`
quando admin clica "Agregar". Sem trigger nem cron. Janela de cegueira de
dias/semanas entre lançamento e visibilidade no boletim/FICAI/dashboard.

**Solução proposta:**

### Opção A — Trigger PG (atualização incremental)
```sql
CREATE FUNCTION atualizar_frequencia_bimestral_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Identifica o periodo letivo pela data
  -- Faz UPSERT em frequencia_bimestral com totais agregados
  -- Preserva metodo='manual' (não sobrescreve)
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_freq_diaria_sync
  AFTER INSERT OR UPDATE OR DELETE ON frequencia_diaria
  FOR EACH ROW EXECUTE FUNCTION atualizar_frequencia_bimestral_trigger();
```

**Pros**: tempo real, sem janela de cegueira.
**Contras**: overhead em cada INSERT, debug difícil, lock contention.

### Opção B — Cron diário (mais simples)
- Cron job (Vercel Cron / Supabase Edge Function) que roda diariamente às 23h
- Chama `/api/admin/frequencia-diaria/agregar` e `/agregar-hora-aula` para
  todas as turmas com lançamentos no dia
- Janela de cegueira: máximo 24h

**Pros**: simples, debugavel, controlável.
**Contras**: cegueira de 24h.

**Recomendação**: começar com **Opção B**. Migrar para A se a necessidade
de tempo real surgir.

**Estimativa**: 4-6h (Opção B) / 1-2 dias (Opção A).

---

## #14 — Série inconsistente (texto livre acumulando lixo)

**Problema:** 30+ queries usam `COALESCE(serie_numero, REGEXP_REPLACE(serie, '[^0-9]', '', 'g'))` como fallback. Base poluída com `'1º Ano'`, `'1 ano'`, `'1ANO'`, `'PRE1'`, `'Pré I'`, `'EJA1'`. `notas-escolares/route.ts:118-128` tem 8 padrões `ILIKE` diferentes — prova do caos.

**Solução proposta** (em 4 fases):

### Fase 1 — Inventário (1h)
- [ ] Listar TODOS os valores distintos atualmente em `alunos.serie`
  ```sql
  SELECT DISTINCT serie, COUNT(*) FROM alunos GROUP BY serie ORDER BY 2 DESC;
  ```
- [ ] Idem para `turmas.serie`, `notas_escolares.serie` (se existir)
- [ ] Idem para `pre_matriculas.serie_pretendida`

### Fase 2 — Mapping (2h)
- [ ] Criar função SQL `normalizar_serie(text)` que aplica:
  - Lowercase + trim + remove acentos
  - Mapeia variações conhecidas → código curto canônico:
    - `'creche', 'cre', 'maternal'` → `'CRE'`
    - `'pre 1', 'pre i', 'pre1'` → `'PRE1'`
    - `'1o ano', '1 ano', '1ano', '1'` → `'1'`
    - etc.

### Fase 3 — Backfill + ENUM (1-2 dias)
```sql
-- Adicionar coluna nova
ALTER TABLE alunos ADD COLUMN serie_normalizada VARCHAR(10);
UPDATE alunos SET serie_normalizada = normalizar_serie(serie);

-- Verificar entradas que não mapearam
SELECT serie FROM alunos WHERE serie_normalizada IS NULL;

-- Após corrigir manualmente os outliers, ENUM:
CREATE TYPE serie_enum AS ENUM (
  'CRE','PRE1','PRE2','1','2','3','4','5','6','7','8','9',
  'EJA1','EJA2','EJA3','EJA4'
);

-- Trocar coluna por enum
ALTER TABLE alunos
  ALTER COLUMN serie TYPE serie_enum
  USING serie_normalizada::serie_enum;
```

### Fase 4 — Limpeza de código (4-8h)
- Remover todos os `COALESCE(serie_numero, REGEXP_REPLACE...)` — usar `serie` direto
- Remover `serie_numero` quando todos os consumidores foram atualizados
- Atualizar todos os schemas Zod para `z.enum([...])`

**Estimativa total**: 3-4 dias.

**Risco**: alto — mudanças em 30+ queries. Exige cobertura de testes E2E
antes de mexer.

---

## #18 — `pre_matriculas.serie_pretendida` sem normalização no site público

**Problema:** o site público (`/matricula`) aceita texto livre na série. Quando
aprovado, vira `alunos.serie` direto — alimenta o caos do #14.

**Solução proposta:**

### Curto prazo (2h)
- [ ] No formulário público (`app/matricula/page.tsx` ou similar), trocar
  `<input type="text" name="serie">` por `<select>` com opções fixas
- [ ] Mesma lista de séries válidas usada no Gestor (mapa `SERIE_ORDEM`)
- [ ] Validação Zod no endpoint que recebe a pré-matrícula

### Médio prazo (após #14)
- Quando `serie_enum` existir, validar `serie_pretendida` contra esse enum

**Estimativa**: 2h imediato. Mais 1h após #14.

---

## ALTOS já resolvidos nesta sessão

| # | Bug | Commit |
|---|---|---|
| 3 | data_matricula nunca setado | `1a96678` (parte do FIX #4) |
| 4 | Race condition matricula batch | (este commit) |
| 5 | verificarAnoLetivoAtivo bypassed | (este commit) |
| 9 | Anos finais não populam bimestral | (este commit) |
| 11 | Frequência manual sobrescrita | (este commit) |
| 15 | frequencia_diaria.escola_id stale | (este commit) — COMMENT |
| 16 | Exclusão de escola check incompleto | (este commit) |
| 17 | PUT alunos aceita escola_id | (este commit) |

---

## Roadmap sugerido pós-Pt.5

1. **Semana 1**: Corrigir #18 (1h) + criar cron diário #10-Opção B (4h)
2. **Semana 2-3**: Sprint dedicada para #14 (3-4 dias) — quando o time tiver
   tempo dedicado e disposto a fazer migration de risco médio-alto
3. **Backlog futuro**: migrar #10 de cron para trigger se virar gargalo

Total estimado: ~5-7 dias de trabalho para zerar a auditoria E2E.
