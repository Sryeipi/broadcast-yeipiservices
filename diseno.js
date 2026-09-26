// Diseño del broadcast vertical de Yeipi Services para TikTok LIVE.
// Cámara arriba (más pequeña), gameplay 16:9 entero abajo y la marca Yeipi debajo.
//
// Todo lo que se suele tocar está en CONFIG. Lo usan generar.js (PNG) y animar.js (vídeo en bucle).

import { Resvg } from '@resvg/resvg-js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  lienzo: { ancho: 1080, alto: 1920 },
  // Los dos huecos van centrados en horizontal. Mantén 16:9 para no recortar nada.
  camara: { ancho: 768, alto: 432, y: 150 },
  juego: { ancho: 1040, alto: 585, y: 660 },
  marca: {
    siglas: 'YS',
    nombre: 'YEIPI SERVICES',
    enlace: 'discord.gg/yeipiservices',
    y: 1285, // borde superior del bloque de marca
    // Rótulo debajo de la marca que va cambiando solo, uno detrás de otro. Deja la lista vacía para quitarlo.
    servicios: ['SERVICIO 1', 'SERVICIO 2', 'SERVICIO CON UN NOMBRE MÁS LARGO', 'SERVICIO 4'],
  },
  colores: {
    fondo: '#05060a',
    fondoCentro: '#141824',
    luz: '#ffffff',
    halo: '#2a3350', // mancha de luz que se mueve despacio por el fondo (solo en el vídeo)
  },
  semilla: 7, // cambia el número para otra forma de los hilos de fondo
  animacion: {
    segundosPorServicio: 3, // el bucle dura esto × número de servicios
    segundosSinServicios: 8, // duración del bucle si la lista de servicios está vacía
    fps: 30,
  },
};

export const SEGUNDOS_BUCLE = CONFIG.marca.servicios.length
  ? CONFIG.marca.servicios.length * CONFIG.animacion.segundosPorServicio
  : CONFIG.animacion.segundosSinServicios;

const FUENTES = ['Montserrat-Medium.ttf', 'Montserrat-ExtraBold.ttf', 'Montserrat-Black.ttf']
  .map((f) => join(RAIZ, 'fuentes', f));

export const OPCIONES_FUENTE = {
  font: { fontFiles: FUENTES, loadSystemFonts: false, defaultFontFamily: 'Montserrat' },
};

// ---------------------------------------------------------------------------

export const { ancho: W, alto: H } = CONFIG.lienzo;
const centrarX = (ancho) => Math.round((W - ancho) / 2);
export const CAM = { ...CONFIG.camara, x: centrarX(CONFIG.camara.ancho) };
export const JUEGO = { ...CONFIG.juego, x: centrarX(CONFIG.juego.ancho) };
const LUZ = CONFIG.colores.luz;
const TAU = Math.PI * 2;

export function comprobar() {
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
const frac = (n) => n - Math.floor(n);
// Onda que vuelve al mismo valor al final del bucle (t va de 0 a 1). Sin t, el diseño queda quieto.
const onda = (t, fase = 0, vueltas = 1) => (t == null ? 0 : Math.sin(TAU * (vueltas * t + fase)));

function largoBezier(p0, p1, p2, p3) {
  let largo = 0;
  let prev = p0;
  for (let i = 1; i <= 48; i++) {
    const u = i / 48;
    const a = (1 - u) ** 3;
    const b = 3 * (1 - u) ** 2 * u;
    const c = 3 * (1 - u) * u ** 2;
    const d = u ** 3;
    const p = [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
    largo += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return largo;
}

// Destello con estela que recorre un trazo. `cabeza` es la distancia recorrida desde el inicio.
// Capas de la más larga y tenue a la más corta y brillante, todas acabando en la cabeza.
const ESTELA = [
  { largo: 240, grosor: 1.6, opacidad: 0.18 },
  { largo: 110, grosor: 2.2, opacidad: 0.45 },
  { largo: 26, grosor: 3.2, opacidad: 1 },
];

function destello(d, cabeza, periodo) {
  return ESTELA.map(
    ({ largo, grosor, opacidad }) =>
      `<path d="${d}" fill="none" stroke="${LUZ}" stroke-opacity="${opacidad}" stroke-width="${grosor}" stroke-linecap="round" stroke-dasharray="${largo} ${r1(periodo - largo)}" stroke-dashoffset="${r1(largo - cabeza)}"/>`,
  ).join('\n');
}

// Un haz de hilos: varias curvas que salen juntas, se abren en el centro y vuelven a juntarse.
// En el vídeo el haz ondula y algunos hilos llevan un destello de luz que los recorre.
function haz(rnd, h, indice, t) {
  const fase = indice * 0.23;
  const c1 = [h.c1[0] + 50 * onda(t, fase + 0.25), h.c1[1] + h.ola * onda(t, fase)];
  const c2 = [h.c2[0] - 50 * onda(t, fase), h.c2[1] - h.ola * onda(t, fase + 0.25)];
  const apertura = h.apertura * (1 + 0.3 * onda(t, fase + 0.5));
  const trazos = [];
  const destellos = [];
  for (let i = 0; i < h.hilos; i++) {
    const k = i - (h.hilos - 1) / 2;
    const d = (base, abre) => [
      r1(base[0] + k * abre * (0.6 + rnd() * 0.8)),
      r1(base[1] + k * abre * (0.6 + rnd() * 0.8)),
    ];
    const p0 = d(h.desde, apertura * 0.15);
    const p1 = d(c1, apertura);
    const p2 = d(c2, apertura);
    const p3 = d(h.hasta, apertura * 0.15);
    const opacidad = r1((0.1 + rnd() * 0.28) * 100) / 100;
    const grosor = r1(0.9 + rnd() * 0.9);
    const camino = `M${p0} C${p1} ${p2} ${p3}`;
    trazos.push(
      `<path d="${camino}" stroke="${LUZ}" stroke-opacity="${opacidad}" stroke-width="${grosor}" fill="none"/>`,
    );
    if (t != null && (i === 1 || i === h.hilos - 2)) {
      // La cabeza va de 0 a largo+estela: al principio y al final del bucle el destello está fuera
      // del trazo, así que el corte del bucle no se nota.
      const largo = largoBezier(p0, p1, p2, p3);
      const recorrido = largo + ESTELA[0].largo;
      const avance = frac(t + indice * 0.37 + (i === 1 ? 0 : 0.5));
      destellos.push(destello(camino, avance * recorrido, recorrido + ESTELA[0].largo));
    }
  }
  return { trazos: trazos.join('\n'), destellos: destellos.join('\n') };
}

const HACES = [
  { desde: [-60, 40], c1: [300, 260], c2: [760, -40], hasta: [1140, 330], hilos: 7, apertura: 16, ola: 70 },
  { desde: [-60, 700], c1: [260, 420], c2: [820, 980], hasta: [1140, 560], hilos: 6, apertura: 20, ola: 90 },
  { desde: [1140, 1180], c1: [760, 1480], c2: [240, 1060], hasta: [-60, 1420], hilos: 6, apertura: 18, ola: 80 },
  { desde: [-60, 1560], c1: [360, 1880], c2: [700, 1420], hasta: [1140, 1800], hilos: 8, apertura: 22, ola: 110 },
  { desde: [-60, 1940], c1: [420, 1640], c2: [760, 2060], hasta: [1140, 1700], hilos: 5, apertura: 14, ola: 90 },
];

function hilosDeFondo(t) {
  const rnd = aleatorio(CONFIG.semilla);
  const partes = HACES.map((h, i) => haz(rnd, h, i, t));
  return {
    trazos: partes.map((p) => p.trazos).join('\n'),
    destellos: partes.map((p) => p.destellos).join('\n'),
  };
}

// Motas de luz que flotan en círculos pequeños y parpadean (solo en el vídeo).
function motas(t) {
  if (t == null) return '';
  const rnd = aleatorio(CONFIG.semilla * 31 + 5);
  const puntos = [];
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const radio = 1 + rnd() * 1.6;
    const giro = 6 + rnd() * 14;
    const fase = rnd();
    const parpadeo = 1 + Math.floor(rnd() * 2);
    const base = 0.25 + rnd() * 0.45;
    const cx = x + giro * Math.cos(TAU * (t + fase));
    const cy = y + giro * Math.sin(TAU * (t + fase));
    const opacidad = base * (0.3 + 0.7 * (0.5 + 0.5 * onda(t, fase * 3, parpadeo)));
    puntos.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(radio)}" fill="${LUZ}" fill-opacity="${r1(opacidad * 100) / 100}"/>`);
  }
  return puntos.join('\n');
}

// Marco de luz alrededor de un hueco: línea fina + esquinas marcadas (el «canto»).
// En el vídeo, las esquinas respiran y dos destellos dan vueltas al marco.
function marco(r, t, { separacion = 10, esquina = 38, fase = 0 } = {}) {
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
  const respiro = t == null ? 1 : r1((0.78 + 0.22 * onda(t, fase)) * 100) / 100;
  let vueltas = '';
  if (t != null) {
    const contorno = `M${x0},${y0} H${x1} V${y1} H${x0} Z`;
    const perimetro = 2 * (x1 - x0 + y1 - y0);
    // El patrón de trazos mide lo mismo que el perímetro, así que al dar la vuelta completa
    // en un bucle el destello vuelve exactamente al mismo sitio.
    vueltas = [0, 0.5]
      .map((extra) => {
        const cabeza = frac(t + fase + extra) * perimetro;
        return ESTELA.slice(0, 2).concat({ largo: 40, grosor: 3, opacidad: 1 })
          .map(({ largo, grosor, opacidad }) =>
            `<path d="${contorno}" fill="none" stroke="${LUZ}" stroke-opacity="${opacidad}" stroke-width="${grosor}" stroke-linecap="round" stroke-dasharray="${largo} ${r1(perimetro - largo)}" stroke-dashoffset="${r1(largo - cabeza)}"/>`)
          .join('\n');
      })
      .join('\n');
  }
  return `
  <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${LUZ}" stroke-opacity="0.45" stroke-width="1.5"/>
  <g opacity="${respiro}">
  <path d="${esquinas.join(' ')}" fill="none" stroke="${LUZ}" stroke-width="4" stroke-linecap="square"/>
  <path d="${marcas.join(' ')}" fill="none" stroke="${LUZ}" stroke-width="3"/>
  </g>${vueltas}`;
}

// Hilo horizontal que se desvanece por los lados, con un nudo de luz en el centro.
function hiloHorizontal(y, t, { id }) {
  const lado = r1(12 * (1 + 0.3 * onda(t, 0, 2)));
  return `
  <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
    <stop offset="0" stop-color="${LUZ}" stop-opacity="0"/>
    <stop offset="0.5" stop-color="${LUZ}" stop-opacity="0.9"/>
    <stop offset="1" stop-color="${LUZ}" stop-opacity="0"/>
  </linearGradient>
  <line x1="40" y1="${y}" x2="${W - 40}" y2="${y}" stroke="url(#${id})" stroke-width="1.5"/>
  <rect x="${W / 2 - lado / 2}" y="${y - lado / 2}" width="${lado}" height="${lado}" transform="rotate(45 ${W / 2} ${y})" fill="${LUZ}"/>`;
}

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Mide el ancho real de un texto renderizándolo con resvg.
const medidas = new Map();
function anchoTexto(texto, { tam, peso, espaciado = 0 }) {
  const clave = `${texto}|${tam}|${peso}|${espaciado}`;
  if (!medidas.has(clave)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400">
      <text x="10" y="300" font-family="Montserrat" font-size="${tam}" font-weight="${peso}" letter-spacing="${espaciado}" fill="#fff">${escapar(texto)}</text>
    </svg>`;
    const bbox = new Resvg(svg, OPCIONES_FUENTE).getBBox();
    medidas.set(clave, bbox ? bbox.width : texto.length * tam * 0.7);
  }
  return medidas.get(clave);
}

// Logo YS + nombre + enlace. En el vídeo pasa un brillo diagonal por encima una vez por bucle.
function bloqueMarca(t) {
  const { siglas, nombre, enlace, y } = CONFIG.marca;
  const logo = 104;
  const hueco = 30;
  const titulo = { tam: 58, peso: 900, espaciado: 4 };
  const sub = { tam: 28, peso: 500, espaciado: 1.5 };
  const anchoColumna = Math.max(anchoTexto(nombre, titulo), anchoTexto(enlace, sub));
  const anchoTotal = logo + hueco + anchoColumna;
  const x0 = Math.round((W - anchoTotal) / 2);
  const xt = x0 + logo + hueco;

  const piezas = (relleno) => `
    <rect x="${x0}" y="${y}" width="${logo}" height="${logo}" rx="24" fill="none" stroke="${relleno}" stroke-width="3"/>
    <text x="${x0 + logo / 2}" y="${y + logo / 2 + 17}" text-anchor="middle" font-family="Montserrat" font-size="48" font-weight="900" letter-spacing="-1" fill="${relleno}">${escapar(siglas)}</text>
    <text x="${xt}" y="${y + 56}" font-family="Montserrat" font-size="${titulo.tam}" font-weight="${titulo.peso}" letter-spacing="${titulo.espaciado}" fill="${relleno}">${escapar(nombre)}</text>`;

  // El brillo cruza entre el 45 % y el 75 % del bucle; el resto del tiempo no se dibuja.
  let brillo = '';
  const inicio = 0.45;
  const duracion = 0.3;
  if (t != null && frac(t) >= inicio && frac(t) < inicio + duracion) {
    const q = (frac(t) - inicio) / duracion;
    const bx = x0 - 160 + q * (anchoTotal + 320);
    const yc = y + logo / 2;
    brillo = `
  <linearGradient id="gBrilloMarca" gradientUnits="userSpaceOnUse" x1="${r1(bx - 90)}" y1="0" x2="${r1(bx + 90)}" y2="0"
    gradientTransform="translate(${r1(bx)} ${yc}) skewX(-22) translate(${r1(-bx)} ${-yc})">
    <stop offset="0" stop-color="${LUZ}" stop-opacity="0"/>
    <stop offset="0.5" stop-color="${LUZ}" stop-opacity="1"/>
    <stop offset="1" stop-color="${LUZ}" stop-opacity="0"/>
  </linearGradient>
  <g filter="url(#brillo)">${piezas('url(#gBrilloMarca)')}</g>`;
  }

  return `
  <g filter="url(#brillo)">
    <rect x="${x0}" y="${y}" width="${logo}" height="${logo}" rx="24" fill="none" stroke="${LUZ}" stroke-width="3"/>
    <text x="${x0 + logo / 2}" y="${y + logo / 2 + 17}" text-anchor="middle" font-family="Montserrat" font-size="48" font-weight="900" letter-spacing="-1" fill="${LUZ}">${escapar(siglas)}</text>
  </g>
  <text x="${xt}" y="${y + 56}" font-family="Montserrat" font-size="${titulo.tam}" font-weight="${titulo.peso}" letter-spacing="${titulo.espaciado}" fill="${LUZ}" filter="url(#brilloSuave)">${escapar(nombre)}</text>
  <text x="${xt}" y="${y + 98}" font-family="Montserrat" font-size="${sub.tam}" font-weight="${sub.peso}" letter-spacing="${sub.espaciado}" fill="${LUZ}" fill-opacity="0.72">${escapar(enlace)}</text>${brillo}`;
}

const suavizar = (x) => 1 - (1 - x) ** 3;

// Rótulo de servicios debajo de la marca. Cada servicio entra desde abajo mientras el anterior
// sale por arriba, el marco destella en cada cambio y los puntos de debajo marcan cuál va.
// Sin t (PNG quieto) se ve el primer servicio.
function rotuloServicios(t) {
  const lista = CONFIG.marca.servicios.map((s) => s.toUpperCase());
  const n = lista.length;
  if (!n) return '';
  const ancho = 780;
  const alto = 76;
  const x0 = (W - ancho) / 2;
  const x1 = x0 + ancho;
  const y0 = CONFIG.marca.y + 138;
  const y1 = y0 + alto;
  const cy = y0 + alto / 2;

  const posicion = t == null ? 0 : frac(t) * n;
  const actual = Math.floor(posicion);
  const anterior = (actual - 1 + n) % n;
  const u = posicion - actual; // avance dentro del turno de este servicio
  const cambio = 0.16; // parte del turno que dura la transición
  const p = t == null ? 1 : suavizar(Math.min(1, u / cambio));
  const destelloCambio = t == null ? 0 : Math.sin(Math.PI * Math.min(1, u / cambio));

  const estilo = { tam: 34, peso: 800, espaciado: 3 };
  const anchoMax = ancho - 150;
  const texto = (s, dy, opacidad) => {
    const medido = anchoTexto(s, estilo);
    const tam = medido > anchoMax ? Math.max(20, Math.floor((estilo.tam * anchoMax) / medido)) : estilo.tam;
    return `<text x="${W / 2}" y="${r1(cy + tam * 0.36 + dy)}" text-anchor="middle" font-family="Montserrat" font-size="${tam}" font-weight="${estilo.peso}" letter-spacing="${estilo.espaciado}" fill="${LUZ}" fill-opacity="${r1(opacidad * 100) / 100}">${escapar(s)}</text>`;
  };
  let textos = texto(lista[actual], (1 - p) * 34, p);
  if (p < 1 && n > 1) textos = texto(lista[anterior], -p * 34, 1 - p) + textos;

  const e = 16;
  const esquinas = [
    `M${x0},${y0 + e} L${x0},${y0} L${x0 + e},${y0}`,
    `M${x1 - e},${y0} L${x1},${y0} L${x1},${y0 + e}`,
    `M${x1},${y1 - e} L${x1},${y1} L${x1 - e},${y1}`,
    `M${x0 + e},${y1} L${x0},${y1} L${x0},${y1 - e}`,
  ].join(' ');
  const rombo = (x) =>
    `<rect x="${x - 4.5}" y="${cy - 4.5}" width="9" height="9" transform="rotate(45 ${x} ${cy})" fill="${LUZ}"/>`;

  let puntos = '';
  if (n > 1 && n <= 12) {
    const separacion = 30;
    const yp = y1 + 24;
    puntos = lista
      .map((_, i) => {
        const peso = i === actual ? p : i === anterior && n > 1 ? 1 - p : 0;
        const w = 7 + 19 * peso;
        const x = W / 2 + (i - (n - 1) / 2) * separacion;
        return `<rect x="${r1(x - w / 2)}" y="${yp - 3.5}" width="${r1(w)}" height="7" rx="3.5" fill="${LUZ}" fill-opacity="${r1((0.3 + 0.7 * peso) * 100) / 100}"/>`;
      })
      .join('\n');
  }

  return `
  <clipPath id="clipRotulo"><rect x="${x0 + 2}" y="${y0 + 2}" width="${ancho - 4}" height="${alto - 4}"/></clipPath>
  <rect x="${x0}" y="${y0}" width="${ancho}" height="${alto}" fill="${LUZ}" fill-opacity="0.03" stroke="${LUZ}" stroke-opacity="0.4" stroke-width="1.5"/>
  <g filter="url(#brillo)">
    <path d="${esquinas}" fill="none" stroke="${LUZ}" stroke-width="3" stroke-linecap="square"/>
    ${rombo(x0 + 34)}${rombo(x1 - 34)}
    ${destelloCambio > 0.01 ? `<rect x="${x0}" y="${y0}" width="${ancho}" height="${alto}" fill="none" stroke="${LUZ}" stroke-width="2.5" stroke-opacity="${r1(destelloCambio * 90) / 100}"/>` : ''}
  </g>
  <g clip-path="url(#clipRotulo)" filter="url(#brilloSuave)">${textos}</g>
  <g filter="url(#brilloSuave)">${puntos}</g>`;
}

// Mancha de luz muy suave que da vueltas por el fondo (solo en el vídeo).
function halo(t) {
  if (t == null) return '';
  const cx = W / 2 + 200 * Math.cos(TAU * t);
  const cy = H * 0.45 + 300 * Math.sin(TAU * t);
  return `
  <radialGradient id="gHalo" gradientUnits="userSpaceOnUse" cx="${r1(cx)}" cy="${r1(cy)}" r="560">
    <stop offset="0" stop-color="${CONFIG.colores.halo}" stop-opacity="0.45"/>
    <stop offset="1" stop-color="${CONFIG.colores.halo}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#gHalo)"/>`;
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

// t: momento del bucle, de 0 a 1 (sin t sale el diseño quieto del overlay.png).
// relleno: 'nada' (overlay), 'ejemplo' (cámara y juego de muestra), 'soloEjemplo' (solo los rellenos, sin overlay).
export function construirSVG({ relleno = 'nada', t = null } = {}) {
  const huecos = [CAM, JUEGO]
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.ancho}" height="${r.alto}" fill="#000"/>`)
    .join('');
  const yEntre = Math.round((CAM.y + CAM.alto + JUEGO.y) / 2);
  const ejemplo = relleno !== 'nada' ? rellenoCamara(CAM) + rellenoJuego(JUEGO) : '';
  if (relleno === 'soloEjemplo') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${ejemplo}</svg>`;
  }
  const hilos = hilosDeFondo(t);

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
  ${ejemplo}
  <g mask="url(#huecos)">
    <rect width="${W}" height="${H}" fill="url(#gFondo)"/>
    ${halo(t)}
    <g filter="url(#brilloSuave)">
${hilos.trazos}
${motas(t)}
    </g>
    <g filter="url(#brillo)">
${hilos.destellos}
      ${marco(CAM, t, { fase: 0.25 })}
      ${marco(JUEGO, t)}
      ${hiloHorizontal(yEntre, t, { id: 'hEntre' })}
    </g>
    ${bloqueMarca(t)}
    ${rotuloServicios(t)}
  </g>
</svg>`;
}

export const renderizar = (svg) => new Resvg(svg, { ...OPCIONES_FUENTE, fitTo: { mode: 'original' } }).render();
