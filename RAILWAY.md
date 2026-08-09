# Deploy no Railway

Este projeto sobe como **dois serviços** dentro do mesmo projeto Railway:

1. **`web`** — o processo Node único (Fastify) que serve a API (`/api/*`) **e** o build
   estático do frontend (mesma origem, sem CORS — ver `backend/src/server.ts`). Builder
   NIXPACKS, configurado por [`railway.json`](railway.json) na raiz do repo.
2. **`MySQL`** — o serviço de banco de dados **verificado do próprio Railway** ("+ New →
   Database → Add MySQL"), não mais um Dockerfile próprio: ele já vem com volume
   persistente e healthcheck configurados automaticamente, então não há mais nada pra
   fazer nesse ponto. A única coisa que exige um passo manual é
   `innodb_ft_min_token_size=2` — sem ele, o índice FULLTEXT (`eventos_busca_fulltext`)
   descarta tokens de 2 caracteres como "5k", "8k" e UFs, e a busca diverge
   silenciosamente entre dev e prod (ver comentário no `docker-compose.yml` e em
   `backend/src/db/fulltextMaintenance.ts`). O template do Railway não expõe essa flag
   por variável de ambiente, então ela precisa ser adicionada ao **Custom Start Command**
   do serviço (Settings → Deploy) — ver passo 1.3 abaixo. **Isso ainda não foi validado
   nem localmente nem no painel do Railway** (a troca de MariaDB pra MySQL foi feita só
   nos arquivos de config, sem Docker disponível neste ambiente pra testar); antes de
   confiar na busca em produção, confirme com
   `SHOW VARIABLES LIKE 'innodb_ft_min_token_size'` — local via `docker compose up` e,
   depois do primeiro deploy, via `railway connect` no serviço `MySQL`.

Não existe deploy separado de "frontend" — o SPA é servido pelo mesmo processo backend,
de propósito (evita os problemas de cookie cross-site que `SameSite=Lax` teria em
domínios diferentes; ver `README.md`).

## Passo a passo

### 1. Criar o projeto e o serviço `MySQL`

1. No painel Railway, crie um projeto novo e conecte este repositório GitHub.
2. Clique **"+ New" → "Database" → "Add MySQL"**. O Railway provisiona o serviço com
   volume persistente, healthcheck e as variáveis `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`,
   `MYSQLPASSWORD`, `MYSQLDATABASE` e `MYSQL_URL` automaticamente — nada pra configurar
   manualmente aqui, ao contrário do setup anterior com Dockerfile próprio.
3. Anote o nome do serviço (por padrão `MySQL`; se você renomear, ajuste as referências
   `${{MySQL.…}}` no passo 2 abaixo de acordo). Vá em **Settings → Deploy → Custom Start
   Command** e adicione a flag `--innodb-ft-min-token-size=2` ao comando existente
   (preserve as flags que o template já define, ex. `--innodb-use-native-aio=0
   --disable-log-bin --performance_schema=0` — apenas acrescente a nova no final).
   Redeploy o serviço depois de salvar.
4. Confirme nos logs que o MySQL subiu sem erro e valide a flag (via `railway connect` ou
   `railway run --service MySQL mysql -u root -p"$MYSQLPASSWORD" -e "SHOW VARIABLES LIKE
   'innodb_ft_min_token_size'"`) antes de seguir — ver aviso na seção acima.

### 2. Criar o serviço `web`

1. Adicione outro serviço a partir do mesmo repo, **Root Directory** = raiz do repo (o
   `railway.json` já configura build/start/healthcheck automaticamente — não precisa
   mexer em builder).
2. Em **Variables**, defina:

   | Variável | Valor | Observação |
   |---|---|---|
   | `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` | referência direta à connection string que o serviço `MySQL` já expõe via rede privada Railway; confirme que o schema é `mysql://` (Prisma exige) antes do primeiro deploy — se não for, monte manualmente com `mysql://${{MySQL.MYSQLUSER}}:${{MySQL.MYSQLPASSWORD}}@${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}` |
   | `NODE_ENV` | `production` | **obrigatório** — sem isso os cookies de sessão (`potof_sid`, `potof_admin_sid`) sobem sem `Secure`, ver `backend/src/routes/eventos.ts` e `routes/admin/auth.ts` |
   | `ADMIN_SESSION_SECRET` | gere com `openssl rand -hex 32` | assina o cookie de sessão do admin |
   | `ADMIN_SEED_EMAIL` | email do primeiro admin | só usado pelo seed (passo 3) |
   | `ADMIN_SEED_PASSWORD` | senha forte | idem — marque como *sensitive* |
   | `SYNC_SCHEDULER_ENABLED` | `true` | sync automático de catálogo dos provedores roda dentro do próprio processo (ver `providers/scheduler.ts`) — não precisa de cron externo no Railway |
   | `SYNC_INTERVAL_HOURS` | `6` | ajuste se quiser outro intervalo |
   | `FEATURE_AI_PHOTO_EDIT` | `true` | efeitos de IA habilitados |
   | `AI_PROVIDER` | `openai` (ou `gemini`) | escolha o provedor |
   | `OPENAI_API_KEY` | sua chave OpenAI | obrigatório se `AI_PROVIDER=openai`; marque como *sensitive* |
   | `GEMINI_API_KEY` | sua chave Gemini | só se for usar `AI_PROVIDER=gemini` |
   | `FRONTEND_ORIGIN` | preencha depois do passo 3 | ver nota abaixo |

   Não defina `PORT` — o Railway injeta a própria e o app já lê `process.env.PORT`
   (`backend/src/server.ts`).
3. Faça o deploy. Depois que ele subir, vá em **Settings → Networking → Generate Domain**
   para obter a URL pública (ex.: `potof-production.up.railway.app`). Volte em
   **Variables** e ajuste `FRONTEND_ORIGIN` para essa URL — como front e back estão na
   mesma origem em produção, essa variável não é usada para bloquear nada no caminho
   normal, mas é o valor que `@fastify/cors` espera caso algum dia exista uma origem
   separada (preview environment, domínio alternativo etc.), então mantenha-a correta.
4. Confirme o healthcheck: `railway.json` já aponta para `GET /api/health`.

### 3. Popular o banco (uma vez, após o primeiro deploy)

O `start` do backend (`prisma migrate deploy && node dist/server.js`) já aplica as
migrations sozinho a cada boot. Mas o **seed** (admin, provedores, categorias com ícones)
não roda automaticamente — rode uma vez via Railway CLI:

```bash
railway link            # conecta ao projeto (escolha o serviço "web")
railway run --service web npm run prisma:seed --workspace backend
```

O script (`backend/prisma/seed.ts`) é idempotente (usa `upsert` / checa existência antes
de criar), então rodar de novo depois de um redeploy não duplica nada nem quebra.

### 4. Verificar

- `https://<seu-dominio>/api/health` → `{"status":"ok"}`.
- `https://<seu-dominio>/admin` → login com `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.
- `https://<seu-dominio>/evento/300101` (ou outro id existente) → fluxo de busca por selfie.
- Logs do serviço `web` ~1 min após o boot devem mostrar o primeiro ciclo do sync
  scheduler (`sync scheduler: sincronização automática concluída`).

## Variáveis — referência completa

Ver [`backend/.env.example`](backend/.env.example) para a lista com os comentários
originais de cada variável (usado em dev; em produção o `.env` não existe, tudo vem do
painel do Railway).

## Notas

- **Réplicas**: o `railway.json` não define `numReplicas` (fica em 1). Se algum dia
  escalar para mais de uma réplica, mover `prisma migrate deploy` do `startCommand` para
  `deploy.preDeployCommand` evita que múltiplas réplicas tentem migrar ao mesmo tempo —
  não fiz essa mudança agora porque não há necessidade concreta dela hoje.
- **Manutenção do índice FULLTEXT**: `rebuildEventosFulltextIndex` (ver
  `backend/src/db/fulltextMaintenance.ts`) já roda sozinho depois de cada sync completo —
  nenhuma ação manual necessária em produção.
- **`ai-photo-test/`**: é uma ferramenta de dev (`workspace` no `package.json` raiz), não
  entra no build de produção (`npm run build` só builda `backend` e `frontend`), mas
  `npm install` na raiz ainda instala suas dependências. Sem impacto funcional, só builda
  um pouco mais devagar — não vale a complexidade de excluir agora.
