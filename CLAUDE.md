# Express Your Idea — notas para trabajar en este repositorio

Pizarra digital local-first (Electron + React + SQLite). Interfaz, código, comentarios y
documentación en **español**. Contexto completo en `docs/ARQUITECTURA-Y-DECISIONES.md` y el
alcance en `docs/MVP-0.1.md`.

## Reglas de arquitectura

- `packages/core` no importa nada de Electron, Node, React ni SQLite. Dominio, casos de uso
  (`ProjectService`), búsqueda y contrato `EyiApi`.
- `packages/editor` (React) solo habla con `EyiApi` mediante `useApi()`. Nunca importa Electron ni
  `node:*`: debe poder reutilizarse en la futura versión web.
- `packages/storage-sqlite` implementa los puertos de `core` con better-sqlite3 + Drizzle.
- `apps/desktop`: proceso principal, preload (solo `invoke` sobre la lista blanca `IPC` de
  `packages/core/src/api/contract.ts`) y empaquetado.
- Canal IPC nuevo: agregarlo a `IPC` y a `createIpcApi` en `contract.ts`, y registrarlo en
  `apps/desktop/src/main/ipc.ts` validando entradas con Zod y rutas con `guard.assert()`.

## Base de datos

- Cambios de esquema: editar `packages/storage-sqlite/src/schema/*.ts` y ejecutar
  `npm run db:generate`. SQL a mano (FTS, triggers): `npx drizzle-kit generate --custom`.
  Nunca editar una migración ya publicada.
- El texto buscable de un elemento va en `properties.plainText`, `title`, `caption` y `keywords`
  (lista): los triggers de `search_index` lo indexan solos.

## Usuario final

- Quien instala la app no es técnico: los errores se traducen con `friendlyMessage`/`serializeError`
  (`packages/core/src/domain/errors.ts`); los detalles van al log (`apps/desktop/src/main/logger.ts`).
- Si cambia algo visible para la persona usuaria, actualizar `GUIA-DE-USUARIO.md` y la ayuda de la app
  (`packages/editor/src/components/HelpDialog.tsx`).

## Comandos

- `npm install` (sin `package-lock.json`, a propósito: ver `.npmrc`), `npm run dev`, `npm test`,
  `npm run typecheck`, `npm run build`, `npm run dist:win`.
- Antes de cada commit: `npm test` y `npm run typecheck` sin errores.
- Al terminar una etapa: actualizar la tabla de estado del `README.md` y
  `docs/ARQUITECTURA-Y-DECISIONES.md`.

## Diseño

Papel con cuadrícula de puntos, tinta grafito, un único acento amarillo resaltador (`#FFD84D`),
tipografía Bricolage Grotesque incluida localmente (la app funciona sin internet). Tokens en
`packages/editor/src/styles/app.css`.
