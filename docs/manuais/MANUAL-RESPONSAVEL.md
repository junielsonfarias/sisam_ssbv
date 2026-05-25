# Manual do Responsável — SISAM/Educatec

Para pais, mães e responsáveis legais — Portal do Responsável.

---

## 1. Primeiro acesso

**Como obter a conta:**
- A escola cria a conta vinculada ao seu filho(a)
- Você recebe e-mail com link para definir senha
- Caso não receba, pedir à secretaria escolar

**Login:** `/login` com seu e-mail e senha

---

## 2. Dashboard do Responsável

URL: `/responsavel/dashboard`

Visão geral dos seus filhos:
- Foto + nome + turma de cada filho
- Notas recentes
- Frequência (alerta se < 75%)
- Comunicados não lidos
- Tarefas pendentes
- Próximos eventos

Se tem mais de um filho, seletor no topo.

---

## 3. Boletim Escolar

URL: `/responsavel/boletim`

- Notas por bimestre/disciplina
- Frequência detalhada
- Média final
- Situação (cursando / aprovado / em recuperação)

**Imprimir/baixar:** botão "Baixar PDF" no canto superior

---

## 4. Frequência

URL: `/boletim/frequencia`

- Total de presenças/faltas
- Faltas justificadas vs não justificadas
- Atestados médicos enviados

**Alerta crítico:** se a frequência cair abaixo de 75% (ou 60% para 4-5 anos no caso de Bolsa Família), o sistema notifica a escola e pode abrir caso FICAI.

---

## 5. Comunicados da Escola

URL: `/responsavel/comunicados`

- Mensagens da escola e dos professores
- Avisos sobre reuniões, eventos, atividades
- Marca como lido automaticamente quando você abre

---

## 6. Mensagens / Chat com Professor

URL: `/responsavel/mensagens`

- Conversa 1-a-1 com cada professor do seu filho(a)
- Histórico preservado
- Útil para dúvidas individuais

---

## 7. Tarefas e Atividades

URL: `/responsavel/tarefas`

- Lista de tarefas atribuídas pelo professor
- Data de entrega
- Status (pendente / entregue)
- Acesso a arquivos anexados

---

## 8. Calendário Escolar

URL: `/responsavel/calendario`

- Feriados nacionais e municipais
- Reuniões de pais
- Datas de avaliação
- Eventos escolares

---

## 9. Solicitar Declarações

URL: `/responsavel/declaracao` *(quando UI for construída)*

Pode solicitar 3 tipos:
- **Declaração de Matrícula** — confirma que filho(a) está matriculado(a)
- **Declaração de Frequência** — com % atualizado
- **Declaração de Conclusão** — quando filho(a) concluir o ano

Gerada com **código de validação** que terceiros podem verificar.

---

## 10. Cardápio Escolar (PNAE)

URL: `/responsavel/cardapio` *(quando UI for construída)*

- Refeições do dia/semana
- Informações nutricionais
- Alergênicos (se filho tiver restrição alimentar cadastrada)

---

## 11. Pré-Matrícula Online (novos alunos)

URL: `/matricula` (sem precisar estar logado)

- Para matricular novo filho na rede municipal
- Wizard de 3 etapas: dados do aluno + responsável + escola desejada
- Acompanhamento via protocolo

---

## 12. Reconhecimento Facial (LGPD)

Se a escola usa terminal facial para registro de presença:
- Você precisa **autorizar** com consentimento expresso
- Pode **revogar** a qualquer momento em `/meus-dados`
- Imagens NÃO são enviadas para nuvem (processadas no dispositivo)
- Apenas o "embedding" (vetor numérico) é armazenado

---

## 13. Seus Dados (LGPD)

URL: `/meus-dados`

Como responsável, você tem direito a:
1. **Acessar seus dados** — baixar JSON completo
2. **Portabilidade** — formato interoperável para outro sistema
3. **Exclusão** — solicitar remoção (15 dias de carência)
4. **Revogar consentimentos** (ex: facial)

Conforme Lei Geral de Proteção de Dados (Lei 13.709/2018).

---

## 14. Configurar Notificações

URL: `/perfil/notificacoes` *(quando UI for construída)*

Escolher quais notificações receber e por qual canal:
- **Push** (no app/PWA)
- **E-mail**
- **In-app** (badge na tela)

Eventos disponíveis:
- Nova nota lançada
- Faltas consecutivas do(a) filho(a)
- Comunicado novo da turma
- Caso FICAI aberto (acompanhamento)
- Declaração disponível
- Cardápio publicado

**Modo silencioso:** definir janela noturna sem push (ex: 22h-6h)

---

## 15. Segurança da Conta

URL: `/perfil/seguranca`

Recomendações:
- **Senha forte** (12+ chars, símbolos)
- **2FA opcional** mas recomendado
- **Não compartilhe senha** com ninguém — nem com a escola
- Suspeitando que sua conta foi acessada por outra pessoa? Troque a senha imediatamente.

---

## 16. PWA — Instalar como App no celular

No navegador (Chrome/Edge) do seu celular:
1. Acesse `https://educatec.seu-municipio.gov.br`
2. Menu → "Adicionar à tela inicial"
3. Pronto — ícone do app aparece como aplicativo nativo
4. Funciona até offline (boletim e comunicados anteriores ficam acessíveis)

---

## 17. Dúvidas frequentes

**Esqueci minha senha**
→ `/esqueci-senha` → e-mail com link de recuperação (válido 1h)

**Não recebo notificações**
→ Conferir preferências em `/perfil/notificacoes`
→ Conferir permissão do navegador/PWA para notificações
→ Conferir se e-mail não caiu em spam

**Quero remover meus dados**
→ `/meus-dados` → "Solicitar exclusão" (15 dias de carência)

**Tenho dúvida sobre nota / frequência**
→ Falar com o professor via `/responsavel/mensagens`
→ Em caso de erro: contatar a secretaria escolar

**Minha filha tem deficiência e precisa de AEE**
→ A escola é quem cadastra. Procure a secretaria escolar com laudo médico.

---

## 18. Em caso de problema técnico

- `/status` — verifica se sistema está OK
- Contate a secretaria escolar
- Se foi pelo app/PWA: tentar reinstalar

---

## URLs essenciais

| URL | Para que |
|---|---|
| `/responsavel/dashboard` | Início |
| `/responsavel/boletim` | Boletim |
| `/responsavel/comunicados` | Avisos |
| `/responsavel/mensagens` | Chat com professor |
| `/responsavel/tarefas` | Tarefas |
| `/meus-dados` | LGPD pessoal |
| `/perfil/seguranca` | Senha + 2FA |
| `/dados-abertos` | Dados públicos da rede |
| `/status` | Estado do sistema |
