# Manual 02 — Cadastro de Escolas

**Publico-alvo:** Administrador, Tecnico

---

## Visao Geral

O cadastro de escolas permite registrar, editar e gerenciar todas as escolas da rede municipal. Cada escola esta vinculada a um **polo** (regiao administrativa).

**Caminho no menu:** Gestor Escolar > Cadastros > **Escolas**

**URL:** `/admin/escolas`

---

## 1. Acessando a Lista de Escolas

1. No menu lateral, clique em **"Cadastros"** para expandir
2. Clique em **"Escolas"**
3. A lista de escolas cadastradas sera exibida

<!-- SCREENSHOT: Lista de escolas -->

### Informacoes exibidas na lista:
- **Nome** da escola
- **Codigo** (identificador unico)
- **Polo** ao qual pertence
- **Status**: Ativo ou Inativo
- **Gestor Escolar**: Se o modulo esta habilitado para a escola

### Pesquisar escolas:
Use o campo de busca no topo para filtrar por **nome**, **codigo** ou **nome do polo**.

---

## 2. Cadastrando uma Nova Escola

1. Clique no botao **"+"** (adicionar) no canto superior direito
2. Um formulario sera exibido

<!-- SCREENSHOT: Formulario de cadastro de escola -->

### Campos do formulario:

| Campo | Obrigatorio | Descricao |
|-------|:-----------:|-----------|
| **Nome** | Sim | Nome completo da escola (ex: EMEF Nossa Senhora de Lourdes) |
| **Codigo** | Nao | Codigo identificador (ex: ESC001) |
| **Polo** | Sim | Selecione o polo da lista suspensa |
| **Endereco** | Nao | Endereco completo da escola |
| **Telefone** | Nao | Telefone de contato |
| **Email** | Nao | Email institucional da escola |

3. Preencha os campos
4. Clique em **"Salvar"**
5. A mensagem **"Registro criado com sucesso"** sera exibida

---

## 3. Editando uma Escola

1. Na lista de escolas, localize a escola desejada
2. Clique no icone de **lapis** (editar) na linha da escola
3. O formulario sera exibido com os dados atuais preenchidos
4. Altere os campos necessarios
5. Clique em **"Salvar"**

---

## 4. Habilitando o Gestor Escolar

Para que uma escola possa usar o modulo Gestor Escolar (notas, frequencia, matriculas):

1. Edite a escola
2. Marque a opcao **"Gestor Escolar Habilitado"**
3. Salve

> **Importante:** Sem essa opcao habilitada, o usuario do tipo "Escola" nao vera o modulo Gestor na selecao de modulos.

---

## 5. Excluindo uma Escola

> **Atencao:** So e possivel excluir escolas que **nao possuem vinculos** (alunos, turmas, resultados ou usuarios).

1. Clique no icone de **lixeira** (excluir) na linha da escola
2. O sistema verifica automaticamente se existem vinculos
3. Se houver vinculos, uma mensagem informara quais registros impedem a exclusao:
   - "Escola possui X alunos vinculados"
   - "Escola possui X turmas vinculadas"
   - "Escola possui X usuarios vinculados"
4. Se nao houver vinculos, confirme a exclusao

### O que fazer se nao conseguir excluir:
- Primeiro, transfira ou remova os alunos e turmas vinculados
- Ou, em vez de excluir, **desative** a escola (edite e mude o status para Inativo)

---

## 6. Visualizando Detalhes da Escola

1. Clique no **nome** ou no **cartao** da escola na lista
2. Sera exibida a pagina de detalhes com:
   - Informacoes cadastrais
   - Total de alunos
   - Total de turmas
   - Turmas ativas com quantidade de alunos

---

## Dicas Importantes

- Sempre verifique se o **polo correto** esta selecionado ao cadastrar a escola
- O **codigo da escola** e util para identificacao rapida em relatorios
- Mantenha o **email** atualizado para comunicacao com a escola
- Escolas **inativas** nao aparecem nas selecoes de matricula e turmas
