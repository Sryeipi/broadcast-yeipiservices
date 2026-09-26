// Generador del broadcast vertical de Yeipi Services para TikTok LIVE.
// Cámara arriba (más pequeña), gameplay 16:9 entero abajo y la marca Yeipi debajo.
//
// Edita CONFIG y ejecuta:  npm run generar
// Salida en ./salida: overlay.png (huecos transparentes), vista-previa.png y LEEME.txt

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  lienzo: { ancho: 1080, alto: 1920 },
  // Los dos huecos van centrados en horizontal. Mantén 16:9 para no recortar nada.
  camara: { ancho: 768, alto: 432, y: 150 },
  juego: { ancho: 1040, alto: 585, y: 660 },
  marca: {
    siglas: 'YS',
    nombre: 'YEIPI SERVICES',
    enlace: 'discord.gg/yeipiservices',
    y: 1285, // borde superior del bloque de marca
  },
  colores: {
    fondo: '#05060a',
    fondoCentro: '#141824',
    luz: '#ffffff',
  },
  semilla: 7, // cambia el número para otra forma de los hilos de fondo
};

const FUENTES = ['Montserrat-Medium.ttf', 'Montserrat-ExtraBold.ttf', 'Montserrat-Black.ttf']
  .map((f) => join(RAIZ, 'fuentes', f));

// ---------------------------------------------------------------------------

const { ancho: W, alto: H } = CONFIG.lienzo;
const centrarX = (ancho) => Math.round((W - ancho) / 2);
const CAM = { ...CONFIG.camara, x: centrarX(CONFIG.camara.ancho) };
const JUEGO = { ...CONFIG.juego, x: centrarX(CONFIG.juego.ancho) };
const LUZ = CONFIG.colores.luz;

function comprobar() {
  const avisos = [];
  const es169 = (r) => Math.abs(r.ancho / r.alto - 16 / 9) < 0.005;
  if (!es169(CAM)) avisos.push(`La cámara (${CAM.ancho}x${CAM.alto}) no es 16:9: OBS la recortará o dejará bandas.`);
  if (!es169(JUEGO)) avisos.push(`El juego (${JUEGO.ancho}x${JUEGO.alto}) no es 16:9: se recortaría el HUD.`);
  if (CAM.ancho * CAM.alto >= JUEGO.ancho * JUEGO.alto) avisos.push('La cámara es igual o más grande que el juego.');
  if (CAM.y + CAM.alto > JUEGO.y) avisos.push('La cámara se solapa con el juego.');
  if (JUEGO.y + JUEGO.alto > CONFIG.marca.y) avisos.push('El juego se solapa con la marca.');
  for (const [n, r] of [['cámara', CAM], ['juego', JUEGO]]) {
    if (r.x < 0 || r.y < 0 || r.x + r.ancho > W || r.y + r.alto > H) avisos.push(`El hueco de ${n} se sale del lienzo.`);
  }
  for (const a of avisos) console.warn(`AVISO: ${a}`);
}

// Generador pseudoaleatorio con semilla, para que los hilos salgan siempre iguales.
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

// Un haz de hilos: varias curvas que salen juntas, se abren en el centro y vuelven a juntarse.
function haz(rnd, { desde, c1, c2, hasta, hilos, apertura }) {
  const trazos = [];
  for (let i = 0; i < hilos; i++) {
    const k = i - (hilos - 1) / 2;
    const d = (base, abre) => [
      r1(base[0] + k * abre * (0.6 + rnd() * 0.8)),
      r1(base[1] + k * abre * (0.6 + rnd() * 0.8)),
    ];
    const p0 = d(desde, apertura * 0.15);
    const p1 = d(c1, apertura);
    const p2 = d(c2, apertura);
    const p3 = d(hasta, apertura * 0.15);
    const opacidad = r1((0.1 + rnd() * 0.28) * 100) / 100;
    const grosor = r1(0.9 + rnd() * 0.9);
    trazos.push(
      `<path d="M${p0} C${p1} ${p2} ${p3}" stroke="${LUZ}" stroke-opacity="${opacidad}" stroke-width="${grosor}" fill="none"/>`,
    );
  }
  return trazos.join('\n');
}

function hilosDeFondo() {
  const rnd = aleatorio(CONFIG.semilla);
  const haces = [
    { desde: [-60, 40], c1: [300, 260], c2: [760, -40], hasta: [1140, 330], hilos: 7, apertura: 16 },
    { desde: [-60, 700], c1: [260, 420], c2: [820, 980], hasta: [1140, 560], hilos: 6, apertura: 20 },
    { desde: [1140, 1180], c1: [760, 1480], c2: [240, 1060], hasta: [-60, 1420], hilos: 6, apertura: 18 },
    { desde: [-60, 1560], c1: [360, 1880], c2: [700, 1420], hasta: [1140, 1800], hilos: 8, apertura: 22 },
    { desde: [-60, 1940], c1: [420, 1640], c2: [760, 2060], hasta: [1140, 1700], hilos: 5, apertura: 14 },
  ];
  return haces.map((h) => haz(rnd, h)).join('\n');
}

// Marco de luz alrededor de un hueco: línea fina + esquinas marcadas (el «canto»).
function marco(r, { separacion = 10, esquina = 38 } = {}) {
  const x0 = r.x - separacion;
  const y0 = r.y - separacion;
  const x1 = r.x + r.ancho + separacion;
  const y1 = r.y + r.alto + separacion;
  const e = esquina;
  const esquinas = [
    `M${x0},${y0 + e} L${x0},${y0} L${x0 + e},${y0}`,
    `M${x1 - e},${y0} L${x1},${y0} L${x1},${y0 + e}`,
    `M${x1},${y1 - e} L${x1},${y1} L${x1 - e},${y1}`,
    `M${x0 + e},${y1} L${x0},${y1} L${x0},${y1 - e}`,
  ];
  const mx = (x0 + x1) / 2;
  const marcas = [
    `M${mx - 14},${y0} L${mx + 14},${y0}`,
    `M${mx - 14},${y1} L${mx + 14},${y1}`,
  ];
  return `
  <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${LUZ}" stroke-opacity="0.45" stroke-width="1.5"/>
  <path d="${esquinas.join(' ')}" fill="none" stroke="${LUZ}" stroke-width="4" stroke-linecap="square"/>
  <path d="${marcas.join(' ')}" fill="none" stroke="${LUZ}" stroke-width="3"/>`;
}

// Hilo horizontal que se desvanece por los lados, con un nudo de luz en el centro.
function hiloHorizontal(y, { nudo = true, id }) {
  return `
  <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
    <stop offset="0" stop-color="${LUZ}" stop-opacity="0"/>
    <stop offset="0.5" stop-color="${LUZ}" stop-opacity="0.9"/>
    <stop offset="1" stop-color="${LUZ}" stop-opacity="0"/>
  </linearGradient>
  <line x1="40" y1="${y}" x2="${W - 40}" y2="${y}" stroke="url(#${id})" stroke-width="1.5"/>
  ${nudo ? `<rect x="${W / 2 - 6}" y="${y - 6}" width="12" height="12" transform="rotate(45 ${W / 2} ${y})" fill="${LUZ}"/>` : ''}`;
}

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const OPCIONES_FUENTE = {
  font: { fontFiles: FUENTES, loadSystemFonts: false, defaultFontFamily: 'Montserrat' },
};

// Mide el ancho real de un texto renderizándolo con resvg.
function anchoTexto(texto, { tam, peso, espaciado = 0 }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400">
    <text x="10" y="300" font-family="Montserrat" font-size="${tam}" font-weight="${peso}" letter-spacing="${espaciado}" fill="#fff">${escapar(texto)}</text>
  </svg>`;
  const bbox = new Resvg(svg, OPCIONES_FUENTE).getBBox();
  return bbox ? bbox.width : texto.length * tam * 0.7;
}

function bloqueMarca() {
  const { siglas, nombre, enlace, y } = CONFIG.marca;
  const logo = 104;
  const hueco = 30;
  const titulo = { tam: 58, peso: 900, espaciado: 4 };
  const sub = { tam: 28, peso: 500, espaciado: 1.5 };
  const anchoTitulo = anchoTexto(nombre, titulo);
  const anchoSub = anchoTexto(enlace, sub);
  const anchoColumna = Math.max(anchoTitulo, anchoSub);
  const x0 = Math.round((W - (logo + hueco + anchoColumna)) / 2);
  const xt = x0 + logo + hueco;

  return `
  <g filter="url(#brillo)">
    <rect x="${x0}" y="${y}" width="${logo}" height="${logo}" rx="24" fill="none" stroke="${LUZ}" stroke-width="3"/>
    <text x="${x0 + logo / 2}" y="${y + logo / 2 + 17}" text-anchor="middle" font-family="Montserrat" font-size="48" font-weight="900" letter-spacing="-1" fill="${LUZ}">${escapar(siglas)}</text>
  </g>
  <text x="${xt}" y="${y + 56}" font-family="Montserrat" font-size="${titulo.tam}" font-weight="${titulo.peso}" letter-spacing="${titulo.espaciado}" fill="${LUZ}" filter="url(#brilloSuave)">${escapar(nombre)}</text>
  <text x="${xt}" y="${y + 98}" font-family="Montserrat" font-size="${sub.tam}" font-weight="${sub.peso}" letter-spacing="${sub.espaciado}" fill="${LUZ}" fill-opacity="0.72">${escapar(enlace)}</text>`;
}

// ---------------------------------------------------------------------------
// Relleno de la vista previa (no va en el overlay)

function rellenoCamara(r) {
  const cx = r.x + r.ancho / 2;
  const cabeza = r.alto * 0.16;
  const cy = r.y + r.alto * 0.42;
  return `
  <linearGradient id="gCam" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2b3140"/><stop offset="1" stop-color="#171a22"/>
  </linearGradient>
  <rect x="${r.x}" y="${r.y}" width="${r.ancho}" height="${r.alto}" fill="url(#gCam)"/>
  <circle cx="${cx}" cy="${cy}" r="${cabeza}" fill="#475064"/>
  <path d="M${cx - cabeza * 2.3},${r.y + r.alto} C${cx - cabeza * 2.2},${cy + cabeza * 1.5} ${cx + cabeza * 2.2},${cy + cabeza * 1.5} ${cx + cabeza * 2.3},${r.y + r.alto} Z" fill="#475064"/>
  <text x="${r.x + 22}" y="${r.y + r.alto - 22}" font-family="Montserrat" font-size="24" font-weight="800" letter-spacing="2" fill="#fff" fill-opacity="0.8">TU CÁMARA · ${r.ancho}×${r.alto}</text>`;
}

function rellenoJuego(r) {
  const { x, y, ancho: w, alto: h } = r;
  return `
  <linearGradient id="gCielo" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1d3a5c"/><stop offset="0.55" stop-color="#3f6d8f"/><stop offset="0.56" stop-color="#2f3b2c"/><stop offset="1" stop-color="#1c2419"/>
  </linearGradient>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gCielo)"/>
  <path d="M${x},${y + h * 0.56} L${x + w * 0.18},${y + h * 0.4} L${x + w * 0.33},${y + h * 0.5} L${x + w * 0.52},${y + h * 0.33} L${x + w * 0.74},${y + h * 0.49} L${x + w},${y + h * 0.38} L${x + w},${y + h * 0.56} Z" fill="#26344a"/>
  <g stroke="#fff" stroke-width="3" stroke-opacity="0.9">
    <line x1="${x + w / 2 - 16}" y1="${y + h / 2}" x2="${x + w / 2 - 6}" y2="${y + h / 2}"/>
    <line x1="${x + w / 2 + 6}" y1="${y + h / 2}" x2="${x + w / 2 + 16}" y2="${y + h / 2}"/>
    <line x1="${x + w / 2}" y1="${y + h / 2 - 16}" x2="${x + w / 2}" y2="${y + h / 2 - 6}"/>
    <line x1="${x + w / 2}" y1="${y + h / 2 + 6}" x2="${x + w / 2}" y2="${y + h / 2 + 16}"/>
  </g>
  <rect x="${x + w - 170}" y="${y + 18}" width="150" height="150" rx="10" fill="#0c1016" fill-opacity="0.75" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/>
  <circle cx="${x + w - 95}" cy="${y + 93}" r="6" fill="#ffd34d"/>
  <rect x="${x + 20}" y="${y + h - 52}" width="260" height="22" rx="4" fill="#0c1016" fill-opacity="0.75"/>
  <rect x="${x + 24}" y="${y + h - 48}" width="190" height="14" rx="3" fill="#5fe08a"/>
  <text x="${x + w - 24}" y="${y + h - 28}" text-anchor="end" font-family="Montserrat" font-size="40" font-weight="900" fill="#fff">30 / 90</text>
  <text x="${x + 20}" y="${y + 44}" font-family="Montserrat" font-size="24" font-weight="800" letter-spacing="2" fill="#fff" fill-opacity="0.85">GAMEPLAY 16:9 · ${w}×${h} · HUD ENTERO</text>`;
}

// ---------------------------------------------------------------------------

function construirSVG({ vistaPrevia }) {
  const huecos = [CAM, JUEGO]
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.ancho}" height="${r.alto}" fill="#000"/>`)
    .join('');
  const yEntre = Math.round((CAM.y + CAM.alto + JUEGO.y) / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="gFondo" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${H * 0.42}" r="${H * 0.62}">
      <stop offset="0" stop-color="${CONFIG.colores.fondoCentro}"/>
      <stop offset="1" stop-color="${CONFIG.colores.fondo}"/>
    </radialGradient>
    <filter id="brillo" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="brilloSuave" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <mask id="huecos" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#fff"/>${huecos}
    </mask>
  </defs>
  ${vistaPrevia ? rellenoCamara(CAM) + rellenoJuego(JUEGO) : ''}
  <g mask="url(#huecos)">
    <rect width="${W}" height="${H}" fill="url(#gFondo)"/>
    <g filter="url(#brilloSuave)">
${hilosDeFondo()}
    </g>
    <g filter="url(#brillo)">
      ${marco(CAM)}
      ${marco(JUEGO)}
      ${hiloHorizontal(yEntre, { id: 'hEntre' })}
    </g>
    ${bloqueMarca()}
  </g>
</svg>`;
}

function renderizar(svg, archivo) {
  const png = new Resvg(svg, { ...OPCIONES_FUENTE, fitTo: { mode: 'original' } }).render().asPng();
  writeFileSync(archivo, png);
  console.log(`✔ ${archivo}`);
}

function leeme() {
  const caja = (r) => `Posición X=${r.x}  Y=${r.y}   ·   Tamaño ${r.ancho} x ${r.alto}`;
  return `BROADCAST TIKTOK v2.1 — YEIPI SERVICES
======================================

Diseño vertical 1080 x 1920 con hilos de luz blanca:
  · Arriba: la cámara (más pequeña que el juego), 16:9 entera.
  · Abajo: el gameplay en 16:9, entero, sin recortar nada del HUD.
  · Debajo del juego: logo ${CONFIG.marca.siglas}, ${CONFIG.marca.nombre} y ${CONFIG.marca.enlace}.

ARCHIVOS
  overlay.png       Capa que va encima de todo (los huecos son transparentes).
  vista-previa.png  Cómo queda con cámara y juego de ejemplo.

MONTAJE EN OBS
  1. Ajustes > Vídeo: resolución base y de salida 1080x1920.
  2. Añade la cámara (Dispositivo de captura de vídeo).
     Clic derecho > Transformar > Editar transformación (Ctrl+E):
       ${caja(CAM)}
  3. Añade el juego (Captura de juego o de pantalla), Ctrl+E:
       ${caja(JUEGO)}
  4. Añade una fuente Imagen con overlay.png en X=0 Y=0.
     Súbela arriba del todo en la lista de fuentes.

NOTAS
  · Cámara y juego tienen que ser 16:9 (1920x1080, 1280x720…) para que
    encajen sin recortar. Si tu cámara es 4:3, en Ctrl+E pon el tipo de
    caja delimitadora en «Escalar al interior de los límites» con el
    tamaño de arriba: sale entera con dos bandas oscuras a los lados.
  · En el directo, el chat de TikTok tapa la parte baja de la pantalla
    cuando hay comentarios; por eso todo va lo más arriba posible.

Generado con generar.js (npm run generar).
`;
}

comprobar();
const SALIDA = join(RAIZ, 'salida');
mkdirSync(SALIDA, { recursive: true });
renderizar(construirSVG({ vistaPrevia: false }), join(SALIDA, 'overlay.png'));
renderizar(construirSVG({ vistaPrevia: true }), join(SALIDA, 'vista-previa.png'));
writeFileSync(join(SALIDA, 'LEEME.txt'), leeme());
console.log(`✔ ${join(SALIDA, 'LEEME.txt')}`);
