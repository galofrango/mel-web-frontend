/**
 * Capa de acceso a Google para el panel: un token desde la clave de la cuenta
 * de servicio, y las cuatro operaciones que el motor de arreglos necesita
 * (descargar de Drive, sustituir contenido conservando el id, leer y escribir
 * una celda de la hoja). Sin dependencias — el JWT se firma con el `crypto`
 * de Node, igual que `scripts/probar-google.mjs`, que es de donde sale esta
 * lógica (antes vivía duplicada ahí; ahora la importa de aquí).
 *
 * Ver docs/google-acceso.md para cómo está montada la cuenta y por qué es una
 * cuenta de servicio y no las credenciales del propietario.
 */
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';
const RUTA_POR_DEFECTO = () => process.env.GOOGLE_CUENTA_SERVICIO || `${process.env.HOME}/.config/mel/panel-google.json`;

const b64 = (o: unknown): string => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o))
  .toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export type CredencialGoogle = { client_email: string; private_key: string };

/** Lee la clave de la cuenta de servicio. Por defecto, la ruta de `GOOGLE_CUENTA_SERVICIO`. */
export function leerCredencial(ruta: string = RUTA_POR_DEFECTO()): CredencialGoogle {
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

/** Un token de acceso a partir de la clave. JWT firmado con RS256, sin librerías. */
export async function obtenerToken(cred: CredencialGoogle): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64({ alg: 'RS256', typ: 'JWT' });
  const cuerpo = b64({
    iss: cred.client_email, scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    exp: ahora + 3600, iat: ahora,
  });
  const firma = createSign('RSA-SHA256').update(`${cabecera}.${cuerpo}`).end()
    .sign(cred.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecera}.${cuerpo}.${firma}`,
    }),
  });
  const j: any = await r.json();
  if (!j.access_token) throw new Error(`sin token: ${JSON.stringify(j)}`);
  return j.access_token;
}

/**
 * Descarga el contenido de un fichero de Drive por su id, autenticado (no el
 * endpoint público de miniatura: este vale para cualquier fichero al que la
 * cuenta de servicio tenga acceso, y es la vía correcta para lo que luego hay
 * que poder sustituir).
 */
export async function descargarFichero(id: string, token: string): Promise<Buffer> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`descarga de Drive: HTTP ${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Sustituye el CONTENIDO de un fichero de Drive, conservando su id. Es la
 * pieza clave del panel: la hoja guarda la URL con ese id, así que el enlace
 * no se rompe y no hay que tocar ni una celda.
 *
 * El `content-type` de la petición es también lo que Drive usa para
 * actualizar el `mimeType` guardado del fichero (verificado: si no se manda
 * el correcto, un PNG convertido a JPEG se queda etiquetado como imagen/png
 * aunque los bytes ya sean JPEG).
 */
export async function sustituirFichero(id: string, contenido: Buffer, mimeType: string, token: string): Promise<void> {
  const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': mimeType },
    body: contenido,
  });
  if (!r.ok) throw new Error(`sustitución en Drive: HTTP ${r.status} ${await r.text()}`);
}

/** Lee una celda de la hoja (notación A1, p.ej. `"Y5"`). */
export async function leerCelda(sheetId: string, celda: string, token: string): Promise<string> {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${celda}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`lectura de hoja: HTTP ${r.status} ${await r.text()}`);
  const j: any = await r.json();
  return j.values?.[0]?.[0] ?? '';
}

/** Escribe una celda de la hoja (notación A1). */
export async function escribirCelda(sheetId: string, celda: string, valor: string, token: string): Promise<void> {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${celda}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [[valor]] }),
  });
  if (!r.ok) throw new Error(`escritura en hoja: HTTP ${r.status} ${await r.text()}`);
}
