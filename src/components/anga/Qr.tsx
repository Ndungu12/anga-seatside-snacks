import qrcode from "qrcode-generator";
import { useMemo } from "react";

/** A real, scannable QR code (SVG) with a 4-module quiet zone. */
export function QrCode({
  value,
  size = 200,
  className,
  dark = "#101114",
  light = "#ffffff",
}: {
  value: string;
  size?: number;
  className?: string;
  dark?: string;
  light?: string;
}) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return { path: d, count: n };
  }, [value]);
  const q = 4;
  const total = count + q * 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-q} ${-q} ${total} ${total}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code for ${value}`}
      className={className}
    >
      <rect x={-q} y={-q} width={total} height={total} fill={light} />
      <path d={path} fill={dark} />
    </svg>
  );
}

/** Same QR as an SVG string, for downloads. */
export function qrSvgString(value: string, px = 600): string {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const q = 4;
  let d = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-q} ${-q} ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges"><rect x="${-q}" y="${-q}" width="${n + q * 2}" height="${n + q * 2}" fill="#fff"/><path d="${d}" fill="#101114"/></svg>`;
}
