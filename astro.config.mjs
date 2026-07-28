// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
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