Execute uma verificacao completa do projeto SISAM para garantir que tudo esta funcionando.

Execute os seguintes passos em sequencia:

1. **TypeScript** — Verificar tipos:
   ```
   npx tsc --noEmit
   ```
   Deve retornar 0 erros.

2. **Testes** — Rodar suite completa:
   ```
   npx vitest run
   ```
   Todos os testes devem passar. Reportar total de testes e arquivos.

3. **Lint** — Verificar lint (informativo):
   ```
   npx next lint --quiet
   ```

4. **any Count** — Contar `any` restantes em lib/:
   ```
   grep -r ": any" lib/ --include="*.ts" | wc -l
   ```

5. **Metricas do Projeto**:
   - Linhas de codigo: `find app components lib database -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l | tail -1`
   - Arquivos TS: `find app components lib database -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l`
   - Endpoints: `find app/api -name "route.ts" | wc -l`
   - Commits: `git log --oneline | wc -l`

6. **Git Status** — Verificar se ha mudancas nao commitadas:
   ```
   git status
   ```

Apresentar resultado em formato de tabela com status (OK/FALHA) para cada item.
Se houver falhas, sugerir correcoes.
