import type { APIRoute } from 'astro';

// Permiso a todos los buscadores y dónde está el índice de páginas (D-303).
// Dinámico para que el dominio salga de `site` en astro.config.mjs.
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
