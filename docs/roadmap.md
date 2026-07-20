# Roadmap y estado

Última actualización: 2026-07-20 (commit `a58ba94`).

## Hecho

- Home con tres vistas (Galería / Mapa / Lista) sobre datos vivos de Google
  Sheets, con filtros combinados (búsqueda + rango de años), paginación y
  estadísticas (highlights).
- Vista Mapa con clustering por localización, panel lateral de eventos por
  lugar y actualización por diff de marcadores.
- Vista Lista con ordenación por columnas, ellipsis/marquee en celdas y
  enlaces que alimentan el buscador.
- Detalle de evento por partida doble (página `/event/[id]` y overlay SPA con
  URL compartible), con carrusel, lightbox, navegación Anterior/Siguiente
  (click + teclado) y botón "Me presta".
- Página `/info` (Proyecto/Equipo/Contacto) completamente dirigida por la
  pestaña "Página de Información" de la hoja, con acordeones y fotos tintadas.
- Intro animada CMYK (bajo demanda: `?intro=true` o menú lateral).
- Tema claro/oscuro persistido; buscador de estados; menú lateral.
- Layouts móviles: header colapsado ("M.E.L."), toolbar (slider a sangre,
  highlights con scroll), detalle de evento reordenado según Figma.
- Headers unificados en todas las páginas (misma distancia al borde superior).
- Protección de imágenes (menú contextual y arrastre bloqueados).

## En progreso / pendiente de contenido

- **Sala de Exposiciones** (`/exposiciones`): solo EmptyState "En
  construcción". El diseño final no está definido en el código.
  <!-- TODO: definir qué contendrá la Sala de Exposiciones -->
- Fotos del equipo en `/info`: dependen de que las celdas "Imagen" de la hoja
  tengan URLs válidas (Drive público o URL directa).

## Problemas conocidos (aparcados explícitamente por el propietario)

No retomar sin que el propietario lo pida ("Dejemos esto de momento"):

1. **La galería no anima la reordenación durante el arrastre del slider de
   años** (solo al hacer click en la barra). Se intentó coalescing con rAF
   sobre `updateSlider()`; no lo resolvió.
2. **Durante ese arrastre se ven tarjetas moverse por debajo del módulo de
   paginación** (zona inferior). Probablemente relacionado con el punto 1.

## Deuda técnica conocida

- Duplicación consciente del detalle de evento (página + overlay SPA) — ver
  decisions.md D-008. Cualquier unificación futura debería mantener la view
  transition de la imagen y el overlay instantáneo.
- Índices de columna de la hoja hardcodeados (frágil ante reordenaciones de
  columnas en el Sheet).
- Clave de Google Maps incrustada en `Layout.astro`.
  <!-- TODO: restringir la clave por dominio en Google Cloud Console -->
- Sin caché del fetch a Google Sheets (un fetch por request SSR).
- `src/components/HeaderTitle.astro.bak` es un residuo; eliminable.

## Ideas futuras (no comprometidas)

- Botón **"Descargar"** en el detalle de evento: existe en el diseño móvil de
  Figma (nodo 634-41290, componente DownloadButton) pero no está implementado
  en ninguna variante.
  <!-- TODO: confirmar con el propietario si se quiere y qué descargaría (¿el flyer original?) -->
- Aprovechar los campos ya parseados pero no mostrados: `ocr`,
  `notasArchivo`, `existeOriginal`, `formato`.
- Persistencia real de "Me presta" (ahora es estado visual local).

Al terminar cualquier punto, muévelo a "Hecho" y actualiza la fecha de arriba.
