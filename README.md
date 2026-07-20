# Memoria Electrónica Leonesa (MEL)

Archivo digital de la historia de la música electrónica en León (España), contada **a través del diseño gráfico**: flyers, carteles y material promocional de los eventos celebrados entre 2004 y 2019 (festivales como el FIV de Valdepiélago, fiestas de Ravers 7.5, The Mouseroom, etc.).

El proyecto es una aplicación web construida con **Astro (SSR)** que lee sus datos en vivo desde una hoja de **Google Sheets** (que actúa como CMS) y muestra el archivo en tres vistas: **Galería**, **Mapa** y **Lista**, con página de detalle por evento, página de información del proyecto y una intro animada.

Detrás del proyecto están dos personas: Marcos Abella y Galo Franganillo (diseño).
El diseño de referencia vive en Figma:
[Memoria Electrónica Leonesa (Figma)](https://www.figma.com/design/BuItQAgdEVZaTSeFjZwRNZ/Memoria-Electr%C3%B3nica-Leonesa).

---

## Instalación y Ejecución

Requisitos: Node.js >= 22.12.0.

```sh
npm install
npm run dev        # servidor de desarrollo en http://localhost:4321
npm run build      # build de producción (adapter de Vercel)
npm run preview    # previsualizar el build
```

Para guías sobre cómo trabajar en este repositorio con agentes de IA (Claude, Gemini, ChatGPT, Copilot, Cursor, etc.), consulta [AGENTS.md](AGENTS.md).

No hay variables de entorno: la hoja de Google Sheets es pública (lectura vía endpoint `gviz`) y la clave de Google Maps está incrustada en `src/layouts/Layout.astro`.

---

## Estructura General

```
/
├── public/                  # Assets estáticos (flyers de fallback, imágenes de EmptyState, favicon)
├── scripts/fetch_sheet.py   # Resolución/caché de coordenadas desde la hoja (offline)
├── src/
│   ├── components/          # Componentes Astro reutilizables (EmptyState, IntroAnimation, Link, TagWithLink…)
│   ├── data/                # resolved_coordinates.json (caché de geocoding)
│   ├── layouts/Layout.astro # <head> común, tema claro/oscuro, Maps bootstrap, ClientRouter
│   ├── pages/
│   │   ├── index.astro      # Home SPA: Galería/Mapa/Lista + overlay de detalle (monolito, ~3600 líneas)
│   │   ├── event/[id].astro # Página estática de detalle de evento (por idMel)
│   │   ├── info.astro       # Proyecto / Equipo / Contacto (contenido desde la hoja)
│   │   └── exposiciones.astro # Sala de Exposiciones (en construcción, EmptyState)
│   └── styles/global.css    # Design tokens (colores, espaciado, tipografía) + utilidades
├── AGENTS.md                # Guía independiente del modelo para agentes de IA
└── docs/                    # Documentación permanente del proyecto
```

---

## Funcionalidades Principales

- **Galería**: Masonry de 3 columnas con imágenes enteras a ratio original, scroll infinito precargado, orden aleatorio estable por sesión y revelado animado al scroll.
- **Mapa**: Google Maps con clustering de marcadores por localización y panel lateral de eventos por lugar.
- **Lista**: Tabla ordenable con enlaces que alimentan el buscador, celdas con marquee/ellipsis y fila adaptada para estados vacíos.
- **Buscador con estados** (`HeaderTitle` de 4 estados: título ⇄ input ⇄ término fijado) que filtra todas las vistas.
- **Slider temporal** (2004–2019) que filtra por rango de años.
- **Detalle de evento**: Carrusel de imágenes, lightbox con zoom, tags enlazados, navegación Anterior/Siguiente (también con flechas del teclado) y botón "Me presta".
- **Overlay SPA** de detalle sobre la home (URL compartible vía `?detail=MEL-XXXX`).
- **Intro animada CMYK** (aberración cromática interactiva con despegue ease-in sin desaceleración final).
- **Sistema de Estados Vacíos (`EmptyState`)** con tinte fotográfico duotono para búsquedas nulas y secciones en desarrollo.
- **Tema claro/oscuro** persistido en `localStorage`.

---

## Documentación del Proyecto

La documentación es la única fuente de verdad sobre el proyecto:

| Documento | Contenido |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Punto de entrada para cualquier agente de IA: reglas obligatorias, política de documentación continuada y checklist DoD |
| [docs/product.md](docs/product.md) | Visión de producto, usuarios objetivo, filosofía de diseño y límites del proyecto (*Non-goals*) |
| [docs/architecture.md](docs/architecture.md) | Arquitectura del sistema, flujo de datos SSR de Google Sheets, bus de eventos y componentes |
| [docs/design-system.md](docs/design-system.md) | Tokens de diseño, tipografía, paletas de color, especificaciones de componentes y reglas de UX |
| [docs/development.md](docs/development.md) | Convenciones de código, patrones obligatorios, política de actualización y flujo de desarrollo |
| [docs/decisions.md](docs/decisions.md) | Registro histórico de decisiones técnicas e ingeniería (formato contexto → decisión → motivo) |
| [docs/roadmap.md](docs/roadmap.md) | Estado actual del desarrollo, funcionalidades completadas, deuda técnica y backlog |
| [docs/journal.md](docs/journal.md) | Diario del proyecto con la cronología de las sesiones de trabajo importantes |
