# Producto y Visión

## Visión del Proyecto

**Memoria Electrónica Leonesa (MEL)** es un archivo digital dedicado a rescatar, preservar y difundir la historia de la música electrónica en la provincia de León (España) durante el periodo 2004–2019.

A diferencia de los archivos musicales tradicionales centrados únicamente en audios o listados de canciones, el enfoque diferenciador de MEL es contar esta historia **a través del diseño gráfico**: flyers, carteles, entradas y material promocional de eventos emblemáticos (como festivales en Valdepiélago, salas históricas como *The Mouseroom*, o colectivos como *Ravers 7.5*).

El diseño gráfico de los flyers es el verdadero **protagonista visual** del proyecto.

---

## Usuarios Objetivo

1. **Amantes de la música electrónica y comunidad local de León**: Personas que asistieron a los eventos y buscan rememorar la escena cultural de la época.
2. **Diseñadores gráficos e historiadores del arte**: Profesionales e investigadores interesados en el diseño efímero, la tipografía y la cartelería de eventos de principios del siglo XXI.
3. **Público general y curiosos**: Usuarios que exploran el archivo de forma pasiva, navegando por épocas, salas o artistas.

---

## Filosofía del Producto

- **Respeto absoluto a las piezas gráficas**: Los flyers no se recortan ni encuadran de forma agresiva. Se muestran completos a ancho de columna respetando su relación de aspecto original (formato exposición/institución).
- **Simplicidad de administración (Cero Coste)**: El contenido vive en una hoja pública de Google Sheets y las imágenes en Google Drive. No requiere paneles de administración complejos ni servidores de base de datos dedicados.
- **Experiencia de usuario fluida y reactiva (SPA-like)**: Filtrado instantáneo por texto y por rango de años sin recargar la página; transiciones de vista suaves (Galería, Mapa, Lista) y overlay de detalle de evento sin perder el contexto de búsqueda.
- **Fidelidad estética con Figma**: Los componentes, colores, tipografías y microinteracciones siguen de manera estricta el sistema de diseño definido en Figma.

---

## Funcionalidades Clave

- **Exploración Multivista**:
  - **Galería**: Masonry dinámico de 3 columnas (2 en tablet / 1 en móvil) con scroll infinito precargado y orden aleatorio pero estable por sesión.
  - **Mapa**: Integración con Google Maps API para explorar eventos por ubicación geográfica con agrupamiento de marcadores (*clustering*) y panel lateral de sala.
  - **Lista**: Tabla técnica ordenable por columnas con animación *marquee* al pasar el ratón y filtros directos desde cualquier celda.
- **Filtrado Avanzado en Tiempo Real**:
  - **Buscador multitérmino** (`HeaderTitle`) de 4 estados con expansión animada de ancho.
  - **Slider temporal** (2004–2019) con doble control arrastrable.
- **Detalle de Evento Adaptativo**:
  - Experiencia en dos capas: página estática con URL canónica (`/event/[id]`) y overlay modal SPA instantáneo (`?detail=MEL-XXXX`).
  - Carrusel de imágenes, visualizador en pantalla completa (*lightbox*), etiquetas conectadas y botón interactivo *"Me presta"*.
- **Experiencia de Entrada (Intro CMYK)**:
  - Animación interactiva de aberración cromática CMYK basada en física vectorial del ratón y despegue vertical escalonado.
- **Estados Vacíos Explicativos (`EmptyState`)**:
  - Diseños ilustrados con tinte fotográfico duotono para guiar al usuario cuando no existen resultados de búsqueda o la sección está en desarrollo (*En construcción*).

---

## Decisiones Deliberadas de Producto (Non-Goals)

- **Sin registro de usuarios ni login**: El archivo es 100% público y libre de barreras de acceso.
- **Sin recortar imágenes en la Galería**: Se descartó la cuadrícula rígida de fotos cuadradas en favor de un *masonry* adaptativo que conserva la proporción original de cada flyer.
- **Sin paginación tradicional en la Galería**: La Galería utiliza scroll infinito para favorecer la exploración fluida; la paginación con números queda reservada exclusivamente a la vista de Lista.
- **Sin dependencias de frameworks de UI pesados**: El cliente funciona sobre JavaScript vanilla nativo sin React/Vue, priorizando la velocidad y el control fino sobre la manipulación del DOM.
