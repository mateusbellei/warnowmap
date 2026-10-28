import type { EventKind } from "#shared/types/conflict";

export const mapColors: Record<EventKind, string> = {
  armed: "#ee7257",
  violence: "#d8aa65",
  tension: "#79a6ba",
  diplomacy: "#8cbea3",
};

export function clusterRing(counts: number[]): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(64, 64, 57, 0, Math.PI * 2);
  ctx.fillStyle = "#15232bf2";
  ctx.fill();
  const total = counts.reduce((sum, value) => sum + value, 0);
  let angle = -Math.PI / 2;
  for (const [index, kind] of (
    ["armed", "violence", "tension", "diplomacy"] as EventKind[]
  ).entries()) {
    const sweep = ((counts[index] ?? 0) / total) * Math.PI * 2;
    if (sweep > 0) {
      ctx.beginPath();
      ctx.arc(64, 64, 56, angle, angle + sweep);
      ctx.strokeStyle = mapColors[kind];
      ctx.lineWidth = 9;
      ctx.stroke();
    }
    angle += sweep;
  }
  return ctx.getImageData(0, 0, 128, 128);
}

// Ícones locais com formas distintas; dispensam imagens externas e não dependem só da cor.
export function eventIcon(kind: EventKind): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#112027";
  ctx.fillStyle = mapColors[kind];
  ctx.beginPath();
  if (kind === "armed") {
    ctx.moveTo(32, 3);
    ctx.lineTo(61, 32);
    ctx.lineTo(32, 61);
    ctx.lineTo(3, 32);
    ctx.closePath();
  } else if (kind === "violence") {
    ctx.moveTo(32, 3);
    ctx.lineTo(61, 57);
    ctx.lineTo(3, 57);
    ctx.closePath();
  } else if (kind === "tension") {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = 32 + 29 * Math.cos(angle);
      const y = 32 + 29 * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else ctx.roundRect(5, 5, 54, 54, 17);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#112027";
  ctx.fillStyle = "#112027";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (kind === "armed") {
    ctx.arc(32, 32, 10, 0, Math.PI * 2);
    ctx.stroke();
    for (const [x, y, ex, ey] of [
      [32, 16, 32, 23],
      [32, 41, 32, 48],
      [16, 32, 23, 32],
      [41, 32, 48, 32],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x!, y!);
      ctx.lineTo(ex!, ey!);
      ctx.stroke();
    }
  } else if (kind === "violence") {
    ctx.moveTo(32, 22);
    ctx.lineTo(32, 37);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(32, 46, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "tension") {
    ctx.moveTo(35, 15);
    ctx.lineTo(21, 35);
    ctx.lineTo(32, 35);
    ctx.lineTo(28, 49);
    ctx.lineTo(44, 28);
    ctx.lineTo(33, 28);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.roundRect(16, 19, 24, 17, 4);
    ctx.moveTo(22, 36);
    ctx.lineTo(18, 42);
    ctx.lineTo(29, 36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(43, 27);
    ctx.lineTo(47, 27);
    ctx.lineTo(47, 44);
    ctx.lineTo(41, 44);
    ctx.lineTo(43, 49);
    ctx.lineTo(33, 44);
    ctx.lineTo(28, 44);
    ctx.stroke();
  }
  return ctx.getImageData(0, 0, 64, 64);
}
