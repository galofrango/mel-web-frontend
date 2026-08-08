/**
 * Clases de estado del Design System que necesitan MÁS de un componente.
 *
 * Nace de un desajuste real: al cambiar el pulsado del botón phantom (Figma
 * 111:3934, de "el icono cambia de color" a "una placa detrás"), el cambio se
 * aplicó en `IconButton.astro` y `MenuItem.astro` se quedó atrás — pintaba los
 * mismos tokens a mano porque no puede anidar el componente (ver abajo). Dos
 * copias, una actualizada. Aquí hay una sola.
 *
 * Por qué son DOS cadenas y no una con el prefijo calculado: Tailwind encuentra
 * las clases leyendo el código fuente como texto. Una cadena montada con
 * `${prefijo}hover:...` no aparece literal en ninguna parte, así que Tailwind no
 * generaría esa utilidad y la clase quedaría escrita en el HTML sin ningún CSS
 * detrás. Es el fallo clásico de este framework, y es silencioso.
 *
 * - `PHANTOM_ESTADOS`: para cuando el propio elemento es el botón.
 * - `PHANTOM_ESTADOS_GRUPO`: para cuando el botón es un ANCESTRO con `.group` y
 *   este elemento es solo su hueco de icono. Pasa en `MenuItem`, que ya es un
 *   `<button>` con su texto: meterle dentro otro `<button>` es HTML inválido.
 *
 * `.mel-pulsado` es el pulsado que SOBREVIVE al dedo (ver `Layout.astro`): en un
 * teléfono, `:active` se suelta al levantar el dedo, así que si la acción tarda
 * te quedas sin saber si has acertado. Lo pone el JS solo en punteros táctiles,
 * de modo que en escritorio esto nunca llega a activarse.
 */

export const PHANTOM_ESTADOS =
  'text-mel-action-secondary hover:text-mel-action-primary ' +
  'active:bg-mel-bg-secondary active:text-mel-action-secondary ' +
  '[&.mel-pulsado]:bg-mel-bg-secondary [&.mel-pulsado]:text-mel-action-secondary';

export const PHANTOM_ESTADOS_GRUPO =
  'text-mel-action-secondary group-hover:text-mel-action-primary ' +
  'group-active:bg-mel-bg-secondary group-active:text-mel-action-secondary ' +
  'group-[.mel-pulsado]:bg-mel-bg-secondary group-[.mel-pulsado]:text-mel-action-secondary';

export const PRIMARIO_ESTADOS =
  'bg-mel-action-secondary text-mel-text-on-action ' +
  'hover:bg-mel-action-primary hover:text-mel-text-on-action-primary ' +
  'active:bg-mel-text-tertiary active:text-mel-text-on-action ' +
  '[&.mel-pulsado]:bg-mel-text-tertiary [&.mel-pulsado]:text-mel-text-on-action';
