# Express Your Idea — Arquitectura y decisiones

Registro de las decisiones de producto y técnicas tomadas hasta ahora, y de las que quedan
por cerrar. Se actualiza en cada etapa.

Actualizado: 16/11/2026 (Etapa 1 + búsqueda + instalador para terceros)

## Decisiones de producto

- Se mantienen **todas** las funcionalidades del [MVP 0.1](MVP-0.1.md), incluido el audio.
- Plataforma: escritorio (Windows) ahora. Celular: no por el momento.
- Futuro: versión web para que otras personas la usen en el navegador, y opción de descargar e
  instalar localmente.
- Se suman funciones tipo Figma: panel de capas, marcos, panel de propiedades completo, guías
  inteligentes y ajuste, alinear/distribuir, transformaciones múltiples, minimapa, atajos de
  teclado, pegar y arrastrar archivos.

### Pensada para terceros (usuario final sin conocimientos técnicos)

- La persona usuaria **no instala nada más ni necesita saber SQL**: SQLite es una librería
  embebida dentro de la app. Se mantiene SQLite.
- Distribución: instalador `ExpressYourIdea-Setup-<versión>.exe` (NSIS, en español, por usuario
  sin administrador, accesos directos, abre al terminar; desinstalar no borra proyectos ni
  preferencias).
- Errores traducidos a mensajes con una acción concreta (permisos, disco lleno, archivo en uso por
  OneDrive, proyecto dañado). Los detalles técnicos van a
  `%APPDATA%/Express Your Idea/logs/main.log`. Si la app no puede iniciar muestra un diálogo;
  nunca se cierra en silencio.
- Ayuda dentro de la app (botón «?»): dónde se guarda, cómo copiar a otra PC, buscar, recuperar
  de la papelera.
- [GUIA-DE-USUARIO.md](../GUIA-DE-USUARIO.md) para quien instala; [DESARROLLO.md](DESARROLLO.md)
  para quien programa.
- Pendiente para distribución pública: firma de código (evita el aviso SmartScreen «Windows
  protegió su PC») y actualizaciones automáticas (electron-updater).

### Búsqueda

- **Lista de proyectos:** busca en nombre y descripción, ignora tildes y mayúsculas. Botón
  «Palabra exacta» (solo palabras completas). `"Comillas"` = frase exacta. El proyecto con el
  nombre exacto aparece primero con la marca «Nombre exacto». Filtro por uno o varios colores con
  contador, orden por recientes/nombre/color, Ctrl+F. Los filtros se conservan al entrar y salir
  de un proyecto.
- **Buscador interno por proyecto** (separado; Ctrl+F dentro del proyecto, panel izquierdo):
  palabras clave en textos, notas, títulos, pies de imagen y palabras clave de elementos, páginas,
  espacios y nombres de recursos. Filtros: tipo (Todo / Contenido / Espacios y páginas /
  Recursos), «Solo este espacio», «Palabra exacta», frases entre comillas. Resultados agrupados
  con fragmento y coincidencias resaltadas; al hacer clic se abre el espacio correspondiente
  (desde la Etapa 2 también enfocará el elemento en el lienzo).
- Diferencia intencional: en la lista de proyectos, sin modo exacto, se encuentran partes de
  palabra («diseno» → «Rediseño»). En el buscador interno se encuentran palabras que empiezan con
  lo escrito («dise» → «diseño», pero no «Rediseño»), que es lo que permite el índice.

## Decisiones técnicas

- Monorepo con npm workspaces: `packages/core` (dominio, casos de uso, contrato `EyiApi`),
  `packages/storage-sqlite` (SQLite + Drizzle), `packages/editor` (React, sin Electron),
  `apps/desktop` (Electron). Más adelante: `apps/web`.
- La interfaz solo habla con `EyiApi`. Escritorio = IPC sobre una lista blanca de canales;
  web = adaptador de navegador.
- Base global `app.db` (preferencias, recientes) separada de `project.db` (una por proyecto).
- Migraciones generadas con drizzle-kit, embebidas en el bundle y aplicadas con
  `PRAGMA user_version`. Migración 0001 = índice de búsqueda (personalizada).
- Índice de búsqueda: tabla virtual FTS5 `search_index` (tokenizer unicode61 sin tildes)
  mantenida solo por triggers sobre `project`, `workspace`, `canvas_page`, `canvas_element` y
  `asset`. Convención: los elementos guardan su texto buscable en `properties.plainText`,
  `title`, `caption` y `keywords` (lista).
- Sintaxis de búsqueda compartida en `packages/core/src/domain/search.ts`
  (`parseQuery`, `matchesText`, `buildFtsQuery`).
- better-sqlite3 13 (Node-API, precompilado para Windows/macOS/Linux): no hace falta recompilar
  para Electron. Verificado: la versión empaquetada para Windows carga SQLite, crea `app.db` y
  aplica migraciones con rutas de Windows.
- **Sin `package-lock.json`** (`package-lock=false` en `.npmrc`): con lockfile, npm ignora el
  `gypfile: false` de better-sqlite3 e intenta compilarlo con node-gyp (en Windows exigiría
  Visual Studio). Las versiones están fijadas exactas en cada `package.json`.
- Electron 45 descarga su binario la primera vez que se usa (`npm run dev`), no en `npm install`.
- Instalador: electron-builder + NSIS (`npm run dist:win`). Nativo en Windows; desde Linux
  requiere Wine con soporte de 32 bits. `publish: null` hasta configurar actualizaciones.
- Texto enriquecido: textos y notas se mostrarán como HTML real (Tiptap) sincronizado sobre el
  lienzo Konva. PDF vía `printToPDF`, con el texto como texto real. Tiptap deberá guardar también
  `plainText` para el índice.
- Deshacer y rehacer basados en comandos desde la Etapa 2; los mismos comandos habilitan una
  sincronización futura.
- Seguridad: `contextIsolation` + `sandbox`, CSP estricta, validación con Zod en el proceso
  principal, `PathGuard` para rutas de proyecto, eliminar = papelera de Windows.
- Diseño visual: papel con cuadrícula de puntos, tinta grafito, acento amarillo resaltador
  (`#FFD84D`), tipografía Bricolage Grotesque incluida en la app. Ícono: tarjeta amarilla con
  una «E» grafito.

## Hoja de ruta

1. Fundamentos ✅ (búsqueda de proyectos, buscador interno, instalador para terceros)
2. Lienzo (Konva, selección, zoom, textos/notas/formas, deshacer y rehacer; clic en resultado de
   búsqueda → enfocar elemento)
3. Contenido visual (imágenes, dibujo, resaltador, conectores, guías; panel de recursos con
   filtros por tipo y color)
4. Organización (páginas, marcos y contenedores, grupos, capas, propiedades)
5. Persistencia, audio y exportación (autoguardado, respaldos, WaveSurfer, PDF, imagen, `.eyi`)
6. Versión web
7. Calidad y entrega (firma de código, actualizaciones automáticas, pruebas en Windows real)

## Pendientes por definir (antes de cada módulo)

- Comportamiento exacto de contenedores y anidamiento.
- Reglas de selección múltiple.
- Conectores al mover elementos.
- Política de autoguardado y recuperación ante cierres inesperados.
- Límites de tamaño y formatos importables.
- Reglas de exportación de páginas vs. lienzo infinito.
