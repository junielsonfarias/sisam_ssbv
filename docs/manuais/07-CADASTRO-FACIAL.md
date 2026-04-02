# Manual 07 — Cadastro Facial e Reconhecimento

**Publico-alvo:** Administrador, Tecnico, Escola

---

## Visao Geral

O modulo de reconhecimento facial permite registrar a presenca dos alunos de forma automatica, usando a camera do celular ou computador. O processo envolve 3 etapas: consentimento do responsavel (LGPD), captura do rosto e uso no terminal.

**Caminho no menu:** Gestor Escolar > Reconhecimento Facial > **Cadastro Facial**

**URL:** `/admin/facial-enrollment`

---

## Informacao Importante sobre Privacidade (LGPD)

O sistema **NAO armazena fotos** dos alunos. Sao armazenados apenas **vetores matematicos** (numeros) que representam caracteristicas do rosto. Esses vetores:

- Nao permitem reconstruir a imagem do rosto
- Ocupam apenas 1,5 KB por aluno
- Podem ser excluidos a qualquer momento
- Requerem **consentimento do responsavel** para menores de idade

---

## 1. Acessando o Cadastro Facial

1. No menu, acesse **Reconhecimento Facial** > **Cadastro Facial**
2. A pagina exibira um aviso de privacidade (LGPD) no topo

<!-- SCREENSHOT: Pagina de cadastro facial -->

### Filtros:

| Filtro | Obrigatorio | Descricao |
|--------|:-----------:|-----------|
| **Escola** | Sim | Selecione a escola |
| **Serie** | Nao | Filtre por serie (opcional) |
| **Turma** | Sim | Selecione a turma |

3. Preencha os filtros e clique em **"Buscar"**
4. A lista de alunos sera exibida com o status de cada um

---

## 2. Entendendo os Status

Cada aluno tera um dos seguintes status:

| Status | Cor | Significado |
|--------|-----|-------------|
| **Sem Consentimento** | Vermelho | O responsavel ainda nao autorizou |
| **Sem Embedding** | Amarelo | Consentimento dado, mas rosto nao capturado |
| **Cadastrado** | Verde | Consentimento + rosto capturado. Pronto para usar |

---

## 3. Registrando o Consentimento (LGPD)

**Obrigatorio antes de capturar o rosto de qualquer aluno.**

1. Na lista de alunos, clique em **"Consentimento"** ao lado do nome do aluno
2. O formulario de consentimento sera exibido

<!-- SCREENSHOT: Formulario de consentimento -->

### Campos:

| Campo | Obrigatorio | Descricao |
|-------|:-----------:|-----------|
| **Nome do Responsavel** | Sim | Nome completo do pai, mae ou responsavel legal |
| **CPF do Responsavel** | Nao | CPF para registro (opcional) |
| **Autorizacao** | Sim | Marque a caixa de autorizacao |

O texto de autorizacao diz:
> "Autorizo o uso de reconhecimento facial para fins de registro de presenca escolar. Estou ciente de que apenas vetores matematicos serao armazenados, e nao imagens ou fotografias."

3. Preencha o nome do responsavel
4. Marque a caixa de autorizacao
5. Clique em **"Salvar Consentimento"**

> **No celular:** O formulario aparece como um painel que sobe da parte inferior da tela (bottom-sheet).

---

## 4. Capturando o Rosto do Aluno

Apos o consentimento, o botao **"Capturar"** ficara disponivel.

1. Clique em **"Capturar"** ao lado do aluno
2. A tela de captura facial sera aberta

### No Celular (Tela cheia)

<!-- SCREENSHOT: Tela de captura facial no celular -->

A tela de captura ocupa toda a tela do celular, como um aplicativo de camera:

**Parte superior:**
- Nome do aluno
- Botao de trocar camera (frontal/traseira)
- Botao X para fechar
- 3 circulos mostrando as poses (Frontal, Esquerda, Direita)

**Centro:**
- Video da camera em tela cheia
- Guia oval grande indicando onde posicionar o rosto
- Texto "Posicione seu rosto"

**Parte inferior:**
- Instrucao da pose atual (ex: "Olhe diretamente para a camera")
- Indicadores de qualidade (3 bolinhas: qualidade, tamanho, iluminacao)
- Barra de progresso das amostras
- Botao de captura

### No Computador (Modal)

A captura abre como uma janela (modal) com o video a esquerda e o painel de poses a direita.

---

## 5. Processo de Captura — 3 Poses

A captura e feita em **3 angulos** para melhorar a precisao do reconhecimento:

### Pose 1: Frontal
1. Posicione o aluno **olhando diretamente para a camera**
2. O rosto deve estar dentro do guia oval
3. Aguarde a barra de amostras encher (5 amostras)
4. A captura acontece **automaticamente** quando as condicoes estao boas por 1,5 segundo
5. Ou clique no botao **"Capturar Frontal (1/3)"**

### Pose 2: Esquerda
1. O aluno deve **virar levemente o rosto para a esquerda**
2. Mantenha os olhos visiveis
3. Aguarde a captura automatica ou clique no botao

### Pose 3: Direita
1. O aluno deve **virar levemente o rosto para a direita**
2. Mantenha os olhos visiveis
3. Aguarde a captura automatica ou clique no botao

### Indicadores durante a captura:

| Indicador | Verde | Vermelho |
|-----------|-------|----------|
| **Qualidade** | Rosto nitido e bem definido | Rosto borrado ou parcialmente visivel |
| **Tamanho** | Rosto ocupa pelo menos 20% da tela | Rosto muito pequeno — aproxime-se |
| **Iluminacao** | Ambiente bem iluminado | Muito escuro ou muita luz direta |

> **Alerta de iluminacao:** Se o ambiente estiver escuro, uma barra amarela aparecera no topo: "Ambiente muito escuro — melhore a iluminacao"

### Dicas para uma boa captura:
- Faca a captura em ambiente **bem iluminado** (luz natural e ideal)
- O rosto deve ocupar **boa parte da tela** — nao fique longe demais
- Remova **oculos escuros**, bonés ou qualquer item que cubra o rosto
- Evite **contraluz** (janela atras do aluno)
- Mantenha o celular/camera **estavel**

---

## 6. Salvando o Cadastro

Apos as 3 poses serem capturadas:

1. Os 3 thumbnails (fotos das poses) serao exibidos nos circulos do topo
2. O botao mudara para **"Salvar Cadastro Facial"**
3. Clique para salvar
4. A mensagem de sucesso sera exibida: **"Cadastro concluido! 3 angulos registrados"**

<!-- SCREENSHOT: Tela de sucesso -->

O status do aluno mudara de amarelo para **verde (Cadastrado)**.

---

## 7. Recapturando Poses

Se uma pose ficou ruim ou voce quer melhorar a qualidade:

1. Durante a captura, clique no **circulo da pose** ja capturada (no topo)
2. A pose sera resetada e voce podera recaptura-la
3. No computador, clique no icone de **seta circular** (recapturar) ao lado da pose

---

## 8. Removendo Dados Faciais

Para remover todos os dados faciais de um aluno (consentimento + embedding):

1. Na lista de alunos, clique em **"Remover"** (botao vermelho)
2. Um dialogo de confirmacao aparecera:
   > "Tem certeza que deseja remover todos os dados faciais do aluno Maria Silva Santos?"
   > "Esta acao nao pode ser desfeita."
3. Clique em **"Remover Dados"** para confirmar

Apos a remocao:
- O consentimento sera revogado
- O embedding facial sera excluido permanentemente
- Os registros de frequencia facial serao convertidos para "manual"
- O status voltara para **vermelho (Sem Consentimento)**

---

## 9. Usando o Terminal de Reconhecimento

Apos o cadastro facial dos alunos, o reconhecimento pode ser usado para registrar presenca:

**Caminho:** Reconhecimento Facial > **Terminal**

### Configuracao do Terminal:
1. Selecione a **escola** e **turma**
2. Configure a **confianca minima** (recomendado: 85%)
3. Configure o **cooldown** (tempo entre registros do mesmo aluno, ex: 60 segundos)
4. Ative ou desative o **som** de confirmacao

### Uso no dia a dia:
1. Abra o terminal no celular ou computador com camera
2. Posicione o dispositivo na entrada da sala/escola
3. Os alunos devem olhar para a camera ao entrar
4. O sistema identifica o aluno e registra:
   - **Primeiro registro do dia** = Entrada (hora de chegada)
   - **Registros seguintes** = Saida (hora de saida atualizada)
5. Uma confirmacao visual e sonora aparece a cada registro

### Modo Offline:
O terminal funciona **sem internet**:
- Os registros sao salvos localmente no dispositivo
- Quando a internet voltar, os registros sao sincronizados automaticamente

---

## Problemas Comuns

| Problema | Solucao |
|----------|---------|
| Camera nao abre | Verifique as permissoes do navegador: clique no icone de cadeado na barra de endereco e permita "Camera" |
| "Ambiente muito escuro" | Melhore a iluminacao do ambiente ou use a lanterna do celular |
| Captura nao acontece automaticamente | Verifique se o rosto esta grande o suficiente e no angulo correto |
| Aluno nao e reconhecido no terminal | Recadastre o rosto com melhor iluminacao. Verifique se o consentimento esta ativo |
| Botao "Capturar" nao aparece | O consentimento precisa ser registrado primeiro |

---

## Dicas Importantes

- Faca o cadastro facial em ambiente **iluminado** e **sem pressa**
- Cadastre **todos os alunos** da turma de uma vez para agilizar
- Rosto com oculos de grau pode ser cadastrado normalmente
- Se o aluno mudar significativamente de aparencia (corte de cabelo radical, etc.), considere recadastrar
- O cadastro facial e **opcional** — escolas podem continuar usando frequencia manual
- Os dados faciais podem ser removidos a qualquer momento (direito LGPD)
