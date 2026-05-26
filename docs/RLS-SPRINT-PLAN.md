# Sprint RLS — Habilitação de Row Level Security

> Status: **DOC DE PLANEJAMENTO** — nenhuma policy aplicada ainda.
> Auditoria E2E (2026-05-26) identificou 54 tabelas com RLS desabilitado.
> Habilitar sem policies trava o app. Este doc descreve o caminho seguro.

## 1. Contexto

Em 2026-05-25 (Pt.2), as fases SEMED novas habilitaram RLS em 59 tabelas.
As tabelas **legacy do Gestor Escolar** (criadas em Jan/Mar 2026) ficaram
sem RLS. Como a `anon key` do Supabase chega no frontend, qualquer usuário
com essa chave pode ler/modificar qualquer linha das 54 tabelas diretamente
via Supabase client, **bypassando os endpoints `/api/admin/*` que validam
autenticação JWT**.

## 2. Impacto real

- Toda a tabela `alunos` (dados pessoais de menores) está exposta
- `notas_escolares`, `frequencia_*`, `conselho_classe` — todo o histórico
  escolar acessível
- `embeddings_faciais` — embeddings biométricos (LGPD art. 11)
- `logs_auditoria` — qualquer um pode ler O QUE outros usuários fizeram
- `professor_turmas` — alterável por anônimo

## 3. Por que não habilitar agora (sem policies)

Habilitar RLS sem criar policies primeiro **trava 100% das leituras e
escritas** das tabelas afetadas. Como vários componentes do sistema usam
a tabela em queries normais (`pool.query` autenticadas via service_role),
**alguns continuariam funcionando** (service_role bypassa RLS), mas:

- Páginas que usam Supabase client direto (raramente, mas existem) quebrariam
- Funções edge / triggers que assumem leitura aberta quebrariam
- Smoke tests via MCP retornariam zero linhas

## 4. Plano em 3 fases

### Fase 1 — Inventário (1-2h)
- [ ] `grep -rn "supabase.from\|createClient" app/ components/` — identificar onde Supabase client é usado direto (vs ir pela API)
- [ ] Para cada tabela das 54, identificar:
  - Quem PRECISA ler? (admin / tecnico / escola / polo / professor / responsavel / anon-público?)
  - Quem PRECISA escrever?
  - Há filtro por escola_id / polo_id / professor_id / usuario_id?

### Fase 2 — Policies por tabela (4-8h)
Criar arquivo `database/migrations/add-rls-tabelas-gestor.sql` com policies
seguindo o padrão de `add-rls-tabelas-semed.sql` (já existe e funciona).

**Padrão recomendado** (já validado em Pt.2):

```sql
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;

-- Service role (nossa API) bypassa RLS automaticamente.
-- Estas policies são para acesso direto via supabase-js (raramente usado).

CREATE POLICY "alunos_admin_full" ON alunos
  FOR ALL TO authenticated
  USING (auth.jwt()->>'tipo_usuario' IN ('administrador', 'tecnico'));

CREATE POLICY "alunos_escola_propria" ON alunos
  FOR SELECT TO authenticated
  USING (
    auth.jwt()->>'tipo_usuario' = 'escola'
    AND escola_id::text = auth.jwt()->>'escola_id'
  );

CREATE POLICY "alunos_polo_proprio" ON alunos
  FOR SELECT TO authenticated
  USING (
    auth.jwt()->>'tipo_usuario' = 'polo'
    AND escola_id IN (
      SELECT id FROM escolas WHERE polo_id::text = auth.jwt()->>'polo_id'
    )
  );

-- Responsavel ve filhos via tabela-ponte
CREATE POLICY "alunos_responsavel_filho" ON alunos
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT aluno_id FROM responsaveis_alunos
       WHERE usuario_id::text = auth.jwt()->>'sub' AND ativo = true
    )
  );

-- Professor ve alunos das suas turmas no ano letivo atual
CREATE POLICY "alunos_professor_turma" ON alunos
  FOR SELECT TO authenticated
  USING (
    turma_id IN (
      SELECT turma_id FROM professor_turmas
       WHERE professor_id::text = auth.jwt()->>'sub'
         AND ativo = true
         AND ano_letivo = (SELECT ano_letivo FROM turmas WHERE id = alunos.turma_id)
    )
  );
```

### Fase 3 — Aplicação gradual + monitoramento (2-4h)
1. Aplicar policies em **1 tabela de baixo risco** primeiro (ex: `notificacoes`)
2. Monitorar erros 24h via Sentry / logs
3. Em ondas:
   - Onda A (baixo impacto): `notificacoes`, `eventos`, `comunicados_turma`
   - Onda B (médio): `historico_situacao`, `divergencias_historico`, `logs_acesso`
   - Onda C (alto): `alunos`, `turmas`, `notas_escolares`, `frequencia_*`
   - Onda D (crítico): `embeddings_faciais`, `logs_auditoria`, `usuarios`

## 5. Tabelas categorizadas (priorização)

### Tier 1 — Dados pessoais de menores (URGENTE)
- `alunos`, `historico_situacao`, `pre_matriculas`
- `embeddings_faciais`, `consentimentos_faciais` (LGPD art. 11)

### Tier 2 — Gestão pedagógica
- `notas_escolares`, `frequencia_bimestral`, `frequencia_diaria`, `frequencia_hora_aula`
- `conselho_classe`, `conselho_classe_alunos`
- `professor_turmas`, `turmas`, `horarios_aula`, `diario_classe`
- `planos_aula`, `comunicados_turma`

### Tier 3 — Cadastros base
- `escolas`, `polos`, `usuarios`, `disciplinas_escolares`
- `series_escolares`, `series_disciplinas`, `series_escola`
- `periodos_letivos`, `anos_letivos`

### Tier 4 — SISAM (avaliações)
- `avaliacoes`, `questoes`, `tipos_avaliacao`, `regras_avaliacao`
- `resultados_provas`, `resultados_consolidados`
- `niveis_aprendizagem`, `sisam_series_participantes`

### Tier 5 — Operacional
- `logs_auditoria` (CRÍTICO: hoje qualquer um lê audit log alheio)
- `logs_acesso`, `notificacoes`, `notificacoes_disparos` (já tem RLS)
- `importacoes`, `divergencias_historico`
- `dispositivos_faciais`, `logs_dispositivos`

### Tier 6 — Configuração
- `personalizacao`, `modulos_tecnico`, `configuracao_series`,
  `configuracao_series_disciplinas`, `configuracao_notas_escola`
- `site_config`, `metas_escola`, `escola_regras_avaliacao`
- `tipos_avaliacao`, `configuracoes_sistema`

### Tier 7 — Site público + outros
- `publicacoes`, `ouvidoria`, `eventos`, `fila_espera`

## 6. SQL de ENABLE (pronto para Sprint Fase 3)

O comando completo está em [Supabase advisory `rls_disabled`]:
```sql
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
-- ... (54 ALTER TABLEs)
```

**NÃO EXECUTAR antes de criar policies para cada tabela.**

## 7. Validação E2E pós-RLS

Após cada onda:
- [ ] Login como admin → consegue listar alunos ✓
- [ ] Login como escola → consegue listar SÓ seus alunos ✓
- [ ] Login como polo → consegue listar alunos do seu polo ✓
- [ ] Login como professor → consegue listar SÓ suas turmas ✓
- [ ] Login como responsavel → consegue listar SÓ seu filho ✓
- [ ] Login como tipo errado → 0 linhas (não erro 500) ✓
- [ ] Anon (sem JWT) → 0 linhas ✓

## 8. Riscos conhecidos

- **Performance**: policies com `IN (SELECT...)` podem ser lentas. Considerar
  cache em Redis ou indexes específicos.
- **Recursividade**: policy de `alunos` referenciando `responsaveis_alunos`
  precisa que `responsaveis_alunos` também tenha policy (loop infinito se
  mal configurado).
- **JWT claims**: as policies assumem que `auth.jwt()` retorna campos
  customizados (`tipo_usuario`, `escola_id`). Verificar se o login atual
  do SISAM (cookie httpOnly com JWT próprio) compatibiliza com isto.

## 9. Decisão arquitetural pendente

**O SISAM hoje NÃO usa Supabase Auth.** Tem JWT próprio em cookie httpOnly,
validado pelo `lib/auth/with-auth.ts`. As policies acima assumem
`auth.jwt()` do Supabase — pode ser que o `pool.query` (que vai pela
service_role) bypasse RLS sempre, tornando as policies inúteis na prática.

**Antes de iniciar a Fase 2**, validar:
1. Onde no projeto se usa `supabase-js` direto? (provavelmente em poucos
   lugares ou nenhum)
2. Se for nenhum: a vulnerabilidade real é o nível da `anon key` (que
   permite criar um Supabase client direto SEM passar pela nossa API)
3. Mitigação alternativa: regenerar `anon key` e nunca expor; usar apenas
   `service_role` no backend e nenhum no frontend.

## 10. Próxima sessão

- [ ] Decidir item #9 (Supabase Auth vs JWT próprio)
- [ ] Se ficar JWT próprio: validar que `anon key` não vai pro browser
  (alternativa MAIS BARATA que migrar para Supabase Auth)
- [ ] Caso contrário: 1-2 dias de sprint dedicado para policies

Veja também: `database/migrations/add-rls-tabelas-semed.sql` (padrão validado).
