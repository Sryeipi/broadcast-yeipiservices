// Genera el overlay animado en bucle (WebM con transparencia para OBS) y las vistas previas animadas.
// Uso: npm run animar
// Usa el ffmpeg que trae ffmpeg-static; para usar otro, pon su ruta en la variable FFMPEG.

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { CONFIG, H, RAIZ, SEGUNDOS_BUCLE, W, comprobar, construirSVG, renderizar } from './diseno.js';

const FFMPEG = process.env.FFMPEG || ffmpegStatic;
const { fps } = CONFIG.animacion;
const FOTOGRAMAS = Math.round(SEGUNDOS_BUCLE * fps);
const SALIDA = join(RAIZ, 'salida');
const ENTRADA_CRUDA = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-'];

function lanzar(args) {
  const proc = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'pipe'] });
  let errores = '';
  proc.stderr.on('data', (d) => { errores += d; });
  proc.terminado = new Promise((resolver, rechazar) => {
    proc.on('error', rechazar);
    proc.on('close', (codigo) => (codigo === 0 ? resolver() : rechazar(new Error(`ffmpeg terminó con código ${codigo}\n${errores}`))));
  });
  return proc;
}

const escribir = (proc, datos) =>
  new Promise((resolver) => (proc.stdin.write(datos) ? resolver() : proc.stdin.once('drain', resolver)));

// resvg entrega los píxeles con el alfa premultiplicado; ffmpeg los espera sin premultiplicar.
// Sin esto, los brillos semitransparentes saldrían con un borde oscuro.
function despremultiplicar(px) {
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a !== 0 && a !== 255) {
      const f = 255 / a;
      px[i] = Math.min(255, Math.round(px[i] * f));
      px[i + 1] = Math.min(255, Math.round(px[i + 1] * f));
      px[i + 2] = Math.min(255, Math.round(px[i + 2] * f));
    }
  }
  return px;
}

async function main() {
  comprobar();
  mkdirSync(SALIDA, { recursive: true });
  const temporal = mkdtempSync(join(tmpdir(), 'broadcast-'));
  const ejemplo = join(temporal, 'ejemplo.png');
  writeFileSync(ejemplo, renderizar(construirSVG({ relleno: 'soloEjemplo' })).asPng());

  const webm = join(SALIDA, 'overlay-animado.webm');
  const mp4 = join(SALIDA, 'vista-previa-animada.mp4');
  const gif = join(SALIDA, 'vista-previa-animada.gif');

  // VP9 con canal alfa: OBS lo reproduce con transparencia (sin decodificación por hardware).
  const overlay = lanzar([
    ...ENTRADA_CRUDA,
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '26', '-b:v', '0',
    '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-an', webm,
  ]);
  // Vista previa: el mismo overlay encima de una cámara y un juego de ejemplo.
  const previa = lanzar([
    '-loop', '1', '-framerate', String(fps), '-i', ejemplo,
    ...ENTRADA_CRUDA,
    '-filter_complex', '[0:v][1:v]overlay=format=auto,format=yuv420p',
    '-frames:v', String(FOTOGRAMAS), '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
    '-movflags', '+faststart', '-an', mp4,
  ]);

  const inicio = Date.now();
  for (let i = 0; i < FOTOGRAMAS; i++) {
    const px = despremultiplicar(renderizar(construirSVG({ t: i / FOTOGRAMAS })).pixels);
    await Promise.all([escribir(overlay, px), escribir(previa, px)]);
    if ((i + 1) % fps === 0 || i + 1 === FOTOGRAMAS) {
      const s = ((Date.now() - inicio) / 1000).toFixed(0);
      process.stdout.write(`\r  fotograma ${i + 1}/${FOTOGRAMAS} (${s} s)`);
    }
  }
  process.stdout.write('\n');
  overlay.stdin.end();
  previa.stdin.end();
  await Promise.all([overlay.terminado, previa.terminado]);
  console.log(`✔ ${webm}`);
  console.log(`✔ ${mp4}`);

  await lanzar([
    '-i', mp4,
    '-vf', 'fps=15,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a',
    '-loop', '0', gif,
  ]).terminado;
  console.log(`✔ ${gif}`);
  rmSync(temporal, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
