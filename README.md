# Wayne Industries - Sistema de Operações e Segurança

Este é o projeto final desenvolvido para o curso DEV FULL STACK da Infinity School, com o objetivo de otimizar processos internos e melhorar a segurança da Wayne Enterprises. A aplicação web full stack inclui um sistema de controle de acesso com autenticação e autorização por papéis, gestão de inventário de recursos (equipamentos, veículos, dispositivos de segurança) e um dashboard de visualização.

## 🚀 Visão Geral do Projeto

O Sistema de Operações e Segurança da Wayne Industries é uma plataforma desenvolvida para atender aos requisitos de gerenciamento de recursos e controle de acesso, garantindo a eficiência operacional e a segurança das instalações.

**Funcionalidades Principais:**

* **Autenticação e Autorização:**
    * Login de usuários com diferentes níveis de acesso (Administrador de Segurança, Gerente, Funcionário).
    * Proteção de rotas e funcionalidades com base no papel do usuário (JWT - JSON Web Tokens).
* **Gestão de Recursos:**
    * Interface para adicionar, visualizar, editar e excluir recursos (equipamentos, veículos, dispositivos de segurança).
    * Detalhes como nome, tipo, número de série/placa, localização, status, e datas de aquisição/manutenção.
* **Dashboard de Operações:**
    * Painel visual com estatísticas sobre o total de recursos, recursos ativos, em uso e em manutenção.
    * Visão geral dos recursos por tipo e lista de próximas manutenções.

## 💻 Tecnologias Utilizadas

**Backend (API):**
* **Python:** Linguagem de programação principal.
* **Flask:** Microframework web para construção da API RESTful.
* **Flask-SQLAlchemy:** ORM (Object-Relational Mapper) para interação com o banco de dados.
* **SQLite:** Banco de dados simples e eficiente, ideal para desenvolvimento e prototipagem.
* **PyJWT:** Para implementação de JSON Web Tokens (JWT) para autenticação.
* **Bcrypt:** Para hash seguro de senhas.
* **Flask-CORS:** Para gerenciar requisições Cross-Origin Resource Sharing.
* **python-dotenv:** Para gerenciamento de variáveis de ambiente em desenvolvimento local.

**Frontend (Interface do Usuário):**
* **HTML5:** Estrutura da aplicação web.
* **CSS3:** Estilização da interface.
* **JavaScript (Vanilla JS):** Lógica interativa, manipulação do DOM e comunicação com a API.
* **Lovable:** Plataforma utilizada para auxiliar na geração do design e estrutura inicial do frontend.

## ⚙️ Como Rodar o Projeto Localmente

Siga estes passos para configurar e executar o projeto em seu ambiente local.

### **Pré-requisitos:**

* Python 3.9+ instalado.
* Navegador web moderno (Chrome, Firefox, Edge, etc.).

### **1. Estrutura do Projeto:**

Certifique-se de que a estrutura das suas pastas é a seguinte:

```
PROJETO_INFINITY_SCHOOL/
├── app/                  
│   ├── __init__.py       
│   ├── app.py           
│   ├── auth.py           
│   ├── config.py         
│   ├── models.py         
│   └── routes.py         
├── public/               
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── script.js
|   ├── favicon.icon    
│   └── index.html
├── .env                  
├── README.md            
└── requirements.txt      
```

### **2. Configuração do Backend:**

**a. Criar o Ambiente Virtual:**
Abra o terminal na pasta raiz do projeto (`PROJETO_INFINITY_SCHOOL/`).

```bash
python -m venv venv
```
**b. Ativar o Ambiente Virtual:**

* Windows:

```bash
venv\Scripts\activate
```

* macOS / Linux:

```bash
source venv/bin/activate
```

**c. Criar o arquivo `.env:`**

Na pasta raiz do projeto (`PROJETO_INFINITY_SCHOOL/`), crie um arquivo chamado `.env` e adicione a seguinte linha. Substitua `sua_chave_secreta_jwt_aqui` por uma string longa e aleatória (use uma ferramenta online para gerar se quiser).

```bash
JWT_SECRET_KEY=sua_chave_secreta_jwt_aqui_para_desenvolvimento
```

**d. Instalar Dependências Python:**

Com o ambiente virtual ativado:

```bash
pip install -r requirements.txt
```

**e. Inicializar o Banco de Dados (SQLite):**

Este passo criará o arquivo `site.db` e todas as tabelas.

Com o ambiente virtual ativado:

* Windows:

```bash
set FLASK_APP=app/app.py
```

* macOS / Linux:

```bash
export FLASK_APP=app/app.py
```

Em seguida, execute:

```bash
flask create-db
```

**f. Criar Usuários Iniciais:**

Este passo populará o banco de dados com usuários de demonstração.

Com o ambiente virtual ativado:

```bash
flask create-initial-users
```

Serão criados os usuários:

* admin: `admin` / `admin123`

* gerente: `gerente` / `gerente123`

* funcionario: `funcionario` / `funcionario123`

**g. Rodar o Servidor Flask:**

Com o ambiente virtual ativado:

```bash
flask run
```

O servidor estará rodando em `http://127.0.0.1:5000/`.


### **3. Configuração do Frontend:**


**a. Abrir o Frontend no Navegador:**


Navegue até a pasta `public/` dentro do seu projeto.
Abra o arquivo `index.html` diretamente no seu navegador (por exemplo, arrastando-o para a janela do navegador ou clicando duas vezes nele).

A URL no seu navegador será algo como `file:///C:/caminho/para/seu/projeto/public/index.html` ou se estiver usando um Live Server do VS Code, `http://127.0.0.1:5500/index.html`.

**b. URL da API no JavaScript:**

Certifique-se de que nos arquivos JavaScript do frontend (provavelmente `public/js/app.js` e `public/js/auth.js`), a `API_BASE_URL` esteja configurada para o ambiente local:

```bash 
const API_BASE_URL = 'http://localhost:5000/api';
```

## 🌐 Como Funciona (Fluxo da Aplicação)

**1. Acesso:** O usuário abre o `index.html` e é direcionado para a página de Login.

**2. Login:** O usuário insere suas credenciais. O frontend (`public/js/script.js`) envia essas credenciais via fetch (requisição POST) para a rota /api/auth/login do backend Flask.

**3. Autenticação (Backend):** O Flask verifica as credenciais no banco de dados SQLite. Se válidas, ele gera um JWT (JSON Web Token) e o retorna ao frontend, junto com os dados do usuário (ID, username, papel, nome).

**4. Sessão (Frontend):** O frontend armazena o JWT e o papel do usuário no `localStorage`.

**5. Navegação:** O usuário é redirecionado para o Dashboard ou a página de Recursos. Para cada requisição subsequente (Dashboard, recursos), o frontend inclui o JWT no cabeçalho `Authorization: Bearer <token>`.

**6. Autorização (Backend):** O backend (`app/auth.py`) verifica o JWT em cada requisição protegida e autoriza ou nega o acesso com base no papel do usuário.

**7. Gestão de Recursos:** Na página de Recursos, o frontend (`public/js/script.js`) faz requisições `GET`, `POST`, `PUT`, `DELETE` para a API `/api/resources` para gerenciar os recursos. A interface de usuário (botões, campos) se adapta ao papel do usuário.

**8. Dashboard:** Na página do Dashboard, o frontend busca dados agregados dos recursos via API (`/api/resources`) e os exibe em cards e listas para uma visão geral.
