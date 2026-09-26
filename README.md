# Broadcast TikTok — Yeipi Services

Overlay vertical (1080 × 1920) para los directos de TikTok de Yeipi Services, con el estilo de hilos de luz blanca del pack del 2 de septiembre.

![Vista previa](salida/vista-previa.png)

## Diseño actual (v2.1)

| Zona | Posición | Tamaño |
| --- | --- | --- |
| Cámara (arriba, más pequeña) | X=156 Y=150 | 768 × 432 (16:9) |
| Gameplay (abajo, entero) | X=20 Y=660 | 1040 × 585 (16:9) |
| Marca | debajo del juego | logo YS · YEIPI SERVICES · discord.gg/yeipiservices |

La cámara y el juego van en 16:9, así que ninguno de los dos se recorta: el HUD del juego se ve entero y la cámara también.

## Archivos listos para OBS

Los tienes en [`salida/`](salida):

- `overlay.png`: la capa que va encima de todo, con los huecos transparentes.
- `vista-previa.png`: cómo queda con una cámara y un juego de ejemplo.
- `LEEME.txt`: los pasos para montarlo en OBS, con posiciones y tamaños.

## Cambiar el diseño

Todo lo que se suele tocar está en el bloque `CONFIG`, al principio de [`generar.js`](generar.js): el tamaño y la altura de la cámara y del juego, los textos de la marca, los colores y la `semilla` que da forma a los hilos del fondo.

```bash
npm install
npm run generar
```

Se vuelven a crear los tres archivos de `salida/`. Si pones una cámara igual o más grande que el juego, un tamaño que no es 16:9 o huecos que se solapan, el script lo avisa.

## Historial

- **v1 (2 sep):** estilo «CANTO» con hilos de luz blanca y juego 16:9 sin recortar.
- **v2:** cámara a todo el ancho arriba, juego más pequeño abajo y la marca Yeipi debajo.
- **v2.1:** cámara más pequeña que el gameplay. El juego pasa a ser lo más grande (1040 × 585) y la cámara, 768 × 432, sale entera sin recortar los lados.

La fuente es Montserrat (licencia SIL OFL, en [`fuentes/OFL.txt`](fuentes/OFL.txt)).
