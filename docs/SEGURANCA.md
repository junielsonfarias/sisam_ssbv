# Politica de Seguranca — SISAM

## 1. Excecoes Aceitas

### dangerouslySetInnerHTML
- Usado apenas em conteudo gerenciado pelo CMS de noticias (campo `conteudo` sanitizado no servidor)
- Conteudo e inserido por usuarios com perfil `editor` ou `publicador` autenticados
- Nenhum input de usuario externo e renderizado via innerHTML

### CSP unsafe-inline
- Necessario para o funcionamento do Next.js (injeta estilos inline em SSR)
- CSP diferenciado por rota: o terminal de reconhecimento facial possui CSP mais permissivo para carregar modelos face-api.js
- Demais rotas utilizam CSP restritivo padrao

---

## 2. Politica de Retencao de Dados

| Dado | Retencao | Acao |
|------|----------|------|
| Logs de aplicacao | 90 dias | Rotacao automatica |
| Pre-matriculas pendentes | 90 dias | Limpeza via `DELETE /api/admin/pre-matriculas/limpar` |
| Sessoes JWT | 24 horas | Expiracao automatica do token |
| Cache Redis | TTL variavel (5min a 24h) | Expiracao automatica |
| Cache em memoria | TTL variavel (1min a 1h) | Expiracao automatica |
| Dados de avaliacao | Permanente | Retidos para historico educacional |
| Dados de matricula | Permanente | Retidos por exigencia legal |

---

## 3. Dados Sensiveis

### CPF
- Armazenado com hash bcrypt para autenticacao
- Exibido mascarado na interface (`***.***.***-XX`)
- Usado como identificador unico de login

### Email
- Armazenado em texto para contato e recuperacao
- Nao exposto em APIs publicas
- Acesso restrito a perfis `administrador` e `tecnico`

### Biometria Facial (LGPD)
- Dados faciais armazenados como encoding Base64 no PostgreSQL
- Consentimento LGPD obrigatorio antes do cadastro (checkbox com texto legal)
- Dados processados localmente no navegador via face-api.js (nao enviados a terceiros)
- Exclusao disponivel a qualquer momento pelo administrador
- Finalidade unica: registro de frequencia escolar

---

## 4. Headers de Seguranca

Headers configurados no `middleware.ts` e `next.config.js`:

| Header | Valor |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | Configurado por rota (ver secao 1) |

---

## 5. Rate Limiting

| Categoria | Limite | Janela |
|-----------|--------|--------|
| Autenticacao (`/api/auth/*`) | 5 tentativas | 15 minutos |
| APIs de leitura (GET) | 100 requisicoes | 1 minuto |
| APIs de escrita (POST/PUT/DELETE) | 30 requisicoes | 1 minuto |
| Upload de arquivos | 10 requisicoes | 5 minutos |
| APIs publicas (site) | 60 requisicoes | 1 minuto |

Implementado via middleware com contagem por IP + usuario autenticado.

---

## 6. Consentimento Facial — LGPD

### Fluxo Implementado
1. Administrador acessa tela de cadastro facial do aluno
2. Sistema exibe termo de consentimento com base legal (LGPD Art. 11, II, "g")
3. Checkbox obrigatorio: "Declaro que obtive consentimento do responsavel legal"
4. Somente apos aceite o sistema ativa a camera para captura
5. Encoding facial e gerado no navegador (face-api.js) e enviado ao servidor
6. Dados armazenados com referencia ao consentimento (data/hora/usuario)

### Base Legal
- Lei 13.709/2018 (LGPD), Art. 11, II, "g" — tratamento de dados biometricos para finalidade de frequencia escolar
- Dados de menores: consentimento do responsavel legal obrigatorio (Art. 14)

### Direitos do Titular
- Exclusao dos dados faciais a qualquer momento
- Consulta sobre existencia de dados biometricos armazenados
- Revogacao do consentimento via administrador do sistema

---

## 7. Autenticacao e Autorizacao

- JWT assinado com `HS256` armazenado em cookie `httpOnly`, `secure`, `sameSite=strict`
- Senhas hasheadas com `bcryptjs` (salt rounds: 10)
- Middleware `withAuth` valida token e tipo de usuario em todas as rotas protegidas
- 7 perfis com permissoes granulares: `administrador`, `tecnico`, `polo`, `escola`, `professor`, `editor`, `publicador`
- Queries filtradas por polo/escola conforme perfil do usuario (WHERE builder)

---

## 8. Protecao contra Ataques

| Ataque | Protecao |
|--------|----------|
| SQL Injection | Queries parametrizadas ($1, $2) — NUNCA interpolacao |
| XSS | CSP headers + sanitizacao de conteudo CMS |
| CSRF | Cookie `sameSite=strict` + validacao de origem |
| Brute Force | Rate limiting em `/api/auth/*` |
| Directory Traversal | Validacao de paths em uploads |
| Privilege Escalation | `withAuth` com tipos obrigatorios em cada rota |
