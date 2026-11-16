# Express Your Idea — Guía de desarrollo

Pizarra digital local-first para capturar, organizar y desarrollar ideas.
Aplicación de escritorio para Windows (Electron), pensada para que más adelante
exista también una versión web con el mismo editor.

> **¿Vas a usar la aplicación, no a programarla?** No necesitas nada de este documento.
> Instala `ExpressYourIdea-Setup-<versión>.exe` y lee [GUIA-DE-USUARIO.md](../GUIA-DE-USUARIO.md).
> Quien instala la app no necesita Node.js, SQL ni ningún otro programa: SQLite es una
> librería que viaja dentro de la aplicación.

Este README es para **desarrollar** la aplicación.

## Requisitos para desarrollar

- **Node.js 22 o superior** ([nodejs.org](https://nodejs.org), versión LTS)
- Windows 10/11 (también funciona en macOS y Linux para desarrollar)

No hace falta Visual Studio ni compilar nada: SQLite viene precompilado.

## Primeros pasos

Descomprime el proyecto, abre una terminal en la carpeta `express-your-idea` y ejecuta:

```bash
npm install        # instala todo el monorepo (unos 400 paquetes)
npm run dev        # abre la aplicación en modo desarrollo (recarga en caliente)
```

- La **primera vez** que ejecutes `npm run dev`, Electron descarga su programa
  (unos 100 MB). Es normal que tarde un poco; las siguientes veces abre al instante.
- El proyecto **no usa `package-lock.json`** (está desactivado en `.npmrc`): con lockfile,
  npm intenta compilar SQLite aunque ya viene compilado, y en Windows eso exigiría
  Visual Studio. Las versiones de todas las dependencias están fijadas en cada `package.json`.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta las pruebas (proyectos, base de datos, preferencias, filtros) |
| `npm run typecheck` | Verifica los tipos de TypeScript en todo el monorepo |
| `npm run build` | Compila la aplicación en `apps/desktop/out` |
| `npm run dist:win` | Genera el instalador de Windows en `apps/desktop/release` |
| `npm run db:generate` | Genera una migración nueva después de cambiar el esquema |

## Estructura

```
express-your-idea/
├─ packages/
│  ├─ core/            Dominio, casos de uso y contrato de API (sin dependencias de plataforma)
│  │  ├─ domain/       Proyecto, espacio, página, elemento, conexión, trazo, recurso, preferencias
│  │  ├─ application/  ProjectService + puertos (interfaces de repositorio)
│  │  └─ api/          EyiApi: lo único que la interfaz conoce de la plataforma
│  ├─ storage-sqlite/  Infraestructura: SQLite + Drizzle + carpetas de proyecto
│  │  ├─ schema/       Esquemas Drizzle (project.db y app.db)
│  │  └─ drizzle/      Migraciones SQL generadas
│  └─ editor/          Interfaz React (pantallas, paneles, lienzo). Independiente de Electron
└─ apps/
   └─ desktop/         Electron: proceso principal, preload e IPC
```

Las cuatro capas del MVP quedan así:

| Capa | Dónde vive |
|---|---|
| Presentación | `packages/editor` |
| Aplicación | `packages/core/src/application` |
| Dominio | `packages/core/src/domain` |
| Infraestructura | `packages/storage-sqlite` y `apps/desktop/src/main` |

**Camino a la web:** `editor` y `core` no importan nada de Electron ni de Node.
Para la versión web basta con crear `apps/web` con otro adaptador de `EyiApi`
(SQLite WASM + almacenamiento del navegador) y reutilizar el editor tal cual.

## Cómo se guarda un proyecto

Cada proyecto es una carpeta autocontenida y portable:

```
Mi proyecto/
├─ manifest.json          Identificador, versión de formato y de esquema
├─ database/project.db    SQLite con todo el contenido del lienzo
├─ assets/images/
├─ assets/audio/
├─ assets/documents/
├─ backups/
└─ exports/
```

- Todas las rutas internas son relativas: la carpeta se puede mover o copiar.
- La versión del esquema se guarda en la base y se migra sola al abrir un proyecto viejo.
  Si el proyecto viene de una versión más nueva de la app, no se abre (para no dañarlo).
- Las preferencias y la lista de recientes van aparte, en `app.db`, dentro de la
  carpeta de datos del usuario (`%APPDATA%/Express Your Idea`).
- Eliminar un proyecto lo envía a la **papelera de Windows**.

## Búsqueda

**Lista de proyectos.** Busca en nombre y descripción, sin importar tildes ni mayúsculas.
Botón *Palabra exacta* para buscar solo palabras completas; `"entre comillas"` busca una
frase exacta. Un proyecto cuyo nombre es exactamente lo buscado aparece primero con la
marca *Nombre exacto*. Filtro por color y orden por recientes, nombre o color.

**Buscador interno de cada proyecto** (`Ctrl+F` dentro del proyecto). Busca palabras clave
en todo el contenido: textos, notas, títulos, pies de imagen y palabras clave de los
elementos, páginas, espacios de trabajo y nombres de recursos. Filtra por tipo
(contenido, espacios y páginas, recursos), por *Solo este espacio* y *Palabra exacta*.
Usa un índice SQLite FTS5 (`search_index`) que se mantiene solo mediante triggers, así que
todo lo que se cree en las próximas etapas queda buscable sin código extra. Convención:
los elementos guardan su texto buscable en `properties.plainText`, `title`, `caption` y
`keywords` (lista).

## Seguridad (Electron)

- `contextIsolation`, `sandbox` y `nodeIntegration: false` en la ventana.
- El preload expone solo `invoke` sobre una **lista blanca de canales** (`packages/core/src/api/contract.ts`).
- El proceso principal valida cada entrada con Zod y solo acepta rutas de proyecto que
  vinieron de un diálogo nativo, de los recientes o de un proyecto recién creado (`PathGuard`).
- Content-Security-Policy estricta y navegación externa bloqueada.

## Hoja de ruta

| Etapa | Contenido | Estado |
|---|---|---|
| 1. Fundamentos | Monorepo, Electron seguro, SQLite + migraciones, gestión de proyectos y espacios, búsqueda de proyectos (exacta, por color) y buscador interno por proyecto, tema claro/oscuro, esqueleto de 4 sectores | ✅ |
| 2. Lienzo | Lienzo infinito (Konva), selección, movimiento, zoom, textos/notas (Tiptap) y formas, deshacer/rehacer por comandos | ⏭ siguiente |
| 3. Contenido visual | Imágenes, rotación, dibujo libre, resaltador, conectores, guías inteligentes | |
| 4. Organización | Páginas, marcos y contenedores, grupos, panel de capas, panel de propiedades | |
| 5. Persistencia, audio y exportación | Guardado automático, copias de respaldo, audio (WaveSurfer), PDF, imagen, `.eyi` | |
| 6. Versión web | Adaptador de navegador, abrir e importar `.eyi` | |
| 7. Calidad y entrega | Pruebas, manejo de errores, instalador, documentación de usuario | |

## Generar el instalador para terceros

```bash
npm run dist:win
```

Genera `apps/desktop/release/<versión>/ExpressYourIdea-Setup-<versión>.exe`, un instalador en
español que:

- se instala para el usuario actual, **sin pedir permisos de administrador**;
- crea accesos directos en el escritorio y el menú Inicio, y abre la app al terminar;
- incluye todo lo necesario (Electron, SQLite para Windows, tipografías): no requiere
  internet ni otros programas;
- al desinstalar **no borra** preferencias ni proyectos.

Se genera de forma nativa en Windows. En Linux o macOS hace falta Wine (con soporte de 32 bits).

**Errores para la persona usuaria:** los errores técnicos (permisos, disco lleno, archivo en uso
por OneDrive, base dañada) se traducen a mensajes con una acción concreta
(`friendlyMessage` en `packages/core/src/domain/errors.ts`). Los detalles se escriben en
`%APPDATA%/Express Your Idea/logs/main.log`. Si la app no puede iniciar, muestra un diálogo
en lugar de cerrarse en silencio.

**Pendiente para distribuir públicamente:**

- **Firma de código.** Sin un certificado, Windows SmartScreen muestra «Windows protegió su PC»
  la primera vez (la guía de uso explica cómo continuar). Con un certificado de firma
  (OV o EV) o con Azure Trusted Signing el aviso desaparece.
- **Actualizaciones automáticas.** `publish` está desactivado; se puede activar con GitHub
  Releases y `electron-updater`.
