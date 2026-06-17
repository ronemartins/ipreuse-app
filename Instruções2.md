# Instruções de Setup - IpReuse Platform

Guia completo e atualizado para configurar e executar o projeto IpReuse em um novo computador.

---

## 📋 Pré-requisitos

Você precisará de:
- Windows 10 ou superior
- Acesso à internet para baixar dependências
- Permissões de administrador para instalar softwares

---

## 🔧 Passo 1: Instalar Node.js com npm

### 1.1 Baixar Node.js LTS

1. Acesse [https://nodejs.org/](https://nodejs.org/)
2. Baixe a versão **LTS (Long Term Support)** (recomendado)
3. Execute o instalador `.msi` e siga os passos

### 1.2 Verificar instalação

Abra o **PowerShell** e execute:

```powershell
node --version
npm --version
```

Você deve ver versões como:
- `v18.x.x` ou `v20.x.x` (Node.js)
- `9.x.x` ou superior (npm)

---

## 🐳 Passo 2: Instalar Docker Desktop

### 2.1 Baixar Docker Desktop

1. Acesse [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Clique em **"Download for Windows"**
3. Execute o instalador e siga os passos

### 2.2 Iniciar Docker

Após a instalação:
1. Abra o **Docker Desktop** (aparecerá no menu Iniciar do Windows)
2. Aguarde até que o ícone do Docker fique verde na bandeja do sistema
3. Abra o **PowerShell** e verifique:

```powershell
docker --version
docker ps
```

Ambos os comandos devem funcionar sem erros.

---

## 📁 Passo 3: Preparar o projeto

### 3.1 Descompactar (se via WinRAR)

Se você recebeu o projeto comprimido:
1. Clique com botão direito no arquivo `.rar` ou `.zip`
2. Selecione **"Extrair aqui"**
3. Uma pasta `IpReuse` será criada

### 3.2 Entrar na pasta do projeto

Abra o **PowerShell** e navegue até a pasta:

```powershell
cd "C:\caminho\para\IpReuse"
```

Ou se você extraiu do OneDrive:

```powershell
cd "C:\Users\[SeuNome]\OneDrive\Documents\GitHub\IpReuse"
```

---

## 📦 Passo 4: Instalar dependências

### 4.1 Frontend

```powershell
cd "ipreuse-app - Copia"
npm install
```

> ℹ️ Isso pode levar 2-5 minutos na primeira vez

### 4.2 Backend

Abra uma nova janela/aba do PowerShell e execute:

```powershell
cd "C:\caminho\para\IpReuse\backend"
npm install
```

---

## 🗄️ Passo 5: Iniciar o banco de dados

Na pasta raiz do projeto (`IpReuse`), execute:

```powershell
docker-compose up -d
```

Isso iniciará:
- PostgreSQL (porta 5432)
- Backend (no Docker, porta 3000)

Verifique se está rodando:

```powershell
docker ps
```

Você deve ver dois containers:
- `ipreuse-db-1` (PostgreSQL)
- `ipreuse-backend-1` (Node.js Backend)

### ⚠️ Se o backend não iniciar no Docker

Execute o backend localmente com npm:

```powershell
cd backend
npm run build
npm start
```

---

## 🚀 Passo 6: Iniciar o Frontend

Abra uma nova janela/aba do PowerShell:

```powershell
cd "ipreuse-app - Copia"
npm run dev
```

Você verá uma mensagem como:
```
VITE v6.3.5 ready in 302 ms

➜  Local:   http://localhost:8080
```

---

## ✅ Passo 7: Acessar a aplicação

1. Abra seu navegador (Chrome, Firefox, Edge)
2. Acesse: **http://localhost:8080**
3. Use as credenciais de teste:
   - **Email:** `joao.silva@ufsc.br`
   - **Senha:** `senha123`

---

## 🧪 Verificar se tudo está funcionando

### Verificar Backend

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

Resposta esperada:
```json
{"status":"ok","message":"Backend is running"}
```

### Verificar Frontend

Abra no navegador:
```
http://localhost:8080
```

Você deve ver a página de login com a logo do IpReuse.

---

## 📝 Estrutura do projeto

```
IpReuse/
├── docker-compose.yml        # Configuração do Docker
├── init-db.sql               # Script de inicialização do banco
├── backend/                  # API Node.js/Express
│   ├── src/
│   │   ├── index.ts          # Servidor principal
│   │   └── db/               # Conexão com banco
│   ├── package.json
│   └── tsconfig.json
├── ipreuse-app - Copia/      # Frontend React/Vite
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── INSTRUCOES.md             # Instruções originais
```

---

## 🔄 Próximos passos após o setup

1. **Login:** Use as credenciais acima
2. **Explorar Dashboard:** Veja grupos, IPs, permissões
3. **Testar Upload:** Vá para "Detalhes do IP" e faça upload de arquivos
4. **Criar novo usuário:** Na página "Administrador"

---

## 🐛 Troubleshooting

### Erro: "Porta 3000 já está em uso"
```powershell
Get-NetTCPConnection -LocalPort 3000 | Stop-Process -Force
docker-compose up -d backend
```

### Erro: "Docker daemon not running"
1. Abra Docker Desktop
2. Aguarde a barra carregar completamente (ficar verde)
3. Tente novamente

### Erro: "npm: command not found"
1. Reinstale Node.js
2. Feche e reabra o PowerShell após instalar
3. Verifique com `npm --version`

### Erro: "Cannot connect to database"
1. Verifique se Docker está rodando: `docker ps`
2. Se PostgreSQL não está em containers, inicie: `docker-compose up -d`
3. Aguarde 5 segundos para o banco inicializar

### Frontend não aparece
1. Verifique se está rodando: `npm run dev` na pasta `ipreuse-app - Copia`
2. Não feche a janela do terminal
3. Acesse `http://localhost:8080` novamente

### Erro ao fazer login
1. Verifique credenciais: `joao.silva@ufsc.br` / `senha123`
2. Verifique se o backend está online (passo 7)
3. Abra a aba "Console" do navegador (F12) para ver erros detalhados

---

## 📌 Dicas importantes

✅ **Manter tudo rodando:**
- Mantenha o Docker Desktop aberto
- Mantenha as abas do terminal com frontend e backend abertas
- Não feche as janelas dos comandos em execução

✅ **Porta padrão:**
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`
- Banco de dados: `localhost:5432`

✅ **Parar tudo:**
```powershell
# Parar containers
docker-compose down

# Parar processos Node.js
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

✅ **Reiniciar tudo:**
```powershell
cd "C:\caminho\para\IpReuse"
docker-compose up -d
cd backend
npm start
# Nova aba:
cd "ipreuse-app - Copia"
npm run dev
```

---

## 📞 Suporte rápido

| Problema | Solução |
|----------|---------|
| Nada funciona | Reinicie Docker Desktop e rode `docker-compose up -d` |
| Login não funciona | Verifique backend com `Invoke-WebRequest http://localhost:3000/api/health` |
| Upload não funciona | Abra console do navegador (F12) e verifique erros |
| Página em branco | Limpe cache do navegador ou acesse em modo incógnito |

---

**Última atualização:** Março de 2026
**Versão do Node.js testada:** 18.x ou superior
**Docker testado:** 29.2.1 ou superior
