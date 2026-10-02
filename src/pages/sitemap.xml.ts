import type { APIRoute } from 'astro';
import { fetchEvents, escHtml } from '../lib/mel';

// Índice de páginas para los buscadores (D-303): las tres fijas y una ficha por
// evento, sacadas de la hoja en cada petición como el resto del sitio.
export const GET: APIRoute = async ({ site }) => {
  const eventos = await fetchEvents();
  const rutas = ['/', '/info', '/exposiciones', ...eventos.map((e: any) => `/event/${e.idMel}`)];
  const urls = rutas.map((r) => `  <url><loc>${escHtml(String(new URL(r, site)))}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
