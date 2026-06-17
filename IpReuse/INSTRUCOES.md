# Guia de Configuração e Execução - IP Reuse

Este guia contém as instruções passo a passo para instalar as dependências e executar o projeto (Backend + Banco de Dados + Frontend) em uma máquina **Windows (x64)**.

---

## 📋 1. Pré-requisitos (Dependências a instalar)

Para rodar o projeto localmente no Windows, você precisará instalar as seguintes ferramentas:

1. **Node.js (LTS)**
   - O Node.js é necessário para rodar e gerenciar os pacotes do frontend.
   - **Download:** [Acesse o site oficial (https://nodejs.org/)](https://nodejs.org/) e baixe a versão **LTS (Recommended for Most Users)** para Windows x64.
   - Instale avançando todas as etapas padrão (o `npm` será instalado automaticamente junto com ele).

2. **Docker Desktop**
   - Usado para subir o Banco de Dados (PostgreSQL) e o servidor de Backend através de contêineres e de forma simplificada, sem precisar instalar o Postgres diretamente na máquina.
   - **Download:** [Acesse o Docker Desktop (https://www.docker.com/products/docker-desktop/)](https://www.docker.com/products/docker-desktop/) e baixe o instalador para Windows.
   - **Dica:** Durante a instalação, mantenha habilitada a opção para usar o "WSL 2" (Windows Subsystem for Linux), pois oferece mais performance no Windows.

3. **Git (Opcional, mas recomendado)**
   - Caso precise clonar ou gerenciar o repositório. Use o [Git for Windows](https://gitforwindows.org/).

---

## 🚀 2. Passo a Passo para Executar o Projeto

Após instalar as ferramentas acima, siga estes passos.

### Passo 2.1: Iniciar o Docker
Abra o aplicativo **Docker Desktop** no seu Windows e aguarde até que o ícone na bandeja do sistema diga que a engine está rodando (fica verde).

### Passo 2.2: Subir o Backend e o Banco de Dados

1. Abra o **PowerShell**, **Terminal do Windows** ou o terminal integrado do seu VS Code.
2. Navegue até a pasta raiz do projeto de Backend/Docker (onde está o arquivo `docker-compose.yml`):
   ```powershell
   cd C:\Caminho\Para\IpReuse
   ```
   *(Substitua `C:\Caminho\Para\IpReuse` pelo diretório onde está a pasta matriz do seu projeto, onde se encontra o arquivo `docker-compose.yml`)*
3. Suba a infraestrutura executando o seguinte comando:
   ```powershell
   docker-compose up --build -d
   ```
   > 💡 **Nota:** A flag `-d` roda o backend e o banco de maneira "desanexada" (em segundo plano). O docker fará o download da imagem do PostgreSQL (caso não a tenha), criará a estrutura no banco, preencherá com dados base e rodará o backend na porta **3000**.

### Passo 2.3: Iniciar o Frontend

Com o backend rodando, é hora de ligar a aplicação que roda no navegador (React/Vite).

1. Abra um **novo** terminal (ou use a mesma janela de terminal do passo anterior, já que o docker está rodando em segundo plano).
2. Entre na pasta do frontend:
   ```powershell
   cd "ipreuse-app - Copia"
   ```
   *(Se a pasta tiver outro nome, ajuste conforme necessário)*
3. Instale todas as bibliotecas e dependências do projeto executando:
   ```powershell
   npm install
   ```
4. Em seguida, inicie o servidor de desenvolvimento:
   ```powershell
   npm run dev
   ```
5. O terminal vai exibir uma mensagem indicando o endereço local. O servidor Vite foi configurado para rodar na porta **8080**.

---

## 🌐 3. Acessando e Testando a Aplicação

- Abra o seu navegador (Chrome, Edge, Firefox, etc.) e acesse:
  **[http://localhost:8080](http://localhost:8080)**
- A aplicação irá conectar automaticamente com a API (`/api/ips`, etc.) que o Vite estará redirecionando para a porta 3000 em segundo plano.

### Entrando no sistema
Para testar a tela de login real que se conecta com o Banco de Dados, você pode usar um dos usuários de teste já registrados inicialmente pela nossa configuração do banco:

- **E-mail:** `joao.silva@ufsc.br`
- **Senha:** `senha123`

---

## 🛑 Como Desligar a Aplicação

Quando você não quiser mais usar o projeto:
1. **Frontend:** No terminal onde digitou `npm run dev`, pressione `Ctrl + C` para fechar a aplicação local e confirme com `S` (Sim).
2. **Backend/Banco (Docker):** Pelo terminal, na pasta onde se encontra o `docker-compose.yml`, rode:
   ```powershell
   docker-compose down
   ```
   *(Isso para os serviços sem apagar os dados armazenados).* Se o seu computador for reiniciar de qualquer maneira, não tem problema ignorar isso e apenas fechar o Docker Desktop.

---

### Dúvidas Frequentes

- **O comando "npm" não é reconhecido:** Certifique-se de que instalou o Node.js e que reiniciou o seu terminal ou VS Code para que ele detecte a instalação.
- **O Docker acusa erro na porta 5432 ou 3000:** Feche qualquer outra aplicação ou banco local (como PgAdmin) rodando previamente usando a porta 5432.
