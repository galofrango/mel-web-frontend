// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
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
  adapter: vercel({
    isr: {
      expiration: 300,
    },
  }),
});