// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import quitarComentarios from './plugins/quitar-comentarios.mjs';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  // La precarga de Astro, APAGADA (D-299). Con el enrutador de Astro viene
  // encendida para todos los enlaces (`prefetchAll`), al pasar el ratón 80 ms.
  // En un iPhone el navegador simula ese «pasar el ratón» al tocar, así que la
  // precarga salía a la vez que la propia navegación y sin coordinarse con
  // ella: cada cierre de una ficha pedía la portada DOS veces (visto en el
  // registro del servidor con el iPhone del propietario). La sustituye la
  // precarga propia de `Layout.astro` (`__melPrecargar`), que cubre los mismos
  // enlaces y entrega a la navegación la página que ya trae.
  prefetch: false,

  // Fuentes alojadas en nuestro dominio (D-284). Astro las descarga de Google
  // AL COMPILAR, las guarda en /_astro con nombre único y caché de un año, y
  // genera el @font-face con sus subconjuntos (`unicode-range`): el navegador
  // solo baja el que necesita el texto de la página. Los pesos son los que se
  // usan de verdad (medido el 29/09/2026): Space Grotesk 400-700 y Lora 500;
  // Lora se declara 400-700 porque es la misma fuente variable y pesa igual.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Space Grotesk',
      cssVariable: '--font-space-grotesk',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'vietnamese'],
      fallbacks: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Lora',
      cssVariable: '--font-lora',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'vietnamese', 'cyrillic', 'cyrillic-ext', 'math', 'symbols'],
      fallbacks: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
    },
  ],
  vite: {
    // Producción sale sin comentarios (D-280); `astro dev` los conserva.
    plugins: [tailwindcss(), quitarComentarios()],
    server: {
      watch: {
        // El panel ESCRIBE estos dos ficheros mientras trabaja: la caché de
        // medidas cuando mide un cartel nuevo, y el historial tras cada pasada
        // real. Están dentro de `src/`, así que el servidor de desarrollo los
        // veía cambiar y recargaba la página — en mitad de la faena. El modal
        // de resumen se cerraba solo, sin que nadie lo tocara, justo después de
        // arreglar un cartel. Son datos, no código: no hay nada que recompilar
        // cuando cambian.
        ignored: ['**/src/data/flyer_tecnico.json', '**/src/data/panel_historial.json'],
      },
    },
  },

  // ISR: la página construida se guarda en el borde 5 minutos. Se pone AQUÍ y
  // no con `Astro.response.headers`, que es lo primero que se intentó: el
  // adaptador de Vercel sobrescribe esa cabecera con `max-age=0,
  // must-revalidate` y la respuesta llegaba siempre como MISS (comprobado en
  // producción tres veces seguidas).
  //
  // Motivo: sin esto, cada visita —y cada toque en una tarjeta, porque la ficha
  // también se construye en el servidor— obliga a esperar a que Google Sheets
  // conteste antes de pintar nada. Medido: 645ms de los 650 de la primera tinta.
  //
  // `exclude` deja fuera la API del mapa si alguna vez existe una ruta dinámica
  // que no deba cachearse.
  // Analítica de Vercel (D-283): visitantes, páginas, países y de dónde llegan.
  // El adaptador ya la trae: inyecta un script en el <head> que en producción se
  // pide a `/_vercel/insights/script.js`, o sea a NUESTRO dominio, no a un
  // tercero. Sin cookies ni almacenamiento en el navegador. Solo cuenta cuando
  // está activada en el panel de Vercel (proyecto → Analytics → Enable); hasta
  // entonces esa URL da 404. En `astro dev` no cuenta nada (script de depuración).
  adapter: vercel({
    webAnalytics: { enabled: true },
    isr: {
      expiration: 300,
    },
  }),
});