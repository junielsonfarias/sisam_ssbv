# Manual 08 — Portal do Professor

**Publico-alvo:** Professor

---

## Visao Geral

O Portal do Professor e a area exclusiva para professores lancarem notas e frequencia das suas turmas. O acesso e simplificado — o professor ve apenas as turmas vinculadas ao seu cadastro.

**URL de acesso:** `https://educacaossbv.com.br/login`

> **Importante:** O professor precisa estar cadastrado no sistema e ter turmas vinculadas pelo administrador.

---

## 1. Primeiro Acesso

### Criando sua conta

1. Acesse a pagina de login
2. Clique em **"Sou professor — Criar minha conta"**
3. Preencha os campos:
   - Nome completo
   - Email (sera usado para login)
   - CPF
   - Senha (crie uma senha segura)
4. Clique em **"Criar Conta"**
5. Aguarde a **aprovacao do administrador**

> Apos aprovado, o administrador vinculara suas turmas ao seu perfil.

### Fazendo login

1. Acesse `https://educacaossbv.com.br/login`
2. Digite seu **email** e **senha**
3. Clique em **"Entrar"**
4. Voce sera direcionado automaticamente para o **Dashboard do Professor**

> Professores **nao** passam pela tela de selecao de modulos — vao direto para o portal.

---

## 2. Dashboard do Professor

Ao fazer login, voce vera o painel principal com informacoes resumidas:

<!-- SCREENSHOT: Dashboard do professor -->

### Cartoes de resumo (KPIs):

| Cartao | Descricao |
|--------|-----------|
| **Minhas Turmas** | Numero total de turmas vinculadas a voce |
| **Total de Alunos** | Soma de alunos em todas as suas turmas |
| **Frequencia Hoje** | Percentual de presenca registrada hoje |
| **Frequencia Semana** | Percentual de presenca na semana atual |

### Acoes rapidas:
- Botao **"Lancar Frequencia"** — Vai direto para a tela de frequencia
- Botao **"Lancar Notas"** — Vai direto para a tela de notas

### Lista de turmas:
Abaixo dos cartoes, voce vera a lista de todas as suas turmas com:
- Nome da turma e serie
- Turno (Matutino/Vespertino/Noturno)
- Nome da escola
- Total de alunos
- Registros de hoje

Clique em uma turma para ir diretamente ao lancamento de frequencia.

---

## 3. Minhas Turmas

**Caminho no menu:** **Minhas Turmas**

<!-- SCREENSHOT: Lista de turmas do professor -->

Exibe todas as turmas vinculadas organizadas por escola:

| Informacao | Descricao |
|-----------|-----------|
| **Turma** | Nome da turma (ex: 5o Ano A) |
| **Serie** | Serie/ano escolar |
| **Turno** | Matutino, Vespertino ou Noturno |
| **Tipo de Vinculo** | Polivalente (todas as disciplinas) ou Disciplinar (disciplina especifica) |
| **Disciplina** | Se disciplinar, qual disciplina voce leciona |
| **Alunos** | Quantidade de alunos na turma |

> **Polivalente:** Voce e responsavel por todas as disciplinas da turma (comum nos anos iniciais).
> **Disciplinar:** Voce leciona uma disciplina especifica (comum nos anos finais).

---

## 4. Lancando Frequencia

**Caminho no menu:** Frequencia > **Lancar Frequencia**

### Passo 1: Selecionar a turma

1. A lista de suas turmas sera exibida
2. Cada turma mostra: nome, serie, turno, escola e total de alunos
3. Clique na turma desejada

<!-- SCREENSHOT: Selecao de turma para frequencia -->

> Se voce nao ve nenhuma turma, contate o administrador para vincular turmas ao seu perfil.

### Passo 2: Registrar presenca

Apos selecionar a turma, a lista de alunos sera exibida:

<!-- SCREENSHOT: Tela de lancamento de frequencia -->

Para cada aluno, marque:

| Marcacao | Significado |
|----------|-------------|
| **P** (verde) | Presente — o aluno esta na aula |
| **F** (vermelho) | Faltou — o aluno nao compareceu |
| **T** (cinza) | Transferido — aluno nao faz mais parte da turma |

### Passo a passo:
1. A data de hoje ja vem selecionada (voce pode alterar se necessario)
2. Clique em **"P"** ou **"F"** para cada aluno
3. Por padrao, todos os alunos iniciam como **Presente**
4. Marque como **"F"** apenas os que faltaram
5. Clique em **"Salvar"**

> **Modo offline:** Se voce estiver sem internet (comum em escolas ribeirinhas), a frequencia sera salva localmente e sincronizada quando a internet voltar.

---

## 5. Lancando Notas

**Caminho no menu:** Notas > **Lancar Notas**

### Passo 1: Selecionar turma, disciplina e periodo

<!-- SCREENSHOT: Filtros de notas do professor -->

Preencha os filtros na ordem:

| Filtro | Descricao |
|--------|-----------|
| **Turma** | Selecione uma das suas turmas |
| **Disciplina** | Selecione a disciplina (se polivalente, todas aparecem) |
| **Periodo** | Selecione o bimestre (1o, 2o, 3o ou 4o Bimestre) |

### Passo 2: Preencher as notas

A tabela de alunos sera exibida:

<!-- SCREENSHOT: Tabela de lancamento de notas -->

| Coluna | Como preencher |
|--------|---------------|
| **Aluno** | Nome do aluno (nao editavel) |
| **Nota** | Digite a nota de 0 a 10 (use ponto para decimal: 7.5) |
| **Recuperacao** | So aparece se o aluno tirou menos que 6,0 |
| **Faltas** | Numero de faltas no periodo |
| **Observacao** | Anotacao livre (opcional) |

### Passo a passo:
1. Clique no campo **"Nota"** do primeiro aluno
2. Digite a nota (ex: 8.5)
3. Pressione **Tab** para ir ao proximo aluno
4. Repita para todos
5. Clique em **"Salvar"**
6. Aguarde a mensagem **"Notas salvas com sucesso"**

### O que o sistema calcula automaticamente:
- **Media da turma**: Media de todas as notas
- **Aprovados**: Alunos com nota >= 6,0
- **Em recuperacao**: Alunos com nota < 6,0

> **Dica:** Voce pode preencher parcialmente e salvar. Volte depois para completar.

### Regras:
- Notas devem estar entre **0** e **10**
- Use **ponto** como decimal (7.5, nao 7,5)
- Campos em branco significam que o aluno nao foi avaliado
- O campo de recuperacao so aceita nota se a nota original for < 6,0
- A mensagem **"Preencha pelo menos uma nota"** aparece se tentar salvar sem nada preenchido

---

## 6. Visualizando Alunos

**Caminho:** Clique em uma turma no Dashboard

Voce pode ver a lista de alunos de cada turma com:
- Nome completo
- Codigo do aluno
- Situacao (Cursando, Transferido, etc.)

> Professores **nao** podem editar dados dos alunos — apenas visualizar.

---

## 7. Navegacao no Celular

O Portal do Professor e totalmente otimizado para **celular**:

### Menu inferior (barra de navegacao):
- **Dashboard** — Painel principal com resumo
- **Minhas Turmas** — Lista de turmas
- **Frequencia** — Lancar frequencia
- **Notas** — Lancar notas

### Dicas de uso no celular:
- O sistema funciona como um aplicativo (PWA)
- Voce pode **adicionar a tela inicial** do celular
- Funciona **offline** — dados sao sincronizados quando a internet voltar
- Use o celular na **posicao vertical** (retrato) para melhor experiencia

---

## 8. Funcionalidades Futuras

As seguintes funcionalidades estao em desenvolvimento:

| Funcionalidade | Descricao |
|---------------|-----------|
| **Diario de Classe** | Registro diario de conteudo e observacoes |
| **Planejamento** | Planos de aula semanais/mensais |
| **Comunicados** | Envio de mensagens para pais e escola |

---

## Problemas Comuns

| Problema | Solucao |
|----------|---------|
| "Nenhuma turma vinculada" | O administrador precisa vincular turmas ao seu perfil em Professores > Vincular Turmas |
| Nao consigo acessar o sistema | Verifique se sua conta foi aprovada pelo administrador |
| Disciplina nao aparece | Verifique com o administrador se a disciplina esta configurada para a serie da turma |
| Notas nao salvam | Verifique se as notas estao entre 0 e 10, usando ponto como decimal |
| Frequencia nao sincroniza | Verifique a conexao com a internet. Os dados serao sincronizados automaticamente |
| Nao vejo os alunos da turma | Verifique com a escola se os alunos estao matriculados com situacao "Cursando" |

---

## Dicas para o Dia a Dia

1. **Faca login no inicio do dia** para sincronizar os dados
2. **Lance a frequencia diariamente** — nao acumule para o final da semana
3. **Lance notas** ao corrigir as avaliacoes — nao espere o final do bimestre
4. **Salve frequentemente** — nao perca dados por fechar o navegador sem salvar
5. **Use o modo offline** em escolas sem internet estavel — o sistema salva localmente
6. Se tiver problemas, **contate a secretaria da escola** ou o **suporte tecnico da SEMED**
