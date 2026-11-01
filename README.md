# Nexora

Front-end de Customer Intelligence em React 19, TypeScript, Vite, Tailwind CSS 4 e React Aria. O estado é local (localStorage) e os dados de exemplo vivem em `src/lib/seed.ts`; não há backend.

## Rodando o projeto

```bash
npm install
cp .env.example .env
npm run dev
```

Scripts:

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # tsc -b + vite build
npm run lint     # oxlint
npm run preview  # prévia do build
```

## Login com Google

O botão **Continuar com Google** usa o Google Identity Services oficial (`https://accounts.google.com/gsi/client`), carregado sob demanda somente na tela de login. Não há biblioteca adicional.

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um **OAuth client ID** do tipo **Web application**.
2. Em **Authorized JavaScript origins**, cadastre as origens que abrirão o app, sem barra no final:
   - `http://localhost:5173` (ou a porta usada pelo Vite)
   - `https://SEU-SERVICO.onrender.com`
3. Copie o Client ID para o `.env`:

```bash
VITE_GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
```

4. Reinicie o servidor do Vite depois de alterar o `.env`.

O app decodifica apenas o payload do JWT devolvido pelo Google para montar a sessão (nome, e-mail e foto). Como não existe backend, o token não é validado no servidor; em produção essa validação é obrigatória. Sem `VITE_GOOGLE_CLIENT_ID`, o botão continua visível e mostra uma mensagem amigável em vez de quebrar.

## Acesso administrativo

Os e-mails com papel de administrador ficam em `VITE_ADMIN_EMAILS`, separados por vírgula:

```bash
VITE_ADMIN_EMAILS=voce@empresa.com,outra.pessoa@empresa.com
```

Ao entrar com um desses e-mails (Google ou formulário), a sessão recebe o papel `admin`. O menu do usuário mostra o selo **Admin** e o item **Administração**, que abre `#/admin`. Nessa área é possível ver todas as organizações, o plano, a quantidade de contas, os usuários de cada organização e usar **Entrar como** para trocar de organização/perfil.

Usuários comuns não acessam a rota: `#/admin` redireciona para `#/dashboard`.

> **Importante:** como o projeto não tem backend, a checagem de administrador é apenas de interface. Ela não é uma barreira de segurança real; a autorização definitiva precisa ser validada no servidor.

## Estrutura

```
src/
  components/
    admin/          painel interno (carregado com React.lazy)
    auth/           LoginCard, GoogleButton e LoginForm
    base/           componentes BoardUI
    nexora/         componentes de domínio
    shell/          sidebar, topbar e layout autenticado
  lib/
    admin.ts        lista de e-mails administrativos
    google.ts       carregamento do GSI e leitura do credential
    session.ts      montagem da sessão a partir do e-mail
    store.tsx       estado global e persistência
    seed.ts         dados de demonstração
  pages/            páginas da aplicação
```

## Dados locais

O estado é salvo em `nexora:state:v1` no localStorage. Para voltar aos dados de exemplo, use a opção de restaurar demonstração em Configurações ou limpe essa chave no navegador. O tema é salvo em `boardui:theme`.
