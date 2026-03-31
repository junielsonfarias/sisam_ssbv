# CLAUDE.md — Regras do Projeto SISAM

## Idioma
- Sempre responder em **portugues do Brasil**

## Registro de Horas (OBRIGATORIO)
- Ao final de cada sessao de trabalho, **SEMPRE** atualizar o arquivo `docs/HORAS-DESENVOLVIMENTO.md`:
  1. Adicionar a nova sessao na tabela do mes correspondente (data, horario, horas, commits, descricao)
  2. Atualizar o subtotal do mes
  3. Atualizar a tabela "Horas por Mes" no topo
  4. Atualizar o "Resumo Geral" (total de horas, dias, commits, linhas de codigo, arquivos, endpoints, testes)
  5. Adicionar marco na tabela "Evolucao Acumulada" se houve entrega significativa
  6. Para calcular horas: usar timestamps do primeiro e ultimo commit do dia + 1h de buffer, minimo 1.5h
  7. Contar linhas com: `find app components lib database -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l | tail -1`
  8. Contar commits com: `git log --oneline | wc -l`
  9. Contar testes com: `npx vitest run 2>&1 | grep "Tests"`

## Padrao de Commits
- Mensagens em portugues
- Prefixos: feat, fix, refactor, ui, docs, test, chore
- Sempre incluir Co-Authored-By do Claude

## Estilo de Codigo
- Inputs grandes, containers largos, sem max-w restritivo em formularios
- Cores institucionais: blue (nao emerald) para paginas publicas
- Tailwind CSS para estilos, sem CSS customizado
- Zod para validacao de todas as APIs

## CI/CD
- GitHub Actions deve estar verde antes de considerar deploy pronto
- Node.js 20 no CI (Vitest 4.x requer Node 20.12+)
- Testes devem passar localmente antes de push

## Arquitetura
- Next.js 14 App Router
- PostgreSQL via Supabase (porta 6543 Transaction Mode)
- Redis Upstash para cache
- JWT em cookie httpOnly
- 184 endpoints REST em app/api/
- 7 tipos de usuario: administrador, tecnico, polo, escola, professor, editor, publicador
