import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();

const splashPath = path.join(projectRoot, "assets", "splash-icon.png");
const outSplashPath = path.join(projectRoot, "assets", "splash-icon.png");
const outIconPath = path.join(projectRoot, "assets", "icon.png");
const svgForegroundPath = path.join(
  projectRoot,
  "assets",
  "icon-foreground.svg",
);
const outAndroidForegroundPath = path.join(
  projectRoot,
  "assets",
  "android-icon-foreground.png",
);

function colorDistSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function getPixelRGBA(data, width, x, y) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function setAlpha(data, width, x, y, a) {
  const i = (y * width + x) * 4;
  data[i + 3] = a;
}

function isBgLike(rgb, bgColors, thresholdSq) {
  for (const c of bgColors) {
    if (colorDistSq(rgb, c) <= thresholdSq) return true;
  }
  return false;
}

async function main() {
  if (!fs.existsSync(splashPath)) {
    throw new Error(`Arquivo não encontrado: ${splashPath}`);
  }

  const { data, info } = await sharp(splashPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  // Detecta as 2 cores mais comuns nas bordas (provável xadrez de fundo).
  // A gente quantiza as cores pra agrupar variações pequenas.
  const quant = (v) => Math.round(v / 8) * 8;
  const key = (r, g, b) => `${quant(r)},${quant(g)},${quant(b)}`;
  const counts = new Map();

  const samplePoints = [];
  const borderStep = Math.max(1, Math.floor(Math.min(width, height) / 200));
  for (let x = 0; x < width; x += borderStep) {
    samplePoints.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y += borderStep) {
    samplePoints.push([0, y], [width - 1, y]);
  }

  for (const [x, y] of samplePoints) {
    const [r, g, b] = getPixelRGBA(data, width, x, y);
    const k = key(r, g, b);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const topColors = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k.split(",").map((n) => Number(n)));

  if (topColors.length === 0) {
    throw new Error("Não consegui detectar cores do fundo nas bordas.");
  }

  // Remove fundo por flood fill a partir das bordas.
  // Isso evita sobrar "linhas" desconectadas do xadrez quantizado.
  const floodThresholdSq = 44 * 44;
  const cleanupThresholdSq = 28 * 28;

  const visited = new Uint8Array(width * height);
  const qx = new Int32Array(width * height);
  const qy = new Int32Array(width * height);
  let qh = 0;
  let qt = 0;

  const push = (x, y) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    qx[qt] = x;
    qy[qt] = y;
    qt++;
  };

  // Seeds nas bordas
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (qh < qt) {
    const x = qx[qh];
    const y = qy[qh];
    qh++;
    const [r, g, b, a] = getPixelRGBA(data, width, x, y);
    if (a === 0) continue;
    if (!isBgLike([r, g, b], topColors, floodThresholdSq)) continue;

    setAlpha(data, width, x, y, 0);

    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  // Segunda passada: remove sobras isoladas "parecidas" com fundo.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(data, width, x, y);
      if (a === 0) continue;
      if (isBgLike([r, g, b], topColors, cleanupThresholdSq)) {
        setAlpha(data, width, x, y, 0);
      }
    }
  }

  // Regrava o splash com alpha de verdade
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outSplashPath);

  // Gera o ícone do app (Expo): 1024x1024 com fundo sólido (melhor p/ iOS).
  // E também um foreground novo (Android adaptive) a partir de SVG transparente.
  const background = "#E6F4FE";
  const hasSvg = fs.existsSync(svgForegroundPath);
  const logo = hasSvg
    ? await sharp(svgForegroundPath, { density: 320 })
        .resize(620, 620, { fit: "inside" })
        .png()
        .toBuffer()
    : await sharp(data, { raw: { width, height, channels: 4 } })
        .trim({ threshold: 5 })
        .resize(620, 620, { fit: "inside" })
        .png()
        .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outIconPath);

  if (hasSvg) {
    // Android adaptive foreground recomendado: 432x432 (dentro de 1080) é comum.
    // Aqui geramos 1024x1024 com padding, que o Expo/Android redimensiona bem.
    await sharp(svgForegroundPath, { density: 320 })
      .resize(1024, 1024, { fit: "contain" })
      .png()
      .toFile(outAndroidForegroundPath);
  }

  const splashMeta = await sharp(outSplashPath).metadata();
  const iconMeta = await sharp(outIconPath).metadata();

  console.log("OK:");
  console.log("-", path.relative(projectRoot, outSplashPath));
  console.log("-", path.relative(projectRoot, outIconPath));
  console.log("metadata:");
  console.log(
    "- splash",
    `${splashMeta.width}x${splashMeta.height}`,
    "alpha",
    !!splashMeta.hasAlpha,
  );
  console.log(
    "- icon",
    `${iconMeta.width}x${iconMeta.height}`,
    "alpha",
    !!iconMeta.hasAlpha,
  );
  if (hasSvg) {
    const fgMeta = await sharp(outAndroidForegroundPath).metadata();
    console.log(
      "- android foreground",
      `${fgMeta.width}x${fgMeta.height}`,
      "alpha",
      !!fgMeta.hasAlpha,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

