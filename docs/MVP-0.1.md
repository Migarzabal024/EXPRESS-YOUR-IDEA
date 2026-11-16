# Express Your Idea — Definición del MVP 0.1

**Tipo de producto:** Aplicación de escritorio  
**Sistema operativo inicial:** Windows  
**Objetivo:** Construir una pizarra digital local-first para capturar, organizar y desarrollar ideas mediante elementos visuales manipulables.

---

## 1. Visión del MVP

Express Your Idea será un espacio de trabajo visual donde el usuario pueda crear proyectos independientes y desarrollar sus ideas sobre un lienzo digital.

La aplicación debe permitir empezar con contenido desordenado y organizarlo progresivamente mediante textos, notas, imágenes, dibujos, formas y conexiones.

**Principio rector:** Una idea no tiene por qué comenzar ordenada. Express Your Idea permite que encuentre su propia estructura.

## 2. Objetivos principales

1. Crear y administrar proyectos independientes.
2. Disponer de un lienzo visual manipulable.
3. Incorporar y editar distintos tipos de elementos.
4. Organizar elementos libremente y mediante agrupaciones.
5. Guardar automáticamente el trabajo.
6. Poder cerrar y volver a abrir un proyecto sin perder información.
7. Exportar el resultado y transportar proyectos entre equipos.

## 3. Alcance funcional

### Módulo A — Gestión de proyectos

- Crear proyectos.
- Editar nombre, descripción y color identificador.
- Abrir proyectos existentes.
- Eliminar proyectos con confirmación.
- Mostrar proyectos recientes.
- Elegir dónde guardar cada proyecto.
- Mantener los proyectos independientes entre sí.

### Módulo B — Espacio de trabajo

El espacio de trabajo tendrá cuatro sectores:

- **Barra lateral izquierda:** navegación, páginas y recursos.
- **Barra superior:** herramientas, deshacer, rehacer, zoom y guardado.
- **Lienzo central:** espacio principal de trabajo.
- **Panel derecho:** propiedades del elemento seleccionado.

### Módulo C — Lienzo

Se contemplan dos modalidades:

**Lienzo infinito**
- Desplazamiento horizontal y vertical.
- Zoom de acercamiento y alejamiento.
- Elementos ubicados libremente.
- Navegación mediante herramienta mano.

**Modo páginas**
- Crear varias páginas dentro de un espacio de trabajo.
- Configurar ancho y alto.
- Cambiar el nombre y el fondo.
- Navegar entre páginas.

### Módulo D — Elementos del lienzo

| Elemento | Funcionalidad MVP |
|---|---|
| Texto | Crear, editar, mover y redimensionar |
| Nota | Tarjeta de texto con color de fondo |
| Imagen | Importar, visualizar, mover y redimensionar |
| Formas | Rectángulos, círculos y flechas |
| Conectores | Vincular elementos visualmente |
| Dibujo | Trazos libres con mouse o lápiz digital |
| Resaltador | Marcas de color con transparencia |
| Audio | Importar y reproducir archivos existentes |

Los elementos deberán poder seleccionarse, moverse, redimensionarse y eliminarse.

El texto tendrá edición enriquecida básica: negrita, cursiva, subrayado y resaltado de color.

### Módulo E — Organización

- Selección múltiple.
- Agrupar y desagrupar elementos.
- Mover grupos como una unidad.
- Ordenar elementos delante o detrás.
- Duplicar elementos.
- Eliminar elementos.
- Incorporar contenedores para organizar contenido relacionado.

Los contenedores serán elementos visuales que podrán agrupar otros elementos. En el MVP se priorizará el agrupamiento y movimiento conjunto; las reglas avanzadas de anidamiento quedan para una versión posterior.

### Módulo F — Persistencia

- Guardado automático.
- Guardado manual.
- Recuperación del proyecto al volver a abrirlo.
- Persistencia de posiciones, tamaños, estilos y relaciones.
- Almacenamiento local.
- Copias de seguridad básicas.

### Módulo G — Exportación

- Exportar el lienzo o página como imagen.
- Exportar páginas a PDF.
- Exportar el proyecto completo en formato portable `.eyi`.
- Importar un proyecto `.eyi` previamente exportado.

El archivo portable deberá incluir la información del proyecto y sus recursos asociados, no depender de rutas absolutas del equipo original.

### Módulo H — Preferencias visuales

- Tema claro.
- Tema oscuro.
- Preferencias persistentes.
- Paleta de colores para elementos y herramientas.

## 4. Funcionalidades fuera del MVP

Se dejan previstas para futuras versiones:

- Sincronización real en la nube.
- Colaboración en tiempo real.
- Usuarios y permisos.
- Transcripción automática de audio.
- Inteligencia artificial para organizar ideas.
- Grabación directa de audio.
- Citas de audio con transcripción y marcas temporales avanzadas.
- Diagramas automáticos complejos.
- Biblioteca externa sincronizada.
- Historial avanzado de versiones.

No se descartan: simplemente no deben retrasar la primera versión funcional.

## 5. Propuesta tecnológica

| Capa | Tecnología propuesta | Responsabilidad |
|---|---|---|
| Desktop | Electron | Aplicación Windows |
| Frontend | React + TypeScript | Interfaz |
| Build | Vite | Entorno de desarrollo |
| Canvas | Konva + React-Konva | Elementos gráficos |
| Texto enriquecido | Tiptap | Edición de texto |
| Estado | Zustand | Estado de interfaz y lienzo |
| Base de datos | SQLite | Persistencia |
| ORM | Drizzle ORM | Acceso a datos |
| Validación | Zod | Validación de estructuras |
| Audio | WaveSurfer.js | Visualización y reproducción |

**Criterio técnico:** mantener una arquitectura modular. No mezclar reglas de negocio con componentes visuales ni permitir que el frontend acceda directamente al sistema de archivos.

Electron deberá utilizar aislamiento de contexto, integración Node deshabilitada en el renderer y comunicación controlada mediante IPC y preload.

## 6. Arquitectura lógica

Se propone dividir la solución en cuatro capas:

1. **Presentación:** pantallas, componentes, canvas, paneles y controles.
2. **Aplicación:** casos de uso, comandos y coordinación de operaciones.
3. **Dominio:** proyectos, elementos, grupos, páginas y reglas de negocio.
4. **Infraestructura:** SQLite, archivos, importación, exportación y sistema operativo.

## 7. Modelo de datos inicial

### Project
- Id
- Name
- Description
- Color
- CreatedAt
- UpdatedAt

### Workspace
- Id
- ProjectId
- Name
- CanvasMode
- CreatedAt
- UpdatedAt

### CanvasPage
- Id
- WorkspaceId
- Name
- Width
- Height
- BackgroundColor
- OrderIndex

### CanvasElement
- Id
- WorkspaceId
- PageId (nullable para elementos del lienzo infinito)
- ParentGroupId (nullable)
- Type
- PositionX
- PositionY
- Width
- Height
- Rotation
- ZIndex
- PropertiesJson
- CreatedAt
- UpdatedAt

### Connection
- Id
- WorkspaceId
- SourceElementId
- TargetElementId
- Type
- PropertiesJson

### DrawingStroke
- Id
- CanvasElementId
- PointsData
- Color
- Width
- Opacity
- ToolType

### Asset
- Id
- ProjectId
- FileName
- RelativePath
- MimeType
- FileSize
- Checksum
- CreatedAt

### UserSettings
- Id
- Theme
- DefaultCanvasMode
- AutosaveEnabled
- DefaultGridEnabled
- DefaultStoragePath

### WorkspaceViewport
- Id
- WorkspaceId
- PageId
- Zoom
- OffsetX
- OffsetY
- UpdatedAt

Las referencias bibliográficas y las citas de audio se incorporarán en una ampliación del modelo cuando se desarrolle ese módulo.

## 8. Organización física de cada proyecto

Cada proyecto será una unidad independiente y portable.

Estructura conceptual:

- `manifest.json`
- `database/project.db`
- `assets/images/`
- `assets/audio/`
- `assets/documents/`
- `backups/`
- `exports/`

Se utilizarán identificadores UUID, rutas relativas, control de integridad de recursos y versionado de esquema de base de datos.

## 9. Criterios de aceptación del MVP

La primera versión se considerará funcional cuando:

1. Se pueda crear, abrir, modificar y eliminar un proyecto.
2. Se pueda crear un espacio de trabajo.
3. Se pueda utilizar el lienzo infinito.
4. Se puedan crear páginas con dimensiones personalizadas.
5. Se puedan agregar y editar textos.
6. Se puedan importar imágenes y manipularlas.
7. Se puedan crear formas y conectores.
8. Se puedan dibujar trazos libres.
9. Se puedan agrupar elementos y moverlos conjuntamente.
10. Se pueda cambiar entre tema claro y oscuro.
11. Los cambios se guarden y recuperen correctamente.
12. Se pueda exportar a PDF e imagen.
13. Se pueda exportar e importar un proyecto portable.
14. La aplicación pueda utilizarse sin conexión a Internet.

## 10. Plan de desarrollo por etapas

### Etapa 1 — Fundamentos
- Crear la solución de escritorio.
- Configurar Electron, React, TypeScript y Vite.
- Implementar estructura de carpetas y arquitectura.
- Configurar SQLite y migraciones.
- Implementar gestión básica de proyectos.

**Resultado:** aplicación de escritorio que crea y guarda proyectos.

### Etapa 2 — Canvas funcional
- Implementar lienzo infinito.
- Selección, movimiento y zoom.
- Incorporar textos, notas y formas.
- Implementar deshacer y rehacer.

**Resultado:** primera pizarra manipulable.

### Etapa 3 — Contenido visual
- Importación de imágenes.
- Redimensionamiento y rotación.
- Dibujo libre.
- Resaltadores y estilos.
- Conectores.

**Resultado:** pizarra multimodal básica.

### Etapa 4 — Organización
- Páginas personalizadas.
- Agrupaciones y contenedores.
- Orden de capas.
- Panel de propiedades.

**Resultado:** organización de ideas en espacios estructurados.

### Etapa 5 — Persistencia y exportación
- Guardado automático.
- Recuperación de estado.
- Importación de audio.
- Exportación PDF e imagen.
- Formato portable `.eyi`.

**Resultado:** aplicación utilizable para trabajos reales.

### Etapa 6 — Calidad y entrega
- Pruebas funcionales.
- Pruebas de persistencia.
- Pruebas de importación y exportación.
- Manejo de errores.
- Instalador para Windows.
- Documentación de usuario.

**Resultado:** MVP instalable y demostrable para portfolio.

## 11. Decisiones que deberán cerrarse antes de implementar cada módulo

- Comportamiento exacto de los contenedores y elementos anidados.
- Reglas de selección múltiple.
- Comportamiento de los conectores al mover elementos.
- Política de guardado y recuperación ante cierres inesperados.
- Límites de tamaño y formatos de archivos importables.
- Reglas de exportación de páginas y lienzos infinitos.

## 12. Definición de éxito

El MVP será exitoso si una persona puede abrir Express Your Idea, crear un proyecto, volcar ideas en distintos formatos, organizarlas visualmente, guardar su trabajo y volver a retomarlo sin depender de Internet.

**La prioridad no es tener muchas herramientas. Es que las herramientas esenciales funcionen bien y formen una experiencia coherente.**