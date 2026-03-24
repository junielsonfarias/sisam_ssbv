# EDUCATEC — Material Completo de Apresentacao

## Secretaria Municipal de Educacao de Sao Sebastiao da Boa Vista (SEMED SSBV)

---

# 1. APRESENTACAO DO SISTEMA

## Nome do Sistema
**Educatec** — Sistema Integrado de Gestao Educacional

## Objetivo Geral
O Educatec e uma plataforma digital completa desenvolvida para modernizar e integrar toda a gestao educacional do municipio de Sao Sebastiao da Boa Vista. O sistema centraliza, em um unico ambiente online, o cadastro de alunos, o acompanhamento pedagogico, o controle de frequencia, o lancamento de notas, a avaliacao municipal padronizada e a comunicacao entre escolas e a Secretaria Municipal de Educacao (SEMED).

## Publico-Alvo

| Perfil | Descricao | Acesso |
|--------|-----------|--------|
| **Administrador** | Equipe central da SEMED com acesso total ao sistema | Todos os modulos e configuracoes |
| **Tecnico** | Profissionais de apoio da SEMED que acompanham os indicadores | Monitoramento, relatorios e gestao |
| **Polo** | Coordenadores regionais que supervisionam escolas agrupadas | Dados do seu polo de escolas |
| **Escola** | Gestores escolares (diretores, secretarios) | Dados da sua propria escola |
| **Professor** | Docentes em sala de aula | Frequencia e notas das suas turmas |
| **Editor** | Responsavel pela comunicacao institucional | Noticias do site da SEMED |

## Problemas que o Sistema Resolve

**Antes do Educatec:**
- Registros de frequencia e notas feitos em papel, sujeitos a extravio e erros
- Impossibilidade de acompanhamento em tempo real pela SEMED
- Dificuldade em identificar alunos em risco de evasao escolar
- Processos de matricula e transferencia demorados e burocraticos
- Dados fragmentados em planilhas e cadernos de cada escola
- Ausencia de indicadores confiáveis para tomada de decisao
- Comunicacao lenta entre escolas e secretaria

**Com o Educatec:**
- Todos os dados centralizados em uma unica plataforma online
- Acompanhamento em tempo real de frequencia, notas e indicadores
- Alertas automaticos de infrequencia e baixo desempenho
- Processos de matricula e transferencia digitais e ageis
- Dashboards com graficos e indicadores para decisao estrategica
- Comunicacao instantanea entre escola e SEMED
- Historico completo e rastreavel de cada aluno

---

# 2. VISAO GERAL DOS MODULOS

O Educatec esta organizado em dois grandes modulos — **Avaliacao Municipal (Educatec)** e **Gestor Escolar** — alem do **Portal do Professor**, do **Site Institucional** e do **Terminal de Reconhecimento Facial**. Cada escola pode ter o modulo Gestor Escolar habilitado individualmente pelo administrador.

---

## 2.1 Modulo de Avaliacao Municipal (Educatec)

### Funcao Principal
Aplicar, registrar e analisar avaliacoes padronizadas em todo o municipio, permitindo comparar o desempenho dos alunos entre escolas, series e periodos.

### Quem Utiliza
Administradores, tecnicos, coordenadores de polo e escolas.

### Funcionalidades
- **Importacao de resultados**: Upload de provas municipais com calculo automatico de niveis de aprendizagem (N1 a N4)
- **Painel de analise**: Graficos comparativos por escola, serie, disciplina e polo
- **Niveis de aprendizagem**: Classificacao automatica em Lingua Portuguesa, Matematica e Producao Textual
- **Configuracao por serie**: Cada serie (2o, 3o, 5o, 8o, 9o ano) tem quantidade de questoes e disciplinas especificas
- **Dashboard consolidado**: Visao geral do municipio com indicadores-chave

### Beneficios
- Padronizacao das avaliacoes em todo o municipio
- Identificacao precisa de lacunas de aprendizagem
- Comparativo entre escolas para direcionar politicas publicas
- Base de dados para planejamento pedagogico

---

## 2.2 Modulo Gestor Escolar

### Funcao Principal
Gerenciar toda a vida escolar do aluno — da matricula ao historico escolar — com lancamento de notas, frequencia, conselho de classe e emissao de documentos.

### Quem Utiliza
Administradores, tecnicos e escolas habilitadas.

### Funcionalidades

**Cadastro e Matricula:**
- Cadastro completo de alunos com dados pessoais, endereco e informacoes INEP/Censo Escolar
- Matricula digital com validacao de vagas e verificacao de conflitos
- Turmas com suporte a multiserie e multietapa
- Controle de vagas com fila de espera (convocar, matricular ou remover da fila)
- Anos letivos com status (planejamento, ativo, finalizado) e bimestres automaticos

**Notas e Avaliacoes:**
- Lancamento de notas por disciplina e periodo
- Tres tipos de avaliacao: Parecer Descritivo (Creche ao 3o), Conceito (4o e 5o), Numerico (6o ao 9o)
- Media ponderada automatica com pesos por bimestre
- Recuperacao: nota substitui quando maior
- Fechamento de ano em lote (aprovacao/reprovacao automatica)
- Regras de avaliacao configuraveis por escola

**Frequencia:**
- Lancamento bimestral (presencas e faltas por periodo)
- Calculo automatico de percentual de frequencia
- Deteccao de alunos infrequentes (abaixo de 75%)
- Integracao com frequencia facial diaria

**Pedagógico:**
- Conselho de classe com pareceres (aprovado, reprovado, recuperacao, progressao parcial)
- Recuperacao paralela e final
- Historico escolar completo para impressao
- Boletim escolar, ata de conselho e relatorios em PDF

**Transferências:**
- Transferencia dentro e fora do municipio
- Historico de movimentacao (entrada/saida) com rastreabilidade
- Rematricula automatica de alunos transferidos

### Beneficios
- Eliminacao de cadernos e planilhas de papel
- Processo de matricula rapido e sem duplicidade
- Historico escolar sempre disponivel e atualizado
- Conselho de classe documentado e padronizado
- Visao completa da trajetoria do aluno

---

## 2.3 Portal do Professor

### Funcao Principal
Permitir que professores lancem frequencia e notas diretamente pelo celular, inclusive sem conexao com a internet.

### Quem Utiliza
Professores de todas as series (Creche ao 9o ano).

### Funcionalidades
- Auto-cadastro publico (professor se registra e aguarda ativacao pelo administrador)
- Aplicativo instalavel no celular (PWA — Progressive Web App)
- Lancamento de frequencia diaria (Creche ao 5o) ou por hora-aula (6o ao 9o)
- Lancamento de notas por turma, disciplina e periodo
- Visualizacao de alunos com resumo de frequencia e media
- Funcionamento offline: dados salvos no celular e sincronizados automaticamente quando a internet retornar

### Beneficios
- Professor nao precisa ir ate a secretaria para lancar notas
- Funciona mesmo em areas com internet instavel
- Dados chegam em tempo real para a escola e para a SEMED
- Reducao drastica do trabalho manual e retrabalho

---

## 2.4 Terminal de Reconhecimento Facial

### Funcao Principal
Registrar a frequencia dos alunos automaticamente por meio de reconhecimento facial, usando cameras ou tablets instalados na entrada da escola.

### Quem Utiliza
Escolas equipadas com dispositivos (tablets ou cameras), sob supervisao do gestor escolar.

### Funcionalidades
- Terminal em modo quiosque (tela cheia) com camera ao vivo
- Reconhecimento automatico do aluno com feedback visual e sonoro
- Cadastro facial com captura em 3 angulos (frontal, esquerda, direita)
- Suporte a multiplos dispositivos por escola
- Funcionamento offline com sincronizacao automatica
- Consentimento LGPD obrigatorio do responsavel antes do cadastro
- Exclusao total de dados biometricos a qualquer momento
- Monitoramento em tempo real dos dispositivos (online/offline)

### Beneficios
- Registro de frequencia preciso e automatizado
- Eliminacao de chamada manual em sala de aula
- Deteccao imediata de ausencias
- Seguranca e privacidade (dados biometricos protegidos por lei)

---

## 2.5 Site Institucional SEMED

### Funcao Principal
Ser a vitrine digital da Secretaria de Educacao, com informacoes publicas, noticias, contato e consulta de boletim escolar online.

### Quem Utiliza
Comunidade escolar (pais, alunos, professores) e publico em geral.

### Funcionalidades
- Pagina publica com 9 secoes (sobre, servicos, noticias, escolas, contato e mais)
- Sistema de gerenciamento de conteudo (CMS) para edicao pelo administrador
- **Boletim online**: pais e alunos consultam notas e frequencia pelo codigo do aluno ou CPF
- Portal de noticias com editor dedicado (perfil editor)
- Estatisticas automaticas (total de escolas, alunos, professores)

### Beneficios
- Transparencia para a comunidade
- Pais acompanham o desempenho dos filhos de casa
- Comunicacao institucional profissional e atualizada
- Menos demanda presencial na secretaria e nas escolas

---

## 2.6 Notificacoes Automaticas

### Funcao Principal
Gerar alertas automaticos quando o sistema detecta situacoes que exigem atencao, como alunos faltosos ou com notas abaixo da media.

### Quem Utiliza
Administradores, tecnicos e gestores escolares.

### Tipos de Alerta
- **Infrequencia**: aluno com frequencia abaixo de 75% no bimestre
- **Notas baixas**: aluno com desempenho abaixo do esperado
- **Recuperacao pendente**: aluno que precisa de avaliacao de recuperacao

### Beneficios
- Intervencao precoce para evitar evasao
- Gestores nao precisam verificar planilhas manualmente
- Acompanhamento continuo e proativo da situacao dos alunos

---

# 3. MODULO DE FREQUENCIA ESCOLAR (DESTAQUE)

A frequencia escolar e um dos indicadores mais importantes da gestao educacional. No Educatec, o controle de frequencia e completo, automatizado e integrado — desde o registro diario ate os relatorios bimestrais e anuais.

## 3.1 Como Registrar Frequencia

O Educatec oferece **tres formas** de registro de frequencia:

### Forma 1: Pelo Professor (Portal do Professor)
1. O professor abre o aplicativo Educatec no celular
2. Seleciona a turma e a data
3. Marca os alunos presentes e ausentes com um toque
4. Salva — os dados sao enviados automaticamente para o sistema
5. Se nao houver internet, os dados ficam salvos no celular e sao sincronizados depois

**Exemplo pratico:** A professora Maria, da turma do 3o ano da Escola Municipal Boa Esperanca, abre o aplicativo as 7h30 da manha. Em menos de 2 minutos, registra a frequencia dos 25 alunos. O diretor da escola e a SEMED ja podem ver o registro imediatamente.

### Forma 2: Por Reconhecimento Facial (Terminal)
1. Um tablet com camera e instalado na entrada da escola
2. O aluno para diante da camera por 2 segundos
3. O sistema reconhece o rosto e registra a presenca automaticamente
4. Um sinal sonoro e visual confirma o registro
5. Se o aluno ja foi registrado naquele dia, aparece "Ja registrado"

**Exemplo pratico:** Na Escola Municipal Sao Sebastiao, um tablet na porta da sala registra os alunos do 6o ao 9o ano conforme chegam. Ate as 7h45, todos os presentes ja estao registrados sem que o professor precise fazer chamada.

### Forma 3: Pela Gestao Escolar (Frequencia Bimestral)
1. O secretario escolar acessa o modulo Gestor Escolar
2. Seleciona a turma e o bimestre
3. Informa a quantidade de presencas e faltas de cada aluno
4. O sistema calcula automaticamente o percentual de frequencia
5. Valida que presencas + faltas nao ultrapassem os dias letivos

**Exemplo pratico:** No final do 1o bimestre, a secretaria da escola consolida os dados de frequencia de todas as turmas em uma unica tarde, gerando os percentuais automaticamente.

## 3.2 Controle Diario e Mensal

### Frequencia Diaria
- Registro individual por aluno, com hora de entrada e saida
- Status: presente, ausente, com justificativa
- KPI cards: total de alunos, presentes, ausentes e taxa de presenca do dia
- Filtros por escola, turma, data e status
- Exportacao para CSV (planilha)

### Frequencia por Hora-Aula (6o ao 9o Ano)
- Grade horaria semanal configuravel (5 dias x 6 aulas)
- Cada aula vinculada a uma disciplina
- Presenca registrada por aula, nao apenas por dia
- Faltas contabilizadas automaticamente nas notas da disciplina

### Frequencia Bimestral
- Consolidacao de presencas e faltas por periodo (bimestre)
- Calculo automatico do percentual
- Integracao com frequencia diaria: dados faciais podem ser agregados ao bimestre
- Metodo identificado: manual ou facial

## 3.3 Alertas de Evasao

O sistema monitora automaticamente a frequencia de todos os alunos e gera alertas quando detecta risco:

- **Aluno infrequente**: frequencia abaixo de 75% no bimestre
- **Notificacao automatica**: gerada para o gestor escolar e para a SEMED
- **Deduplicacao inteligente**: o sistema nao repete alertas do mesmo aluno em 30 dias
- **Painel de infrequencia**: pagina dedicada que lista todos os alunos em situacao de risco

**Exemplo pratico:** O aluno Joao Pedro, do 5o ano, faltou 12 dias em marco. O sistema gera um alerta automatico para a diretora e para o tecnico da SEMED responsavel pelo polo. A equipe entra em contato com a familia antes que a situacao se agrave.

## 3.4 Acompanhamento por Professores e SEMED

### Para o Professor
- Ve a lista de alunos com resumo de frequencia (presencas, faltas, percentual)
- Identifica rapidamente quem esta faltando com frequencia
- Registra justificativas para faltas

### Para a Escola
- Dashboard com taxa de frequencia geral da escola
- Lista de alunos infrequentes por turma
- Historico de frequencia por aluno (aba no perfil)

### Para a SEMED
- Visao consolidada de todas as escolas do municipio
- Comparativo de frequencia entre escolas e polos
- Indicadores em tempo real no dashboard principal
- Filtros por escola, serie, turma e periodo

## 3.5 Relatorios Automaticos

| Relatorio | Conteudo | Quem Acessa |
|-----------|----------|-------------|
| Frequencia Diaria | Lista de presencas/faltas por dia com exportacao CSV | Escola, SEMED |
| Resumo Bimestral | Percentual de frequencia por aluno e turma | Escola, SEMED |
| Infrequencia | Alunos com frequencia abaixo de 75% | Escola, SEMED |
| Boletim Escolar | Frequencia geral e por periodo, junto com notas | Escola, Pais (online) |
| Dashboard Gestor | Graficos de frequencia por serie, turma e escola | SEMED |

---

# 4. FUNCIONALIDADES PARA ESCOLAS

## 4.1 Rotina dos Professores

**Inicio da aula:**
1. Professor abre o aplicativo Educatec no celular
2. Seleciona a turma do horario
3. Registra a frequencia dos alunos em menos de 2 minutos
4. Se a escola tem terminal facial, a frequencia ja foi registrada automaticamente

**Final do bimestre:**
1. Professor acessa o lancamento de notas
2. Seleciona a turma e a disciplina
3. Lanca as notas de cada aluno
4. O sistema calcula automaticamente as medias e identifica quem precisa de recuperacao
5. Se estiver sem internet, as notas ficam salvas no celular e sao enviadas depois

**Dia a dia:**
- Consulta a lista de alunos com resumo de desempenho
- Verifica quem esta faltando com frequencia
- Acompanha a evolucao das notas ao longo do ano

## 4.2 Rotina da Gestao Escolar

**Diariamente:**
- Verifica o painel de frequencia diaria (quantos alunos presentes/ausentes)
- Monitora alertas de infrequencia
- Acompanha o status dos dispositivos faciais (se houver)

**Semanalmente:**
- Analisa indicadores de frequencia por turma
- Verifica notificacoes de alunos em risco
- Acompanha pendencias de lancamento de notas

**Bimestralmente:**
- Consolida frequencia e notas
- Realiza conselho de classe com registros no sistema
- Gera boletins e relatorios para os pais
- Identifica alunos para recuperacao

**Anualmente:**
- Processo de matricula e rematricula digital
- Controle de vagas e fila de espera
- Fechamento do ano letivo com aprovacao/reprovacao automatica
- Emissao de historico escolar
- Transferencias entre escolas

## 4.3 Beneficios no Acompanhamento dos Alunos

- **Perfil completo do aluno**: todas as informacoes em um unico lugar — dados pessoais, notas, frequencia, historico, evolucao e dados biometricos (se cadastrado)
- **Evolucao visual**: graficos que mostram a trajetoria do aluno ao longo dos anos
- **Alertas proativos**: o sistema avisa quando um aluno precisa de atencao
- **Historico rastreavel**: toda movimentacao (matricula, transferencia, conselho de classe) fica registrada
- **Boletim online**: pais acompanham de casa, sem precisar ir ate a escola

## 4.4 Reducao de Trabalho Manual

| Atividade | Antes | Com o Educatec |
|-----------|-------|----------------|
| Registro de frequencia | Caderno de chamada diario | Automatico (facial) ou 2 min no celular |
| Lancamento de notas | Planilhas em papel, digitacao posterior | Direto no celular, calculo automatico |
| Calculo de medias | Manual com calculadora | Automatico com pesos configuraveis |
| Emissao de boletim | Digitacao e impressao individual | Gerado automaticamente pelo sistema |
| Controle de vagas | Caderno e ligacoes telefonicas | Painel digital com fila de espera |
| Transferencia de aluno | Oficio em papel, dias de espera | Digital, imediato, com historico |
| Historico escolar | Compilacao manual de anos anteriores | Gerado em segundos com todos os dados |

---

# 5. FUNCIONALIDADES PARA TECNICOS DA SEMED

## 5.1 Monitoramento em Tempo Real

O dashboard principal do Educatec oferece uma visao completa e atualizada de toda a rede municipal:

- **Painel de dados**: total de escolas, alunos matriculados, turmas ativas e professores
- **Estatisticas automaticas**: contadores atualizados diretamente do banco de dados
- **Status dos dispositivos faciais**: monitoramento em tempo real de quais terminais estao online ou offline
- **Health check do sistema**: indicadores de saude — latencia do banco, conexoes ativas, uso de recursos

## 5.2 Analise de Indicadores Educacionais

### Dashboard do Gestor
- Graficos de pizza: distribuicao de alunos por situacao (cursando, aprovado, reprovado, transferido)
- Graficos de barras: desempenho por disciplina
- Graficos de area: comparativo entre series
- Distribuicao de frequencia por faixa (acima de 90%, entre 75-90%, abaixo de 75%)
- Pareceres do conselho de classe por turma

### Painel de Analise (Avaliacoes Municipais)
- Niveis de aprendizagem (N1 a N4) por escola, serie e disciplina
- Comparativo entre escolas e polos
- Evolucao ao longo das avaliacoes
- Producao textual com analise detalhada

### Comparativo entre Escolas
- Ranking de desempenho
- Comparativo de frequencia
- Identificacao de escolas que precisam de apoio

## 5.3 Acompanhamento da Frequencia

A SEMED tem acesso completo a frequencia de toda a rede:

- **Visao macro**: taxa de frequencia do municipio, por polo e por escola
- **Visao detalhada**: frequencia diaria de cada turma e aluno
- **Alertas centralizados**: todos os alunos infrequentes de todas as escolas em um unico painel
- **Metodo de registro**: identificacao se a frequencia foi registrada manualmente ou por reconhecimento facial
- **Exportacao**: dados exportaveis para CSV para analise externa

## 5.4 Tomada de Decisao Baseada em Dados

**Exemplos praticos de decisoes apoiadas pelo Educatec:**

1. **Redistribuicao de recursos**: ao identificar escolas com alta infrequencia, direcionar equipe de busca ativa
2. **Formacao continuada**: ao detectar disciplinas com baixo desempenho em varias escolas, planejar capacitacoes para professores
3. **Abertura de turmas**: ao verificar o controle de vagas, decidir onde abrir novas turmas
4. **Politicas de permanencia**: ao analisar perfis de alunos transferidos e evadidos, criar programas de retencao
5. **Planejamento do ano letivo**: ao fechar o ano, usar dados de aprovacao/reprovacao para projetar vagas do proximo ano

---

# 6. BENEFICIOS DO SISTEMA

## Melhoria na Gestao Educacional
- Decisoes baseadas em dados reais e atualizados, nao em estimativas
- Visao integrada de toda a rede municipal de ensino
- Padronizacao de processos entre todas as escolas
- Acompanhamento da trajetoria completa do aluno

## Transparencia
- Boletim online acessivel a pais e alunos pela internet
- Site institucional com informacoes publicas da SEMED
- Dados de frequencia e desempenho sempre disponiveis
- Rastreabilidade completa de acoes (quem fez o que e quando)

## Agilidade
- Processos que levavam dias agora sao feitos em minutos
- Matriculas, transferencias e emissao de documentos digitais
- Lancamento de frequencia automatizado por reconhecimento facial
- Notificacoes instantaneas para situacoes que exigem atencao

## Reducao da Evasao Escolar
- Deteccao automatica de alunos infrequentes
- Alertas para a escola e para a SEMED simultaneamente
- Intervencao precoce com base em dados concretos
- Acompanhamento continuo ao longo de todo o ano letivo

## Integracao entre Escola e Secretaria
- Dados compartilhados em tempo real
- Escola ve suas informacoes; SEMED ve toda a rede
- Comunicacao via sistema de notificacoes
- Site institucional como canal publico de comunicacao

---

# 7. DIFERENCIAIS DO SISTEMA

## Interface Amigavel
- Design moderno e intuitivo, com cores e icones que facilitam a navegacao
- Menu organizado por modulos e subgrupos tematicos
- Aplicativo para celular (PWA) que funciona como um app nativo
- Terminal facial com tela simplificada para uso em quiosque

## Acesso Online
- Funciona em qualquer dispositivo com navegador (computador, tablet, celular)
- Nao precisa instalar nenhum programa — basta acessar pelo navegador
- Portal do Professor e Terminal Facial instalaveis como aplicativos no celular
- Funcionamento offline com sincronizacao automatica

## Dados em Tempo Real
- Frequencia registrada pelo professor ou pelo terminal facial aparece instantaneamente no sistema
- Dashboards atualizados automaticamente
- Monitoramento de dispositivos com status em tempo real
- Cache inteligente para performance com 50+ usuarios simultaneos

## Seguranca da Informacao
- **Nota de seguranca A+** (92 de 100 pontos)
- Senhas criptografadas com algoritmo bcrypt
- Protecao contra ataques (SQL Injection, XSS, CSRF)
- Controle de acesso por perfil — cada usuario ve apenas o que pode
- Dados biometricos protegidos conforme LGPD (Lei Geral de Protecao de Dados)
- Consentimento obrigatorio do responsavel para cadastro facial
- Exclusao total de dados biometricos a qualquer momento
- Limite de tentativas de login (bloqueio apos 5 tentativas)

## Compatibilidade com o Censo Escolar
- Campos INEP integrados para escolas, turmas e alunos
- Dados de infraestrutura, localizacao e modalidade de ensino
- Facilitacao do preenchimento do Censo Escolar do MEC

## Cobertura Completa
- Da Creche ao 9o ano do Ensino Fundamental
- EJA (Educacao de Jovens e Adultos) da 1a a 4a Etapa
- 16 series escolares com regras de avaliacao especificas para cada faixa

---

# 8. ROTEIRO PARA VIDEO PROMOCIONAL

## Duracao Estimada: 3 a 5 minutos

---

### CENA 1 — Abertura (0:00 - 0:15)

**Visual:** Imagens aereas de Sao Sebastiao da Boa Vista. Criancas entrando na escola. Logo do Educatec aparece com animacao suave.

**Narracao:**
> "Educacao de qualidade comeca com gestao inteligente. Conheca o Educatec — o sistema que esta transformando a educacao publica em Sao Sebastiao da Boa Vista."

---

### CENA 2 — O Problema (0:15 - 0:45)

**Visual:** Cenas representando a rotina antiga — pilhas de papel, planilhas confusas, professor fazendo chamada no caderno, secretaria digitando dados manualmente, pai indo ate a escola para saber as notas do filho.

**Narracao:**
> "Durante anos, a gestao escolar dependeu de cadernos, planilhas e processos manuais. Dados se perdiam. Faltas passavam despercebidas. Pais nao tinham como acompanhar o desempenho dos filhos. E a SEMED nao conseguia ter uma visao clara de toda a rede."

---

### CENA 3 — A Solucao (0:45 - 1:15)

**Visual:** Tela do computador mostrando o dashboard do Educatec. Transicao para celular do professor. Tablet com terminal facial.

**Narracao:**
> "O Educatec mudou essa realidade. Uma plataforma unica, acessivel de qualquer lugar, que conecta professores, escolas e a Secretaria de Educacao em tempo real."

---

### CENA 4 — Portal do Professor (1:15 - 1:45)

**Visual:** Professor usando o celular em sala de aula. Tela do aplicativo mostrando a lista de alunos. Toque para marcar presenca. Icone de sincronizacao.

**Narracao:**
> "O professor registra a frequencia pelo celular em menos de dois minutos. Mesmo sem internet, os dados ficam salvos e sao enviados assim que a conexao retornar. As notas tambem sao lancadas diretamente no aplicativo, com calculo automatico de medias."

---

### CENA 5 — Reconhecimento Facial (1:45 - 2:15)

**Visual:** Aluno chegando na escola e parando diante de um tablet. Rosto reconhecido com moldura verde. Nome e turma aparecem na tela. Som de confirmacao.

**Narracao:**
> "Nas escolas equipadas com terminal facial, a presenca e registrada automaticamente. O aluno para diante da camera por dois segundos e pronto — a frequencia esta salva. Sem filas, sem chamada manual. E com total respeito a privacidade, em conformidade com a LGPD."

---

### CENA 6 — Gestao Escolar (2:15 - 2:45)

**Visual:** Diretora no computador acessando o painel da escola. Telas de matricula, transferencia, boletim, historico escolar.

**Narracao:**
> "Para a gestao da escola, o Educatec simplifica tudo: matriculas digitais, controle de vagas, transferencias instantaneas, boletins gerados automaticamente e historico escolar completo. O que antes levava dias, agora leva minutos."

---

### CENA 7 — SEMED (2:45 - 3:15)

**Visual:** Tecnico da SEMED analisando graficos no dashboard. Comparativos entre escolas. Mapa de infrequencia.

**Narracao:**
> "A Secretaria de Educacao acompanha toda a rede em tempo real. Graficos de desempenho, indicadores de frequencia, alertas de evasao. Dados que permitem decisoes estrategicas para melhorar a educacao de todo o municipio."

---

### CENA 8 — Pais e Comunidade (3:15 - 3:35)

**Visual:** Mae acessando o site da SEMED pelo celular. Consultando o boletim do filho. Sorriso de satisfacao.

**Narracao:**
> "E os pais tambem fazem parte dessa transformacao. Pelo site da SEMED, acompanham as notas e a frequencia dos filhos de casa, sem precisar ir ate a escola. Transparencia e participacao para toda a comunidade."

---

### CENA 9 — Beneficios e Numeros (3:35 - 3:50)

**Visual:** Infograficos animados com os principais numeros — escolas conectadas, alunos cadastrados, registros de frequencia. Icones representando os beneficios.

**Narracao:**
> "Mais agilidade. Mais transparencia. Menos evasao. Menos burocracia. O Educatec e a tecnologia a servico da educacao publica."

---

### CENA 10 — Encerramento (3:50 - 4:10)

**Visual:** Logo do Educatec centralizada. Logo da SEMED SSBV abaixo. Contatos e site.

**Narracao:**
> "Educatec — Gestao Educacional Inteligente. Uma realizacao da Secretaria Municipal de Educacao de Sao Sebastiao da Boa Vista. Juntos, construindo o futuro da educacao."

**Texto na tela:**
> EDUCATEC | SEMED SSBV
> www.semed-ssbv.edu.br (exemplo)
> Gestao Educacional Inteligente

---

# 9. FORMATO PARA NOTEBOOKLM

## O que e o Educatec?
Sistema de gestao educacional da SEMED de Sao Sebastiao da Boa Vista. Centraliza dados de alunos, frequencia, notas, avaliacoes e comunicacao entre escolas e secretaria.

## Modulos Principais
1. **Avaliacao Municipal** — Provas padronizadas, niveis N1-N4, comparativos entre escolas
2. **Gestor Escolar** — Matricula, notas, frequencia, conselho de classe, historico, transferencias
3. **Portal do Professor** — App no celular, frequencia diaria, notas, funciona offline
4. **Terminal Facial** — Reconhecimento facial para frequencia automatica, LGPD compliant
5. **Site Institucional** — Pagina publica da SEMED, boletim online, noticias
6. **Notificacoes** — Alertas automaticos de infrequencia, notas baixas, recuperacao

## Tipos de Usuario
- **Administrador**: acesso total
- **Tecnico**: monitoramento e gestao
- **Polo**: supervisao regional
- **Escola**: gestao da propria unidade
- **Professor**: frequencia e notas das suas turmas
- **Editor**: noticias do site

## Frequencia Escolar — 3 Formas de Registro
1. Professor pelo celular (PWA, funciona offline)
2. Reconhecimento facial automatico (terminal com camera)
3. Secretaria escolar (consolidacao bimestral)

## Alertas de Evasao
- Frequencia abaixo de 75% gera alerta automatico
- Notificacao para escola e SEMED
- Painel dedicado de infrequencia
- Deduplicacao: mesmo aluno nao gera alerta repetido em 30 dias

## Tipos de Avaliacao por Serie
- Creche ao 3o ano: Parecer Descritivo (semestral)
- 4o e 5o ano: Conceito — E/B/R/I (bimestral)
- 6o ao 9o ano: Nota Numerica 0-10 (bimestral)
- EJA: Numerico (semestral)

## Avaliacao Municipal (Niveis)
- Apenas series avaliadas: 2o, 3o, 5o, 8o, 9o ano
- Disciplinas: Lingua Portuguesa, Matematica (+ Ciencias Humanas e Naturais para 8o/9o)
- Producao Textual: 2o, 3o e 5o ano
- Niveis: N1 (critico), N2 (basico), N3 (adequado), N4 (avancado)

## Seguranca
- Nota A+ (92/100)
- Senhas bcrypt, JWT httpOnly, RBAC por perfil
- 100% queries parametrizadas (zero SQL Injection)
- Rate limiting: 5 tentativas de login / 15min
- Dados faciais: embeddings numericos, nunca fotos
- LGPD: consentimento obrigatorio, exclusao total disponivel

## Diferenciais
- Funciona offline (PWA com sincronizacao)
- 50+ usuarios simultaneos
- Campos INEP/Censo Escolar integrados
- 16 series: Creche ao 9o + EJA 1a a 4a Etapa
- Regras de avaliacao configuraveis por escola
- Deploy em nuvem (Vercel) ou servidor proprio (VPS)

## Beneficios-Chave
- Reducao de trabalho manual em ate 80%
- Deteccao precoce de evasao escolar
- Transparencia (boletim online para pais)
- Decisoes baseadas em dados reais
- Integracao completa escola-secretaria

---

# 10. TOM DE COMUNICACAO

## Diretrizes de Comunicacao

### Tom Institucional
O Educatec representa a Secretaria Municipal de Educacao. Toda comunicacao deve transmitir seriedade, competencia e compromisso com a educacao publica. Evite gírias, informalidade excessiva ou linguagem tecnica de TI.

**Exemplo correto:** "O sistema permite o acompanhamento da frequencia escolar em tempo real."
**Exemplo incorreto:** "A plataforma faz um tracking real-time da attendance dos students."

### Tom Moderno
O sistema e uma ferramenta de inovacao. A comunicacao deve transmitir modernidade e avanço tecnologico, sem ser intimidadora. Use expressoes como "gestao inteligente", "dados em tempo real", "tecnologia a servico da educacao".

**Exemplo correto:** "Reconhecimento facial com inteligencia artificial para frequencia automatica."
**Exemplo incorreto:** "Utilizamos redes neurais convolucionais com face-api.js e descriptors Float32Array."

### Foco em Inovacao na Educacao Publica
O diferencial do Educatec e levar tecnologia de ponta para a educacao publica municipal. A comunicacao deve destacar que escolas publicas podem — e devem — ter ferramentas modernas de gestao.

**Frases-chave para uso em materiais:**
- "Tecnologia a servico da educacao publica"
- "Gestao educacional inteligente"
- "Dados que transformam a educacao"
- "Conectando escolas, professores e familias"
- "Inovacao com responsabilidade e seguranca"
- "Cada aluno acompanhado, nenhum deixado para tras"
- "Do papel ao digital: a evolucao da gestao escolar"

### Paleta de Comunicacao Visual
- **Cores primarias:** Verde esmeralda e azul-petróleo (modernidade, educacao, confianca)
- **Cor secundaria:** Azul marinho (institucionalidade, seriedade)
- **Cor de destaque:** Âmbar/dourado (atencao, alertas, conquistas)
- **Tipografia:** Limpa e legivel, sem serifas

---

*Documento gerado para uso em apresentacoes institucionais, treinamentos, NotebookLM e roteiro de video promocional do sistema Educatec — SEMED SSBV.*
