// Genera el overlay quieto (PNG), la vista previa y el LEEME con los pasos en OBS.
// Uso: npm run generar   (el vídeo en bucle se hace con npm run animar)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAM, CONFIG, JUEGO, RAIZ, SEGUNDOS_BUCLE, comprobar, construirSVG, renderizar } from './diseno.js';

function guardar(svg, archivo) {
  writeFileSync(archivo, renderizar(svg).asPng());
  console.log(`✔ ${archivo}`);
}

function leeme() {
  const caja = (r) => `Posición X=${r.x}  Y=${r.y}   ·   Tamaño ${r.ancho} x ${r.alto}`;
  const segundos = SEGUNDOS_BUCLE;
  const servicios = CONFIG.marca.servicios;
  return `BROADCAST TIKTOK v2.3 — YEIPI SERVICES
======================================

Diseño vertical 1080 x 1920, fondo oscuro con hilos de luz blanca:
  · Arriba: la cámara (más pequeña que el juego), 16:9 entera.
  · Abajo: el gameplay en 16:9, entero, sin recortar nada del HUD.
  · Debajo del juego: logo ${CONFIG.marca.siglas}, ${CONFIG.marca.nombre} y ${CONFIG.marca.enlace}.
${servicios.length ? `  · Debajo de la marca, un rótulo que va cambiando solo entre los servicios
    (${CONFIG.animacion.segundosPorServicio} s cada uno): ${servicios.join(' · ')}.
` : ''}
ARCHIVOS
  overlay-animado.webm       Overlay en bucle de ${segundos} s (hilos que se mueven, destellos
                             que recorren los marcos, brillo en la marca${servicios.length ? ' y los\n                             servicios cambiando' : ''}).
                             Los huecos son transparentes.
  overlay.png                El mismo overlay quieto, por si prefieres imagen fija${servicios.length ? '\n                             (solo muestra el primer servicio)' : ''}.
  vista-previa-animada.mp4   Cómo queda en movimiento con cámara y juego de ejemplo.
  vista-previa-animada.gif   Lo mismo en pequeño, para verlo rápido.
  vista-previa.png           Vista previa quieta.

MONTAJE EN OBS
  1. Ajustes > Vídeo: resolución base y de salida 1080x1920.
  2. Añade la cámara (Dispositivo de captura de vídeo).
     Clic derecho > Transformar > Editar transformación (Ctrl+E):
       ${caja(CAM)}
  3. Añade el juego (Captura de juego o de pantalla), Ctrl+E:
       ${caja(JUEGO)}
  4. Overlay animado: añade una «Fuente multimedia» con overlay-animado.webm.
       · Marca «Bucle».
       · DESMARCA «Usar decodificación por hardware cuando esté disponible»:
         con ella activada la transparencia sale en negro y tapa cámara y juego.
       · Colócala en X=0 Y=0 y súbela arriba del todo en la lista de fuentes.
     (Si prefieres el overlay quieto, usa una fuente Imagen con overlay.png.)

NOTAS
  · Cámara y juego tienen que ser 16:9 (1920x1080, 1280x720…) para que
    encajen sin recortar. Si tu cámara es 4:3, en Ctrl+E pon el tipo de
    caja delimitadora en «Escalar al interior de los límites» con el
    tamaño de arriba: sale entera con dos bandas oscuras a los lados.
  · En el directo, el chat de TikTok tapa la parte baja de la pantalla
    cuando hay comentarios; por eso todo va lo más arriba posible.

Generado con generar.js y animar.js (npm run generar / npm run animar).
`;
}

comprobar();
const SALIDA = join(RAIZ, 'salida');
mkdirSync(SALIDA, { recursive: true });
guardar(construirSVG(), join(SALIDA, 'overlay.png'));
guardar(construirSVG({ relleno: 'ejemplo' }), join(SALIDA, 'vista-previa.png'));
writeFileSync(join(SALIDA, 'LEEME.txt'), leeme());
console.log(`✔ ${join(SALIDA, 'LEEME.txt')}`);
