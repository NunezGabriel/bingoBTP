/**
 * El escenario del lobby: la Plaza de Armas con el Misti al fondo.
 *
 * Son dos capas y por una razon concreta: si todo fuera una sola imagen en
 * coordenadas del mundo, la camara (que sigue al jugador) dejaria el volcan
 * fuera de pantalla casi siempre. El cielo con los volcanes y la catedral se
 * dibuja pegado arriba y se desplaza despacio; el suelo, los jardines y la
 * pileta van en coordenadas del mundo, debajo.
 *
 * Cada capa se pinta una sola vez en su propio canvas y despues solo se copia.
 */

/** Suelo de la plaza: por donde se puede caminar. */
export const FLOOR = { top: 300, bottom: 520, left: 40, right: 920 };

export const SKY = { w: 1200, h: 300 };

function volcano(
  ctx: CanvasRenderingContext2D,
  cx: number,
  base: number,
  halfWidth: number,
  height: number,
  color: string,
  shade: string,
  snow: boolean,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - halfWidth, base);
  ctx.lineTo(cx, base - height);
  ctx.lineTo(cx + halfWidth, base);
  ctx.closePath();
  ctx.fill();

  // Ladera en sombra, para que no sea un triangulo plano.
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(cx, base - height);
  ctx.lineTo(cx + halfWidth, base);
  ctx.lineTo(cx + halfWidth * 0.3, base);
  ctx.closePath();
  ctx.fill();

  if (snow) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth * 0.3, base - height * 0.72);
    ctx.lineTo(cx, base - height);
    ctx.lineTo(cx + halfWidth * 0.3, base - height * 0.72);
    ctx.lineTo(cx + halfWidth * 0.14, base - height * 0.78);
    ctx.lineTo(cx, base - height * 0.68);
    ctx.lineTo(cx - halfWidth * 0.15, base - height * 0.79);
    ctx.closePath();
    ctx.fill();
  }
}

function arch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#cfc3ae";
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

function palm(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(x - 3, y - h, 6, h);
  ctx.fillStyle = "#2e7d32";
  for (const a of [-1.1, -0.55, 0, 0.55, 1.1]) {
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(a) * 18, y - h - 4 + Math.abs(a) * 7, 20, 7, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Capa de atras: cielo, los tres volcanes, la catedral y los portales. */
export function drawSky(ctx: CanvasRenderingContext2D) {
  const { w, h } = SKY;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#8ccbee");
  sky.addColorStop(0.75, "#cfe6f2");
  sky.addColorStop(1, "#f7e3c4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const [cx, cy, r] of [
    [150, 54, 16],
    [180, 50, 23],
    [214, 56, 14],
    [900, 44, 18],
    [932, 42, 25],
    [966, 50, 15],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chachani a la izquierda, Pichu Pichu a la derecha, el Misti al centro.
  volcano(ctx, 265, 300, 235, 150, "#a08d7e", "#7f6d60", false);
  volcano(ctx, 965, 300, 225, 132, "#a08d7e", "#7f6d60", false);
  volcano(ctx, 600, 300, 290, 250, "#8d6e63", "#6d5349", true);

  // Catedral de sillar
  ctx.fillStyle = "#efe7d6";
  ctx.fillRect(400, 196, 400, 104);
  ctx.fillStyle = "#e2d8c3";
  ctx.fillRect(400, 196, 400, 12);
  for (const tx of [386, 788]) {
    ctx.fillStyle = "#efe7d6";
    ctx.fillRect(tx, 140, 26, 160);
    ctx.fillStyle = "#d8ccb4";
    ctx.beginPath();
    ctx.moveTo(tx - 5, 140);
    ctx.lineTo(tx + 13, 112);
    ctx.lineTo(tx + 31, 140);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 7; i += 1) arch(ctx, 424 + i * 52, 236, 34, 64);

  // Portales a los lados
  for (let i = 0; i < 7; i += 1) arch(ctx, 10 + i * 54, 246, 42, 54);
  for (let i = 0; i < 7; i += 1) arch(ctx, 820 + i * 54, 246, 42, 54);
}

/** Capa del mundo: el suelo donde camina la gente, los jardines y la pileta. */
export function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const top = FLOOR.top - 46;

  ctx.fillStyle = "#d8d2c6";
  ctx.fillRect(0, top, w, h - top);
  ctx.strokeStyle = "rgba(0,0,0,0.07)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = top; y <= h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Jardines y palmeras
  for (const [gx, gy] of [
    [40, 302],
    [740, 302],
    [40, 436],
    [740, 436],
  ]) {
    ctx.fillStyle = "#6aa84f";
    ctx.fillRect(gx, gy, 170, 62);
    ctx.fillStyle = "#578a40";
    ctx.fillRect(gx, gy + 54, 170, 8);
  }
  palm(ctx, 95, 302, 56);
  palm(ctx, 160, 302, 44);
  palm(ctx, 800, 302, 52);
  palm(ctx, 865, 302, 42);

  // Pileta del centro
  ctx.fillStyle = "#c4bcae";
  ctx.beginPath();
  ctx.ellipse(480, 400, 88, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7fb3d5";
  ctx.beginPath();
  ctx.ellipse(480, 398, 73, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c4bcae";
  ctx.fillRect(468, 354, 24, 46);
  ctx.beginPath();
  ctx.ellipse(480, 354, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9fd0ea";
  ctx.beginPath();
  ctx.ellipse(480, 350, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}
