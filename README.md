# 📚 Library API

Backend em **Node.js** para gerenciamento de acervo de biblioteca com sistema de empréstimos e autenticação por perfil.

---

## 🚀 Tecnologias

- **Node.js** + **Express** — servidor HTTP
- **sql.js** — banco de dados SQLite puro JavaScript (sem dependências nativas)
- **bcryptjs** — hash de senhas
- **jsonwebtoken** — autenticação JWT
- **dotenv** — variáveis de ambiente
- **cors** — suporte a CORS

---

## ⚙️ Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env e defina um JWT_SECRET forte

# 3. Iniciar o servidor
npm start

# (desenvolvimento com hot reload)
npm run dev
```

O servidor sobe em `http://localhost:3000`

---

## 👥 Perfis de usuário

| Role | Descrição |
|------|-----------|
| `librarian` | Bibliotecário — gerencia livros, empréstimos e usuários |
| `member` | Membro — consulta livros e vê seus próprios empréstimos |

---

## 🔑 Autenticação

Todas as rotas (exceto registro e login) exigem o header:

```
Authorization: Bearer <token>
```

---

## 📋 Endpoints

### Auth

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/auth/register` | Público | Registrar novo membro |
| POST | `/auth/register-librarian` | Bibliotecário | Registrar novo bibliotecário |
| POST | `/auth/login` | Público | Login (retorna JWT) |
| GET | `/auth/me` | Autenticado | Dados do usuário logado |

#### Exemplos

**Registrar membro**
```json
POST /auth/register
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Login**
```json
POST /auth/login
{
  "email": "joao@email.com",
  "password": "senha123"
}
```
Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "name": "João Silva", "role": "member" }
}
```

---

### Livros `/books`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/books` | Autenticado | Listar livros (filtros: `title`, `author`, `available=true`) |
| GET | `/books/:id` | Autenticado | Detalhe do livro |
| POST | `/books` | Bibliotecário | Cadastrar livro |
| PUT | `/books/:id` | Bibliotecário | Editar livro |
| DELETE | `/books/:id` | Bibliotecário | Remover livro |

**Cadastrar livro**
```json
POST /books
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "978-0132350884",
  "publisher": "Prentice Hall",
  "year": 2008,
  "total_copies": 3
}
```

---

### Empréstimos `/loans`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/loans` | Autenticado | Listar empréstimos (filtros: `status`, `member_id`, `book_id`) |
| GET | `/loans/overdue` | Bibliotecário | Empréstimos vencidos |
| GET | `/loans/:id` | Autenticado | Detalhe do empréstimo |
| POST | `/loans` | Bibliotecário | Criar empréstimo |
| PATCH | `/loans/:id/return` | Bibliotecário | Registrar devolução |

**Criar empréstimo**
```json
POST /loans
{
  "book_id": 1,
  "member_id": 2,
  "due_days": 14
}
```

**Status possíveis:** `active` | `returned` | `overdue`

---

### Usuários `/users`

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/users` | Bibliotecário | Listar usuários (filtro: `role`) |
| GET | `/users/:id` | Autenticado* | Detalhe do usuário |
| GET | `/users/:id/loans` | Autenticado* | Histórico de empréstimos |
| PUT | `/users/:id` | Autenticado* | Atualizar dados |
| DELETE | `/users/:id` | Bibliotecário | Remover usuário |

*Membro só acessa os próprios dados.

---

## 🗂️ Estrutura do projeto

```
library-api/
├── src/
│   ├── config/
│   │   └── database.js        # Inicialização e helpers do SQLite
│   ├── controllers/
│   │   ├── authController.js  # Registro e login
│   │   ├── bookController.js  # CRUD de livros
│   │   ├── loanController.js  # Empréstimos e devoluções
│   │   └── userController.js  # Gestão de usuários
│   ├── middleware/
│   │   └── auth.js            # JWT authenticate + authorize
│   ├── routes/
│   │   ├── auth.js
│   │   ├── books.js
│   │   ├── loans.js
│   │   └── users.js
│   └── server.js              # Entry point
├── .env.example
└── package.json
```

---

## 📝 Primeiro acesso

1. Registre o primeiro membro via `POST /auth/register`
2. Faça login para obter o token
3. Para criar bibliotecários, faça login com um bibliotecário e use `POST /auth/register-librarian`

> **Dica:** Na primeira vez, registre um usuário e altere sua `role` diretamente no banco `database.sqlite` usando qualquer cliente SQLite para bootstrap.
