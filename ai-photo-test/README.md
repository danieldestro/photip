# ai-photo-test

Programa standalone para testar a geração de imagens com IA (efeitos de foto) sem
precisar subir o backend nem o frontend do photip.

Reusa diretamente o mecanismo do backend — `backend/src/ai/photoEffects.ts` e
`backend/src/ai/prompts.json` — então qualquer alteração feita lá (novo efeito, prompt
ajustado, novo provedor) já vale aqui também, sem duplicação.

## Setup

```bash
# na raiz do repo, se ainda não tiver feito
npm install
```

Usa as mesmas variáveis do `backend/.env` (`AI_PROVIDER`, `OPENAI_API_KEY`,
`GEMINI_API_KEY` — veja `backend/.env.example`), então se o backend já está configurado
localmente não precisa duplicar nada.

Coloque uma ou mais fotos de teste em `ai-photo-test/samples/` (a pasta é ignorada pelo
git — as fotos ficam só localmente).

## Uso

```bash
# roda todos os efeitos definidos em prompts.json sobre a mesma foto
npm run generate --workspace ai-photo-test -- --image samples/minha-foto.jpg

# roda só um efeito
npm run generate --workspace ai-photo-test -- --image samples/minha-foto.jpg --effect superhero

# força um provedor específico (sobrescreve o AI_PROVIDER do backend/.env)
npm run generate --workspace ai-photo-test -- --image samples/minha-foto.jpg --effect military --provider gemini

# escolhe onde salvar (default: ai-photo-test/output/)
npm run generate --workspace ai-photo-test -- --image samples/minha-foto.jpg --out /tmp/saida

# loga a request completa (url, headers, params) e a response completa (headers,
# dado original retornado pela API) de cada chamada — útil pra depurar o que o
# provedor está realmente recebendo/devolvendo. Também salva cada uma em
# <out>/debug/*.json (o console trunca bodies grandes, o arquivo tem tudo).
npm run generate --workspace ai-photo-test -- --image samples/minha-foto.jpg -X

# via Makefile (raiz do repo), equivalente:
make ai EFFECT=military X=1
```

Os arquivos gerados são salvos como `<nome-da-foto>_<efeito>.<ext>` em
`ai-photo-test/output/` (também ignorada pelo git).

Efeitos disponíveis: os mesmos definidos em `AI_EFFECTS` em
`backend/src/ai/photoEffects.ts` (`remove_people`, `superhero`, `military`,
`artistic`). Para ajustar o texto de um prompt existente ou adicionar um efeito
novo, edite `prompts.json` e `AI_EFFECTS` — não precisa mexer neste programa.
