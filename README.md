# photip

SPA mobile-first para buscar, navegar e favoritar fotos de eventos esportivos do
[fotop.com.br](https://fotop.com.br), usando busca por selfie.

## Arquitetura

```
[Browser: React SPA] <--mesma origem--> [Node.js backend (BFF)] <--HTTP--> [fotop.com.br]
```

O navegador do usuário só conversa com o backend photip (mesma origem, sem CORS). O
backend é quem mantém a sessão do fotop.com.br (`FOTOPSITESESSID`) por usuário, reenvia
a selfie para `salva-face`, busca a página de resultados e faz o parsing do HTML
(`.foto-item[data-id] a.fotoCorredor img`) devolvendo JSON limpo para o front.

- `backend/` — Node.js + TypeScript + Fastify. Proxy/scraper do fotop.com.br.
- `frontend/` — React + Vite + TypeScript. SPA mobile-first.

## Rodando localmente

```bash
npm install

# terminal 1
npm run dev:backend   # http://localhost:4000

# terminal 2
npm run dev:frontend  # http://localhost:5173 (proxy /api -> backend)
```

Acesse `http://localhost:5173/evento/{id}` (ex: `300101`).

## Fluxo implementado

1. `POST /api/eventos/:id/selfie` — garante a sessão fotop (visita `fotos/eventos?evento={id}`)
   e reencaminha a selfie (multipart) para `fotos/eventos/salva-face`.
2. `GET /api/eventos/:id/fotos` — busca `fotos/eventos/busca/evento/{id}/rc/{n}`, avançando
   `rc` enquanto cada página trouxer fotos com `data-id` novos. Hoje `rc/{n}` não pagina de
   verdade (toda página devolve o mesmo grid completo), então o backend para assim que uma
   página não traz nenhum id novo — evita duplicar o resultado 20x.
3. Frontend: upload de selfie → grid de fotos encontradas → visualizador em tela cheia com
   navegação por seta do teclado, swipe e botões → favoritos salvos em `localStorage` por
   evento (sem persistência no servidor, por ora).

Toda a cadeia de chamadas ao fotop.com.br loga via `request.log` (pino, já embutido no
Fastify): status HTTP, cookies de sessão, tamanho do HTML e se o grid foi encontrado —
essencial para depurar quando o site mudar algo sem aviso.

## Confirmado contra o fotop.com.br real

- **Resposta JSON do `salva-face`**: `{ imagem, idEvento, url, status }`, onde `url` é o path
  de `/fotos/eventos/busca/evento/{id}/rc/1` a ser buscado em seguida.
- **Grid de resultados** (`GET /fotos/eventos/busca/evento/{id}/rc/{n}`): cada card é
  `.foto-selecionar[data-id]` — não `.foto-item` (essa classe só aparece morta em `<script>`).
  Cards de vídeo usam a mesma classe (`data-tipo="video"`), então fotos são distinguidas pela
  miniatura estar em `span.fotoCorredor img.fotoDarkBlur` (vídeos não têm esse wrapper). O
  link do produto vem do `href` de `button.foto-detalhes`, não de um `<a>` na miniatura.
- **Zero resultados**: fotop renderiza `#resultado .alert_box.error` com uma mensagem
  ("Infelizmente não encontramos resultados para essa busca neste evento") em vez de qualquer
  markup de foto — o backend extrai esse texto e devolve em `message` no JSON de `/fotos`.

## Variáveis de ambiente (backend)

| Variável            | Padrão                     | Descrição                      |
|---------------------|----------------------------|--------------------------------|
| `PORT`              | `4000`                     | Porta do backend               |
| `FRONTEND_ORIGIN`   | `http://localhost:5173`    | Origem liberada no CORS        |
