# Memoria Electrónica Leonesa (MEL)

Archivo digital de la historia de la música electrónica en León (España), contada
**a través del diseño gráfico**: flyers, carteles y material promocional de los
eventos celebrados entre 2004 y 2019 (festivales como el FIV de Valdepiélago,
fiestas de Ravers 7.5, The Mouseroom, etc.).

El proyecto es una web construida con **Astro (SSR)** que lee sus datos en vivo
desde una hoja de **Google Sheets** (que actúa como CMS) y muestra el archivo en
tres vistas: **Galería**, **Mapa** y **Lista**, con página de detalle por evento,
página de información del proyecto y una intro animada.

Detrás del proyecto están dos personas: Marcos Abella y Galo Franganillo (diseño).
El diseño de referencia vive en Figma:
[Memoria Electrónica Leonesa (Figma)](https://www.figma.com/design/BuItQAgdEVZaTSeFjZwRNZ/Memoria-Electr%C3%B3nica-Leonesa).

## Instalación y ejecución

Requisitos: Node.js >= 22.12.0.

```sh
npm install
npm run dev        # servidor de desarrollo en http://localhost:4321
npm run build      # build de producción (adapter de Vercel)
npm run preview    # previsualizar el build
```

Si trabajas con un agente de IA que soporta modo background del dev server,
consulta [AGENTS.md](AGENTS.md).

No hay variables de entorno: la hoja de Google Sheets es pública (lectura vía
endpoint `gviz`) y la clave de Google Maps está incrustada en
`src/layouts/Layout.astro`.
<!-- TODO: restringir la clave de Maps por dominio en Google Cloud Console y documentar aquí el dominio de producción -->

## Estructura general

```
/
├── public/                  # Assets estáticos (flyers de fallback, empty states, favicon)
├── scripts/fetch_sheet.py   # Resolución/caché de coordenadas desde la hoja (offline)
├── src/
│   ├── components/          # Componentes Astro reutilizables (Link, TagWithLink, TimeSlider…)
│   ├── data/                # resolved_coordinates.json (caché de geocoding)
│   ├── layouts/Layout.astro # <head> común, tema claro/oscuro, Maps bootstrap, ClientRouter
│   ├── pages/
│   │   ├── index.astro      # Home SPA: Galería/Mapa/Lista + overlay de detalle (archivo grande, ~3600 líneas)
│   │   ├── event/[id].astro # Página estática de detalle de evento (por idMel)
│   │   ├── info.astro       # Proyecto / Equipo / Contacto (contenido desde la hoja)
│   │   └── exposiciones.astro # Sala de Exposiciones (en construcción, EmptyState)
│   └── styles/global.css    # Design tokens (colores, espaciado, tipografía) + utilidades
├── AGENTS.md                # Punto de entrada para agentes de IA
└── docs/                    # Documentación permanente del proyecto
```

## Funcionalidades principales

- **Galería**: grid tipo mosaico de flyers con animaciones de entrada/salida y paginación.
- **Mapa**: Google Maps con clustering de marcadores por localización y panel lateral de eventos por lugar.
- **Lista**: tabla ordenable con enlaces que alimentan el buscador y animación marquee/ellipsis en celdas.
- **Buscador con estados** (título ⇄ input ⇄ término fijado) que filtra todas las vistas.
- **Slider temporal** (2004–2019) que filtra por rango de años.
- **Detalle de evento**: carrusel de imágenes, lightbox con zoom, tags enlazados, navegación Anterior/Siguiente (también con flechas del teclado), botón "Me presta".
- **Overlay SPA** de detalle sobre la home (URL compartible vía `?detail=MEL-XXXX`).
- **Intro animada** con aberración cromática CMYK (se salta con scroll, Enter, click o tap).
- **Tema claro/oscuro** persistido en `localStorage`.
- **Responsive**: layouts específicos de móvil para header, toolbar, highlights y detalle de evento.

## Documentación

| Documento | Contenido |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Punto de entrada para cualquier agente de IA: reglas, convenciones, cómo trabajar aquí |
| [docs/architecture.md](docs/architecture.md) | Arquitectura, flujo de datos, modelo de datos de la hoja, módulos |
| [docs/design-system.md](docs/design-system.md) | Tokens, tipografía, componentes, reglas de UX, breakpoints |
| [docs/development.md](docs/development.md) | Convenciones de código, patrones, cómo desarrollar y verificar cambios |
| [docs/decisions.md](docs/decisions.md) | Registro de decisiones técnicas (con contexto y motivo) |
| [docs/roadmap.md](docs/roadmap.md) | Estado actual, problemas conocidos, backlog e ideas |
