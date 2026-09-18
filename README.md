# Ghost Copier — Painel

Painel web (TanStack Start + React + TypeScript + Tailwind CSS) com telas ao
vivo, Play Fake, assistente IA, tela live fullscreen para celular e módulo de
QR Code para APK.

## Stack

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase (banco, auth e storage)

## Variáveis de ambiente (Netlify)

Configure em **Site settings → Environment variables**:

| Variável | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase (cliente, build) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publishable/anon (cliente, build) |
| `SUPABASE_URL` | URL do projeto Supabase (servidor) |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable/anon (servidor) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role — **necessária para criar logins** |
| `ADMIN_USERNAME` | Usuário do administrador (criado automaticamente no 1º acesso) |
| `ADMIN_PASSWORD` | Senha do administrador (criado automaticamente no 1º acesso) |

> **Importante:** sem `ADMIN_USERNAME` e `ADMIN_PASSWORD` nenhum login de
> administrador é criado, então não há como entrar no painel nem criar novos
> usuários. Defina os dois, faça o deploy e acesse a tela de login uma vez com
> essas credenciais — o admin é criado sozinho nesse primeiro acesso.

Após adicionar/alterar variáveis, faça um novo deploy (Trigger deploy → Clear
cache and deploy) para elas entrarem no build.

## Banco de dados

As migrações ficam em `supabase/migrations/`. Rode o SQL manualmente no
**Supabase → SQL Editor** (o Netlify não roda migrações automaticamente).

## Independência do Lovable

Este projeto foi desacoplado do Lovable: a configuração do Vite é padrão
(TanStack Start + React + Tailwind + Nitro) e as dependências são instaladas a
partir do registro público do npm. O lockfile é gerado no primeiro `install`
do deploy.
