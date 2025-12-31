# SISAM - Sistema de Análise de Provas

Sistema completo para análise e gestão de dados de provas, com diferentes níveis de acesso e funcionalidades de importação e análise de dados.

**Repositório**: [sisam_ssbv](https://github.com/junielsonfarias/sisam_ssbv)

## 🚀 Funcionalidades

- **Sistema de Autenticação**: Login seguro com diferentes níveis de acesso
- **Gestão de Usuários**: Cadastro e gerenciamento de usuários (Administrador)
- **Gestão de Polos e Escolas**: Cadastro completo de polos e escolas
- **Importação de Dados**: Importação de arquivos Excel com dados de provas
- **Análise de Dados**: Filtros avançados para análise de resultados
- **Controle de Acesso**: Diferentes permissões por tipo de usuário

## 👥 Tipos de Usuários

### Administrador
- Acesso total ao sistema
- Gestão de usuários, polos, escolas e questões
- Importação de dados
- Análise completa de dados

### Técnico
- Acesso a todos os dados
- Importação de dados
- Análise completa de dados

### Polo
- Visualização apenas do polo designado
- Acesso a todas as escolas do polo
- Análise de dados do polo

### Escola
- Acesso apenas à escola vinculada
- Análise de dados da escola

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd SISAM
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:

   **Opção A: Usando Supabase (Recomendado)**
   
   O schema já foi aplicado no Supabase. Configure automaticamente:
   
   a. Configure o arquivo `.env` automaticamente:
   ```bash
   npm run configurar-env
   ```
   
   Ou configure manualmente no arquivo `.env`:
   ```env
   DB_HOST=db.cjxejpgtuuqnbczpbdfe.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=Master@sisam&&
   DB_SSL=true
   JWT_SECRET=sua-chave-secreta-super-segura
   NODE_ENV=development
   ```
   
   b. Teste a conexão:
   ```bash
   npm run testar-conexao-supabase
   ```
   
   c. O usuário administrador já foi criado:
      - **Email**: admin@sisam.com
      - **Senha**: admin123
   
   **Opção B: Banco Local (PostgreSQL)**
   
   ```bash
   # Criar banco e executar schema
   npm run setup-db
   
   # Criar usuário administrador
   npm run seed
   ```
   
   Configure o arquivo `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=sisam
   DB_USER=postgres
   DB_PASSWORD=sua-senha
   DB_SSL=false
   JWT_SECRET=sua-chave-secreta-super-segura
   NODE_ENV=development
   ```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse o sistema em: `http://localhost:3000`

## 🔐 Credenciais Padrão

Após executar o seed, um usuário administrador padrão será criado:
- **Email**: admin@sisam.com
- **Senha**: admin123

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro acesso!

## 📚 Documentação Adicional

- [Configuração Completa do Supabase](docs/CONFIGURAR_SUPABASE_COMPLETO.md)
- [Instruções Rápidas Supabase](docs/INSTRUCOES_RAPIDAS_SUPABASE.md)

## 📊 Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas principais:
- `usuarios`: Usuários do sistema
- `polos`: Polos educacionais
- `escolas`: Escolas vinculadas aos polos
- `questoes`: Questões das provas
- `resultados_provas`: Resultados das provas dos alunos
- `importacoes`: Histórico de importações

## 📤 Importação de Dados

Para importar dados de provas:

1. Acesse a página de Importação (Administrador ou Técnico)
2. Selecione um arquivo Excel (.xlsx ou .xls)
3. O arquivo deve seguir a estrutura padrão com as seguintes colunas:
   - Código Escola / codigo_escola / Escola
   - Código Aluno / codigo_aluno / Aluno
   - Nome Aluno / nome_aluno / Nome
   - Código Questão / codigo_questao / Questão
   - Resposta / resposta / Resposta Aluno
   - Acertou (Sim/Não)
   - Nota
   - Data / data / Data Prova
   - Ano Letivo / ano_letivo / Ano
   - Série / serie / Serie
   - Turma / turma
   - Disciplina / disciplina
   - Área / area / Área Conhecimento

## 🎨 Tecnologias Utilizadas

- **Next.js 14**: Framework React
- **TypeScript**: Tipagem estática
- **PostgreSQL**: Banco de dados
- **TailwindCSS**: Estilização
- **bcryptjs**: Hash de senhas
- **jsonwebtoken**: Autenticação JWT
- **xlsx**: Leitura de arquivos Excel
- **lucide-react**: Ícones

## 📁 Estrutura do Projeto

```
SISAM/
├── app/                    # Páginas e rotas Next.js
│   ├── admin/             # Páginas do administrador
│   ├── tecnico/           # Páginas do técnico
│   ├── polo/              # Páginas do polo
│   ├── escola/            # Páginas da escola
│   ├── api/               # API Routes
│   └── login/             # Página de login
├── components/            # Componentes React
├── database/              # Scripts do banco de dados
├── lib/                   # Utilitários e tipos
└── public/                # Arquivos estáticos
```

## 🔒 Segurança

- Senhas são hasheadas com bcrypt
- Autenticação via JWT
- Controle de acesso por tipo de usuário
- Validação de dados no backend
- Proteção contra SQL Injection (usando prepared statements)

## 🚀 Preparação para Produção

Para preparar o sistema para produção, consulte o guia completo:

📖 **[Guia de Preparação para Produção](./docs/PREPARACAO_PRODUCAO.md)**

### Verificação Rápida

Execute o script de verificação antes do deploy:

```bash
npm run verificar-producao
```

### Variáveis de Ambiente Necessárias

Crie um arquivo `.env` com as seguintes variáveis:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sisam
DB_USER=postgres
DB_PASSWORD=sua-senha-forte
JWT_SECRET=chave-secreta-minimo-32-caracteres-aleatorios
NODE_ENV=production
```

⚠️ **IMPORTANTE**: 
- Use um `JWT_SECRET` forte e único em produção
- Nunca commite o arquivo `.env` no repositório
- Altere a senha padrão do administrador após o primeiro acesso

### Backup do Banco de Dados

```bash
# Criar backup
npm run backup

# Restaurar backup
npm run restore <arquivo-backup.dump>
```

## 📝 Licença

Este projeto é privado e de uso interno.

## 🤝 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.

