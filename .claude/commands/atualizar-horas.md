Atualize o registro de horas de desenvolvimento em `docs/HORAS-DESENVOLVIMENTO.md`.

Passos:

1. Obter data e hora atual do primeiro e ultimo commit de hoje:
   ```
   git log --format="%ai" --since="today" | sort | head -1
   git log --format="%ai" --since="today" | sort | tail -1
   ```

2. Contar commits de hoje:
   ```
   git log --oneline --since="today" | wc -l
   ```

3. Calcular horas: diferenca entre primeiro e ultimo commit + 1h buffer (minimo 1.5h)

4. Obter metricas atuais:
   - Linhas: `find app components lib database -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l | tail -1`
   - Commits total: `git log --oneline | wc -l`
   - Testes: `npx vitest run 2>&1 | grep "Tests"`
   - Endpoints: `find app/api -name "route.ts" | wc -l`
   - Arquivos: `find app components lib database -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l`

5. Atualizar `docs/HORAS-DESENVOLVIMENTO.md`:
   - Adicionar linha na tabela do mes atual
   - Atualizar subtotal do mes
   - Atualizar "Horas por Mes" no topo
   - Atualizar "Resumo Geral" com metricas atuais
   - Se houve entrega significativa, adicionar marco em "Evolucao Acumulada"

6. Resumir: "Sessao de hoje: Xh, Y commits. Total acumulado: Zh em N dias."
