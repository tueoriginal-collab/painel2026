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

Após adicionar/alterar variáveis, faça um novo deploy (Trigger deploy → Clear
cache and deploy) para elas entrarem no build.

## Banco de dados

As migrações ficam em `supabase/migrations/`. Rode o SQL manualmente no
**Supabase → SQL Editor** (o Netlify não roda migrações automaticamente).
