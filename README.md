# AdTrack — SaaS de Rastreamento de Performance de Vendas e Anúncios

Monorepo (pnpm + Turborepo) com:

- `apps/web` — Next.js (App Router): dashboard, CRM, onboarding, billing UI
- `apps/api` — NestJS: auth, core API, CRM, billing, attribution engine, ingestion/workers
- `packages/database` — Prisma schema + client compartilhado entre `web` e `api`

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker (para Postgres + Redis locais)

## Setup inicial

```bash
# 1. instalar dependências
pnpm install

# 2. subir Postgres e Redis
docker compose up -d

# 3. copiar variáveis de ambiente
cp .env.example .env
# edite .env se necessário (segredos, chaves de integração)

# 4. gerar client do Prisma e rodar a primeira migration
pnpm db:generate
pnpm --filter @adtrack/database exec prisma migrate dev --name init

# 5. (opcional) popular planos iniciais
pnpm --filter @adtrack/database seed

# 6. subir tudo em modo dev (web na porta 3000, api na porta 3333)
pnpm dev
```

## Scripts úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` | sobe `web` + `api` em modo desenvolvimento (via Turborepo) |
| `pnpm build` | build de produção de todos os apps |
| `pnpm db:generate` | gera o Prisma Client |
| `pnpm db:migrate` | roda `prisma migrate dev` |
| `pnpm db:studio` | abre o Prisma Studio (GUI do banco) |

## Roadmap

- [x] Etapa 1 — arquitetura, schema, fórmulas
- [x] Etapa 2 — setup do projeto (este commit)
- [ ] Etapa 3 — autenticação multi-tenant
- [ ] Etapa 4 — integração Meta Ads
- [ ] Etapa 5 — integração checkout (webhook genérico → Kiwify/Hotmart)
- [ ] Etapa 6 — motor de atribuição
- [ ] Etapa 7 — dashboard principal
- [ ] Etapa 8 — CRM, alertas, billing/white-label
