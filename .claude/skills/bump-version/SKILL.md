---
name: bump-version
description: >
  Bump this project's semver version (major.minor.patch) across every package.json in the repo
  and confirm where the new version surfaces in the UI. Use whenever the user asks to bump/update
  the app or project version, cut a release, or increment major/minor/patch — e.g. "atualizar
  versão", "incrementar versão", "bump version", "nova release". Always determines which of
  major/minor/patch to increment before touching any file — asks the user if it wasn't given as
  an argument.
allowed-tools: Read, Edit
---

# Bump version (semver)

Este projeto guarda a versão da aplicação em três `package.json`, que devem sempre ficar
sincronizados:

- `package.json` (raiz do workspace) — fonte canônica.
- `backend/package.json`
- `frontend/package.json` — é o único que efetivamente alimenta a UI: `frontend/vite.config.ts`
  lê esse campo em build-time e injeta como a constante global `__APP_VERSION__`, exibida no
  sidebar do admin (`frontend/src/admin/AdminLayout.tsx`) e no rodapé do nav drawer
  (`frontend/src/components/NavDrawer.tsx`).

Não existe um quarto lugar (CHANGELOG, env var, etc.) guardando a versão — só esses três campos.

## 1. Determinar o tipo de incremento

O argumento passado para a skill deve ser `major`, `minor` ou `patch`, dizendo qual parte do
semver incrementar:

- **major** — mudança incompatível/breaking. Reseta minor e patch para `0`.
- **minor** — nova funcionalidade compatível. Reseta patch para `0`, mantém major.
- **patch** — correção/ajuste compatível. Só incrementa o patch.

Se a skill foi invocada sem argumento reconhecível (nenhum dos três valores), **pergunte ao
usuário** com a AskUserQuestion tool antes de tocar em qualquer arquivo — ofereça as três opções
acima com a explicação de cada uma. Nunca chute o tipo de incremento.

## 2. Ler a versão atual

Leia o campo `"version"` de `package.json` (raiz) — é a fonte canônica para efeito de cálculo.
Confira também `backend/package.json` e `frontend/package.json`: se algum dos três já estiver
com um valor diferente da raiz (dessincronizado), avise o usuário antes de prosseguir em vez de
assumir qual dos três está certo — pode ser sinal de um bump anterior incompleto.

## 3. Calcular a nova versão

A partir de `<major>.<minor>.<patch>` atual:

| Incremento | Nova versão |
|---|---|
| patch | `<major>.<minor>.<patch+1>` |
| minor | `<major>.<minor+1>.0` |
| major | `<major+1>.0.0` |

## 4. Aplicar nos três arquivos

Edite o campo `"version"` nos três `package.json` (raiz, `backend/`, `frontend/`) para o novo
valor — sempre os três juntos, nunca só um, para não reintroduzir a dessincronização do passo 2.

## 5. Confirmar

Informe ao usuário a versão antiga → nova e o tipo de incremento aplicado. Lembre que o valor só
aparece de fato na UI (sidebar do admin e rodapé do nav drawer) depois de um rebuild do frontend.

Não crie commit automaticamente — siga as diretrizes gerais do projeto sobre git: só commite se o
usuário pedir explicitamente.
